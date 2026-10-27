import { record, str } from "@/lib/cv-review/domain";
import { input, parseScan, type Scan } from "./domain";
import { getTemplate, type TemplateId } from "@/lib/cv-templates";
import { parseStructure, type CVStructure } from "@/lib/cv-templates/assignments";
import { parseStructuredCV, structuredText, type StructuredCV } from "./structured-cv";
export type Snapshot = { schemaVersion: 2; templateId?: TemplateId; structure?: CVStructure; structuredCV?: StructuredCV; cv: string; jd: string; scan: Scan; instructions: string; language: "English" | "Vietnamese"; document: string; changes: string[]; notes: string[]; title: string };
export function parseSnapshot(value: unknown): Snapshot {
  const b = record(value); if (b.schemaVersion !== 2) throw new Error("This saved CV format is not supported.");
  const source = input(b); const scan = parseScan(b.scan, source);
  if (b.language !== "English" && b.language !== "Vietnamese") throw new Error("Invalid output language.");
  const strings = (v: unknown) => { if (!Array.isArray(v) || v.length > 8) throw new Error("Invalid saved details."); return v.map(s => str(s, 700)); };
  const document = str(b.document, 24000);
  const structuredCV = b.structuredCV === undefined ? undefined : parseStructuredCV(b.structuredCV);
  if (structuredCV && (structuredText(structuredCV) !== document || b.structure !== undefined)) throw new Error("Saved structured CV and document disagree.");
  return { schemaVersion: 2, templateId: getTemplate(b.templateId).id, ...(structuredCV ? { structuredCV } : {}), ...(b.structure !== undefined ? { structure: parseStructure(b.structure, document) } : {}), ...source, scan, instructions: str(b.instructions, 4000), language: b.language, document, changes: strings(b.changes), notes: strings(b.notes), title: str(b.title, 120) };
}
