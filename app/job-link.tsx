"use client";

import type { ReactNode } from "react";
import { markViewedAction } from "./actions";

/** Opens the posting in a new tab and records that it was viewed. */
export function JobLink({ id, href, className, children }: { id: number; href: string; className: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => void markViewedAction(id)} onAuxClick={() => void markViewedAction(id)} className={className}>
      {children}
    </a>
  );
}
