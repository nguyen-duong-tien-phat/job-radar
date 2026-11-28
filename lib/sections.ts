import { decodeEntities } from "./jobs";
import { fold } from "./skills";

export type JobSections = { about: string; scope: string; requirements: string; benefits: string };

// A short line starting with one of these words opens a section. Covers English and Vietnamese postings.
const HEADINGS: [keyof Omit<JobSections, "about">, RegExp][] = [
  ["benefits", /^(benefits?|perks|what we offer|why (join|work|bosch|us)|why \w+\?|compensation|quyen loi|phuc loi|che do|dai ngo)/],
  ["requirements", /^(requirements?|qualifications?|your skills|skills|know-?how|experience|educational|nice[- ]to[- ]have|must[- ]have|what we('|’)?re looking for|who you are|about you|yeu cau|ky nang|kinh nghiem)/],
  ["scope", /^(your role|the role|role|responsibilit|key responsibilit|what you('|’)?ll do|job description|description|your mission|day[- ]to[- ]day|mo ta cong viec|nhiem vu|cong viec)/],
];

/** Some boards double-escape their HTML; decode until nothing changes. */
function decodeAll(s: string): string {
  for (let i = 0; i < 3; i++) {
    const next = decodeEntities(s);
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Splits a posting's plain-text description into scope, requirements and benefits by its own headings. */
export function splitSections(description: string): JobSections {
  const out: JobSections = { about: "", scope: "", requirements: "", benefits: "" };
  let current: keyof JobSections = "about";
  for (const raw of decodeAll(description).split("\n")) {
    const line = raw.trim();
    if (!line || /^-\s*$/.test(line)) continue;
    const key = fold(line).replace(/^[-*#\d.)\s]+/, "");
    const heading = line.length <= 60 && !/[.]$/.test(line) ? HEADINGS.find(([, re]) => re.test(key)) : undefined;
    if (heading) {
      current = heading[0];
      continue;
    }
    out[current] += (out[current] ? "\n" : "") + line;
  }
  return out;
}
