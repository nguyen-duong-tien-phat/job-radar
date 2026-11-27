# Source review

First review 2026-11-27 (M0), updated the same day after M4. The **robots** column is the result of reading `/robots.txt` with the User-Agent `job-radar/0.1`. The **ToS** column records what was actually read and what has not been verified.

**Rules:** use only public APIs/RSS feeds, or listing pages that robots.txt does not block. Do not bypass logins, CAPTCHAs, Cloudflare challenges or other anti-bot systems. Do not change the User-Agent to evade blocking. Rate limit: at most 1 request per second per host.

Status values: **implemented** (adapter + tests in `scraper/jobradar/sources/`), **blocked** (the site refuses this client), **excluded** (robots.txt forbids it), **todo**.

## International (intl)

| Source | Status | Method | robots | ToS | Notes |
|---|---|---|---|---|---|
| **RemoteOK** | implemented | JSON API `remoteok.com/api` | `Allow: /`, `search=yes`, `ai-train=no`, `use=reference` | API terms in the response: **must link back to remoteok.com (follow, not nofollow) and name "Remote OK" as the source, or API access is cut off** | Salary is annual USD. Many non-IT jobs |
| **We Work Remotely** | implemented | RSS: programming + devops feeds | `Allow: /`, only `/admin/`, `/account/`, ... blocked | **Not reviewed**: `/terms` returns a Cloudflare challenge, so it cannot be read by this client | No salary field. Review the terms manually before scheduling |
| **HN "Who is hiring"** | implemented | HN Algolia API (latest monthly thread) | No robots.txt (404); public documented API | Not reviewed | Best-effort parsing of the `Company \| Role \| ...` header. Salary parsed from the header only. Only jobs with a known skill are kept |
| **Arbeitnow** | implemented | JSON API `arbeitnow.com/api/job-board-api`, first page | Everything allowed | API terms (`meta.terms`): free public API, do not abuse it, link back; **commercial use needs a fee agreement**. Website terms (personal, non-commercial viewing) not fully reviewed | Mostly Germany/EU. About 40% of jobs match a known skill; only those are kept. Fine for this non-commercial portfolio; the dashboard must link back |
| **Remotive** | excluded | API `remotive.com/api/remote-jobs` | **`Disallow: /api/*`** | Not reviewed | robots forbids the API endpoint itself |
| **The Muse** | blocked | API `themuse.com/api/public/jobs` | Only `/apply/` disallowed | Not reviewed | Server returns 403 to this client |
| **Adzuna** | todo | API `api.adzuna.com`, needs `app_id`/`app_key` | `robots.txt` returns 403 | Terms not read | Needs a free API key (account creation by the owner) |

## Vietnam (vn)

| Source | Status | robots | Findings | Notes |
|---|---|---|---|---|
| **TopDev** | implemented | `Allow: /`; blocks login, `/oauth2`, `/td/v2/users`, ... | `/jobs/search?page=N` lists job links; each `/detail-jobs/...` page has schema.org `JobPosting` JSON-LD (title, date, skills, salary min/max/unit). The site API returns only a stub without authentication, so it is not used | ToS **not reviewed**. The listing mixes in non-IT jobs, so only jobs with a known skill are kept (about 14 of 45 per run). 3 pages per run, one detail request per job |
| **ITviec** | blocked | `Allow: /` | Plain request returns 403 with a Cloudflare challenge | Not pursued: bypassing the challenge is out of bounds |
| **TopCV** | blocked | Only personal CV pages blocked | Plain request returns 403 with a Cloudflare challenge | Not pursued, same reason |
| **VietnamWorks** | todo | Only profile/apply pages blocked | The listing page is a Next.js app; its page data holds only a handful of featured jobs. The full search goes through an internal API that has not been examined | Needs a decision on whether using that internal API is acceptable |
| **CareerViet** | todo | No rule for generic bots | The listing HTML contains no job links (rendered client-side) | Needs a closer look |

## Not yet checked

- Terms of service for We Work Remotely, HN Algolia, TopDev, VietnamWorks, CareerViet, Adzuna.
- These need a manual read before the daily schedule is turned on. This is not legal advice.

## Impact on design

- The dashboard shows the source name and a link to each job's original `url`. RemoteOK and Arbeitnow require this explicitly.
- Every job stores `source` and the original `url`, so attribution works for every source.
- `Source.require_skills = True` marks general boards (Arbeitnow, HN, TopDev): jobs without any known skill are dropped before saving.
