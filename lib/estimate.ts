// Rough token estimate for one Claude web search run, used in Settings next to the real numbers of the last run.
// Each search or fetch is one more turn, and every turn re-reads the whole conversation so far (most of it from cache),
// so tokens grow with the square of the number of tool calls. This is the upper bound: the run usually stops earlier.
export const ESTIMATE = {
  overhead: 6000, // system prompt and tool definitions of a headless claude run
  prompt: 2000, // our prompt with profile, tracked companies and known jobs
  perSearch: 2500, // one result page of web search
  perFetch: 2000, // one fetched page, as WebFetch returns it
  outputBase: 1500,
  outputPerJob: 150,
  outputPerCall: 150,
};

export function estimateSearchTokens(s: { searches: number; fetches: number; maxJobs: number }): number {
  const e = ESTIMATE;
  const calls = s.searches + s.fetches;
  const perCall = calls ? (s.searches * e.perSearch + s.fetches * e.perFetch) / calls : 0;
  const input = (calls + 1) * (e.overhead + e.prompt) + (perCall * calls * (calls + 1)) / 2;
  const output = e.outputBase + s.maxJobs * e.outputPerJob + calls * e.outputPerCall;
  return Math.round(input + output);
}

/** "830k", "12k", "900". */
export const compactTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
