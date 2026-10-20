import type { Claim, Version } from "./types";

export type HistoryFilter = "all" | "action" | "waiting" | "history";
export const STATE_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Waiting for expert", needs_information: "Needs more information",
  rejected: "Rejected", approved: "Approved", version_created: "Candidate version ready",
  withdrawn: "Evidence withdrawn", candidate: "Candidate — not active", accepted: "Accepted — active",
  superseded: "Historical — superseded", evidence_withdrawn: "Evidence withdrawn — not currently approved",
};
const claimGroups: Record<Exclude<HistoryFilter, "all">, string[]> = {
  action: ["draft", "approved", "needs_information", "rejected"],
  waiting: ["submitted"], history: ["version_created", "withdrawn"],
};
const versionGroups: Record<Exclude<HistoryFilter, "all">, string[]> = {
  action: ["candidate"], waiting: [], history: ["accepted", "superseded", "rejected", "evidence_withdrawn"],
};
export function filterHistory<T extends Claim | Version>(items: T[], sourceCvId: string, filter: HistoryFilter, kind: "claim" | "version"): T[] {
  const groups = kind === "claim" ? claimGroups : versionGroups;
  return items.filter((item) => (!sourceCvId || item.sourceCvId === sourceCvId) && (filter === "all" || groups[filter].includes(item.state)));
}
export function claimNextStep(state: string): string {
  return ({
    draft: "Next: submit this saved draft to the selected expert. Uploading proof alone does not submit it.",
    submitted: "Next: wait for the assigned expert. Refresh to check for a decision; this claim has not added a skill to your CV.",
    approved: "Next: create a read-only candidate, review the before and after text, then decide whether to accept it.",
    needs_information: "Next: read the explanation and prepare a new claim with revised proof or wording. This decision stays in history.",
    rejected: "Next: read the explanation. If you revise the proof or wording, submit a new claim for a new review.",
    version_created: "Next: review the candidate in version history. Expert approval and owner acceptance are separate steps.",
    withdrawn: "This claim cannot add a skill. Use current evidence in a new claim if you want another review.",
  } as Record<string, string>)[state] ?? "Refresh to check the current status before taking an action.";
}
