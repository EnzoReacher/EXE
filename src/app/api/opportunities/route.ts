import { NextResponse } from "next/server";
import { createOwnedOpportunityLink, listOwnedOpportunityLinks, listOwnedOpportunityTargetJobs } from "@/lib/opportunities/repository";
import { validateOpportunityCreate } from "@/lib/opportunities/validation";
import { IntakeError } from "@/lib/intake/types";

const failure = (error: unknown) => {
  const safe = error instanceof IntakeError ? error : new IntakeError("opportunities_unavailable", "We could not update your private opportunities. Try again.", 500);
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
};

export async function GET() { try { const [items, targetJobs] = await Promise.all([listOwnedOpportunityLinks(), listOwnedOpportunityTargetJobs()]); return NextResponse.json({ items, targetJobs }); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { const raw: unknown = await request.json().catch(() => null); let input; try { input = validateOpportunityCreate(raw); } catch (error) { throw new IntakeError("invalid_opportunity", error instanceof Error ? error.message : "Enter a valid private opportunity."); } return NextResponse.json({ item: await createOwnedOpportunityLink(input) }, { status: 201 }); } catch (error) { return failure(error); } }
