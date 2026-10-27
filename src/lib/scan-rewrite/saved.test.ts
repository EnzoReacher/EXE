import { expect, it } from "vitest";
import { parseSnapshot } from "./saved";
import { validateSave } from "@/lib/cv-review/persistence";
const payload = { schemaVersion: 2, cv: "Nguyễn An\nHelped customers.", jd: "Customer service required.", scan: { coverage: "Selected requirements only.", findings: [] }, instructions: "Concise", language: "English", document: "Nguyễn An\nAssisted customers.", changes: ["Clearer wording"], notes: [], title: "Fictional CV" };
it("round-trips the complete versioned snapshot and takes final text from the edited document", () => {
  const parsed = parseSnapshot(payload); expect(parsed).toEqual({ ...payload, templateId: "classic" });
  const saved = validateSave({ id: "22222222-2222-4222-8222-222222222222", kind: "version", payload: { ...payload, finalDocument: "forged" } });
  expect(saved.payload).toEqual({ ...payload, templateId: "classic", finalDocument: payload.document });
});
it("rejects unknown versions, malformed nested findings and version payloads in the legacy profile table", () => {
  for (const value of [{ ...payload, schemaVersion: 3 }, { ...payload, scan: { ...payload.scan, findings: [null] } }, { ...payload, document: "" }]) expect(() => parseSnapshot(value)).toThrow();
  expect(() => validateSave({ id: "22222222-2222-4222-8222-222222222222", kind: "profile", payload })).toThrow();
});
it("retains edited content and defaults missing or unavailable presentation identifiers safely", () => {
  for (const templateId of [undefined, "classic", "unavailable"]) {
    const saved = parseSnapshot({ ...payload, templateId });
    expect(saved.templateId).toBe("classic"); expect(saved.document).toBe(payload.document);
    expect(parseSnapshot(saved)).toEqual(saved);
  }
});
it("round-trips exact source provenance without upgrading legacy findings or losing manual edits", () => {
  const finding = { title: "Customer service", requirement: payload.jd, excerpt: "Helped customers.", explanation: "Direct example.", nextStep: "Keep this example.", group: "supported", priority: "important", expectation: "required" };
  for (const evidence of [finding, { ...finding, requirementSourceId: "jd", excerptSourceId: "cv:b2" }]) {
    const value = { ...payload, scan: { ...payload.scan, findings: [evidence] } };
    const parsed = parseSnapshot(value);
    expect(parsed.scan.findings[0]).toEqual(evidence); expect(parsed.document).toBe(payload.document);
    expect(parseSnapshot(parsed)).toEqual(parsed);
  }
  expect(() => parseSnapshot({ ...payload, scan: { ...payload.scan, findings: [{ ...finding, requirementSourceId: "jd", excerptSourceId: "cv:b1" }] } })).toThrow();
});
