-- 0001: initial schema for Job Radar.
-- Applied by scraper/jobradar/db.py. Never edit an applied migration; add a new file instead.

CREATE TABLE skills (
    slug      text PRIMARY KEY,
    name      text NOT NULL,
    category  text NOT NULL
);

CREATE TABLE jobs (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dedupe_key       text NOT NULL UNIQUE,
    source           text NOT NULL,
    external_id      text,
    region           text NOT NULL CHECK (region IN ('vn', 'intl')),
    title            text NOT NULL,
    company          text NOT NULL,
    location         text,
    is_remote        boolean,
    url              text NOT NULL,
    description_html text,
    salary_min       numeric,
    salary_max       numeric,
    salary_currency  text,
    salary_period    text CHECK (salary_period IN ('year', 'month', 'hour')),
    salary_raw       text,
    posted_at        timestamptz,
    first_seen_at    timestamptz NOT NULL,
    last_seen_at     timestamptz NOT NULL
);

CREATE INDEX jobs_region_last_seen_idx ON jobs (region, last_seen_at);
CREATE INDEX jobs_source_idx ON jobs (source);

CREATE TABLE job_skills (
    job_id      bigint NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    skill_slug  text NOT NULL REFERENCES skills (slug),
    PRIMARY KEY (job_id, skill_slug)
);

CREATE INDEX job_skills_skill_idx ON job_skills (skill_slug);

CREATE TABLE scrape_runs (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source      text NOT NULL,
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status      text NOT NULL CHECK (status IN ('running', 'ok', 'warning', 'error')),
    jobs_seen   integer NOT NULL DEFAULT 0,
    jobs_new    integer NOT NULL DEFAULT 0,
    error       text
);

CREATE INDEX scrape_runs_source_started_idx ON scrape_runs (source, started_at DESC);
