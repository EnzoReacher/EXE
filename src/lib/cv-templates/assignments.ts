import type { CVLine } from ".";
import { sectionLabel } from "./structure";

export const assignmentKinds = ["name", "role", "contact", "heading", "entry", "date", "context", "bullet", "text", "continuation"] as const;
export type AssignmentKind = typeof assignmentKinds[number];
export type Assignment = { line: number; kind: AssignmentKind; section: string; entry: number | null };
export type CVStructure = { version: 1; sourceDocument: string; sections: string[]; rows: Assignment[] };
export const standardSections = ["Summary", "Skills", "Education", "Experience / Activities", "Projects", "Research / Awards", "Languages", "Additional information"];
export const contactLine = (text: string) => /@|https?:\/\/|www\.|^(?:email|phone|tel|location|address|địa chỉ|điện thoại)\s*:/iu.test(text) || /^\s*\+?\d[\d ().-]{7,}\s*$/u.test(text);
export const datePrefix = String.raw`(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(?:\d{1,2},?\s+)?|\d{1,2}[/.])?(?:19|20)\d{2}\b`;
export const standaloneDate = (text: string) => new RegExp(`^${datePrefix}(?:\\s*[-–—]\\s*(?:${datePrefix}|present|current|nay))?(?:\\s*\\([^()\\n]*\\))?$`, "iu").test(text.trim());
const header = (kind: string) => ["name", "role", "contact"].includes(kind);

// Only explicit heading/contact/bullet/inline-date evidence is preassigned.
// No semantic guess about skills, names midway down, bullets or detached dates.
export function proposeStructure(text: string): CVStructure {
  let section = "Additional information", inHeader = true, named = false, role = false;
  const sections: string[] = [];
  const rows: Assignment[] = [];
  text.split("\n").forEach((value, line) => {
    if (!value.trim()) return;
    let kind: AssignmentKind = "text";
    const label = sectionLabel(value);
    if (label) { section = value.trim(); inHeader = false; kind = "heading"; }
    else if (contactLine(value)) kind = "contact";
    else if (inHeader && !named) { named = true; kind = "name"; }
    else if (inHeader && !role) { role = true; kind = "role"; }
    else if (/^\s*[-*•‣–]\s+/u.test(value)) kind = "bullet";
    else if (standaloneDate(value)) kind = "date";
    else if (new RegExp(`(?:\\t|\\s\\|\\s| {2,})(?=${datePrefix})`, "iu").test(value)) kind = "entry";
    if (!header(kind) && !sections.includes(section)) sections.push(section);
    rows.push({ line, kind, section: header(kind) ? "" : section, entry: null });
  });
  return { version: 1, sourceDocument: text, sections, rows };
}

export function parseStructure(value: unknown, text: string): CVStructure {
  const fail = (): never => { throw new Error("Check structure assignments: every source line must be retained, with dates linked to an activity in the same section."); };
  if (!value || typeof value !== "object") return fail();
  const s = value as CVStructure;
  if (s.version !== 1 || s.sourceDocument !== text || !Array.isArray(s.sections) || s.sections.length > 100 || !Array.isArray(s.rows) || s.rows.length > 500) return fail();
  const sections = s.sections.map(label => { if (typeof label !== "string" || !label.trim() || label.length > 100 || /[\r\n]/u.test(label)) return fail(); return label; });
  if (new Set(sections).size !== sections.length) return fail();
  const source = text.split("\n"); const needed = source.flatMap((line, index) => line.trim() ? [index] : []);
  const seen = new Set<number>();
  const rows = s.rows.map(r => {
    if (!r || !Number.isInteger(r.line) || !needed.includes(r.line) || seen.has(r.line) || !assignmentKinds.includes(r.kind) || typeof r.section !== "string" || !(r.entry === null || Number.isInteger(r.entry))) return fail();
    seen.add(r.line);
    if (header(r.kind) ? r.section !== "" || r.entry !== null : !sections.includes(r.section)) return fail();
    // Only recognized source labels may be suppressed as replaced section labels.
    // An uppercase name/title or factual sentence cannot be discarded this way.
    if (r.kind === "heading" && (!sectionLabel(source[r.line]) || r.entry !== null)) return fail();
    if (r.kind === "entry" && r.entry !== null) return fail();
    return { line: r.line, kind: r.kind, section: r.section, entry: r.entry };
  });
  if (seen.size !== needed.length || rows.filter(r => r.kind === "name").length > 1 || rows.filter(r => r.kind === "role").length > 1) return fail();
  for (const r of rows) {
    if (["date", "continuation"].includes(r.kind) && r.entry === null) return fail();
    if (r.entry !== null) {
      const target = rows.find(t => t.line === r.entry && t.section === r.section && (r.kind === "continuation" ? ["entry", "bullet", "context", "text"].includes(t.kind) : t.kind === "entry"));
      if (!target || !["date", "bullet", "context", "text", "continuation"].includes(r.kind) || r.line === r.entry) return fail();
      if (r.kind === "date" && rows.filter(t => t.kind === "date" && t.entry === r.entry).length > 1) return fail();
    }
  }
  return { version: 1, sourceDocument: text, sections, rows };
}

export function assignedLayout(text: string, value: CVStructure): CVLine[] {
  const s = parseStructure(value, text), source = text.split("\n"), output: CVLine[] = [];
  const textFor = (r: Assignment) => [source[r.line], ...s.rows.filter(c => c.kind === "continuation" && c.entry === r.line).map(c => source[c.line])].join(" ");
  const emit = (r: Assignment) => { const value = textFor(r); output.push({ kind: r.kind as CVLine["kind"], text: r.kind === "bullet" && !/^\s*[-*•‣–]\s+/u.test(value) ? "• " + value : value }); };
  for (const kind of ["name", "role", "contact"]) s.rows.filter(r => r.kind === kind).forEach(emit);
  for (const section of s.sections) {
    const content = s.rows.filter(r => r.section === section && r.kind !== "heading" && r.kind !== "continuation");
    if (!content.length) continue;
    output.push({ kind: "section", text: section });
    for (const r of content.filter(r => r.entry === null)) {
      if (r.kind !== "entry") { emit(r); continue; }
      const date = content.find(d => d.kind === "date" && d.entry === r.line);
      const line = textFor(r);
      // Explicit user-confirmed pairing, never nearest-neighbour date inference.
      const inline = new RegExp(`(?:\\s+\\|\\s+|\\t+| {2,})(?=${datePrefix})`, "iu").exec(line);
      output.push(date ? { kind: "entry", text: line + "\t" + source[date.line], dateAt: line.length } : { kind: "entry", text: line, ...(inline ? { dateAt: inline.index } : {}) });
      content.filter(c => c.entry === r.line && c.kind !== "date").forEach(emit);
    }
  }
  return output;
}
