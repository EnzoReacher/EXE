"use client";

import { useMemo, useRef, useState } from "react";
import type { CvDraft, NextStepsDetails, RoadmapProgress } from "@/lib/next-steps/types";
import { readPrivateResponse } from "@/lib/http/read-private-response";
import { usePrivateScope } from "@/components/use-private-scope";
import { evidenceLabels as findingLabels } from "@/components/evidence-labels";
import { StatusNotice } from "@/components/status-notice";

type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const statusLabels: Record<RoadmapProgress, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

type WorkspaceProps = { analysisId: string; initialDetails: NextStepsDetails | null; owner?: string };
export default function NextStepsWorkspace(props: WorkspaceProps) {
  return <NextStepsContent key={`${props.owner}:${props.analysisId}`} {...props} />;
}
function NextStepsContent({ analysisId, initialDetails, owner }: WorkspaceProps) {
  const [details, setDetails] = useState(initialDetails);
  const [draftText, setDraftText] = useState(initialDetails?.draft.content ?? "");
  const [busy, setBusy] = useState<"generate" | "save" | "accept" | string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [draftError, setDraftError] = useState("");
  const [conflict, setConflict] = useState(false); const locked = useRef(false);
  const scope = usePrivateScope(() => { setDetails(null); setDraftText(""); setBusy(null); locked.current = false; setNotice({ tone: "error", text: "Your session ended. Sign in again and reload this private page." }); }, owner);
  const current = (epoch: number) => scope.current.alive && !scope.current.blocked && epoch === scope.current.epoch;
  function validDraft(draft: unknown): draft is CvDraft { const d = draft as CvDraft | null; return !!d && typeof d.id === "string" && Number.isInteger(d.version) && d.version > 0 && d.version <= 2147483647 && typeof d.content === "string" && (d.acceptedAt === null || typeof d.acceptedAt === "string"); }
  const dirty = !!details && draftText !== details.draft.content;
  const completedCount = useMemo(() => details?.roadmapItems.filter((item) => item.progress === "completed").length ?? 0, [details]);

  async function readResponse(response: Response) {
    const body = await readPrivateResponse(response, response.status === 409 ? "This draft changed or is unavailable. Your edits are kept. Reload explicitly to resolve the conflict." : "We could not confirm this private update. Your edits are kept; retry or reload.");
    return body as { details?: NextStepsDetails; draft?: CvDraft; item?: NextStepsDetails["roadmapItems"][number] };
  }

  async function generate() {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy("generate"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "POST" }));
      if (!current(epoch)) return;
      if (!body.details || !validDraft(body.details.draft) || body.details.analysisId !== analysisId || !Array.isArray(body.details.roadmapItems)) throw new Error("We could not load your next steps. Try creating them again.");
      setDetails(body.details as NextStepsDetails);
      setDraftText(body.details.draft.content);
      setNotice({ tone: "success", text: "Your private roadmap and source-grounded draft are ready to review." });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: "We could not confirm your next steps. Retry or reload." }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  async function updateProgress(itemId: string, progress: RoadmapProgress) {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy(itemId); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_roadmap", itemId, progress }) }));
      if (!current(epoch)) return;
      if (body.item?.id !== itemId || body.item.progress !== progress) throw new Error("We could not confirm this progress change. Try again.");
      const savedItem = body.item;
      setDetails((current) => current ? { ...current, roadmapItems: current.roadmapItems.map((item) => item.id === itemId ? savedItem : item) } : current);
      setNotice({ tone: "success", text: `Roadmap progress saved: ${statusLabels[progress]}.` });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: "We could not confirm this action. Retry or reload." }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  async function saveDraft() {
    if (!details || locked.current || scope.current.blocked || conflict) return;
    locked.current = true; const epoch = scope.current.epoch; const snapshot = draftText.trim(); const revision = details.draft.version;
    setBusy("save"); setNotice(null); setDraftError("");
    try {
      const response = await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", draftId: details.draft.id, content: snapshot, expectedRevision: revision }) });
      if (!current(epoch)) return;
      if (response.status === 409) { setConflict(true); throw new Error("This draft changed or is unavailable. Your edits are kept. Reload explicitly to resolve the conflict."); }
      const body = await readResponse(response);
      if (!current(epoch)) return;
      if (!validDraft(body.draft) || body.draft.id !== details.draft.id || body.draft.version !== revision + 1 || body.draft.content !== snapshot || body.draft.acceptedAt !== null) throw new Error("We could not confirm that your edits were saved. Try saving again before accepting.");
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setDraftText(body.draft.content);
      setNotice({ tone: "success", text: "Your edited draft is saved. Review its accuracy before accepting it." });
    } catch { if (current(epoch)) { const message = "We could not confirm your draft save. Your edits are kept. If another tab changed it, reload explicitly to resolve the conflict."; setDraftError(message); setNotice({ tone: "error", text: message }); } }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  async function acceptDraft() {
    if (!details || locked.current || scope.current.blocked || conflict || dirty || draftError || details.draft.acceptedAt) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy("accept"); setNotice(null);
    try {
      const response = await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept_draft", draftId: details.draft.id, content: details.draft.content, expectedRevision: details.draft.version }) });
      if (!current(epoch)) return;
      if (response.status === 409) { setConflict(true); throw new Error("conflict"); }
      const body = await readResponse(response);
      if (!current(epoch)) return;
      if (!validDraft(body.draft) || body.draft.id !== details.draft.id || body.draft.version !== details.draft.version + 1 || body.draft.content !== details.draft.content || !body.draft.acceptedAt) throw new Error("We could not confirm acceptance. Try again.");
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setNotice({ tone: "success", text: "You accepted this draft. It remains private and editable." });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: "We could not confirm acceptance. Keep your edits and reload explicitly if this draft changed." }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  async function reloadDraft() {
    if (locked.current || scope.current.blocked || !window.confirm("Reload the saved draft? Copy your local edits first; reloading replaces this editor.")) return;
    locked.current = true; const epoch = scope.current.epoch; setBusy("reload");
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { cache: "no-store" }));
      if (!current(epoch)) return;
      if (!body.details || body.details.analysisId !== analysisId || !validDraft(body.details.draft) || !Array.isArray(body.details.roadmapItems)) throw new Error();
      setDetails(body.details); setDraftText(body.details.draft.content); setConflict(false); setDraftError(""); setNotice({ tone: "info", text: "Saved draft reloaded. Review before saving or accepting." });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: "We could not reload this draft. Your local edits are kept." }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  if (!details) return <>
    <section className="next-steps-intro"><strong>Turn this report into a practical plan</strong><p>OwnPath will create a short action list from missing, partial, and unclear findings. It will also arrange only traceable CV excerpts into a private draft. No AI provider is connected and no new qualifications are generated.</p><button className="button button-primary" type="button" onClick={() => void generate()} disabled={busy === "generate"}>{busy === "generate" ? "Creating next steps…" : "Create my roadmap and draft"}<span aria-hidden="true">→</span></button></section>
    <StatusNotice error={notice?.tone === "error"}>{notice?.text ?? ""}</StatusNotice>
  </>;

  return <>
    <p className="sr-only" role="status">{busy === "save" ? "Saving draft…" : busy === "accept" ? "Recording acceptance…" : busy ? "Updating roadmap…" : ""}</p>
    <section className="next-steps-method"><strong>How to use these next steps</strong><p>The actions come from findings that were missing, partly supported, or unclear in your saved report. A document gap is not proof that you lack a skill. The draft repeats only source excerpts that had evidence in your CV; review and edit it before use.</p></section>
    <StatusNotice error={notice?.tone === "error"}>{notice?.text ?? ""}</StatusNotice>
    <section className="roadmap-section" aria-labelledby="roadmap-heading"><div className="next-steps-heading"><div><p className="eyebrow">PRIVATE ROADMAP</p><h2 id="roadmap-heading">What to work on next</h2></div><span className="roadmap-count">{completedCount} of {details.roadmapItems.length} complete</span></div>
      {details.roadmapItems.length ? <div className="roadmap-list">{details.roadmapItems.map((item) => <article className="roadmap-item" key={item.id}><div className="roadmap-item-heading"><span className={`roadmap-priority ${item.priority}`}>{item.priority} priority</span><span className={`finding-status ${item.findingStatus === "partly_supported" ? "partial" : item.findingStatus}`}>{findingLabels[item.findingStatus]}</span></div><h3>{item.requirement}</h3><p>{item.action}</p><small>{item.rationale}</small><label className="roadmap-progress">Progress<select aria-label={`Progress for ${item.requirement}`} value={item.progress} disabled={busy !== null} onChange={(event) => void updateProgress(item.id, event.target.value as RoadmapProgress)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></article>)}</div> : <div className="analysis-empty"><h2>No action items yet</h2><p>This report found no missing, partial, or unclear requirements. Review the evidence report directly before deciding what to change.</p></div>}
    </section>
    <section className="draft-section" aria-labelledby="draft-heading"><div className="next-steps-heading"><div><p className="eyebrow">PRIVATE CV DRAFT · VERSION {details.draft.version}</p><h2 id="draft-heading">Review your source-grounded draft</h2></div>{details.draft.acceptedAt && !dirty ? <span className="draft-accepted">Saved version accepted</span> : <span className="draft-review">Review required</span>}</div><p id="draft-description" className="draft-intro">The generated lines below are copied from evidence excerpts already found in your CV. Editing is allowed, but your edits are your responsibility to verify. Save edits before accepting; saving changes requires a new review.</p><label className="sr-only" htmlFor="cv-draft">CV draft</label><textarea id="cv-draft" className="draft-editor" value={draftText} disabled={busy !== null} aria-invalid={!!draftError} aria-describedby={`draft-description draft-save-status${draftError ? " draft-error" : ""}`} onChange={(event) => setDraftText(event.target.value)} rows={15} />
      <p id="draft-save-status" role="status">{dirty ? "Unsaved edits. These edits have not been accepted." : "Showing the saved draft."}</p>
      {draftError && <p id="draft-error" className="field-error">{draftError}</p>}
      {conflict && <div role="alert"><p>This draft changed or is unavailable. Copy your local edits before reloading; nothing will overwrite the saved draft automatically.</p><button type="button" className="button button-secondary" disabled={busy !== null} onClick={() => void reloadDraft()}>Reload saved draft</button></div>}
      <div className="draft-actions"><button className="button button-primary" type="button" onClick={() => void saveDraft()} disabled={busy !== null || conflict}>{busy === "save" ? "Saving draft…" : "Save edits"}</button><button className="button button-secondary" type="button" onClick={() => void acceptDraft()} disabled={busy !== null || conflict || dirty || !!draftError || !!details.draft.acceptedAt} aria-describedby="draft-accept-help">{busy === "accept" ? "Recording…" : details.draft.acceptedAt && !dirty ? "Accepted" : "Accept after review"}</button><span id="draft-accept-help">Save successfully, then accept only after you have checked every claim against your real experience. Acceptance applies to the saved version only.</span></div>
      <div className="draft-provenance"><strong>Source evidence used</strong>{details.draft.claims.length ? <ul>{details.draft.claims.map((claim) => <li key={claim.id}><span>{claim.requirement}</span><q>{claim.sourceExcerpt}</q><small>CV text positions {claim.sourceStart + 1}–{claim.sourceEnd}</small></li>)}</ul> : <p>No source excerpts were available for this draft.</p>}</div>
    </section>
  </>;
}
