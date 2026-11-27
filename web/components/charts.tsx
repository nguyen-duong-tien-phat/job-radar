// Server-rendered SVG/CSS charts. No chart library: the data sets are small and this keeps the
// bundle free of client JavaScript. Hover details use <title> (native tooltips).

import Link from "next/link";

import { formatBucket, formatMoney, formatNumber, formatPercent, niceMax } from "@/lib/format";
import type { Locale } from "@/lib/locales";

export const SERIES_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const stagger = (index: number) => ({ "--i": index }) as React.CSSProperties;

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
  return { x, y, baseline: PAD.top + innerH };
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
  const labelIndexes = days.length > 2 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : days.map((_, i) => i);
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

const linePath = (xs: number[], ys: number[]) => xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

/** Postings over time: a line with a soft area under it. */
export function AreaChart({
  points,
  unit,
  label,
  lang,
}: {
  points: { day: string; jobs: number }[];
  unit: Unit;
  label: string;
  lang: Locale;
}) {
  const max = niceMax(Math.max(1, ...points.map((p) => p.jobs)));
  const g = geometry(points.length, max);
  const xs = points.map((_, i) => g.x(i));
  const ys = points.map((p) => g.y(p.jobs));
  const line = linePath(xs, ys);
  const area = `${line} L${xs[xs.length - 1]} ${g.baseline} L${xs[0]} ${g.baseline} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
      <Axes days={points.map((p) => p.day)} unit={unit} max={max} lang={lang} g={g} />
      <path d={area} fill="var(--c1)" opacity="0.14" className="fade-in" />
      <path d={line} pathLength={1} fill="none" stroke="var(--c1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="draw-line" />
      {points.map((p, i) => (
        <circle key={p.day} cx={xs[i]} cy={ys[i]} r={points.length > 60 ? 0 : 2.5} fill="var(--c1)" className="fade-in">
          <title>{`${formatBucket(p.day, unit, lang)}: ${formatNumber(p.jobs, lang)}`}</title>
        </circle>
      ))}
      {/* Wide invisible hit areas so tooltips work even when dots are hidden. */}
      {points.map((p, i) => (
        <rect key={`h${p.day}`} x={xs[i] - 4} y={PAD.top} width={8} height={H - PAD.top - PAD.bottom} fill="transparent">
          <title>{`${formatBucket(p.day, unit, lang)}: ${formatNumber(p.jobs, lang)}`}</title>
        </rect>
      ))}
    </svg>
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
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        <Axes days={days} unit={unit} max={max} lang={lang} g={g} />
        {series.map((s, k) => (
          <path
            key={s.name}
            d={linePath(xs, s.values.map(g.y))}
            pathLength={1}
            fill="none"
            stroke={SERIES_COLORS[k % SERIES_COLORS.length]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="draw-line"
            style={stagger(k)}
          >
            <title>{s.name}</title>
          </path>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((s, k) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[k % SERIES_COLORS.length] }} aria-hidden />
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
export function Donut({ slices, label, center, lang }: { slices: Slice[]; label: string; center: string; lang: Locale }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const shares = slices.map((s) => (total ? (s.value / total) * 100 : 0));
  const offsets = shares.map((_, i) => shares.slice(0, i).reduce((sum, v) => sum + v, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 42 42" role="img" aria-label={label} className="size-40 shrink-0 -rotate-90">
        <circle cx="21" cy="21" r="15.9155" fill="none" className="stroke-foreground/10" strokeWidth="6" />
        {slices.map((s, i) => {
          const share = shares[i];
          return (
            <circle
              key={s.key}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth="6"
              strokeDasharray={`${Math.max(share - 0.6, 0)} ${100 - Math.max(share - 0.6, 0)}`}
              strokeDashoffset={-offsets[i]}
              className="donut-slice"
              style={stagger(i)}
            >
              <title>{`${s.label}: ${formatNumber(s.value, lang)} (${formatPercent(s.value, total)}%)`}</title>
            </circle>
          );
        })}
        <text x="21" y="21" textAnchor="middle" dominantBaseline="central" transform="rotate(90 21 21)" className="fill-foreground text-[6px] font-semibold">
          {center}
        </text>
      </svg>
      <ul className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} aria-hidden />
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
    </div>
  );
}

// ---------- ranked bars ----------

export type BarItem = { key: string; label: string; value: number; href?: string };

export function BarList({ items, total, lang, empty }: { items: BarItem[]; total: number; lang: Locale; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-foreground/60">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, i) => {
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
        const className = "group -mx-2 grid grid-cols-[8rem_1fr_6.5rem] items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-foreground/5";
        return (
          <li key={item.key} className="reveal" style={stagger(i)}>
            {item.href ? (
              <Link href={item.href} className={className}>
                {row}
              </Link>
            ) : (
              <div className={className}>{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- salary ranges ----------

export type RangeRow = { key: string; label: string; n: number; p25: number; median: number; p75: number; href?: string };

/** Floating bars from the 25th to the 75th percentile with a tick at the median, one scale per currency. */
export function RangeBars({ rows, currency }: { rows: RangeRow[]; currency: string }) {
  const max = Math.max(...rows.map((r) => r.p75));
  const pos = (v: number) => `${(v / max) * 100}%`;
  return (
    <ol className="flex flex-col gap-2.5">
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
            className="reveal grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_5rem]"
            style={stagger(i)}
            title={`${formatMoney(r.p25, currency)} – ${formatMoney(r.p75, currency)} (n = ${r.n})`}
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
  );
}
