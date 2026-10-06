import WorkspaceHeader from "@/components/workspace-header";
import OpportunitiesWorkspace from "./opportunities-workspace";

export const metadata = { title: "Private opportunities | EXE", description: "Keep private references to job links you found yourself." };

export default function OpportunitiesPage() {
  return <main id="main-content" tabIndex={-1} className="analysis-page">
    <WorkspaceHeader active="/opportunities" />
    <div className="analysis-wrap opportunities-wrap"><p className="eyebrow">PRIVATE OPPORTUNITY TRACKER</p><h1>Opportunities you found</h1><p className="analysis-subtitle">Save a private reference to a job page and track your own process. This is not a recommended job list.</p><OpportunitiesWorkspace /></div>
  </main>;
}
