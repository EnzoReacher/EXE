import "server-only";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import { bounded, identifier, validateClaim, validateDocument } from "./validation";
import type { Claim, DocumentItem, DocumentKind, Expert, ExpertDetail, Version, Workspace } from "./types";

export function unavailable() { return new IntakeError("unavailable", "This private record or action is unavailable. Refresh and check its current status.", 403); }

export async function loadWorkspace(): Promise<Workspace> {
  const { supabase, user } = await requireCurrentUser();
  const [cvs, portfolios, credentials, experts, claims, decisions, versions, links] = await Promise.all([
    supabase.from("cv_documents").select("id,original_filename").eq("owner_id", user.id).eq("processing_status", "ready"),
    supabase.from("portfolio_documents").select("id,filename,withdrawn_at").eq("owner_id", user.id),
    supabase.from("credential_documents").select("id,filename,withdrawn_at").eq("owner_id", user.id),
    supabase.rpc("m11a_experts"),
    supabase.from("credential_skill_claims").select("id,skill_label,proposed_wording,state,created_at,credential_id,portfolio_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("credential_expert_decisions").select("claim_id,explanation,approved_wording"),
    supabase.from("cv_versions").select("id,version_number,state,created_at,accepted_at").eq("owner_id", user.id).order("version_number", { ascending: false }),
    supabase.from("cv_version_skill_claims").select("version_id,claim_id"),
  ]);
  if ([cvs, portfolios, credentials, experts, claims, decisions, versions, links].some((result) => result.error)) throw unavailable();
  const documents = (rows: { id: string; filename: string; withdrawn_at: string | null }[] | null): DocumentItem[] => (rows ?? []).map((r) => ({ id: r.id, filename: r.filename, withdrawn: Boolean(r.withdrawn_at) }));
  return {
    cvs: (cvs.data ?? []).map((r) => ({ id: r.id, filename: r.original_filename })),
    portfolios: documents(portfolios.data), credentials: documents(credentials.data), experts: experts.data as Expert[],
    claims: (claims.data ?? []).map((r): Claim => ({ id: r.id, skill: r.skill_label, wording: r.proposed_wording, state: r.state, createdAt: r.created_at, credentialId: r.credential_id, portfolioId: r.portfolio_id, note: decisions.data?.find((d) => d.claim_id === r.id)?.explanation ?? null, canWithdraw: r.state !== "withdrawn" && !(links.data ?? []).some((link) => link.claim_id === r.id && versions.data?.some((v) => v.id === link.version_id && v.accepted_at)) })),
    versions: (versions.data ?? []).map((r): Version => ({ id: r.id, number: r.version_number, state: r.state, createdAt: r.created_at, acceptedAt: r.accepted_at, changes: (links.data ?? []).filter((l) => l.version_id === r.id).map((l) => decisions.data?.find((d) => d.claim_id === l.claim_id)?.approved_wording).filter((w): w is string => typeof w === "string") })),
  };
}

export async function uploadDocument(file: File, kind: DocumentKind, documentType: unknown) {
  const { supabase, user } = await requireCurrentUser();
  if (kind === "credential" && documentType !== "certificate" && documentType !== "degree") throw new IntakeError("invalid_input", "Select certificate or degree.");
  const format = await validateDocument(file, kind);
  const path = `${user.id}/${crypto.randomUUID()}.${format.extension}`;
  const bucket = kind === "credential" ? "credential-private" : "portfolio-private";
  const { error } = await supabase.storage.from(bucket).upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: format.mime, upsert: false });
  if (error) throw unavailable();
  const saved = await supabase.rpc("m11a_register_document", { p_kind: kind, p_path: path, p_filename: file.name, p_mime: format.mime, p_size: file.size, p_type: kind === "credential" ? documentType : null });
  if (saved.error) { await supabase.storage.from(bucket).remove([path]); throw unavailable(); }
  return { id: saved.data as string };
}

