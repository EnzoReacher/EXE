import { NextResponse } from "next/server";
import { extractCvText } from "@/lib/intake/parser";
import { createCvRecord, getOwnedCv, listOwnedCvs, replaceOwnedCv, requireCurrentUser, updateCvRecord } from "@/lib/intake/repository";
import { CV_BUCKET, IntakeError } from "@/lib/intake/types";
import { validateCvFile } from "@/lib/intake/validation";

export const runtime = "nodejs";

function failure(error: unknown) { const safe = error instanceof IntakeError ? error : new IntakeError("upload_failed", "We could not upload this CV. Try again.", 500); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); }

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const replaceCvId = formData.get("replaceCvId");
    if (replaceCvId !== null && (typeof replaceCvId !== "string" || !/^[0-9a-f-]{36}$/i.test(replaceCvId))) throw new IntakeError("invalid_replacement", "Choose one of your saved CVs to replace.");
    if (typeof replaceCvId === "string") await getOwnedCv(replaceCvId);
    if (!(file instanceof File)) throw new IntakeError("missing_file", "Choose a PDF or DOCX CV.");
    const format = await validateCvFile(file); const bytes = new Uint8Array(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const contentType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const { error: uploadError } = await supabase.storage.from(CV_BUCKET).upload(storagePath, bytes, { contentType, upsert: false });
    if (uploadError) throw new IntakeError("upload_failed", "We could not store this CV privately. Try again.", 500);
    let cv;
    try {
      cv = await createCvRecord(user.id, { storagePath, originalFilename: file.name.slice(0, 255), contentType, byteSize: file.size, processingStatus: "processing", extractedText: null, parseErrorCode: null });
    } catch (error) {
      await supabase.storage.from(CV_BUCKET).remove([storagePath]);
      throw error;
    }
    try { cv = await updateCvRecord(cv.id, { processingStatus: "ready", extractedText: await extractCvText(bytes, format), parseErrorCode: null }); }
    catch (error) { cv = await updateCvRecord(cv.id, { processingStatus: "failed", extractedText: null, parseErrorCode: error instanceof IntakeError ? error.code : "parse_failed" }); }
    if (typeof replaceCvId === "string" && replaceCvId && cv.processingStatus === "ready") {
      try { await replaceOwnedCv(replaceCvId, cv); }
      catch { throw new IntakeError("replace_partial_failure", "Your new CV was saved, but the old CV was not deleted. Delete the old CV again before continuing.", 500); }
    }
    return NextResponse.json({ cv }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function GET() {
  try {
    const cvs = await listOwnedCvs();
    return NextResponse.json({ cvs: cvs.map((cv) => ({ id: cv.id, originalFilename: cv.originalFilename, contentType: cv.contentType, byteSize: cv.byteSize, processingStatus: cv.processingStatus, parseErrorCode: cv.parseErrorCode })) });
  } catch (error) { return failure(error); }
}
