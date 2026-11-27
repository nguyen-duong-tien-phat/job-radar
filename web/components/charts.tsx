// Server-rendered SVG/CSS charts. No chart library: the data sets are small and this keeps the
// bundle free of chart JavaScript. Hover details come from `data-tip` attributes that the thin
// client wrapper <ChartTip> turns into one shared tooltip.

import Link from "next/link";

import { ChartTip } from "@/components/ChartTip";
import { formatBucket, formatMoney, formatNumber, formatPercent, niceMax } from "@/lib/format";
import type { Locale } from "@/lib/locales";
import { tip } from "@/lib/tip";

export const SERIES_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const stagger = (index: number) => ({ "--i": index }) as React.CSSProperties;
const colorOf = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length];

type Unit = "day" | "week" | "month";

// ---------- time series ----------

const W = 600;
const H = 170;
const PAD = { left: 34, right: 8, top: 8, bottom: 22 };

function geometry(count: number, max: number) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (count <= 1 ? innerW / 2 : (i / (count - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  return { x, y, baseline: PAD.top + innerH, innerH, step: count <= 1 ? innerW : innerW / (count - 1) };
}

function Axes({
  days,
  unit,
  max,
  lang,
  g,
}: {
  days: string[];
  unit: Unit;
  max: number;
  lang: Locale;
  g: ReturnType<typeof geometry>;
}) {
  const ticks = [0, max / 2, max];
  const labelIndexes =
    days.length > 2 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : days.map((_, i) => i);
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={g.y(t)} y2={g.y(t)} className="stroke-foreground/10" />
          <text x={PAD.left - 6} y={g.y(t) + 3} textAnchor="end" className="fill-foreground/60 text-[10px]">
            {formatNumber(Math.round(t), lang)}
          </text>
        </g>
      ))}
      {labelIndexes.map((i) => (
        <text
          key={i}
          x={g.x(i)}
          y={H - 6}
          textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
          className="fill-foreground/60 text-[10px]"
        >
          {formatBucket(days[i], unit, lang)}
        </text>
      ))}
    </>
  );
}

const linePath = (xs: number[], ys: number[]) =>
  xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

/** Hover band for one time bucket: a guide line that appears on hover, plus the tooltip data. */
function Band({ x, step, guide, tooltip }: { x: number; step: number; guide: React.ReactNode; tooltip: string }) {
  return (
    <g className="group">
      <g className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <line x1={x} x2={x} y1={PAD.top} y2={H - PAD.bottom} className="stroke-foreground/25" strokeDasharray="3 3" />
        {guide}
      </g>
      <rect
        x={x - step / 2}
        y={PAD.top}
        width={step}
        height={H - PAD.top - PAD.bottom}
        fill="transparent"
        data-tip={tooltip}
      />
    </g>
  );
}

/** Postings over time: a line with a soft area under it. */
export function AreaChart({
  points,
  unit,
  label,
  seriesLabel,
  lang,
}: {
  points: { day: string; jobs: number }[];
  unit: Unit;
  label: string;
  seriesLabel: string;
  lang: Locale;
}) {
  const max = niceMax(Math.max(1, ...points.map((p) => p.jobs)));
  const g = geometry(points.length, max);
  const xs = points.map((_, i) => g.x(i));
  const ys = points.map((p) => g.y(p.jobs));
  const line = linePath(xs, ys);
  const area = `${line} L${xs[xs.length - 1]} ${g.baseline} L${xs[0]} ${g.baseline} Z`;
  return (
    <ChartTip>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        <Axes days={points.map((p) => p.day)} unit={unit} max={max} lang={lang} g={g} />
        <path d={area} fill="var(--c1)" opacity="0.14" className="fade-in" />
        <path
          d={line}
          pathLength={1}
          fill="none"
          stroke="var(--c1)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="draw-line"
        />
        {points.map((p, i) => (
          <Band
            key={p.day}
            x={xs[i]}
            step={g.step}
            guide={<circle cx={xs[i]} cy={ys[i]} r={4} fill="var(--c1)" className="stroke-surface" strokeWidth="2" />}
            tooltip={tip({
              title: formatBucket(p.day, unit, lang),
              rows: [{ label: seriesLabel, value: formatNumber(p.jobs, lang), color: "var(--c1)" }],
            })}
          />
        ))}
      </svg>
    </ChartTip>
  );
}

/** Several series on one axis (top skills over time) with a legend. */
export function MultiLineChart({
  days,
  series,
  unit,
  label,
  lang,
}: {
  days: string[];
  series: { name: string; values: number[] }[];
  unit: Unit;
  label: string;
  lang: Locale;
}) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const g = geometry(days.length, max);
  const xs = days.map((_, i) => g.x(i));
  return (
    <div>
      <ChartTip>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
          <Axes days={days} unit={unit} max={max} lang={lang} g={g} />
          {series.map((s, k) => (
            <path
              key={s.name}
              d={linePath(xs, s.values.map(g.y))}
              pathLength={1}
              fill="none"
              stroke={colorOf(k)}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="draw-line"
              style={stagger(k)}
            />
          ))}
          {days.map((day, i) => (
            <Band
              key={day}
              x={xs[i]}
              step={g.step}
              guide={series.map((s, k) => (
                <circle
                  key={s.name}
                  cx={xs[i]}
                  cy={g.y(s.values[i])}
                  r={3.5}
                  fill={colorOf(k)}
                  className="stroke-surface"
                  strokeWidth="1.5"
                />
              ))}
              tooltip={tip({
                title: formatBucket(day, unit, lang),
                rows: series
                  .map((s, k) => ({ label: s.name, value: s.values[i], color: colorOf(k) }))
                  .sort((a, b) => b.value - a.value)
                  .map((r) => ({ ...r, value: formatNumber(r.value, lang) })),
              })}
            />
          ))}
        </svg>
      </ChartTip>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((s, k) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: colorOf(k) }} aria-hidden />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- share of a whole ----------

