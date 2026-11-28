import { describe, expect, it } from "vitest";
import { splitSections } from "./sections";

describe("splitSections", () => {
  it("reads English headings", () => {
    const s = splitSections("We build payments.\nYour role & responsibilities\n- Build APIs\nYour skills & qualifications\n- 3 years Node.js\nBenefits for you\n- 13th month salary");
    expect(s).toEqual({ about: "We build payments.", scope: "- Build APIs", requirements: "- 3 years Node.js", benefits: "- 13th month salary" });
  });

  it("reads Vietnamese headings and decodes double-escaped entities", () => {
    const s = splitSections("Mô tả công việc:\n- Phát triển API\nYêu cầu công việc:\n- Java\nQuyền lợi\n- C&aacute;c chế độ phụ cấp");
    expect(s.scope).toBe("- Phát triển API");
    expect(s.requirements).toBe("- Java");
    expect(s.benefits).toBe("- Các chế độ phụ cấp");
  });

  it("does not treat a sentence that starts like a heading as one", () => {
    expect(splitSections("Experience with Kafka is a plus.").about).toBe("Experience with Kafka is a plus.");
  });

  it("keeps everything as about when there are no headings", () => {
    expect(splitSections("Just a paragraph.\nAnother line.")).toEqual({ about: "Just a paragraph.\nAnother line.", scope: "", requirements: "", benefits: "" });
  });
});

describe("unreadable", () => {
  it("flags postings with no sections and almost no text", async () => {
    const { unreadable } = await import("./sections");
    expect(unreadable(splitSections("Địa điểm: Hà Nội"))).toBe(true);
    expect(unreadable(splitSections("Requirements\n- Go"))).toBe(false);
    expect(unreadable(splitSections("x".repeat(300)))).toBe(false);
  });
});
