-- Read-only role for the web dashboard. Not a migration: it needs a secret password.
--
-- Run once as the database owner, after the scraper has applied the migrations:
--   psql "$OWNER_DATABASE_URL" -v web_password='<a long random password>' -f db/readonly_role.sql
--
-- The dashboard reads the de-duplicated view `jobs_unique`, the `job_sources` view, job_skills and skills. It cannot
-- read the raw `jobs` table or scrape_runs and cannot write anything, so a leaked DATABASE_URL
-- on Vercel cannot change data.

CREATE ROLE jobradar_web LOGIN PASSWORD :'web_password';

GRANT USAGE ON SCHEMA public TO jobradar_web;
GRANT SELECT ON jobs_unique, job_sources, job_skills, skills TO jobradar_web;
