import { describe, expect, it } from "vitest";
import { MAX_CV_BYTES } from "./types";
import { validateCvFile, validateTargetJob } from "./validation";

function file(name: string, bytes: number[], type = "application/octet-stream") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("CV validation", () => {
  it("accepts a PDF by extension and signature without trusting browser MIME type", async () => {
    await expect(validateCvFile(file("fictional-cv.pdf", [0x25, 0x50, 0x44, 0x46, 0x2d], "text/plain"))).resolves.toBe("pdf");
  });

  it("rejects unsupported extensions and mismatched signatures", async () => {
    await expect(validateCvFile(file("fictional-cv.txt", [0x25, 0x50, 0x44, 0x46, 0x2d]))).rejects.toMatchObject({ code: "unsupported_file" });
    await expect(validateCvFile(file("fictional-cv.pdf", [1, 2, 3, 4, 5]))).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects empty and over-limit documents", async () => {
    await expect(validateCvFile(file("empty.pdf", []))).rejects.toMatchObject({ code: "empty_file" });
    const tooLarge = new File([new Uint8Array(MAX_CV_BYTES + 1)], "large.pdf", { type: "application/pdf" });
    await expect(validateCvFile(tooLarge)).rejects.toMatchObject({ code: "file_too_large" });
  });

  it("requires DOCX archive markers beyond a ZIP signature", async () => {
    await expect(validateCvFile(file("fictional.docx", [0x50, 0x4b, 0x03, 0x04, 1, 2]))).rejects.toMatchObject({ code: "invalid_docx" });
  });
});

describe("target-job validation", () => {
  it("normalizes valid fictional job intake", () => {
    expect(validateTargetJob({ roleTitle: " Data Analyst Intern ", companyName: " Example Co ", jobDescription: "A fictional role requiring data cleaning and clear communication." })).toEqual({ roleTitle: "Data Analyst Intern", companyName: "Example Co", jobDescription: "A fictional role requiring data cleaning and clear communication." });
  });

  it("rejects a missing or too-short job description", () => {
    expect(() => validateTargetJob({ roleTitle: "QA", jobDescription: "Short" })).toThrow("between 30 and 15,000");
  });
});
