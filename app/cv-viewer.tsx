"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "View" opens the stored PDF in a modal on the page. Pages are drawn to canvases at the modal's width
 * (pdf.js via unpdf), so the CV reads the same in Safari and Chrome instead of in each browser's small embedded viewer.
 */
export function CvViewer({ id, fileName }: { id: number; fileName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const box = pages.current;
    if (!opened || !box) return;
    let cancelled = false;
    (async () => {
      try {
        const { getDocumentProxy } = await import("unpdf");
        const bytes = new Uint8Array(await (await fetch(`/cv/${id}`)).arrayBuffer());
        const pdf = await getDocumentProxy(bytes);
        box.replaceChildren();
        const width = box.clientWidth;
        for (let n = 1; n <= pdf.numPages && !cancelled; n++) {
          const page = await pdf.getPage(n);
          const scale = (width / page.getViewport({ scale: 1 }).width) * window.devicePixelRatio;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]";
          canvas.setAttribute("aria-label", `Page ${n}`);
          box.append(canvas);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opened, id]);

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
        className="m-auto h-[calc(100dvh-2rem)] max-h-none w-[min(60rem,calc(100vw-2rem))] flex-col rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60 open:flex"
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
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-seam bg-seam/40 p-4">
          {status === "loading" && <p className="text-sm text-steel">Loading…</p>}
          {status === "error" && (
            <p className="text-sm text-alert">
              Could not show this PDF.{" "}
              <a href={`/cv/${id}?download=1`} className="underline underline-offset-4">
                Download it
              </a>
            </p>
          )}
          <div ref={pages} className="mx-auto flex max-w-[52rem] flex-col gap-4" />
        </div>
      </dialog>
    </>
  );
}
