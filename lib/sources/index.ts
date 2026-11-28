import { db } from "../db";
import { getSettings } from "../settings";
import type { RawJob } from "../jobs";
import { ATS, type Ats, fetchAts, SEED_COMPANIES } from "./ats";
import { fetchArbeitnow, fetchHn, fetchRemoteOk, fetchWwr } from "./remote";
import { fetchCareerLink, fetchTopDev, fetchVieclam24h } from "./vn";

export type Source = {
  name: string;
  /** The company's own career page. */
  official: boolean;
  /** Returns the source's whole current list, so a job missing from it is a sign it closed. */
  complete: boolean;
  fetch: () => Promise<RawJob[]>;
};

// CareerViet is not read: its terms forbid robots and spiders (docs/sources.md).
const BOARDS: Source[] = [
  { name: "remoteok", official: false, complete: true, fetch: fetchRemoteOk },
  { name: "arbeitnow", official: false, complete: false, fetch: fetchArbeitnow }, // first page only
  { name: "weworkremotely", official: false, complete: true, fetch: fetchWwr },
  { name: "hn-hiring", official: false, complete: true, fetch: fetchHn },
  { name: "topdev", official: false, complete: false, fetch: fetchTopDev },
  { name: "vieclam24h", official: false, complete: false, fetch: fetchVieclam24h },
  { name: "careerlink", official: false, complete: false, fetch: fetchCareerLink },
];

export function addCompany(ats: Ats, slug: string, name: string) {
  db().prepare("INSERT OR IGNORE INTO companies (ats, slug, name, added_at) VALUES (?, ?, ?, ?)").run(ats, slug, name, new Date().toISOString());
}

export function getSources(): Source[] {
  for (const c of SEED_COMPANIES) addCompany(c.ats, c.slug, c.name);
  const companies = db().prepare("SELECT ats, slug, name FROM companies ORDER BY ats, slug").all() as { ats: string; slug: string; name: string }[];
  const ats = companies
    .filter((c): c is { ats: Ats; slug: string; name: string } => (ATS as readonly string[]).includes(c.ats))
    .map((c) => ({
      name: `${c.ats}:${c.slug}`,
      official: true,
      // SmartRecruiters is capped and Vietnam-only, so it is not a complete list.
      complete: c.ats !== "smartrecruiters",
      fetch: () => fetchAts(c.ats, c.slug, c.name),
    }));
  const off = new Set(getSettings().disabledSources);
  return [...(off.has("ats") ? [] : ats), ...BOARDS.filter((b) => !off.has(b.name))];
}
