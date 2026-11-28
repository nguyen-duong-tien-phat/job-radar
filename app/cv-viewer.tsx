"use client";

import { useRef, useState } from "react";

/** "View" opens the stored PDF in a modal on the page; the frame loads only when opened. */
export function CvViewer({ id, fileName }: { id: number; fileName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened(true);
          dialog.current?.showModal();
        }}
        className="text-steel underline-offset-4 hover:text-paper hover:underline"
      >
        View
      </button>
      <dialog
        ref={dialog}
        aria-label={fileName}
        className="m-auto h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] max-h-none flex-col rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60 open:flex"
      >
        <div className="flex items-center gap-4 px-5 py-3">
          <h2 className="min-w-0 flex-1 truncate font-semibold">{fileName}</h2>
          <a href={`/cv/${id}?download=1`} className="text-sm text-steel underline-offset-4 hover:text-paper hover:underline">
            Download
          </a>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-seam hover:text-paper">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {opened && <iframe src={`/cv/${id}`} title={fileName} className="min-h-0 w-full flex-1 border-t border-seam bg-white" />}
      </dialog>
    </>
  );
}
