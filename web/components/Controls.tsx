"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
import { type Filters, href, parseFilters, RANGE_KEYS, type RangeKey } from "@/lib/filters";
import type { Locale, Region } from "@/lib/locales";

export type ControlLabels = {
  overview: string;
  salary: string;
  regionLabel: string;
  regions: { all: string; vn: string; intl: string };
  rangeLabel: string;
  ranges: Record<RangeKey, string>;
  from: string;
  to: string;
  languageLabel: string;
  languageNames: Record<Locale, string>;
  themeToggle: string;
};

const REGIONS: (Region | null)[] = [null, "vn", "intl"];

// One scrollable row on phones (keeps the sticky bar short), a wrapping row from md up.
const ROW =
  "flex items-center gap-3 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible";

function pill(active: boolean) {
  return [
    "shrink-0 rounded-full px-3 py-1 text-sm transition-colors duration-200",
    active
      ? "bg-foreground text-background"
      : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
  ].join(" ");
}

/**
 * Navigation, filters, language and theme switches. It lives in the layout, so it stays mounted
 * while pages change: only the active states update. The current path and filters come from the
 * URL on the client. Render inside <Suspense>.
 */
export function Controls({ lang, labels }: { lang: Locale; labels: ControlLabels }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters((key) => searchParams.get(key));
  // "/en/skills/python" -> "/skills/python"; "/en" -> "/"
  const path = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const other: Locale = lang === "en" ? "vi" : "en";

  const nav = [
    { path: "/", label: labels.overview, active: path === "/" || path.startsWith("/skills") },
    { path: "/salary", label: labels.salary, active: path === "/salary" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className={`${ROW} md:justify-between`}>
        <nav aria-label="Main" className="flex shrink-0 gap-1">
          {nav.map((item) => (
            <Link
              key={item.path}
              href={href(lang, item.path, filters)}
              className={pill(item.active)}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <LanguageSwitch lang={lang} href={href(other, path, filters)} labels={labels} />
          <ThemeToggle label={labels.themeToggle} />
        </div>
      </div>

      <div className={ROW}>
        <div role="group" aria-label={labels.regionLabel} className="flex shrink-0 gap-1">
          {REGIONS.map((r) => (
            <Link
              key={r ?? "all"}
              href={href(lang, path, filters, { region: r })}
              className={pill(r === filters.region)}
              aria-current={r === filters.region ? "true" : undefined}
            >
              {r === null ? labels.regions.all : labels.regions[r]}
            </Link>
          ))}
        </div>
        <span className="h-5 w-px shrink-0 bg-foreground/15" aria-hidden />
        <div role="group" aria-label={labels.rangeLabel} className="flex shrink-0 gap-1">
          {RANGE_KEYS.map((key) => (
            <Link
              key={key}
              // "Custom" starts from the window that is currently shown, so nothing jumps.
              href={href(lang, path, filters, { range: key })}
              className={pill(key === filters.range)}
              aria-current={key === filters.range ? "true" : undefined}
            >
              {labels.ranges[key]}
            </Link>
          ))}
        </div>
        {filters.range === "custom" && (
          <CustomRange lang={lang} path={path} filters={filters} labels={labels} />
        )}
      </div>
    </div>
  );
}

/** Two date inputs. Changing either one updates the URL once both dates are valid. */
function CustomRange({
  lang,
  path,
  filters,
  labels,
}: {
  lang: Locale;
  path: string;
  filters: Filters;
  labels: ControlLabels;
}) {
  const router = useRouter();

  function update(change: { from?: string; to?: string }) {
    const from = change.from ?? filters.from;
    const to = change.to ?? filters.to;
    if (!from || !to) return;
    router.push(href(lang, path, filters, { range: "custom", from, to }), { scroll: false });
  }

  const input =
    "h-8 rounded-md border border-foreground/15 bg-surface px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <div className="flex shrink-0 items-center gap-2 text-sm text-foreground/70">
      <label className="flex items-center gap-1.5">
        {labels.from}
        <input
          // Re-mount when the URL changes so the field always shows the applied value.
          key={`from-${filters.from}`}
          type="date"
          className={input}
          defaultValue={filters.from}
          max={filters.to}
          onChange={(e) => update({ from: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-1.5">
        {labels.to}
        <input
          key={`to-${filters.to}`}
          type="date"
          className={input}
          defaultValue={filters.to}
          min={filters.from}
          onChange={(e) => update({ to: e.target.value })}
        />
      </label>
    </div>
  );
}

/** One switch for the two languages: pressing it goes to the other one. */
function LanguageSwitch({
  lang,
  href: target,
  labels,
}: {
  lang: Locale;
  href: string;
  labels: ControlLabels;
}) {
  const other: Locale = lang === "en" ? "vi" : "en";
  const text = `${labels.languageLabel}: ${labels.languageNames[other]}`;
  return (
    <Link
      href={target}
      hrefLang={other}
      lang={other}
      aria-label={text}
      title={text}
      className="relative grid h-9 shrink-0 grid-cols-2 items-center rounded-full border border-foreground/15 bg-surface p-0.5 text-xs font-semibold transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-foreground transition-transform duration-300 ease-out ${lang === "vi" ? "translate-x-full" : ""}`}
      />
      {(["en", "vi"] as const).map((l) => (
        <span
          key={l}
          className={`relative z-10 w-9 text-center transition-colors duration-300 ${l === lang ? "text-background" : "text-foreground/70"}`}
        >
          {l.toUpperCase()}
        </span>
      ))}
    </Link>
  );
}

/** Static placeholder for the very first paint, before the URL-dependent state is known. */
export function ControlsFallback({ lang, labels }: { lang: Locale; labels: ControlLabels }) {
  const plain: Filters = { region: null, range: "30d", from: "", to: "" };
  return (
    <div className={`${ROW} md:justify-between`}>
      <nav aria-label="Main" className="flex shrink-0 gap-1">
        {[
          ["/", labels.overview],
          ["/salary", labels.salary],
        ].map(([path, text]) => (
          <Link key={path} href={href(lang, path, plain)} className={pill(false)}>
            {text}
          </Link>
        ))}
      </nav>
      <ThemeToggle label={labels.themeToggle} />
    </div>
  );
}
