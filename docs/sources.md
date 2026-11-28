# Source review

First review 2026-11-27 (M0), updated the same day after M4. The **robots** column is the result of reading `/robots.txt` with the User-Agent `job-radar/0.1`. The **ToS** column records what was actually read and what has not been verified.

**Rules:** use only public APIs/RSS feeds, or listing pages that robots.txt does not block. Do not bypass logins, CAPTCHAs, Cloudflare challenges or other anti-bot systems. Do not change the User-Agent to evade blocking. Rate limit: at most 1 request per second per host.

Status values: **implemented** (adapter + tests in `scraper/jobradar/sources/`), **blocked** (the site refuses this client), **excluded** (robots.txt forbids it), **todo**.

## v2 status (2026-11-28)

The v2 crawler (`lib/sources/`, run with `npm run crawl`) reads: company ATS boards (Greenhouse, Lever, Ashby, SmartRecruiters), RemoteOK, Arbeitnow, We Work Remotely, HN "Who is hiring", TopDev, Vieclam24h, CareerLink. User-Agent `job-radar/0.2 (personal, non-commercial job search)`, at least 1 s between requests to one host (CareerLink 2 s).

- **Company ATS boards** (official career pages): public JSON, no key. Greenhouse `boards-api.greenhouse.io/v1/boards/{slug}/jobs`, Lever `api.lever.co/v0/postings/{slug}`, Ashby `api.ashbyhq.com/posting-api/job-board/{slug}`, SmartRecruiters `api.smartrecruiters.com/v1/companies/{slug}/postings` (Vietnam only, details for at most 40 technical titles per run). Workable is not implemented: its public widget endpoint returned 404 when checked.
- **ITviec, Indeed**: blocked. Both answer this client with a Cloudflare challenge (403, checked again 2026-11-28). Not bypassed. They can only appear as links found by the daily web search.
- **CareerViet**: readable, but not read. Its terms forbid "browsers, spiders, robots … to navigate or search" the site (see below). Enabling it is the owner's decision.
- **CareerLink**: still returns a generic empty page after a burst; the crawler stops after 5 empty pages in a row.

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

Checked and updated 2026-11-27. Every readable site publishes schema.org `JobPosting` JSON-LD on its job pages, found through the sitemap its robots.txt advertises. For a general board, a keyword or category filter picks technical jobs before any page is downloaded, then `require_skills` drops what still has no known skill.

