import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview | EXE" };

const findings = [
  { title: "SQL querying", status: "Partly supported", tone: "partial", evidence: "Coursework is listed, but no project example is shown." },
  { title: "Data visualization", status: "Supported", tone: "supported", evidence: "A dashboard project is described in the CV." },
  { title: "Experiment design", status: "Missing", tone: "missing", evidence: "The example CV does not mention an experiment or test. This does not mean the person lacks that skill." },
  { title: "Stakeholder communication", status: "Unclear", tone: "unclear", evidence: "The example CV mentions teamwork without enough detail to explain this requirement." },
];

const steps = [
  { number: "01", title: "Sign in and add a fictional CV", detail: "Use the local demo account and a PDF or DOCX file, up to 5 MiB." },
  { number: "02", title: "Choose a role", detail: "Paste a job description to set the target." },
  { number: "03", title: "See the evidence", detail: "Understand what is supported and what to build next." },
  { number: "04", title: "Review roadmap and draft", detail: "Choose actions, check the source text, and review every edit before accepting it." },
  { number: "05", title: "Return to saved work", detail: "Your saved reports and drafts can be reopened later in your signed-in workspace." },
];

export default function Home() {
  return (
    <div className="workspace-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link className="brand" href="/" aria-label="EXE career readiness home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace">
          <a className="nav-item active" href="#main-content" aria-current="page"><span className="nav-icon nav-icon-home" aria-hidden="true" />Overview</a>
          <a className="nav-item" href="#how-it-works"><span className="nav-icon nav-icon-flow" aria-hidden="true" />How it works</a>
          <a className="nav-item" href="#example-report"><span className="nav-icon nav-icon-report" aria-hidden="true" />Example report</a>
          <Link className="nav-item" href="/saved-work"><span className="nav-icon nav-icon-report" aria-hidden="true" />Saved work</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini-icon" aria-hidden="true">✓</div>
          <p className="privacy-mini-title">Your experience stays yours</p>
          <p className="privacy-mini-copy">CV sharing will always be an action you control.</p>
          <span className="prototype-label"><span />Local prototype</span>
        </div>
      </aside>

      <main className="main-column" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>Overview</strong></div>
          <div className="topbar-right"><Link className="saved-work-link" href="/saved-work">Saved work</Link><span className="build-badge"><span />Build in progress</span><span className="avatar-placeholder" role="img" aria-label="Demo workspace">D</span></div>
        </header>
        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR CAREER WORKSPACE</p>
              <h1>Make your next application a clearer one.</h1>
               <p className="welcome-copy">Compare CV wording with one job description, check the evidence, and choose what to work on next. This internal prototype uses fictional data only; do not upload your real CV.</p>
            </div>
            <Link href="/assessment" className="button button-primary">Start an assessment <span aria-hidden="true">↗</span></Link>
          </section>

          <section className="hero-panel" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="sparkle" aria-hidden="true">✳</span>FROM CV TO NEXT STEP</div>
              <h2 id="hero-title">Know what to strengthen before you apply.</h2>
               <p>Supported, Partly supported, Unclear, and Missing describe wording found in the submitted CV. They do not verify skills, predict hiring, or guarantee employment.</p>
               <Link className="hero-link" href="/assessment">Add a fictional CV and job description <span aria-hidden="true">→</span></Link>
               <div className="hero-note"><span className="check-ring" aria-hidden="true">✓</span>Check each proposed draft statement against its source before using it.</div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
              <div className="visual-center"><span className="visual-doc-icon">CV</span><span>Your experience</span></div>
              <div className="visual-node node-one"><span className="node-dot teal" />Evidence</div>
              <div className="visual-node node-two"><span className="node-dot amber" />Skill gap</div>
              <div className="visual-node node-three"><span className="node-dot blue" />Next step</div>
              <span className="visual-spark spark-one">✦</span><span className="visual-spark spark-two">·</span>
            </div>
          </section>

          <section className="content-grid" id="how-it-works">
            <div className="section-card process-card">
               <div className="section-heading"><div><p className="eyebrow">YOUR EXISTING WORKFLOW</p><h2>How your assessment works</h2></div><span className="small-step-count">5 steps</span></div>
               <ol className="process-list">
                 {steps.map((step) => <li className="process-step" key={step.number}><span className="step-number" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}
               </ol>
              <Link href="/assessment" className="text-link">Start with your CV <span aria-hidden="true">→</span></Link>
            </div>
            <div className="section-card promise-card">
              <div className="promise-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19 6v5.1c0 4.5-3 7.8-7 9.4-4-1.6-7-4.9-7-9.4V6l7-2.5Z" stroke="currentColor" strokeWidth="1.6"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <p className="eyebrow">BUILT AROUND YOUR EVIDENCE</p><h2>Advice you can check.</h2>
              <p className="promise-copy">Each finding should point back to something in your CV—or say clearly when the evidence is missing.</p>
              <div className="promise-rule" /><div className="promise-foot"><span className="status-dot" />You review every CV change before using it.</div>
            </div>
          </section>

          <section className="example-section" id="example-report">
            <div className="example-heading"><div><p className="eyebrow">A LOOK AT THE RESULT</p><h2>Clear findings, with the evidence beside them.</h2></div><span className="fictional-tag"><span className="tag-star">✦</span>Fictional example</span></div>
            <div className="report-preview">
              <div className="report-summary"><div className="report-role-icon" aria-hidden="true">DA</div><div><p className="report-label">TARGET ROLE</p><h3>Data Analyst Intern</h3><p className="report-muted">Example CV · Example job description</p></div><span className="report-status">Example analysis</span></div>
              <div className="finding-list">
                {findings.map((finding) => <article className="finding-row" key={finding.title}><div className="finding-main"><span className={`finding-indicator ${finding.tone}`} aria-hidden="true" /><div><h4>{finding.title}</h4><p>{finding.evidence}</p></div></div><span className={`finding-status ${finding.tone}`}>{finding.status}</span></article>)}
              </div>
              <div className="report-footnote"><span aria-hidden="true">ⓘ</span>This fictional example demonstrates evidence labels; it is not based on your CV.</div>
            </div>
          </section>
          <footer className="page-footer"><span>EXE · Career readiness platform</span><span>Fictional preview · M2 reports use local wording checks; no AI provider is connected</span></footer>
        </div>
      </main>
    </div>
  );
}
