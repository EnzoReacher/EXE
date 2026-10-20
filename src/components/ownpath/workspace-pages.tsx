"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDraft } from "./workspace-shell";
import { draftProfile, finalDocument, isCurrent, parseDraft, parseProfile, parseReview, revision, type Draft } from "@/lib/cv-review/domain";
import { examples } from "@/lib/cv-review/examples";
type Saved = { id: string; name: string; payload: Draft; revision: number; created_at: string; updated_at: string };
type SavedData = { profiles: Saved[]; versions: Saved[] };
async function api(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  let response: Response;
  try { response = await fetch(path, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(55000)]) : AbortSignal.timeout(55000) }); }
  catch { throw new Error("The request could not complete or timed out. Your input is kept; retry."); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error(`The server returned an unreadable response (HTTP ${response.status}). Your input is kept; retry.`); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid server response. Your input is kept; retry.");
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Request failed. Your input is kept; retry.");
  if (path === "/api/cv-review/saved") {
    const input = body as { id?: string; revision?: number } | undefined;
    if ((method === "POST" && (data.saved !== true || data.id !== input?.id)) || (method === "PATCH" && (data.saved !== true || data.revision !== Number(input?.revision) + 1)) || (method === "DELETE" && data.deleted !== true)) throw new Error("The server did not confirm this change. Your input is kept; retry.");
    if (method === "GET" && (!Array.isArray(data.profiles) || !Array.isArray(data.versions))) throw new Error("Saved work returned an invalid response. Retry retrieval; your input is kept.");
  }
  return data;
}
function profilePayload(draft: Draft) { return { ...draft, name: draft.name || "My experience profile", review: null, decisions: {}, step: "profile" }; }
function useRequestScope() {
  const scope = useRef({ generation: 0, controller: null as AbortController | null });
  useEffect(() => { const current = scope.current; return () => { ++current.generation; current.controller?.abort(); }; }, []);
  return scope;
}
function beginRequest(scope: ReturnType<typeof useRequestScope>) { scope.current.controller?.abort(); const controller = new AbortController(); scope.current.controller = controller; return { controller, generation: ++scope.current.generation }; }
function useSaved() {
  const [data, setData] = useState<SavedData | null>(null); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; api("/api/cv-review/saved").then(d => { if (active) { setData(d); setError(""); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [attempt]);
  return { data, error, retry: () => { setData(null); setError(""); setAttempt(n => n + 1); } };
}
function Retrieval({ error, retry }: { error: string; retry: () => void }) { return error ? <div role="alert" className="op-error">{error}<div><button onClick={retry}>Retry retrieval</button></div></div> : <p role="status">Loading saved work…</p>; }
export function WorkspaceHome() {
  const { data, error, retry } = useSaved(); const { draft } = useDraft();
  const returning = Boolean(data && (data.profiles.length || data.versions.length));
  return <><p className="op-kicker">MAKE YOUR EXPERIENCE COUNT</p><h1>Your next CV starts here.</h1><p>One experience profile → multiple job-specific CV versions. You review the wording and choose what to keep.</p>
    <div className="op-actions"><Link className="op-button op-primary" href={returning ? "/app/tailor" : "/app/profile"}>{returning ? "Tailor a CV for a job" : "Add your first CV"}</Link>{draft.source && <Link className="op-button" href={draft.profile ? "/app/tailor" : "/app/profile"}>Continue draft</Link>}</div>
    <ol className="op-steps"><li><strong>01 · Add experience</strong><p>Paste a CV or describe your work, studies, projects or volunteering.</p></li><li><strong>02 · Tailor</strong><p>Improve the wording. Add a job description when you have one.</p></li><li><strong>03 · Review & save</strong><p>Keep the changes you want and save a named version.</p></li></ol>
    <section className="op-card"><h2>Recent CV versions</h2>{!data ? <Retrieval error={error} retry={retry} /> : data.versions.length ? data.versions.slice(0, 5).map(v => <div className="op-row" key={v.id}><Link href={`/app/cvs/${v.id}`}>{v.name} →</Link><small>{new Date(v.created_at).toLocaleDateString()}</small></div>) : <p>No saved versions yet. Start with your experience profile.</p>}</section></>;
}
export function ProfileEditor() {
  const requests = useRequestScope();
  const profileSave = useRef<{ snapshot: string; id: string } | null>(null);
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState<string | null>(null);
  const { draft, setDraft } = useDraft(); const [busy, setBusy] = useState(false); const lock = useRef(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [consent, setConsent] = useState(false);
  const saved = useSaved();
  async function organize(ai: boolean) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(""); setMessage("");
    const submitted = draft; const { controller, generation } = beginRequest(requests);
    try { const profile = ai ? parseProfile(await api("/api/cv-review/organize", "POST", { source: submitted.source, consent, requestId: crypto.randomUUID() }, controller.signal)) : draftProfile(submitted.source); if (requests.current.generation !== generation || controller.signal.aborted) return; setDraft(d => d === submitted ? { ...d, profile, review: null, decisions: {}, step: "profile" } : d); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not organize. Your text is kept."); } finally { lock.current = false; if (requests.current.generation === generation) setBusy(false); }
  }
  async function saveProfile() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(""); setMessage("");
    try { const payload = profilePayload(draft); const snapshot = JSON.stringify(payload); if (profileSave.current?.snapshot !== snapshot) profileSave.current = { snapshot, id: crypto.randomUUID() }; await api("/api/cv-review/saved", "POST", { kind: "profile", id: profileSave.current.id, payload }); setSavedProfileSnapshot(snapshot); saved.retry(); } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  return <><h1>My experience profile</h1><p>Paste your CV or describe your experience. Keep names, dates and qualifications as you want them to appear. Text only for this release.</p>
    {saved.data?.profiles.length ? <details><summary>Open a saved profile</summary>{saved.data.profiles.map(p => <div className="op-row" key={p.id}><span>{p.name}</span><button disabled={busy} onClick={() => { if (draft.source && !confirm("Replace your current in-memory draft with this profile?")) return; try { setDraft(parseDraft(p.payload)); } catch { setError("This profile could not be opened."); } }}>Open profile</button></div>)}</details> : saved.error && <Retrieval error={saved.error} retry={saved.retry} />}
    <details><summary>Try a clearly fictional example</summary><div className="op-actions">{Object.entries(examples).map(([name, text]) => <button disabled={busy} key={name} onClick={() => { if (draft.source && !confirm("Replace the current draft with this fictional example?")) return; setDraft(d => ({ ...d, source: text, profile: null, review: null, decisions: {} })); }}>{name}</button>)}</div><small>Synthetic examples only. They are never substituted for an AI response.</small></details>
    <label>Original CV or experience<textarea className="op-source" value={draft.source} disabled={busy} onChange={e => setDraft(d => ({ ...d, source: e.target.value, profile: null, review: null, decisions: {}, step: "input" }))} /></label><small>{draft.source.length.toLocaleString()} / 24,000 characters · Up to 500 lines. Oversized text stays here for correction.</small>
    <p>AI organization sends experience text to OpenAI to label sections. Likely name lines and recognizable contact lines are excluded. Check for other personal details before sending. Original text stays in your profile.</p><label><span><input style={{width:"auto"}} type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to send this experience text to OpenAI.</span></label>
    <div className="op-actions"><button className="op-primary" disabled={busy || !consent} onClick={() => void organize(true)}>{busy ? "Working…" : "Organize with AI"}</button><button disabled={busy} onClick={() => void organize(false)}>Review text myself</button></div>
    {error && <p role="alert" className="op-error">{error}</p>}{message && <p role="status" className="op-message">{message}</p>}
    {savedProfileSnapshot && <p role="status" className="op-message">{savedProfileSnapshot === JSON.stringify(profilePayload(draft)) ? "Profile snapshot saved. Save again after further edits." : "An earlier profile snapshot was saved. Current edits are not saved."}</p>}
    {draft.profile && <section className="op-card"><h2>Review your profile</h2><p>Edit any line directly. Keep additional sections and uncertain details. No individual approvals needed. Label private contact lines “Contact” to exclude them from AI review.</p>{draft.profile.blocks.map((b, i) => <div className="op-profile-line" key={b.id}><label>Section for line {i + 1}<input disabled={busy} value={b.section} onChange={e => setDraft(d => { const blocks = d.profile!.blocks.map(x => x.id === b.id ? { ...x, section: e.target.value } : x); return { ...d, profile: { ...d.profile!, blocks, revision: revision(blocks), confirmed: false }, review: null, decisions: {} }; })} /></label><label>Line {i + 1}<textarea disabled={busy} value={b.text} onChange={e => setDraft(d => { const blocks = d.profile!.blocks.map(x => x.id === b.id ? { ...x, text: e.target.value } : x); return { ...d, profile: { ...d.profile!, blocks, revision: revision(blocks), confirmed: false }, review: null, decisions: {} }; })} /></label></div>)}
      <div className="op-actions"><button disabled={busy} className="op-primary" onClick={() => { setDraft(d => ({ ...d, profile: { ...d.profile!, confirmed: true } })); setMessage("Profile ready. Continue to Tailor my CV."); }}>Use this profile</button><button disabled={busy || !draft.profile.confirmed} onClick={() => void saveProfile()}>Save profile</button>{draft.profile.confirmed && <Link className="op-button" href="/app/tailor">Continue to Tailor my CV →</Link>}</div></section>}
  </>;
}
export function TailorEditor() {
  const requests = useRequestScope();
  const { draft, setDraft } = useDraft(); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [undo, setUndo] = useState<string[] | null>(null);
  const saved = useSaved(); const current = isCurrent(draft.review, draft.profile, draft.jd, draft.language);
  async function review() {
    if (lock.current || !draft.profile) return; lock.current = true; setBusy(true); setError(""); setMessage("");
    const submitted = draft; const { controller, generation } = beginRequest(requests);
    try { const raw = await api("/api/cv-review/review", "POST", { profile: draft.profile, jd: draft.jd, language: draft.language, consent, requestId: crypto.randomUUID() }, controller.signal); const review = parseReview(raw, draft.profile, draft.jd, draft.language); if (requests.current.generation !== generation || controller.signal.aborted) return; setDraft(d => d === submitted ? { ...d, review, decisions: {}, step: "review" } : d); setUndo(null); }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); } finally { lock.current = false; if (requests.current.generation === generation) setBusy(false); }
  }
  function unchanged() { if (!draft.profile) return; setDraft(d => ({ ...d, review: { suggestions: [], mapping: [], summary: ["Original profile kept without AI changes."], profileRevision: d.profile!.revision, jd: d.jd, language: d.language }, decisions: {}, step: "final" })); }
  if (!draft.profile?.confirmed) return <><h1>Tailor my CV</h1><p>Start with a reviewed experience profile. You can also reuse the experience snapshot from a saved CV.</p>{saved.data ? [...saved.data.profiles, ...saved.data.versions].map(p => <div className="op-row" key={p.id}><span>{p.name}</span><button onClick={() => { try { const savedDraft = parseDraft(p.payload); setDraft({ ...savedDraft, review: null, decisions: {}, jd: "", step: "profile", name: "", role: "", company: "" }); } catch { setError("Could not open this profile."); } }}>Use saved experience</button></div>) : <Retrieval error={saved.error} retry={saved.retry} />}<Link className="op-button op-primary" href="/app/profile">Add your experience</Link>{error && <p role="alert">{error}</p>}</>;
  const text = current && draft.review ? finalDocument(draft.profile, draft.review, draft.decisions) : "";
  return <><h1>Tailor my CV</h1><p>Improve your complete CV, with an optional job description. You choose every change.</p><section className="op-card"><label>Job description (optional)<textarea disabled={busy} value={draft.jd} onChange={e => setDraft(d => ({ ...d, jd: e.target.value }))} /></label><div className="op-grid"><label>CV wording language<select disabled={busy} value={draft.language} onChange={e => setDraft(d => ({ ...d, language: e.target.value as Draft["language"] }))}><option>English</option><option>Vietnamese</option></select></label><div><p>Unchanged sections keep their original language. This is wording review, not a full-document translation.</p></div></div><p>OpenAI receives your experience blocks and optional job description. Likely name lines and recognizable contact lines are excluded from rewriting and stay in your final CV. Remove any other private information you do not want to send.</p><label><span><input style={{width:"auto"}} type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to send this experience and optional job description to OpenAI.</span></label><div className="op-actions"><button disabled={busy || !consent} className="op-primary" onClick={() => void review()}>{busy ? "Reviewing…" : "Propose improvements"}</button><button disabled={busy} onClick={unchanged}>Keep original CV</button></div></section>
    {error && <p className="op-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {draft.review && !current && <p className="op-message" role="status">The profile, job description or language changed. Regenerate the review before previewing or saving.</p>}
    {current && draft.review && <><section><h2>Review proposed changes</h2>{draft.review.summary.map((s, i) => <p key={i}>{s}</p>)}<small>Source details show where wording came from, not whether it is true. Check names, dates and claims.</small><div className="op-actions"><button disabled={busy || !draft.review.suggestions.some(s => s.bulkEligible && !draft.decisions[s.id])} onClick={() => { const ids = draft.review!.suggestions.filter(s => s.bulkEligible && !draft.decisions[s.id]).map(s => s.id); setUndo(ids); setDraft(d => ({ ...d, decisions: { ...d.decisions, ...Object.fromEntries(ids.map(id => [id, { action: "accepted", text: "" }])) } })); }}>Accept eligible wording changes</button>{undo && <button onClick={() => { setDraft(d => { const decisions = { ...d.decisions }; for (const id of undo) if (decisions[id]?.action === "accepted") delete decisions[id]; return { ...d, decisions }; }); setUndo(null); }}>Undo bulk acceptance</button>}</div>
    {!draft.review.suggestions.length && <p>No proposed changes. Your original sections are preserved.</p>}
    {draft.review.suggestions.map(s => <article className="op-card" key={s.id}><div className="op-grid"><div><strong>Original</strong><p>{s.original}</p></div><div><strong>Proposed</strong><p>{s.proposed}</p></div></div><p>{s.reason}</p><details><summary>Source details</summary>{s.sourceIds.map(id => <p key={id}>{draft.profile!.blocks.find(b => b.id === id)?.sourceText}</p>)}</details>{s.question && <details><summary>Optional clarification · you can skip</summary><p>{s.question}</p><p>To answer, add the detail to your experience profile and review again. Unanswered questions are never added as experience.</p><Link href="/app/profile">Update profile</Link></details>}<p>Status: {draft.decisions[s.id]?.action || "pending"}</p><div className="op-actions"><button onClick={() => setDraft(d => ({ ...d, decisions: { ...d.decisions, [s.id]: { action: "accepted", text: "" } } }))}>Accept</button><button onClick={() => setDraft(d => ({ ...d, decisions: { ...d.decisions, [s.id]: { action: "edited", text: d.decisions[s.id]?.text || s.proposed } } }))}>Edit</button><button onClick={() => setDraft(d => ({ ...d, decisions: { ...d.decisions, [s.id]: { action: "dismissed", text: "" } } }))}>Dismiss</button>{draft.decisions[s.id] && <button onClick={() => setDraft(d => { const decisions = { ...d.decisions }; delete decisions[s.id]; return { ...d, decisions }; })}>Undo</button>}</div>{draft.decisions[s.id]?.action === "edited" && <label>Your wording<textarea value={draft.decisions[s.id].text} onChange={e => setDraft(d => ({ ...d, decisions: { ...d.decisions, [s.id]: { action: "edited", text: e.target.value } } }))} /></label>}</article>)}</section>
    {draft.jd && <section className="op-card"><h2>Job requirements and your experience</h2><p>“Not found” means not found in the information supplied, not that you lack the skill.</p>{draft.review.mapping.map((m, i) => <div key={i} className="op-mapping"><strong>{m.requirement}</strong><p>{m.experience}</p><small>{m.status === "supported" ? "Supported by supplied information" : m.status}</small></div>)}</section>}
    <FinalPreview text={text} draft={draft} setDraft={setDraft} /></>}
  </>;
}
function download(text: string, name: string) { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); try { const a = document.createElement("a"); a.href = url; a.download = `${name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 80) || "OwnPath-CV"}.txt`; document.body.append(a); a.click(); a.remove(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); } }
function FinalPreview({ text, draft, setDraft }: { text: string; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const saveId = useRef<{ snapshot: string; id: string } | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function save() { if (lock.current) return; lock.current = true; setBusy(true); setError(""); setMessage(""); try { const snapshot = JSON.stringify(draft); if (saveId.current?.snapshot !== snapshot) saveId.current = { snapshot, id: crypto.randomUUID() }; await api("/api/cv-review/saved", "POST", { kind: "version", id: saveId.current.id, payload: draft }); setSavedSnapshot(snapshot); } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); } }
  return <section className="op-card"><h2>Complete CV preview</h2><p>Only accepted changes and your manual edits appear here. Pending and dismissed changes keep the original wording.</p><pre className="op-preview" data-testid="final-cv">{text}</pre><small>Plain text: original line order and line breaks, without an added title or trailing newline. Copy and TXT use exactly this text.</small><div className="op-actions"><button onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage("CV copied."); setError(""); } catch { setError("Clipboard unavailable. Select the complete preview and copy it manually."); } }}>Copy CV</button><button onClick={() => { try { download(text, draft.name); setMessage("TXT download requested."); } catch { setError("Download could not start. Copy the preview instead."); } }}>Download TXT (plain text)</button></div><div className="op-grid"><label>Version name<input disabled={busy} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></label><label>Target role (optional)<input disabled={busy} value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value }))} /></label></div><label>Company (optional)<input disabled={busy} value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value }))} /></label><button disabled={busy || !draft.name.trim()} className="op-primary" onClick={() => void save()}>{busy ? "Saving…" : "Save named version"}</button>{savedSnapshot && <p role="status">{savedSnapshot === JSON.stringify(draft) ? "CV version saved. Open it in My CVs." : "An earlier snapshot was saved. Current edits are not saved."}</p>}{message && <p role="status">{message}</p>}{error && <p role="alert" className="op-error">{error}</p>}</section>;
}
export function SavedVersions() {
  const { data, error, retry } = useSaved(); const [busy, setBusy] = useState(false); const lock = useRef(false); const [mutationError, setMutationError] = useState("");
  async function remove(v: Saved) { if (lock.current || !confirm(`Delete “${v.name}”? This cannot be undone.`)) return; lock.current = true; setBusy(true); try { await api("/api/cv-review/saved", "DELETE", { id: v.id, kind: "version" }); retry(); } catch (e) { setMutationError((e as Error).message); } finally { lock.current = false; setBusy(false); } }
  return <><h1>My CVs</h1><p>Saved snapshots stay as they were when you saved them. Profile edits do not rewrite historical versions.</p>{mutationError && <p role="alert" className="op-error">{mutationError}</p>}{!data ? <Retrieval error={error} retry={retry} /> : !data.versions.length ? <div className="op-card"><p>No CV versions saved yet.</p><Link className="op-button op-primary" href="/app/tailor">Tailor my CV</Link></div> : data.versions.map(v => <div className="op-row" key={v.id}><div><Link href={`/app/cvs/${v.id}`}><strong>{v.name} →</strong></Link><p>{new Date(v.created_at).toLocaleDateString()}</p></div><button disabled={busy} onClick={() => void remove(v)}>Delete</button></div>)}</>;
}
export function VersionEditor({ id }: { id: string }) {
  const [savedValue, setSavedValue] = useState("");
  const [row, setRow] = useState<Saved | null>(null); const [draft, setDraft] = useState<Draft | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const lock = useRef(false);
  useEffect(() => { let active = true; api(`/api/cv-review/saved?id=${encodeURIComponent(id)}`).then(d => { if (!active) return; const p = parseDraft(d.version.payload); setRow(d.version); setDraft(p); setSavedValue(JSON.stringify(p)); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id]);
  useEffect(() => {
    if (!draft || JSON.stringify(draft) === savedValue) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element).closest?.("a");
      if (!a || a.download || a.target === "_blank" || new URL(a.href).origin !== window.location.origin || a.href === window.location.href) return;
      if (!window.confirm("Leave this CV without saving your edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [draft, savedValue]);
  if (!draft || !row) return <><h1>Saved CV version</h1>{error ? <p role="alert" className="op-error">{error}</p> : <p role="status">Loading version…</p>}<Link href="/app/cvs">Back to My CVs</Link></>;
  const text = draft.profile && draft.review ? finalDocument(draft.profile, draft.review, draft.decisions) : "";
  async function update() { if (lock.current || !draft || !row) return; lock.current = true; setBusy(true); setError(""); try { const result = await api("/api/cv-review/saved", "PATCH", { kind: "version", id, revision: row.revision, payload: draft }); setRow({ ...row, name: draft.name, revision: result.revision }); setSavedValue(JSON.stringify(draft)); setMessage("Changes saved."); } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); } }
  function editLine(blockId: string, value: string) {
    setMessage("");
    setDraft(d => {
      if (!d?.review || !d.profile) return d;
      const block = d.profile.blocks.find(b => b.id === blockId)!;
      const existing = d.review.suggestions.find(s => s.blockId === blockId);
      const suggestion = existing || { id: `s${d.review.suggestions.length + 1}`, blockId, original: block.text, proposed: block.text || " ", reason: "Manually edited by you.", sourceIds: [blockId], kind: "wording" as const, question: "", bulkEligible: false };
      return { ...d, review: existing ? d.review : { ...d.review, suggestions: [...d.review.suggestions, suggestion] }, decisions: { ...d.decisions, [suggestion.id]: { action: "edited", text: value } } };
    });
  }
  return <><h1>{row.name}</h1><p>Edit this saved version, then explicitly save. Your original profile and other CV versions stay independent.</p><label>Version name<input disabled={busy} value={draft.name} onChange={e => { setMessage(""); setDraft({ ...draft, name: e.target.value }); }} /></label><details><summary>Edit CV wording</summary>{draft.profile?.blocks.filter(b => b.text.trim()).map((b, i) => { const s = draft.review?.suggestions.find(s => s.blockId === b.id); const decision = s && draft.decisions[s.id]; const value = decision?.action === "edited" ? decision.text : decision?.action === "accepted" ? s!.proposed : b.text; return <label key={b.id}>CV line {i + 1}<textarea disabled={busy} value={value} onChange={e => editLine(b.id, e.target.value)} /></label>; })}</details><h2>Complete CV</h2><pre className="op-preview" data-testid="final-cv">{text}</pre><div className="op-actions"><button disabled={busy} className="op-primary" onClick={() => void update()}>Save changes</button><button onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage("CV copied."); } catch { setError("Clipboard unavailable. Select the preview to copy manually."); } }}>Copy CV</button><button onClick={() => { try { download(text, draft.name); } catch { setError("Download could not start. Copy the preview instead."); } }}>Download TXT (plain text)</button></div>{message && <p role="status">{message}</p>}{error && <p className="op-error" role="alert">{error}</p>}</>;
}
