import Link from "next/link";
import type { Profile } from "@/lib/db";
import {
  type Filter,
  FILTERS,
  filterJobs,
  lastCrawlAt,
  latestRunStart,
  rankedJobs,
  searchJobs,
  type Sort,
  SORTS,
  sortJobs,
} from "@/lib/score";
import { runningPid } from "@/lib/run";
import { scheduleInstalled } from "@/lib/schedule";
import { companyCount, lastSearchTokens } from "@/lib/claude-search";
import { getSettings, MODELS, RANGES } from "@/lib/settings";
import { ago, nextRunDay, sourceName, updatedAt } from "@/lib/ui";
import { JobDetail, JobRowButton } from "./job-detail";
import { BoardSearch } from "./board-search";
import { RunButton } from "./run-button";
import { SaveButton } from "./save-button";
import { SettingsDialog } from "./settings-dialog";

// The board's own width (container query), not the viewport, decides its columns: it sits beside the profile.
const COLS =
  "grid-cols-[3rem_minmax(0,1fr)] @3xl:grid-cols-[3.5rem_minmax(0,1fr)_12rem_9rem_4.5rem]";

// Score bands carry colour: strong green, workable amber, weak grey.
const scoreTone = (s: number) =>
  s >= 75
    ? "bg-good-dim text-good"
    : s >= 55
      ? "bg-warm-dim text-warm"
      : "bg-seam/60 text-steel";

const list = (skills: string[], max = 5) =>
  skills.slice(0, max).join(", ") +
  (skills.length > max ? ` +${skills.length - max}` : "");

const pad = (n: number) => String(n).padStart(2, "0");

/** Automatic mode: when the next run happens, instead of the "Find jobs" button. */
function ScheduleInfo({
  hour,
  minute,
  everyDays,
  installed,
}: {
  hour: number;
  minute: number;
  everyDays: number | null;
  installed: boolean;
}) {
  if (!installed) {
    return <p className="text-sm text-alert">Schedule not installed</p>;
  }
  const day = nextRunDay(hour, minute);
  return (
    <p className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-signal px-4 text-sm font-semibold whitespace-nowrap text-ink">
      Auto {day}
      <span className="figure">
        {pad(hour)}:{pad(minute)}
      </span>
      {everyDays !== null && (
        <>
          · Claude every <span className="figure">{everyDays}</span>d
        </>
      )}
    </p>
  );
}

/** The board URL for a sort, a label filter and a text search, leaving defaults out. */
const boardHref = (sort: Sort, filter: Filter, text: string) => {
  const q = new URLSearchParams();
  if (sort !== "new") q.set("sort", sort);
  if (filter !== "all") q.set("filter", filter);
  if (text) q.set("q", text);
  return q.size ? `/?${q}` : "/";
};

