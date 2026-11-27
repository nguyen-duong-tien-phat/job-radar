"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
import { href, parseRegion, type Locale, type Region } from "@/lib/locales";

export type ControlLabels = {
  overview: string;
  salary: string;
  regionLabel: string;
  regions: { all: string; vn: string; intl: string };
  languageLabel: string;
  languageNames: Record<Locale, string>;
  themeToggle: string;
};

const REGIONS: (Region | null)[] = [null, "vn", "intl"];

// One scrollable row on phones (keeps the sticky bar short), wrapping row from md up.
const ROW =
  "flex items-center gap-3 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:justify-between md:overflow-visible";

function pill(active: boolean) {
  return [
    "rounded-full px-3 py-1 text-sm transition-colors duration-200",
    active
      ? "bg-foreground text-background"
      : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
  ].join(" ");
}

/**
 * Navigation, region filter, language and theme switches. It lives in the layout, so it stays
 * mounted while pages change: only the active states update, nothing is re-created.
 * Current path and region come from the URL on the client. Render inside <Suspense>.
 */
export function Controls({ lang, labels }: { lang: Locale; labels: ControlLabels }) {
  const pathname = usePathname();
  const region = parseRegion(useSearchParams().get("region") ?? undefined);
  // "/en/skills/python" -> "/skills/python"; "/en" -> "/"
  const path = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

  const other: Locale = lang === "en" ? "vi" : "en";
  const nav = [
    { path: "/", label: labels.overview, active: path === "/" || path.startsWith("/skills") },
    { path: "/salary", label: labels.salary, active: path === "/salary" },
  ];

  return (
    <div className={ROW}>
      <nav aria-label="Main" className="flex shrink-0 gap-1">
        {nav.map((item) => (
          <Link
            key={item.path}
            href={href(lang, item.path, region)}
            className={pill(item.active)}
            aria-current={item.active ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-4">
        <div role="group" aria-label={labels.regionLabel} className="flex shrink-0 gap-1">
          {REGIONS.map((r) => (
            <Link
              key={r ?? "all"}
              href={href(lang, path, r)}
              className={pill(r === region)}
              aria-current={r === region ? "true" : undefined}
            >
              {r === null ? labels.regions.all : labels.regions[r]}
            </Link>
          ))}
        </div>
        <LanguageSwitch lang={lang} href={href(other, path, region)} labels={labels} />
        <ThemeToggle label={labels.themeToggle} />
      </div>
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
  return (
    <div className={ROW}>
      <nav aria-label="Main" className="flex shrink-0 gap-1">
        <Link href={href(lang, "/", null)} className={pill(false)}>
          {labels.overview}
        </Link>
        <Link href={href(lang, "/salary", null)} className={pill(false)}>
          {labels.salary}
        </Link>
      </nav>
      <ThemeToggle label={labels.themeToggle} />
    </div>
  );
}