| Source | Status | robots | How it is read | Notes |
|---|---|---|---|---|
| **Vieclam24h** | implemented | `Disallow` only for admin, account and `?q` search URLs | `sitemap-index.xml` -> `daily/job-*.xml` -> `job/tintuyendung-N.xml` (about 5,000 URLs each, all industries). The industry is the first path segment, so only `it-phan-mem` and `it-phan-cung-mang` URLs are fetched, newest id first, up to 120 per run | ToS **not reviewed**. Returns **403 when a page request prefers JSON over HTML**, so job pages are requested with an HTML `Accept` header. 40 of 47 stored jobs have a salary range |
| **TopDev** | implemented | `Allow: /`; blocks login, `/oauth2`, `/td/v2/users`, ... | `/jobs/search` (2 generic pages plus one page for each of 9 technical keywords), then each `/detail-jobs/...` page's JSON-LD. Up to 100 jobs per run, 1.5 s between requests | ToS **not reviewed**. The site's own API returns only a stub without authentication, so it is not used. The `Yeti` bot is blocked |
| **CareerViet** | not read (v2) | No rule for generic bots | `sitemap/sitemap.xml` -> `job_current_date.xml` (today's ~300 Vietnamese URLs); URL-slug keyword filter; read only the first ~100 KB of each ~1.5 MB page | ToS **not reviewed**. The sitemap only holds the current day, so data builds up over daily runs |
| **CareerLink** | implemented, **throttled** | Disallows only account areas | `sitemaps/sitemap.xml.gz` -> gzipped sitemaps (active job URLs, all industries); slug keyword filter; highest ids first, up to 40 per run, 2 s between requests | ToS **not reviewed**. After a burst of ~120 pages at 1 request/second the site began returning a generic empty page (no job data) even for jobs it had served minutes before. The run now stops after 5 empty pages in a row and is paced at 2 s. Some postings label USD amounts as VND, which normalization discards |
| **ITviec** | blocked | `Allow: /` | Plain request returns 403 with a Cloudflare challenge, for pages and sitemap | Not pursued: bypassing the challenge is out of bounds |
| **TopCV** | blocked | Only personal CV pages blocked | Same Cloudflare 403 | Not pursued |
| **JobsGO** | blocked | Sitemap advertised | `sitemap.xml` returns 403 | Not pursued |
| **Glints** | blocked | Sitemap advertised | `sitemap_index.xml` returns a ~1 MB 403 challenge page | Not pursued |
| **VietnamWorks** | not read | Only profile/apply pages blocked | Sitemap lists 8,233 job URLs, but a job page has no JSON-LD and no `__NEXT_DATA__`: the data is loaded through an internal API that has not been examined | Needs a decision on whether using that internal API is acceptable, and a read of the terms |
| **Timviec365** | not readable | Everything allowed | Job sitemaps exist, but a job page has no JSON-LD (HTML only) | HTML scraping would be fragile; skipped |
| **MyWork** | not readable | `Allow: /` | No sitemap, and the home page exposes no job links to follow | Skipped |
| **Joboko** | unreachable | n/a | `robots.txt` request timed out | Skipped |

## Terms of service: clauses to read (2026-11-28)

The pages below were fetched with the User-Agent `job-radar/0.1` and the clauses that touch automated access, copying or commercial use were picked out. **This is a reading aid, not a legal judgement and not an owner decision**: no source below is cleared yet, and `DEFAULT_SOURCES` in `.github/workflows/daily.yml` is unchanged. Vietnamese quotes are shortened; the English line after each is a plain translation. Clause numbering is as published.

| Source | Terms page | Readable by this client |
|---|---|---|
| We Work Remotely | `https://weworkremotely.com/terms` | **No**: HTTP 403 Cloudflare challenge (the home page too). Not bypassed |
| HN (Algolia API) | `https://hn.algolia.com/api` | **No terms text**: the page is a small JavaScript app and holds only API usage notes, no terms. The HN Firebase API README says "There is currently no rate limit". Nothing found that covers scraping or reuse |
| TopDev | `https://topdev.vn/term-of-services` | Yes (Vietnamese) |
| CareerViet | `https://careerviet.vn/en/jobseekers/use` (English "Terms of use") | Yes |
| Vieclam24h | `https://vieclam24h.vn/dieu-khoan-su-dung.html` | Yes (Vietnamese) |
| CareerLink | `https://www.careerlink.vn/quy-che-hoat-dong` (operating rules) | Yes (Vietnamese) |

**CareerViet** (strictest wording on bots)
- "The Company authorizes you to view and access a single copy of the content available on or from CareerViet.vn ... solely for your personal, noncommercial use."
- "using or attempting to use any engine, software, tool, agent or other device or mechanism (including without limitation browsers, spiders, robots, avatars or intelligent agents) to navigate or search any CareerViet Site other than the search engine and search agents available from the Company ... and other than generally available third party web browsers". This is a list item under the prohibited activities.
- "You shall not copy or adapt the HTML code that the Company creates to generate any Web Site Content or the pages making up any CareerViet Site."
- Note: robots.txt has no rule for generic bots, but this clause is about automated access.

**TopDev** (commercial use and copying)
- "bạn không được quyền thay đổi, sao chép, mô phỏng, truyền, phân phối, công bố, tạo ra các sản phẩm phái sinh, hiển thị hoặc chuyển giao, hoặc khai thác nhằm mục đích thương mại bất kỳ phần nào của nội dung" (you may not modify, copy, distribute, publish, make derivative works of, or exploit for commercial purposes any part of the content).
- Allowed: a copy so your own device can view it, one printed copy of each part, and "một số lượng hợp lý các bản sao ... để dùng nội bộ" (a reasonable number of copies for internal use), reproduced unaltered with the source name and URL.
- "Bất kể các bản sao hoặc việc sử dụng trái phép nào đối với nội dung nào cho mục đích thương mại sẽ bị coi là vi phạm" (unauthorised copies or use for commercial purposes count as a breach). No clause on bots or crawlers found (searched: robot, crawl, spider, scrap, tự động).

**Vieclam24h**
- The terms are mostly about user accounts and posted content. No clause on bots, crawlers, scraping or automated access found (searched: robot, crawl, spider, tự động, thương mại).
- 6.2: the business name and trademarks belong to Vieclam24h and use "phải đảm bảo không xâm phạm quyền sở hữu trí tuệ" (must not infringe the intellectual property).
- 5.3(e): user content must not breach intellectual property rights (this covers what employers post, so job text copied wholesale is the area to think about).

**CareerLink** (operating rules of the e-commerce platform)
- V: "Nghiêm cấm mọi hành vi sử dụng chương trình, công cụ can thiệp, phá hoại hệ thống hoặc làm thay đổi cấu trúc dữ liệu của Sàn" (any use of programs or tools that interfere with, damage, or change the data structure of the platform is forbidden).
- Intellectual property: "nghiêm cấm sao chép, sử dụng trái phép" the interface, icons and content the platform created (unauthorised copying or use is forbidden).
- No clause names scraping or crawlers directly. Job postings are employer content that the platform reviews before display.

**We Work Remotely, HN Algolia**: no text could be read, see the table above. The owner needs to open the pages in a browser.

**Not read at all**: VietnamWorks, Adzuna (not scheduled, so not needed yet).

Facts worth knowing when deciding (not recommendations):
- The project is non-commercial (portfolio, no ads, no resale). TopDev's clause ties the ban to commercial use; CareerViet's "personal, noncommercial use" wording is about the user's own viewing.
- The database keeps the job description HTML (`description_html`) for skill extraction. The dashboard shows title, company, salary and a link back to the original page.

## Impact on design

- The dashboard shows the source name and a link to each job's original `url`. RemoteOK and Arbeitnow require this explicitly.
- Every job stores `source` and the original `url`, so attribution works for every source.
- `Source.require_skills = True` marks general boards (Arbeitnow, HN, TopDev, CareerViet, Vieclam24h, CareerLink): jobs without any known skill are dropped before saving.
