// @vitest-environment jsdom
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CVBody, printDocument } from "@/components/ownpath/cv-document";
import { parseSnapshot } from "@/lib/scan-rewrite/saved";
import { validateSave } from "@/lib/cv-review/persistence";
import { assignedLayout, parseStructure, proposeStructure, standaloneDate } from "./assignments";
import { classicLayout, documentText, templateHTML } from ".";
const text = "CONTACT\nSKILLS\nLANGUAGES\nperson@example.test\nRecord keeping\nVietnamese\nNGUYỄN AN\nCOMMUNITY ASSISTANT\nABOUT ME\nVisitor support activity\nMaintained accurate\nvisitor records.\nI enjoy community work.\nMarch 16, 2025";
function corrected() {
  const s = proposeStructure(text); s.sections = ["Summary", "Skills", "Experience / Activities", "Languages", "CONTACT", "ABOUT ME", "SKILLS", "LANGUAGES"];
  const assign = (line: number, kind: typeof s.rows[number]["kind"], section: string, entry: number | null = null) => Object.assign(s.rows.find(r => r.line === line)!, { kind, section, entry });
  assign(3, "contact", ""); assign(4, "text", "Skills"); assign(5, "text", "Languages"); assign(6, "name", ""); assign(7, "role", ""); assign(9, "entry", "Experience / Activities"); assign(10, "bullet", "Experience / Activities", 9); assign(11, "continuation", "Experience / Activities", 10); assign(12, "text", "Summary"); assign(13, "date", "Experience / Activities", 9);
  return s;
}
it("retains every factual line while separating header/sections and confirmed activity dates", () => {
  const s = corrected(), output = documentText(text, undefined, s);
  expect(output).toBe("NGUYỄN AN\nCOMMUNITY ASSISTANT\nperson@example.test\nSummary\nI enjoy community work.\nSkills\nRecord keeping\nExperience / Activities\nVisitor support activity\tMarch 16, 2025\n• Maintained accurate visitor records.\nLanguages\nVietnamese");
  expect(s.sourceDocument).toBe(text);
  expect(renderToStaticMarkup(<CVBody text={text} structure={s} />)).toBe(templateHTML(text, undefined, s));
  expect(printDocument(text, undefined, s)).toContain(templateHTML(text, undefined, s));
  const entry = assignedLayout(text, s).find(r => r.kind === "entry")!;
  expect(entry.text.slice(entry.dateAt)).toBe("\tMarch 16, 2025");
});
it("persists assignments without rewriting the original document or requiring another Scan", () => {
  const payload = { schemaVersion: 2, cv: text, jd: "Records.", scan: { findings: [], coverage: "Retained Scan." }, document: text, instructions: "Keep facts.", language: "English", changes: [], notes: [], title: "Existing CV", structure: corrected() };
  const saved = validateSave({ kind: "version", id: "11111111-1111-4111-8111-111111111111", payload }).payload;
  const reopened = parseSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(reopened.document).toBe(text); expect(reopened.scan).toEqual(payload.scan);
  expect(reopened.structure).toEqual(payload.structure);
  expect(saved.finalDocument).toBe(documentText(text, undefined, reopened.structure));
});
it("does not classify arbitrary uppercase names/titles as section headings", () => {
  const rows = classicLayout(text);
  expect(rows.find(r => r.text === "NGUYỄN AN")?.kind).toBe("text");
  expect(rows.find(r => r.text === "COMMUNITY ASSISTANT")?.kind).toBe("text");
  expect(rows.find(r => r.text === "ABOUT ME")?.kind).toBe("section");
});
it.each(["March 16, 2025", "January 2024", "June 21, 2024", "August 2024", "2020 – 2024"])("recognizes explicit detached date, never its association: %s", date => {
  expect(standaloneDate(date)).toBe(true);
  const s = proposeStructure("EXPERIENCE\nActivity\n" + date);
  expect(s.rows.at(-1)).toMatchObject({ kind: "date", entry: null });
  expect(() => parseStructure(s, s.sourceDocument)).toThrow();
});
it("automatically assigns explicit contacts even beneath a misleading Languages heading", () => {
  expect(proposeStructure(text).rows.find(r => r.line === 3)).toMatchObject({ kind: "contact", section: "" });
});
it.each(["missing", "duplicate", "stale", "wrong-section", "unpaired", "factual-heading", "continuation-cycle", "duplicate-name"])("rejects unsafe structure: %s", mode => {
  const s = corrected();
  if (mode === "missing") s.rows.pop();
  if (mode === "duplicate") s.rows.push(s.rows[3]);
  if (mode === "stale") s.sourceDocument += " changed";
  if (mode === "wrong-section") s.rows[13].section = "Languages";
  if (mode === "unpaired") s.rows[13].entry = null;
  if (mode === "factual-heading") s.rows[7] = { ...s.rows[7], kind: "heading", section: "Skills" };
  if (mode === "continuation-cycle") s.rows[10] = { ...s.rows[10], kind: "continuation", entry: 11 };
  if (mode === "duplicate-name") s.rows[7] = { ...s.rows[7], kind: "name", section: "" };
  expect(() => parseStructure(s, text)).toThrow();
});
