// Remote job boards with public APIs or feeds. Rules per source: docs/sources.md.
import { getJson, getText } from "../http";
import { decodeEntities, htmlToText, type RawJob } from "../jobs";

type RemoteOk = { position?: string; company?: string; url?: string; location?: string; description?: string; date?: string; salary_min?: string | number; salary_max?: string | number }[];

/** RemoteOK's terms: link back to the job on remoteok.com and name "Remote OK" as the source. Job urls point there. */
export function parseRemoteOk(data: RemoteOk): RawJob[] {
  return data
    .filter((j) => j.position && j.url) // the first element is the legal notice
    .map((j) => ({
      url: j.url!,
      title: j.position!,
      company: j.company ?? "",
      location: j.location || "Remote",
      remote: true,
      description: htmlToText(j.description ?? ""),
      salary: Number(j.salary_min) > 0 ? `${j.salary_min}–${j.salary_max} USD/năm` : null,
      postedAt: j.date ?? null,
    }));
}

type Arbeitnow = { data: { title: string; company_name: string; url: string; location: string; remote: boolean; description: string; created_at: number }[] };

export function parseArbeitnow(data: Arbeitnow): RawJob[] {
  return data.data
    .filter((j) => j.remote)
    .map((j) => ({
      url: j.url,
      title: j.title,
      company: j.company_name,
      location: j.location || "Remote",
      remote: true,
      description: htmlToText(j.description),
      postedAt: new Date(j.created_at * 1000).toISOString(),
    }));
}

const tag = (item: string, name: string) => {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "")).trim() : "";
};

/** We Work Remotely RSS: title is "Company: Role", region says where the role is open. */
export function parseWwrRss(xml: string): RawJob[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const [company, ...rest] = tag(item, "title").split(": ");
    return {
      url: tag(item, "link"),
      title: rest.join(": ") || company,
      company: rest.length ? company : "",
      location: tag(item, "region") || "Remote",
      remote: true,
      description: htmlToText(tag(item, "description")),
      postedAt: tag(item, "pubDate") ? new Date(tag(item, "pubDate")).toISOString() : null,
    };
  });
}

type HnItem = { id: number; text?: string | null; created_at?: string; children?: HnItem[] };

/** Top-level comments of "Ask HN: Who is hiring?". The first line is usually "Company | Role | Location | ...". */
export function parseHnThread(thread: HnItem): RawJob[] {
  return (thread.children ?? [])
    .filter((c) => c.text)
    .map((c) => {
      const text = htmlToText(c.text!);
      const header = text.split("\n")[0];
      const parts = header.split("|").map((p) => p.trim());
      return {
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        title: parts[1] || header.slice(0, 120),
        company: parts[0]?.slice(0, 80) ?? "",
        location: parts.slice(2).join(" | "),
        remote: /\bremote\b/i.test(header),
        description: text,
        postedAt: c.created_at ?? null,
      };
    });
}

export async function fetchRemoteOk() {
  return parseRemoteOk(await getJson<RemoteOk>("https://remoteok.com/api"));
}

export async function fetchArbeitnow() {
  return parseArbeitnow(await getJson<Arbeitnow>("https://www.arbeitnow.com/api/job-board-api"));
}

export async function fetchWwr() {
  const feeds = ["remote-programming-jobs", "remote-devops-sysadmin-jobs"];
  const jobs: RawJob[] = [];
  for (const f of feeds) jobs.push(...parseWwrRss(await getText(`https://weworkremotely.com/categories/${f}.rss`, { accept: "application/rss+xml" })));
  return jobs;
}

export async function fetchHn() {
  const search = await getJson<{ hits: { objectID: string; title: string }[] }>(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring",
  );
  const latest = search.hits.find((h) => /who is hiring/i.test(h.title));
  if (!latest) return [];
  return parseHnThread(await getJson<HnItem>(`https://hn.algolia.com/api/v1/items/${latest.objectID}`));
}
