export const OPPORTUNITY_STATUSES = ["saved", "preparing", "applied", "closed", "dismissed"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export type OpportunityLink = {
  id: string;
  targetJobId: string;
  targetRoleTitle: string;
  sourceUrl: string;
  companyName: string | null;
  note: string | null;
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityTargetJob = { id: string; roleTitle: string; companyName: string | null };
