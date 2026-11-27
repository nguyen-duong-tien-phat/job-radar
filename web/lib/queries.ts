import "server-only";

import { getSql } from "@/lib/db";
import type { Region } from "@/lib/locales";

/** A job counts as active if the scraper saw it within this many days. */
export const ACTIVE_DAYS = 14;
/** Salary statistics are hidden below this many postings. */
export const MIN_SALARY_SAMPLES = 5;
const TREND_DAYS = 30;

// Midpoint of the posted range, converted to a yearly amount. Hourly and unknown periods
// are excluded because they cannot be compared. Currencies are never converted.
const ANNUAL = `
  ((coalesce(j.salary_min, j.salary_max) + coalesce(j.salary_max, j.salary_min)) / 2)
  * CASE j.salary_period WHEN 'year' THEN 1 WHEN 'month' THEN 12 END
`;

async function filters(region: Region | null) {
  const sql = await getSql();
  return {
    sql,
    active: sql`j.last_seen_at >= now() - make_interval(days => ${ACTIVE_DAYS})`,
    region: region ? sql`AND j.region = ${region}` : sql``,
  };
}

export type SkillCount = { slug: string; name: string; category: string; jobs: number };
export type SourceCount = { source: string; region: string; jobs: number };
export type DayCount = { day: string; jobs: number };

export type Overview = {
  activeJobs: number;
  techJobs: number;
  salaryJobs: number;
  sources: SourceCount[];
  topSkills: SkillCount[];
  trend: DayCount[];
};

export async function getOverview(region: Region | null): Promise<Overview> {
  const { sql, active, region: regionFilter } = await filters(region);

  const [totals, sources, topSkills, trend] = await Promise.all([
    sql<{ active: number; tech: number; salary: number }[]>`
      SELECT count(*)::int AS active,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id = j.id))::int AS tech,
             count(*) FILTER (WHERE j.salary_currency IS NOT NULL
                                AND j.salary_period IN ('year', 'month'))::int AS salary
      FROM jobs j
      WHERE ${active} ${regionFilter}`,
    sql<SourceCount[]>`
      SELECT j.source, j.region, count(*)::int AS jobs
      FROM jobs j
      WHERE ${active} ${regionFilter}
      GROUP BY j.source, j.region
      ORDER BY jobs DESC`,
    sql<SkillCount[]>`
      SELECT s.slug, s.name, s.category, count(*)::int AS jobs
      FROM job_skills js
      JOIN jobs j ON j.id = js.job_id
      JOIN skills s ON s.slug = js.skill_slug
      WHERE ${active} ${regionFilter}
      GROUP BY s.slug, s.name, s.category
      ORDER BY jobs DESC, s.name
      LIMIT 20`,
    sql<DayCount[]>`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, coalesce(c.jobs, 0)::int AS jobs
      FROM generate_series(current_date - ${TREND_DAYS - 1}::int, current_date, interval '1 day') AS d(day)
      LEFT JOIN (
        SELECT date_trunc('day', j.first_seen_at)::date AS day, count(*) AS jobs
        FROM jobs j
        WHERE j.first_seen_at >= current_date - ${TREND_DAYS - 1}::int ${regionFilter}
        GROUP BY 1
      ) c ON c.day = d.day::date
      ORDER BY d.day`,
  ]);

  const t = totals[0];
  return {
    activeJobs: t.active,
    techJobs: t.tech,
    salaryJobs: t.salary,
    sources,
    topSkills,
    trend,
  };
}

export type SalaryStats = {
  currency: string;
  n: number;
  p25: number;
  median: number;
  p75: number;
};

export type SkillJob = {
  id: number;
  title: string;
  company: string;
  source: string;
  url: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  firstSeenAt: Date;
};

export type SkillDetail = {
  skill: { slug: string; name: string; category: string };
  jobs: number;
  salaryJobs: number;
  salary: SalaryStats[];
  trend: DayCount[];
  latest: SkillJob[];
};

