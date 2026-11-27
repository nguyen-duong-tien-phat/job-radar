import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import { href, LOCALES, parseRegion, type Locale, type Region } from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const REGIONS: (Region | null)[] = [null, "vn", "intl"];

function pill(active: boolean) {
  return [
    "rounded-full px-3 py-1 text-sm transition-colors",
    active
      ? "bg-foreground text-background"
      : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
  ].join(" ");
}

/** Navigation, region filter and language switch. Reads searchParams, so render inside <Suspense>. */
export async function Controls({
  lang,
  dict,
  path,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  path: string;
  searchParams: SearchParams;
}) {
  const region = parseRegion((await searchParams).region);
  const nav = [
    { path: "/", label: dict.nav.overview },
    { path: "/salary", label: dict.nav.salary },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Main" className="flex gap-1">
        {nav.map((item) => (
          <Link
            key={item.path}
            href={href(lang, item.path, region)}
            className={pill(item.path === path)}
            aria-current={item.path === path ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label={dict.region.label} className="flex gap-1">
          {REGIONS.map((r) => (
            <Link
              key={r ?? "all"}
              href={href(lang, path, r)}
              className={pill(r === region)}
              aria-current={r === region ? "true" : undefined}
            >
              {r === null ? dict.region.all : dict.region[r]}
            </Link>
          ))}
        </div>
        <div role="group" aria-label={dict.language.label} className="flex gap-1">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={href(l, path, region)}
              hrefLang={l}
              lang={l}
              className={pill(l === lang)}
              aria-current={l === lang ? "true" : undefined}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Same layout without region info, shown while searchParams resolve. */
export function ControlsFallback({ lang, dict, path }: { lang: Locale; dict: Dictionary; path: string }) {
  return (
    <nav aria-label="Main" className="flex gap-1">
      {[
        { path: "/", label: dict.nav.overview },
        { path: "/salary", label: dict.nav.salary },
      ].map((item) => (
        <Link key={item.path} href={href(lang, item.path, null)} className={pill(item.path === path)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
