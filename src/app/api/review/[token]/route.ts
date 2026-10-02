import { NextResponse } from "next/server";
import { getPublicReview, submitPublicReview } from "@/lib/review-links/repository";
import { IntakeError } from "@/lib/intake/types";

const unavailable = () => NextResponse.json({ error: "This private review link is not available." }, { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } });

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const review = await getPublicReview(token);
  return review ? NextResponse.json({ review }, { headers: { "Cache-Control": "private, no-store, max-age=0" } }) : unavailable();
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params; const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new IntakeError("invalid_review_feedback", "Enter your feedback before submitting it.");
    await submitPublicReview(token, body as Record<string, unknown>);
    return NextResponse.json({ submitted: true }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof IntakeError && error.status !== 500) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
    return unavailable();
  }
}
