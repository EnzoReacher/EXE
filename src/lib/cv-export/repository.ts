import "server-only";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import { identifier } from "@/lib/credential-versions/validation";
import { exportBlockReason } from "./contract";

export type ExportSnapshot = { content: string; name: string; number: number };
type Evidence = { owner_id: string; withdrawn_at: string | null };
type Claim = {
  id: string; owner_id: string; source_cv_id: string; state: string; proposed_wording: string;
  source_snapshot: string; parent_version_id: string | null; portfolio_id: string | null;
  credential: Evidence | null; portfolio: Evidence | null;
};
type Link = { claim_id: string; decision_id: string; claim: Claim | null; decision: {
  id: string; claim_id: string; reviewer_id: string; decision: string; approved_wording: string | null;
} | null };
type ExportRow = {
  owner_id: string; source_cv_id: string; parent_version_id: string | null; state: string;
  accepted_at: string | null; evidence_withdrawn_at: string | null; content_snapshot: string;
  version_number: number; source: { original_filename: string } | null; links: Link[];
};
export function exportUnavailable() {
  return new IntakeError("unavailable", "This accepted CV export is unavailable. Return to version history and refresh.", 404);
}

export async function loadExportSnapshot(id: string): Promise<ExportSnapshot> {
  const { supabase, user } = await requireCurrentUser();
  try { identifier(id); } catch { throw exportUnavailable(); }
  // One relational read uses one database statement snapshot, avoiding a mix of
  // pre-withdrawal version state and post-withdrawal provenance. Existing RLS applies.
  const { data, error } = await supabase.from("cv_versions").select(`
    owner_id,source_cv_id,parent_version_id,state,accepted_at,evidence_withdrawn_at,content_snapshot,version_number,
    source:cv_documents(original_filename),
    links:cv_version_skill_claims(claim_id,decision_id,
      claim:credential_skill_claims(id,owner_id,source_cv_id,state,proposed_wording,source_snapshot,parent_version_id,portfolio_id,
        credential:credential_documents(owner_id,withdrawn_at),portfolio:portfolio_documents(owner_id,withdrawn_at)),
      decision:credential_expert_decisions(id,claim_id,reviewer_id,decision,approved_wording))
  `).eq("id", id).eq("owner_id", user.id).single();
  const row = data as unknown as ExportRow | null;
  if (error || !row || row.owner_id !== user.id || exportBlockReason({ state: row.state, acceptedAt: row.accepted_at }) || row.evidence_withdrawn_at
    || !row.source || typeof row.content_snapshot !== "string" || !row.content_snapshot.length || row.content_snapshot.length > 64000
    || !Array.isArray(row.links) || !row.links.length) throw exportUnavailable();
  for (const link of row.links) {
    const c = link.claim; const d = link.decision;
    if (!c || !d || c.id !== link.claim_id || d.id !== link.decision_id || d.claim_id !== c.id
      || c.owner_id !== user.id || c.source_cv_id !== row.source_cv_id || c.state !== "version_created"
      || d.reviewer_id === user.id || !d.reviewer_id || d.decision !== "approved" || d.approved_wording !== c.proposed_wording
      || !c.credential || c.credential.owner_id !== user.id || c.credential.withdrawn_at
      || (c.portfolio_id && (!c.portfolio || c.portfolio.owner_id !== user.id || c.portfolio.withdrawn_at))
      || !row.content_snapshot.includes(c.proposed_wording)) throw exportUnavailable();
  }
  const additions = row.links.filter((link) => link.claim?.parent_version_id === row.parent_version_id);
  if (additions.length !== 1) throw exportUnavailable();
  const claim = additions[0].claim!;
  // Support both historical M11A creation formats without changing saved text.
  if (![`${claim.source_snapshot}\n\nApproved additional skills\n${claim.proposed_wording}`, `${claim.source_snapshot}\n\n${claim.proposed_wording}`].includes(row.content_snapshot)) throw exportUnavailable();
  // Validate the complete inherited chain, not just the newest skill. A missing
  // ancestor link must not turn its appended wording into unreviewed source text.
  const remaining = row.links.map((link) => link.claim!);
  const roots = remaining.filter((item) => item.parent_version_id === null);
  if (roots.length !== 1) throw exportUnavailable();
  let text = roots[0].source_snapshot;
  while (remaining.length) {
    const next = remaining.filter((item) => item.source_snapshot === text);
    if (next.length !== 1) throw exportUnavailable();
    const item = next[0]; remaining.splice(remaining.indexOf(item), 1);
    const options = [`${text}\n\nApproved additional skills\n${item.proposed_wording}`, `${text}\n\n${item.proposed_wording}`];
    const matches = options.filter((option) => remaining.length ? remaining.some((other) => other.source_snapshot === option) : option === row.content_snapshot);
    if (matches.length !== 1) throw exportUnavailable();
    text = matches[0];
  }
  return { content: row.content_snapshot, name: row.source.original_filename, number: row.version_number };
}
