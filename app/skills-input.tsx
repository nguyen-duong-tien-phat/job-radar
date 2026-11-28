"use client";

import { useState } from "react";

/** Skill chips with an add field; submits as one comma-joined "skills" value. New chips light the accent until saved. */
export function SkillsInput({ initial }: { initial: string[] }) {
  const [skills, setSkills] = useState(initial);
  const [draft, setDraft] = useState("");
  const removed = initial.filter((s) => !skills.includes(s));

  const add = () => {
    const next = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !skills.some((k) => k.toLowerCase() === s.toLowerCase()));
    if (next.length) setSkills([...skills, ...next]);
    setDraft("");
  };

  return (
    <div>
      <input type="hidden" name="skills" value={skills.join(", ")} />
      {skills.length === 0 ? (
        <p className="text-sm text-signal">No skills found in the CV. Add yours below.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Skills">
          {skills.map((s) => {
            const added = !initial.includes(s);
            return (
              <li
                key={s}
                className={`flex h-8 items-center rounded-md border pl-3 text-sm ${added ? "border-signal text-signal" : "border-seam-strong"}`}
              >
                {s}
                {added && <span className="sr-only"> (added, not saved)</span>}
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((k) => k !== s))}
                  aria-label={`Remove ${s}`}
                  className="ml-1 flex h-full w-8 items-center justify-center rounded-r-md text-steel hover:bg-seam hover:text-paper"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {removed.length > 0 && (
        <p className="mt-3 text-sm text-signal">
          Removed on save: {removed.join(", ")}{" "}
          <button type="button" onClick={() => setSkills([...skills, ...removed])} className="underline underline-offset-4 hover:text-paper">
            Undo
          </button>
        </p>
      )}
      <div className="mt-4 flex max-w-md gap-2">
        <label htmlFor="skill-draft" className="sr-only">
          Add skill
        </label>
        <input
          id="skill-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill, e.g. Kafka"
          className="h-9 flex-1 rounded-md border border-seam-strong bg-transparent px-3 text-sm placeholder:text-steel hover:border-steel focus:border-signal focus:outline-none"
        />
        <button type="button" onClick={add} className="h-9 rounded-md border border-seam-strong px-4 text-sm hover:border-steel hover:bg-seam">
          Add
        </button>
      </div>
    </div>
  );
}
