import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractCvText } from "../src/lib/intake/parser";
import { extractRequirements } from "../src/lib/analysis/requirements";
import { matchRequirements } from "../src/lib/analysis/matcher";
import { validateAnalysisOutput } from "../src/lib/analysis/schema";

describe("committed fictional demo walkthrough expectations", () => {
  it("documents the actual source-grounded evidence states of the upload fixture", async () => {
    const demo = readFileSync("docs/demo/FICTIONAL_DEMO_DATA.md", "utf8");
    const jd = demo.split("## Fictional job description\n\n")[1].split("## Fictional CV content")[0];
    const source = await extractCvText(readFileSync("docs/demo/fixtures/aria-vale-fictional-cv.docx"), "docx");
    const requirements = extractRequirements(jd);
    const findings = validateAnalysisOutput({ findings: matchRequirements(requirements, source) }, requirements, source);
    const examples = [...demo.matchAll(/\| `([^`]+)` \| \*\*([^*]+)\*\*/g)];
    expect(examples).toHaveLength(4);
    for (const [, requirement, label] of examples) {
      expect(findings.find((finding) => finding.requirement === requirement)?.status, requirement)
        .toBe(label.toLowerCase().replaceAll(" ", "_"));
    }
  });
});
