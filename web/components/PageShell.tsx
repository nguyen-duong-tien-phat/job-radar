import Link from "next/link";
import { Suspense } from "react";

import { Controls, ControlsFallback } from "@/components/Controls";
import { getSql } from "@/lib/db";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import { sourceInfo } from "@/lib/sources";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

export function PageShell({
  lang,
  dict,
  path,
  searchParams,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  path: string;
  searchParams: SearchParams;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-4">
        <div>
          <Link href={`/${lang}`} className="text-2xl font-semibold tracking-tight">
            {dict.app.title}
          </Link>
          <p className="text-sm text-foreground/60">{dict.app.tagline}</p>
        </div>
        <Suspense fallback={<ControlsFallback lang={lang} dict={dict} path={path} />}>
          <Controls lang={lang} dict={dict} path={path} searchParams={searchParams} />
        </Suspense>
      </header>
      <main className="flex flex-1 flex-col gap-8">{children}</main>
      <footer className="flex flex-col gap-1 border-t border-foreground/10 pt-4 text-xs text-foreground/60">
        <Suspense fallback={null}>
          <Attribution dict={dict} />
        </Suspense>
        <p>{dict.footer.note}</p>
      </footer>
    </div>
  );
}
