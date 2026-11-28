import { db } from "./db";

export const MODELS = { "claude-sonnet-5-5": "Sonnet (cân bằng)", "claude-haiku-5-5": "Haiku (tiết kiệm nhất)" } as const;

export type Settings = {
  theme: "dark" | "light";
  jobsShown: number;
  runHour: number;
  runMinute: number;
  searchEveryDays: number;
  model: keyof typeof MODELS;
  searches: number;
  fetches: number;
  maxJobs: number;
  enoughJobs: number;
  enoughFit: number;
};

export const DEFAULTS: Settings = {
  theme: "dark",
  jobsShown: 100,
  runHour: 18,
  runMinute: 0,
  searchEveryDays: 2,
  model: "claude-sonnet-5-5",
  searches: 8,
  fetches: 15,
  maxJobs: 20,
  enoughJobs: 5,
  enoughFit: 9,
};

/** Allowed range for every number, used by the form and by validation. */
export const RANGES: Record<Exclude<keyof Settings, "theme" | "model">, [number, number]> = {
  jobsShown: [20, 500],
  runHour: [0, 23],
  runMinute: [0, 59],
  searchEveryDays: [1, 14],
  searches: [1, 20],
  fetches: [1, 40],
  maxJobs: [5, 50],
  enoughJobs: [1, 20],
  enoughFit: [5, 10],
};

/** Stored values over defaults; anything unknown or out of range falls back to the default. */
export function getSettings(): Settings {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return parseSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** Validates raw form or stored values (strings) into Settings. */
export function parseSettings(raw: Record<string, unknown>): Settings {
  const s: Settings = { ...DEFAULTS };
  if (raw.theme === "light" || raw.theme === "dark") s.theme = raw.theme;
  if (typeof raw.model === "string" && Object.hasOwn(MODELS, raw.model)) s.model = raw.model as Settings["model"];
  for (const [key, [min, max]] of Object.entries(RANGES) as [keyof typeof RANGES, [number, number]][]) {
    const n = Number(raw[key]);
    if (raw[key] !== undefined && raw[key] !== "" && Number.isInteger(n) && n >= min && n <= max) s[key] = n;
  }
  return s;
}

export function saveSettings(s: Settings) {
  const conn = db();
  const put = conn.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value");
  conn.exec("BEGIN");
  try {
    for (const [k, v] of Object.entries(s)) put.run(k, String(v));
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

/** Hard stop for a Claude run: half again above what the prompt asks, in case the model ignores the limit. */
export const hardLimit = (s: Pick<Settings, "searches" | "fetches">) => ({ searches: Math.ceil(s.searches * 1.5), fetches: Math.ceil(s.fetches * 1.5) });
