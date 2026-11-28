// Every other day: ask Claude Code (headless, on the owner's Claude plan) to search the web for jobs and
// for companies with public ATS boards, then store what passes validation.
// Usage: npm run search                  (skips when the last search was less than 44 hours ago)
//        npm run search -- --force
//        npm run search -- --file data/claude/2026-11-28.json   (import a saved answer, no Claude call)
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { addVerifiedCompanies, buildPrompt, hoursSinceLastSearch, RESULT_SCHEMA, SOURCE, toRawJob, trackedCompanies, validateResult } from "../lib/claude-search";
import { DATA_DIR, getProfile } from "../lib/db";
import { isTargetLocation, isTechJob, recordRun, saveJobs } from "../lib/jobs";
import { fetchAts } from "../lib/sources/ats";

const args = process.argv.slice(2);
const file = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;
const MIN_HOURS = 44; // "every other day", with slack for a scheduler that fires a little early

if (!file && !args.includes("--force") && hoursSinceLastSearch() < MIN_HOURS) {
  console.log(`Skipped: last web search was ${Math.round(hoursSinceLastSearch())} hours ago (runs every ${MIN_HOURS}+ hours; --force to run now).`);
  process.exit(0);
}
const profile = getProfile();
if (!profile) {
  console.error("No profile yet: upload a CV in the app first.");
  process.exit(1);
}

const startedAt = new Date().toISOString();
const today = startedAt.slice(0, 10);
let raw: string;
if (file) {
  raw = readFileSync(file, "utf8");
} else {
  // Only web search and fetch: no shell, no file writes. Run outside the repo so no project settings load.
  const run = spawnSync(
    "claude",
    ["-p", "--output-format", "json", "--json-schema", JSON.stringify(RESULT_SCHEMA), "--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch", "--strict-mcp-config", "--no-session-persistence"],
    { input: buildPrompt(profile, trackedCompanies(), today), cwd: tmpdir(), encoding: "utf8", timeout: 25 * 60_000, maxBuffer: 20 * 1024 * 1024 },
  );
  if (run.status !== 0) {
    const error = (run.error?.message ?? run.stderr ?? "").slice(0, 500) || `exit ${run.status}`;
    recordRun(SOURCE, startedAt, { ok: false, fetched: 0, kept: 0, added: 0, error });
    console.error(`Claude search failed: ${error}`);
    process.exit(1);
  }
  raw = run.stdout;
  mkdirSync(path.join(DATA_DIR, "claude"), { recursive: true });
  writeFileSync(path.join(DATA_DIR, "claude", `${today}.json`), raw);
}

let data: unknown;
try {
  const out = JSON.parse(raw);
  // --output-format json wraps the answer; a saved bare answer is accepted too.
  data = out.structured_output ?? (typeof out.result === "string" ? JSON.parse(out.result) : out);
} catch {
  data = null;
}
const { result, dropped } = validateResult(data);
const jobs = result.jobs.filter((j) => isTargetLocation(j) && isTechJob({ title: j.title, description: j.skills.join(", ") }));
const official = saveJobs(SOURCE, true, jobs.filter((j) => j.official).map(toRawJob), false);
const board = saveJobs(SOURCE, false, jobs.filter((j) => !j.official).map(toRawJob), false);
const companies = await addVerifiedCompanies(result.companies, (ats, slug) => fetchAts(ats, slug, slug));

recordRun(SOURCE, startedAt, { ok: true, fetched: result.jobs.length, kept: official.kept + board.kept, added: official.added + board.added });
console.log(
  `Claude search: ${result.jobs.length} jobs returned, ${official.kept + board.kept} kept (${official.added + board.added} new), ${dropped} malformed entries dropped.\n` +
    `Companies added to the daily crawl: ${companies.length ? companies.join(", ") : "none"} (of ${result.companies.length} suggested).`,
);
