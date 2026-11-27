// Pure helpers with no server-only imports, so proxy.ts and client code can use them.

export const LOCALES = ["en", "vi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** BCP 47 tag used for number and date formatting. */
export const formatLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

export type Region = "vn" | "intl";

export function parseRegion(value: string | string[] | undefined): Region | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "vn" || v === "intl" ? v : null;
}

/** Build an internal link that keeps the locale and the region filter. */
export function href(locale: Locale, path: string, region: Region | null): string {
  const base = `/${locale}${path === "/" ? "" : path}`;
  return region ? `${base}?region=${region}` : base;
}
