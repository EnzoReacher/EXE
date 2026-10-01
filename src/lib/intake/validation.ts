import { CvFormat, IntakeError, MAX_CV_BYTES } from "./types";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const FORMATS: Record<CvFormat, { mime: string; extension: string; signature: number[] }> = {
  pdf: { mime: "application/pdf", extension: ".pdf", signature: PDF_SIGNATURE },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx", signature: ZIP_SIGNATURE },
};

export async function validateCvFile(file: File): Promise<CvFormat> {
  if (!file || file.size === 0) throw new IntakeError("empty_file", "Choose a non-empty PDF or DOCX CV.");
  if (file.size > MAX_CV_BYTES) throw new IntakeError("file_too_large", "Your CV must be 5 MiB or smaller.");
  const name = file.name.toLowerCase();
  const candidate = (Object.keys(FORMATS) as CvFormat[]).find((format) => name.endsWith(FORMATS[format].extension));
  if (!candidate) throw new IntakeError("unsupported_file", "Only PDF and DOCX CV files are accepted.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!FORMATS[candidate].signature.every((byte, index) => bytes[index] === byte)) throw new IntakeError("invalid_signature", "The selected file does not match its claimed CV format.");
  if (candidate === "docx") {
    const body = new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()));
    if (!body.includes("[Content_Types].xml") || !body.includes("word/document.xml")) {
      throw new IntakeError("invalid_docx", "The selected file is not a valid DOCX document.");
    }
  }
  return candidate;
}

export function validateTargetJob(input: { roleTitle: string; companyName?: string; jobDescription: string }) {
  const roleTitle = input.roleTitle.trim(); const companyName = input.companyName?.trim() || null; const jobDescription = input.jobDescription.trim();
  if (roleTitle.length < 2 || roleTitle.length > 120) throw new IntakeError("invalid_role", "Enter a target role between 2 and 120 characters.");
  if (companyName && companyName.length > 120) throw new IntakeError("invalid_company", "Company name must be 120 characters or fewer.");
  if (jobDescription.length < 30 || jobDescription.length > 15000) throw new IntakeError("invalid_job_description", "Enter a job description between 30 and 15,000 characters.");
  return { roleTitle, companyName, jobDescription };
}
