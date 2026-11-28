"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { startRunAction } from "./actions";

/** Starts a crawl + web search in the background; refreshes the board until it finishes. */
export function RunButton({ running, label = "Find jobs", secondary = false }: { running: boolean; label?: string; secondary?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [running, router]);

  return (
    <form action={startRunAction}>
      <button type="submit" disabled={running} className={`${secondary ? buttonSecondary : buttonPrimary} h-9 px-4`}>
        {running ? "Searching…" : label}
      </button>
    </form>
  );
}
