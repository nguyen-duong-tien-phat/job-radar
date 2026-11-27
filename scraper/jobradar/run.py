"""Entrypoint: `python -m jobradar.run [--source NAME ...] [--dry-run]`.

Without --dry-run the run writes to Postgres. The connection string comes from
--database-url or the DATABASE_URL environment variable. Pending migrations are applied
first. Each source gets one `scrape_runs` row: ok, warning (0 jobs) or error.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import UTC, datetime

from jobradar import db, store
from jobradar.extract.skills import SkillExtractor
from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.normalize import normalize
from jobradar.sources import get_sources
from jobradar.sources.base import Source

log = logging.getLogger("jobradar")


def _salary_text(job: RawJob) -> str:
    if job.salary_min is None and job.salary_max is None:
        return "no salary"
    low = job.salary_min if job.salary_min is not None else job.salary_max
    high = job.salary_max if job.salary_max is not None else job.salary_min
    period = f"/{job.salary_period}" if job.salary_period else ""
    return f"{job.salary_currency or '?'} {low:,.0f}-{high:,.0f}{period}"


def _print_report(name: str, jobs: list[RawJob], sample: int) -> None:
    with_salary = sum(1 for j in jobs if j.salary_min is not None or j.salary_max is not None)
    print(f"[{name}] {len(jobs)} jobs, {with_salary} with salary")
    for job in jobs[:sample]:
        print(f"  - {job.title} @ {job.company} | {_salary_text(job)}")
        print(f"    {job.url}")


def _dry_run(sources: list[Source], sample: int) -> int:
    failed = False
    for source in sources:
        try:
            with HttpClient(min_interval=source.min_interval) as http:
                jobs = list(source.fetch(http))
        except Exception:
            log.exception("source %s failed", source.name)
            failed = True
            continue
        _print_report(source.name, jobs, sample)
    return 1 if failed else 0


def _store_run(sources: list[Source], database_url: str) -> int:
    extractor = SkillExtractor.from_yaml()
    failed = False
    conn = db.connect(database_url)
    try:
        for version in db.apply_migrations(conn):
            log.info("applied migration %s", version)
        store.sync_skills(conn, extractor.skills)

        for source in sources:
            run_id = store.start_run(conn, source.name)
            try:
                with HttpClient(min_interval=source.min_interval) as http:
                    raw_jobs = list(source.fetch(http))
                jobs = [normalize(raw, extractor) for raw in raw_jobs]
                if source.require_skills:
                    jobs = [job for job in jobs if job.skills]
                seen, new = store.save_jobs(conn, jobs, seen_at=datetime.now(UTC))
            except Exception as exc:
                log.exception("source %s failed", source.name)
                store.finish_run(
                    conn, run_id, status="error", error=f"{type(exc).__name__}: {exc}"
                )
                failed = True
                continue
            status = "ok" if seen > 0 else "warning"
            store.finish_run(conn, run_id, status=status, jobs_seen=seen, jobs_new=new)
            print(f"[{source.name}] {status}: {seen} jobs seen, {new} new")
    finally:
        conn.close()
    return 1 if failed else 0


def _backfill(database_url: str | None) -> int:
    if not database_url:
        print("No database: pass --database-url or set DATABASE_URL.", file=sys.stderr)
        return 2
    conn = db.connect(database_url)
    try:
        for version in db.apply_migrations(conn):
            log.info("applied migration %s", version)
        print(f"backfill: {store.backfill_classification(conn)} jobs updated")
    finally:
        conn.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jobradar", description="Run the job scrapers")
    parser.add_argument("--source", action="append", help="run only this source (repeatable)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="run sources and print a summary without writing to the DB",
    )
    parser.add_argument("--database-url", help="Postgres URL (default: $DATABASE_URL)")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="recompute role and dup_key for all stored jobs (no scraping), then exit",
    )
    parser.add_argument("--sample", type=int, default=3, help="sample jobs to print per source")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if args.backfill:
        return _backfill(args.database_url or os.environ.get("DATABASE_URL"))

    try:
        sources = get_sources(args.source)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.dry_run:
        return _dry_run(sources, args.sample)

    database_url = args.database_url or os.environ.get("DATABASE_URL")
    if not database_url:
        print(
            "No database: pass --database-url or set DATABASE_URL (or use --dry-run).",
            file=sys.stderr,
        )
        return 2
    return _store_run(sources, database_url)


if __name__ == "__main__":
    sys.exit(main())