export async function getSkillDetail(slug: string, region: Region | null): Promise<SkillDetail | null> {
  const { sql, active, region: regionFilter } = await filters(region);

  const skills = await sql<{ slug: string; name: string; category: string }[]>`
    SELECT slug, name, category FROM skills WHERE slug = ${slug}`;
  if (skills.length === 0) return null;

  const [counts, salary, trend, latest] = await Promise.all([
    sql<{ jobs: number; salary: number }[]>`
      SELECT count(*)::int AS jobs,
             count(*) FILTER (WHERE j.salary_currency IS NOT NULL
                                AND j.salary_period IN ('year', 'month'))::int AS salary
      FROM job_skills js JOIN jobs j ON j.id = js.job_id
      WHERE js.skill_slug = ${slug} AND ${active} ${regionFilter}`,
    sql<SalaryStats[]>`
      SELECT currency, count(*)::int AS n,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY annual)::float8 AS p25,
             percentile_cont(0.5)  WITHIN GROUP (ORDER BY annual)::float8 AS median,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY annual)::float8 AS p75
      FROM (
        SELECT j.salary_currency AS currency, ${sql.unsafe(ANNUAL)} AS annual
        FROM job_skills js JOIN jobs j ON j.id = js.job_id
        WHERE js.skill_slug = ${slug} AND ${active} ${regionFilter}
          AND j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')
      ) s
      GROUP BY currency
      ORDER BY n DESC`,
    sql<DayCount[]>`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, coalesce(c.jobs, 0)::int AS jobs
      FROM generate_series(current_date - ${TREND_DAYS - 1}::int, current_date, interval '1 day') AS d(day)
      LEFT JOIN (
        SELECT date_trunc('day', j.first_seen_at)::date AS day, count(*) AS jobs
        FROM job_skills js JOIN jobs j ON j.id = js.job_id
        WHERE js.skill_slug = ${slug} AND j.first_seen_at >= current_date - ${TREND_DAYS - 1}::int ${regionFilter}
        GROUP BY 1
      ) c ON c.day = d.day::date
      ORDER BY d.day`,
    sql<SkillJob[]>`
      SELECT j.id, j.title, j.company, j.source, j.url,
             j.salary_min::float8 AS "salaryMin", j.salary_max::float8 AS "salaryMax",
             j.salary_currency AS "salaryCurrency", j.salary_period AS "salaryPeriod",
             j.first_seen_at AS "firstSeenAt"
      FROM job_skills js JOIN jobs j ON j.id = js.job_id
      WHERE js.skill_slug = ${slug} AND ${active} ${regionFilter}
      ORDER BY j.first_seen_at DESC, j.id DESC
      LIMIT 20`,
  ]);

  return {
    skill: skills[0],
    jobs: counts[0].jobs,
    salaryJobs: counts[0].salary,
    salary,
    trend,
    latest,
  };
}

export type SkillSalaryRow = SalaryStats & { slug: string; name: string };

export type SalaryOverview = {
  activeJobs: number;
  salaryJobs: number;
  rows: SkillSalaryRow[];
};

export async function getSalaryBySkill(region: Region | null): Promise<SalaryOverview> {
  const { sql, active, region: regionFilter } = await filters(region);

  const [totals, rows] = await Promise.all([
    sql<{ active: number; salary: number }[]>`
      SELECT count(*)::int AS active,
             count(*) FILTER (WHERE j.salary_currency IS NOT NULL
                                AND j.salary_period IN ('year', 'month'))::int AS salary
      FROM jobs j
      WHERE ${active} ${regionFilter}`,
    sql<SkillSalaryRow[]>`
      SELECT slug, name, currency, count(*)::int AS n,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY annual)::float8 AS p25,
             percentile_cont(0.5)  WITHIN GROUP (ORDER BY annual)::float8 AS median,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY annual)::float8 AS p75
      FROM (
        SELECT sk.slug, sk.name, j.salary_currency AS currency, ${sql.unsafe(ANNUAL)} AS annual
        FROM job_skills js
        JOIN jobs j ON j.id = js.job_id
        JOIN skills sk ON sk.slug = js.skill_slug
        WHERE ${active} ${regionFilter}
          AND j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')
      ) s
      GROUP BY slug, name, currency
      HAVING count(*) >= ${MIN_SALARY_SAMPLES}
      ORDER BY currency, median DESC`,
  ]);

  return { activeJobs: totals[0].active, salaryJobs: totals[0].salary, rows };
}
