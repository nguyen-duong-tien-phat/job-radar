import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AreaChart, BarList, Donut, MultiLineChart, RangeBars, type Slice } from "@/components/charts";
import { CountUp } from "@/components/CountUp";
import { ContentSkeleton } from "@/components/Skeleton";
import { Card, StatCard } from "@/components/widgets";
import { bucketFor, href } from "@/lib/filters";
import { formatDay, formatNumber } from "@/lib/format";
import { type Dictionary, fmt, getDictionary } from "@/lib/i18n";
import { formatLocale, hasLocale, type Locale } from "@/lib/locales";
import { requestFilters } from "@/lib/request-filters";
import { getOverview, MIN_SALARY_SAMPLES } from "@/lib/queries";
import { roleName } from "@/lib/roles";
import { sourceInfo } from "@/lib/sources";

type SearchParams = PageProps<"/[lang]">["searchParams"];
const TOP_ROLES_IN_DONUT = 5;

async function OverviewContent({
  lang,
  dict,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  searchParams: SearchParams;
}) {
  const f = await requestFilters(searchParams);
  const data = await getOverview(f);
  const unit = bucketFor(f.from, f.to);
  const tag = formatLocale(lang);

  const shown = data.roles.slice(0, TOP_ROLES_IN_DONUT);
  const rest = data.roles.slice(TOP_ROLES_IN_DONUT).reduce((sum, r) => sum + r.jobs, 0);
  const roleSlices: Slice[] = [
    ...shown.map((r) => ({
      key: r.role,
      label: roleName(dict.roleNames, r.role),
      value: r.jobs,
    })),
    ...(rest > 0 ? [{ key: "more", label: dict.roles.more, value: rest }] : []),
  ];
  const rangeLabels = { p25: dict.salary.p25, median: dict.salary.median, p75: dict.salary.p75, n: dict.salary.n };
  const salaryCurrencies = [...new Set(data.roleSalary.map((r) => r.currency))];
  const regionSlices: Slice[] = [
    { key: "vn", label: dict.region.vn, value: data.regions.vn },
    { key: "intl", label: dict.region.intl, value: data.regions.intl },
  ].filter((s) => s.value > 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          index={0}
          label={dict.overview.activeJobs}
          value={<CountUp value={data.jobs} locale={tag} />}
          hint={fmt(dict.overview.activeJobsHint, {
            from: formatDay(f.from, lang),
            to: formatDay(f.to, lang),
          })}
        />
        <StatCard
          index={1}
          label={dict.overview.techJobs}
          value={<CountUp value={data.techJobs} locale={tag} />}
        />
        <StatCard
          index={2}
          label={dict.overview.withSalary}
          value={<CountUp value={data.salaryJobs} locale={tag} />}
        />
        <StatCard
          index={3}
          label={dict.overview.sources}
          value={<CountUp value={data.sources.length} locale={tag} />}
          hint={dict.overview.dedupe}
        />
      </div>

      <Card index={4} title={dict.overview.trend} hint={dict.overview.trendHint}>
        <AreaChart
          points={data.trend}
          unit={unit}
          label={dict.overview.trend}
          seriesLabel={dict.overview.activeJobs}
          lang={lang}
        />
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card index={5} title={dict.overview.topSkills} hint={dict.overview.topSkillsHint}>
          <BarList
            items={data.topSkills.map((s) => ({
              key: s.slug,
              label: s.name,
              value: s.jobs,
              href: href(lang, `/skills/${s.slug}`, f),
            }))}
            total={data.techJobs}
            lang={lang}
            empty={dict.common.noData}
          />
        </Card>
        <Card index={6} title={dict.overview.roleShare} hint={dict.overview.roleShareHint}>
          {roleSlices.length ? (
            <Donut
              slices={roleSlices}
              label={dict.overview.roleShare}
              center={formatNumber(data.techJobs, lang)}
              lang={lang}
            />
          ) : (
            <p className="text-sm text-foreground/60">{dict.common.noData}</p>
          )}
        </Card>
      </div>

      <Card index={7} title={dict.overview.skillTrend} hint={dict.overview.skillTrendHint}>
        {data.skillTrend.skills.length ? (
          <MultiLineChart
            days={data.skillTrend.days}
            series={data.skillTrend.skills.map((s, i) => ({ name: s.name, values: data.skillTrend.values[i] }))}
            unit={unit}
            label={dict.overview.skillTrend}
            lang={lang}
          />
        ) : (
          <p className="text-sm text-foreground/60">{dict.common.noData}</p>
        )}
      </Card>

      <Card index={8} title={dict.overview.roleSalary} hint={dict.overview.roleSalaryHint}>
        {salaryCurrencies.length === 0 && (
          <p className="text-sm text-foreground/60">{fmt(dict.common.notEnough, { min: MIN_SALARY_SAMPLES })}</p>
        )}
        <div className="flex flex-col gap-6">
          {salaryCurrencies.map((currency) => (
            <div key={currency}>
              <h3 className="mb-2 text-xs font-semibold text-foreground/60">{currency}</h3>
              <RangeBars
                currency={currency}
                labels={rangeLabels}
                rows={data.roleSalary
                  .filter((r) => r.currency === currency)
                  .map((r) => ({
                    key: r.role,
                    label: roleName(dict.roleNames, r.role),
                    n: r.n,
                    p25: r.p25,
                    median: r.median,
                    p75: r.p75,
                  }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card index={9} title={dict.overview.regionSplit}>
          {regionSlices.length ? (
            <Donut slices={regionSlices} label={dict.overview.regionSplit} center={formatNumber(data.jobs, lang)} lang={lang} />
          ) : (
            <p className="text-sm text-foreground/60">{dict.common.noData}</p>
          )}
        </Card>
        <Card index={10} title={dict.overview.bySource}>
          <ul className="flex flex-col gap-2 text-sm">
            {data.sources.map((s) => (
              <li key={s.source} className="flex justify-between gap-3">
                <a href={sourceInfo(s.source).url} rel="noopener" className="underline underline-offset-2">
                  {sourceInfo(s.source).name}
                </a>
                <span className="tabular-nums text-foreground/70">
                  {formatNumber(s.jobs, lang)} {dict.common.jobs}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default async function OverviewPage({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <Suspense fallback={<ContentSkeleton label={dict.common.loading} />}>
      <OverviewContent lang={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}
