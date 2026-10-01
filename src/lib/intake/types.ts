export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const CV_BUCKET = "cv-private";
export type CvFormat = "pdf" | "docx";
export type CvStatus = "processing" | "ready" | "failed" | "deleting" | "delete_failed";
export type OwnedCv = { id: string; ownerId: string; storagePath: string; originalFilename: string; contentType: string; byteSize: number; processingStatus: CvStatus; extractedText: string | null; parseErrorCode: string | null };
export type CvSummary = Omit<OwnedCv, "ownerId" | "storagePath" | "extractedText">;
export type TargetJob = { id: string; ownerId: string; roleTitle: string; companyName: string | null; jobDescription: string };
export class IntakeError extends Error { constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); } }
