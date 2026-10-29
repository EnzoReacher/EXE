import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import { CVBody, printDocument } from "@/components/ownpath/cv-document";
import { templateHTML } from "@/lib/cv-templates";
import { checkStructuredRewrite, structuredRewriteSchema } from "./structured-rewrite";
import { parseStructuredCV, parseStructuredResponse, structuredText } from "./structured-cv";
import { performRewrite, rewriteSchemaFor } from "./rewrite-workflow";
import { createClaudeProvider } from "./claude";
import { validateSave } from "@/lib/cv-review/persistence";
import { parseSnapshot } from "./saved";
const base = "NGUYỄN AN\nCommunity coordinator\nperson@example.test\nSummary\nSupported community activities.\nSkills\nRecord keeping\nExperience\nVisitor support\tMarch 16, 2025\nMaintained 20 records.\nMy manager approved payments, not me.";
const entry = (sourceIds: string[], paragraphs: string[], title = "", date = "") => ({ title, context: "", date, paragraphs, bullets: [] as string[], sourceIds });
const wire = () => ({ header: { nameSourceId: "b1", titleSourceId: "b2", contactSourceIds: ["b3"] }, sections: [
  { heading: "Summary", entries: [entry(["b5"], ["Supported community activities."])] },
  { heading: "Skills", entries: [entry(["b7"], ["Record keeping"])] },
  { heading: "Experience / Activities", entries: [{ ...entry(["b9", "b10", "b11"], ["My manager approved payments, not me."], "Visitor support", "March 16, 2025"), bullets: ["Maintained 20 records."] }] },
] });
const payload = { cv: base, jd: "Record keeping required.", scanCV: base, scanJD: "Record keeping required.", scan: { coverage: "Controlled source Scan.", findings: [] }, base, instructions: "Use clear wording. Make me senior.", language: "English", consent: true };
it("dispatches a whole-CV schema through controlled native Claude once, preserving local private header values", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(wire()) }] }));
  const result = await performRewrite(payload, createClaudeProvider({ key: "synthetic-only", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4318" }, request), new AbortController().signal);
  expect(request).toHaveBeenCalledOnce(); const sent = JSON.parse(request.mock.calls[0][1].body);
  expect(sent.output_config.format.schema).toEqual(rewriteSchemaFor(base));
  expect(structuredRewriteSchema).not.toEqual(rewriteSchemaFor(base));
  expect(Object.keys(sent.output_config.format.schema.properties)).toEqual(["header", "sections"]);
  expect(JSON.stringify(sent.output_config.format.schema)).not.toMatch(/replacements|original|pattern|maxLength|minLength|maxItems/);
  expect(sent.messages[0].content).not.toContain("person@example.test"); expect(sent.system).toContain("COMPLETE CV");
  expect(result.cv.header).toEqual({ name: "NGUYỄN AN", title: "Community coordinator", contacts: ["person@example.test"] });
  expect(result.document).toBe(structuredText(result.cv)); expect(result).not.toHaveProperty("replacements");
  expect(parseStructuredResponse(JSON.parse(JSON.stringify(result)))).toMatchObject({ cv: result.cv, document: result.document });
});
it("uses the same structure for preview, PDF HTML and persisted/reopened text without assigning source lines", () => {
  const cv = checkStructuredRewrite(wire(), base), document = structuredText(cv);
  expect(renderToStaticMarkup(<CVBody text={document} structuredCV={cv} />)).toBe(templateHTML(document, undefined, undefined, cv));
  expect(printDocument(document, undefined, undefined, cv)).toContain(templateHTML(document, undefined, undefined, cv));
  const saved = validateSave({ id: "11111111-1111-4111-8111-111111111111", kind: "version", payload: { schemaVersion: 2, templateId: "classic", cv: base, jd: payload.jd, scan: payload.scan, document, structuredCV: cv, instructions: payload.instructions, language: "English", changes: [], notes: [], title: "Existing edited CV" } }).payload;
  const reopened = parseSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(reopened.structuredCV).toEqual(cv); expect(reopened.document).toBe(document); expect(saved.finalDocument).toBe(document); expect(reopened.structure).toBeUndefined();
});
it.each(["invented date", "invented title", "missing number", "invented number", "lost negation", "invented qualification", "private body reference", "unknown reference", "missing fact", "invented heading", "technical heading", "old plan", "model originals"])("rejects unsafe complete output: %s", kind => {
  const value = wire(); const e = value.sections[2].entries[0];
  if (kind === "invented date") e.date = "March 16, 2026";
  if (kind === "invented title") e.title = "Senior manager";
  if (kind === "missing number") e.bullets = ["Maintained records."];
  if (kind === "invented number") e.bullets = ["Maintained 200 records."];
  if (kind === "lost negation") e.paragraphs = ["I approved payments."];
  if (kind === "invented qualification") e.bullets.push("Certified manager.");
  if (kind === "private body reference") e.sourceIds.push("b3");
  if (kind === "unknown reference") e.sourceIds.push("b999");
  if (kind === "missing fact") value.sections.pop();
  if (kind === "invented heading") value.sections[1].heading = "MBA";
  if (kind === "technical heading") value.sections[1].heading = "Technical Skills";
  const bad = kind === "old plan" ? { replacements: [] } : kind === "model originals" ? { ...value, original: base } : value;
  expect(() => checkStructuredRewrite(bad, base)).toThrow();
});
it("rejects a guessed date association when the source contains no column/inline binding", () => {
  expect(() => checkStructuredRewrite(wire(), base.replace("Visitor support\t", "Visitor support "))).toThrow(expect.objectContaining({ fieldPath: "sections[2].entries[0].date" }));
});
it("repairs research fragmentation before canonical rendering and retains an official award name", () => {
  const source = 'Fictional Applicant\nResearch and Awards\nLed a research team and co-authored “A Study of Synthetic Records”.\nCommunity Research Award — First Prize';
  const value = { header: { nameSourceId: 'b1', titleSourceId: '', contactSourceIds: [] }, sections: [{ heading: 'Research and Awards', entries: [{ title: '', context: '', date: '', paragraphs: [], bullets: ['Led a research team and co-authored', '“A Study of Synthetic Records”', '.', 'Community Research Award — First Prize'], sourceIds: ['b3','b4'] }] }] };
  const cv = checkStructuredRewrite(value, source);
  expect(cv.sections[0].entries[0].bullets).toEqual(['Led a research team and co-authored “A Study of Synthetic Records”.', 'Community Research Award — First Prize']);
  expect(structuredText(cv)).not.toContain('\n• .');
  value.sections[0].entries[0].bullets = ['Led a research team and co-authored', 'An unrelated study', '.'];
  expect(() => checkStructuredRewrite(value, source)).toThrow();
});
it("accepts an explicitly source-labelled technical section without requiring a fixed technology vocabulary", () => {
  const technical = base.replace("\nSkills\nRecord keeping", "\nTechnical Skills\nRust / C++");
  const value = wire(); value.sections[1].heading = "Technical Skills"; value.sections[1].entries[0].paragraphs = ["Rust / C++"];
  expect(checkStructuredRewrite(value, technical).sections[1].heading).toBe("Technical Skills");
});
it("keeps legacy snapshots readable, and rejects inconsistent structured snapshots", () => {
  const old = { schemaVersion: 2, cv: base, jd: payload.jd, scan: payload.scan, document: base, instructions: "Keep facts.", language: "English", changes: [], notes: [], title: "Old saved CV" };
  expect(parseSnapshot(old).document).toBe(base);
  expect(() => parseSnapshot({ ...old, structuredCV: checkStructuredRewrite(wire(), base) })).toThrow(/disagree/);
});
it("preserves unknown meaningful source sections; omits empty fields and sections without fabricated defaults", () => {
  const cv = parseStructuredCV({ version: 1, header: { name: "", title: "", contacts: [] }, sections: [{ heading: "Meaningful source section", entries: [ { title: "", context: "", date: "", paragraphs: ["Retained source text."], bullets: [] } ] }, { heading: "Empty", entries: [] }] });
  const text = structuredText(cv); expect(text).toBe("Meaningful source section\nRetained source text."); expect(text).not.toContain("Empty");
});
it("refuses over-limit complete documents rather than truncating or shrinking away content", () => {
  const e = { title: "", context: "", date: "", paragraphs: Array(5).fill("x".repeat(5000)), bullets: [] };
  expect(() => parseStructuredCV({ version: 1, header: { name: "", title: "", contacts: [] }, sections: [{ heading: "Summary", entries: [e] }] })).toThrow(expect.objectContaining({ fieldPath: "document", constraint: "max_length" }));
});

it("offers exact source titles without tab-bound dates or private contacts and keeps title grounding strict", () => {
  const schema = rewriteSchemaFor(base) as unknown as {properties:{sections:{items:{properties:{entries:{items:{properties:{title:{enum:string[]}}}}}}}}};
  const titles = schema.properties.sections.items.properties.entries.items.properties.title.enum;
  expect(titles).toContain("");
  expect(titles).toContain("Visitor support");
  expect(titles).not.toContain("Visitor support\\tMarch 16, 2025");
  expect(titles).not.toContain("person@example.test");
  expect(titles).not.toContain("Senior manager");
  const value = wire(); value.sections[2].entries[0].title = "Visitor assistance";
  expect(() => checkStructuredRewrite(value, base)).toThrow(expect.objectContaining({fieldPath:"sections[2].entries[0].title"}));
  expect(checkStructuredRewrite(wire(), base).sections[2].entries[0].title).toBe("Visitor support");
});
