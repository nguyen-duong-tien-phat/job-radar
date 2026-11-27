"""Integration tests against a real Postgres.

Set TEST_DATABASE_URL to a throwaway database whose name contains "test". The tests
DROP and recreate the public schema, so they refuse any other database.
"""

import dataclasses
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import psycopg
import pytest

from jobradar import db, run, store
from jobradar.extract.skills import SkillExtractor
from jobradar.http import HttpClient
from jobradar.normalize import normalize
from jobradar.sources.base import Source
from jobradar.sources.remoteok import RemoteOKSource

FIXTURE = Path(__file__).parent / "fixtures" / "remoteok_sample.json"
TEST_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL is not set")


@pytest.fixture
def conn():
    dbname = psycopg.conninfo.conninfo_to_dict(TEST_URL).get("dbname", "")
    assert "test" in dbname, f"refusing to wipe database {dbname!r}: name must contain 'test'"
    connection = db.connect(TEST_URL)
    with connection.transaction():
        connection.execute("DROP SCHEMA public CASCADE")
        connection.execute("CREATE SCHEMA public")
    db.apply_migrations(connection)
    yield connection
    connection.close()


@pytest.fixture(scope="module")
def extractor():
    return SkillExtractor.from_yaml()


@pytest.fixture
def jobs(extractor):
    payload = FIXTURE.read_bytes()
    transport = httpx.MockTransport(lambda request: httpx.Response(200, content=payload))
    with HttpClient(transport=transport, min_interval=0, sleep=lambda _: None) as http:
        raw_jobs = list(RemoteOKSource().fetch(http))
    return [normalize(raw, extractor) for raw in raw_jobs]


def _count(conn, table):
    return conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]


def test_migrations_are_idempotent(conn):
    assert db.apply_migrations(conn) == []
    versions = [r[0] for r in conn.execute("SELECT version FROM schema_migrations")]
    assert versions == ["0001_init"]


def test_second_run_creates_no_duplicates_and_keeps_first_seen(conn, jobs, extractor):
    store.sync_skills(conn, extractor.skills)
    day1 = datetime(2026, 11, 27, 7, 0, tzinfo=UTC)
    day2 = day1 + timedelta(days=1)

    assert store.save_jobs(conn, jobs, seen_at=day1) == (5, 5)
    assert store.save_jobs(conn, jobs, seen_at=day2) == (5, 0)

    assert _count(conn, "jobs") == 5
    assert conn.execute("SELECT count(DISTINCT dedupe_key) FROM jobs").fetchone()[0] == 5
    firsts, lasts = conn.execute(
        "SELECT array_agg(DISTINCT first_seen_at), array_agg(DISTINCT last_seen_at) FROM jobs"
    ).fetchone()
    assert firsts == [day1]
    assert lasts == [day2]


def test_writes_are_committed_and_visible_to_other_connections(conn, jobs, extractor):
    store.sync_skills(conn, extractor.skills)
    store.save_jobs(conn, jobs, seen_at=datetime(2026, 11, 27, tzinfo=UTC))
    run_id = store.start_run(conn, "remoteok")
    store.finish_run(conn, run_id, status="ok", jobs_seen=5, jobs_new=5)

    with db.connect(TEST_URL) as other:
        assert _count(other, "jobs") == 5
        assert _count(other, "skills") > 0
        assert other.execute("SELECT status FROM scrape_runs").fetchone() == ("ok",)
        assert other.execute("SELECT version FROM schema_migrations").fetchone() == ("0001_init",)


def test_job_skills_are_replaced_not_accumulated(conn, jobs, extractor):
    store.sync_skills(conn, extractor.skills)
    seen = datetime(2026, 11, 27, tzinfo=UTC)
    first = dataclasses.replace(jobs[0], skills=["python", "docker"])
    store.save_jobs(conn, [first], seen_at=seen)

    changed = dataclasses.replace(first, skills=["rust"])
    store.save_jobs(conn, [changed], seen_at=seen)

    rows = conn.execute("SELECT skill_slug FROM job_skills").fetchall()
    assert rows == [("rust",)]


def test_failed_save_rolls_back_everything(conn, jobs, extractor):
    store.sync_skills(conn, extractor.skills)
    bad = dataclasses.replace(jobs[1], region="mars")  # violates the region CHECK
    with pytest.raises(psycopg.errors.CheckViolation):
        store.save_jobs(conn, [jobs[0], bad], seen_at=datetime(2026, 11, 27, tzinfo=UTC))
    assert _count(conn, "jobs") == 0
    assert _count(conn, "job_skills") == 0


class _FailingSource(Source):
    name = "failing"
    region = "intl"

    def fetch(self, http):
        raise RuntimeError("site is down")


class _EmptySource(Source):
    name = "empty"
    region = "intl"

    def fetch(self, http):
        return []


def test_run_records_error_and_warning_per_source(conn):
    exit_code = run._store_run([_FailingSource(), _EmptySource()], TEST_URL)

    assert exit_code == 1  # a failed source makes the whole run exit non-zero
    rows = conn.execute("SELECT source, status, error FROM scrape_runs ORDER BY id").fetchall()
    assert rows[0][:2] == ("failing", "error")
    assert "RuntimeError: site is down" in rows[0][2]
    assert rows[1] == ("empty", "warning", None)  # 0 jobs is a warning, not an error


def test_scrape_run_lifecycle(conn):
    run_id = store.start_run(conn, "remoteok")
    status = conn.execute("SELECT status, finished_at FROM scrape_runs WHERE id = %s", (run_id,))
    assert status.fetchone() == ("running", None)

    store.finish_run(conn, run_id, status="ok", jobs_seen=5, jobs_new=3)
    row = conn.execute(
        "SELECT status, jobs_seen, jobs_new, error, finished_at IS NOT NULL "
        "FROM scrape_runs WHERE id = %s",
        (run_id,),
    ).fetchone()
    assert row == ("ok", 5, 3, None, True)
