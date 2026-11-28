export const buttonPrimary =
  "inline-flex h-10 items-center justify-center rounded-md bg-signal px-5 text-sm font-semibold text-ink transition-colors hover:bg-signal-bright disabled:cursor-wait disabled:opacity-60";

export const buttonSecondary =
  "inline-flex h-10 items-center justify-center rounded-md border border-seam-strong px-5 text-sm font-medium text-paper transition-colors hover:border-steel hover:bg-seam disabled:cursor-wait disabled:opacity-60";

const updatedFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** "20:29 28/11" */
export const updatedAt = (iso: string) => updatedFormat.format(new Date(iso)).replace(",", "");

/** "3 giờ", "hôm qua", "5 ngày", "2 tháng" since an ISO date. */
export function ago(iso: string | null, now = Date.now()): string {
  const hours = (now - Date.parse(iso ?? "")) / 3_600_000;
  if (!Number.isFinite(hours)) return "—";
  if (hours < 1) return "vừa xong";
  if (hours < 24) return `${Math.floor(hours)} giờ`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hôm qua";
  return days < 60 ? `${days} ngày` : `${Math.floor(days / 30)} tháng`;
}

const SOURCE_NAMES: Record<string, string> = {
  remoteok: "Remote OK",
  arbeitnow: "Arbeitnow",
  weworkremotely: "We Work Remotely",
  "hn-hiring": "HN Who is hiring",
  topdev: "TopDev",
  vieclam24h: "Vieclam24h",
  careerlink: "CareerLink",
};

export const sourceName = (source: string) => SOURCE_NAMES[source] ?? "Trang tuyển dụng của công ty";
