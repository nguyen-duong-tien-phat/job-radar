import { expect, it } from "vitest";
import { compactTokens, estimateSearchTokens } from "./estimate";

it("grows faster than linearly with tool calls and is under 1M at the default limits", () => {
  const small = estimateSearchTokens({ searches: 2, fetches: 2, maxJobs: 10 });
  const big = estimateSearchTokens({ searches: 8, fetches: 15, maxJobs: 20 });
  expect(big / small).toBeGreaterThan(23 / 4);
  expect(big).toBeGreaterThan(500_000);
  expect(big).toBeLessThan(1_000_000);
  expect(compactTokens(big)).toMatch(/^\d+k$/);
});
