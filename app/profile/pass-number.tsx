"use client";

import { useState } from "react";

/** A pass value as a large figure; lights signal yellow while it differs from the saved value. */
export function PassNumber({
  id,
  name,
  initial,
  unit,
  max,
  step,
  placeholder,
}: {
  id: string;
  name: string;
  initial: number | null;
  unit: string;
  max?: number;
  step?: number;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const changed = value !== (initial == null ? "" : String(initial));
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`figure w-full max-w-40 appearance-none border-0 border-b bg-transparent pb-1 text-3xl leading-none sm:text-4xl font-medium [-moz-appearance:textfield] placeholder:text-steel focus:border-signal focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          changed ? "border-signal text-signal" : "border-seam-strong text-paper hover:border-steel"
        }`}
      />
      <span className="text-sm text-steel">{unit}</span>
    </div>
  );
}
