import { describe, expect, it } from "vitest";
import { dedupe, type JobRow, scoreJob } from "./score";

const now = Date.parse("2026-11-28T00:00:00Z");
const job = (over: Partial<JobRow> = {}): JobRow => ({
  id: 1,
  url: "https://x/1",
  source: "topdev",
  official: 0,
  company: "Acme",
  title: "Backend Engineer",
  location: "Hà Nội",
  remote: 0,
  description: "Node.js, TypeScript, PostgreSQL, Kafka",
  salary: null,
  posted_at: "2026-11-27T00:00:00Z",
  first_seen: "2026-11-27T00:00:00Z",
  viewed_at: null,
  ...over,
});
const profile = { skills: ["node.js", "TypeScript", "PostgreSQL", "Docker"], locations: ["hn"] };

describe("scoreJob", () => {
  it("explains the score with matched and missing skills", () => {
    const s = scoreJob(job(), profile, now);
    expect(s.matched).toEqual(["TypeScript", "Node.js", "PostgreSQL"]);
    expect(s.missing).toEqual(["Kafka"]);
    // skills 3/5*50 + 3/4*20 = 45, location 20, fresh 10
    expect(s.score).toBe(75);
  });

  it("ranks a job in the wrong city and old below the same job nearby and new", () => {
    const near = scoreJob(job(), profile, now).score;
    const far = scoreJob(job({ location: "Đà Nẵng", posted_at: "2026-09-01T00:00:00Z" }), profile, now).score;
    expect(far).toBe(near - 15 - 10);
  });

  it("gives remote jobs full location points when the user wants remote", () => {
    expect(scoreJob(job({ location: "Anywhere", remote: 1 }), { ...profile, locations: ["remote"] }, now).score).toBe(75);
  });

  it("gives half skill marks when the posting names no known skill", () => {
    expect(scoreJob(job({ description: "Mô tả ngắn", title: "Developer" }), profile, now).score).toBe(35 + 20 + 10);
  });
});

describe("dedupe", () => {
  it("keeps the official posting of the same job from two sources", () => {
    const a = scoreJob(job({ id: 1, company: "Công ty TNHH Acme", source: "topdev" }), profile, now);
    const b = scoreJob(job({ id: 2, company: "ACME", source: "lever:acme", official: 1, description: "" }), profile, now);
    expect(dedupe([a, b]).map((j) => j.id)).toEqual([2]);
  });
});

describe("sortJobs", () => {
  const a = scoreJob(job({ id: 1, first_seen: "2026-11-20T00:00:00Z", posted_at: "2026-11-27T00:00:00Z" }), profile, now);
  const b = scoreJob(job({ id: 2, first_seen: "2026-11-27T00:00:00Z", posted_at: "2026-11-01T00:00:00Z", description: "Kafka" }), profile, now);
  it("newest found first by default, best match and posted date on request", async () => {
    const { sortJobs } = await import("./score");
    expect(sortJobs([a, b], "new").map((j) => j.id)).toEqual([2, 1]);
    expect(sortJobs([b, a], "match").map((j) => j.id)).toEqual([1, 2]);
    expect(sortJobs([b, a], "posted").map((j) => j.id)).toEqual([1, 2]);
  });
});
