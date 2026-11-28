"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonPrimary } from "@/lib/ui";
import { startRunAction } from "./actions";

/** Starts a crawl + web search in the background; refreshes the board until it finishes. */
export function RunButton({ running }: { running: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [running, router]);

  return (
    <form action={startRunAction}>
      <button type="submit" disabled={running} className={`${buttonPrimary} h-9 px-4`}>
        {running ? "Searching…" : "Find jobs"}
      </button>
    </form>
  );
}
