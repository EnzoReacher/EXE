// Shared public document format. No provider, Auth, transport or accounting here.
import type { CVLine } from "@/lib/cv-templates";
import { responseList, responseObject, responseText } from "./domain";
export type CVEntry = { title: string; context: string; date: string; paragraphs: string[]; bullets: string[] };
export type StructuredCV = { version: 1; header: { name: string; title: string; contacts: string[] }; sections: { heading: string; entries: CVEntry[] }[] };
const text = (path: string, value: unknown, max = 6000) => responseText(path, value, max, true);
export function parseCVEntry(value: unknown, path: string): CVEntry {
  const e = responseObject(path, value, ["title", "context", "date", "paragraphs", "bullets"]);
  const list = (key: "paragraphs" | "bullets") => responseList(`${path}.${key}`, e[key], 100).map((v, i) => responseText(`${path}.${key}[${i}]`, v, 6000));
  return { title: text(`${path}.title`, e.title, 500), context: text(`${path}.context`, e.context, 500), date: text(`${path}.date`, e.date, 160), paragraphs: list("paragraphs"), bullets: list("bullets") };
}
export function parseStructuredCV(value: unknown): StructuredCV {
  const cv = responseObject("cv", value, ["version", "header", "sections"]);
  if (cv.version !== 1) throw new Error("Unsupported structured CV version.");
  const h = responseObject("cv.header", cv.header, ["name", "title", "contacts"]);
  const result: StructuredCV = { version: 1, header: { name: text("cv.header.name", h.name, 300), title: text("cv.header.title", h.title, 500), contacts: responseList("cv.header.contacts", h.contacts, 20).map((v, i) => responseText(`cv.header.contacts[${i}]`, v, 500)) }, sections: responseList("cv.sections", cv.sections, 40).map((value, index) => {
    const path = `cv.sections[${index}]`, section = responseObject(path, value, ["heading", "entries"]);
    return { heading: responseText(`${path}.heading`, section.heading, 100), entries: responseList(`${path}.entries`, section.entries, 100).map((entry, i) => parseCVEntry(entry, `${path}.entries[${i}]`)) };
  }) };
  const output = structuredText(result);
  responseText("document", output, 24000);
  responseList("document.lines", structuredLayout(result), 500);
  return result;
}
export function structuredLayout(cv: StructuredCV): CVLine[] {
  const lines: CVLine[] = [];
  if (cv.header.name.trim()) lines.push({ kind: "name", text: cv.header.name });
  if (cv.header.title.trim()) lines.push({ kind: "role", text: cv.header.title });
  cv.header.contacts.filter(v => v.trim()).forEach(text => lines.push({ kind: "contact", text }));
  for (const section of cv.sections) {
    const body: CVLine[] = [];
    for (const e of section.entries) {
      if (e.title.trim()) body.push({ kind: "entry", text: e.title + (e.date.trim() ? "\t" + e.date : ""), ...(e.date.trim() ? { dateAt: e.title.length } : {}) });
      else if (e.date.trim()) body.push({ kind: "text", text: e.date });
      if (e.context.trim()) body.push({ kind: "context", text: e.context });
      e.paragraphs.filter(v => v.trim()).forEach(text => body.push({ kind: "text", text }));
      e.bullets.filter(v => v.trim()).forEach(text => body.push({ kind: "bullet", text: /^\s*[-*•‣–]\s+/u.test(text) ? text : "• " + text }));
    }
    if (body.length) lines.push({ kind: "section", text: section.heading }, ...body);
  }
  return lines;
}
export function structuredText(cv: StructuredCV) { return structuredLayout(cv).map(line => line.text).join("\n"); }
export function parseStructuredResponse(value: unknown) {
  const r = responseObject("$", value, ["format", "cv", "document", "changes", "notes"]);
  if (r.format !== "structured-cv-v1") throw new Error("Unsupported Rewrite response.");
  const cv = parseStructuredCV(r.cv), document = structuredText(cv);
  if (r.document !== document) throw new Error("Structured CV and document do not match.");
  const strings = (key: string) => responseList(key, r[key], 8).map((v, i) => responseText(`${key}[${i}]`, v, 700));
  return { cv, document, changes: strings("changes"), notes: strings("notes") };
}
