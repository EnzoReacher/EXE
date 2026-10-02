import { NextResponse } from "next/server";
import { createOwnedReviewShare, listOwnedReviewShares, revokeOwnedReviewShare } from "@/lib/review-links/repository";
import { isReviewExpiry } from "@/lib/review-links/security";
import { IntakeError } from "@/lib/intake/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (error: unknown) => {
  const safe = error instanceof IntakeError ? error : new IntakeError("review_share_unavailable", "We could not update your private review links. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return NextResponse.json({ shares: await listOwnedReviewShares(id) }); } catch (error) { return fail(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new IntakeError("invalid_review_request", "Choose valid private review-link settings.");
    const input = body as Record<string, unknown>;
    if (!isReviewExpiry(input.expiry) || typeof input.includeAcceptedDraft !== "boolean") throw new IntakeError("invalid_review_request", "Choose a valid expiry and draft option.");
    const result = await createOwnedReviewShare(id, input.expiry, input.includeAcceptedDraft);
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new IntakeError("invalid_review_request", "Choose a valid private review link.");
    const shareId = (body as Record<string, unknown>).shareId;
    if (typeof shareId !== "string" || !uuid.test(shareId)) throw new IntakeError("invalid_review_request", "Choose a valid private review link.");
    await revokeOwnedReviewShare(id, shareId);
    return NextResponse.json({ revoked: true });
  } catch (error) { return fail(error); }
}
