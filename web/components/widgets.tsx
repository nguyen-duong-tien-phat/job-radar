import Link from "next/link";

import { formatDate, formatMoney, formatNumber, formatPercent, formatSalaryRange } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { href, type Locale, type Region } from "@/lib/locales";
import { fmt } from "@/lib/i18n";
import type { DayCount, SalaryStats, SkillCount, SkillJob } from "@/lib/queries";
import { sourceInfo } from "@/lib/sources";

export function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-foreground/10 p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <div className="text-sm text-foreground/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-foreground/50">{hint}</div>}
    </div>
  );
}

export function SkillBars({
  skills,
  total,
  lang,
  region,
  dict,
}: {
  skills: SkillCount[];
  total: number;
  lang: Locale;
  region: Region | null;
  dict: Dictionary;
}) {
  if (skills.length === 0) return <p className="text-sm text-foreground/60">{dict.common.noData}</p>;
  const max = Math.max(...skills.map((s) => s.jobs));
  return (
    <ol className="flex flex-col gap-2">
      {skills.map((skill) => (
        <li key={skill.slug}>
          <Link
            href={href(lang, `/skills/${skill.slug}`, region)}
            className="group grid grid-cols-[8rem_1fr_6.5rem] items-center gap-3 text-sm"
          >
            <span className="truncate group-hover:underline">{skill.name}</span>
            <span className="h-2 rounded-full bg-foreground/10" aria-hidden>
              <span
                className="block h-2 rounded-full bg-foreground/70"
                style={{ width: `${(skill.jobs / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-foreground/70">
              {formatNumber(skill.jobs, lang)} · {formatPercent(skill.jobs, total)}%
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function TrendChart({ points, label, lang }: { points: DayCount[]; label: string; lang: Locale }) {
  const width = 600;
  const height = 110;
  const gap = 2;
  const max = Math.max(1, ...points.map((p) => p.jobs));
  const barWidth = (width - gap * (points.length - 1)) / points.length;
  return (
    <svg viewBox={`0 0 ${width} ${height + 18}`} role="img" aria-label={label} className="w-full">
      {points.map((p, i) => {
        const h = (p.jobs / max) * height;
        return (
          <rect
            key={p.day}
            x={i * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={Math.max(h, p.jobs > 0 ? 1 : 0)}
            rx={1.5}
            className="fill-foreground/70"
          >
            <title>{`${p.day}: ${formatNumber(p.jobs, lang)}`}</title>
          </rect>
        );
      })}
      <line x1={0} x2={width} y1={height + 0.5} y2={height + 0.5} className="stroke-foreground/20" />
      <text x={0} y={height + 14} className="fill-foreground/50 text-[10px]">
        {points[0]?.day}
      </text>
      <text x={width} y={height + 14} textAnchor="end" className="fill-foreground/50 text-[10px]">
        {points[points.length - 1]?.day}
      </text>
    </svg>
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
                  {formatMoney(value as number, s.currency, lang)}
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
            <th className="py-2 pr-3 font-medium">{dict.common.salary}</th>
            <th className="py-2 pr-3 font-medium">{dict.common.source}</th>
            <th className="py-2 font-medium">{dict.common.firstSeen}</th>
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
              lang,
            );
            return (
              <tr key={job.id} className="border-t border-foreground/10 align-top">
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
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{salary ?? "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <a href={info.url} rel="noopener" className="underline underline-offset-2">
                    {info.name}
                  </a>
                </td>
                <td className="py-2 whitespace-nowrap">{formatDate(job.firstSeenAt, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
