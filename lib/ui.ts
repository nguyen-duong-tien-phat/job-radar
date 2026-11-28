export const buttonPrimary =
  "inline-flex h-10 items-center justify-center rounded-md bg-signal px-5 text-sm font-semibold text-ink transition-colors hover:bg-signal-bright disabled:cursor-wait disabled:opacity-60";

export const buttonSecondary =
  "inline-flex h-10 items-center justify-center rounded-md border border-seam-strong px-5 text-sm font-medium text-paper transition-colors hover:border-steel hover:bg-seam disabled:cursor-wait disabled:opacity-60";

const updatedFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** "20:29 28/11" */
export const updatedAt = (iso: string) => updatedFormat.format(new Date(iso)).replace(",", "");
