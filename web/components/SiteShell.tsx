import Link from "next/link";
import { Suspense } from "react";

import { Controls, ControlsFallback, type ControlLabels } from "@/components/Controls";
import { getSql } from "@/lib/db";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import { sourceInfo } from "@/lib/sources";

async function Attribution({ dict }: { dict: Dictionary }) {
  const sql = await getSql();
  const rows = await sql<{ source: string }[]>`SELECT DISTINCT source FROM jobs ORDER BY source`;
  if (rows.length === 0) return null;
  return (
    <p>
      {dict.footer.sources}:{" "}
      {rows.map(({ source }, i) => {
        const info = sourceInfo(source);
        return (
          <span key={source}>
            {i > 0 && ", "}
            <a href={info.url} rel="noopener" className="underline underline-offset-2">
              {info.name}
            </a>
          </span>
        );
      })}
    </p>
  );
}

/**
 * Header, controls and footer. Rendered once by the [lang] layout, so they persist across page
 * navigations instead of being rebuilt (and re-animated) on every route change.
 */
export function SiteShell({
  lang,
  dict,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const labels: ControlLabels = {
    overview: dict.nav.overview,
    salary: dict.nav.salary,
    regionLabel: dict.region.label,
    regions: { all: dict.region.all, vn: dict.region.vn, intl: dict.region.intl },
    languageLabel: dict.language.label,
    languageNames: { en: dict.language.en, vi: dict.language.vi },
    themeToggle: dict.theme.toggle,
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="reveal mx-auto w-full max-w-5xl px-4 pt-8 pb-4">
        <Link href={`/${lang}`} className="font-display text-3xl font-medium tracking-tight">
          {dict.app.title}
        </Link>
        <p className="text-sm text-foreground/60">{dict.app.tagline}</p>
      </header>

      {/* Sticky bar: stays at the top of the screen while the page scrolls. */}
      <div className="sticky top-0 z-20 border-y border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl px-4 py-2.5">
          <Suspense fallback={<ControlsFallback lang={lang} labels={labels} />}>
            <Controls lang={lang} labels={labels} />
          </Suspense>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-1 border-t border-foreground/10 px-4 py-6 text-xs text-foreground/60">
        <Suspense fallback={null}>
          <Attribution dict={dict} />
        </Suspense>
        <p>{dict.footer.note}</p>
      </footer>
    </div>
  );
}
