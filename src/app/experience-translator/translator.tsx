"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { confirmFacts, prepareSession, TranslatorError } from "@/lib/experience-translator/engine";
import { generateBullets } from "@/lib/experience-translator/adapter";
import { goldenIntake } from "@/lib/experience-translator/fixtures";
import { acceptedText, editBullet, mergeCandidates } from "@/lib/experience-translator/review";
import type { Answers, PreparedSession, ReviewedBullet } from "@/lib/experience-translator/types";

type Screen = "intake" | "interview" | "bullets" | "review";
const steps = ["Your project", "A few details", "Your bullets", "Review & copy"];

export default function Translator() {
  const [step, setStep] = useState<Screen>("intake");
  const [project, setProject] = useState(""); const [jd, setJd] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [session, setSession] = useState<PreparedSession | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [factsReady, setFactsReady] = useState(false);
  const [bullets, setBullets] = useState<ReviewedBullet[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null); const generation = useRef(0); const generating = useRef(false);
  const currentIndex = ["intake", "interview", "bullets", "review"].indexOf(step);
  const approved = acceptedText(bullets);
  function navigate(next: Screen) { setStep(next); setError(""); setNotice(""); requestAnimationFrame(() => heading.current?.focus()); }
  function start(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      const prepared = prepareSession({ project, jd });
      setSession(prepared); setAnswers({}); setSelected([]); setBullets([]); setFactsReady(prepared.questions.length === 0); navigate("interview");
    } catch (e) { setError(e instanceof TranslatorError ? e.message : "Check the project and job description."); }
  }
  function reviewFacts() {
    try { const prepared = prepareSession({ project, jd }, answers); setSession(prepared); setSelected([]); setFactsReady(true); setError(""); setNotice("Review each source fact. Select only facts that describe your own work."); }
    catch (e) { setError(e instanceof TranslatorError ? e.message : "Check your answers."); }
  }
  function updateAnswer(id: keyof Answers, value: string) { setAnswers((a) => ({ ...a, [id]: value })); setFactsReady(false); setSelected([]); }
  async function generate() {
    if (!session || generating.current) return;
    generating.current = true; setBusy(true); setError(""); setNotice("");
    const request = ++generation.current;
    try {
      const confirmed = confirmFacts(session, selected);
      const result = await generateBullets(confirmed);
      if (request !== generation.current) return;
      setSession(confirmed); setBullets((old) => mergeCandidates(result, old)); navigate("bullets");
    } catch (e) { if (request === generation.current) setError(e instanceof TranslatorError ? e.message : "We could not create checked bullets. Your inputs and edits are kept."); }
    finally { if (request === generation.current) { setBusy(false); generating.current = false; } }
  }
  function clear() {
    generation.current++; generating.current = false; setBusy(false); setProject(""); setJd(""); setAnswers({}); setSession(null); setSelected([]); setBullets([]); setFactsReady(false); navigate("intake"); setNotice("This session was cleared. No project or bullet was saved by the prototype.");
  }
  async function copy() {
    if (!approved) return;
    try { await navigator.clipboard.writeText(approved); setNotice("Accepted bullets copied."); setError(""); }
    catch { setError("Clipboard access was unavailable. Select the accepted text below and copy it manually."); }
  }
  function download() {
    if (!approved) return;
    const url = URL.createObjectURL(new Blob([approved], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "ownpath-accepted-bullets.txt"; anchor.click(); URL.revokeObjectURL(url);
  }
  function loadExample() { setProject(goldenIntake.project); setJd(goldenIntake.jd); setError(""); setNotice("Fictional example loaded. Answer the interview with fictional contributions."); }

  return <main className="translator-page" id="main-content" tabIndex={-1}>
    <header className="translator-header"><Link className="brand" href="/" aria-label="OwnPath home"><span className="brand-mark" aria-hidden="true">O</span><span className="brand-copy"><strong>OwnPath</strong><span>Experience Translator</span></span></Link><span className="translator-prototype">Fictional-data prototype</span></header>
    <div className="translator-wrap">
      <div className="translator-title"><p className="eyebrow">ONE PROJECT. YOUR CONTRIBUTION.</p><h1>Turn Your Experience Into Career Value.</h1><p>You have the experience. OwnPath helps you show its value.</p></div>
      <ol className="translator-steps" aria-label="Translation progress">{steps.map((label, index) => <li key={label} aria-current={index === currentIndex ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      <section className="translator-card" aria-busy={busy}>
        <h2 ref={heading} tabIndex={-1}>{step === "intake" ? "Start with one project" : step === "interview" ? "Make your contribution clear" : step === "bullets" ? "Check every suggested bullet" : "Your accepted wording"}</h2>
        {error && <p className="translator-error" role="alert">{error}</p>}
        {notice && <p className="translator-notice" role="status">{notice}</p>}
        {busy && <p role="status">Creating checked suggestions…</p>}

        {step === "intake" && <form onSubmit={start} noValidate>
          <p className="translator-subtitle">For IT students applying for Frontend Developer Intern. A CV is not required. Use fictional data for this demo.</p>
          <div className="translator-fields"><div><label htmlFor="project">Your project or experience</label><p id="project-help">What did you build, and what did you personally do? Vietnamese or English; 30–6,000 characters.</p><textarea id="project" value={project} onChange={(e) => setProject(e.target.value)} rows={7} maxLength={6000} aria-describedby="project-help" placeholder="Em làm website bán hàng bằng React trong nhóm 4 người…" /></div>
          <div><label htmlFor="jd">Frontend Intern job description</label><p id="jd-help">Include the role title and actual requirements; 30–15,000 characters.</p><textarea id="jd" value={jd} onChange={(e) => setJd(e.target.value)} rows={7} maxLength={15000} aria-describedby="jd-help" placeholder="Frontend Developer Intern — Requirements: React, REST API…" /></div></div>
          <div className="translator-actions"><button type="submit" className="button button-primary">Continue to details</button><button type="button" className="button button-secondary" onClick={loadExample}>Load fictional example</button></div>
        </form>}

        {step === "interview" && session && <>
          <p className="translator-subtitle">Answer only what you know. Empty answers are skipped. The prototype recognizes a small set of frontend actions; it may miss wording. Use short separate sentences.</p>
          {session.questions.length === 0 && <p>We found enough personal project details to review. No repeated questions are needed.</p>}
          <div className="translator-questions">{session.questions.map((q) => <div key={q.id}><label htmlFor={`question-${q.id}`}>{q.text}</label><p id={`hint-${q.id}`}>{q.hint}</p><textarea id={`question-${q.id}`} aria-describedby={`hint-${q.id}`} rows={2} maxLength={1000} value={answers[q.id] ?? ""} onChange={(e) => updateAnswer(q.id, e.target.value)} disabled={busy} /><button className="translator-text-button" type="button" aria-label={`Skip this question: ${q.text}`} disabled={busy} onClick={() => updateAnswer(q.id, "")}>Skip this question</button></div>)}</div>
          {session.questions.length > 0 && <button className="button button-secondary" type="button" disabled={busy} onClick={reviewFacts}>Review source facts</button>}
          {factsReady && <fieldset className="translator-facts" disabled={busy}><legend>Confirm facts about your own work</legend><p>All facts are your statements, independently unverified. A repo link does not verify them.</p>
            {session.facts.length === 0 && <p>No personal implementation facts were recognized. Add your contribution and actual technologies above; skipped answers are never filled in for you.</p>}
            {session.facts.map((f) => <label className="translator-fact" key={f.id}><input type="checkbox" checked={selected.includes(f.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, f.id] : ids.filter((id) => id !== f.id))} /><span><strong>{f.label}</strong><span className="translator-source">{session.sources.find((s) => s.id === f.sourceId)?.label}: “{f.excerpt}”</span></span></label>)}
          </fieldset>}
          <div className="translator-actions"><button className="button button-primary" type="button" disabled={!factsReady || !selected.length || busy} onClick={() => void generate()}>Create CV bullets</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => navigate("intake")}>Back to intake</button></div>
        </>}

        {step === "bullets" && session && <>
          <p className="translator-subtitle">Generated wording uses only the selected facts. Your statements remain unverified. Confirm each bullet is accurate before copying.</p>
          {bullets.length === 0 && <div className="translator-empty"><h3>More specific facts are needed</h3><p>No relevant implemented action and technology could form a checked bullet. Describe what you personally built. We will not add a skill from the JD to fill the gap.</p></div>}
          <div className="translator-bullets">{bullets.map((b, index) => <article className={`translator-bullet ${b.rejected ? "translator-rejected" : ""}`} key={b.id}>
            <div className="translator-bullet-heading"><h3>Bullet {index + 1}</h3><span>{b.rejected ? "Rejected" : b.accepted ? "Accepted by you" : "Needs your review"}</span></div>
            <label htmlFor={`bullet-${b.id}`}>English CV wording {index + 1}</label><textarea id={`bullet-${b.id}`} rows={3} maxLength={500} disabled={busy || b.rejected} value={b.currentText} onChange={(e) => setBullets((old) => old.map((item) => item.id === b.id ? editBullet(item, e.target.value) : item))} />
            {b.detached ? <p className="translator-edit-note">Your previous edit was kept. The current fact set no longer supports the original suggestion. This is your own wording without current source links; revise or reject it and confirm it yourself.</p> : b.edited && <p className="translator-edit-note">Your edited wording. Original sources below apply to the generated version, not to added claims. Check the edit yourself.</p>}
            <details><summary>{b.edited ? "Original suggestion and source context" : "Source facts and JD relevance"}</summary>{b.edited && <p>Original: {b.text}</p>}<ul>{b.factIds.map((id) => { const f = session.facts.find((fact) => fact.id === id); return <li key={id}><strong>{f?.label}</strong>: “{f?.excerpt}” <span>— user statement, unverified</span></li>; })}</ul><p>Relevant to JD: {b.requirementIds.map((id) => session.requirements.find((r) => r.id === id)?.label).join(", ")}. These requirements guide relevance; they do not supply experience facts.</p></details>
            <div className="translator-bullet-actions"><label><input type="checkbox" checked={b.accepted} disabled={busy || b.rejected || b.currentText.trim().length < 5} onChange={(e) => setBullets((old) => old.map((item) => item.id === b.id ? { ...item, accepted: e.target.checked } : item))} /> I confirm bullet {index + 1} accurately describes my work</label><button type="button" className="translator-text-button" disabled={busy} onClick={() => setBullets((old) => old.map((item) => item.id === b.id ? { ...item, rejected: !item.rejected, accepted: false } : item))}>{b.rejected ? "Restore" : "Reject"} bullet {index + 1}</button></div>
          </article>)}</div>
          <aside className="translator-gaps"><h3>Not found in your selected facts</h3><p>{session.requirements.filter((r) => !session.facts.some((f) => f.confirmed && f.code === r.code)).map((r) => r.label).join(", ") || "The recognized JD requirements all appear in your selected facts."}</p><p>This is a gap in the supplied information, not proof that you lack these skills. No hiring score is given.</p></aside>
          <div className="translator-actions"><button className="button button-primary" type="button" disabled={!approved || busy} onClick={() => navigate("review")}>Review accepted bullets</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => void generate()}>Regenerate; keep my edits</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => navigate("interview")}>Clarify facts</button></div>
        </>}

        {step === "review" && <><p className="translator-subtitle">Only the wording you accepted is included. Approval means your confirmation, not independent skill verification.</p><label htmlFor="accepted-text">Accepted English bullets</label><textarea id="accepted-text" readOnly rows={8} value={approved} /><div className="translator-actions"><button className="button button-primary" type="button" disabled={!approved} onClick={() => void copy()}>Copy accepted bullets</button><button className="button button-secondary" type="button" disabled={!approved} onClick={download}>Download accepted TXT</button><button className="button button-secondary" type="button" onClick={() => navigate("bullets")}>Edit or reject wording</button></div></>}
      </section>
      <footer className="translator-footer"><p>Prototype: local templates, no external AI. Project, JD and edits stay in this tab’s memory and are cleared on reload. Use fictional data until the privacy and research review is complete.</p><button type="button" className="translator-text-button" onClick={clear}>Forget this session</button></footer>
    </div>
  </main>;
}
