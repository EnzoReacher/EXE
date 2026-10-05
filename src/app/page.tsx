import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EXE | Understand your CV for a target role",
  description: "Compare CV wording with a target job and review evidence-based next steps.",
};

const findings = [
  { title: "Data visualization", status: "Supported", tone: "supported", detail: "A dashboard project is described in the example CV." },
  { title: "SQL querying", status: "Partly supported", tone: "partial", detail: "Coursework is listed, but no project example is shown." },
  { title: "Experiment design", status: "Not found in this CV", tone: "missing", detail: "This describes the submitted wording; it does not mean the person lacks the skill." },
];

const steps = [
  { number: "01", title: "Add a CV and target role", detail: "Choose one CV and paste one job description." },
  { number: "02", title: "Review the evidence", detail: "See which requirements the wording supports, partly supports, or does not mention." },
  { number: "03", title: "Choose a next step", detail: "Use the roadmap and edit any CV draft yourself before using it." },
];

export default function Home() {
  return (
    <main className="landing-page" id="main-content" tabIndex={-1}>
      <header className="landing-header">
        <Link className="brand landing-brand" href="/" aria-label="EXE career readiness home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#example-report">Example report</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link className="button button-primary" href="/sign-up">Create account</Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">A clearer way to review one application</p>
          <h1 id="landing-title">See how your CV connects to a target role.</h1>
          <p className="landing-intro">
            Compare the wording in your CV with one job description. Review what is supported, what is unclear, and what you might work on next.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary" href="/sign-up">Create account</Link>
            <Link className="button button-secondary" href="#example-report">View fictional example</Link>
          </div>
          <p className="landing-caveat">EXE provides advisory guidance. It does not score your hiring chances, verify qualifications, or guarantee a job.</p>
        </div>

        <aside className="landing-preview" aria-labelledby="preview-title">
          <div className="landing-preview-heading">
            <div><p className="report-label">FICTIONAL EXAMPLE</p><h2 id="preview-title">Data Analyst Intern</h2></div>
            <span className="report-status">Example only</span>
          </div>
          <p className="landing-preview-caption">A finding describes wording in a sample CV, not a verified skill.</p>
          <ul className="landing-finding-list">
            {findings.map((finding) => (
              <li className="landing-finding" key={finding.title}>
                <span className={`finding-indicator ${finding.tone}`} aria-hidden="true" />
                <div><strong>{finding.title}</strong><p>{finding.detail}</p></div>
                <span className={`finding-status ${finding.tone}`}>{finding.status}</span>
              </li>
            ))}
          </ul>
          <p className="landing-preview-footnote">This example contains fictional CV and job information.</p>
        </aside>
      </section>

      <section className="landing-process" id="how-it-works" aria-labelledby="process-title">
        <div className="landing-section-heading">
          <p className="eyebrow">THREE STEPS</p>
          <h2 id="process-title">Start with one job application.</h2>
        </div>
        <ol className="landing-steps">
          {steps.map((step) => (
            <li className="landing-step" key={step.number}>
              <span className="landing-step-number" aria-hidden="true">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-example" id="example-report" aria-labelledby="example-title">
        <div>
          <p className="eyebrow">KEEP CONTROL OF YOUR CV</p>
          <h2 id="example-title">Check every suggestion before you use it.</h2>
          <p>EXE keeps each finding connected to the wording it came from. It will not add a skill or qualification just because a job description asks for it.</p>
        </div>
        <Link className="button button-primary" href="/sign-up">Create your account</Link>
      </section>

      <footer className="landing-footer">
        <span>EXE · Career readiness</span>
        <span>Prototype status: use fictional data until privacy and retention review is complete.</span>
      </footer>
    </main>
  );
}
