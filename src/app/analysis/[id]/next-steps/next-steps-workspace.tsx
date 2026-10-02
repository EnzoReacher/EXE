"use client";

import { useMemo, useState } from "react";
import type { NextStepsDetails, RoadmapProgress } from "@/lib/next-steps/types";
import { evidenceLabels as findingLabels } from "@/components/evidence-labels";
import { StatusNotice } from "@/components/status-notice";

type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const statusLabels: Record<RoadmapProgress, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function NextStepsWorkspace({ analysisId, initialDetails }: { analysisId: string; initialDetails: NextStepsDetails | null }) {
  const [details, setDetails] = useState(initialDetails);
  const [draftText, setDraftText] = useState(initialDetails?.draft.content ?? "");
  const [busy, setBusy] = useState<"generate" | "save" | "accept" | string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [draftError, setDraftError] = useState("");
  const dirty = !!details && draftText !== details.draft.content;
  const completedCount = useMemo(() => details?.roadmapItems.filter((item) => item.progress === "completed").length ?? 0, [details]);

  async function readResponse(response: Response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "We could not update your next steps.");
    return body;
  }

  async function generate() {
    if (busy) return;
    setBusy("generate"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "POST" }));
      if (!body.details?.draft || typeof body.details.draft.content !== "string" || !Array.isArray(body.details.roadmapItems)) throw new Error("We could not load your next steps. Try creating them again.");
      setDetails(body.details as NextStepsDetails);
      setDraftText(body.details.draft.content);
      setNotice({ tone: "success", text: "Your private roadmap and source-grounded draft are ready to review." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not create your next steps." }); }
    finally { setBusy(null); }
  }

  async function updateProgress(itemId: string, progress: RoadmapProgress) {
    if (busy) return;
    setBusy(itemId); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_roadmap", itemId, progress }) }));
      if (body.item?.id !== itemId || body.item.progress !== progress) throw new Error("We could not confirm this progress change. Try again.");
      setDetails((current) => current ? { ...current, roadmapItems: current.roadmapItems.map((item) => item.id === itemId ? body.item : item) } : current);
      setNotice({ tone: "success", text: `Roadmap progress saved: ${statusLabels[progress]}.` });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not update this action." }); }
    finally { setBusy(null); }
  }

  async function saveDraft() {
    if (!details || busy) return;
    setBusy("save"); setNotice(null); setDraftError("");
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", draftId: details.draft.id, content: draftText }) }));
      if (!body.draft || body.draft.content !== draftText.trim()) throw new Error("We could not confirm that your edits were saved. Try saving again before accepting.");
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setDraftText(body.draft.content);
      setNotice({ tone: "success", text: "Your edited draft is saved. Review its accuracy before accepting it." });
    } catch (error) { const message = error instanceof Error ? error.message : "We could not save your CV draft."; setDraftError(message); setNotice({ tone: "error", text: message }); }
    finally { setBusy(null); }
  }

  async function acceptDraft() {
    if (!details || busy || dirty || draftError || details.draft.acceptedAt) return;
    setBusy("accept"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept_draft", draftId: details.draft.id }) }));
      if (!body.draft?.acceptedAt) throw new Error("We could not confirm acceptance. Try again.");
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setNotice({ tone: "success", text: "You accepted this draft. It remains private and editable." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not record your acceptance." }); }
    finally { setBusy(null); }
  }

  if (!details) return <>
    <section className="next-steps-intro"><strong>Turn this report into a practical plan</strong><p>EXE will create a short action list from missing, partial, and unclear findings. It will also arrange only traceable CV excerpts into a private draft. No AI provider is connected and no new qualifications are generated.</p><button className="button button-primary" type="button" onClick={() => void generate()} disabled={busy === "generate"}>{busy === "generate" ? "Creating next steps…" : "Create my roadmap and draft"}<span aria-hidden="true">→</span></button></section>
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
      <div className="draft-actions"><button className="button button-primary" type="button" onClick={() => void saveDraft()} disabled={busy !== null}>{busy === "save" ? "Saving draft…" : "Save edits"}</button><button className="button button-secondary" type="button" onClick={() => void acceptDraft()} disabled={busy !== null || dirty || !!draftError || !!details.draft.acceptedAt} aria-describedby="draft-accept-help">{busy === "accept" ? "Recording…" : details.draft.acceptedAt && !dirty ? "Accepted" : "Accept after review"}</button><span id="draft-accept-help">Save successfully, then accept only after you have checked every claim against your real experience. Acceptance applies to the saved version only.</span></div>
      <div className="draft-provenance"><strong>Source evidence used</strong>{details.draft.claims.length ? <ul>{details.draft.claims.map((claim) => <li key={claim.id}><span>{claim.requirement}</span><q>{claim.sourceExcerpt}</q><small>CV text positions {claim.sourceStart + 1}–{claim.sourceEnd}</small></li>)}</ul> : <p>No source excerpts were available for this draft.</p>}</div>
    </section>
  </>;
}
