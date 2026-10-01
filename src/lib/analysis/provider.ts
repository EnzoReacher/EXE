import "server-only";
import { extractRequirements } from "./requirements";
import { matchRequirements } from "./matcher";
import { ANALYSIS_PROVIDER_NAME, ANALYSIS_PROVIDER_VERSION, type AnalysisProvider } from "./types";

/** No CV or job content leaves the server in M2. Replace only after a provider and its data handling are approved. */
export const localEvidenceProvider: AnalysisProvider = {
  name: ANALYSIS_PROVIDER_NAME,
  version: ANALYSIS_PROVIDER_VERSION,
  async analyze({ jobDescription, cvText }) {
    const requirements = extractRequirements(jobDescription);
    return { findings: matchRequirements(requirements, cvText) };
  },
};
