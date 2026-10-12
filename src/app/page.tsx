import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OwnPath | Turn Your Experience Into Career Value",
  description: "Turn one student project into truthful English CV bullets for a Frontend Intern role.",
};

const findings = [
  { title: "Your contribution", status: "User statement", tone: "supported", detail: "Product listing and search using React and JavaScript." },
  { title: "API integration", status: "User statement", tone: "supported", detail: "REST API data and request error handling." },
  { title: "Git and responsive UI", status: "Not mentioned", tone: "missing", detail: "These are JD requirements, not claims we can add to your experience." },
];

const steps = [
  { number: "01", title: "Describe one project", detail: "Add your actual work and one Frontend Intern JD. No CV required." },
  { number: "02", title: "Clarify your contribution", detail: "Answer a few selected questions and confirm the source facts." },
  { number: "03", title: "Review your English bullets", detail: "Check sources, edit, accept individual bullets and copy your wording." },
];

export default function Home() {
  return (
    <main className="landing-page" id="main-content" tabIndex={-1}>
      <header className="landing-header">
        <Link className="brand landing-brand" href="/" aria-label="OwnPath career readiness home">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span className="brand-copy"><strong>OwnPath</strong><span>Experience Translator</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#example-report">Fictional example</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link className="button button-primary" href="/experience-translator">Try the prototype</Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">OWNPATH EXPERIENCE TRANSLATOR</p>
          <h1 id="landing-title">Turn Your Experience Into Career Value.</h1>
          <p className="landing-intro">
            You have the experience. OwnPath helps you show its value. Describe one project, clarify what you did, and review English CV bullets for a Frontend Intern role.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary" href="/experience-translator">Translate a project</Link>
            <Link className="button button-secondary" href="#example-report">View fictional example</Link>
          </div>
          <p className="landing-caveat">Fictional-data prototype using local templates. It does not score your hiring chances, verify qualifications, or guarantee a job.</p>
        </div>

        <aside className="landing-preview" aria-labelledby="preview-title">
          <div className="landing-preview-heading">
            <div><p className="report-label">FICTIONAL EXAMPLE</p><h2 id="preview-title">Frontend Developer Intern</h2></div>
            <span className="report-status">Example only</span>
          </div>
          <p className="landing-preview-caption">One team project. Only the student’s own contribution becomes a bullet.</p>
          <ul className="landing-finding-list">
            {findings.map((finding) => (
              <li className="landing-finding" key={finding.title}>
                <span className={`finding-indicator ${finding.tone}`} aria-hidden="true" />
                <div><strong>{finding.title}</strong><p>{finding.detail}</p></div>
                <span className={`finding-status ${finding.tone}`}>{finding.status}</span>
              </li>
            ))}
          </ul>
          <p className="landing-preview-footnote">This example contains fictional project and job information. All statements remain unverified.</p>
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
          <p>Each generated bullet shows its source facts. Review every line and approve it yourself before copying. A JD requirement alone never supplies an experience claim.</p>
        </div>
        <Link className="button button-primary" href="/experience-translator">Try Experience Translator</Link>
      </section>

      <footer className="landing-footer">
        <span>OwnPath · Experience Translator</span>
        <span>Prototype status: use fictional data until privacy and retention review is complete.</span>
      </footer>
    </main>
  );
}
