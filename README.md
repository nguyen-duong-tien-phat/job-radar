# IT Job Radar

Daily IT job scraping into a dashboard of hot skills and salaries.

> Status: scraper, database and dashboard are built and tested locally. Not deployed yet; see [docs/deploy.md](docs/deploy.md).

## What it does

- Collects IT job postings from several boards, split into **Vietnam** and **international** regions.
- Extracts skills (a 72-skill dictionary) and salary ranges from every posting.
- Stores postings in Postgres with a first-seen and last-seen date, so reposts do not duplicate.
- Shows a bilingual (English / Vietnamese) dashboard: top skills, salary by skill, new jobs per day, filterable by region.

## Roadmap

- [x] Pick the job boards and check what each one allows scraping ([docs/sources.md](docs/sources.md))
- [x] Scrapers: RemoteOK, We Work Remotely, Arbeitnow, HN "Who is hiring", TopDev
- [x] Parse skills and salary from a posting
- [x] Store postings with a first-seen / last-seen date
- [x] Daily run (GitHub Actions workflow written, not yet run on GitHub)
- [x] Dashboard: top skills, salary by skill, trend over time
- [ ] Deploy (Neon + GitHub secret + Vercel, see [docs/deploy.md](docs/deploy.md))
- [ ] More Vietnamese sources (ITviec and TopCV block automated clients; VietnamWorks and CareerViet still to examine)

## Stack

| Part | Tech |
|---|---|
| Scraper | Python 3.12, httpx, psycopg, PyYAML, uv |
| Database | PostgreSQL (Neon in production) |
| Dashboard | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Schedule and CI | GitHub Actions |

## Layout

```
scraper/   Python package: one file per source, skill and salary extractors, Postgres storage
web/       Next.js dashboard (reads Postgres at request time)
db/        SQL migrations and the read-only role for the dashboard
docs/      Source review and deployment guide
```

## Run locally

```bash
# 1. Scrape into a local Postgres (migrations are applied automatically)
cd scraper
uv sync
DATABASE_URL=postgresql://localhost/jobradar uv run python -m jobradar.run --source remoteok

# 2. Dashboard
cd ../web
cp .env.example .env.local   # set DATABASE_URL
npm install
npm run dev
```

`uv run python -m jobradar.run --dry-run` fetches and prints without touching a database.

## Data and attribution

Postings belong to their original sites. The dashboard links every job back to its source, which RemoteOK and Arbeitnow require. Each source's rules are recorded in [docs/sources.md](docs/sources.md); a source is only scheduled after its terms were read.

## Part of

The "Now" section of my [portfolio](https://finn-ngn.vercel.app).
