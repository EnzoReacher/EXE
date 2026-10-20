import type { StoredFinding } from "@/lib/analysis/types";
import type { GeneratedNextSteps, GeneratedRoadmapItem, RoadmapPriority } from "./types";

const actionFor = (requirement: string, status: StoredFinding["status"]) => {
  if (status === "missing") return `Learn the basics of ${requirement}, then build or complete one small, truthful example you can describe in your CV.`;
  if (status === "partly_supported") return `Strengthen your ${requirement} example by adding the context, contribution, and result you can honestly support.`;
  return `Review whether you have genuine ${requirement} experience. If you do, make the existing CV example clearer; if you do not, treat this as a learning goal.`;
};

const rationaleFor = (requirement: string, status: StoredFinding["status"]) => {
  if (status === "missing") return `The current CV did not contain direct wording for ${requirement}. This is a gap in the document, not proof that you lack the skill.`;
  if (status === "partly_supported") return `The CV contains some related wording for ${requirement}, but the evidence did not cover the whole requirement.`;
  return `The current wording for ${requirement} is ambiguous or may conflict with itself. Check the source before changing the CV.`;
};

function priorityFor(status: StoredFinding["status"], ordinal: number): RoadmapPriority {
  if (status === "missing" && ordinal < 3) return "high";
  if (status === "missing" || status === "unclear") return "medium";
  return "low";
}

/**
 * Builds advisory next steps from saved findings. Generated CV text consists only
 * of traceable source excerpts; it never rewrites an excerpt into a new claim.
 */
export function generateNextSteps(roleTitle: string, findings: StoredFinding[]): GeneratedNextSteps {
  const gaps = findings.filter((finding) => finding.status !== "supported").slice(0, 5);
  const roadmapItems: GeneratedRoadmapItem[] = gaps.map((finding, ordinal) => ({
    ordinal,
    requirement: finding.requirement,
    findingStatus: finding.status,
    priority: priorityFor(finding.status, ordinal),
    action: actionFor(finding.requirement, finding.status),
    rationale: rationaleFor(finding.requirement, finding.status),
  }));

  const evidenceFindings = findings
    .filter((finding) => (finding.status === "supported" || finding.status === "partly_supported")
      && finding.evidenceExcerpt && finding.sourceStart !== null && finding.sourceEnd !== null)
    .slice(0, 6);

  const claims = evidenceFindings.map((finding, ordinal) => ({
    ordinal,
    requirement: finding.requirement,
    claimText: finding.evidenceExcerpt as string,
    sourceExcerpt: finding.evidenceExcerpt as string,
    sourceStart: finding.sourceStart as number,
    sourceEnd: finding.sourceEnd as number,
  }));

  const lines = [
    `${roleTitle} — source-grounded CV draft`,
    "",
    "Target role",
    roleTitle,
    "",
    "Relevant evidence to keep or clarify",
    ...(claims.length
      ? claims.map((claim) => `• Evidence for ${claim.requirement}: ${claim.claimText}`)
      : ["• No supported CV excerpts were available to place in a draft yet. Review your report and add only genuine experience."]),
    "",
    "Review before using",
    "• This draft arranges wording already found in your CV. Check every line, edit it in your own words, and remove anything that is no longer accurate.",
    "• Do not add skills, achievements, dates, employers, or results that you cannot support from your own experience.",
  ];

  return { roadmapItems, draftContent: lines.join("\n"), claims };
}
