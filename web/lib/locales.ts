// Pure helpers with no server-only imports, so proxy.ts and client code can use them.

export const LOCALES = ["en", "vi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** BCP 47 tag used for number and date formatting. */
export const formatLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

export type Region = "vn" | "intl";
