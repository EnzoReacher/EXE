import WorkspaceHeader from "@/components/workspace-header";
import AssessmentForm from "./assessment-form";
import AuthControls from "./auth-controls";

export const metadata = {
  title: "Start an assessment | EXE",
  description: "Prepare your CV and target job for an EXE assessment.",
};

export default function AssessmentPage() {
  return (
    <main id="main-content" tabIndex={-1} className="assessment-page">
      <WorkspaceHeader active="/assessment" />
      <div className="assessment-wrap">
        <div className="assessment-intro">
          <p className="eyebrow">ASSESSMENT WORKSPACE</p>
          <h1>Save a CV and target job privately.</h1>
          <p>Save a CV and target job privately, then review an evidence report based on wording in the CV.</p>
        </div>
        <AuthControls />
        <div className="stepper" aria-label="Assessment steps">
          <div className="stepper-item current"><span>1</span><div><strong>Private intake</strong><small>CV and target job</small></div></div><div className="stepper-line" />
          <div className="stepper-item available"><span>2</span><div><strong>Evidence report</strong><small>Local text prototype</small></div></div><div className="stepper-line" />
          <div className="stepper-item available"><span>3</span><div><strong>Next steps</strong><small>Roadmap and CV draft</small></div></div>
        </div>
        <AssessmentForm />
        <div className="assessment-privacy">
          <div className="privacy-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 14v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
          <div><strong>Before you upload</strong><p>This prototype checks wording locally; no AI provider receives your CV or job text. Files and extracted text are stored in your account’s Supabase workspace. Findings can miss meaning, and CV claims are not independently verified. Use sample information, not a real CV, until your team has reviewed storage backups, retention, and deletion settings.</p></div>
        </div>
        <p className="assessment-disclaimer">EXE provides advisory career guidance. It does not make hiring decisions or guarantee job outcomes.</p>
      </div>
    </main>
  );
}
