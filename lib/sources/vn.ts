// Vietnamese IT boards. Each publishes schema.org JobPosting JSON-LD on its job pages; pages are found
// through the board's search page or sitemap. Rules per source (robots, pacing, terms): docs/sources.md.
import { getGzipText, getText } from "../http";
import { htmlToText, type RawJob } from "../jobs";
import { splitSections } from "../sections";

type Ld = Record<string, unknown>;

function* walk(node: unknown): Generator<Ld> {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === "object") {
    yield node as Ld;
    if ("@graph" in node) yield* walk((node as Ld)["@graph"]);
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

function salaryText(base: unknown): string | null {
  if (!base || typeof base !== "object") return null;
  const b = base as Ld;
  const v = (b.value ?? {}) as Ld;
  const min = str(v.minValue);
  const max = str(v.maxValue);
  const one = str(v.value);
  const n = (s: string) => Number(s).toLocaleString("en-US");
  const range = min && max ? `${n(min)}–${n(max)}` : min || max ? n(min || max) : /^\d/.test(one) ? n(one) : "";
  return range ? `${range} ${str(b.currency)}/${str(v.unitText).toLowerCase() || "month"}` : null;
}

/** The first JobPosting in a page's JSON-LD, or null when the page has none. */
export function parseJobPostingLd(html: string, pageUrl: string): RawJob | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const n of walk(data)) {
      if (n["@type"] !== "JobPosting") continue;
      const places = [n.jobLocation].flat().filter(Boolean) as Ld[];
      const location = places
        .map((p) => {
          const a = (p.address ?? {}) as Ld;
          return [str(a.addressLocality), str(a.addressRegion)].filter(Boolean).join(", ");
        })
        .filter(Boolean)
        .join("; ");
      // Some boards put requirements and benefits in their own schema fields; add them under headings the
      // detail view understands, unless the description already has that section.
      let description = htmlToText(str(n.description));
      const has = splitSections(description);
      const months = Number(((n.experienceRequirements ?? {}) as Ld).monthsOfExperience);
      const requirements = [str(n.qualifications) && htmlToText(str(n.qualifications)), str(n.skills) && `Skills: ${str(n.skills)}`, months > 0 && `Experience: ${Math.round(months / 12)}+ years`].filter(Boolean);
      if (str(n.responsibilities) && !has.scope) description += `\nResponsibilities\n${htmlToText(str(n.responsibilities))}`;
      if (requirements.length && !has.requirements) description += `\nRequirements\n${requirements.join("\n")}`;
      if (str(n.jobBenefits) && !has.benefits) description += `\nBenefits\n${htmlToText(str(n.jobBenefits))}`;
      return {
        url: pageUrl,
        title: htmlToText(str(n.title)),
        company: str(((n.hiringOrganization ?? {}) as Ld).name),
        location: location || "Việt Nam",
        remote: n.jobLocationType === "TELECOMMUTE",
        description,
        salary: salaryText(n.baseSalary),
        postedAt: str(n.datePosted) || null,
      };
    }
  }
  return null;
}

const idOf = (url: string) => Number(url.match(/(\d+)(?:\.html)?\/?$/)?.[1] ?? 0);
const newestFirst = (urls: Iterable<string>) => [...new Set(urls)].sort((a, b) => idOf(b) - idOf(a));

/**
 * Reads job pages in the given order; stops after `maxEmpty` pages in a row without job data (a board throttling us).
 * A page that fails (often a job removed after the sitemap was written) counts as empty instead of failing the source.
 */
export async function readPages(
  urls: string[],
  cap: number,
  gapMs: number,
  maxEmpty = 5,
  get = getText,
  enrich: (job: RawJob, html: string) => RawJob = (job) => job,
): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  let empty = 0;
  for (const url of urls.slice(0, cap)) {
    const html = await get(url, { gapMs }).catch(() => "");
    const parsed = parseJobPostingLd(html, url);
    const job = parsed && enrich(parsed, html);
    if (job) {
      jobs.push(job);
      empty = 0;
    } else if (++empty >= maxEmpty) break;
  }
  return jobs;
}

