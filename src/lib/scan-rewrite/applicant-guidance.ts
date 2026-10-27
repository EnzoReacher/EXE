import type { Finding } from "./domain";
// Legacy findings may address an interviewer. Do not rewrite the stored Scan
// or invent applicant experience; give a safe action tied to its evidence group.
export function applicantNextStep(finding: Pick<Finding, "nextStep" | "group">): string {
  if (!/\b(?:ask|probe|interview|screen|assess|evaluate)\b[^.!?]*\b(?:candidate|applicant|them|their)\b|\b(?:ask|probe)\s+(?:about|whether|for)\b/iu.test(finding.nextStep)) return finding.nextStep;
  return finding.group === "supported"
    ? "Keep this source-supported example clear in your CV and prepare to explain your own contribution."
    : "Clarify your own experience with a specific, truthful example if you have one. If not, leave this claim out of your CV and identify a learning step.";
}
