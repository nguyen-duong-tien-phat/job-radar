import { formatDate, formatNumber, formatSalaryRange } from "@/lib/format";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import type { SalaryStats, SkillJob } from "@/lib/queries";
import { roleName } from "@/lib/roles";
import { sourceInfo } from "@/lib/sources";
import { formatMoney } from "@/lib/format";

const stagger = (index: number) => ({ "--i": index }) as React.CSSProperties;

export function Card({
  title,
  hint,
  index = 0,
  children,
}: {
  title: string;
  hint?: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card reveal rounded-xl border border-foreground/10 bg-surface p-4"
      style={stagger(index)}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  index?: number;
}) {
  return (
    <div
      className="card reveal rounded-xl border border-foreground/10 bg-surface p-4"
      style={stagger(index)}
    >
      <div className="text-sm text-foreground/60">{label}</div>
      <div className="mt-1 font-display text-3xl font-medium tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-foreground/60">{hint}</div>}
    </div>
  );
}

export function SalaryStatsList({
  stats,
  min,
  lang,
  dict,
}: {
  stats: SalaryStats[];
  min: number;
  lang: Locale;
  dict: Dictionary;
}) {
  if (stats.length === 0) return <p className="text-sm text-foreground/60">{dict.common.noData}</p>;
  return (
    <div className="flex flex-col gap-3">
      {stats.map((s) =>
        s.n < min ? (
          <p key={s.currency} className="text-sm text-foreground/60">
            {s.currency}: {fmt(dict.common.notEnough, { min })}
          </p>
        ) : (
          <div key={s.currency} className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-foreground/60">{s.currency}</div>
              <div className="tabular-nums text-foreground/60">n = {formatNumber(s.n, lang)}</div>
            </div>
            {[
              [dict.salary.p25, s.p25],
              [dict.salary.median, s.median],
              [dict.salary.p75, s.p75],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-xs text-foreground/60">{label as string}</div>
                <div className="font-semibold tabular-nums">
                  {formatMoney(value as number, s.currency)}
                </div>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

export function JobTable({ jobs, lang, dict }: { jobs: SkillJob[]; lang: Locale; dict: Dictionary }) {
  if (jobs.length === 0) return <p className="text-sm text-foreground/60">{dict.common.noData}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-foreground/60">
          <tr>
            <th className="py-2 pr-3 font-medium">{dict.common.title}</th>
            <th className="py-2 pr-3 font-medium">{dict.common.company}</th>
            <th className="py-2 pr-3 font-medium">{dict.common.role}</th>
            <th className="py-2 pr-3 font-medium">{dict.common.salary}</th>
            <th className="py-2 pr-3 font-medium">{dict.common.source}</th>
            <th className="py-2 font-medium">{dict.common.posted}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const info = sourceInfo(job.source);
            const salary = formatSalaryRange(
              job.salaryMin,
              job.salaryMax,
              job.salaryCurrency,
              job.salaryPeriod,
            );
            return (
              <tr
                key={job.id}
                className="border-t border-foreground/10 align-top transition-colors hover:bg-foreground/5"
              >
                <td className="py-2 pr-3">
                  <a
                    href={job.url}
                    rel="noopener"
                    target="_blank"
                    className="underline-offset-2 hover:underline"
                    title={dict.common.openOriginal}
                  >
                    {job.title}
                  </a>
                </td>
                <td className="py-2 pr-3">{job.company}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{roleName(dict.roleNames, job.role)}</td>
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{salary ?? "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <a href={info.url} rel="noopener" className="underline underline-offset-2">
                    {info.name}
                  </a>
                </td>
                <td className="py-2 whitespace-nowrap">{formatDate(job.eventAt, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
