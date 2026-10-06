import { NextResponse } from "next/server";
import { getOwnedTargetJob, removeOwnedTargetJob, requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";

async function jobId(params: Promise<{ id: string }>) {
  await requireCurrentUser();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new IntakeError("not_found", "That target job is unavailable or does not belong to you.", 404);
  }
  return id;
}
function failure(error: unknown) {
  const safe = error instanceof IntakeError ? error : new IntakeError("request_failed", "We could not complete that request. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, roleTitle, companyName, jobDescription } = await getOwnedTargetJob(await jobId(params));
    return NextResponse.json({ job: { id, roleTitle, companyName, jobDescription } });
  } catch (error) { return failure(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await removeOwnedTargetJob(await jobId(params)); return new NextResponse(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
