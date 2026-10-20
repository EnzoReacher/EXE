export const ANALYSIS_ENGINE_VERSION = "local-evidence-1";
export const ANALYSIS_SCHEMA_VERSION = "m2.1";
export const ANALYSIS_PROVIDER_NAME = "local-evidence";
export const ANALYSIS_PROVIDER_VERSION = "1.0.0";

export type FindingStatus = "supported" | "partly_supported" | "unclear" | "missing";
export type EvidenceKind = "cv_claim" | "cv_example";

export type AnalysisFinding = {
  requirement: string;
  status: FindingStatus;
  evidenceKind: EvidenceKind | null;
  evidenceExcerpt: string | null;
  sourceStart: number | null;
  sourceEnd: number | null;
  rationale: string;
  caveat: string;
};

export type AnalysisInput = {
  jobDescription: string;
  cvText: string;
};

export type AnalysisProvider = {
  name: string;
  version: string;
  analyze(input: AnalysisInput): Promise<unknown>;
};

export type AnalysisRunStatus = "processing" | "completed" | "failed";

export type AnalysisRun = {
  id: string;
  ownerId: string;
  cvDocumentId: string;
  targetJobId: string;
  clientRequestId: string;
  status: AnalysisRunStatus;
  providerName: string;
  providerVersion: string;
  schemaVersion: string;
  engineVersion: string;
  promptVersion: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type StoredFinding = AnalysisFinding & { id: string; ordinal: number };

export type AnalysisDetails = {
  run: AnalysisRun;
  roleTitle: string;
  companyName: string | null;
  cvFilename: string;
  findings: StoredFinding[];
};
