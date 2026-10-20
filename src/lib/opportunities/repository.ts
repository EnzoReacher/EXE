import "server-only";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import type { OpportunityLink, OpportunityStatus, OpportunityTargetJob } from "./types";

type OpportunityRow = { id: string; target_job_id: string; source_url: string; company_name: string | null; note: string | null; status: OpportunityStatus; created_at: string; updated_at: string; target_jobs: Array<{ role_title: string }> | null };

const fromRow = (row: OpportunityRow): OpportunityLink => ({
  id: row.id, targetJobId: row.target_job_id, targetRoleTitle: row.target_jobs?.[0]?.role_title ?? "Saved target job", sourceUrl: row.source_url,
  companyName: row.company_name, note: row.note, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
});

export function buildOpportunityLinks(rows: OpportunityRow[]) { return rows.flatMap((row) => row.target_jobs?.[0] ? [fromRow(row)] : []); }

export async function listOwnedOpportunityLinks() {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("opportunity_links").select("id,target_job_id,source_url,company_name,note,status,created_at,updated_at,target_jobs(role_title)").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) throw new IntakeError("opportunities_load_failed", "We could not load your private opportunities. Try again.", 500);
  return buildOpportunityLinks((data ?? []) as OpportunityRow[]);
}

export async function listOwnedOpportunityTargetJobs(): Promise<OpportunityTargetJob[]> {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("target_jobs").select("id,role_title,company_name").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) throw new IntakeError("opportunity_jobs_load_failed", "We could not load your saved target jobs. Try again.", 500);
  return ((data ?? []) as Array<{ id: string; role_title: string; company_name: string | null }>).map((job) => ({ id: job.id, roleTitle: job.role_title, companyName: job.company_name }));
}

export async function createOwnedOpportunityLink(input: { targetJobId: string; sourceUrl: string; companyName: string | null; note: string | null; status: OpportunityStatus }) {
  const { supabase, user } = await requireCurrentUser();
  const { data: targetJob, error: targetError } = await supabase.from("target_jobs").select("id").eq("id", input.targetJobId).eq("owner_id", user.id).maybeSingle();
  if (targetError || !targetJob) throw new IntakeError("target_job_unavailable", "Choose one of your saved target jobs.", 404);
  const { data, error } = await supabase.from("opportunity_links").insert({ owner_id: user.id, target_job_id: input.targetJobId, source_url: input.sourceUrl, company_name: input.companyName, note: input.note, status: input.status }).select("id,target_job_id,source_url,company_name,note,status,created_at,updated_at,target_jobs(role_title)").single();
  if (error || !data) throw new IntakeError("opportunity_create_failed", "We could not save your private opportunity. Try again.", 500);
  const item = fromRow(data as OpportunityRow);
  return item;
}

export async function updateOwnedOpportunityLink(id: string, input: { status: OpportunityStatus; companyName: string | null; note: string | null }) {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("opportunity_links").update({ status: input.status, company_name: input.companyName, note: input.note, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("id,target_job_id,source_url,company_name,note,status,created_at,updated_at,target_jobs(role_title)").maybeSingle();
  if (error) throw new IntakeError("opportunity_update_failed", "We could not update your private opportunity. Try again.", 500);
  if (!data) throw new IntakeError("opportunity_unavailable", "That private opportunity is no longer available.", 404);
  return fromRow(data as OpportunityRow);
}

export async function deleteOwnedOpportunityLink(id: string) {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("opportunity_links").delete().eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) throw new IntakeError("opportunity_delete_failed", "We could not delete your private opportunity. Try again.", 500);
  if (!data) throw new IntakeError("opportunity_unavailable", "That private opportunity is no longer available.", 404);
}
