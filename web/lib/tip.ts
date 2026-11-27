// Tooltip payload for charts. Kept out of the client component so server components can call tip().

export type TipData = {
  title?: string;
  rows?: { label: string; value: string; color?: string }[];
};

/** Serialize tooltip content for a `data-tip` attribute (read by components/ChartTip.tsx). */
export const tip = (data: TipData) => JSON.stringify(data);
