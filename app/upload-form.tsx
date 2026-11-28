"use client";

import { useActionState } from "react";
import { uploadCv, type UploadState } from "./actions";

export function UploadForm({ label }: { label: string }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCv, { error: null });
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="cv" className="text-sm font-medium">
        File CV (PDF, tối đa 5 MB)
      </label>
      <input
        id="cv"
        name="cv"
        type="file"
        accept="application/pdf,.pdf"
        required
        className="rounded border border-neutral-300 p-2 text-sm dark:border-neutral-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Đang đọc CV…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
