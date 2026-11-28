"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { buttonPrimary } from "@/lib/ui";
import { uploadCv, type UploadState } from "./actions";

/**
 * CV drop zone. After a successful read it calls `onDone`, or, on the first-run page,
 * opens the main screen with the profile editor.
 */
export function UploadForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCv, { error: null, done: null });
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!state.done) return;
    if (onDone) onDone();
    else router.push("/?edit=1");
  }, [state.done, onDone, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label
        className={`relative flex cursor-pointer flex-col rounded-md border border-dashed bg-slate transition-colors focus-within:border-signal hover:border-steel ${
          state.error ? "border-alert" : fileName ? "border-signal" : "border-seam-strong"
        }`}
      >
        <span className="flex min-h-40 flex-col justify-center px-6 py-8">
          <span className={`text-lg font-medium ${fileName ? "text-signal [overflow-wrap:anywhere]" : ""}`}>
            {fileName ?? "Drop your CV here or click to choose"}
          </span>
        </span>
        <span className="grid grid-cols-2 divide-x divide-dashed divide-seam-strong border-t border-dashed border-seam-strong">
          <span className="px-4 py-3 sm:px-6">
            <span className="caption block">Format</span>
            <span className="figure text-sm">PDF</span>
          </span>
          <span className="px-4 py-3 sm:px-6">
            <span className="caption block">Max size</span>
            <span className="figure text-sm">5 MB</span>
          </span>
        </span>
        <input
          name="cv"
          type="file"
          accept="application/pdf,.pdf"
          required
          aria-describedby={state.error ? "cv-error" : undefined}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Reading CV…" : "Read CV"}
        </button>
        {state.error && (
          <p id="cv-error" role="alert" className="text-sm text-alert">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
