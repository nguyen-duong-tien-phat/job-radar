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
export function formatMoney(value: number, currency: string, _locale: Locale): string {
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
  locale: Locale,
): string | null {
  if (!currency || (min === null && max === null)) return null;
  const low = min ?? max!;
  const high = max ?? min!;
  const range =
    low === high
      ? formatMoney(low, currency, locale)
      : `${formatMoney(low, currency, locale)}–${formatMoney(high, currency, locale)}`;
  return period ? `${range} / ${period}` : range;
}

export function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: "medium" }).format(value);
}
