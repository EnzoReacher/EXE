"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { OpportunityLink, OpportunityStatus, OpportunityTargetJob } from "@/lib/opportunities/types";

type Notice = { tone: "success" | "error" | "info"; text: string } | null;
const statuses: Array<{ value: OpportunityStatus; label: string }> = [{ value: "saved", label: "Saved" }, { value: "preparing", label: "Preparing" }, { value: "applied", label: "Applied" }, { value: "closed", label: "Closed" }, { value: "dismissed", label: "Dismissed" }];
const blankForm = { targetJobId: "", sourceUrl: "", companyName: "", note: "", status: "saved" as OpportunityStatus };
const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

async function responseJson(response: Response) { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "We could not update your private opportunities. Try again."); return body; }

export default function OpportunitiesWorkspace() {
  const [items, setItems] = useState<OpportunityLink[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [targetJobs, setTargetJobs] = useState<OpportunityTargetJob[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<OpportunityLink | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"save" | string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerId = useRef<string | null>(null);
  const restoreDeleteFocus = useRef(false);
  const cancelDeleteButton = useRef<HTMLButtonElement | null>(null);
  const companyInput = useRef<HTMLInputElement | null>(null);
  const listHeading = useRef<HTMLHeadingElement | null>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const restoreEditFocus = useRef(false);
  useEffect(() => {
    if (deleteCandidate) cancelDeleteButton.current?.focus();
    else if (restoreDeleteFocus.current) { deleteTrigger.current?.focus(); restoreDeleteFocus.current = false; }
  }, [deleteCandidate]);
  useEffect(() => { if (editing) companyInput.current?.focus(); }, [editing]);
  useEffect(() => {
    if (restoreEditFocus.current && !editing && !busy) { editTrigger.current?.focus(); restoreEditFocus.current = false; }
  }, [editing, busy]);
  function cancelDelete() { restoreDeleteFocus.current = true; setDeleteCandidate(null); }

  const load = useCallback(async () => {
    setItems(null); setNotice(null); setLoadFailed(false);
    try { const body = await responseJson(await fetch("/api/opportunities", { cache: "no-store" })); setItems(body.items as OpportunityLink[]); setTargetJobs(body.targetJobs as OpportunityTargetJob[]); }
    catch (error) { setItems([]); setLoadFailed(true); setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not load your private opportunities." }); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function updateForm(name: keyof typeof form, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  function beginEdit(item: OpportunityLink) { setEditing(item); setDeleteCandidate(null); setNotice(null); setForm({ targetJobId: item.targetJobId, sourceUrl: item.sourceUrl, companyName: item.companyName ?? "", note: item.note ?? "", status: item.status }); }
  function cancelEdit() { restoreEditFocus.current = true; setEditing(null); setForm({ ...blankForm, targetJobId: targetJobs[0]?.id ?? "" }); }

  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy("save"); setNotice(null);
    try {
      if (editing) {
        const body = await responseJson(await fetch(`/api/opportunities/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: form.status, companyName: form.companyName, note: form.note }) }));
        setItems((current) => (current ?? []).map((item) => item.id === editing.id ? body.item as OpportunityLink : item)); setNotice({ tone: "success", text: "Your private opportunity was updated." }); cancelEdit();
      } else {
        const body = await responseJson(await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
        setItems((current) => [body.item as OpportunityLink, ...(current ?? [])]); setNotice({ tone: "success", text: "Your private opportunity was saved." }); setForm({ ...blankForm, targetJobId: targetJobs[0]?.id ?? "" });
      }
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : editing ? "We could not update that private opportunity." : "We could not save that private opportunity." }); }
    finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (busy) return; setBusy(id); setNotice(null);
    try { await responseJson(await fetch(`/api/opportunities/${id}`, { method: "DELETE" })); setItems((current) => (current ?? []).filter((item) => item.id !== id)); setDeleteCandidate(null); setNotice({ tone: "success", text: "Your private opportunity was deleted." }); listHeading.current?.focus(); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not delete that private opportunity." }); }
    finally { setBusy(null); }
  }

  if (items === null) return <section className="analysis-status-card" role="status" aria-live="polite"><span className="analysis-spinner" aria-hidden="true" /><div><strong>Loading your private opportunities</strong><p>Checking your private workspace.</p></div></section>;
  const noJobs = targetJobs.length === 0;
  if (loadFailed) return <><div className="form-notice error" role="alert">{notice?.text} Your saved opportunities could not be checked.</div><button className="button button-secondary" type="button" onClick={() => void load()}>Try loading again</button></>;
  return <>
    <section className="opportunity-guidance"><strong>Save a link to a job you found.</strong><p>EXE does not check the page or confirm that it fits your CV. This link was saved by you. A saved link is not a confirmed job match.</p></section>
    {notice && <div className={`form-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}
    <p className="sr-only" role="status">{busy === "save" ? "Saving your private opportunity. Please wait." : busy ? "Deleting your private opportunity. Please wait." : ""}</p>
    <section className="opportunity-form-card" aria-labelledby="opportunity-form-title"><div><h2 id="opportunity-form-title">{editing ? "Edit private opportunity" : "Add a private opportunity"}</h2><p>{editing ? "Change your private status, company name, or note." : "Opening a saved link takes you to an external website."}</p></div>
      {noJobs ? <div className="analysis-empty"><h3>No target jobs available</h3><p>Save a target job in the assessment workspace before you add an opportunity link.</p><a className="text-link" href="/assessment">Go to assessment workspace <span aria-hidden="true">→</span></a></div> : <form className="opportunity-form" onSubmit={save} aria-busy={busy === "save"}>
        {!editing && <><label htmlFor="opportunity-target-job">Saved target job (required)</label><select id="opportunity-target-job" value={form.targetJobId} onChange={(event) => updateForm("targetJobId", event.target.value)} required disabled={!!busy}><option value="">Choose a saved target job</option>{targetJobs.map((job) => <option key={job.id} value={job.id}>{job.roleTitle}{job.companyName ? ` · ${job.companyName}` : ""}</option>)}</select>
        <label htmlFor="opportunity-url">HTTPS job link (required)</label><input id="opportunity-url" type="url" inputMode="url" placeholder="https://…" value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} required maxLength={2048} pattern="https://.*" disabled={!!busy} aria-describedby="opportunity-url-help" /><p className="field-help" id="opportunity-url-help">Use a full link starting with https://. Maximum 2,048 characters.</p></>}
        {editing && <p className="external-url-readonly"><strong>Saved link:</strong> <span>{editing.sourceUrl}</span></p>}
        <label htmlFor="opportunity-company">Employer or company <span>(optional)</span></label><input ref={companyInput} id="opportunity-company" value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} maxLength={120} disabled={!!busy} />
        <label htmlFor="opportunity-status">Your private status</label><select id="opportunity-status" value={form.status} onChange={(event) => updateForm("status", event.target.value)} disabled={!!busy} aria-describedby="opportunity-status-help">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><p className="field-help" id="opportunity-status-help">This status is private and tracks your own process.</p>
        <label htmlFor="opportunity-note">Private note <span>(optional)</span></label><textarea id="opportunity-note" value={form.note} onChange={(event) => updateForm("note", event.target.value)} maxLength={1000} rows={3} disabled={!!busy} aria-describedby="opportunity-note-help" /><p className="field-help" id="opportunity-note-help">Maximum 1,000 characters.</p>
        <div className="form-actions"><button className="button button-primary" disabled={!!busy} type="submit">{busy === "save" ? "Saving…" : editing ? "Save private changes" : "Save privately"}</button>{editing && <button className="button button-secondary" disabled={!!busy} type="button" onClick={cancelEdit}>Cancel edit</button>}</div>
      </form>}
    </section>
    <section className="opportunity-list" aria-labelledby="opportunity-list-title">
      <h2 id="opportunity-list-title" tabIndex={-1} ref={listHeading}>Saved opportunities</h2>
      {items.length === 0 ? <div className="analysis-empty"><h3>No opportunities saved</h3><p>When you find a job page yourself, save its HTTPS link here to track your private process.</p></div> : items.map((item) => {
        const name = `${item.targetRoleTitle}${item.companyName ? ` at ${item.companyName}` : ""}`;
        return <article className="opportunity-card" key={item.id} aria-label={name}>
          <div className="opportunity-card-heading"><div><p className="opportunity-role">{item.targetRoleTitle}</p>{item.companyName && <h3>{item.companyName}</h3>}</div><span className="opportunity-status">{statuses.find((status) => status.value === item.status)?.label}</span></div>
          <p className="opportunity-date">Saved {date(item.createdAt)}{item.updatedAt !== item.createdAt ? ` · Updated ${date(item.updatedAt)}` : ""}</p>
          {item.note && <p className="opportunity-note">{item.note}</p>}
          <p className="external-disclosure">Opening this link takes you to an external website. EXE does not check whether the vacancy is still open.</p>
          <div className="opportunity-actions">
            <a className="button button-secondary" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open external link <span className="sr-only">for {name} (opens another website in a new tab)</span><span aria-hidden="true">↗</span></a>
            <button className="button button-secondary" type="button" disabled={!!busy} aria-label={`Edit ${name}`} onClick={(event) => { editTrigger.current = event.currentTarget; beginEdit(item); }}>Edit</button>
            {deleteCandidate === item.id ? <span className="delete-confirm" role="group" aria-label={`Confirm deletion of ${name}`} onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.preventDefault(); cancelDelete(); } }}>
              <span>Delete this private link? This cannot be undone.</span>
              <button className="button button-danger" disabled={!!busy} type="button" aria-label={`Confirm delete ${name}`} onClick={() => void remove(item.id)}>{busy === item.id ? "Deleting…" : "Delete"}</button>
              <button ref={cancelDeleteButton} className="button button-secondary" disabled={!!busy} type="button" onClick={cancelDelete}>Cancel</button>
            </span> : <button ref={(node) => { if (node && deleteTriggerId.current === item.id) deleteTrigger.current = node; }} className="button button-danger" disabled={!!busy || editing !== null} type="button" aria-label={`Delete ${name}`} onClick={(event) => { deleteTrigger.current = event.currentTarget; deleteTriggerId.current = item.id; setDeleteCandidate(item.id); }}>Delete</button>}
          </div>
        </article>;
      })}
    </section>
  </>;
}
