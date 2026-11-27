-- 0002: job role (frontend, backend, ...) and cross-source de-duplication.
--
-- role:     one role per posting, classified from its title (scraper/jobradar/extract/roles.py).
-- dup_key:  hash of normalized company + title. The same posting on several sites gets the same
--           key (scraper/jobradar/normalize.py). NULL when company or title is too short to trust.
-- jobs_unique: one row per posting. Among duplicates, prefer the row that has a salary, then the
--           one seen first. The dashboard reads this view only, so a job listed on three sites
--           is counted once. event_at is the posting date (falls back to when we first saw it).

ALTER TABLE jobs
    ADD COLUMN role    text,
    ADD COLUMN dup_key text;

CREATE INDEX jobs_dup_key_idx ON jobs (dup_key);
CREATE INDEX jobs_role_idx ON jobs (role);

CREATE VIEW jobs_unique AS
SELECT DISTINCT ON (coalesce(j.dup_key, j.id::text))
       j.*,
       coalesce(j.posted_at, j.first_seen_at) AS event_at
FROM jobs j
ORDER BY coalesce(j.dup_key, j.id::text),
         (j.salary_min IS NOT NULL OR j.salary_max IS NOT NULL) DESC,
         j.first_seen_at,
         j.id;

-- Sources with at least one stored job, for attribution in the dashboard footer. A separate view
-- (not jobs_unique) so a source is credited even if all its postings are duplicates of others.
CREATE VIEW job_sources AS SELECT DISTINCT source FROM jobs;
