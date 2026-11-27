// Pure helpers (no server-only imports): the URL is the single source of truth for filters,
// and both server pages and the client Controls parse it with the same function.

import type { Locale, Region } from "@/lib/locales";

export const RANGE_KEYS = ["7d", "30d", "90d", "1y", "custom"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export const DEFAULT_RANGE: RangeKey = "30d";

const PRESET_DAYS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
const MAX_CUSTOM_DAYS = 5 * 366;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Filters = {
  region: Region | null;
  range: RangeKey;
  /** First day, inclusive, `YYYY-MM-DD` (UTC). Always resolved, also for presets. */
  from: string;
  /** Last day, inclusive, `YYYY-MM-DD` (UTC). */
  to: string;
};

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (date: string) => Date.parse(`${date}T00:00:00Z`);
const DAY = 86_400_000;

export const addDays = (date: string, days: number) => iso(ms(date) + days * DAY);
export const daysBetween = (from: string, to: string) => Math.round((ms(to) - ms(from)) / DAY) + 1;

function parseRegion(value: string | null | undefined): Region | null {
  return value === "vn" || value === "intl" ? value : null;
}

/** Resolve filters from URL params. Invalid or missing values fall back to the defaults. */
export function parseFilters(
  get: (key: string) => string | null | undefined,
  now: Date = new Date(),
): Filters {
  const today = iso(now.getTime());
  const region = parseRegion(get("region"));
  const requested = get("range");

  if (requested === "custom") {
    let from = get("from") ?? "";
    let to = get("to") ?? "";
    if (ISO_DATE.test(from) && ISO_DATE.test(to) && !Number.isNaN(ms(from)) && !Number.isNaN(ms(to))) {
      if (from > to) [from, to] = [to, from];
      if (to > today) to = today;
      if (from > to) from = to;
      if (daysBetween(from, to) > MAX_CUSTOM_DAYS) from = addDays(to, -(MAX_CUSTOM_DAYS - 1));
      return { region, range: "custom", from, to };
    }
  }

  const range: Exclude<RangeKey, "custom"> =
    requested && requested in PRESET_DAYS ? (requested as keyof typeof PRESET_DAYS) : DEFAULT_RANGE as keyof typeof PRESET_DAYS;
  return { region, range, from: addDays(today, -(PRESET_DAYS[range] - 1)), to: today };
}

/** Same as parseFilters, for the `searchParams` object of a Next.js page. */
export function filtersFromRecord(
  record: Record<string, string | string[] | undefined>,
  now?: Date,
): Filters {
  return parseFilters((key) => {
    const value = record[key];
    return Array.isArray(value) ? value[0] : value;
  }, now);
}

/** Query string for a filter set; defaults are left out to keep URLs short. */
export function toQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.range === "custom") {
    params.set("range", "custom");
    params.set("from", filters.from);
    params.set("to", filters.to);
  } else if (filters.range !== DEFAULT_RANGE) {
    params.set("range", filters.range);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Internal link that keeps the locale and every filter, with optional overrides. */
export function href(
  locale: Locale,
  path: string,
  filters: Filters,
  patch: Partial<Filters> = {},
): string {
  return `/${locale}${path === "/" ? "" : path}${toQuery({ ...filters, ...patch })}`;
}

/** Chart bucket size for a date span: days for a month, weeks for a year, months beyond. */
export function bucketFor(from: string, to: string): "day" | "week" | "month" {
  const days = daysBetween(from, to);
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}