/**
 * TopDev's JSON-LD leaves "Your role & responsibilities" and "Your skills & qualifications" empty; the page shows them.
 * They are read from the page text, between their headings and the numbered next section.
 */
export function topdevSections(html: string): { scope: string; requirements: string } {
  const text = htmlToText(html.replace(/<script[\s\S]*?<\/script>/gi, ""));
  const between = (start: string, end: RegExp) => {
    const i = text.indexOf(start);
    if (i < 0) return "";
    const rest = text.slice(i + start.length);
    const j = rest.search(end);
    return (j < 0 ? rest.slice(0, 3000) : rest.slice(0, j)).trim();
  };
  return {
    scope: between("Your role & responsibilities", /\n\d+\n|Your skills & qualifications/),
    requirements: between("Your skills & qualifications", /\n\d+\n|\nBenefits/),
  };
}

const withTopdevSections = (job: RawJob, html: string): RawJob => {
  const { scope, requirements } = topdevSections(html);
  if (!scope && !requirements) return job;
  return { ...job, description: `Responsibilities\n${scope}\nRequirements\n${requirements}\n${job.description}` };
};

const TOPDEV_KEYWORDS = ["", "nodejs", "java", "python", "php", "react", "golang", "devops", "tester", "mobile", "data"];

/** `extra`: the owner's search keywords, searched first. */
export async function fetchTopDev(extra: string[] = []): Promise<RawJob[]> {
  const urls: string[] = [];
  for (const k of [...extra, ...TOPDEV_KEYWORDS]) {
    const html = await getText(`https://topdev.vn/jobs/search${k ? `?keyword=${encodeURIComponent(k)}` : ""}`, { gapMs: 1500 });
    for (const m of html.matchAll(/detail-jobs\/[a-z0-9-]+-\d+/g)) urls.push(`https://topdev.vn/${m[0]}`);
  }
  return readPages(newestFirst(urls), 80, 1500, 5, getText, withTopdevSections);
}

const VL24H_IT = /^https:\/\/vieclam24h\.vn\/(it-phan-mem|it-phan-cung-mang)\//;

export async function fetchVieclam24h(): Promise<RawJob[]> {
  // The site answers 403 when a request prefers JSON, so every request asks for HTML/XML (getText's default).
  const index = await getText("https://cdn1.vieclam24h.vn/file/sitemap/daily/job-0.xml");
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(-2);
  const urls: string[] = [];
  for (const map of maps) {
    for (const m of (await getText(map)).matchAll(/<loc>([^<]+)<\/loc>/g)) if (VL24H_IT.test(m[1])) urls.push(m[1]);
  }
  return readPages(newestFirst(urls), 60, 1000);
}

const CAREERLINK_IT = /\/tim-viec-lam\/[^/]*(lap-trinh|developer|engineer|ky-su-phan-mem|ky-su-it|devops|tester|kiem-thu|frontend|front-end|backend|back-end|fullstack|full-stack|java|php|python|dot-net|net-developer|reactjs|nodejs|data-engineer|data-analyst|mobile|android|ios|qa-qc|it-)[^/]*\/\d+$/;

export async function fetchCareerLink(): Promise<RawJob[]> {
  // CareerLink started serving empty pages after ~120 requests at 1/s, so it is read slowly and in small batches.
  const index = await getGzipText("https://www.careerlink.vn/sitemaps/sitemap.xml.gz", { gapMs: 2000 });
  const urls: string[] = [];
  for (const m of index.matchAll(/<loc>([^<]+\.xml\.gz)<\/loc>/g)) {
    for (const u of (await getGzipText(m[1], { gapMs: 2000 })).matchAll(/<loc>([^<]+)<\/loc>/g)) if (CAREERLINK_IT.test(u[1])) urls.push(u[1]);
  }
  return readPages(newestFirst(urls), 30, 2000);
}
