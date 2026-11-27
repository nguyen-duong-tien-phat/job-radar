import "server-only";

import type postgres from "postgres";

import { getSql } from "@/lib/db";
import { bucketFor, type Filters } from "@/lib/filters";

/** Salary statistics are hidden below this many postings. */
export const MIN_SALARY_SAMPLES = 5;
const TOP_SKILLS = 15;
const TREND_SKILLS = 5;

// All queries read `jobs_unique`: one row per posting, even if several sites list it.
// "event_at" is the posting date (the first-seen date when a site gives none).
//
// A job is "in range" when its event_at falls between the first and last day, inclusive.
// Skill and role analysis only looks at jobs with at least one known skill: general boards
// (RemoteOK) also list sales or support jobs that would distort the picture.

// Midpoint of the posted range, converted to a yearly amount. Hourly and unknown periods are
// excluded because they cannot be compared. Currencies are never converted.
const ANNUAL = `
  ((coalesce(j.salary_min, j.salary_max) + coalesce(j.salary_max, j.salary_min)) / 2)
  * CASE j.salary_period WHEN 'year' THEN 1 WHEN 'month' THEN 12 END
`;

async function scope(filters: Filters) {
  const sql = await getSql();
  const unit = bucketFor(filters.from, filters.to);
  return {
    sql,
    unit,
    inRange: sql`j.event_at >= ${filters.from}::date AND j.event_at < ${filters.to}::date + 1
                 ${filters.region ? sql`AND j.region = ${filters.region}` : sql``}`,
    tech: sql`EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id = j.id)`,
    hasSalary: sql`j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')`,
  };
}

// ---------- shared shapes ----------

export type Point = { day: string; jobs: number };
export type SkillCount = { slug: string; name: string; category: string; jobs: number };
export type RoleCount = { role: string; jobs: number };
export type SourceCount = { source: string; region: string; jobs: number };
export type SalaryStats = { currency: string; n: number; p25: number; median: number; p75: number };
export type SeriesPoint = { day: string; values: Record<string, number> };

export type SkillJob = {
  id: number;
  title: string;
  company: string;
  source: string;
  url: string;
  role: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  eventAt: Date;
};

type Sql = Awaited<ReturnType<typeof getSql>>;
type Scope = Awaited<ReturnType<typeof scope>>;
type Fragment = postgres.PendingQuery<postgres.Row[]>;

/** Postings per bucket (day, week or month) over the range, zero-filled, optionally narrowed. */
async function trend(s: Scope, f: Filters, narrow: Fragment): Promise<Point[]> {
  const { sql, unit, inRange } = s;
  return sql<Point[]>`
    SELECT to_char(b.bucket, 'YYYY-MM-DD') AS day, coalesce(c.jobs, 0)::int AS jobs
    FROM generate_series(
           date_trunc(${unit}, ${f.from}::date), ${f.to}::date, ('1 ' || ${unit})::interval
         ) AS b(bucket)
    LEFT JOIN (
      SELECT date_trunc(${unit}, j.event_at)::date AS bucket, count(*) AS jobs
      FROM jobs_unique j
      WHERE ${inRange} ${narrow}
      GROUP BY 1
    ) c ON c.bucket = b.bucket::date
    ORDER BY b.bucket`;
}

function statsFor(s: Scope, where: Fragment) {
  const { sql, inRange } = s;
  return sql<SalaryStats[]>`
    SELECT currency, count(*)::int AS n,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY annual)::float8 AS p25,
           percentile_cont(0.5)  WITHIN GROUP (ORDER BY annual)::float8 AS median,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY annual)::float8 AS p75
    FROM (
      SELECT j.salary_currency AS currency, ${sql.unsafe(ANNUAL)} AS annual
      FROM jobs_unique j
      WHERE ${inRange} ${where}
        AND j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')
    ) x
    GROUP BY currency
    ORDER BY n DESC`;
}

// ---------- overview ----------

export type RoleSalaryRow = SalaryStats & { role: string };

