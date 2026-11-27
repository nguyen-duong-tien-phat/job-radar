import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/PageShell";
import { Card, SkillBars, StatCard, TrendChart } from "@/components/widgets";
import { formatNumber } from "@/lib/format";
import { type Dictionary, fmt, getDictionary } from "@/lib/i18n";
import { hasLocale, type Locale, parseRegion } from "@/lib/locales";
import { ACTIVE_DAYS, getOverview } from "@/lib/queries";
import { sourceInfo } from "@/lib/sources";

type SearchParams = PageProps<"/[lang]">["searchParams"];

async function OverviewContent({
  lang,
  dict,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  searchParams: SearchParams;
}) {
  const region = parseRegion((await searchParams).region);
  const data = await getOverview(region);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={dict.overview.activeJobs}
          value={formatNumber(data.activeJobs, lang)}
          hint={fmt(dict.overview.activeJobsHint, { days: ACTIVE_DAYS })}
        />
        <StatCard label={dict.overview.techJobs} value={formatNumber(data.techJobs, lang)} />
        <StatCard label={dict.overview.withSalary} value={formatNumber(data.salaryJobs, lang)} />
        <StatCard label={dict.overview.sources} value={formatNumber(data.sources.length, lang)} />
      </div>

      <Card title={dict.overview.topSkills} hint={dict.overview.topSkillsHint}>
        <SkillBars skills={data.topSkills} total={data.techJobs} lang={lang} region={region} dict={dict} />
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card title={dict.overview.trend} hint={dict.overview.trendHint}>
          <TrendChart points={data.trend} label={dict.overview.trend} lang={lang} />
        </Card>
        <Card title={dict.overview.bySource}>
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
    <PageShell lang={lang} dict={dict} path="/" searchParams={searchParams}>
      <Suspense fallback={<p className="text-sm text-foreground/60">{dict.common.loading}</p>}>
        <OverviewContent lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
