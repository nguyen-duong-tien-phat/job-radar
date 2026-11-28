// HTML to plain text for postings. No server-only imports: the browser uses it through lib/sections.

const ACCENT_MARKS: Record<string, string> = { acute: "\u0301", grave: "\u0300", circ: "\u0302", tilde: "\u0303", uml: "\u0308", ring: "\u030a", cedil: "\u0327" };
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", middot: "·",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    // Accented letters (&aacute; &Ecirc; ...): base letter + combining mark.
    const accent = e.match(/^([a-zA-Z])(acute|grave|circ|tilde|uml|ring|cedil)$/);
    if (accent) return (accent[1] + ACCENT_MARKS[accent[2]]).normalize("NFC");
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML (possibly entity-escaped once, as Greenhouse sends it) to plain text with line breaks. */
export function htmlToText(html: string): string {
  let s = html;
  if (/&lt;\w/.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(s)
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
