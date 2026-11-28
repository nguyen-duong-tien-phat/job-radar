import { db, type Profile } from "./db";
import { extractSkills, fold } from "./skills";

export type JobRow = {
  id: number;
  url: string;
  source: string;
  official: number;
  company: string;
  title: string;
  location: string;
  remote: number;
  description: string;
  salary: string | null;
  posted_at: string | null;
  first_seen: string;
};

export type Scored = JobRow & { score: number; matched: string[]; missing: string[] };

const CITY: Record<string, RegExp> = {
  hcm: /\b(ho chi minh|hcmc?|sai gon|saigon|tp\.? ?hcm)\b/,
  hn: /\b(ha noi|hanoi)\b/,
  dn: /\b(da nang|danang)\b/,
};

/** Where the job is vs where the user wants to work: 0–20. */
function locationPoints(job: Pick<JobRow, "location" | "remote">, wanted: string[]): number {
  if (job.remote && wanted.includes("remote")) return 20;
  const loc = fold(job.location);
  if (wanted.some((w) => CITY[w]?.test(loc))) return 20;
  return 5; // in scope (crawler keeps Vietnam or remote only) but not where the user asked
}

/** Days since posted (or first seen): 0–10. */
function freshnessPoints(postedAt: string | null, firstSeen: string, now: number): number {
  const days = (now - Date.parse(postedAt ?? firstSeen)) / 86_400_000;
  if (!Number.isFinite(days)) return 3;
  return days <= 3 ? 10 : days <= 7 ? 7 : days <= 30 ? 3 : 0;
}

/**
 * 0–100: skills 70 (how many of the user's skills the job asks for, and how much of the job they cover),
 * location 20, freshness 10. Matched and missing skills explain the score.
 */
export function scoreJob(job: JobRow, profile: Pick<Profile, "skills" | "locations">, now = Date.now()): Scored {
  const asked = extractSkills(`${job.title}\n${job.description}`);
  const have = new Set(profile.skills.map((s) => s.toLowerCase()));
  const matched = asked.filter((s) => have.has(s.toLowerCase()));
  const missing = asked.filter((s) => !have.has(s.toLowerCase()));
  // A posting that names no known skill gets half marks instead of zero: unknown, not a mismatch.
  const skills = asked.length ? (Math.min(matched.length, 5) / 5) * 50 + (matched.length / asked.length) * 20 : 35;
  const score = Math.round(skills + locationPoints(job, profile.locations) + freshnessPoints(job.posted_at, job.first_seen, now));
  return { ...job, score, matched, missing };
}

const norm = (s: string) =>
  fold(s)
    .replace(/\b(cong ty|tnhh|co phan|jsc|ltd|inc|llc|vietnam|viet nam)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * One row per job: the same company + title from several sources keeps the official posting,
 * else the higher score.
 */
export function dedupe(jobs: Scored[]): Scored[] {
  const best = new Map<string, Scored>();
  for (const j of jobs) {
    const key = `${norm(j.company)}|${norm(j.title)}`;
    const cur = best.get(key);
    if (!cur || j.official > cur.official || (j.official === cur.official && j.score > cur.score)) best.set(key, j);
  }
  return [...best.values()];
}

/** Open jobs (not missing from 3+ complete runs), scored, one per job, best first. */
export function rankedJobs(profile: Pick<Profile, "skills" | "locations">): Scored[] {
  // shortcut: scores every stored job in memory on each page load; fine for a few thousand jobs, move scoring into the crawl if it grows past that.
  const rows = db().prepare("SELECT id, url, source, official, company, title, location, remote, description, salary, posted_at, first_seen FROM jobs WHERE missed < 3").all() as JobRow[];
  return dedupe(rows.map((r) => scoreJob(r, profile))).sort((a, b) => b.score - a.score);
}

export function lastCrawlAt(): string | null {
  const row = db().prepare("SELECT MAX(started_at) AS at FROM crawl_runs WHERE ok = 1").get() as { at: string | null };
  return row.at;
}

export const SORTS = { new: "Newest", match: "Best match", posted: "Posted" } as const;
export type Sort = keyof typeof SORTS;

const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

/** new: found most recently, then best match; match: best match first; posted: most recently posted. */
export function sortJobs(jobs: Scored[], sort: Sort): Scored[] {
  const by: Record<Sort, (a: Scored, b: Scored) => number> = {
    new: (a, b) => time(b.first_seen) - time(a.first_seen) || b.score - a.score,
    match: (a, b) => b.score - a.score || time(b.first_seen) - time(a.first_seen),
    posted: (a, b) => time(b.posted_at ?? b.first_seen) - time(a.posted_at ?? a.first_seen) || b.score - a.score,
  };
  return [...jobs].sort(by[sort]);
}

/**
 * Start of the latest run (crawl + web search started together, within an hour).
 * Jobs first seen since then are "new"; the rest were found by an earlier run.
 */
export function latestRunStart(): string | null {
  const last = (db().prepare("SELECT MAX(started_at) AS at FROM crawl_runs WHERE ok = 1").get() as { at: string | null }).at;
  if (!last) return null;
  const from = new Date(Date.parse(last) - 3_600_000).toISOString();
  return (db().prepare("SELECT MIN(started_at) AS at FROM crawl_runs WHERE ok = 1 AND started_at >= ?").get(from) as { at: string }).at;
}
