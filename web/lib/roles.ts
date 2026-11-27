// Role display helper. Role slugs come from the scraper (scraper/jobradar/extract/roles.py);
// the display names live in messages/*.json under roleNames.

export function roleName(names: Record<string, string>, slug: string | null): string {
  return names[slug ?? "other"] ?? slug ?? names.other;
}
