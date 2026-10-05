"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Workspace, ExpertDetail, Version } from "@/lib/credential-versions/types";
import { APPROVAL_NOTICE } from "@/lib/credential-versions/types";
import ExportControls from "./export-controls";
import WorkspaceSummary from "./workspace-summary";
import { claimNextStep, filterHistory, STATE_LABELS as labels, type HistoryFilter } from "@/lib/credential-versions/workflow";

const ownerApi = "/api/credential-versions";
const expertApi = "/api/expert/credential-reviews";
const DELETE_PENDING_MESSAGE = "Evidence was withdrawn, but private file deletion is still pending. Refresh, then use Retry deletion for that file.";
const SAFE_ERRORS = [
  "Sign in from the assessment workspace, then retry.",
  DELETE_PENDING_MESSAGE,
  "This private action is unavailable. Check the required fields and current status, then retry.",
  "The private review queue could not be loaded. Retry.",
  "The private workspace could not be loaded. Retry.",
  "The action was not confirmed. Refresh before trying again.",
  "Upload is not ready. Review or retry it in the assessment workspace.",
  "The private detail could not be loaded. Refresh and try again.",
];
function safeError(error: unknown) {
  return error instanceof Error && SAFE_ERRORS.includes(error.message) ? error.message : "This private action could not be completed. Refresh the workspace, then retry.";
}
async function json(response: Response) {
  if (!response.ok) {
    let code = "";
    try { code = (await response.json()).code; } catch { /* Never display a raw server response. */ }
    throw new Error(response.status === 401 ? "Sign in from the assessment workspace, then retry." : code === "delete_pending" ? DELETE_PENDING_MESSAGE : "This private action is unavailable. Check the required fields and current status, then retry.");
  }
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
  const [version, setVersion] = useState<{ id: string; sourceName: string; number: number; content: string; before: string; state: string } | null>(null);
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
  const [proofReviewed, setProofReviewed] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const working = useRef(false);
  const reviewTrigger = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await json(await fetch(expert ? expertApi : ownerApi, { cache: "no-store" }));
      if (expert) {
        if (!Array.isArray(data)) throw new Error("The private review queue could not be loaded. Retry.");
        setQueue(data);
      } else {
        if (!data || !["cvs", "portfolios", "credentials", "experts", "claims", "versions"].every((key) => Array.isArray(data[key])) || !data.versions.every((item: { changes?: unknown }) => item && Array.isArray(item.changes))) throw new Error("The private workspace could not be loaded. Retry.");
        setWorkspace(data);
        setSourceFilter((selected) => data.cvs.some((cv: { id: string }) => cv.id === selected) ? selected : "");
        // A refreshed list is the new source of truth. Close stale actionable
        // panels rather than retaining pre-withdrawal candidate controls.
        setVersion(null); setConfirmation(null);
      }
    } catch (error) {
      setWorkspace(null); setQueue([]); setVersion(null); setDetail(null); setConfirmation(null);
      throw error;
    }
  }, [expert]);
  useEffect(() => {
    const timer = setTimeout(() => { void load().catch((e) => setError(safeError(e))).finally(() => setLoading(false)); }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => { if (detail || version) detailHeading.current?.focus(); }, [detail, version]);
  useEffect(() => { if (confirmation) cancelButton.current?.focus(); }, [confirmation]);
  useEffect(() => { if (error) notice.current?.focus(); }, [error]);

  async function perform(operation: () => Promise<void>, success: string, refresh = true) {
    if (working.current) return false;
    working.current = true; setBusy(true); setError(""); setMessage("");
    let completed = false;
    try { await operation(); completed = true; if (refresh) await load(); setMessage(success); return true; }
    catch (e) {
      const failure = safeError(e);
      // A delete_pending response confirms withdrawal already persisted. The
      // cached history and candidate panel can no longer be treated as current.
      if (failure === DELETE_PENDING_MESSAGE) {
        setWorkspace(null); setQueue([]); setVersion(null); setDetail(null); setConfirmation(null);
      }
      setError(completed && refresh ? "The action was saved, but the refreshed workspace could not be loaded. Retry loading to check its status before repeating an action." : failure); return false;
    }
    finally { working.current = false; setBusy(false); }
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
    if (!proofReviewed) { setFieldError("Confirm that you reviewed the assigned proof and exact wording."); document.getElementById("proof-reviewed")?.focus(); return; }
    const saved = await perform(async () => { await action({ id: detail?.id, decision, note, proofReviewed: true }); setDetail(null); setNote(""); setProofReviewed(false); }, "Expert decision saved. Approval alone does not make a version active.");
    if (saved) historyHeading.current?.focus();
  }
  function confirm(action: string, id: string, kind?: string) {
    actionTrigger.current = document.activeElement as HTMLElement;
    setConfirmation({ action, id, kind });
  }
  function cancel() { setConfirmation(null); actionTrigger.current?.focus(); }
  function closeReview() { setDetail(null); setVersion(null); setConfirmation(null); setFieldError(""); setNote(""); setDecision("needs_information"); setProofReviewed(false); reviewTrigger.current?.focus(); }
  function openVersion(item: Version, trigger: HTMLButtonElement) {
    reviewTrigger.current = trigger;
    void perform(async () => {
      setVersion(null); setConfirmation(null);
      const data = await json(await fetch(ownerApi + "?version=" + item.id, { cache: "no-store" }));
      if (!data || data.id !== item.id || !["before", "content", "state"].every((key) => typeof data[key] === "string")) throw new Error("The private detail could not be loaded. Refresh and try again.");
      setVersion({ id: data.id, before: data.before, content: data.content, state: data.state, number: item.number, sourceName: item.sourceName ?? "Source CV unavailable" });
    }, "Version snapshot loaded.", false);
  }
  function openClaim(id: string, trigger: HTMLButtonElement) {
    reviewTrigger.current = trigger;
    void perform(async () => {
      setDetail(null); setFieldError(""); setNote(""); setDecision("needs_information"); setProofReviewed(false);
      const data = await json(await fetch(expertApi + "?claim=" + id, { cache: "no-store" }));
      if (!data || data.id !== id || !["skill", "wording", "context"].every((key) => typeof data[key] === "string") || typeof data.hasPortfolio !== "boolean") throw new Error("The private detail could not be loaded. Refresh and try again.");
      setDetail(data);
    }, "Assigned claim loaded.", false);
  }
  const visibleClaims = workspace ? filterHistory(workspace.claims, sourceFilter, historyFilter, "claim") : [];
  const visibleVersions = workspace ? filterHistory(workspace.versions, sourceFilter, historyFilter, "version") : [];

  return <div className="credential-workspace" aria-busy={busy}>
    <p className="privacy-notice">Fictional data only. Authenticated team authorization is required for experts; this is not institutional authentication. No OCR or automatic skill inference.</p>
    <div ref={notice} tabIndex={-1} role={error ? "alert" : "status"} aria-live="polite">{error || message || (loading ? "Loading private workspace…" : busy ? "Saving private action…" : "")}</div>
    {!loading && error && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void perform(load, "Private workspace refreshed.", false)}>Retry loading</button>}
    {!loading && !expert && workspace && <>
      <WorkspaceSummary workspace={workspace} />
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => void perform(load, "Private workspace refreshed. Review the current status before acting.", false)}>Refresh private workspace</button>
      <section className="opportunity-form-card"><h2 id="credential-documents" tabIndex={-1}>Private documents</h2><p>CV required; portfolio optional. Credentials must be PDF, JPG or PNG; all files at most 5 MiB. A filename or upload is not skill approval.</p>
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
      <section className="opportunity-form-card"><h2 id="credential-proposal" tabIndex={-1}>Propose one skill</h2><p>Your certificate is supporting evidence. A new skill is added only after an approved expert reviews the proof and you accept the new CV version.</p><p>Include only a skill supported by your submitted proof. Do not invent years of experience, job titles, employers, achievements, metrics, proficiency levels or project history. Needs-information claims require a new submission with revised proof/wording.</p>
        {!workspace.experts.length && <p role="status">No active team-approved experts available. Role administration is outside this UI.</p>}
        <form className="opportunity-form" noValidate onSubmit={createClaim}>
          <fieldset disabled={busy}>
            {(["cvId", "portfolioId", "credentialId", "expertId"] as const).map((key) => <div key={key}><label htmlFor={key}>{({ cvId: "Source CV (required)", portfolioId: "Portfolio (optional)", credentialId: "Certificate or degree (required)", expertId: "Team-approved expert (required)" })[key]}</label><select id={key} value={form[key]} required={key !== "portfolioId"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} aria-describedby={fieldError && key !== "portfolioId" && !form[key] ? "claim-error" : undefined} aria-invalid={fieldError && key !== "portfolioId" && !form[key] ? true : undefined}>
              <option value="">{key === "portfolioId" ? "No portfolio" : "Select"}</option>
              {(key === "cvId" ? workspace.cvs.map((r) => ({ id: r.id, text: r.filename })) : key === "expertId" ? workspace.experts.map((r) => ({ id: r.id, text: `${r.name}${r.specialty ? ` — ${r.specialty}` : ""}` })) : (key === "portfolioId" ? workspace.portfolios : workspace.credentials).filter((r) => !r.withdrawn).map((r) => ({ id: r.id, text: r.filename }))).map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
            </select></div>)}
            <label htmlFor="skill">Skill label (2–80 characters)</label><input ref={skillInput} id="skill" required value={form.skill} maxLength={80} onChange={(e) => setForm({ ...form, skill: e.target.value })} aria-invalid={fieldError && form.skill.trim().length < 2 ? true : undefined} aria-describedby="claim-error" />
            <label htmlFor="wording">Exact proposed CV wording (2–300 characters)</label><textarea id="wording" required value={form.wording} maxLength={300} onChange={(e) => setForm({ ...form, wording: e.target.value })} aria-invalid={fieldError && form.wording.trim().length < 2 ? true : undefined} aria-describedby="claim-error" />
            <p id="claim-error" role={fieldError ? "alert" : undefined}>{fieldError}</p>
            <button className="button button-primary" type="submit">Save draft claim</button>
          </fieldset>
        </form>
      </section>
      <section className="opportunity-guidance credential-filters" aria-labelledby="credential-filter-title"><h2 id="credential-filter-title">Find your claims and versions</h2><label htmlFor="source-filter">Filter by source CV</label><select id="source-filter" value={sourceFilter} disabled={busy} onChange={(e) => setSourceFilter(e.target.value)}><option value="">All source CVs</option>{workspace.cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.filename}</option>)}</select><label htmlFor="history-filter">Filter by next step</label><select id="history-filter" value={historyFilter} disabled={busy} onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}><option value="all">All states</option><option value="action">Needs your action</option><option value="waiting">Waiting for expert</option><option value="history">Version and withdrawn history</option></select><button type="button" className="button button-secondary" disabled={busy || (!sourceFilter && historyFilter === "all")} onClick={() => { setSourceFilter(""); setHistoryFilter("all"); }}>Clear filters</button><p role="status">Showing {visibleClaims.length} claims and {visibleVersions.length} versions. Filters change this view only.</p></section>
      <section className="opportunity-list"><h2 id="credential-claims" tabIndex={-1}>Skill claims</h2>{!workspace.claims.length ? <p>No skill claims yet.</p> : !visibleClaims.length && <p>No skill claims match these filters. Clear filters to see your history.</p>}{visibleClaims.map((c) => <article className="opportunity-card" key={c.id}><h3>{c.skill}</h3><p>Source CV: {c.sourceName}</p><p>{c.wording}</p><p>{labels[c.state] ?? c.state}</p><p>{claimNextStep(c.state)}</p>{c.note && <p>Expert explanation: {c.note}</p>}
        {(c.state === "approved" || c.state === "version_created") && <p>{APPROVAL_NOTICE} Owner acceptance is still separate.</p>}
        {c.state === "draft" && <button className="button button-primary" disabled={busy} onClick={() => void perform(() => action({ action: "submit", id: c.id }), "Submitted to the selected expert. No skill has been added.")}>Submit {c.skill} for expert review</button>}
        {c.state === "approved" && <button className="button button-primary" disabled={busy} onClick={() => void perform(() => action({ action: "create_version", id: c.id }), "Immutable candidate created. It is not active until accepted.")}>Create candidate for {c.skill}</button>}
        {(c.state === "needs_information" || c.state === "rejected") && <button className="button button-secondary" disabled={busy} onClick={() => { setForm({ cvId: c.sourceCvId, credentialId: workspace.credentials.some((d) => d.id === c.credentialId && !d.withdrawn) ? c.credentialId : "", portfolioId: workspace.portfolios.some((d) => d.id === c.portfolioId && !d.withdrawn) ? c.portfolioId! : "", expertId: "", skill: c.skill, wording: c.wording }); setFieldError(""); setMessage("Wording copied into the proposal form. Revise the proof or wording, choose an expert, then save a new draft. Nothing has been submitted."); skillInput.current?.focus(); }}>Prepare a new claim for {c.skill}</button>}
        {c.canWithdraw && <button className="button button-secondary" disabled={busy} onClick={() => confirm("withdraw_claim", c.id)}>Withdraw claim for {c.skill}</button>}
        {c.state !== "withdrawn" && <a className="text-link" href={`${ownerApi}/evidence/${c.id}?kind=credential`}>Download private proof for {c.skill}</a>}
      </article>)}</section>
      <section className="opportunity-list"><h2 id="credential-history" ref={historyHeading} tabIndex={-1}>Immutable version history</h2><p>Original uploads and M3 drafts are not edited. Only the approved wording is appended; accepted versions are historical snapshots after supersession. Withdrawal removes active approval without rewriting history.</p>{!workspace.versions.length ? <p>No CV versions yet. Create a candidate from an approved claim first.</p> : !visibleVersions.length && <p>No CV versions match these filters. Clear filters to see your history.</p>}{visibleVersions.map((v) => <article key={v.id} className="opportunity-card"><h3>Version {v.number}</h3><p>Source CV: {v.sourceName}</p><p>{labels[v.state] ?? v.state}</p><p>Created {new Date(v.createdAt).toLocaleString()}{v.acceptedAt ? `; accepted ${new Date(v.acceptedAt).toLocaleString()}` : ""}</p><ul>{v.changes.map((w, i) => <li key={i}>{w}</li>)}</ul>
        <button className="button button-secondary" disabled={busy} onClick={(event) => openVersion(v, event.currentTarget)}>Review version {v.number}</button>
        <ExportControls version={v} disabled={busy} />
      </article>)}</section>
    </>}
    {!loading && expert && <section className="opportunity-list"><h2 ref={historyHeading} tabIndex={-1}>Assigned review queue</h2><button type="button" className="button button-secondary" disabled={busy} onClick={() => void perform(async () => { closeReview(); await load(); }, "Assigned review queue refreshed.", false)}>Refresh assigned queue</button>{!queue.length && !error && <p>No submitted claims assigned to you.</p>}{queue.map((c) => <article className="opportunity-card" key={c.id}><h3>{c.skill}</h3><p>{c.wording}</p><button className="button button-primary" disabled={busy} onClick={(event) => openClaim(c.id, event.currentTarget)}>Review {c.skill}</button></article>)}</section>}
    {detail && <section className="opportunity-form-card"><h2 ref={detailHeading} tabIndex={-1}>Review assigned skill: {detail.skill}</h2><p>Exact proposed wording: {detail.wording}</p><p>Selected source context (first 2,000 characters only):</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.context}</pre>
      <div className="credential-actions"><a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=credential&preview=1`} target="_blank" rel="noopener noreferrer">View assigned private proof (opens a new tab)</a><a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=credential`}>Download assigned private proof</a>{detail.hasPortfolio && <a className="text-link" href={`${ownerApi}/evidence/${detail.id}?kind=portfolio`}>Download selected private portfolio</a>}</div><p>JPG and PNG open in a protected image view. For PDFs, use the authenticated download and your document viewer.</p>
      <p>Read the submitted proof before deciding. Approval is about this exact wording and proof, not institutional authentication. No owner workspace or unrelated documents are available here.</p>
      <button type="button" className="button button-secondary" disabled={busy} onClick={closeReview}>Close assigned review</button>
      <form key={detail.id} className="opportunity-form" noValidate onSubmit={sendDecision}><fieldset disabled={busy}><label htmlFor="decision">Expert decision</label><select id="decision" value={decision} onChange={(e) => setDecision(e.target.value)}><option value="needs_information">Request more information</option><option value="rejected">Reject</option><option value="approved">Approve exact proposed wording</option></select>
        <label htmlFor="explanation">Explanation (2–1,000 characters)</label><textarea ref={noteInput} id="explanation" required maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={fieldError && note.trim().length < 2 ? true : undefined} aria-describedby="decision-error" /><p id="decision-error" role={fieldError ? "alert" : undefined}>{fieldError}</p>
        <label htmlFor="proof-reviewed"><input id="proof-reviewed" name="proofReviewed" type="checkbox" checked={proofReviewed} onChange={(e) => setProofReviewed(e.target.checked)} aria-invalid={fieldError && !proofReviewed ? true : undefined} aria-describedby="decision-error" required /> I reviewed the assigned proof and exact proposed wording.</label>
        <button className="button button-primary" type="submit">Save expert decision</button>
      </fieldset></form>
    </section>}
    {version && <section className="opportunity-form-card"><h2 ref={detailHeading} tabIndex={-1}>Immutable CV snapshot</h2><p>Source CV: {version.sourceName} — version {version.number}</p><button type="button" className="button button-secondary" disabled={busy} onClick={closeReview}>Close version review</button><h3>Before — preserved source</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{version.before}</pre><h3>After — exact approved addition</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{version.content}</pre><p>Candidates are read-only. To change proposed skill wording, submit a new claim for review.</p><p>{labels[version.state]}</p>{version.state === "candidate" && <><button className="button button-primary" disabled={busy} onClick={() => confirm("accept", version.id)}>Accept candidate after review</button><button className="button button-secondary" disabled={busy} onClick={() => confirm("reject_version", version.id)}>Reject candidate</button></>}</section>}
    {confirmation && <section className="opportunity-card" role="group" aria-label="Confirm private action" onKeyDown={(event) => { if (event.key === "Escape" && !busy) cancel(); }}><h2>Confirm {confirmation.action === "withdraw" ? "evidence withdrawal and private file deletion" : confirmation.action === "withdraw_claim" ? "withdrawal of this unaccepted claim" : confirmation.action === "accept" ? "owner acceptance of this exact candidate" : "candidate rejection"}</h2><p>{confirmation.action === "withdraw" ? "All versions using this proof or portfolio will be marked evidence withdrawn and will no longer be active. Their historical text is retained." : confirmation.action === "withdraw_claim" ? "This claim and any candidate using it will be marked withdrawn. The private proof remains available for other claims." : "Original and older versions remain unchanged."}</p>
      <button ref={cancelButton} className="button button-secondary" disabled={busy} onClick={cancel}>Cancel</button><button className="button button-primary" disabled={busy} onClick={() => void perform(async () => { await action(confirmation); setConfirmation(null); setVersion(null); }, "Private action confirmed. Version history refreshed.").then((saved) => { if (saved) historyHeading.current?.focus(); })}>Confirm action</button>
    </section>}
  </div>;
}
