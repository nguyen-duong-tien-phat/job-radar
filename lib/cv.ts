import { extractSkills, fold } from "./skills";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const ROLES = {
  backend: "Backend",
  frontend: "Frontend",
  fullstack: "Fullstack",
  mobile: "Mobile",
  devops: "DevOps / Cloud",
  data: "Data / AI",
  qa: "QA / Test",
} as const;

export const LOCATIONS = {
  hcm: "TP. Hồ Chí Minh",
  hn: "Hà Nội",
  dn: "Đà Nẵng",
  remote: "Remote",
} as const;

const ROLE_HINTS: Record<keyof typeof ROLES, RegExp> = {
  backend: /back[- ]?end/,
  frontend: /front[- ]?end/,
  fullstack: /full[- ]?stack/,
  mobile: /\b(mobile|android|ios|flutter|react native)\b/,
  devops: /\b(devops|sre|cloud engineer|platform engineer)\b/,
  data: /\b(data (engineer|scientist|analyst)|machine learning|ai engineer)\b/,
  qa: /\b(qa|qc|tester|test engineer|automation test)\b/,
};

const LOCATION_HINTS: Record<keyof typeof LOCATIONS, RegExp> = {
  hcm: /\b(ho chi minh|hcm|hcmc|sai gon|saigon)\b/,
  hn: /\b(ha noi|hanoi)\b/,
  dn: /\b(da nang|danang)\b/,
  remote: /\bremote\b/,
};

/** Returns an error message (shown to the user) or null when the upload is a usable PDF. */
export function checkCvFile(name: string, size: number, head: Uint8Array): string | null {
  if (size === 0) return "No file chosen.";
  if (size > MAX_CV_BYTES) return "The file is larger than 5 MB.";
  const magic = String.fromCharCode(...head.subarray(0, 5));
  if (!name.toLowerCase().endsWith(".pdf") || magic !== "%PDF-") return "PDF files only.";
  return null;
}

export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Largest "N years / N năm" claim, ignoring implausible numbers. */
function yearsOfExperience(t: string): number | null {
  const found = [...t.matchAll(/(\d{1,2})\+?\s*(?:years?|yrs?|nam)\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 40);
  return found.length ? Math.max(...found) : null;
}

export function extractProfile(text: string) {
  const t = fold(text);
  const pick = <K extends string>(hints: Record<K, RegExp>) =>
    (Object.keys(hints) as K[]).filter((k) => hints[k].test(t));
  return {
    skills: extractSkills(text),
    roles: pick(ROLE_HINTS),
    locations: pick(LOCATION_HINTS),
    years: yearsOfExperience(t),
  };
}
