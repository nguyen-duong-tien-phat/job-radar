"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Filters the board as you type; the text lives in the URL (?q=) with the sort and label filter. */
export function BoardSearch() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (q: string) => {
    setValue(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    }, 250);
  };

  return (
    <div className="relative ml-auto w-full max-w-64">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-steel" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="4.25" />
        <path d="M9.25 9.25L12.5 12.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder="Filter jobs"
        aria-label="Filter jobs by title, company, location or skill"
        className="h-8 w-full rounded-md border border-seam-strong bg-transparent pr-2.5 pl-8 text-sm placeholder:text-steel hover:border-steel focus:border-signal focus:outline-none"
      />
    </div>
  );
}
