import WorkspaceHeader from "@/components/workspace-header";
import Link from "next/link";
import SavedWorkList from "./saved-work-list";

export const metadata = { title: "Saved work | EXE", description: "Return to your private EXE evidence reports and next steps." };

export default function SavedWorkPage() {
  return <main id="main-content" tabIndex={-1} className="analysis-page">
    <WorkspaceHeader active="/saved-work" />
    <div className="analysis-wrap saved-work-wrap"><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Saved work</h1><p className="analysis-subtitle">Return to your reports, action plans, and CV drafts when you are ready.</p><p><Link className="text-link" href="/credential-versions">Credential-gated CV versions (technical prototype)</Link></p><SavedWorkList /></div>
  </main>;
}
