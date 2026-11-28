"use client";

import { useState } from "react";
import { setSavedAction } from "./actions";

/** Bookmark toggle on a board row; filled when saved. */
export function SaveButton({ id, saved: initial, className = "" }: { id: number; saved: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Unsave job" : "Save job"}
      title={saved ? "Saved" : "Save"}
      onClick={async () => {
        setSaved(!saved);
        await setSavedAction(id, !saved);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-seam ${saved ? "text-good" : "text-steel hover:text-paper"} ${className}`}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M1.5 1.5h9v11L6 9.5l-4.5 3z" />
      </svg>
    </button>
  );
}
