import { NextResponse } from "next/server";
import { extractCvText } from "@/lib/intake/parser";
import { getOwnedCv, removeOwnedCv, requireCurrentUser, updateCvRecord } from "@/lib/intake/repository";
import { CV_BUCKET, IntakeError } from "@/lib/intake/types";

function failure(error: unknown) { const safe = error instanceof IntakeError ? error : new IntakeError("request_failed", "We could not complete that request. Try again.", 500); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await removeOwnedCv((await params).id); return new NextResponse(null, { status: 204 }); } catch (error) { return failure(error); } }
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id; const cv = await getOwnedCv(id); const { supabase } = await requireCurrentUser();
    const { data, error } = await supabase.storage.from(CV_BUCKET).download(cv.storagePath);
    if (error || !data) throw new IntakeError("retry_failed", "We could not retrieve this CV for processing. Try again.", 500);
    const bytes = new Uint8Array(await data.arrayBuffer()); const format = cv.originalFilename.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
    try {
      const ready = await updateCvRecord(id, { processingStatus: "ready", extractedText: await extractCvText(bytes, format), parseErrorCode: null });
      return NextResponse.json({ cv: ready });
    } catch (error) {
      const failed = await updateCvRecord(id, { processingStatus: "failed", extractedText: null, parseErrorCode: error instanceof IntakeError ? error.code : "parse_failed" });
      return NextResponse.json({ cv: failed });
    }
  } catch (error) { return failure(error); }
}
