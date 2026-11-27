import { formatLocale, type Locale } from "@/lib/locales";

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(formatLocale(locale)).format(value);
}

export function formatPercent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Compact currency, e.g. $120K or ₫480M. Amounts are never converted between currencies.
 * Always formatted with en-US: Vietnamese compact notation ("200,0 N US$") is hard to read
 * for salaries, and the K/M style is what job boards use in both languages.
 */
export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): string | null {
  if (!currency || (min === null && max === null)) return null;
  const low = min ?? max!;
  const high = max ?? min!;
  const range =
    low === high
      ? formatMoney(low, currency)
      : `${formatMoney(low, currency)}–${formatMoney(high, currency)}`;
  return period ? `${range} / ${period}` : range;
}

export function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: "medium", timeZone: "UTC" }).format(value);
}

/** Axis label for a chart bucket start date (`YYYY-MM-DD`): "27 Nov" or "Nov 2026" for months. */
export function formatBucket(day: string, unit: "day" | "week" | "month", locale: Locale): string {
  const date = new Date(`${day}T00:00:00Z`);
  const options: Intl.DateTimeFormatOptions =
    unit === "month"
      ? { month: "short", year: "numeric", timeZone: "UTC" }
      : { day: "numeric", month: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(formatLocale(locale), options).format(date);
}

/** Round a chart maximum up to 1, 2, 5 or 10 times a power of ten, for tidy axis ticks. */
export function niceMax(value: number): number {
  if (value <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

/** Format a `YYYY-MM-DD` filter date for display. */
export function formatDay(day: string, locale: Locale): string {
  return formatDate(new Date(`${day}T00:00:00Z`), locale);
}
