import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LiveError } from "@/lib/experience-translator/server/validation";
export async function reserveUsage(id: string, action: "scan" | "rewrite", digest: string) {
  const client = await createSupabaseServerClient();
  const ticket = createHash("sha256").update(randomBytes(32)).digest("hex");
  const { data, error } = await client.rpc("ownpath_reserve_ai", { p_id: id, p_action: action, p_ticket_hash: ticket, p_digest: digest });
  if (error || typeof data !== "string" || !["reserved", "duplicate", "busy", "quota", "reconcile", "conflict", "completed_unavailable", "failed_unavailable", "plan_limit"].includes(data)) throw new LiveError("setup", "AI usage controls are unavailable. The owner must configure the current usage migration. Your work is kept.", 503);
  if (["conflict","completed_unavailable","failed_unavailable"].includes(data)) throw new LiveError(data,data==="conflict"?"This request ID belongs to different input. Your work is kept.":data==="completed_unavailable"?"This operation already completed, but its result is no longer available. No second AI call was made. Start a new request deliberately if needed.":"The earlier operation failed. No duplicate call was made. Start a new request deliberately to retry.",409);
  if(data==="plan_limit")throw new LiveError("plan_limit",`Your ${action==='scan'?'Scan':'Rewrite'} allowance for this period is used or reserved. View Plan & billing for the server reset date. Your work is kept.`,429);
  if (data !== "reserved") throw new LiveError(data === "reconcile" ? "reconciliation_required" : "limit", data === "duplicate" ? "This request was already submitted. No second AI request was sent. Your work is kept." : data === "reconcile" ? "Earlier AI requests have uncertain outcomes. The owner must reconcile usage before AI can resume. Your work is kept; editing and exports remain available." : data === "busy" ? "Another AI request may still be running. Wait before another attempt; your work is kept." : "Your AI request limit was reached. Preview default: 12 requests per rolling hour. Try later; your work is kept.", data === "duplicate" ? 409 : 429);
  return async (state: "completed" | "failed" | "unknown") => {
    // A failed acknowledgement leaves a pending hold, never releases uncertain usage.
    const result = await client.rpc("ownpath_finish_ai", { p_id: id, p_ticket_hash: ticket, p_state: state });
    if (result.error || result.data !== true) throw new LiveError("usage_acknowledgement", "Usage acknowledgement could not be confirmed. Your work is kept; ask the owner to check usage before another request.", 503);
  };
}
