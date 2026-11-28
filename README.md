# Job Radar

Personal tool: upload your CV, get a daily ranked feed of matching IT jobs from companies' own career pages (public ATS boards) and IT job boards, for Vietnam and remote work.

> Status: rewrite in progress (v2). The old market-statistics dashboard lives on the `feat/job-radar-pipeline` branch.

## How it works

- CV (PDF) is read locally into a profile: skills, seniority, location.
- Free structured sources: public ATS APIs (Greenhouse, Lever, Ashby, Workable, SmartRecruiters), Vietnamese IT boards, remote boards. See `docs/sources.md` for the rules each source allows.
- Once a day, Claude Code (headless, on an existing Claude Pro plan) searches the web for official career pages and new companies.
- Jobs are deduplicated and scored locally against the profile, with a reason for each score.

## Stack

Next.js (TypeScript) + SQLite (`node:sqlite`). Runs locally, no paid services.
