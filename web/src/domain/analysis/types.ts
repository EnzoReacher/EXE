export type EvidenceStatus = "supported" | "partial" | "unclear" | "missing";

export interface Requirement {
  name: string;
  terms: readonly string[];
}

export interface RequirementFinding {
  requirement: string;
  status: EvidenceStatus;
  evidence: string | null;
}

export interface AnalysisSummary {
  supported: number;
  partial: number;
  unclear: number;
  missing: number;
  total: number;
}

export interface AnalysisReport {
  roleTitle: string;
  findings: RequirementFinding[];
  summary: AnalysisSummary;
  actions: string[];
}

export interface AnalysisInput {
  cvText: string;
  jobDescription: string;
  roleTitle: string;
}
