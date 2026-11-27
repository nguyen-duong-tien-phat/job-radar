import "server-only";

import { connection } from "next/server";
import postgres from "postgres";

// Reuse one client across hot reloads and requests. Use a read-only database role in production.
const globalForDb = globalThis as unknown as { jobradarSql?: postgres.Sql };

/**
 * Get the Postgres client. Awaiting `connection()` marks the caller as request-time work, so
 * Next.js never runs database queries while prerendering (the build needs no database).
 * Always call it from inside a <Suspense> boundary.
 */
export async function getSql(): Promise<postgres.Sql> {
  await connection();
  if (!globalForDb.jobradarSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    }
    globalForDb.jobradarSql = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
  }
  return globalForDb.jobradarSql;
}
