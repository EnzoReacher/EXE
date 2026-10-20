import { record, str } from "@/lib/cv-review/domain";
import { input, parseScan, type Scan } from "./domain";
export type Snapshot = { schemaVersion: 2; cv: string; jd: string; scan: Scan; instructions: string; language: "English" | "Vietnamese"; document: string; changes: string[]; notes: string[]; title: string };
export function parseSnapshot(value: unknown): Snapshot {
  const b = record(value); if (b.schemaVersion !== 2) throw new Error("This saved CV format is not supported.");
  const source = input(b); const scan = parseScan(b.scan, source);
  if (b.language !== "English" && b.language !== "Vietnamese") throw new Error("Invalid output language.");
  const strings = (v: unknown) => { if (!Array.isArray(v) || v.length > 8) throw new Error("Invalid saved details."); return v.map(s => str(s, 700)); };
  return { schemaVersion: 2, ...source, scan, instructions: str(b.instructions, 4000), language: b.language, document: str(b.document, 24000), changes: strings(b.changes), notes: strings(b.notes), title: str(b.title, 120) };
}
