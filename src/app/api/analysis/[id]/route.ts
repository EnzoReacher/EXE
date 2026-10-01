import { NextResponse } from "next/server";
import { processAnalysisRun } from "@/lib/analysis/workflow";
import { getOwnedAnalysisDetails, getOwnedAnalysisInputs, getOwnedAnalysisRun, resetAnalysisRun } from "@/lib/analysis/repository";
import { IntakeError } from "@/lib/intake/types";

function safeFailure(error: unknown) {
  const safe = error instanceof IntakeError ? error : new IntakeError("analysis_retry_failed", "We could not retry this report. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const details = await getOwnedAnalysisDetails(id);
    const safeRun = {
      id: details.run.id,
      status: details.run.status,
      providerName: details.run.providerName,
      providerVersion: details.run.providerVersion,
      schemaVersion: details.run.schemaVersion,
      engineVersion: details.run.engineVersion,
      promptVersion: details.run.promptVersion,
      failureCode: details.run.failureCode,
      createdAt: details.run.createdAt,
      updatedAt: details.run.updatedAt,
      completedAt: details.run.completedAt,
    };
    return NextResponse.json({ details: { ...details, run: safeRun } });
  } catch (error) { return safeFailure(error); }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await getOwnedAnalysisRun(id);
    if (run.status === "completed") return NextResponse.json({ runId: id, status: "completed" });
    if (run.status === "processing") return NextResponse.json({ runId: id, status: "processing" }, { status: 202 });
    const { cv, job } = await getOwnedAnalysisInputs(run.cvDocumentId, run.targetJobId);
    await resetAnalysisRun(id);
    const status = await processAnalysisRun(id, { cvText: cv.extractedText, jobDescription: job.jobDescription });
    return NextResponse.json({ runId: id, status });
  } catch (error) { return safeFailure(error); }
}
