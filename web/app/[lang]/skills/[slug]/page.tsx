import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/PageShell";
import { Card, JobTable, SalaryStatsList, StatCard, TrendChart } from "@/components/widgets";
import { formatNumber, formatPercent } from "@/lib/format";
import { fmt, getDictionary } from "@/lib/i18n";
import { hasLocale, href, parseRegion } from "@/lib/locales";
import { getSkillDetail, MIN_SALARY_SAMPLES } from "@/lib/queries";

// The slug is only known at request time, so everything lives behind one Suspense boundary.
async function SkillContent({ params, searchParams }: PageProps<"/[lang]/skills/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const region = parseRegion((await searchParams).region);

  const detail = await getSkillDetail(slug, region);
  if (!detail) notFound();

  return (
    <PageShell lang={lang} dict={dict} path={`/skills/${slug}`} searchParams={searchParams}>
      <div className="flex flex-col gap-1">
        <Link href={href(lang, "/", region)} className="text-sm text-foreground/60 hover:underline">
          ← {dict.common.back}
        </Link>
        <h1 className="text-2xl font-semibold">{detail.skill.name}</h1>
        <p className="text-sm text-foreground/60">{detail.skill.category}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={dict.skill.jobsMentioning} value={formatNumber(detail.jobs, lang)} />
        <StatCard
          label={dict.overview.withSalary}
          value={fmt(dict.skill.coverage, {
            n: formatNumber(detail.salaryJobs, lang),
            total: formatNumber(detail.jobs, lang),
            pct: formatPercent(detail.salaryJobs, detail.jobs),
          })}
        />
      </div>

      <Card title={dict.skill.salaryTitle} hint={dict.skill.salaryHint}>
        <SalaryStatsList stats={detail.salary} min={MIN_SALARY_SAMPLES} lang={lang} dict={dict} />
      </Card>

      <Card title={dict.overview.trend} hint={dict.overview.trendHint}>
        <TrendChart points={detail.trend} label={dict.overview.trend} lang={lang} />
      </Card>

      <Card title={dict.skill.latest}>
        <JobTable jobs={detail.latest} lang={lang} dict={dict} />
      </Card>
    </PageShell>
  );
}

export default function SkillPage(props: PageProps<"/[lang]/skills/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-4 py-8 text-sm text-foreground/60">…</div>}>
      <SkillContent {...props} />
    </Suspense>
  );
}
