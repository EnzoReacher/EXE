import Link from "next/link";

const findings = [
  { title: "SQL querying", status: "Partial support", tone: "partial", evidence: "Coursework is listed, but no project example is shown." },
  { title: "Data visualization", status: "Supported", tone: "supported", evidence: "A dashboard project is described in the CV." },
  { title: "Experiment design", status: "No evidence found", tone: "missing", evidence: "The example CV does not mention an experiment or test." },
];

const steps = [
  { number: "01", title: "Add your CV", detail: "Start with the experience you already have." },
  { number: "02", title: "Choose a role", detail: "Paste a job description to set the target." },
  { number: "03", title: "See the evidence", detail: "Understand what is supported and what to build next." },
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
        <nav className="side-nav">
          <a className="nav-item active" href="#overview" aria-current="page"><span className="nav-icon nav-icon-home" aria-hidden="true" />Overview</a>
          <a className="nav-item" href="#how-it-works"><span className="nav-icon nav-icon-flow" aria-hidden="true" />How it works</a>
          <a className="nav-item" href="#example-report"><span className="nav-icon nav-icon-report" aria-hidden="true" />Example report</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini-icon" aria-hidden="true">✓</div>
          <p className="privacy-mini-title">Your experience stays yours</p>
          <p className="privacy-mini-copy">CV sharing will always be an action you control.</p>
          <span className="prototype-label"><span />Local prototype</span>
        </div>
      </aside>

      <main className="main-column" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>Overview</strong></div>
          <div className="topbar-right"><span className="build-badge"><span />Build in progress</span><span className="avatar-placeholder" role="img" aria-label="Demo workspace">D</span></div>
        </header>
        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR CAREER WORKSPACE</p>
              <h1>Make your next application a clearer one.</h1>
              <p className="welcome-copy">See how your CV lines up with a role, understand the evidence behind each gap, and choose a practical next step.</p>
            </div>
            <Link href="/assessment" className="button button-primary">Start an assessment <span aria-hidden="true">↗</span></Link>
          </section>

          <section className="hero-panel" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="sparkle" aria-hidden="true">✳</span>FROM CV TO NEXT STEP</div>
              <h2 id="hero-title">Know what to strengthen before you apply.</h2>
              <p>EXE connects a target job to the experience already in your CV. It helps you separate CV-supported evidence from skills that need more support.</p>
              <Link className="hero-link" href="/assessment">Prepare a job match <span aria-hidden="true">→</span></Link>
              <div className="hero-note"><span className="check-ring" aria-hidden="true">✓</span>Your CV draft stays grounded in your real experience.</div>
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
              <div className="section-heading"><div><p className="eyebrow">A SIMPLE FIRST STEP</p><h2>How your first assessment works</h2></div><span className="small-step-count">3 steps</span></div>
              <div className="process-list">
                {steps.map((step) => <div className="process-step" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div><span className="step-arrow" aria-hidden="true">↗</span></div>)}
              </div>
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
          <footer className="page-footer"><span>EXE · Career readiness platform</span><span>Prototype data only · No CVs are uploaded or analyzed yet</span></footer>
        </div>
      </main>
    </div>
  );
}
