import Link from "next/link";
import OpportunitiesWorkspace from "./opportunities-workspace";

export const metadata = { title: "Private opportunities | EXE", description: "Keep private references to job links you found yourself." };

export default function OpportunitiesPage() {
  return <main id="main-content" tabIndex={-1} className="analysis-page">
    <header className="analysis-topbar"><Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link><div className="topbar-links"><Link href="/saved-work" className="back-link">Saved work</Link><Link href="/assessment" className="back-link"><span aria-hidden="true">←</span>Assessment workspace</Link></div></header>
    <div className="analysis-wrap opportunities-wrap"><p className="eyebrow">PRIVATE OPPORTUNITY TRACKER</p><h1>Opportunities you found</h1><p className="analysis-subtitle">Save a private reference to a job page and track your own process. This is not a recommended job list.</p><OpportunitiesWorkspace /></div>
  </main>;
}
