import type { FindingStatus } from "@/lib/analysis/types";

export const NEXT_STEPS_ENGINE_VERSION = "local-next-steps-1";

export type RoadmapPriority = "high" | "medium" | "low";
export type RoadmapProgress = "not_started" | "in_progress" | "completed";

export type RoadmapItem = {
  id: string;
  ordinal: number;
  requirement: string;
  findingStatus: FindingStatus;
  priority: RoadmapPriority;
  action: string;
  rationale: string;
  progress: RoadmapProgress;
  createdAt: string;
  updatedAt: string;
};

export type DraftClaim = {
  id: string;
  ordinal: number;
  requirement: string;
  claimText: string;
  sourceExcerpt: string;
  sourceStart: number;
  sourceEnd: number;
};

export type CvDraft = {
  id: string;
  version: number;
  content: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claims: DraftClaim[];
};

export type NextStepsDetails = {
  analysisId: string;
  roleTitle: string;
  companyName: string | null;
  cvFilename: string;
  roadmapItems: RoadmapItem[];
  draft: CvDraft;
};

export type GeneratedRoadmapItem = Omit<RoadmapItem, "id" | "progress" | "createdAt" | "updatedAt">;
export type GeneratedDraftClaim = Omit<DraftClaim, "id">;
export type GeneratedNextSteps = {
  roadmapItems: GeneratedRoadmapItem[];
  draftContent: string;
  claims: GeneratedDraftClaim[];
};
