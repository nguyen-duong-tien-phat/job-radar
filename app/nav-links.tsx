"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Job"],
  ["/profile", "Profile"],
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Chính" className="flex gap-6 self-stretch">
      {LINKS.map(([href, label]) => {
        const current = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`-mb-px flex h-full items-center border-b-2 text-sm transition-colors ${current ? "border-signal text-paper" : "border-transparent text-steel hover:text-paper"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
