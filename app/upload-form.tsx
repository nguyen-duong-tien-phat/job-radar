"use client";

import { useActionState, useState } from "react";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { uploadCv, type UploadState } from "./actions";

/** CV drop zone. `large` is the first-run stub; the compact one sits at the end of the profile. */
export function UploadForm({ label, large = false }: { label: string; large?: boolean }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCv, { error: null });
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label
        className={`relative flex cursor-pointer flex-col rounded-md border border-dashed transition-colors focus-within:border-signal hover:border-steel ${
          state.error ? "border-alert" : fileName ? "border-signal" : "border-seam-strong"
        } ${large ? "bg-slate" : ""}`}
      >
        <span className={`flex flex-col justify-center gap-1 px-6 ${large ? "min-h-44 py-8" : "min-h-24 py-5"}`}>
          <span className={`${large ? "text-lg font-medium" : "font-medium"} ${fileName ? "text-signal [overflow-wrap:anywhere]" : ""}`}>
            {fileName ?? "Kéo file vào đây hoặc bấm để chọn"}
          </span>
          <span className="text-sm text-steel">
            {fileName ? "Bấm để chọn file khác" : "Chỉ PDF có chữ, không nhận ảnh scan."}
          </span>
        </span>
        {large && (
          <span className="grid grid-cols-3 divide-x divide-dashed divide-seam-strong border-t border-dashed border-seam-strong">
            {[
              ["Định dạng", "PDF", true],
              ["Tối đa", "5 MB", true],
              ["Lưu ở", "Máy này", false],
            ].map(([caption, value, isFigure]) => (
              <span key={String(caption)} className="px-4 py-3 sm:px-6">
                <span className="caption block">{caption}</span>
                <span className={`text-sm ${isFigure ? "figure" : ""}`}>{value}</span>
              </span>
            ))}
          </span>
        )}
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
        <button type="submit" disabled={pending} className={large ? buttonPrimary : buttonSecondary}>
          {pending ? "Đang đọc CV…" : label}
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
