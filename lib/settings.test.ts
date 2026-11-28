import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULTS, hardLimit, parseSettings } from "./settings";

beforeAll(() => {
  process.env.JOB_RADAR_DB = ":memory:";
});

describe("parseSettings", () => {
  it("accepts valid values and keeps defaults for bad or missing ones", () => {
    const s = parseSettings({ theme: "light", mode: "auto", jobsShown: "50", runHour: "25", searches: "3.5", model: "claude-opus-5-5", enoughFit: "10" });
    expect(s).toEqual({ ...DEFAULTS, theme: "light", mode: "auto", jobsShown: 50, model: "claude-opus-5-5", enoughFit: 10 });
    expect(parseSettings({ model: "gpt-5" }).model).toBe(DEFAULTS.model);
  });
});

describe("saveSettings / getSettings", () => {
  it("round-trips through the database", async () => {
    const { getSettings, saveSettings } = await import("./settings");
    expect(getSettings()).toEqual(DEFAULTS);
    saveSettings({ ...DEFAULTS, runHour: 7, model: "claude-haiku-5-5" });
    expect(getSettings()).toMatchObject({ runHour: 7, model: "claude-haiku-5-5" });
  });
});

it("hardLimit is 1.5x the asked limit, rounded up", () => {
  expect(hardLimit({ searches: 8, fetches: 15 })).toEqual({ searches: 12, fetches: 23 });
});

describe("plistXml", () => {
  it("runs ops/daily.sh at the set time with escaped paths", async () => {
    const { plistXml } = await import("./schedule");
    const x = plistXml("/Users/a&b/job-radar", ["/opt/node/bin", "/opt/homebrew/bin"], 7, 5);
    expect(x).toContain("<string>/Users/a&amp;b/job-radar/ops/daily.sh</string>");
    expect(x).toContain("<string>/opt/node/bin:/opt/homebrew/bin:/usr/bin:/bin</string>");
    expect(x).toContain("<key>Hour</key><integer>7</integer><key>Minute</key><integer>5</integer>");
  });
});
