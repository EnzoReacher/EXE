"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Workspace, ExpertDetail } from "@/lib/credential-versions/types";
import { APPROVAL_NOTICE } from "@/lib/credential-versions/types";

const ownerApi = "/api/credential-versions";
const expertApi = "/api/expert/credential-reviews";
const labels: Record<string, string> = { draft: "Draft", submitted: "Waiting for expert", needs_information: "Needs more information", rejected: "Rejected", approved: "Approved", version_created: "Candidate version ready", withdrawn: "Evidence withdrawn", candidate: "Candidate — not active", accepted: "Accepted — active", superseded: "Historical — superseded", evidence_withdrawn: "Evidence withdrawn — not currently approved" };
async function json(response: Response) {
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in from the assessment workspace, then retry." : "This private action is unavailable. Check the required fields and current status, then retry.");
  return response.json();
}
export default function CredentialWorkspace({ expert = false }: { expert?: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [queue, setQueue] = useState<ExpertDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [detail, setDetail] = useState<ExpertDetail | null>(null);
  const [version, setVersion] = useState<{ id: string; content: string; before: string; state: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ action: string; id: string; kind?: string } | null>(null);
  const notice = useRef<HTMLDivElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const actionTrigger = useRef<HTMLElement | null>(null);
  const skillInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState({ cvId: "", portfolioId: "", credentialId: "", expertId: "", skill: "", wording: "" });
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("needs_information");

  const load = useCallback(async () => {
    const data = await json(await fetch(expert ? expertApi : ownerApi, { cache: "no-store" }));
    if (expert) {
      if (!Array.isArray(data)) throw new Error("The private review queue could not be loaded. Retry.");
      setQueue(data);
    } else {
      if (!data || !["cvs", "portfolios", "credentials", "experts", "claims", "versions"].every((key) => Array.isArray(data[key])) || !data.versions.every((item: { changes?: unknown }) => item && Array.isArray(item.changes))) throw new Error("The private workspace could not be loaded. Retry.");
      setWorkspace(data);
    }
  }, [expert]);
  useEffect(() => {
    const timer = setTimeout(() => { void load().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => { if (detail || version) detailHeading.current?.focus(); }, [detail, version]);
  useEffect(() => { if (confirmation) cancelButton.current?.focus(); }, [confirmation]);

  async function perform(operation: () => Promise<void>, success: string, refresh = true) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await operation(); if (refresh) await load(); setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : "This private action is unavailable. Retry."); }
    finally { setBusy(false); }
  }
  async function action(input: Record<string, unknown>) {
    const result = await json(await fetch(expert ? expertApi : ownerApi, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
    if (result.ok !== true) throw new Error("The action was not confirmed. Refresh before trying again.");
  }
  async function upload(event: FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    const target = event.currentTarget;
    const data = new FormData(target);
    data.set("kind", kind);
    await perform(async () => {
      const response = await json(await fetch(kind === "cv" ? "/api/intake/cv" : `${ownerApi}/documents`, { method: "POST", body: data }));
      if (kind === "cv" ? !response.cv?.id || response.cv.processingStatus !== "ready" : !response.id) throw new Error("Upload is not ready. Review or retry it in the assessment workspace.");
      target.reset();
    }, "Private document saved. Uploading evidence does not approve a skill.");
  }
  async function createClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFieldError("");
    if (!form.cvId || !form.credentialId || !form.expertId || form.skill.trim().length < 2 || form.wording.trim().length < 2) {
      setFieldError("Select a source CV, proof and expert; enter a skill label and exact proposed wording (at least 2 characters).");
      const first = !form.cvId ? "cvId" : !form.credentialId ? "credentialId" : !form.expertId ? "expertId" : form.skill.trim().length < 2 ? "skill" : "wording";
      document.getElementById(first)?.focus(); return;
    }
    await perform(async () => { await action({ ...form, action: "create_claim" }); setForm((f) => ({ ...f, skill: "", wording: "" })); }, "Draft claim saved. Submit it separately for expert review; no skill has been added.");
  }
  async function sendDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFieldError("");
    if (note.trim().length < 2) { setFieldError("Enter an explanation between 2 and 1,000 characters."); noteInput.current?.focus(); return; }
    if (!new FormData(event.currentTarget).has("proofReviewed")) { setFieldError("Confirm that you reviewed the assigned proof and exact wording."); document.getElementById("proof-reviewed")?.focus(); return; }
    await perform(async () => { await action({ id: detail?.id, decision, note, proofReviewed: true }); setDetail(null); setNote(""); }, "Expert decision saved. Approval alone does not make a version active.");
    historyHeading.current?.focus();
  }
  function confirm(action: string, id: string, kind?: string) {
    actionTrigger.current = document.activeElement as HTMLElement;
    setConfirmation({ action, id, kind });
  }
  function cancel() { setConfirmation(null); actionTrigger.current?.focus(); }

  return <div aria-busy={busy}>
    <p className="privacy-notice">Fictional data only. Authenticated team authorization is required for experts; this is not institutional authentication. No OCR or automatic skill inference.</p>
    <div ref={notice} role={error ? "alert" : "status"} aria-live="polite">{error || message || (loading ? "Loading private workspace…" : busy ? "Saving private action…" : "")}</div>
    {!loading && error && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void perform(load, "Private workspace refreshed.", false)}>Retry loading</button>}
    {!loading && !expert && workspace && <>
      <section className="opportunity-form-card"><h2>Private documents</h2><p>CV required; portfolio optional. Credentials must be PDF, JPG or PNG; all files at most 5 MiB. A filename or upload is not skill approval.</p>
        {["cv", "portfolio", "credential"].map((kind) => <form key={kind} className="opportunity-form" onSubmit={(event) => void upload(event, kind)}>
          <fieldset disabled={busy}><legend>Upload {kind === "cv" ? "CV" : kind}</legend>
            <label htmlFor={`${kind}-file`}>{kind === "cv" ? "CV file" : `${kind} file`} (required)</label>
            <input id={`${kind}-file`} type="file" name="file" required accept={kind === "credential" ? ".pdf,.jpg,.jpeg,.png" : ".pdf,.docx"} />
            {kind === "credential" && <><label htmlFor="document-type">Proof type</label><select id="document-type" name="documentType"><option value="certificate">Certificate</option><option value="degree">Degree</option></select></>}
            <button className="button button-secondary" type="submit">Upload {kind === "cv" ? "CV" : kind} privately</button>
          </fieldset>
        </form>)}
        {[...workspace.credentials.map((d) => ({ ...d, kind: "credential" })), ...workspace.portfolios.map((d) => ({ ...d, kind: "portfolio" }))].map((d) => <p key={d.id}>{d.filename}{d.withdrawn ? " — Evidence withdrawn; retry file deletion if necessary" : " — Private evidence"} <button disabled={busy} className="button button-secondary" onClick={() => confirm("withdraw", d.id, d.kind)}>{d.withdrawn ? "Retry deletion" : "Withdraw and delete"} {d.filename}</button></p>)}
      </section>
      <section className="opportunity-form-card"><h2>Propose one skill</h2><p>Your certificate is supporting evidence. A new skill is added only after an approved expert reviews the proof and you accept the new CV version.</p><p>Include only a skill supported by your submitted proof. Do not invent years of experience, job titles, employers, achievements, metrics, proficiency levels or project history. Needs-information claims require a new submission with revised proof/wording.</p>
        {!workspace.experts.length && <p role="status">No active team-approved experts available. Role administration is outside this UI.</p>}
        <form className="opportunity-form" noValidate onSubmit={createClaim}>
          <fieldset disabled={busy}>
            {(["cvId", "portfolioId", "credentialId", "expertId"] as const).map((key) => <div key={key}><label htmlFor={key}>{({ cvId: "Source CV (required)", portfolioId: "Portfolio (optional)", credentialId: "Certificate or degree (required)", expertId: "Team-approved expert (required)" })[key]}</label><select id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} aria-describedby={fieldError ? "claim-error" : undefined} aria-invalid={fieldError ? true : undefined}>
              <option value="">{key === "portfolioId" ? "No portfolio" : "Select"}</option>
              {(key === "cvId" ? workspace.cvs.map((r) => ({ id: r.id, text: r.filename })) : key === "expertId" ? workspace.experts.map((r) => ({ id: r.id, text: `${r.name}${r.specialty ? ` — ${r.specialty}` : ""}` })) : (key === "portfolioId" ? workspace.portfolios : workspace.credentials).filter((r) => !r.withdrawn).map((r) => ({ id: r.id, text: r.filename }))).map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
            </select></div>)}
            <label htmlFor="skill">Skill label (2–80 characters)</label><input ref={skillInput} id="skill" value={form.skill} maxLength={80} onChange={(e) => setForm({ ...form, skill: e.target.value })} aria-invalid={fieldError ? true : undefined} aria-describedby="claim-error" />
            <label htmlFor="wording">Exact proposed CV wording (2–300 characters)</label><textarea id="wording" value={form.wording} maxLength={300} onChange={(e) => setForm({ ...form, wording: e.target.value })} aria-describedby="claim-error" />
            <p id="claim-error" role={fieldError ? "alert" : undefined}>{fieldError}</p>
            <button className="button button-primary" type="submit">Save draft claim</button>
          </fieldset>
        </form>
      </section>
      <section className="opportunity-list"><h2>Skill claims</h2>{!workspace.claims.length && <p>No skill claims yet.</p>}{workspace.claims.map((c) => <article className="opportunity-card" key={c.id}><h3>{c.skill}</h3><p>{c.wording}</p><p>{labels[c.state] ?? c.state}</p>{c.note && <p>Expert explanation: {c.note}</p>}
        {(c.state === "approved" || c.state === "version_created") && <p>{APPROVAL_NOTICE} Owner acceptance is still separate.</p>}
        {c.state === "draft" && <button className="button button-primary" disabled={busy} onClick={() => void perform(() => action({ action: "submit", id: c.id }), "Submitted to the selected expert. No skill has been added.")}>Submit {c.skill} for expert review</button>}
        {c.state === "approved" && <button className="button button-primary" disabled={busy} onClick={() => void perform(() => action({ action: "create_version", id: c.id }), "Immutable candidate created. It is not active until accepted.")}>Create candidate for {c.skill}</button>}
        {c.canWithdraw && <button className="button button-secondary" disabled={busy} onClick={() => confirm("withdraw_claim", c.id)}>Withdraw claim for {c.skill}</button>}
        {c.state !== "withdrawn" && <a className="text-link" href={`${ownerApi}/evidence/${c.id}?kind=credential`}>Download private proof for {c.skill}</a>}
      </article>)}</section>
      <section className="opportunity-list"><h2 ref={historyHeading} tabIndex={-1}>Immutable version history</h2><p>Original uploads and M3 drafts are not edited. Only the approved wording is appended; accepted versions are historical snapshots after supersession. Withdrawal removes active approval without rewriting history.</p>{workspace.versions.map((v) => <article key={v.id} className="opportunity-card"><h3>Version {v.number}</h3><p>{labels[v.state] ?? v.state}</p><p>Created {new Date(v.createdAt).toLocaleString()}{v.acceptedAt ? `; accepted ${new Date(v.acceptedAt).toLocaleString()}` : ""}</p><ul>{v.changes.map((w, i) => <li key={i}>{w}</li>)}</ul>
        <button className="button button-secondary" disabled={busy} onClick={() => void perform(async () => { setVersion(await json(await fetch(`${ownerApi}?version=${v.id}`, { cache: "no-store" }))); }, "Version snapshot loaded.", false)}>Review version {v.number}</button>
      </article>)}</section>
    </>}
    {!loading && expert && <section className="opportunity-list"><h2 ref={historyHeading} tabIndex={-1}>Assigned review queue</h2>{!queue.length && !error && <p>No submitted claims assigned to you.</p>}{queue.map((c) => <article className="opportunity-card" key={c.id}><h3>{c.skill}</h3><p>{c.wording}</p><button className="button button-primary" disabled={busy} onClick={() => void perform(async () => { setDetail(await json(await fetch(`${expertApi}?claim=${c.id}`, { cache: "no-store" }))); setFieldError(""); }, "Assigned claim loaded.", false)}>Review {c.skill}</button></article>)}</section>}
    {detail && <section className="opportunity-form-card"><h2 ref={detailHeading} tabIndex={-1}>Review assigned skill: {detail.skill}</h2><p>Exact proposed wording: {detail.wording}</p><p>Selected source context (first 2,000 characters only):</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.context}</pre>
      <a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=credential&preview=1`} target="_blank" rel="noopener noreferrer">Preview assigned private proof (opens a new tab)</a><a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=credential`}>Download assigned private proof</a>{detail.hasPortfolio && <a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=portfolio`}>Download selected private portfolio</a>}
      <p>Read the submitted proof before deciding. Approval is about this exact wording and proof, not institutional authentication. No owner workspace or unrelated documents are available here.</p>
      <form className="opportunity-form" noValidate onSubmit={sendDecision}><fieldset disabled={busy}><label htmlFor="decision">Expert decision</label><select id="decision" value={decision} onChange={(e) => setDecision(e.target.value)}><option value="needs_information">Request more information</option><option value="rejected">Reject</option><option value="approved">Approve exact proposed wording</option></select>
        <label htmlFor="explanation">Explanation (2–1,000 characters)</label><textarea ref={noteInput} id="explanation" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={fieldError ? true : undefined} aria-describedby="decision-error" /><p id="decision-error" role={fieldError ? "alert" : undefined}>{fieldError}</p>
        <label htmlFor="proof-reviewed"><input id="proof-reviewed" name="proofReviewed" type="checkbox" required /> I reviewed the assigned proof and exact proposed wording.</label>
        <button className="button button-primary" type="submit">Save expert decision</button>
      </fieldset></form>
    </section>}
    {version && <section className="opportunity-form-card"><h2 ref={detailHeading} tabIndex={-1}>Immutable CV snapshot</h2><h3>Before — preserved source</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{version.before}</pre><h3>After — exact approved addition</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{version.content}</pre><p>Candidates are read-only. To change proposed skill wording, submit a new claim for review.</p><p>{labels[version.state]}</p>{version.state === "candidate" && <><button className="button button-primary" disabled={busy} onClick={() => confirm("accept", version.id)}>Accept candidate after review</button><button className="button button-secondary" disabled={busy} onClick={() => confirm("reject_version", version.id)}>Reject candidate</button></>}</section>}
    {confirmation && <section className="opportunity-card" role="group" aria-label="Confirm private action" onKeyDown={(event) => { if (event.key === "Escape" && !busy) cancel(); }}><h2>Confirm {confirmation.action === "withdraw" ? "evidence withdrawal and private file deletion" : confirmation.action === "withdraw_claim" ? "withdrawal of this unaccepted claim" : confirmation.action === "accept" ? "owner acceptance of this exact candidate" : "candidate rejection"}</h2><p>{confirmation.action === "withdraw" ? "All versions using this proof or portfolio will be marked evidence withdrawn and will no longer be active. Their historical text is retained." : confirmation.action === "withdraw_claim" ? "This claim and any candidate using it will be marked withdrawn. The private proof remains available for other claims." : "Original and older versions remain unchanged."}</p>
      <button ref={cancelButton} className="button button-secondary" disabled={busy} onClick={cancel}>Cancel</button><button className="button button-primary" disabled={busy} onClick={() => void perform(async () => { await action(confirmation); setConfirmation(null); setVersion(null); }, "Private action confirmed. Version history refreshed.").then(() => historyHeading.current?.focus())}>Confirm action</button>
    </section>}
  </div>;
}
