import { NextResponse } from "next/server";
import { IntakeError } from "@/lib/intake/types";
import { listOwnedTargetJobs, requireCurrentUser, saveTargetJob } from "@/lib/intake/repository";
import { validateTargetJob } from "@/lib/intake/validation";
export async function POST(request: Request) { try { const { user } = await requireCurrentUser(); const job = await saveTargetJob(user.id, validateTargetJob(await request.json())); return NextResponse.json({ job }, { status: 201 }); } catch (error) { const safe = error instanceof IntakeError ? error : new IntakeError("job_save_failed", "We could not save your target job. Try again.", 500); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); } }
export async function GET() { try { const jobs = await listOwnedTargetJobs(); return NextResponse.json({ jobs: jobs.map(({ id, roleTitle, companyName }) => ({ id, roleTitle, companyName })) }); } catch (error) { const safe = error instanceof IntakeError ? error : new IntakeError("load_failed", "We could not load your target jobs. Try again.", 500); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); } }
