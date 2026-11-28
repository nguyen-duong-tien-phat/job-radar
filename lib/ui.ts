export const buttonPrimary =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap justify-center rounded-md bg-signal px-5 text-sm font-semibold text-ink transition-colors hover:bg-signal-bright disabled:cursor-wait disabled:opacity-60";

export const buttonSecondary =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap justify-center rounded-md border border-seam-strong px-5 text-sm font-medium text-paper transition-colors hover:border-steel hover:bg-seam disabled:cursor-wait disabled:opacity-60";

const updatedFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** "20:29 28/11" */
export const updatedAt = (iso: string) => updatedFormat.format(new Date(iso)).replace(",", "");

/** "3h", "yesterday", "5d", "2mo" since an ISO date. */
export function ago(iso: string | null, now = Date.now()): string {
  const hours = (now - Date.parse(iso ?? "")) / 3_600_000;
  if (!Number.isFinite(hours)) return "—";
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return days < 60 ? `${days}d` : `${Math.floor(days / 30)}mo`;
}

/** Sources that can be turned off in Settings; "ats" stands for every company careers page. */
export const SOURCE_NAMES: Record<string, string> = {
  ats: "Company careers pages",
  remoteok: "Remote OK",
  arbeitnow: "Arbeitnow",
  weworkremotely: "We Work Remotely",
  "hn-hiring": "HN Who is hiring",
  topdev: "TopDev",
  vieclam24h: "Vieclam24h",
  careerlink: "CareerLink",
  "claude-search": "Claude web search",
};

export const sourceName = (source: string) => SOURCE_NAMES[source] ?? "Company careers page";

/** Whether a daily run at hour:minute happens later today or tomorrow. */
export function nextRunDay(hour: number, minute: number, now = new Date()): "today" | "tomorrow" {
  const at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  return at > now ? "today" : "tomorrow";
}
