// Polite HTTP for crawling: identifies itself, waits between requests to the same host, times out.

export const USER_AGENT = "job-radar/0.2 (personal, non-commercial job search)";

const nextSlot = new Map<string, number>();

type Options = { accept?: string; gapMs?: number; timeoutMs?: number };

/** Waits until this host's slot is free, then reserves the next one `gapMs` later. */
async function waitForHost(host: string, gapMs: number) {
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(host) ?? 0);
  nextSlot.set(host, at + gapMs);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

export async function getText(url: string, { accept = "text/html,application/xhtml+xml,application/xml;q=0.9", gapMs = 1000, timeoutMs = 25000 }: Options = {}): Promise<string> {
  await waitForHost(new URL(url).host, gapMs);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

export async function getJson<T = unknown>(url: string, options: Options = {}): Promise<T> {
  return JSON.parse(await getText(url, { accept: "application/json", ...options })) as T;
}

/** Fetches a .gz file and returns its text. */
export async function getGzipText(url: string, options: Options = {}): Promise<string> {
  await waitForHost(new URL(url).host, options.gapMs ?? 1000);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(options.timeoutMs ?? 25000) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Some servers already decode Content-Encoding; only gunzip real gzip bytes.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  const { gunzipSync } = await import("node:zlib");
  return gunzipSync(bytes).toString("utf8");
}
