// Public applicant-tracking boards: a company's own career page as JSON. No key needed.
import { getJson } from "../http";
import { htmlToText, type RawJob } from "../jobs";

export const ATS = ["greenhouse", "lever", "ashby", "smartrecruiters"] as const;
export type Ats = (typeof ATS)[number];

type Greenhouse = { jobs: { title: string; absolute_url: string; location?: { name?: string }; content?: string; first_published?: string; updated_at?: string; company_name?: string }[] };

export function parseGreenhouse(data: Greenhouse, company: string): RawJob[] {
  return data.jobs.map((j) => {
    const location = j.location?.name ?? "";
    return {
      url: j.absolute_url,
      title: j.title,
      company: j.company_name || company,
      location,
      remote: /remote/i.test(location),
      description: htmlToText(j.content ?? ""),
      postedAt: j.first_published ?? j.updated_at ?? null,
    };
  });
}

type Lever = {
  text: string;
  hostedUrl: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; allLocations?: string[] };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string } | null;
}[];

export function parseLever(data: Lever, company: string): RawJob[] {
  return data.map((j) => {
    const locations = j.categories?.allLocations?.length ? j.categories.allLocations : [j.categories?.location ?? ""];
    const s = j.salaryRange;
    return {
      url: j.hostedUrl,
      title: j.text,
      company,
      location: locations.filter(Boolean).join(", "),
      remote: j.workplaceType === "remote",
      description: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain].filter(Boolean).join("\n"),
      salary: s?.min ? `${s.min}–${s.max ?? ""} ${s.currency ?? ""} ${s.interval ?? ""}`.trim() : null,
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    };
  });
}

type Ashby = {
  jobs: {
    title: string;
    jobUrl: string;
    location?: string;
    secondaryLocations?: { location?: string }[];
    isRemote?: boolean;
    isListed?: boolean;
    descriptionPlain?: string;
    publishedAt?: string;
    compensation?: { compensationTierSummary?: string | null } | null;
  }[];
};

export function parseAshby(data: Ashby, company: string): RawJob[] {
  return data.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => ({
      url: j.jobUrl,
      title: j.title,
      company,
      location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join(", "),
      remote: Boolean(j.isRemote),
      description: j.descriptionPlain ?? "",
      salary: j.compensation?.compensationTierSummary ?? null,
      postedAt: j.publishedAt ?? null,
    }));
}

type SrList = { content: { id: string; name: string; releasedDate?: string; location?: { fullLocation?: string; city?: string; remote?: boolean }; company?: { identifier?: string; name?: string }; ref: string }[] };
type SrDetail = { jobAd?: { sections?: Record<string, { text?: string } | undefined> } };

export function parseSmartRecruiters(list: SrList, details: Map<string, SrDetail>, slug: string, company: string): RawJob[] {
  return list.content.map((j) => {
    const sections = details.get(j.id)?.jobAd?.sections ?? {};
    return {
      url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
      title: j.name,
      company: j.company?.name || company,
      location: j.location?.fullLocation ?? j.location?.city ?? "",
      remote: Boolean(j.location?.remote),
      description: Object.values(sections)
        .map((s) => htmlToText(s?.text ?? ""))
        .filter(Boolean)
        .join("\n"),
      postedAt: j.releasedDate ?? null,
    };
  });
}

const TECHY = /engineer|developer|software|devops|data|test|qa|architect|cloud|security|embedded|firmware|frontend|backend|full ?stack|mobile|ai|ml/i;
// shortcut: SmartRecruiters lists have no description, so details are fetched only for technical-looking titles, at most 40 a run.
const SR_DETAIL_CAP = 40;

export async function fetchAts(ats: Ats, slug: string, company: string): Promise<RawJob[]> {
  const s = encodeURIComponent(slug);
  switch (ats) {
    case "greenhouse":
      return parseGreenhouse(await getJson<Greenhouse>(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`), company);
    case "lever":
      return parseLever(await getJson<Lever>(`https://api.lever.co/v0/postings/${s}?mode=json`), company);
    case "ashby":
      return parseAshby(await getJson<Ashby>(`https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`), company);
    case "smartrecruiters": {
      // Vietnam only: big SmartRecruiters companies list thousands of jobs worldwide.
      const list = await getJson<SrList>(`https://api.smartrecruiters.com/v1/companies/${s}/postings?country=vn&limit=100`);
      list.content = list.content.filter((j) => TECHY.test(j.name));
      const details = new Map<string, SrDetail>();
      list.content = list.content.slice(0, SR_DETAIL_CAP);
      for (const j of list.content) {
        // A posting withdrawn between the list and its detail call is skipped, not fatal.
        const detail = await getJson<SrDetail>(j.ref).catch(() => null);
        if (detail) details.set(j.id, detail);
      }
      list.content = list.content.filter((j) => details.has(j.id));
      return parseSmartRecruiters(list, details, slug, company);
    }
  }
}

/** Companies known at first run; the daily web search adds more to the `companies` table. */
export const SEED_COMPANIES: { ats: Ats; slug: string; name: string }[] = [
  { ats: "greenhouse", slug: "workatbackbase", name: "Backbase" },
  { ats: "lever", slug: "keyloop", name: "Keyloop" },
  { ats: "lever", slug: "gradion", name: "Gradion" },
  { ats: "smartrecruiters", slug: "BoschGroup", name: "Bosch" },
];
