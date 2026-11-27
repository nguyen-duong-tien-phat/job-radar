import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RangeBars, type RangeLabels, type RangeRow } from "@/components/charts";
import { ContentSkeleton } from "@/components/Skeleton";
import { Card } from "@/components/widgets";
import { href } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/format";
import { type Dictionary, fmt, getDictionary } from "@/lib/i18n";
import { requestFilters } from "@/lib/request-filters";
import { hasLocale, type Locale } from "@/lib/locales";
import { getSalaryOverview, MIN_SALARY_SAMPLES } from "@/lib/queries";
import { roleName } from "@/lib/roles";

type SearchParams = PageProps<"/[lang]/salary">["searchParams"];

type Group = { currency: string; rows: RangeRow[] };

/** Group rows by currency, each group sorted by median salary (highest first). */
function byCurrency(rows: (RangeRow & { currency: string })[]): Group[] {
  const groups = new Map<string, RangeRow[]>();
  for (const { currency, ...row } of rows) groups.set(currency, [...(groups.get(currency) ?? []), row]);
  return [...groups].map(([currency, list]) => ({ currency, rows: list.sort((a, b) => b.median - a.median) }));
}

function Groups({ groups, empty, labels }: { groups: Group[]; empty: string; labels: RangeLabels }) {
  if (groups.length === 0) return <p className="text-sm text-foreground/60">{empty}</p>;
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.currency}>
          <h3 className="mb-2 text-xs font-semibold text-foreground/60">{g.currency}</h3>
          <RangeBars rows={g.rows} currency={g.currency} labels={labels} />
        </div>
      ))}
    </div>
  );
}

async function SalaryContent({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: SearchParams }) {
  const f = await requestFilters(searchParams);
  const data = await getSalaryOverview(f);
  const rangeLabels: RangeLabels = { p25: dict.salary.p25, median: dict.salary.median, p75: dict.salary.p75, n: dict.salary.n };
  const empty = fmt(dict.common.notEnough, { min: MIN_SALARY_SAMPLES });

  const roleGroups = byCurrency(
    data.byRole.map((r) => ({
      currency: r.currency,
      key: r.role,
      label: roleName(dict.roleNames, r.role),
      n: r.n,
      p25: r.p25,
      median: r.median,
      p75: r.p75,
    })),
  );
  const skillGroups = byCurrency(
    data.bySkill.map((s) => ({
      currency: s.currency,
      key: s.slug,
      label: s.name,
      n: s.n,
      p25: s.p25,
      median: s.median,
      p75: s.p75,
      href: href(lang, `/skills/${s.slug}`, f),
    })),
  );

  return (
    <>
      <p className="max-w-3xl text-sm text-foreground/70">
        {fmt(dict.salary.intro, { min: MIN_SALARY_SAMPLES })}{" "}
        {fmt(dict.salary.coverage, {
          n: formatNumber(data.salaryJobs, lang),
          total: formatNumber(data.jobs, lang),
          pct: formatPercent(data.salaryJobs, data.jobs),
        })}
      </p>
      <Card index={0} title={dict.salary.byRole} hint={dict.salary.rangeHint}>
        <Groups groups={roleGroups} empty={empty} labels={rangeLabels} />
      </Card>
      <Card index={1} title={dict.salary.bySkill} hint={dict.salary.rangeHint}>
        <Groups groups={skillGroups} empty={empty} labels={rangeLabels} />
      </Card>
    </>
  );
}

export default async function SalaryPage({ params, searchParams }: PageProps<"/[lang]/salary">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <h1 className="font-display text-2xl font-medium">{dict.salary.title}</h1>
      <Suspense fallback={<ContentSkeleton label={dict.common.loading} />}>
        <SalaryContent lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
