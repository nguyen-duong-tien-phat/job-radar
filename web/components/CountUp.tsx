"use client";

import { useEffect, useState } from "react";

/** Counts from 0 up to `value` on mount. Server HTML already has the final number. */
export function CountUp({ value, locale }: { value: number; locale: string }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 1000;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3)))); // ease-out cubic
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{new Intl.NumberFormat(locale).format(shown)}</span>;
}
