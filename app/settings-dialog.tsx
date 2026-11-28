"use client";

import {
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { compactTokens, estimateSearchTokens } from "@/lib/estimate";
import type { MODELS, RANGES, Settings } from "@/lib/settings";
import { buttonPrimary, buttonSecondary, SOURCE_NAMES } from "@/lib/ui";
import { saveSettingsAction, type SettingsState } from "./actions";

type Props = {
  settings: Settings;
  ranges: typeof RANGES;
  models: typeof MODELS;
  companies: number;
  /** Tokens the last Claude web search used, when there was one. */
  lastSearchTokens: number | null;
};

const field =
  "figure h-9 w-20 rounded-md border border-seam-strong bg-transparent px-2.5 text-sm hover:border-steel focus:border-signal focus:outline-none";
const pad = (n: number) => String(n).padStart(2, "0");

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={htmlFor} className="text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}

// section + h3 rather than fieldset + legend: Safari lays out a legend differently from Chrome.
function Section({
  title,
  hidden,
  children,
}: {
  title: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  const id = `set-section-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      hidden={hidden}
      className="border-t border-seam px-5 py-3"
    >
      <h3 id={id} className="caption mb-1 pt-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SettingsDialog({
  settings: s,
  ranges,
  models,
  companies,
  lastSearchTokens,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The estimate follows the limits as they are typed, before saving.
  const [limits, setLimits] = useState({
    searches: s.searches,
    fetches: s.fetches,
    maxJobs: s.maxJobs,
  });
  const estimate = estimateSearchTokens(limits);
  // Fields that only matter for a choice are hidden (not removed, so their saved values still submit).
  const [mode, setMode] = useState(s.mode);
  const [claudeOn, setClaudeOn] = useState(
    !s.disabledSources.includes("claude-search"),
  );
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettingsAction,
    { error: null, savedAt: null },
  );

  useEffect(() => {
    if (state.savedAt) dialog.current?.close();
  }, [state.savedAt]);

  const num = (name: keyof typeof ranges, label: string) => (
    <Row label={label} htmlFor={`set-${name}`}>
      <input
        id={`set-${name}`}
        name={name}
        type="number"
        inputMode="numeric"
        required
        min={ranges[name][0]}
        max={ranges[name][1]}
        defaultValue={s[name]}
        className={field}
      />
    </Row>
  );

  // A number filled into the Claude sentence.
  const blank = (name: keyof typeof ranges, label: string) => (
    <input
      name={name}
      aria-label={label}
      type="number"
      inputMode="numeric"
      required
      min={ranges[name][0]}
      max={ranges[name][1]}
      defaultValue={s[name]}
      className="figure inline-block h-8 w-14 rounded-md border border-seam-strong bg-transparent px-2 text-center align-middle text-sm hover:border-steel focus:border-signal focus:outline-none"
    />
  );

  const radios = (name: string, options: [string, string][], value: string) => (
    <div role="radiogroup" aria-label={name} className="flex gap-1.5">
      {options.map(([v, label]) => (
        <label key={v} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={v}
            defaultChecked={value === v}
            className="peer sr-only"
          />
          <span className="flex h-8 items-center rounded-md border border-seam-strong px-3 text-sm text-steel transition-colors hover:text-paper peer-checked:border-paper peer-checked:bg-paper peer-checked:font-medium peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M2 4h7M12 4h2M2 12h2M7 12h7" />
          <circle cx="10.5" cy="4" r="1.5" />
          <circle cx="5.5" cy="12" r="1.5" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="settings-title"
        className="m-auto w-[min(76rem,calc(100vw-2rem))] rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60"
      >
        <form
          action={action}
          onChange={(e) => {
            const f = new FormData(e.currentTarget);
            setMode(f.get("mode") === "auto" ? "auto" : "manual");
            setClaudeOn(f.getAll("source").includes("claude-search"));
            setLimits({
              searches: Number(f.get("searches")) || 0,
              fetches: Number(f.get("fetches")) || 0,
              maxJobs: Number(f.get("maxJobs")) || 0,
            });
          }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <h2 id="settings-title" className="font-semibold">
              Settings
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-seam hover:text-paper"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <path
                  d="M1 1l8 8M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Columns follow the dialog's own width (container query), the same in every browser. */}
          <div className="@container">
            <div
              className={`grid @3xl:divide-x @3xl:divide-seam ${claudeOn ? "@3xl:grid-cols-3" : "@3xl:grid-cols-2"}`}
            >
              <div>
                <Section title="Appearance">
                  <Row label="Theme">
                    {radios(
                      "theme",
                      [
                        ["dark", "Dark"],
                        ["light", "Light"],
                      ],
                      s.theme,
                    )}
                  </Row>
                  {num("jobsShown", "Jobs shown")}
                </Section>

                <Section title="Run">
                  <Row label="Keywords" htmlFor="set-searchTerms">
                  <input
                    id="set-searchTerms"
                    name="searchTerms"
                    defaultValue={s.searchTerms}
                    maxLength={100}
                    placeholder="golang, fintech"
                    className="h-9 w-52 rounded-md border border-seam-strong bg-transparent px-2.5 text-sm placeholder:text-steel hover:border-steel focus:border-signal focus:outline-none"
                  />
                </Row>
                <Row label="Mode">
                    {radios(
                      "mode",
                      [
                        ["manual", "Manual"],
                        ["auto", "Automatic"],
                      ],
                      s.mode,
                    )}
                  </Row>
                  <div hidden={mode !== "auto"}>
                    <Row label="Daily run time" htmlFor="set-runTime">
                      <input
                        id="set-runTime"
                        name="runTime"
                        type="time"
                        required
                        defaultValue={`${pad(s.runHour)}:${pad(s.runMinute)}`}
                        className={`${field} w-28`}
                      />
                    </Row>
                  </div>
                  <div hidden={mode !== "auto" || !claudeOn}>
                    {num("searchEveryDays", "Web search every (days)")}
                  </div>
                </Section>
              </div>
              <Section title="Sources">
                {Object.entries(SOURCE_NAMES).map(([key, name]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="source"
                      value={key}
                      defaultChecked={!s.disabledSources.includes(key)}
                      className="h-4 w-4 accent-[var(--signal)]"
                    />
                    <span className="flex-1">
                      {name}
                      {key === "ats" && (
                        <span className="figure text-steel">
                          {" "}
                          ({companies})
                        </span>
                      )}
                    </span>
                    <span className="figure text-xs text-steel">
                      {key === "claude-search"
                        ? `≤ ${compactTokens(estimate)} tokens`
                        : "0 tokens"}
                    </span>
                  </label>
                ))}
                {lastSearchTokens !== null && (
                  <p className="mt-1 text-right text-xs text-steel">
                    Last Claude run:{" "}
                    <span className="figure text-paper">
                      {compactTokens(lastSearchTokens)}
                    </span>{" "}
                    tokens
                  </p>
                )}
              </Section>
              <Section title="Claude web search" hidden={!claudeOn}>
                {/* Read as the instruction Claude gets, with the numbers as blanks to fill. */}
                <p className="py-2 text-[15px] leading-[2.6]">
                  Using{" "}
                  <select
                    name="model"
                    aria-label="Model"
                    defaultValue={s.model}
                    className="select inline-block h-9 rounded-md border border-seam-strong bg-slate pr-8 pl-2.5 align-middle text-sm hover:border-steel focus:border-signal focus:outline-none"
                  >
                    {Object.entries(models).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  , search the web at most {blank("searches", "Max searches")} times and read at most {blank("fetches", "Max pages read")} pages. Return up to{" "}
                  {blank("maxJobs", "Max jobs returned")} jobs, and stop as soon as {blank("enoughJobs", "Stop early at jobs")} jobs fit my CV at least{" "}
                  {blank("enoughFit", "Minimum fit out of 10")}/10.
                </p>
              </Section>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-seam px-5 py-4">
            <button type="submit" disabled={pending} className={buttonPrimary}>
              {pending ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={buttonSecondary}
            >
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
