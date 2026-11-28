// Every other day: ask Claude Code (headless, on the owner's Claude plan) to search the web for jobs and
// for companies with public ATS boards, then store what passes validation.
// Usage: npm run search                  (skips until the interval set in the app's settings has passed)
//        npm run search -- --force
//        npm run search -- --file data/claude/2026-11-28.json   (import a saved answer, no Claude call)
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  addVerifiedCompanies,
  buildPrompt,
  hoursSinceLastSearch,
  RESULT_SCHEMA,
  SOURCE,
  toolCalls,
  toRawJob,
  trackedCompanies,
  validateResult,
} from "../lib/claude-search";
import { DATA_DIR, getProfile } from "../lib/db";
import { isTargetLocation, isTechJob, recordRun, saveJobs } from "../lib/jobs";
import { getSettings, hardLimit } from "../lib/settings";
import { fetchAts } from "../lib/sources/ats";

const args = process.argv.slice(2);
const file = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;
const settings = getSettings();
const MODEL = settings.model;
const HARD_LIMIT = hardLimit(settings);
const MIN_HOURS = settings.searchEveryDays * 24 - 4; // slack for a scheduler that fires a little early

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
  console.log(`Claude search: model ${MODEL}, asks for ≤${settings.searches} searches / ≤${settings.fetches} fetches, stops at ${HARD_LIMIT.searches} / ${HARD_LIMIT.fetches}.`);
  // Only web search and fetch: no shell, no file writes. Run outside the repo so no project settings load.
  // stream-json lets us count tool calls as they happen and stop a run that goes over budget.
  const child = spawn(
    "claude",
    ["-p", "--model", MODEL, "--output-format", "stream-json", "--verbose", "--json-schema", JSON.stringify(RESULT_SCHEMA), "--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch", "--strict-mcp-config", "--no-session-persistence"],
    { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] },
  );
  child.stdin.end(buildPrompt(profile, trackedCompanies(), today, settings));
  const used = { searches: 0, fetches: 0 };
  let final = "";
  let stopped: string | null = null;
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const timer = setTimeout(() => stop("took longer than 15 minutes"), 15 * 60_000);
  function stop(reason: string) {
    stopped ??= reason;
    child.kill("SIGTERM");
  }
  for await (const line of createInterface({ input: child.stdout })) {
    let event: { type?: string };
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const n = toolCalls(event);
    used.searches += n.searches;
    used.fetches += n.fetches;
    if (used.searches > HARD_LIMIT.searches || used.fetches > HARD_LIMIT.fetches) stop(`over budget (${used.searches} searches, ${used.fetches} fetches)`);
    if (event.type === "result") final = line;
  }
  const code = await new Promise<number | null>((r) => (child.exitCode !== null ? r(child.exitCode) : child.on("close", r)));
  clearTimeout(timer);
  if (stopped || code !== 0 || !final) {
    const error = stopped ? `stopped: ${stopped}` : (stderr.trim().slice(0, 500) || `exit ${code}`);
    recordRun(SOURCE, startedAt, { ok: false, fetched: 0, kept: 0, added: 0, error });
    console.error(`Claude search failed: ${error}`);
    process.exit(1);
  }
  raw = final;
  mkdirSync(path.join(DATA_DIR, "claude"), { recursive: true });
  writeFileSync(path.join(DATA_DIR, "claude", `${today}.json`), raw);
  const out = JSON.parse(raw) as { num_turns?: number; usage?: Record<string, number>; total_cost_usd?: number };
  const u = out.usage ?? {};
  console.log(
    `Used: ${used.searches} searches, ${used.fetches} fetches, ${out.num_turns ?? "?"} turns; tokens in ${u.input_tokens ?? 0} (+${u.cache_read_input_tokens ?? 0} cached), out ${u.output_tokens ?? 0}` +
      (out.total_cost_usd ? ` (≈ $${out.total_cost_usd.toFixed(2)} at API prices; on a Claude plan this counts against usage limits, not money).` : "."),
  );
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
  `Claude search: ${result.jobs.length} jobs returned (${result.jobs.filter((j) => j.fit >= settings.enoughFit).length} rated fit ≥ ${settings.enoughFit}), ${official.kept + board.kept} kept (${official.added + board.added} new), ${dropped} malformed entries dropped.\n` +
    `Companies added to the daily crawl: ${companies.length ? companies.join(", ") : "none"} (of ${result.companies.length} suggested).`,
);
