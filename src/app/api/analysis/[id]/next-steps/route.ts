import { NextResponse } from "next/server";
import { acceptDraft, createOrGetNextSteps, getOwnedNextSteps, updateDraftContent, updateRoadmapProgress } from "@/lib/next-steps/repository";
import { IntakeError } from "@/lib/intake/types";
import type { RoadmapProgress } from "@/lib/next-steps/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const progressValues = new Set<RoadmapProgress>(["not_started", "in_progress", "completed"]);

function safeFailure(error: unknown) {
  const safe = error instanceof IntakeError ? error : new IntakeError("next_steps_unavailable", "We could not update your next steps. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const details = await getOwnedNextSteps(id);
    return NextResponse.json({ details });
  } catch (error) { return safeFailure(error); }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const details = await createOrGetNextSteps(id);
    return NextResponse.json({ details }, { status: 201 });
  } catch (error) { return safeFailure(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new IntakeError("invalid_request", "Choose a valid next-step change.");
    const input = body as Record<string, unknown>;
    if (input.action === "update_roadmap") {
      if (typeof input.itemId !== "string" || !uuid.test(input.itemId) || typeof input.progress !== "string" || !progressValues.has(input.progress as RoadmapProgress)) throw new IntakeError("invalid_request", "Choose a valid roadmap status.");
      const item = await updateRoadmapProgress(id, input.itemId, input.progress as RoadmapProgress);
      return NextResponse.json({ item });
    }
    if (input.action === "save_draft") {
      if (typeof input.draftId !== "string" || !uuid.test(input.draftId) || typeof input.content !== "string") throw new IntakeError("invalid_request", "Enter a valid CV draft.");
      const draft = await updateDraftContent(id, input.draftId, input.content);
      return NextResponse.json({ draft });
    }
    if (input.action === "accept_draft") {
      if (typeof input.draftId !== "string" || !uuid.test(input.draftId)) throw new IntakeError("invalid_request", "Choose a valid CV draft.");
      const draft = await acceptDraft(id, input.draftId);
      return NextResponse.json({ draft });
    }
    throw new IntakeError("invalid_request", "Choose a valid next-step change.");
  } catch (error) { return safeFailure(error); }
}
