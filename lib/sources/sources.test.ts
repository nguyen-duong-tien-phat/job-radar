import { describe, expect, it } from "vitest";
import { htmlToText, isTargetLocation, isTechJob } from "../jobs";
import { parseAshby, parseGreenhouse, parseLever, parseSmartRecruiters } from "./ats";
import { parseArbeitnow, parseHnThread, parseRemoteOk, parseWwrRss } from "./remote";
import { parseJobPostingLd } from "./vn";

// Fixtures are synthetic, shaped like each source's real response (checked 2026-11-28).

describe("htmlToText", () => {
  it("unescapes Greenhouse's entity-escaped HTML and keeps line breaks", () => {
    expect(htmlToText("&lt;p&gt;Node.js &amp;amp; React&lt;/p&gt;&lt;ul&gt;&lt;li&gt;AWS&lt;/li&gt;&lt;/ul&gt;")).toBe("Node.js & React\n- AWS");
  });
});

describe("ATS parsers", () => {
  it("greenhouse", () => {
    const [j] = parseGreenhouse(
      { jobs: [{ title: "Senior Backend Engineer", absolute_url: "https://job-boards.greenhouse.io/acme/jobs/1", location: { name: "Ho Chi Minh" }, content: "&lt;p&gt;Java&lt;/p&gt;", first_published: "2026-11-01T00:00:00Z", company_name: "Acme" }] },
      "fallback",
    );
    expect(j).toMatchObject({ company: "Acme", location: "Ho Chi Minh", remote: false, description: "Java", postedAt: "2026-11-01T00:00:00Z" });
  });

  it("lever joins description and lists, reads remote and salary", () => {
    const [j] = parseLever(
      [{ text: "Fullstack Engineer", hostedUrl: "https://jobs.lever.co/acme/x", createdAt: 1764547200000, workplaceType: "remote", categories: { allLocations: ["Hanoi", "Da Nang"] }, descriptionPlain: "About", lists: [{ text: "Requirements", content: "<li>Node.js</li>" }], salaryRange: { min: 2000, max: 3000, currency: "USD", interval: "per-month-salary" } }],
      "Acme",
    );
    expect(j).toMatchObject({ location: "Hanoi, Da Nang", remote: true, salary: "2000–3000 USD per-month-salary" });
    expect(j.description).toContain("Requirements\n- Node.js");
    expect(j.postedAt).toBe("2025-12-01T00:00:00.000Z");
  });

  it("ashby skips unlisted jobs", () => {
    const jobs = parseAshby(
      { jobs: [{ title: "A", jobUrl: "u1", location: "Remote - APAC", isRemote: true, isListed: true }, { title: "B", jobUrl: "u2", isListed: false }] },
      "Acme",
    );
    expect(jobs.map((j) => j.title)).toEqual(["A"]);
    expect(jobs[0]).toMatchObject({ remote: true, location: "Remote - APAC" });
  });

  it("smartrecruiters builds the public url and joins detail sections", () => {
    const [j] = parseSmartRecruiters(
      { content: [{ id: "42", name: "Embedded Engineer", location: { fullLocation: "Ho Chi Minh City, , Vietnam" }, ref: "r" }] },
      new Map([["42", { jobAd: { sections: { jobDescription: { text: "<p>C++</p>" }, qualifications: { text: "<p>Linux</p>" } } } }]]),
      "BoschGroup",
      "Bosch",
    );
    expect(j).toMatchObject({ url: "https://jobs.smartrecruiters.com/BoschGroup/42", company: "Bosch", description: "C++\nLinux" });
  });
});

