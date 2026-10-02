import { NextResponse } from "next/server";
import { listOwnedSavedWork } from "@/lib/saved-work/repository";
import { IntakeError } from "@/lib/intake/types";

export async function GET() {
  try {
    return NextResponse.json({ items: await listOwnedSavedWork() });
  } catch (error) {
    const safe = error instanceof IntakeError ? error : new IntakeError("saved_work_load_failed", "We could not load your saved work. Please try again.", 500);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
