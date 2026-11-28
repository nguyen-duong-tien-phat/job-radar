// Shared pieces of the profile pass, used by the read-only panel and the edit dialog.
import type { ReactNode } from "react";
import type { ProfileField } from "@/lib/db";

export const FIELD_NAMES: Record<ProfileField, string> = {
  skills: "skills",
  roles: "roles",
  locations: "locations",
  years: "experience",
  minSalaryUsd: "minimum salary",
};

/** One segment of the pass: caption on top, value under it. `lit` marks a field changed by the last save. */
export function Segment({ caption, htmlFor, lit, children, className = "" }: { caption: string; htmlFor?: string; lit?: boolean; children: ReactNode; className?: string }) {
  const Caption = htmlFor ? "label" : "p";
  return (
    <div className={`px-4 py-3.5 ${className}`}>
      <Caption htmlFor={htmlFor} className={`caption mb-2 flex items-center gap-2 ${lit ? "!text-signal" : ""}`}>
        {caption}
        {lit && <span className="normal-case tracking-normal">· just updated</span>}
      </Caption>
      {children}
    </div>
  );
}

/** Checkbox toggles. Selected reads as paper on slate; any toggle that differs from the saved profile lights the accent. */
export function Toggles({ name, label, options, checked }: { name: string; label: string; options: Record<string, string>; checked: string[] }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(options).map(([value, text]) => {
          const wasOn = checked.includes(value);
          return (
            <label key={value} className="cursor-pointer">
              <input type="checkbox" name={name} value={value} defaultChecked={wasOn} className="peer sr-only" />
              <span
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal [&>svg]:hidden peer-checked:[&>svg]:block ${
                  wasOn
                    ? "border-paper text-paper peer-not-checked:border-signal peer-not-checked:text-steel peer-not-checked:line-through"
                    : "border-seam-strong text-steel hover:border-steel hover:text-paper peer-checked:border-signal peer-checked:text-signal"
                }`}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
                  <path d="M1 4l2.5 2.5L9 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {text}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
