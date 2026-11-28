"use client";

import { type ReactNode, useActionState, useEffect, useRef } from "react";
import type { MODELS, RANGES, Settings } from "@/lib/settings";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { saveSettingsAction, type SettingsState } from "./actions";

type Props = { settings: Settings; ranges: typeof RANGES; models: typeof MODELS };

const field = "figure h-9 w-20 rounded-md border border-seam-strong bg-transparent px-2.5 text-sm hover:border-steel focus:border-signal focus:outline-none";
const pad = (n: number) => String(n).padStart(2, "0");

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={htmlFor} className="text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-seam px-5 py-3">
      <legend className="caption float-left mb-1 w-full pt-1">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

export function SettingsDialog({ settings: s, ranges, models }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, { error: null, savedAt: null });

  useEffect(() => {
    if (state.savedAt) dialog.current?.close();
  }, [state.savedAt]);

  const num = (name: keyof typeof ranges, label: string) => (
    <Row label={label} htmlFor={`set-${name}`}>
      <input id={`set-${name}`} name={name} type="number" inputMode="numeric" required min={ranges[name][0]} max={ranges[name][1]} defaultValue={s[name]} className={field} />
    </Row>
  );

  const radios = (name: string, options: [string, string][], value: string) => (
    <div className="flex gap-1.5">
      {options.map(([v, label]) => (
        <label key={v} className="cursor-pointer">
          <input type="radio" name={name} value={v} defaultChecked={value === v} className="peer sr-only" />
          <span className="flex h-8 items-center rounded-md border border-seam-strong px-3 text-sm text-steel transition-colors hover:text-paper peer-checked:border-paper peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
            {label}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Settings"
        title="Settings"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-seam-strong text-steel transition-colors hover:border-steel hover:text-paper"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2 4h7M12 4h2M2 12h2M7 12h7" />
          <circle cx="10.5" cy="4" r="1.5" />
          <circle cx="5.5" cy="12" r="1.5" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="settings-title"
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60"
      >
        <form action={action}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 id="settings-title" className="font-semibold">
              Settings
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-seam hover:text-paper">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="grid md:grid-cols-2 md:divide-x md:divide-seam">
            <div>
            <Section title="Appearance">
              <Row label="Theme">{radios("theme", [["dark", "Dark"], ["light", "Light"]], s.theme)}</Row>
              {num("jobsShown", "Jobs shown")}
            </Section>

            <Section title="Run">
              <Row label="Mode">{radios("mode", [["manual", "Manual"], ["auto", "Automatic"]], s.mode)}</Row>
              <Row label="Daily run time" htmlFor="set-runTime">
                <input id="set-runTime" name="runTime" type="time" required defaultValue={`${pad(s.runHour)}:${pad(s.runMinute)}`} className={`${field} w-28`} />
              </Row>
              {num("searchEveryDays", "Web search every (days)")}
            </Section>

            </div>
            <Section title="Claude web search">
              <Row label="Model" htmlFor="set-model">
                <select id="set-model" name="model" defaultValue={s.model} className="h-9 rounded-md border border-seam-strong bg-slate px-2 text-sm hover:border-steel focus:border-signal focus:outline-none">
                  {Object.entries(models).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Row>
              {num("searches", "Max searches")}
              {num("fetches", "Max pages read")}
              {num("maxJobs", "Max jobs returned")}
              {num("enoughJobs", "Stop early at (jobs)")}
              {num("enoughFit", "… with fit of at least (/10)")}
            </Section>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-seam px-5 py-4">
            <button type="submit" disabled={pending} className={buttonPrimary}>
              {pending ? "Saving…" : "Save settings"}
            </button>
            <button type="button" onClick={() => dialog.current?.close()} className={buttonSecondary}>
              Close
            </button>
            {state.error && (
              <p role="alert" className="w-full text-sm text-alert">
                {state.error}
              </p>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
