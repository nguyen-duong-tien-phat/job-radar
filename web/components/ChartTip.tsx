"use client";

import { useEffect, useRef, useState } from "react";

import type { TipData } from "@/lib/tip";

type Active = { x: number; y: number; width: number; data: TipData };

/**
 * Wraps a server-rendered chart and shows one shared tooltip for whichever child carries a
 * `data-tip` attribute under the pointer. The charts stay plain server markup; only this thin
 * wrapper is client code. Works with touch too (a tap shows the tooltip).
 */
export function ChartTip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);

  function update(event: React.PointerEvent) {
    const target = (event.target as Element).closest?.("[data-tip]");
    const box = ref.current?.getBoundingClientRect();
    if (!target || !box) return setActive(null);
    try {
      const data = JSON.parse(target.getAttribute("data-tip") ?? "{}") as TipData;
      setActive({ x: event.clientX - box.left, y: event.clientY - box.top, width: box.width, data });
    } catch {
      setActive(null);
    }
  }

  // While a tooltip is open, hide it as soon as the pointer is anywhere outside this chart or the
  // page scrolls. This does not rely on pointerleave firing, which touch screens do not always do.
  const open = active !== null;
  useEffect(() => {
    if (!open) return;
    const hideIfOutside = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) setActive(null);
    };
    const hide = () => setActive(null);
    document.addEventListener("pointermove", hideIfOutside);
    document.addEventListener("pointerdown", hideIfOutside);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("pointermove", hideIfOutside);
      document.removeEventListener("pointerdown", hideIfOutside);
      window.removeEventListener("scroll", hide);
    };
  }, [open]);

  const flip = active ? active.x > active.width * 0.6 : false;
  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onPointerMove={update}
      onPointerDown={update}
      onPointerLeave={() => setActive(null)}
    >
      {children}
      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 min-w-28 max-w-64 rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg"
          style={{
            left: active.x,
            top: active.y,
            transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, calc(-100% - 10px))`,
          }}
        >
          {active.data.title && <div className="mb-1 font-semibold">{active.data.title}</div>}
          {active.data.rows?.map((row, i) => (
            <div key={i} className="flex items-center gap-2 tabular-nums">
              {row.color && (
                <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
              )}
              <span className="opacity-75">{row.label}</span>
              <span className="ml-auto pl-3 font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