export type Slice = { key: string; label: string; value: number; href?: string };

/** Donut with a legend. Slices are drawn as stroke segments on a circle of circumference 100. */
export function Donut({
  slices,
  label,
  center,
  lang,
}: {
  slices: Slice[];
  label: string;
  center: string;
  lang: Locale;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const shares = slices.map((s) => (total ? (s.value / total) * 100 : 0));
  const offsets = shares.map((_, i) => shares.slice(0, i).reduce((sum, v) => sum + v, 0));
  return (
    <ChartTip className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 42 42" role="img" aria-label={label} className="size-40 shrink-0 -rotate-90">
        <circle cx="21" cy="21" r="15.9155" fill="none" className="stroke-foreground/10" strokeWidth="6" />
        {slices.map((s, i) => {
          const share = shares[i];
          const visible = Math.max(share - 0.6, 0);
          return (
            <circle
              key={s.key}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={colorOf(i)}
              strokeWidth="6"
              strokeDasharray={`${visible} ${100 - visible}`}
              strokeDashoffset={-offsets[i]}
              className="donut-slice cursor-default transition-[stroke-width] duration-200 hover:[stroke-width:7.5]"
              style={stagger(i)}
              data-tip={tip({
                title: s.label,
                rows: [
                  { label: `${formatPercent(s.value, total)}%`, value: formatNumber(s.value, lang), color: colorOf(i) },
                ],
              })}
            />
          );
        })}
        <text
          x="21"
          y="21"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 21 21)"
          className="fill-foreground text-[6px] font-semibold"
        >
          {center}
        </text>
      </svg>
      <ul className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(i) }} aria-hidden />
            {s.href ? (
              <Link href={s.href} className="truncate hover:text-accent hover:underline">
                {s.label}
              </Link>
            ) : (
              <span className="truncate">{s.label}</span>
            )}
            <span className="ml-auto tabular-nums text-foreground/70">
              {formatNumber(s.value, lang)} · {formatPercent(s.value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </ChartTip>
  );
}

// ---------- ranked bars ----------

export type BarItem = { key: string; label: string; value: number; href?: string };

export function BarList({
  items,
  total,
  lang,
  empty,
}: {
  items: BarItem[];
  total: number;
  lang: Locale;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-foreground/60">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ChartTip>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => {
          const tooltip = tip({
            title: item.label,
            rows: [
              {
                label: `${formatPercent(item.value, total)}%`,
                value: formatNumber(item.value, lang),
                color: "var(--c1)",
              },
            ],
          });
          const row = (
            <>
              <span className="truncate transition-colors group-hover:text-accent">{item.label}</span>
              <span className="h-2 rounded-full bg-foreground/10" aria-hidden>
                <span
                  className="grow-x block h-2 rounded-full bg-accent transition-[width,filter] duration-500 group-hover:brightness-110"
                  style={{ ...stagger(i), width: `${(item.value / max) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-foreground/70">
                {formatNumber(item.value, lang)} · {formatPercent(item.value, total)}%
              </span>
            </>
          );
          const className =
            "group -mx-2 grid grid-cols-[8rem_1fr_6.5rem] items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-foreground/5";
          return (
            <li key={item.key} className="reveal" style={stagger(i)}>
              {item.href ? (
                <Link href={item.href} className={className} data-tip={tooltip}>
                  {row}
                </Link>
              ) : (
                <div className={className} data-tip={tooltip}>
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </ChartTip>
  );
}

// ---------- salary ranges ----------

export type RangeRow = {
  key: string;
  label: string;
  n: number;
  p25: number;
  median: number;
  p75: number;
  href?: string;
};

export type RangeLabels = { p25: string; median: string; p75: string; n: string };

/** Floating bars from the 25th to the 75th percentile with a tick at the median, one scale per currency. */
export function RangeBars({
  rows,
  currency,
  labels,
}: {
  rows: RangeRow[];
  currency: string;
  labels: RangeLabels;
}) {
  const max = Math.max(...rows.map((r) => r.p75));
  const pos = (v: number) => `${(v / max) * 100}%`;
  return (
    <ChartTip>
      <ol className="flex flex-col gap-1">
        {rows.map((r, i) => {
          const label = r.href ? (
            <Link href={r.href} className="truncate hover:text-accent hover:underline">
              {r.label}
            </Link>
          ) : (
            <span className="truncate">{r.label}</span>
          );
          return (
            <li
              key={r.key}
              className="reveal -mx-2 grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-foreground/5 sm:grid-cols-[9rem_1fr_5rem]"
              style={stagger(i)}
              data-tip={tip({
                title: r.label,
                rows: [
                  { label: labels.p75, value: formatMoney(r.p75, currency) },
                  { label: labels.median, value: formatMoney(r.median, currency), color: "var(--c1)" },
                  { label: labels.p25, value: formatMoney(r.p25, currency) },
                  { label: labels.n, value: formatNumber(r.n, "en") },
                ],
              })}
            >
              {label}
              <span className="relative h-3 rounded-full bg-foreground/10" aria-hidden>
                <span
                  className="grow-x absolute inset-y-0 rounded-full bg-accent/40"
                  style={{ ...stagger(i), left: pos(r.p25), width: `calc(${pos(r.p75)} - ${pos(r.p25)})` }}
                />
                <span className="absolute -inset-y-0.5 w-0.5 rounded bg-accent" style={{ left: pos(r.median) }} />
              </span>
              <span className="text-right font-semibold tabular-nums">{formatMoney(r.median, currency)}</span>
            </li>
          );
        })}
      </ol>
    </ChartTip>
  );
}
