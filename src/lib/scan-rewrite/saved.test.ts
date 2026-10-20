import { expect, it } from "vitest";
import { parseSnapshot } from "./saved";
import { validateSave } from "@/lib/cv-review/persistence";
const payload = { schemaVersion: 2, cv: "Nguyễn An\nHelped customers.", jd: "Customer service required.", scan: { coverage: "Selected requirements only.", findings: [] }, instructions: "Concise", language: "English", document: "Nguyễn An\nAssisted customers.", changes: ["Clearer wording"], notes: [], title: "Fictional CV" };
it("round-trips the complete versioned snapshot and takes final text from the edited document", () => {
  const parsed = parseSnapshot(payload); expect(parsed).toEqual(payload);
  const saved = validateSave({ id: "22222222-2222-4222-8222-222222222222", kind: "version", payload: { ...payload, finalDocument: "forged" } });
  expect(saved.payload).toEqual({ ...payload, finalDocument: payload.document });
});
it("rejects unknown versions, malformed nested findings and version payloads in the legacy profile table", () => {
  for (const value of [{ ...payload, schemaVersion: 3 }, { ...payload, scan: { ...payload.scan, findings: [null] } }, { ...payload, document: "" }]) expect(() => parseSnapshot(value)).toThrow();
  expect(() => validateSave({ id: "22222222-2222-4222-8222-222222222222", kind: "profile", payload })).toThrow();
});
