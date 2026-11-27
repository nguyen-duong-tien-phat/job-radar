import "server-only";

import type { Locale } from "@/lib/locales";

const dictionaries = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  vi: () => import("@/messages/vi.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const getDictionary = (locale: Locale): Promise<Dictionary> => dictionaries[locale]();

/** Replace `{name}` placeholders in a message. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
