import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/Skeleton";
import { Card } from "@/components/widgets";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { type Dictionary, fmt, getDictionary } from "@/lib/i18n";
import { hasLocale, href, type Locale, parseRegion } from "@/lib/locales";
import { getSalaryBySkill, MIN_SALARY_SAMPLES, type SkillSalaryRow } from "@/lib/queries";

type SearchParams = PageProps<"/[lang]/salary">["searchParams"];

async function SalaryContent({
  lang,
  dict,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  searchParams: SearchParams;
}) {
  const region = parseRegion((await searchParams).region);
  const data = await getSalaryBySkill(region);

  const byCurrency = new Map<string, SkillSalaryRow[]>();
  for (const row of data.rows) byCurrency.set(row.currency, [...(byCurrency.get(row.currency) ?? []), row]);

  return (
    <>
      <p className="text-sm text-foreground/70">
        {fmt(dict.salary.intro, { min: MIN_SALARY_SAMPLES })}{" "}
        {fmt(dict.salary.coverage, {
          n: formatNumber(data.salaryJobs, lang),
          total: formatNumber(data.activeJobs, lang),
          pct: formatPercent(data.salaryJobs, data.activeJobs),
        })}
      </p>
      {byCurrency.size === 0 && <p className="text-sm text-foreground/60">{dict.common.noData}</p>}
      {[...byCurrency].map(([currency, rows]) => (
        <Card key={currency} title={currency}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-foreground/60">
                <tr>
                  <th className="py-2 pr-3 font-medium">{dict.salary.skill}</th>
                  <th className="py-2 pr-3 text-right font-medium">{dict.salary.postings}</th>
                  <th className="py-2 pr-3 text-right font-medium">{dict.salary.p25}</th>
                  <th className="py-2 pr-3 text-right font-medium">{dict.salary.median}</th>
                  <th className="py-2 text-right font-medium">{dict.salary.p75}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((row) => (
                  <tr key={row.slug} className="border-t border-foreground/10">
                    <td className="py-2 pr-3">
                      <Link
                        href={href(lang, `/skills/${row.slug}`, region)}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right">{formatNumber(row.n, lang)}</td>
                    <td className="py-2 pr-3 text-right">{formatMoney(row.p25, currency)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">
                      {formatMoney(row.median, currency)}
                    </td>
                    <td className="py-2 text-right">{formatMoney(row.p75, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}

export default async function SalaryPage({ params, searchParams }: PageProps<"/[lang]/salary">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <h1 className="text-xl font-semibold">{dict.salary.title}</h1>
      <Suspense fallback={<ContentSkeleton label={dict.common.loading} />}>
        <SalaryContent lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
