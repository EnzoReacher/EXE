import Link from "next/link";
import AssessmentForm from "./assessment-form";

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
          <p className="eyebrow">NEW ASSESSMENT <span className="intro-dot" /> STEP 1 OF 3</p>
          <h1>Choose a CV and a role to work toward.</h1>
          <p>Start with a CV you are comfortable using and the job description you want to understand.</p>
        </div>
        <div className="stepper" aria-label="Assessment steps">
          <div className="stepper-item current"><span>1</span><div><strong>Prepare</strong><small>CV and target job</small></div></div><div className="stepper-line" />
          <div className="stepper-item upcoming"><span>2</span><div><strong>Review</strong><small>Evidence and gaps</small></div></div><div className="stepper-line" />
          <div className="stepper-item upcoming"><span>3</span><div><strong>Take action</strong><small>Roadmap and CV draft</small></div></div>
        </div>
        <AssessmentForm />
        <div className="assessment-privacy">
          <div className="privacy-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 14v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
          <div><strong>Prototype privacy note</strong><p>No files or job details are uploaded, stored, or analyzed yet. The next build part will add private processing and deletion controls before real CV data is used.</p></div>
        </div>
        <p className="assessment-disclaimer">EXE provides advisory career guidance. It does not make hiring decisions or guarantee job outcomes.</p>
      </div>
    </main>
  );
}
