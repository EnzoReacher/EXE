import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ extractRawText: vi.fn(), getText: vi.fn(), destroy: vi.fn() }));

vi.mock("mammoth", () => ({ default: { extractRawText: mocks.extractRawText } }));
vi.mock("pdf-parse", () => ({ PDFParse: class { getText = mocks.getText; destroy = mocks.destroy; } }));

import { extractCvText } from "./parser";

describe("server CV parsing", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("extracts DOCX text and preserves readable content", async () => {
    mocks.extractRawText.mockResolvedValue({ value: "Fictional candidate\nSkills: TypeScript" });
    await expect(extractCvText(new Uint8Array([1]), "docx")).resolves.toBe("Fictional candidate Skills: TypeScript");
  });

  it("extracts PDF text and destroys its parser", async () => {
    mocks.getText.mockResolvedValue({ text: "Fictional candidate — projects" });
    await expect(extractCvText(new Uint8Array([1]), "pdf")).resolves.toContain("Fictional candidate");
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });

  it("returns safe errors for malformed or empty documents", async () => {
    mocks.extractRawText.mockRejectedValue(new Error("internal parser detail"));
    await expect(extractCvText(new Uint8Array([1]), "docx")).rejects.toMatchObject({ code: "parse_failed", message: "We could not read this CV. It may be malformed, encrypted, or unsupported." });
    mocks.extractRawText.mockResolvedValue({ value: "   " });
    await expect(extractCvText(new Uint8Array([1]), "docx")).rejects.toMatchObject({ code: "empty_document" });
  });
});