export async function ownerAction(input: Record<string, unknown>) {
  const { supabase } = await requireCurrentUser();
  let result;
  if (input.action === "create_claim") result = await supabase.rpc("m11a_create_claim", validateClaim(input));
  else if (input.action === "submit") result = await supabase.rpc("m11a_submit_claim", { p_claim: identifier(input.id) });
  else if (input.action === "withdraw_claim") result = await supabase.rpc("m11a_withdraw_claim", { p_claim: identifier(input.id) });
  else if (input.action === "create_version") result = await supabase.rpc("m11a_create_version", { p_claim: identifier(input.id) });
  else if (input.action === "accept" || input.action === "reject_version") result = await supabase.rpc("m11a_review_version", { p_version: identifier(input.id), p_accept: input.action === "accept" });
  else if (input.action === "withdraw") {
    if (input.kind !== "credential" && input.kind !== "portfolio") throw unavailable();
    const withdrawn = await supabase.rpc("m11a_withdraw_document", { p_kind: input.kind, p_document: identifier(input.id) });
    if (withdrawn.error || !withdrawn.data) throw unavailable();
    const removal = await supabase.storage.from(input.kind === "credential" ? "credential-private" : "portfolio-private").remove([withdrawn.data]);
    if (removal.error) throw new IntakeError("delete_pending", "Evidence is withdrawn and versions are marked accordingly, but the private file was not removed. Retry deletion.", 409);
    return { ok: true };
  } else throw new IntakeError("invalid_input", "Choose an available action.");
  if (result.error) throw unavailable();
  return { ok: true, id: typeof result.data === "string" ? result.data : undefined };
}

export async function versionDetail(id: string) {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("cv_versions").select("id,content_snapshot,state,parent_version_id").eq("id", identifier(id)).eq("owner_id", user.id).single();
  if (error || !data) throw unavailable();
  let before: string;
  if (data.parent_version_id) {
    const previous = await supabase.from("cv_versions").select("content_snapshot").eq("id", data.parent_version_id).eq("owner_id", user.id).single();
    if (previous.error || !previous.data) throw unavailable();
    before = previous.data.content_snapshot;
  } else {
    const link = await supabase.from("cv_version_skill_claims").select("claim_id").eq("version_id", data.id).single();
    if (link.error || !link.data) throw unavailable();
    const source = await supabase.from("credential_skill_claims").select("source_snapshot").eq("id", link.data.claim_id).eq("owner_id", user.id).single();
    if (source.error || !source.data) throw unavailable();
    before = source.data.source_snapshot;
  }
  return { id: data.id, content: data.content_snapshot, before, state: data.state };
}
export async function expertQueue() {
  const { supabase } = await requireCurrentUser();
  const result = await supabase.rpc("m11a_expert_queue");
  if (result.error) throw unavailable();
  return result.data as { id: string; skill: string; wording: string; state: string; createdAt: string }[];
}
export async function expertDetail(id: string) {
  const { supabase } = await requireCurrentUser();
  const result = await supabase.rpc("m11a_expert_detail", { p_claim: identifier(id) });
  if (result.error || !result.data) throw unavailable();
  return result.data as ExpertDetail;
}
export async function expertDecision(input: Record<string, unknown>) {
  const { supabase } = await requireCurrentUser();
  if (input.proofReviewed !== true) throw new IntakeError("invalid_input", "Confirm review of the submitted proof and exact wording.");
  if (!["approved", "needs_information", "rejected"].includes(String(input.decision))) throw new IntakeError("invalid_input", "Select approve, request information or reject.");
  const result = await supabase.rpc("m11a_decide", { p_claim: identifier(input.id), p_decision: input.decision, p_note: bounded(input.note, 2, 1000, "Explanation") });
  if (result.error) throw unavailable();
  return { ok: true };
}
export async function evidenceFile(id: string, kind: string) {
  const { supabase } = await requireCurrentUser();
  if (kind !== "credential" && kind !== "portfolio") throw unavailable();
  const descriptor = await supabase.rpc("m11a_evidence_path", { p_claim: identifier(id), p_kind: kind });
  if (descriptor.error || !descriptor.data) throw unavailable();
  const file = await supabase.storage.from(descriptor.data.bucket).download(descriptor.data.path);
  if (file.error || !file.data) throw unavailable();
  return { bytes: await file.data.arrayBuffer(), mime: descriptor.data.mime as string };
}
