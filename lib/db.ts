import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const DATA_DIR = path.join(process.cwd(), "data");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cv_text TEXT NOT NULL,
  skills TEXT NOT NULL,      -- JSON string[]
  roles TEXT NOT NULL,       -- JSON string[]
  locations TEXT NOT NULL,   -- JSON string[]
  years INTEGER,
  min_salary_usd INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,          -- e.g. "greenhouse:workatbackbase", "topdev"
  official INTEGER NOT NULL,     -- 1 = the company's own career page (ATS)
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  remote INTEGER NOT NULL,
  description TEXT NOT NULL,
  salary TEXT,
  posted_at TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  missed INTEGER NOT NULL DEFAULT 0, -- complete-list runs in a row that did not return it
  viewed_at TEXT,                    -- when the owner opened the job's detail
  saved_at TEXT                      -- when the owner saved the job
);
CREATE INDEX IF NOT EXISTS jobs_source ON jobs (source);

-- Companies whose public ATS board is read on every crawl.
CREATE TABLE IF NOT EXISTS companies (
  ats TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (ats, slug)
);

-- Every uploaded CV; the file is data/cvs/<id>.pdf.
CREATE TABLE IF NOT EXISTS cvs (
  id INTEGER PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

-- Key/value settings edited in the app (lib/settings.ts).
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ok INTEGER NOT NULL,
  fetched INTEGER NOT NULL,
  kept INTEGER NOT NULL,
  added INTEGER NOT NULL,
  error TEXT,
  tokens INTEGER                 -- Claude web search only: tokens the run used
);
`;

// Reuse one connection across dev hot reloads.
const g = globalThis as unknown as { jobRadarDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.jobRadarDb) {
    mkdirSync(DATA_DIR, { recursive: true });
    // JOB_RADAR_DB lets tests use ":memory:".
    const conn = new DatabaseSync(process.env.JOB_RADAR_DB ?? path.join(DATA_DIR, "jobradar.db"));
    conn.exec(SCHEMA);
    // Databases created before these columns existed.
    const addColumn = (table: string, column: string, type: string) => {
      if (!(conn.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column)) {
        conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    };
    addColumn("crawl_runs", "tokens", "INTEGER");
    addColumn("jobs", "viewed_at", "TEXT");
    addColumn("jobs", "saved_at", "TEXT");
    g.jobRadarDb = conn;
  }
  return g.jobRadarDb;
}

export type Profile = {
  cvText: string;
  skills: string[];
  roles: string[];
  locations: string[];
  years: number | null;
  minSalaryUsd: number | null;
  updatedAt: string;
};

type Row = {
  cv_text: string;
  skills: string;
  roles: string;
  locations: string;
  years: number | null;
  min_salary_usd: number | null;
  updated_at: string;
};

export function getProfile(): Profile | null {
  const row = db().prepare("SELECT * FROM profile WHERE id = 1").get() as Row | undefined;
  if (!row) return null;
  return {
    cvText: row.cv_text,
    skills: JSON.parse(row.skills),
    roles: JSON.parse(row.roles),
    locations: JSON.parse(row.locations),
    years: row.years,
    minSalaryUsd: row.min_salary_usd,
    updatedAt: row.updated_at,
  };
}

export function saveProfile(p: Omit<Profile, "updatedAt">): void {
  db()
    .prepare(
      `INSERT INTO profile (id, cv_text, skills, roles, locations, years, min_salary_usd, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET cv_text = excluded.cv_text, skills = excluded.skills,
         roles = excluded.roles, locations = excluded.locations, years = excluded.years,
         min_salary_usd = excluded.min_salary_usd, updated_at = excluded.updated_at`,
    )
    .run(
      p.cvText,
      JSON.stringify(p.skills),
      JSON.stringify(p.roles),
      JSON.stringify(p.locations),
      p.years,
      p.minSalaryUsd,
      new Date().toISOString(),
    );
}

export const PROFILE_FIELDS = ["skills", "roles", "locations", "years", "minSalaryUsd"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Fields whose value differs; list order and case of skills do not count. */
export function changedFields(a: Omit<Profile, "cvText" | "updatedAt">, b: Omit<Profile, "cvText" | "updatedAt">): ProfileField[] {
  const norm = (v: unknown) =>
    Array.isArray(v) ? JSON.stringify(v.map((s) => String(s).toLowerCase()).sort()) : String(v ?? "");
  return PROFILE_FIELDS.filter((f) => norm(a[f]) !== norm(b[f]));
}

export type CvFile = { id: number; fileName: string; uploadedAt: string };

export const cvPath = (id: number) => path.join(DATA_DIR, "cvs", `${id}.pdf`);

/** Records an upload and returns its id; the caller writes the file to cvPath(id). */
export function addCv(fileName: string): number {
  const r = db().prepare("INSERT INTO cvs (file_name, uploaded_at) VALUES (?, ?)").run(fileName, new Date().toISOString());
  return Number(r.lastInsertRowid);
}

export function listCvs(): CvFile[] {
  return db().prepare("SELECT id, file_name AS fileName, uploaded_at AS uploadedAt FROM cvs ORDER BY id DESC").all() as CvFile[];
}

export function getCv(id: number): CvFile | null {
  return (db().prepare("SELECT id, file_name AS fileName, uploaded_at AS uploadedAt FROM cvs WHERE id = ?").get(id) as CvFile | undefined) ?? null;
}
