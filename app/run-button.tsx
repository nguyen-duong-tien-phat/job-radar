"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { startRunAction } from "./actions";

/** Starts a crawl + web search with optional keywords (saved for scheduled runs too); refreshes the board until it finishes. */
export function RunButton({ running, terms, label = "Find jobs", secondary = false }: { running: boolean; terms: string; label?: string; secondary?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [running, router]);

  return (
    <form action={startRunAction} className="flex items-center gap-1.5">
      <input
        name="terms"
        defaultValue={terms}
        maxLength={100}
        disabled={running}
        placeholder="Keywords, e.g. golang, fintech"
        aria-label="Keywords to search for"
        className="h-9 w-56 rounded-md border border-seam-strong bg-transparent px-2.5 text-sm placeholder:text-steel hover:border-steel focus:border-signal focus:outline-none disabled:opacity-60"
      />
      <button type="submit" disabled={running} className={`${secondary ? buttonSecondary : buttonPrimary} h-9 px-4`}>
        {running ? "Searching…" : label}
      </button>
    </form>
  );
}
