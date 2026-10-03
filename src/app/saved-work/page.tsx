import Link from "next/link";
import SavedWorkList from "./saved-work-list";

export const metadata = { title: "Saved work | EXE", description: "Return to your private EXE evidence reports and next steps." };

export default function SavedWorkPage() {
  return <main id="main-content" tabIndex={-1} className="analysis-page">
    <header className="analysis-topbar"><Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link><div className="topbar-links"><Link href="/opportunities" className="back-link">Opportunities</Link><Link href="/assessment" className="back-link"><span aria-hidden="true">←</span>Assessment workspace</Link></div></header>
    <div className="analysis-wrap saved-work-wrap"><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Saved work</h1><p className="analysis-subtitle">Return to your reports, action plans, and CV drafts when you are ready.</p><p><Link className="text-link" href="/credential-versions">Credential-gated CV versions (technical prototype)</Link></p><SavedWorkList /></div>
  </main>;
}
