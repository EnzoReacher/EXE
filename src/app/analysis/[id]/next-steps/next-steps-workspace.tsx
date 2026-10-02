"use client";

import { useMemo, useState } from "react";
import type { NextStepsDetails, RoadmapProgress } from "@/lib/next-steps/types";

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
  const completedCount = useMemo(() => details?.roadmapItems.filter((item) => item.progress === "completed").length ?? 0, [details]);

  async function readResponse(response: Response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "We could not update your next steps.");
    return body;
  }

  async function generate() {
    setBusy("generate"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "POST" }));
      setDetails(body.details as NextStepsDetails);
      setDraftText(body.details.draft.content);
      setNotice({ tone: "success", text: "Your private roadmap and source-grounded draft are ready to review." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not create your next steps." }); }
    finally { setBusy(null); }
  }

  async function updateProgress(itemId: string, progress: RoadmapProgress) {
    setBusy(itemId); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_roadmap", itemId, progress }) }));
      setDetails((current) => current ? { ...current, roadmapItems: current.roadmapItems.map((item) => item.id === itemId ? body.item : item) } : current);
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not update this action." }); }
    finally { setBusy(null); }
  }

  async function saveDraft() {
    if (!details) return;
    setBusy("save"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", draftId: details.draft.id, content: draftText }) }));
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setNotice({ tone: "success", text: "Your edited draft is saved. Review its accuracy before accepting it." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not save your CV draft." }); }
    finally { setBusy(null); }
  }

  async function acceptDraft() {
    if (!details) return;
    setBusy("accept"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/next-steps`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept_draft", draftId: details.draft.id }) }));
      setDetails((current) => current ? { ...current, draft: { ...current.draft, ...body.draft, claims: current.draft.claims } } : current);
      setNotice({ tone: "success", text: "You accepted this draft. It remains private and editable." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not record your acceptance." }); }
    finally { setBusy(null); }
  }

  if (!details) return <>
    <section className="next-steps-intro"><strong>Turn this report into a practical plan</strong><p>EXE will create a short action list from missing, partial, and unclear findings. It will also arrange only traceable CV excerpts into a private draft. No AI provider is connected and no new qualifications are generated.</p><button className="button button-primary" type="button" onClick={() => void generate()} disabled={busy === "generate"}>{busy === "generate" ? "Creating next steps…" : "Create my roadmap and draft"}<span aria-hidden="true">→</span></button></section>
    {notice && <p className={`form-notice ${notice.tone === "error" ? "error" : notice.tone === "info" ? "info" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
  </>;

  return <>
    <section className="next-steps-method"><strong>How to use these next steps</strong><p>The actions come from findings that were missing, partly supported, or unclear in your saved report. A document gap is not proof that you lack a skill. The draft repeats only source excerpts that had evidence in your CV; review and edit it before use.</p></section>
    {notice && <p className={`form-notice ${notice.tone === "error" ? "error" : notice.tone === "info" ? "info" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
    <section className="roadmap-section" aria-labelledby="roadmap-heading"><div className="next-steps-heading"><div><p className="eyebrow">PRIVATE ROADMAP</p><h2 id="roadmap-heading">What to work on next</h2></div><span className="roadmap-count">{completedCount} of {details.roadmapItems.length} complete</span></div>
      {details.roadmapItems.length ? <div className="roadmap-list">{details.roadmapItems.map((item) => <article className="roadmap-item" key={item.id}><div className="roadmap-item-heading"><span className={`roadmap-priority ${item.priority}`}>{item.priority} priority</span><span className={`finding-status ${item.findingStatus === "partly_supported" ? "partial" : item.findingStatus}`}>{item.findingStatus.replace("_", " ")}</span></div><h3>{item.requirement}</h3><p>{item.action}</p><small>{item.rationale}</small><label className="roadmap-progress">Progress<select value={item.progress} disabled={busy === item.id} onChange={(event) => void updateProgress(item.id, event.target.value as RoadmapProgress)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></article>)}</div> : <div className="analysis-empty"><h2>No action items yet</h2><p>This report found no missing, partial, or unclear requirements. Review the evidence report directly before deciding what to change.</p></div>}
    </section>
    <section className="draft-section" aria-labelledby="draft-heading"><div className="next-steps-heading"><div><p className="eyebrow">PRIVATE CV DRAFT · VERSION {details.draft.version}</p><h2 id="draft-heading">Review your source-grounded draft</h2></div>{details.draft.acceptedAt ? <span className="draft-accepted">Accepted</span> : <span className="draft-review">Review required</span>}</div><p className="draft-intro">The generated lines below are copied from evidence excerpts already found in your CV. Editing is allowed, but your edits are your responsibility to verify.</p><label className="sr-only" htmlFor="cv-draft">CV draft</label><textarea id="cv-draft" className="draft-editor" value={draftText} onChange={(event) => setDraftText(event.target.value)} rows={15} />
      <div className="draft-actions"><button className="button button-primary" type="button" onClick={() => void saveDraft()} disabled={busy === "save"}>{busy === "save" ? "Saving draft…" : "Save edits"}</button><button className="button button-secondary" type="button" onClick={() => void acceptDraft()} disabled={busy === "accept" || draftText !== details.draft.content}>{busy === "accept" ? "Recording…" : details.draft.acceptedAt ? "Accepted" : "Accept after review"}</button><span>Accept only after you have checked every claim against your real experience.</span></div>
      <div className="draft-provenance"><strong>Source evidence used</strong>{details.draft.claims.length ? <ul>{details.draft.claims.map((claim) => <li key={claim.id}><span>{claim.requirement}</span><q>{claim.sourceExcerpt}</q><small>CV text positions {claim.sourceStart + 1}–{claim.sourceEnd}</small></li>)}</ul> : <p>No source excerpts were available for this draft.</p>}</div>
    </section>
  </>;
}
