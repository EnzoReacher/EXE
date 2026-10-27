// Presentation only. The editable document remains the sole content source;
// neither the provider contract nor saved facts depend on a template.
import { sectionLabel } from "./structure";
import { assignedLayout, datePrefix, type CVStructure } from "./assignments";
import { structuredLayout, type StructuredCV } from "@/lib/scan-rewrite/structured-cv";
export type CVLine = { kind: "name" | "role" | "contact" | "section" | "entry" | "context" | "bullet" | "text" | "space"; text: string; dateAt?: number };
export type CVTemplate = { id: "classic"; label: string; className: string; css: string; layout: (text: string) => CVLine[] };
const contact = /@|https?:\/\/|www\.|\+?\d[\d ().-]{6,}|^(?:contact|email|phone|location|liên hệ)\s*:/iu;
export function classicLayout(text: string): CVLine[] {
  let header = true; let named = false; let role = false; let currentSection = ""; let previousKind = "";
  const source = text.split("\n");
  return source.filter((line, index) => {
    if (!sectionLabel(line)) return true;
    const next = source.slice(index + 1).find(value => value.trim());
    return !!next && !sectionLabel(next);
  }).map(line => {
    const value = line.trim();
    if (!value) return { kind: "space", text: line };
    if (sectionLabel(value) || (named && value.length < 65 && /[:：]$/u.test(value) && !contact.test(value))) { header = false; currentSection = sectionLabel(value) ?? value; previousKind = "section"; return { kind: "section", text: line }; }
    if (header && contact.test(value)) return { kind: "contact", text: line };
    if (!named && header && !/^\s*[-*•‣–]\s+/u.test(line) && !/\t|[.!?:]/u.test(value)) { named = true; return { kind: "name", text: line }; }
    if (header && !role) { role = true; return { kind: "role", text: line }; }
    if (/^\s*[-*•‣–]\s+/u.test(line)) { previousKind = "bullet"; return { kind: "bullet", text: line }; }
    // Only explicit separators with year/date suffixes get aligned dates. Never
    // infer an employer, role, duration or section from arbitrary prose.
    const date = new RegExp(`(?:\\s+\\|\\s+|\\t+| {2,})(?=${datePrefix})`, "iu").exec(line);
    if (date) { previousKind = "entry"; return { kind: "entry", text: line, dateAt: date.index }; }
    if (/education|experience|activities|projects|employment|học vấn|kinh nghiệm|dự án|hoạt động/u.test(currentSection)) {
      if (previousKind === "section" && !/[.!?]$/u.test(value)) { previousKind = "entry"; return { kind: "entry", text: line }; }
      if (previousKind === "entry" && /\s\|\s/u.test(line)) { previousKind = "context"; return { kind: "context", text: line }; }
      // A short non-sentence after bullets is an explicit entry label, not an
      // inferred qualification. Ambiguous prose remains plain text.
      if (previousKind === "bullet" && value.length < 100 && !/[.!?:|]/u.test(value)) { previousKind = "entry"; return { kind: "entry", text: line }; }
    }
    previousKind = "text";
    return { kind: "text", text: line };
  });
}
export const classicCSS = `
.op-classic{color:#000;background:#fff;font:10pt/1.3 Arial,"Liberation Sans","DejaVu Sans",sans-serif;text-align:left}
.op-classic *{box-sizing:border-box}
.op-classic :is(h1,h2,p){color:inherit;letter-spacing:normal;overflow-wrap:anywhere;white-space:pre-wrap}
.op-classic h1{font:700 22pt/1.15 Arial,"Liberation Sans","DejaVu Sans",sans-serif;text-align:center;margin:0 0 5pt;break-after:avoid}
.op-classic .cv-role{text-align:center;font-size:11.5pt;font-weight:700;margin:0 0 3pt;break-after:avoid}
.op-classic .cv-contact{text-align:center;font-size:9.5pt;line-height:1.3;margin:0 0 2pt;break-after:avoid}
.op-classic h2{font:700 10.5pt/1.3 Arial,"Liberation Sans","DejaVu Sans",sans-serif;text-transform:uppercase;border-bottom:.5pt solid #000;padding:0 0 3pt;margin:13pt 0 6pt;break-after:avoid}
.op-classic p{font-size:inherit;line-height:inherit;margin:0 0 3pt;orphans:2;widows:2}
.op-classic .cv-entry{display:flex;justify-content:space-between;align-items:baseline;gap:12pt;font-weight:700;margin-top:8pt;break-inside:avoid;break-after:avoid}
.op-classic .cv-entry span{min-width:0}
.op-classic .cv-date{font-size:8.5pt;font-style:italic;font-weight:400;flex-shrink:0;max-width:45%;text-align:right}
.op-classic .cv-context{font-style:italic;break-after:avoid}
.op-classic .cv-bullet{padding-left:12pt;text-indent:-10pt;margin-left:0}
.op-classic .cv-space{height:2pt;margin:0}
.op-cv-paper.op-classic{width:210mm;max-width:100%;min-height:297mm;padding:12mm 14mm;border:0;overflow:visible}
@media screen and (max-width:600px){.op-classic{font-size:15px}.op-classic h1{font-size:27px}.op-classic h2{font-size:15px}.op-classic .cv-role{font-size:16px}.op-classic .cv-contact{font-size:13px}.op-classic .cv-entry{flex-wrap:wrap;gap:2px 10px}.op-classic .cv-date{font-size:13px;max-width:100%;text-align:left}}
@media print{.op-classic .cv-space:not(:has(~ :not(.cv-space))){display:none}}
`;
export const templates: Readonly<Record<CVTemplate["id"], CVTemplate>> = {
  classic: { id: "classic", label: "Classic", className: "op-classic", css: classicCSS, layout: classicLayout },
};
export type TemplateId = keyof typeof templates;
export const DEFAULT_TEMPLATE: TemplateId = "classic";
export function getTemplate(id?: unknown): CVTemplate { return id === "classic" ? templates[id] : templates[DEFAULT_TEMPLATE]; }
export const lineTag = (line: CVLine) => line.kind === "name" ? "h1" : line.kind === "section" ? "h2" : "p";
export function documentLayout(text: string, id?: TemplateId, structure?: CVStructure, cv?: StructuredCV) { return cv ? structuredLayout(cv) : structure ? assignedLayout(text, structure) : getTemplate(id).layout(text); }
export function documentText(text: string, id?: TemplateId, structure?: CVStructure, cv?: StructuredCV) { return documentLayout(text, id, structure, cv).map(line => line.text).join("\n"); }
export function emphasisAt(line: CVLine): number | undefined {
  if (line.kind !== "bullet") return;
  const label = /^\s*[-*•‣–]\s+[^:]{1,45}:/u.exec(line.text);
  return label?.[0].length;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function templateHTML(text: string, id?: TemplateId, structure?: CVStructure, cv?: StructuredCV) {
  return documentLayout(text, id, structure, cv).map(line => {
    const tag = lineTag(line);
    const boldAt = emphasisAt(line);
    const content = line.dateAt !== undefined ? `<span>${escape(line.text.slice(0, line.dateAt))}</span><span class="cv-date">${escape(line.text.slice(line.dateAt))}</span>` : boldAt ? `<strong>${escape(line.text.slice(0, boldAt))}</strong>${escape(line.text.slice(boldAt))}` : escape(line.text);
    return `<${tag} class="cv-${line.kind}">${content || "&#160;"}</${tag}>`;
  }).join("");
}
