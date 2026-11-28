import { describe, expect, it } from "vitest";
import { checkCvFile, extractProfile } from "./cv";
import { extractSkills } from "./skills";

const pdfHead = new TextEncoder().encode("%PDF-1.7");

describe("extractSkills", () => {
  it("matches aliases and keeps look-alike names apart", () => {
    const s = extractSkills("Built APIs in NodeJS and Golang, frontend in ReactJS; some C++ and C#.");
    expect(s).toEqual(expect.arrayContaining(["Node.js", "Go", "React", "C++", "C#"]));
    expect(s).not.toContain("Java");
  });

  it("does not read common English words as skills", () => {
    expect(extractSkills("Ready to go, express ideas, team unity")).toEqual([]);
  });

  it("does not read the js in Node.js as JavaScript", () => {
    expect(extractSkills("Node.js services")).toEqual(["Node.js"]);
  });

  it("does not see Java inside JavaScript", () => {
    expect(extractSkills("JavaScript developer")).toEqual(["JavaScript"]);
  });
});

describe("extractProfile", () => {
  it("reads roles, locations and years from a Vietnamese CV", () => {
    const p = extractProfile("Lập trình viên Backend, 4 năm kinh nghiệm Java, Spring Boot. Địa chỉ: Hà Nội. Có thể làm remote.");
    expect(p.roles).toEqual(["backend"]);
    expect(p.locations).toEqual(["hn", "remote"]);
    expect(p.years).toBe(4);
    expect(p.skills).toEqual(["Java", "Spring"]);
  });

  it("takes the largest plausible years claim", () => {
    expect(extractProfile("2 years React, 6+ years total, born 1999").years).toBe(6);
  });
});

describe("checkCvFile", () => {
  it("accepts a real PDF", () => expect(checkCvFile("cv.PDF", 1000, pdfHead)).toBeNull());
  it("rejects a renamed non-PDF", () =>
    expect(checkCvFile("cv.pdf", 1000, new TextEncoder().encode("hello"))).toBe("Chỉ nhận file PDF."));
  it("rejects files over 5 MB", () => expect(checkCvFile("cv.pdf", 6 * 1024 * 1024, pdfHead)).toBe("File lớn hơn 5 MB."));
  it("rejects empty input", () => expect(checkCvFile("", 0, new Uint8Array())).toBe("Chưa chọn file."));
});