export function JobBoard({
  profile,
  sort,
  filter,
  q,
  className = "",
}: {
  profile: Profile;
  sort: Sort;
  filter: Filter;
  q: string;
  className?: string;
}) {
  const all = sortJobs(rankedJobs(profile), sort);
  const crawled = lastCrawlAt();
  const runStart = latestRunStart();
  const settings = getSettings();
  const shown = settings.jobsShown;
  const running = runningPid() !== null;
  // Found by the latest run; everything else was found earlier.
  const isNew = (firstSeen: string) =>
    runStart !== null && firstSeen >= runStart;
  const searched = searchJobs(all, q);
  const jobs = filterJobs(searched, filter, isNew);
  const counts = Object.fromEntries(
    (Object.keys(FILTERS) as Filter[]).map((f) => [
      f,
      filterJobs(searched, f, isNew).length,
    ]),
  ) as Record<Filter, number>;
  const newCount = counts.new;

  return (
    <section
      aria-labelledby="jobs-title"
      className={`@container flex min-h-0 flex-col ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 id="jobs-title" className="text-xl font-semibold tracking-tight">
          Jobs for you
        </h1>
        <nav aria-label="Sort" className="flex gap-1">
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <Link
              key={s}
              href={boardHref(s, filter, q)}
              scroll={false}
              aria-current={sort === s ? "true" : undefined}
              className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${sort === s ? "bg-signal-dim font-medium text-signal" : "text-steel hover:text-paper"}`}
            >
              {SORTS[s]}
            </Link>
          ))}
        </nav>
        <p className="ml-auto text-sm text-steel">
          {all.length ? (
            <>
              <span className="figure">{all.length}</span> jobs
              {newCount > 0 && (
                <>
                  {" "}
                  · <span className="figure text-signal">{newCount}</span> new
                </>
              )}
              {crawled && (
                <>
                  {" "}
                  · <span className="figure">{updatedAt(crawled)}</span>
                </>
              )}
            </>
          ) : (
            "No jobs yet"
          )}
        </p>
        {settings.mode === "auto" && !running ? (
          <>
            <ScheduleInfo
              hour={settings.runHour}
              minute={settings.runMinute}
              everyDays={
                settings.disabledSources.includes("claude-search")
                  ? null
                  : settings.searchEveryDays
              }
              installed={scheduleInstalled()}
            />
            <RunButton running={false} terms={settings.searchTerms} label="Run now" secondary />
          </>
        ) : (
          <RunButton running={running} terms={settings.searchTerms} />
        )}
        <SettingsDialog
          settings={settings}
          ranges={RANGES}
          models={MODELS}
          companies={companyCount()}
          lastSearchTokens={lastSearchTokens()}
        />
      </div>

      {all.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <Link
                key={f}
                href={boardHref(sort, f, q)}
                scroll={false}
                aria-current={filter === f ? "true" : undefined}
                className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] transition-colors ${
                  filter === f
                    ? "border-paper bg-paper font-medium text-ink"
                    : "border-seam-strong text-steel hover:border-steel hover:text-paper"
                }`}
              >
                {FILTERS[f]}
                <span className="figure text-xs opacity-70">{counts[f]}</span>
              </Link>
            ))}
          </nav>
          <BoardSearch />
        </div>
      )}

      {all.length === 0 ? (
        <div className="mt-4 max-w-xl rounded-md border border-seam bg-slate px-6 py-6">
          <pre className="figure rounded-md border border-seam-strong px-4 py-3 text-sm">
            npm run crawl
          </pre>
        </div>
      ) : jobs.length === 0 ? (
        <p className="mt-4 rounded-md border border-seam bg-slate px-5 py-6 text-sm text-steel">
          No {filter === "all" ? "" : `${FILTERS[filter].toLowerCase()} `}jobs
          {q ? ` matching “${q}”` : ""}.
        </p>
      ) : (
        <div className="relative mt-4 min-h-0 flex-1 overflow-y-auto rounded-md border border-seam bg-slate">
          <div
            className={`sticky top-0 z-10 hidden gap-4 border-b border-seam bg-slate py-3 pr-14 pl-5 @3xl:grid ${COLS}`}
            aria-hidden="true"
          >
            <span className="caption">Score</span>
            <span className="caption">Job</span>
            <span className="caption">Company · source</span>
            <span className="caption">Location</span>
            <span className="caption text-right">Posted</span>
          </div>
          <ol>
            {jobs.slice(0, shown).map((j) => (
              // Rows found by an earlier run are dimmed; new ones carry a "New" tag.
              <li
                key={j.id}
                className="relative border-b border-seam last:border-b-0"
              >
                <JobRowButton
                  id={j.id}
                  className={`grid gap-x-4 gap-y-1 py-4 pr-14 pl-5 transition-colors hover:bg-seam/50 focus-visible:-outline-offset-2 ${COLS}`}
                >
                  <span className="row-span-3 @3xl:row-span-1">
                    <span
                      className={`figure inline-flex h-9 w-11 items-center justify-center rounded-md text-lg font-medium ${scoreTone(j.score)}`}
                    >
                      <span className="sr-only">Score </span>
                      {j.score}
                    </span>
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span
                      className={`block font-medium ${isNew(j.first_seen) ? "" : "text-paper/75"}`}
                    >
                      {isNew(j.first_seen) && (
                        <span className="mr-2 rounded bg-signal px-1.5 py-0.5 align-[2px] text-[11px] font-bold tracking-wide text-ink uppercase">
                          New
                        </span>
                      )}
                      {j.viewed_at && (
                        <span className="mr-2 rounded bg-cool px-1.5 py-0.5 align-[2px] text-[11px] font-bold tracking-wide text-ink uppercase">
                          Viewed
                        </span>
                      )}
                      {j.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-steel">
                      {j.matched.length > 0 && (
                        <>
                          Matches:{" "}
                          <span className="text-good">{list(j.matched)}</span>
                        </>
                      )}
                      {j.matched.length > 0 && j.missing.length > 0 && " · "}
                      {j.missing.length > 0 && (
                        <>
                          Missing:{" "}
                          <span className="text-rose">
                            {list(j.missing, 4)}
                          </span>
                        </>
                      )}
                      {!j.matched.length &&
                        !j.missing.length &&
                        "No skills listed"}
                    </span>
                  </span>
                  <span className="col-start-2 min-w-0 text-sm @3xl:col-start-auto">
                    <span className="block truncate">{j.company || "—"}</span>
                    <span
                      className={`flex items-center gap-1.5 truncate text-xs ${j.official ? "text-good" : "text-steel"}`}
                    >
                      {j.official ? (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          aria-hidden="true"
                          className="shrink-0"
                        >
                          <path
                            d="M1 4l2.5 2.5L9 1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                      {sourceName(j.source)}
                    </span>
                  </span>
                  <span className="col-start-2 flex flex-wrap gap-x-3 text-sm text-steel @3xl:col-start-auto @3xl:block">
                    <span
                      className={`block truncate ${j.remote ? "text-cool" : ""}`}
                    >
                      {j.remote ? "Remote" : j.location}
                    </span>
                    {j.salary && (
                      <span className="figure block truncate text-xs">
                        {j.salary}
                      </span>
                    )}
                    <span className="figure ml-auto @3xl:hidden">
                      {ago(j.posted_at ?? j.first_seen)}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm text-steel @3xl:block">
                    <span className="figure block">
                      {ago(j.posted_at ?? j.first_seen)}
                    </span>
                    {!isNew(j.first_seen) && (
                      <span className="block text-xs">
                        seen {ago(j.first_seen)}
                      </span>
                    )}
                  </span>
                </JobRowButton>
                {/* Outside the row button: a button cannot hold another button. */}
                <SaveButton
                  id={j.id}
                  saved={Boolean(j.saved_at)}
                  className="absolute top-3.5 right-3"
                />
              </li>
            ))}
          </ol>
          {jobs.length > shown && (
            <p className="border-t border-seam px-5 py-3 text-sm text-steel">
              <span className="figure">{shown}</span> /{" "}
              <span className="figure">{jobs.length}</span>
            </p>
          )}
        </div>
      )}
      <JobDetail />
    </section>
  );
}
