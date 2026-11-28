"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Scored } from "@/lib/score";
import type { JobSections } from "@/lib/sections";
import { ago, buttonPrimary, buttonSecondary, sourceName } from "@/lib/ui";

type Detail = Omit<Scored, "description"> & { sections: JobSections };

const OPEN_EVENT = "job:open";

/** Opens the detail dialog for a job; the board rows call this instead of linking out. */
export const openJob = (id: number) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));

/** A board row: a button that opens the job inside the app. */
export function JobRowButton({ id, className, children }: { id: number; className: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => openJob(id)} className={`w-full text-left ${className}`}>
      {children}
    </button>
  );
}

const tone = (s: number) => (s >= 75 ? "bg-good-dim text-good" : s >= 55 ? "bg-warm-dim text-warm" : "bg-seam/60 text-steel");

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="caption mb-1">{label}</p>
      <div className="text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <section className="border-t border-seam px-5 py-4">
      <h3 className="caption mb-2">{title}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{text}</p>
    </section>
  );
}

/** The one detail dialog of the board: facts, fit, scope, requirements, benefits; the original posting only on request. */
export function JobDetail() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [job, setJob] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = async (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      setJob(null);
      setError(null);
      dialog.current?.showModal();
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) throw new Error();
        setJob(await res.json());
        router.refresh(); // the row now shows "Viewed"
      } catch {
        setError("Could not load this job.");
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [router]);

  const s = job?.sections;
  const hasSections = s && (s.scope || s.requirements || s.benefits);

  return (
    <dialog
      ref={dialog}
      aria-label={job?.title ?? "Job"}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(56rem,calc(100vw-2rem))] flex-col rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60 open:flex"
    >
      <div className="flex items-start gap-4 px-5 py-4">
        {job && <span className={`figure inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-md text-lg font-medium ${tone(job.score)}`}>{job.score}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{job?.title ?? (error ? "Job" : "Loading…")}</h2>
          {job && (
            <p className="text-sm text-steel">
              {job.company || "—"} · <span className={job.official ? "text-good" : ""}>{sourceName(job.source)}</span>
            </p>
          )}
        </div>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel hover:bg-seam hover:text-paper">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="border-t border-seam px-5 py-4 text-sm text-alert">{error}</p>}
        {job && s && (
          <>
            <div className="grid grid-cols-2 gap-4 border-t border-seam px-5 py-4 sm:grid-cols-4">
              <Fact label="Location">{job.remote ? <span className="text-cool">Remote</span> : job.location || "—"}</Fact>
              <Fact label="Salary">{job.salary ? <span className="figure">{job.salary}</span> : "—"}</Fact>
              <Fact label="Posted">
                <span className="figure">{ago(job.posted_at ?? job.first_seen)}</span>
              </Fact>
              <Fact label="Found">
                <span className="figure">{ago(job.first_seen)}</span>
              </Fact>
            </div>
            {(job.matched.length > 0 || job.missing.length > 0) && (
              <div className="flex flex-wrap gap-1.5 border-t border-seam px-5 py-4">
                {job.matched.map((k) => (
                  <span key={k} className="rounded-md bg-good-dim px-2 py-0.5 text-[13px] text-good">
                    {k}
                  </span>
                ))}
                {job.missing.map((k) => (
                  <span key={k} className="rounded-md border border-rose/40 px-2 py-0.5 text-[13px] text-rose">
                    {k}
                  </span>
                ))}
              </div>
            )}
            <Block title="Scope" text={s.scope} />
            <Block title="Requirements" text={s.requirements} />
            <Block title="Benefits" text={s.benefits} />
            <Block title={hasSections ? "About" : "Description"} text={s.about} />
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-seam px-5 py-4">
        {job && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className={buttonPrimary}>
            Open original posting
          </a>
        )}
        <button type="button" onClick={() => dialog.current?.close()} className={buttonSecondary}>
          Close
        </button>
      </div>
    </dialog>
  );
}
