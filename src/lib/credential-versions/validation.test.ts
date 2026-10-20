import { describe, expect, it } from "vitest";
import { validateDocument, validateClaim, MAX_DOCUMENT_BYTES } from "./validation";
const uuid = "11111111-1111-4111-8111-111111111111";
describe("private credential and portfolio validation", () => {
  it.each([
    ["fictional.pdf", "application/pdf", [37, 80, 68, 70, 45], "pdf"],
    ["fictional.jpg", "image/jpeg", [255, 216, 255], "jpg"],
    ["fictional.png", "image/png", [137, 80, 78, 71, 13, 10, 26, 10], "png"],
  ] as const)("permits signature-matching fictional proof %s without OCR", async (name, type, bytes, extension) => {
    expect((await validateDocument(new File([new Uint8Array(bytes)], name, { type }), "credential")).extension).toBe(extension);
  });
  it.each([
    new File(["%PDF-1.4"], "fake.docx", { type: "application/pdf" }),
    new File(["plain text"], "fake.pdf", { type: "application/pdf" }),
    new File(["%PDF-1.4"], "fake.pdf", { type: "image/jpeg" }),
    new File(["%PDF-1.4"], "../fake.pdf", { type: "application/pdf" }),
    new File(["%PDF-1.4"], "x".repeat(121) + ".pdf", { type: "application/pdf" }),
    new File([], "empty.pdf", { type: "application/pdf" }),
  ])("rejects unsupported/mismatched/empty/unsafe files", async (file) => {
    await expect(validateDocument(file, "credential")).rejects.toThrow();
  });
  it("rejects oversize files before reading and permits the boundary", async () => {
    const oversized = new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], "fictional.pdf", { type: "application/pdf" });
    await expect(validateDocument(oversized, "credential")).rejects.toThrow(/5 MiB/);
    const bytes = new Uint8Array(MAX_DOCUMENT_BYTES); bytes.set([37, 80, 68, 70, 45]);
    await expect(validateDocument(new File([bytes], "fictional.pdf", { type: "application/pdf" }), "credential")).resolves.toMatchObject({ extension: "pdf" });
  });
  it("portfolios accept PDF/DOCX only and retain the existing DOCX structure guard", async () => {
    await expect(validateDocument(new File(["%PDF-1.4 fictional"], "fictional.pdf", { type: "application/pdf" }), "portfolio")).resolves.toMatchObject({ extension: "pdf" });
    await expect(validateDocument(new File([new Uint8Array([80,75,3,4]), "[Content_Types].xml word/document.xml fictional"], "fictional.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "portfolio")).resolves.toMatchObject({ extension: "docx" });
    await expect(validateDocument(new File([new Uint8Array([255,216,255])], "fictional.jpg", { type: "image/jpeg" }), "portfolio")).rejects.toThrow();
  });
  it("requires CV and proof while portfolio is optional, and bounds exact wording", () => {
    const input = { cvId: uuid, credentialId: uuid, expertId: uuid, skill: "Fictional SQL", wording: "Fictional SQL coursework" };
    expect(validateClaim(input).p_portfolio).toBeNull();
    expect(() => validateClaim({ ...input, cvId: undefined })).toThrow();
    expect(() => validateClaim({ ...input, credentialId: undefined })).toThrow();
    expect(() => validateClaim({ ...input, wording: "x".repeat(301) })).toThrow();
  });
});
