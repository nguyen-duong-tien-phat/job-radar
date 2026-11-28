import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.JOB_RADAR_DB = ":memory:";
});

const job = (url: string) => ({ url, title: "Backend Engineer", company: "Acme", location: "Hà Nội", remote: false, description: "Java" });

describe("saveJobs", () => {
  it("counts new jobs, ignores repeats, and marks jobs a complete source stopped returning", async () => {
    const { saveJobs } = await import("./jobs");
    const { db } = await import("./db");

    expect(saveJobs("lever:acme", true, [job("a"), job("b"), job("a")], true)).toEqual({ kept: 2, added: 2 });
    await new Promise((r) => setTimeout(r, 5)); // later timestamp for the second run
    expect(saveJobs("lever:acme", true, [job("a")], true)).toEqual({ kept: 1, added: 0 });

    const missed = db().prepare("SELECT url, missed, official FROM jobs ORDER BY url").all();
    expect(missed).toEqual([
      { url: "a", missed: 0, official: 1 },
      { url: "b", missed: 1, official: 1 },
    ]);
  });

  it("does not mark jobs missing when the source returned only part of its list", async () => {
    const { saveJobs } = await import("./jobs");
    const { db } = await import("./db");
    saveJobs("topdev", false, [job("t1"), job("t2")], false);
    await new Promise((r) => setTimeout(r, 5));
    saveJobs("topdev", false, [job("t1")], false);
    expect(db().prepare("SELECT missed FROM jobs WHERE url = 't2'").get()).toEqual({ missed: 0 });
  });
});
