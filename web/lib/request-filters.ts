import "server-only";

import { connection } from "next/server";

import { type Filters, filtersFromRecord } from "@/lib/filters";

/**
 * Filters for the current request. "Today" decides what 1W/1M/1Y mean, so it must be read at
 * request time: awaiting `connection()` keeps `new Date()` out of the prerendered shell.
 * Call it from inside a <Suspense> boundary.
 */
export async function requestFilters(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Filters> {
  await connection();
  return filtersFromRecord(await searchParams);
}
