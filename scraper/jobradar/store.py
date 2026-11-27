"""Postgres persistence: skills, jobs (upsert), job_skills and scrape_runs."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

import psycopg

from jobradar.extract.skills import Skill
from jobradar.normalize import NormalizedJob

# first_seen_at is deliberately absent from the UPDATE list: it is set once on insert.
_UPSERT_JOB = """
INSERT INTO jobs (
    dedupe_key, source, external_id, region, title, company, location, url,
    description_html, salary_min, salary_max, salary_currency, salary_period, salary_raw,
    posted_at, first_seen_at, last_seen_at
) VALUES (
    %(dedupe_key)s, %(source)s, %(external_id)s, %(region)s, %(title)s, %(company)s,
    %(location)s, %(url)s, %(description_html)s, %(salary_min)s, %(salary_max)s,
    %(salary_currency)s, %(salary_period)s, %(salary_raw)s, %(posted_at)s,
    %(seen_at)s, %(seen_at)s
)
ON CONFLICT (dedupe_key) DO UPDATE SET
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    url = EXCLUDED.url,
    description_html = EXCLUDED.description_html,
    salary_min = EXCLUDED.salary_min,
    salary_max = EXCLUDED.salary_max,
    salary_currency = EXCLUDED.salary_currency,
    salary_period = EXCLUDED.salary_period,
    salary_raw = EXCLUDED.salary_raw,
    posted_at = EXCLUDED.posted_at,
    last_seen_at = EXCLUDED.last_seen_at
RETURNING id, (xmax = 0) AS inserted
"""


def sync_skills(conn: psycopg.Connection, skills: Iterable[Skill]) -> None:
    """Make the `skills` table match the taxonomy. Needed before linking job_skills."""
    with conn.transaction(), conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO skills (slug, name, category) VALUES (%s, %s, %s) "
            "ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category",
            [(s.slug, s.name, s.category) for s in skills],
        )


def save_jobs(
    conn: psycopg.Connection, jobs: Iterable[NormalizedJob], *, seen_at: datetime
) -> tuple[int, int]:
    """Upsert jobs and replace their skill links in one transaction.

    Return (jobs_seen, jobs_new). A job already stored keeps its first_seen_at and gets a
    fresh last_seen_at. If the transaction fails, nothing from this call is saved.
    """
    seen = new = 0
    with conn.transaction(), conn.cursor() as cur:
        for job in jobs:
            row = {**job.__dict__, "seen_at": seen_at}
            cur.execute(_UPSERT_JOB, row)
            job_id, inserted = cur.fetchone()
            seen += 1
            new += 1 if inserted else 0

            cur.execute("DELETE FROM job_skills WHERE job_id = %s", (job_id,))
            if job.skills:
                cur.executemany(
                    "INSERT INTO job_skills (job_id, skill_slug) VALUES (%s, %s)",
                    [(job_id, slug) for slug in job.skills],
                )
    return seen, new


def start_run(conn: psycopg.Connection, source: str) -> int:
    with conn.transaction():
        row = conn.execute(
            "INSERT INTO scrape_runs (source, status) VALUES (%s, 'running') RETURNING id",
            (source,),
        ).fetchone()
    return row[0]


def finish_run(
    conn: psycopg.Connection,
    run_id: int,
    *,
    status: str,
    jobs_seen: int = 0,
    jobs_new: int = 0,
    error: str | None = None,
) -> None:
    with conn.transaction():
        conn.execute(
            "UPDATE scrape_runs SET finished_at = now(), status = %s, jobs_seen = %s, "
            "jobs_new = %s, error = %s WHERE id = %s",
            (status, jobs_seen, jobs_new, error, run_id),
        )