/** Salary quartiles per role and currency (tech jobs only, groups below the minimum hidden). */
async function roleSalary(s: Scope): Promise<RoleSalaryRow[]> {
  const { sql, inRange, tech } = s;
  return sql<RoleSalaryRow[]>`
    SELECT role, currency, count(*)::int AS n,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY annual)::float8 AS p25,
           percentile_cont(0.5)  WITHIN GROUP (ORDER BY annual)::float8 AS median,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY annual)::float8 AS p75
    FROM (
      SELECT coalesce(j.role, 'other') AS role, j.salary_currency AS currency,
             ${sql.unsafe(ANNUAL)} AS annual
      FROM jobs_unique j
      WHERE ${inRange} AND ${tech}
        AND j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')
    ) x
    GROUP BY role, currency HAVING count(*) >= ${MIN_SALARY_SAMPLES}
    ORDER BY currency, median DESC`;
}

export type Overview = {
  jobs: number;
  techJobs: number;
  salaryJobs: number;
  regions: { vn: number; intl: number };
  sources: SourceCount[];
  topSkills: SkillCount[];
  roles: RoleCount[];
  roleSalary: RoleSalaryRow[];
  trend: Point[];
  skillTrend: { skills: { slug: string; name: string }[]; days: string[]; values: number[][] };
};

export async function getOverview(f: Filters): Promise<Overview> {
  const s = await scope(f);
  const { sql, unit, inRange, tech, hasSalary } = s;

  const [totals, sources, topSkills, roles, trendPoints, roleSalaryRows] = await Promise.all([
    sql<{ jobs: number; tech: number; salary: number; vn: number; intl: number }[]>`
      SELECT count(*)::int AS jobs,
             count(*) FILTER (WHERE ${tech})::int AS tech,
             count(*) FILTER (WHERE ${hasSalary})::int AS salary,
             count(*) FILTER (WHERE j.region = 'vn')::int AS vn,
             count(*) FILTER (WHERE j.region = 'intl')::int AS intl
      FROM jobs_unique j WHERE ${inRange}`,
    sql<SourceCount[]>`
      SELECT j.source, j.region, count(*)::int AS jobs
      FROM jobs_unique j WHERE ${inRange}
      GROUP BY j.source, j.region ORDER BY jobs DESC`,
    sql<SkillCount[]>`
      SELECT sk.slug, sk.name, sk.category, count(*)::int AS jobs
      FROM jobs_unique j
      JOIN job_skills js ON js.job_id = j.id
      JOIN skills sk ON sk.slug = js.skill_slug
      WHERE ${inRange}
      GROUP BY sk.slug, sk.name, sk.category
      ORDER BY jobs DESC, sk.name LIMIT ${TOP_SKILLS}`,
    sql<RoleCount[]>`
      SELECT coalesce(j.role, 'other') AS role, count(*)::int AS jobs
      FROM jobs_unique j WHERE ${inRange} AND ${tech}
      GROUP BY 1 ORDER BY jobs DESC`,
    trend(s, f, sql``),
    roleSalary(s),
  ]);

  // Top skills over time: one count per skill per bucket.
  const top = topSkills.slice(0, TREND_SKILLS);
  const slugs = top.map((t) => t.slug);
  const series = slugs.length
    ? await sql<{ day: string; slug: string; jobs: number }[]>`
        SELECT to_char(date_trunc(${unit}, j.event_at), 'YYYY-MM-DD') AS day,
               js.skill_slug AS slug, count(*)::int AS jobs
        FROM jobs_unique j JOIN job_skills js ON js.job_id = j.id
        WHERE ${inRange} AND js.skill_slug IN ${sql(slugs)}
        GROUP BY 1, 2`
    : [];
  const days = trendPoints.map((p) => p.day);
  const index = new Map(days.map((d, i) => [d, i]));
  const values = top.map(() => days.map(() => 0));
  for (const row of series) {
    const i = index.get(row.day);
    const k = slugs.indexOf(row.slug);
    if (i !== undefined && k >= 0) values[k][i] = row.jobs;
  }

  const t = totals[0];
  return {
    jobs: t.jobs,
    techJobs: t.tech,
    salaryJobs: t.salary,
    regions: { vn: t.vn, intl: t.intl },
    sources,
    topSkills,
    roles,
    roleSalary: roleSalaryRows,
    trend: trendPoints,
    skillTrend: { skills: top.map(({ slug, name }) => ({ slug, name })), days, values },
  };
}

