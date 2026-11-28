import { describe, expect, it } from "vitest";
import { htmlToText, isTargetLocation, isTechJob } from "../jobs";
import { parseAshby, parseGreenhouse, parseLever, parseSmartRecruiters } from "./ats";
import { parseArbeitnow, parseHnThread, parseRemoteOk, parseWwrRss } from "./remote";
import { parseJobPostingLd, readPages, topdevSections } from "./vn";

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
    expect(jobs[0]).toMatchObject({ remote: true, location: "Remote", salary: "50,000–90,000 USD/yr" });
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

  it("hn does not read 'no remote' as remote", () => {
    const [j] = parseHnThread({ id: 1, children: [{ id: 8, text: "Acme | Engineer | SF, ONSITE, no remote", children: [] }] });
    expect(j.remote).toBe(false);
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
      salary: "20,000,000–35,000,000 VND/month",
      postedAt: "2026-11-22",
    });
  });

  it("adds skills, experience and benefits from their own schema fields", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"AI Engineer","description":"<p>Build models</p>","skills":"Python, NLP","experienceRequirements":{"monthsOfExperience":24},"jobBenefits":"<ul><li>13th month</li></ul>","hiringOrganization":{"name":"X"}}</script>`;
    expect(parseJobPostingLd(html, "u")?.description).toBe("Build models\nRequirements\nSkills: Python, NLP\nExperience: 2+ years\nBenefits\n- 13th month");
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
    expect(isTechJob({ title: "Kỹ sư điện toán đám mây", description: "" })).toBe(true);
    expect(isTechJob({ title: "Kỹ sư điện", description: "" })).toBe(false);
  });
});

describe("readPages", () => {
  const ld = '<script type="application/ld+json">{"@type":"JobPosting","title":"Dev","hiringOrganization":{"name":"X"}}</script>';

  it("skips a failing page and stops after a run of empty pages", async () => {
    const pages: Record<string, string> = { a: ld, c: ld };
    const asked: string[] = [];
    const get = async (url: string) => {
      asked.push(url);
      if (url === "b") throw new Error("HTTP 404");
      return pages[url] ?? "<html></html>";
    };
    const jobs = await readPages(["a", "b", "c", "d", "e", "f", "g", "h", "i"], 50, 0, 3, get);
    expect(jobs.map((j) => j.url)).toEqual(["a", "c"]);
    expect(asked).toEqual(["a", "b", "c", "d", "e", "f"]); // d, e, f empty: stop
  });
});

describe("topdevSections", () => {
  it("reads role and skills from the page between the numbered sections", () => {
    const html = `<div><h2>Your role & responsibilities</h2><ul><li>Build APIs</li><li>Review code</li></ul></div><div>2</div><div><h2>Your skills & qualifications</h2><ul><li>PHP</li></ul></div><div>3</div><div><h2>Benefits</h2><ul><li>Laptop</li></ul></div>`;
    expect(topdevSections(html)).toEqual({ scope: "- Build APIs\n- Review code", requirements: "- PHP" });
  });

  it("returns empty sections when the page has none", () => {
    expect(topdevSections("<p>Nothing</p>")).toEqual({ scope: "", requirements: "" });
  });
});
