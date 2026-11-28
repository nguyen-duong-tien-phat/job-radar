// Fetches jobs from every source and stores the technical ones in Vietnam or remote.
// Usage: npm run crawl            (all sources)
//        npm run crawl -- topdev remoteok greenhouse:workatbackbase
import { isTargetLocation, isTechJob, recordRun, saveJobs } from "../lib/jobs";
import { getSources } from "../lib/sources";

const only = process.argv.slice(2);
const sources = getSources().filter((s) => !only.length || only.includes(s.name));
if (!sources.length) {
  console.error(`No source named ${only.join(", ")}. Known: ${getSources().map((s) => s.name).join(", ")}`);
  process.exit(1);
}

const results = await Promise.all(
  sources.map(async (s) => {
    const startedAt = new Date().toISOString();
    try {
      const fetched = await s.fetch();
      const keep = fetched.filter((j) => j.url && j.title && isTargetLocation(j) && isTechJob(j));
      const { kept, added } = saveJobs(s.name, s.official, keep, s.complete);
      recordRun(s.name, startedAt, { ok: true, fetched: fetched.length, kept, added });
      return `${s.name.padEnd(32)} ${String(fetched.length).padStart(5)} fetched ${String(kept).padStart(4)} kept ${String(added).padStart(4)} new`;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      recordRun(s.name, startedAt, { ok: false, fetched: 0, kept: 0, added: 0, error });
      return `${s.name.padEnd(32)} FAILED ${error}`;
    }
  }),
);
console.log(results.join("\n"));
