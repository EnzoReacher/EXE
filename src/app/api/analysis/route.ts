import { NextResponse } from "next/server";
import { getOwnedAnalysisInputs, createOrGetAnalysisRun, failAnalysisRun, resetAnalysisRun } from "@/lib/analysis/repository";
import { processAnalysisRun } from "@/lib/analysis/workflow";
import { IntakeError } from "@/lib/intake/types";
import { requireCurrentUser } from "@/lib/intake/repository";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFailure(error: unknown) {
  const safe = error instanceof IntakeError ? error : new IntakeError("analysis_start_failed", "We could not start this report. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
}

export async function POST(request: Request) {
  let runId: string | null = null;
  let shouldMarkFailed = false;
  try {
    const { user } = await requireCurrentUser();
    let body: unknown;
    try { body = await request.json(); } catch { throw new IntakeError("invalid_request", "Choose a saved CV and target job to create a report."); }
    if (typeof body !== "object" || body === null) throw new IntakeError("invalid_request", "Choose a saved CV and target job to create a report.");
    const input = body as Record<string, unknown>;
    if (typeof input.cvId !== "string" || !uuid.test(input.cvId) || typeof input.jobId !== "string" || !uuid.test(input.jobId) || typeof input.clientRequestId !== "string" || !uuid.test(input.clientRequestId)) {
      throw new IntakeError("invalid_request", "Choose a saved CV and target job to create a report.");
    }

    const { cv, job } = await getOwnedAnalysisInputs(input.cvId, input.jobId);
    const result = await createOrGetAnalysisRun(user.id, cv.id, job.id, input.clientRequestId);
    runId = result.run.id;
    if (result.existed && (result.run.cvDocumentId !== cv.id || result.run.targetJobId !== job.id)) {
      throw new IntakeError("request_conflict", "This report request was already used for a different CV or job. Start a new report.", 409);
    }
    if (result.existed && result.run.status === "completed") return NextResponse.json({ runId, status: "completed" });
    if (result.existed && result.run.status === "processing") return NextResponse.json({ runId, status: "processing" }, { status: 202 });
    if (result.existed && result.run.status === "failed") await resetAnalysisRun(runId);

    shouldMarkFailed = true;
    const status = await processAnalysisRun(runId, { cvText: cv.extractedText, jobDescription: job.jobDescription });
    shouldMarkFailed = false;
    return NextResponse.json({ runId, status }, { status: 201 });
  } catch (error) {
    if (runId && shouldMarkFailed) {
      try { await failAnalysisRun(runId); } catch { /* Keep the public error generic if persistence is unavailable. */ }
    }
    return safeFailure(error);
  }
}
