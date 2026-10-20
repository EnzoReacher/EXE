import { describe, expect, it } from "vitest";
import { generateNextSteps } from "./generator";
import type { StoredFinding } from "@/lib/analysis/types";

const finding = (patch: Partial<StoredFinding>): StoredFinding => ({
  id: "finding-1",
  ordinal: 0,
  requirement: "SQL",
  status: "supported",
  evidenceKind: "cv_example",
  evidenceExcerpt: "Built a fictional SQL dashboard project.",
  sourceStart: 0,
  sourceEnd: 39,
  rationale: "Fictional test evidence.",
  caveat: "Fictional test caveat.",
  ...patch,
});

describe("M3 next-step generation", () => {
  it("creates practical actions only for non-supported findings and keeps their links visible", () => {
    const result = generateNextSteps("Fictional data analyst", [
      finding({ requirement: "SQL", status: "supported" }),
      finding({ id: "finding-2", requirement: "Python", status: "partly_supported" }),
      finding({ id: "finding-3", requirement: "Data visualisation", status: "missing", evidenceExcerpt: null, sourceStart: null, sourceEnd: null, evidenceKind: null }),
      finding({ id: "finding-4", requirement: "Stakeholder communication", status: "unclear", evidenceExcerpt: null, sourceStart: null, sourceEnd: null, evidenceKind: null }),
    ]);

    expect(result.roadmapItems.map((item) => item.requirement)).toEqual(["Python", "Data visualisation", "Stakeholder communication"]);
    expect(result.roadmapItems[0].action).toContain("Python");
    expect(result.roadmapItems[1].priority).toBe("high");
    expect(result.roadmapItems[2].rationale).toContain("ambiguous");
  });

  it("uses only traceable supported or partial excerpts in the generated draft", () => {
    const supported = "Built a fictional SQL dashboard project.";
    const partial = "Python coursework in a fictional project.";
    const result = generateNextSteps("Fictional data analyst", [
      finding({ requirement: "SQL", status: "supported", evidenceExcerpt: supported, sourceStart: 2, sourceEnd: 2 + supported.length }),
      finding({ id: "finding-2", requirement: "Python", status: "partly_supported", evidenceExcerpt: partial, sourceStart: 60, sourceEnd: 60 + partial.length }),
      finding({ id: "finding-3", requirement: "Kubernetes", status: "missing", evidenceExcerpt: null, sourceStart: null, sourceEnd: null, evidenceKind: null }),
      finding({ id: "finding-4", requirement: "Leadership", status: "unclear", evidenceExcerpt: "I am not experienced with leadership.", sourceStart: 100, sourceEnd: 136 }),
    ]);

    expect(result.claims.map((claim) => claim.claimText)).toEqual([supported, partial]);
    expect(result.draftContent).toContain(supported);
    expect(result.draftContent).toContain(partial);
    expect(result.draftContent).not.toContain("Kubernetes");
    expect(result.draftContent).not.toContain("not experienced with leadership");
  });
});
