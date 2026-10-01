import Link from "next/link";
import AssessmentForm from "./assessment-form";
import AuthControls from "./auth-controls";

export const metadata = {
  title: "Start an assessment | EXE",
  description: "Prepare your CV and target job for an EXE assessment.",
};

export default function AssessmentPage() {
  return (
    <main className="assessment-page">
      <header className="assessment-topbar">
        <Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link>
        <Link href="/" className="back-link"><span aria-hidden="true">←</span>Back to overview</Link>
      </header>
      <div className="assessment-wrap">
        <div className="assessment-intro">
          <p className="eyebrow">PRIVATE INTAKE <span className="intro-dot" /> MILESTONE 1</p>
          <h1>Save a CV and target job privately.</h1>
          <p>Sign in with Supabase Auth, then securely store a CV and job description for later review.</p>
        </div>
        <AuthControls />
        <div className="stepper" aria-label="Assessment steps">
          <div className="stepper-item current"><span>1</span><div><strong>Secure intake</strong><small>CV and target job</small></div></div><div className="stepper-line" />
          <div className="stepper-item upcoming"><span>2</span><div><strong>Later</strong><small>Review is out of scope</small></div></div><div className="stepper-line" />
          <div className="stepper-item upcoming"><span>3</span><div><strong>Later</strong><small>Actions are out of scope</small></div></div>
        </div>
        <AssessmentForm />
        <div className="assessment-privacy">
          <div className="privacy-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 14v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
          <div><strong>Private intake note</strong><p>CV files and extracted text are stored in a private Supabase bucket and owner-scoped records. No AI provider receives this content in M1. Do not use a real CV until your team has reviewed its Supabase retention and deletion settings.</p></div>
        </div>
        <p className="assessment-disclaimer">EXE provides advisory career guidance. It does not make hiring decisions or guarantee job outcomes.</p>
      </div>
    </main>
  );
}
