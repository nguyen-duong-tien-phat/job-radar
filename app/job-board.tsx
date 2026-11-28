import type { Profile } from "@/lib/db";
import { lastCrawlAt, rankedJobs } from "@/lib/score";
import { ago, sourceName, updatedAt } from "@/lib/ui";

const SHOWN = 100;
// The board's own width (container query), not the viewport, decides its columns: it sits beside the profile.
const COLS = "grid-cols-[3rem_minmax(0,1fr)] @3xl:grid-cols-[3.5rem_minmax(0,1fr)_12rem_9rem_4.5rem]";

const list = (skills: string[], max = 5) => skills.slice(0, max).join(", ") + (skills.length > max ? ` +${skills.length - max}` : "");

export function JobBoard({ profile, className = "" }: { profile: Profile; className?: string }) {
  const jobs = rankedJobs(profile);
  const crawled = lastCrawlAt();

  return (
    <section aria-labelledby="jobs-title" className={`@container flex min-h-0 flex-col ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 id="jobs-title" className="text-xl font-semibold tracking-tight">
          Job hợp với bạn
        </h1>
        <p className="text-sm text-steel">
        {jobs.length ? (
          <>
            <span className="figure">{jobs.length}</span> job ở VN và remote, xếp theo độ hợp
            {crawled && (
              <>
                {" "}
                · lấy lúc <span className="figure">{updatedAt(crawled)}</span>
              </>
            )}
          </>
        ) : (
          "Chưa có job nào."
        )}
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-4 max-w-xl rounded-md border border-seam bg-slate px-6 py-6">
          <p>Chạy lệnh này trong thư mục dự án để lấy job từ các nguồn, mất khoảng 2 phút:</p>
          <pre className="figure mt-4 rounded-md border border-seam-strong px-4 py-3 text-sm">npm run crawl</pre>
          <p className="mt-4 text-sm text-steel">Xong thì tải lại trang này.</p>
        </div>
      ) : (
        <div className="relative mt-4 min-h-0 flex-1 overflow-y-auto rounded-md border border-seam bg-slate">
          <div className={`sticky top-0 z-10 hidden gap-4 border-b border-seam bg-slate px-5 py-3 @3xl:grid ${COLS}`} aria-hidden="true">
            <span className="caption">Điểm</span>
            <span className="caption">Job</span>
            <span className="caption">Công ty · nguồn</span>
            <span className="caption">Nơi làm</span>
            <span className="caption text-right">Đăng</span>
          </div>
          <ol>
            {jobs.slice(0, SHOWN).map((j) => (
              <li key={j.id} className="border-b border-seam last:border-b-0">
                <a
                  href={j.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`grid gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-seam/50 focus-visible:-outline-offset-2 ${COLS}`}
                >
                  <span className={`figure row-span-3 text-2xl leading-tight @3xl:row-span-1 ${j.score >= 70 ? "text-paper" : "text-steel"}`}>
                    <span className="sr-only">Điểm </span>
                    {j.score}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-medium">{j.title}</span>
                    <span className="mt-0.5 block text-sm text-steel">
                      {j.matched.length > 0 && <>Hợp: <span className="text-paper">{list(j.matched)}</span></>}
                      {j.matched.length > 0 && j.missing.length > 0 && " · "}
                      {j.missing.length > 0 && <>Thiếu: {list(j.missing, 4)}</>}
                      {!j.matched.length && !j.missing.length && "Tin không nêu skill cụ thể"}
                    </span>
                  </span>
                  <span className="col-start-2 min-w-0 text-sm @3xl:col-start-auto">
                    <span className="block truncate">{j.company || "—"}</span>
                    <span className={`flex items-center gap-1.5 truncate text-xs ${j.official ? "text-paper" : "text-steel"}`}>
                      {j.official ? (
                        <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true" className="shrink-0">
                          <path d="M1 4l2.5 2.5L9 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                      {sourceName(j.source)}
                    </span>
                  </span>
                  <span className="col-start-2 flex flex-wrap gap-x-3 text-sm text-steel @3xl:col-start-auto @3xl:block">
                    <span className="block truncate">{j.remote ? "Remote" : j.location}</span>
                    {j.salary && <span className="figure block truncate text-xs">{j.salary}</span>}
                    <span className="figure ml-auto @3xl:hidden">{ago(j.posted_at ?? j.first_seen)}</span>
                  </span>
                  <span className="figure hidden text-right text-sm text-steel @3xl:block">{ago(j.posted_at ?? j.first_seen)}</span>
                </a>
              </li>
            ))}
          </ol>
          {jobs.length > SHOWN && (
            <p className="border-t border-seam px-5 py-3 text-sm text-steel">
              Đang hiện <span className="figure">{SHOWN}</span> job có điểm cao nhất.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
