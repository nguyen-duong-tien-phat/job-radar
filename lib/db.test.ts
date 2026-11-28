import { describe, expect, it } from "vitest";
import { changedFields } from "./db";

const base = { skills: ["React", "Node.js"], roles: ["backend"], locations: ["hcm"], years: 5, minSalaryUsd: null };

describe("changedFields", () => {
  it("ignores order and case of list values", () => {
    expect(changedFields(base, { ...base, skills: ["node.js", "react"] })).toEqual([]);
  });

  it("names every field that changed", () => {
    expect(changedFields(base, { ...base, roles: [], years: 6, minSalaryUsd: 2000 })).toEqual(["roles", "years", "minSalaryUsd"]);
  });
});
