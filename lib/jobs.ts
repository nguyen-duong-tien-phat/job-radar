import { db } from "./db";
import { decodeEntities, htmlToText } from "./html";
import { extractSkills, fold } from "./skills";

// Kept importable from here for the sources and their tests.
export { decodeEntities, htmlToText };

/** A job as a source returns it, before filtering and storage. */
export type RawJob = {
  url: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  salary?: string | null;
  postedAt?: string | null;
};

const VIETNAM = /\b(viet ?nam|ho chi minh|hcmc?|sai gon|saigon|ha noi|hanoi|da nang|danang|can tho|hai phong)\b/;
const TECH_TITLE =
  /\b(engineer|engineering|developer|dev|devops|sre|architect|programmer|software|frontend|front-end|backend|back-end|full ?stack|mobile|ios|android|data|qa|qc|tester|test|automation|cloud|security|machine learning|ml|ai|it|lap trinh|ky su|phat trien|kiem thu|du lieu|pentest|penetration|tech lead|cto)\b/;
// Titles that look technical but are other trades.
const NON_TECH_TITLE =
  /\b(sales|pre-?sales?|account|marketing|recruit\w*|talent|hr|human resources|technician|mechanical|civil|electrical|dien(?! toan)|co khi|xay dung|ban hang|kinh doanh|ke toan)\b/;

// "USA Only", "Remote (EU only)": remote, but not open to someone in Vietnam.
const REGION_ONLY = /\bonly\b/;
const OPEN_REGION = /\b(worldwide|anywhere|global|asia|apac|southeast asia|viet ?nam)\b/;

/** In scope: in Vietnam, or remote and not limited to another region. */
export function isTargetLocation(job: Pick<RawJob, "location" | "remote">): boolean {
  const loc = fold(job.location);
  if (VIETNAM.test(loc)) return true;
  return job.remote && !(REGION_ONLY.test(loc) && !OPEN_REGION.test(loc));
}

/** A technical job: a technical title that is not another trade, or a clearly skill-heavy posting. */
export function isTechJob(job: Pick<RawJob, "title" | "description">): boolean {
  const title = fold(job.title);
  if (NON_TECH_TITLE.test(title)) return false;
  return TECH_TITLE.test(title) || extractSkills(`${job.title}\n${job.description}`).length >= 4;
}

export type SaveResult = { kept: number; added: number };

/**
 * Upserts jobs for one source. When `complete` (the source returned its whole list),
 * jobs of that source that were not returned get `missed` + 1.
 */
export function saveJobs(source: string, official: boolean, jobs: RawJob[], complete: boolean): SaveResult {
  const conn = db();
  const now = new Date().toISOString();
  const exists = conn.prepare("SELECT 1 FROM jobs WHERE url = ?");
  const upsert = conn.prepare(
    `INSERT INTO jobs (url, source, official, company, title, location, remote, description, salary, posted_at, first_seen, last_seen, missed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT (url) DO UPDATE SET title = excluded.title, company = excluded.company, location = excluded.location,
       remote = excluded.remote, description = excluded.description, salary = excluded.salary,
       posted_at = COALESCE(excluded.posted_at, jobs.posted_at), last_seen = excluded.last_seen, missed = 0`,
  );
  let added = 0;
  const seen = new Set<string>();
  conn.exec("BEGIN");
  try {
    for (const j of jobs) {
      if (seen.has(j.url)) continue;
      seen.add(j.url);
      if (!exists.get(j.url)) added++;
      upsert.run(j.url, source, official ? 1 : 0, j.company, j.title, j.location, j.remote ? 1 : 0, j.description, j.salary ?? null, j.postedAt ?? null, now, now);
    }
    if (complete) conn.prepare("UPDATE jobs SET missed = missed + 1 WHERE source = ? AND last_seen < ?").run(source, now);
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
  return { kept: seen.size, added };
}

export function recordRun(source: string, startedAt: string, r: { ok: boolean; fetched: number; kept: number; added: number; error?: string; tokens?: number }) {
  db()
    .prepare("INSERT INTO crawl_runs (source, started_at, ok, fetched, kept, added, error, tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(source, startedAt, r.ok ? 1 : 0, r.fetched, r.kept, r.added, r.error ?? null, r.tokens ?? null);
}

export function setSaved(id: number, saved: boolean) {
  db().prepare("UPDATE jobs SET saved_at = ? WHERE id = ?").run(saved ? new Date().toISOString() : null, id);
}

export function markViewed(id: number) {
  db().prepare("UPDATE jobs SET viewed_at = ? WHERE id = ? AND viewed_at IS NULL").run(new Date().toISOString(), id);
}
