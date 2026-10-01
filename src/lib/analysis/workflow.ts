import "server-only";
import { extractRequirements } from "./requirements";
import { localEvidenceProvider } from "./provider";
import { validateAnalysisOutput } from "./schema";
import type { AnalysisInput, AnalysisProvider } from "./types";
import { failAnalysisRun, saveAnalysisFindings } from "./repository";

export async function analyzeAndValidate(input: AnalysisInput, provider: AnalysisProvider = localEvidenceProvider) {
  const requirements = extractRequirements(input.jobDescription);
  const output = await provider.analyze(input);
  return validateAnalysisOutput(output, requirements, input.cvText);
}

export async function processAnalysisRun(
  runId: string,
  input: AnalysisInput,
  provider: AnalysisProvider = localEvidenceProvider,
  persistence = { save: saveAnalysisFindings, fail: failAnalysisRun },
) {
  try {
    const findings = await analyzeAndValidate(input, provider);
    await persistence.save(runId, findings);
    return "completed" as const;
  } catch {
    await persistence.fail(runId);
    return "failed" as const;
  }
}
