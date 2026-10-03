import { IntakeError } from "@/lib/intake/types";
import { validateCvFile } from "@/lib/intake/validation";
import type { DocumentKind } from "./types";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export function bounded(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    throw new IntakeError("invalid_input", `${label} must be between ${min} and ${max} characters.`);
  }
  return value.trim();
}
export function identifier(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new IntakeError("invalid_input", "Select an available private record.");
  return value;
}
export function validateClaim(input: Record<string, unknown>) {
  return { p_cv: identifier(input.cvId), p_credential: identifier(input.credentialId), p_portfolio: input.portfolioId ? identifier(input.portfolioId) : null,
    p_expert: identifier(input.expertId), p_skill: bounded(input.skill, 2, 80, "Skill label"), p_wording: bounded(input.wording, 2, 300, "Proposed wording") };
}
export async function validateDocument(file: File, kind: DocumentKind) {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) throw new IntakeError("invalid_file", "Choose a non-empty file of at most 5 MiB.");
  if (!file.name || file.name.length > 120 || /[\x00-\x1f/\\]/.test(file.name)) throw new IntakeError("invalid_file", "Use a filename of at most 120 characters without path separators.");
  if (kind === "portfolio") {
    const format = await validateCvFile(file);
    const mime = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (file.type !== mime) throw new IntakeError("invalid_file", "The file type must match the portfolio format.");
    return { extension: format, mime };
  }
  const formats = [
    { extension: "pdf", mime: "application/pdf", signature: [37, 80, 68, 70, 45], extensions: /\.pdf$/i },
    { extension: "jpg", mime: "image/jpeg", signature: [255, 216, 255], extensions: /\.jpe?g$/i },
    { extension: "png", mime: "image/png", signature: [137, 80, 78, 71, 13, 10, 26, 10], extensions: /\.png$/i },
  ];
  const format = formats.find((candidate) => candidate.extensions.test(file.name) && candidate.mime === file.type);
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!format || !format.signature.every((byte, index) => bytes[index] === byte)) throw new IntakeError("invalid_file", "Certificates and degrees must be PDF, JPG or PNG with matching type and file signature.");
  return { extension: format.extension, mime: format.mime };
}
