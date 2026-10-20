// Framework only. Keep this empty until each entry meets the documented
// curation standard and has explicit team approval.
export type CuratedSourceType = "university_career_centre" | "official_employer_careers" | "public_internship_portal" | "public_job_board";
export type CuratedSourceApproval = "draft" | "approved" | "inactive";
export type CuratedOpportunitySource = {
  title: string;
  url: string;
  sourceType: CuratedSourceType;
  audienceOrRoleFamily: string;
  locationScope: string;
  checkedAt: string;
  active: boolean;
  sourceNote: string;
  approval: CuratedSourceApproval;
};

export const curatedOpportunitySources: readonly CuratedOpportunitySource[] = [];
