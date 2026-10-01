import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { CvFormat, IntakeError } from "./types";

export async function extractCvText(bytes: Uint8Array, format: CvFormat): Promise<string> {
  try {
    const text = format === "docx"
      ? (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
      : await extractPdfText(bytes);
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) throw new IntakeError("empty_document", "We could not find readable text in this CV. Try another file.");
    return cleaned;
  } catch (error) {
    if (error instanceof IntakeError) throw error;
    throw new IntakeError("parse_failed", "We could not read this CV. It may be malformed, encrypted, or unsupported.");
  }
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}
