"""Database connection and migration runner.

Migrations are plain SQL files in `db/migrations/` at the repo root, applied in filename
order. Each one runs in its own transaction and is recorded in `schema_migrations`.
"""

from __future__ import annotations

from pathlib import Path

import psycopg

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "db" / "migrations"


def connect(database_url: str) -> psycopg.Connection:
    """Open a connection in autocommit mode.

    Atomicity is explicit: every write happens inside `with conn.transaction():`, which
    issues a real BEGIN/COMMIT. With autocommit off, a stray SELECT would open an implicit
    transaction and turn those blocks into savepoints, so nothing would be committed.
    """
    return psycopg.connect(database_url, autocommit=True)


def apply_migrations(conn: psycopg.Connection, migrations_dir: Path = MIGRATIONS_DIR) -> list[str]:
    """Apply pending migrations. Return the versions applied in this call."""
    with conn.transaction():
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " version text PRIMARY KEY,"
            " applied_at timestamptz NOT NULL DEFAULT now())"
        )
    applied = {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}

    newly_applied: list[str] = []
    for path in sorted(migrations_dir.glob("*.sql")):
        version = path.stem
        if version in applied:
            continue
        with conn.transaction():
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (version,))
        newly_applied.append(version)
    return newly_applied