// ---------- skill detail ----------

export type SkillDetail = {
  skill: { slug: string; name: string; category: string };
  jobs: number;
  salaryJobs: number;
  salary: SalaryStats[];
  trend: Point[];
  roles: RoleCount[];
  latest: SkillJob[];
};

const JOB_COLUMNS = (sql: Sql) => sql`
  j.id, j.title, j.company, j.source, j.url, j.role,
  j.salary_min::float8 AS "salaryMin", j.salary_max::float8 AS "salaryMax",
  j.salary_currency AS "salaryCurrency", j.salary_period AS "salaryPeriod",
  j.event_at AS "eventAt"`;

export async function getSkillDetail(slug: string, f: Filters): Promise<SkillDetail | null> {
  const s = await scope(f);
  const { sql, inRange, hasSalary } = s;

  const skills = await sql<{ slug: string; name: string; category: string }[]>`
    SELECT slug, name, category FROM skills WHERE slug = ${slug}`;
  if (skills.length === 0) return null;
  const withSkill = sql`AND EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id = j.id AND js.skill_slug = ${slug})`;

  const [counts, salary, trendPoints, roles, latest] = await Promise.all([
    sql<{ jobs: number; salary: number }[]>`
      SELECT count(*)::int AS jobs, count(*) FILTER (WHERE ${hasSalary})::int AS salary
      FROM jobs_unique j WHERE ${inRange} ${withSkill}`,
    statsFor(s, withSkill),
    trend(s, f, withSkill),
    sql<RoleCount[]>`
      SELECT coalesce(j.role, 'other') AS role, count(*)::int AS jobs
      FROM jobs_unique j WHERE ${inRange} ${withSkill}
      GROUP BY 1 ORDER BY jobs DESC`,
    sql<SkillJob[]>`
      SELECT ${JOB_COLUMNS(sql)}
      FROM jobs_unique j WHERE ${inRange} ${withSkill}
      ORDER BY j.event_at DESC, j.id DESC LIMIT 20`,
  ]);

  return {
    skill: skills[0],
    jobs: counts[0].jobs,
    salaryJobs: counts[0].salary,
    salary,
    trend: trendPoints,
    roles,
    latest,
  };
}

// ---------- salary overview ----------

export type SkillSalaryRow = SalaryStats & { slug: string; name: string };
export type SalaryOverview = {
  jobs: number;
  salaryJobs: number;
  bySkill: SkillSalaryRow[];
  byRole: RoleSalaryRow[];
};

export async function getSalaryOverview(f: Filters): Promise<SalaryOverview> {
  const s = await scope(f);
  const { sql, inRange, hasSalary } = s;

  const [totals, bySkill, byRole] = await Promise.all([
    sql<{ jobs: number; salary: number }[]>`
      SELECT count(*)::int AS jobs, count(*) FILTER (WHERE ${hasSalary})::int AS salary
      FROM jobs_unique j WHERE ${inRange}`,
    sql<SkillSalaryRow[]>`
      SELECT slug, name, currency, count(*)::int AS n,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY annual)::float8 AS p25,
             percentile_cont(0.5)  WITHIN GROUP (ORDER BY annual)::float8 AS median,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY annual)::float8 AS p75
      FROM (
        SELECT sk.slug, sk.name, j.salary_currency AS currency, ${sql.unsafe(ANNUAL)} AS annual
        FROM jobs_unique j
        JOIN job_skills js ON js.job_id = j.id
        JOIN skills sk ON sk.slug = js.skill_slug
        WHERE ${inRange} AND j.salary_currency IS NOT NULL AND j.salary_period IN ('year', 'month')
      ) x
      GROUP BY slug, name, currency HAVING count(*) >= ${MIN_SALARY_SAMPLES}
      ORDER BY currency, median DESC`,
    roleSalary(s),
  ]);

  return { jobs: totals[0].jobs, salaryJobs: totals[0].salary, bySkill, byRole };
}
