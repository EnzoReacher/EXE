import { NextResponse } from "next/server";
import { deleteOwnedOpportunityLink, updateOwnedOpportunityLink } from "@/lib/opportunities/repository";
import { validateOpportunityUpdate } from "@/lib/opportunities/validation";
import { IntakeError } from "@/lib/intake/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure = (error: unknown) => { const safe = error instanceof IntakeError ? error : new IntakeError("opportunity_unavailable", "We could not update your private opportunity. Try again.", 500); return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status }); };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; if (!uuid.test(id)) throw new IntakeError("invalid_opportunity", "Choose a valid private opportunity."); const raw: unknown = await request.json().catch(() => null); let input; try { input = validateOpportunityUpdate(raw); } catch (error) { throw new IntakeError("invalid_opportunity", error instanceof Error ? error.message : "Enter a valid private opportunity."); } return NextResponse.json({ item: await updateOwnedOpportunityLink(id, input) }); } catch (error) { return failure(error); } }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; if (!uuid.test(id)) throw new IntakeError("invalid_opportunity", "Choose a valid private opportunity."); await deleteOwnedOpportunityLink(id); return NextResponse.json({ deleted: true }); } catch (error) { return failure(error); } }