describe("remote parsers", () => {
  it("remoteok drops the legal notice", () => {
    const jobs = parseRemoteOk([{ legal: "..." } as never, { position: "Data Engineer", company: "X", url: "https://remoteok.com/remote-jobs/1", salary_min: "50000", salary_max: "90000" }]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ remote: true, location: "Remote", salary: "50000–90000 USD/năm" });
  });

  it("arbeitnow keeps remote jobs only", () => {
    const jobs = parseArbeitnow({ data: [{ title: "A", company_name: "X", url: "u", location: "Berlin", remote: false, description: "", created_at: 0 }, { title: "B", company_name: "Y", url: "v", location: "", remote: true, description: "<p>Go</p>", created_at: 1764547200 }] });
    expect(jobs.map((j) => j.title)).toEqual(["B"]);
  });

  it("we work remotely splits company from role and keeps the region", () => {
    const [j] = parseWwrRss(
      "<rss><item><title>Acme: Senior Go Engineer</title><region>USA Only</region><description>&lt;p&gt;Golang&lt;/p&gt;</description><pubDate>Mon, 01 Dec 2025 00:00:00 +0000</pubDate><link>https://weworkremotely.com/x</link></item></rss>",
    );
    expect(j).toMatchObject({ company: "Acme", title: "Senior Go Engineer", location: "USA Only", description: "Golang" });
  });

  it("hn reads the Company | Role | Location header", () => {
    const [j] = parseHnThread({ id: 1, children: [{ id: 7, text: "Acme | Backend Engineer | REMOTE (worldwide) | Full-time<p>We use Python.", children: [] }] });
    expect(j).toMatchObject({ url: "https://news.ycombinator.com/item?id=7", company: "Acme", title: "Backend Engineer", remote: true });
  });
});

describe("JobPosting JSON-LD", () => {
  const page = `<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"JobPosting","title":"Backend Developer (Node.js)","datePosted":"2026-11-22","description":"&lt;p&gt;Node.js, PostgreSQL&lt;/p&gt;","hiringOrganization":{"@type":"Organization","name":"Công ty ABC"},"jobLocation":{"@type":"Place","address":{"addressRegion":"Hồ Chí Minh"}},"baseSalary":{"@type":"MonetaryAmount","currency":"VND","value":{"@type":"QuantitativeValue","minValue":20000000,"maxValue":35000000,"unitText":"MONTH"}}}]}</script></html>`;

  it("reads title, company, location, salary and description", () => {
    expect(parseJobPostingLd(page, "https://topdev.vn/detail-jobs/x-1")).toEqual({
      url: "https://topdev.vn/detail-jobs/x-1",
      title: "Backend Developer (Node.js)",
      company: "Công ty ABC",
      location: "Hồ Chí Minh",
      remote: false,
      description: "Node.js, PostgreSQL",
      salary: "20000000–35000000 VND/month",
      postedAt: "2026-11-22",
    });
  });

  it("returns null for a page without job data", () => {
    expect(parseJobPostingLd("<html><body>empty</body></html>", "u")).toBeNull();
  });
});

describe("filters", () => {
  it("keeps Vietnam and open remote, drops region-locked remote", () => {
    expect(isTargetLocation({ location: "Hà Nội", remote: false })).toBe(true);
    expect(isTargetLocation({ location: "Remote (worldwide)", remote: true })).toBe(true);
    expect(isTargetLocation({ location: "USA Only", remote: true })).toBe(false);
    expect(isTargetLocation({ location: "Singapore", remote: false })).toBe(false);
  });

  it("keeps technical jobs only", () => {
    expect(isTechJob({ title: "Backend Engineer", description: "Java, Spring Boot" })).toBe(true);
    expect(isTechJob({ title: "Account Executive", description: "Sales targets, CRM" })).toBe(false);
    expect(isTechJob({ title: "Kỹ sư phần mềm", description: "Python, Django" })).toBe(true);
    expect(isTechJob({ title: "FullStack Developer - Khối Công nghệ", description: "Mô tả ngắn" })).toBe(true);
    expect(isTechJob({ title: "Equipment Technician, Operations Engineering", description: "" })).toBe(false);
    expect(isTechJob({ title: "Pre-sale (Network Security) Engineer", description: "" })).toBe(false);
  });
});
