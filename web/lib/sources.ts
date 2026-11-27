// Display names and home pages for attribution. Some sources (Remote OK, Arbeitnow) require a
// visible link back. Keys are the `source` slugs stored by the scraper.
export const SOURCE_INFO: Record<string, { name: string; url: string }> = {
  remoteok: { name: "Remote OK", url: "https://remoteok.com" },
  arbeitnow: { name: "Arbeitnow", url: "https://www.arbeitnow.com" },
  weworkremotely: { name: "We Work Remotely", url: "https://weworkremotely.com" },
  hn_hiring: { name: "Hacker News: Who is hiring?", url: "https://news.ycombinator.com" },
  topdev: { name: "TopDev", url: "https://topdev.vn" },
  careerviet: { name: "CareerViet", url: "https://careerviet.vn" },
};

export function sourceInfo(source: string): { name: string; url: string } {
  return SOURCE_INFO[source] ?? { name: source, url: "#" };
}
