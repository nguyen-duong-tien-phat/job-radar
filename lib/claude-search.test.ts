import { describe, expect, it } from "vitest";
import { buildPrompt, toolCalls, toRawJob, validateResult } from "./claude-search";

describe("validateResult", () => {
  it("keeps well-formed entries and drops the rest", () => {
    const { result, dropped } = validateResult({
      jobs: [
        { title: "Backend Engineer", company: "Acme", url: "https://jobs.lever.co/acme/1", official: true, location: "Hanoi", remote: false, skills: ["Go", 3], why: "Go backend", fit: 12 },
        { title: "No url", company: "Acme", url: "", official: false, location: "", remote: false, skills: [], why: "" },
        { title: "Script", company: "Evil", url: "javascript:alert(1)", official: false, location: "", remote: true, skills: [], why: "" },
      ],
      companies: [
        { ats: "lever", slug: "acme", name: "Acme" },
        { ats: "workday", slug: "acme", name: "Acme" },
        { ats: "greenhouse", slug: "../etc", name: "Bad" },
      ],
    });
    expect(result.jobs.map((j) => j.title)).toEqual(["Backend Engineer"]);
    expect(result.jobs[0].skills).toEqual(["Go"]);
    expect(result.jobs[0].fit).toBe(10);
    expect(result.companies).toEqual([{ ats: "lever", slug: "acme", name: "Acme" }]);
    expect(dropped).toBe(4);
  });

  it("survives a reply that is not the expected shape", () => {
    expect(validateResult("nonsense").result).toEqual({ jobs: [], companies: [] });
  });
});

describe("toRawJob", () => {
  it("puts skills where scoring reads them and ignores a bad date", () => {
    const j = toRawJob({ title: "T", company: "C", url: "https://x", official: false, location: "", remote: true, skills: ["Go", "Kafka"], why: "fits", posted_at: "last week", fit: 8 });
    expect(j.description).toBe("Go, Kafka\nfits");
    expect(j.postedAt).toBeNull();
  });
});

describe("buildPrompt", () => {
  it("names the profile and the companies to skip", () => {
    const p = buildPrompt({ skills: ["Go"], roles: ["backend"], locations: ["hn", "remote"], years: 4 }, ["Acme"], ["Beta — Go Engineer"], "2026-11-28", { searches: 8, fetches: 15, maxJobs: 20, enoughJobs: 5, enoughFit: 9, searchTerms: "golang, fintech" });
    expect(p).toContain("Skills: Go");
    expect(p).toContain("Hanoi; remote");
    expect(p).toContain("already tracked: Acme");
    expect(p).toContain("- Beta — Go Engineer");
    expect(p).toContain("Focus this search on: golang, fintech");
    expect(p).toContain("As soon as you have 5 jobs with fit 9 or higher, stop searching");
  });
});

describe("toolCalls", () => {
  it("counts WebSearch and WebFetch uses in an assistant event", () => {
    const event = { type: "assistant", message: { content: [{ type: "text" }, { type: "tool_use", name: "WebSearch" }, { type: "tool_use", name: "WebFetch" }, { type: "tool_use", name: "WebSearch" }] } };
    expect(toolCalls(event)).toEqual({ searches: 2, fetches: 1 });
    expect(toolCalls({ type: "user", message: { content: [{ type: "tool_use", name: "WebSearch" }] } })).toEqual({ searches: 0, fetches: 0 });
  });
});
