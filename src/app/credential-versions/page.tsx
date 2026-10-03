import Link from "next/link";
import CredentialWorkspace from "./workspace";
export const metadata = { title: "Private credential-gated CV versions | EXE", robots: { index: false, follow: false } };
export default function Page() {
  return <main id="main-content" tabIndex={-1} className="analysis-page"><header className="analysis-topbar"><Link className="brand" href="/">EXE</Link><Link className="back-link" href="/assessment">Assessment and sign in</Link></header><div className="analysis-wrap"><p className="eyebrow">OWNER-DIRECTED TECHNICAL PROTOTYPE</p><h1>Credential-gated CV versions</h1><p className="analysis-subtitle">Propose one skill, submit private proof, obtain team-approved expert review, then explicitly accept a new immutable version.</p><CredentialWorkspace /></div></main>;
}
