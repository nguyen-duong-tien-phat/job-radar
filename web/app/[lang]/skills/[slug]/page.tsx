import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AreaChart, BarList } from "@/components/charts";
import { CountUp } from "@/components/CountUp";
import { ContentSkeleton } from "@/components/Skeleton";
import { Card, JobTable, SalaryStatsList, StatCard } from "@/components/widgets";
import { bucketFor, href } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/format";
import { fmt, getDictionary } from "@/lib/i18n";
import { formatLocale, hasLocale } from "@/lib/locales";
import { requestFilters } from "@/lib/request-filters";
import { getSkillDetail, MIN_SALARY_SAMPLES } from "@/lib/queries";
import { roleName } from "@/lib/roles";

// The slug is only known at request time, so everything lives behind one Suspense boundary.
async function SkillContent({ params, searchParams }: PageProps<"/[lang]/skills/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const f = await requestFilters(searchParams);

  const detail = await getSkillDetail(slug, f);
  if (!detail) notFound();
  const unit = bucketFor(f.from, f.to);

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href={href(lang, "/", f)} className="text-sm text-foreground/60 hover:underline">
          ← {dict.common.back}
        </Link>
        <h1 className="font-display text-3xl font-medium">{detail.skill.name}</h1>
        <p className="text-sm text-foreground/60">{detail.skill.category}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          index={0}
          label={dict.skill.jobsMentioning}
          value={<CountUp value={detail.jobs} locale={formatLocale(lang)} />}
        />
        <StatCard
          index={1}
          label={dict.overview.withSalary}
          value={fmt(dict.skill.coverage, {
            n: formatNumber(detail.salaryJobs, lang),
            total: formatNumber(detail.jobs, lang),
            pct: formatPercent(detail.salaryJobs, detail.jobs),
          })}
        />
      </div>

      <Card index={2} title={dict.skill.salaryTitle} hint={dict.skill.salaryHint}>
        <SalaryStatsList stats={detail.salary} min={MIN_SALARY_SAMPLES} lang={lang} dict={dict} />
      </Card>

      <Card index={3} title={dict.overview.trend} hint={dict.overview.trendHint}>
        <AreaChart points={detail.trend} unit={unit} label={dict.overview.trend} lang={lang} />
      </Card>

      <Card index={4} title={dict.skill.rolesTitle}>
        <BarList
          items={detail.roles.map((r) => ({
            key: r.role,
            label: roleName(dict.roleNames, r.role),
            value: r.jobs,
          }))}
          total={detail.jobs}
          lang={lang}
          empty={dict.common.noData}
        />
      </Card>

      <Card index={5} title={dict.skill.latest}>
        <JobTable jobs={detail.latest} lang={lang} dict={dict} />
      </Card>
    </>
  );
}

export default function SkillPage(props: PageProps<"/[lang]/skills/[slug]">) {
  return (
    <Suspense fallback={<ContentSkeleton label="…" />}>
      <SkillContent {...props} />
    </Suspense>
  );
}
