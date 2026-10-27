"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { completeCV, input, parseRewrite, parseScan, type Scan } from "@/lib/scan-rewrite/domain";
import { examples } from "@/lib/cv-review/examples";
import { parseSnapshot, type Snapshot } from "@/lib/scan-rewrite/saved";
import { getTemplate } from "@/lib/cv-templates";
import CVDocument from "./cv-document";
import CVStructureEditor from "./cv-structure-editor";
import type { CVStructure } from "@/lib/cv-templates/assignments";
import StructuredCVEditor from "./structured-cv-editor";
import { parseStructuredResponse, structuredText, type StructuredCV } from "@/lib/scan-rewrite/structured-cv";
import WorkbenchIcon from "./workbench-icon";
import CVUpload from "./cv-upload";
import { PendingLabel } from "./interaction-controls";
import { useConfirmation } from "./confirmation-dialog";
import { parseDisclosure, type Disclosure } from "@/lib/scan-rewrite/disclosure";
import { operationIdentity, prepareReviewedRequest, applyPreparedRequest, uncertainAttempt, setUncertainAttempt as setUncertain, subscribeUncertainty, forgetOperation, forgetOperationIdentities } from "@/lib/scan-rewrite/request-identity";
import WorkspaceActivity from "./workspace-activity";
import { ContextualUsage } from "./usage-panel";
import { usePlanSummary } from "./use-plan-summary";
import ScanFindings from "./scan-findings";
const subscribe = () => () => {};

export default function ScanRewrite({ initial, savedId, savedRevision, showOverview = false, onWorkChange, view = initial ? "rewrite" : "scan" }: { initial?: Snapshot; savedId?: string; savedRevision?: number; showOverview?: boolean; onWorkChange?: (hasWork: boolean) => void; view?: "scan" | "rewrite" | "hidden" } = {}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const confirmation = useConfirmation(); const examplesMenu = useRef<HTMLDetailsElement>(null);
  const dismissConfirmation = useRef(confirmation.dismiss);
  useEffect(() => { dismissConfirmation.current = confirmation.dismiss; }, [confirmation.dismiss]);
  const [cv, setCV] = useState(initial?.cv || ""); const [jd, setJD] = useState(initial?.jd || ""); const [scan, setScan] = useState<Scan | null>(initial?.scan || null);
  const [instructions, setInstructions] = useState(initial?.instructions || ""); const [language, setLanguage] = useState(initial?.language || "English"); const [document, setDocument] = useState(initial?.document || "");
  const [structure, setStructure] = useState<CVStructure | undefined>(initial?.structure);
  const [structuredCV, setStructuredCV] = useState<StructuredCV | undefined>(initial?.structuredCV);
  const [correcting, setCorrecting] = useState(false);
  useEffect(() => { onWorkChange?.(!!(cv || jd || instructions || document)); }, [cv, jd, instructions, document, onWorkChange]);
  const [changes, setChanges] = useState<string[]>(initial?.changes || []); const [notes, setNotes] = useState<string[]>(initial?.notes || []);
  const sharingEpoch = useRef(0);
  const [sharing, setSharing] = useState<Disclosure>({ provider: "the configured AI provider", purpose: "unverified", external: true }); const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<"scan" | "rewrite" | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [uncertainReason, setUncertainReason] = useState("");
  const identity = useRef<{key:string;id:string;payload:string}|null>(null); const [recover,setRecover]=useState(false);
  const uncertain = useSyncExternalStore(subscribeUncertainty, uncertainAttempt, () => false);
  const recovery = useRef({ reviewing: false, paused: false });
  const preparedMessage = useRef<HTMLParagraphElement>(null);
  const [extracting, setExtracting] = useState(false);
  const scanBlockedBy = busy ? "busy" : checking ? "disclosure" : extracting ? "extraction" : uncertain ? "uncertainty" : "";
  const scanBlockedReason = busy ? `${busy === "scan" ? "Scan" : "Rewrite"} is in progress. Wait for the result or choose Stop waiting.` : checking ? "Checking processing details before starting. Your work is kept." : extracting ? "Reading your attachment. Wait or choose Cancel extraction; your retained CV text is kept." : uncertain ? "Requests are paused. Use Review and continue before preparing a separate request." : "";
  const [documentSource, setDocumentSource] = useState({ cv: initial?.cv || "", jd: initial?.jd || "" });
  const [title, setTitle] = useState(initial?.title || "My tailored CV"); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(() => initial ? JSON.stringify(initial) : "");
  const [sourceOpen, setSourceOpen] = useState(!initial?.scan);
  const [usageVersion, setUsageVersion] = useState(0);
  const { refresh: refreshUsage } = usePlanSummary(showOverview);
  useEffect(() => { if (!usageVersion) return; const timer = setTimeout(refreshUsage, 0); return () => clearTimeout(timer); }, [usageVersion, refreshUsage]);
  const [resultPanel, setResultPanel] = useState<"edit" | "save" | null>(null);
  const [rewriteState, setRewriteState] = useState<"idle" | "pending" | "succeeded" | "failed">(initial?.document ? "succeeded" : "idle");
  const [resultNeedsAttention, setResultNeedsAttention] = useState(false);
  const generatedText = useRef(initial?.document || "");
  const sourcesPanel = useRef<HTMLDetailsElement>(null);
  const location = useRef({ view, epoch: 0 });
  const waiting = useRef<{ eligible: boolean; initiator: Element | null }>({ eligible: false, initiator: null });
  useEffect(() => { if (location.current.view !== view) location.current = { view, epoch: location.current.epoch + 1 }; }, [view]);
  useEffect(() => {
    const moved = (event: Event) => {
      // A disabled submit may blur to body without user intent. Actual focus/input elsewhere cancels completion focus.
      if (event.type === "focusin" && (event.target === window.document.body || event.target === waiting.current.initiator)) return;
      if (event.type === "pointerdown" && event.target === waiting.current.initiator) return;
      waiting.current.eligible = false;
    };
    for (const event of ["focusin", "pointerdown", "keydown", "wheel", "visibilitychange"]) window.document.addEventListener(event, moved, true);
    return () => { for (const event of ["focusin", "pointerdown", "keydown", "wheel", "visibilitychange"]) window.document.removeEventListener(event, moved, true); };
  }, []);
  function revealResult() { setResultNeedsAttention(false); const element = documentHeading.current; element?.focus({ preventScroll: true }); element?.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }
  const saveState = useRef({ id: savedId || "", revision: savedRevision || 0, locked: false, pending: "", controller: null as AbortController | null });
  const templateId = getTemplate(initial?.templateId).id;
  const snapshot = useMemo(() => scan && documentSource.cv === cv && documentSource.jd === jd ? { schemaVersion: 2 as const, templateId, ...(structuredCV ? { structuredCV } : structure ? { structure } : {}), cv, jd, scan, instructions, language, document, changes, notes, title } : null, [templateId, structuredCV, structure, scan, documentSource, cv, jd, instructions, language, document, changes, notes, title]);
  const serializedSnapshot = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  async function save() {
    if (saveState.current.locked || !snapshot) return;
    let payload; try { payload = parseSnapshot(snapshot); } catch { setError("Check the title, instructions and complete CV before saving."); window.document.getElementById("cv-title")?.focus(); return; }
    saveState.current.locked = true; setSaving(true); setError(""); const state = saveState.current;
    const serialized = JSON.stringify(payload);
    if (!state.id || (!state.revision && state.pending && state.pending !== serialized)) state.id = crypto.randomUUID();
    state.pending = serialized;
    const controller = new AbortController(); state.controller = controller; const revision = request.current.revision;
    try {
      const response = await fetch("/api/cv-review/saved", { method: state.revision ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: state.id, kind: "version", revision: state.revision, payload }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      let result; try { result = await response.json(); } catch { throw new Error("The save response could not be read. Your draft is kept; retry."); }
      if (controller.signal.aborted) return;
      if (!response.ok || result.saved !== true || (state.revision ? result.revision !== state.revision + 1 : result.id !== state.id)) throw new Error(result.error || "Save was not confirmed. Your draft is kept; retry.");
      state.revision = state.revision ? result.revision : 1;
      setUsageVersion(n => n + 1);
      if (revision === request.current.revision) setSaved(JSON.stringify(payload));
    } catch (e) { if (!controller.signal.aborted && revision === request.current.revision) setError(e instanceof Error ? e.message : "Save failed. Your draft is kept."); }
    finally { state.locked = false; setSaving(false); }
  }
  const request = useRef({ revision: 0, controller: null as AbortController | null, locked: false, dispatched: false }); const heading = useRef<HTMLHeadingElement>(null); const documentHeading = useRef<HTMLHeadingElement>(null);
  function cancel() { if (request.current.locked && request.current.dispatched) { recovery.current.paused = true; setUncertain(true); } ++request.current.revision; request.current.controller?.abort(); request.current.locked = false; request.current.dispatched = false; setBusy(null); setChecking(false); setRewriteState(state => state === "pending" ? "idle" : state); }
  function processingChanged(value: boolean) { setExtracting(value); if (value) cancel(); }
  function stopWaiting() { cancel(); setRewriteState("failed"); setMessage(""); }
  async function reviewUncertainty(knownUnresolved = false) {
    if ((!uncertainAttempt() && !knownUnresolved) || recovery.current.reviewing || request.current.locked) return;
    // Explicitly reporting a known unresolved attempt restores a local safety
    // pause only; it does not invent a server reservation or its outcome.
    recovery.current.paused = true; setUncertain(true);
    recovery.current.reviewing = true;
    const revision = request.current.revision;
    try {
      const proceed = await confirmation.confirm({ title: "Review and continue", description: "The previous request may have been processed and charged. Continuing starts a separate request and may use another allowance.", acknowledgement: "I understand the previous request remains unresolved.", action: "Prepare a new request" });
      if (!proceed || revision !== request.current.revision || !recovery.current.paused) return;
      // Invalidate every old completion before releasing only the local pause.
      cancel(); waiting.current.eligible = false;
      const prepared = prepareReviewedRequest(identity.current?.key);
      if (identity.current) identity.current = { ...identity.current, ...prepared };
      recovery.current.paused = false; setUncertain(false); setRecover(false); setError("");
      setMessage("New request prepared. Choose Scan or Rewrite when ready; the previous request remains unresolved.");
      const preparedRevision = request.current.revision;
      requestAnimationFrame(() => { if (request.current.revision === preparedRevision) preparedMessage.current?.focus({ preventScroll: true }); });
    } finally { recovery.current.reviewing = false; }
  }
  async function insertExample(text: string) {
    if ((cv || jd || document || instructions) && !await confirmation.confirm({ title: "Use a fictional example?", description: "This replaces the CV and job-description inputs. Your previous draft is retained, but will need a new Scan and Rewrite before saving.", action: "Replace inputs" })) return;
    cancel(); setExtracting(false); setCV(text); setJD("Requirements:\nClear communication and accurate records.\nPreferred: supplier negotiation experience."); setScan(null); setSourceOpen(true); setError(""); setMessage("Fictional example inserted. Review both fields before scanning.");
    if (examplesMenu.current) examplesMenu.current.open = false;
    window.document.getElementById("cv-input-entry")?.focus({ preventScroll: true });
  }
  function sourceChanged(value: string, field: "cv" | "jd") { cancel(); setRewriteState("idle"); if (field === "cv") { setCV(value); setExtracting(false); } else setJD(value); setScan(null); setSourceOpen(true); setError(""); setInvalidField(""); setMessage(""); }
  async function run(operation: "scan" | "rewrite") {
    if (request.current.locked || extracting || uncertainAttempt() || recovery.current.paused || recovery.current.reviewing) return;
    if (operation === "rewrite" && document !== generatedText.current && !await confirmation.confirm({ title: "Replace your edited CV?", description: "Rewriting replaces your unsaved CV edits only after a valid result arrives. Cancel to keep editing or export/save first.", action: "Rewrite edited CV" })) return;
    if (request.current.locked || extracting || uncertainAttempt() || recovery.current.paused || recovery.current.reviewing) return;
    try { input({ cv, jd }); if (cv.split("\n").length > 500) throw new Error("Use at most 500 CV lines. Your text is kept; edit it below."); if (operation === "rewrite" && (!scan || !instructions.trim())) throw new Error("Scan first, then tell us how to improve your CV."); }
    catch (e) { setError((e as Error).message); const field = !cv.trim() ? "cv-input-entry" : cv.length > 24000 || cv.split("\n").length > 500 ? "scan-cv" : !jd.trim() || jd.length > 18000 ? "scan-jd" : "rewrite-request"; setInvalidField(field); const element = window.document.getElementById(field); const details = element?.closest("details"); if (details) details.open = true; element?.focus(); return; }
    request.current.locked = true; request.current.dispatched = false; const revision = ++request.current.revision; const controller = new AbortController(); request.current.controller = controller;
    const initiator = window.document.activeElement; const startedAt = location.current.epoch;
    waiting.current = { eligible: true, initiator };
    setChecking(true); setError(""); setInvalidField(""); setMessage(""); setNeedsSignIn(false); setUncertainReason(""); const base = document && documentSource.cv === cv ? document : cv;
    let dispatched = false; let preflightRejected = false;
    try {
      const info = await fetch("/api/cv-review/disclosure", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
      if (!info.ok) throw new Error("Sharing details could not be checked. Your work is kept; retry.");
      let raw; try { raw = await info.json(); } catch { throw new Error("Sharing details could not be checked. Your work is kept; retry."); }
      const disclosure = parseDisclosure(raw);
      if (revision !== request.current.revision || controller.signal.aborted) return;
      // This deliberate action click authorizes this operation, not future sends.
      // Bind it to freshly verified processing details; the server rejects stale identities.
      sharingEpoch.current++; setSharing(disclosure);
      if (revision !== request.current.revision || controller.signal.aborted) return;
      setChecking(false); setBusy(operation); if (operation === "rewrite") setRewriteState("pending");
      const payload=operation==='scan'?{cv,jd,consent:true}:{cv,jd,consent:true,scan,scanCV:cv,scanJD:jd,base,instructions,language};const serialized=JSON.stringify({operation,payload});
      if(identity.current?.payload!==serialized)identity.current={...await operationIdentity(operation,payload),payload:serialized};
       if(revision!==request.current.revision||controller.signal.aborted)return;
       const prepared = applyPreparedRequest(identity.current.key);
       if (prepared) identity.current = { ...identity.current, ...prepared };
       dispatched = true; request.current.dispatched = true;
      const response = await fetch(`/api/cv-review/${operation}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...payload,requestId:identity.current.id,consentPurpose:disclosure.purpose}), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
      let data; try { data = await response.json(); } catch { throw new Error(`Unreadable server response (HTTP ${response.status}). Your work is kept.`); }
      if (!response.ok) {
        // These routes return 401/403 only at the auth/origin gates, before inference.
          // The reservation gate shares this code with post-dispatch failures (502).
          // Only its 429 response confirms that this request never reached the provider.
          preflightRejected = response.status === 401 || response.status === 403 || (response.status === 429 && data?.error?.code === "reconciliation_required") || ["invalid_input", "not_configured", "setup", "plan_limit", "limit", "duplicate", "busy", "quota", "reconcile", "rate", "origin", "content_type", "consent_changed", "body", "invalid", "completed_unavailable", "failed_unavailable", "conflict"].includes(data?.error?.code);
        if (revision === request.current.revision) {
          if (response.status === 401) setNeedsSignIn(true);
          if (["completed_unavailable", "failed_unavailable", "conflict"].includes(data?.error?.code)) setRecover(true);
          if (response.status === 502 && data?.error?.code === "result_rejected") setUncertainReason("A result was received but failed safety or validity checks. No new CV result was applied. Processing may have incurred charges; usage is retained. Ask the site operator to review this request before another attempt.");
          if (response.status === 503 && data?.error?.code === "usage_acknowledgement") setUncertainReason("Usage finalization could not be confirmed. No new CV result was applied. Your previous work is kept. Ask the site operator to verify the request before another attempt.");
        }
        throw new Error(data?.error?.code === "not_configured" ? "AI is not configured for this workspace. Ask the site owner to check the connection. Your work is kept." : typeof data?.error === "string" ? data.error : data?.error?.message || "Request failed. Your work is kept.");
      }
      if (revision !== request.current.revision || controller.signal.aborted) return;
      if (operation === "scan") { setScan(parseScan(data, { cv, jd })); if (!sourcesPanel.current?.contains(window.document.activeElement)) setSourceOpen(false); }
      else {
        // New requests return a whole structured CV. Legacy responses remain
        // readable for controlled older integrations; they are never requested.
        const result = data?.format === "structured-cv-v1" ? parseStructuredResponse(data) : parseRewrite(data, base);
        const text = "cv" in result ? result.document : completeCV(base, result);
        if (text.length > 24000) throw new Error("The draft is too long. Your previous work is kept.");
        setDocumentSource({ cv, jd }); setDocument(text); setStructuredCV("cv" in result ? result.cv : undefined); setStructure(undefined); setCorrecting(false); generatedText.current = text; setChanges(result.changes); setNotes(result.notes); setRewriteState("succeeded"); setResultNeedsAttention(location.current.view !== "rewrite");
      }
      setUsageVersion(n => n + 1);
      if(identity.current)forgetOperation(identity.current.key);identity.current=null;setRecover(false);
      setMessage(operation === "scan" ? "Scan complete. Review the findings and add your rewrite instructions." : "Rewrite complete. Review your complete CV draft.");
      requestAnimationFrame(() => { if (revision === request.current.revision && !controller.signal.aborted && window.document.visibilityState !== "hidden" && location.current.epoch === startedAt && location.current.view === operation && waiting.current.eligible && (window.document.activeElement === initiator || window.document.activeElement === window.document.body)) { if (operation === "rewrite") revealResult(); else heading.current?.focus({ preventScroll: true }); } });
    } catch (e) { if (revision === request.current.revision && !controller.signal.aborted) {
      if (dispatched && !preflightRejected) { recovery.current.paused = true; setUncertain(true); setUsageVersion(n => n + 1); setError(""); setMessage(""); }
      else setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "Sharing details could not be checked. No AI request was sent; try again when the connection is available.");
      if (operation === "rewrite") setRewriteState("failed");
    } }
    finally { if (revision === request.current.revision) { request.current.locked = false; request.current.dispatched = false; setBusy(null); setChecking(false); } }
  }
  useEffect(() => { const current = request.current; const persistence = saveState.current; const expire = () => { ++current.revision; recovery.current.paused = false; dismissConfirmation.current(); identity.current=null;forgetOperationIdentities();setRecover(false);setUncertain(false); current.controller?.abort(); persistence.controller?.abort(); current.locked = false; setBusy(null); setChecking(false); setExtracting(false); }; window.addEventListener("ownpath:session-ended", expire); return () => { if (current.locked && current.dispatched) setUncertain(true); ++current.revision; current.controller?.abort(); persistence.controller?.abort(); window.removeEventListener("ownpath:session-ended", expire); }; }, []);
  useEffect(() => { const controller = new AbortController(); const epoch = sharingEpoch.current; void fetch("/api/cv-review/disclosure", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) }).then(async response => { if (response.ok && !controller.signal.aborted) { const value = parseDisclosure(await response.json()); if (!controller.signal.aborted && sharingEpoch.current === epoch) setSharing(value); } }).catch(() => {}); return () => controller.abort(); }, []);
  useEffect(() => { if (!cv && !document) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [cv, document]);
  useEffect(() => {
    if (!cv && !jd && !document && !instructions) return;
    const protect = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a"); if (!link || link.target === "_blank" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin && (url.pathname === "/app" || url.pathname.startsWith("/app/"))) return;
      if (!window.confirm("Leave this workspace? Unsaved CV content will be lost. Save or export first to keep it.")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.document.addEventListener("click", protect, true); return () => window.document.removeEventListener("click", protect, true);
  }, [cv, jd, document, instructions]);
  return <div hidden={view === "hidden"} className={`op-scan-tool op-separated-workspace${scan || document ? " has-results" : ""}`} data-workspace={view}>{confirmation.dialog}
    <div hidden={view !== "scan"} className="op-scan-workspace">
    <div className="op-page-heading"><div><h1>Scan your CV</h1><p>See how your experience matches the job.</p></div>
      <details className="op-examples" ref={examplesMenu} onKeyDown={event => { if (event.key === "Escape" && examplesMenu.current) { examplesMenu.current.open = false; examplesMenu.current.querySelector("summary")?.focus(); } }}><summary>Try an example</summary><div className="op-example-options"><p>Fictional examples · replaces your inputs</p>{Object.entries(examples).map(([name, text]) => <button type="button" key={name} onClick={() => void insertExample(text)}>{name}<WorkbenchIcon name="arrow" /></button>)}</div></details>
    </div>
    <details ref={sourcesPanel} className={`op-source-summary${scan || document ? " has-source-result" : ""}`} open={sourceOpen} onToggle={e => { if (e.target === e.currentTarget) setSourceOpen(e.currentTarget.open); }}><summary><strong>View/edit CV and JD</strong><span>{extracting ? "Reading attachment…" : `${cv.length.toLocaleString()} CV characters · ${jd.length.toLocaleString()} JD characters`}</span></summary>
    <div className="op-input-grid">
      <section className={`op-input-card ${cv.trim() ? "is-filled" : ""}`}><header><span className="op-icon-tile"><WorkbenchIcon /></span><h2 id="cv-input-heading">Your CV</h2></header><CVUpload cv={cv} invalid={invalidField === "scan-cv" || invalidField === "cv-input-entry"} onProcessingChange={processingChanged} onExtract={text => sourceChanged(text, "cv")} /></section>
      <section className={`op-input-card ${jd.trim() ? "is-filled" : ""}`}><header><span className="op-icon-tile"><WorkbenchIcon name="scan" /></span><label htmlFor="scan-jd">Target job</label></header><textarea disabled={!hydrated} id="scan-jd" aria-invalid={invalidField === "scan-jd" || undefined} aria-describedby={`jd-limit${invalidField === "scan-jd" ? " scan-error" : ""}`} className="op-source" value={jd} onChange={e => sourceChanged(e.target.value, "jd")} placeholder="Paste the job description…" /><footer id="jd-limit"><span>{jd.length.toLocaleString()} / 18,000 characters</span></footer></section>
    </div></details>
    <div className="op-scan-action"><button className={`${scan ? "" : "op-primary "}op-scan-button`} disabled={!!scanBlockedBy} data-blocked-by={scanBlockedBy || undefined} aria-describedby={scanBlockedReason ? "scan-readiness" : undefined} aria-busy={busy === "scan" || checking} onClick={() => void run("scan")}><PendingLabel pending={busy === "scan" || checking} reserve="Scanning…">{busy === "scan" ? "Scanning…" : "Scan CV"}</PendingLabel><WorkbenchIcon name="arrow" /></button><div className="op-scan-disclosure"><small>{sharing.external ? "Your CV and job description are sent to AI." : "No external model is contacted."}</small><details className="op-sharing"><summary>Privacy details</summary><ul>{sharing.external ? <><li>{sharing.purpose === "unverified" ? "Recipient is verified before sending." : `Processed by ${sharing.provider}.`}</li><li>Contact filtering is limited. Review personal details before sending.</li></> : <li>Fixed fictional preview; no external AI processing.</li>}</ul></details></div></div>
    {scanBlockedReason && <p id="scan-readiness" role="status">{scanBlockedReason}</p>}
    {busy === "scan" && <div className="op-waiting" role="status"><span>Scan in progress. No changes are applied until a valid response arrives.</span><button type="button" onClick={stopWaiting}>Stop waiting</button></div>}
    <ContextualUsage operation="scan" />
    </div>
    {error && <p id="scan-error" role="alert" className="op-error">{error === "OpenAI is not configured." ? "AI is not configured. The site owner needs to check the connection; your text is kept." : error}</p>}{message && <p ref={preparedMessage} tabIndex={-1} role="status">{message}</p>}
    {needsSignIn && <p><a href="/sign-in" target="_blank" rel="noreferrer">Sign in again in a new tab</a>. Keep this tab open to preserve your draft, then return and choose Scan or Rewrite when ready.</p>}
    {uncertain && <div className="op-uncertainty"><p id="scan-error" className="op-message" role="alert">{uncertainReason || "AI requests are paused because the result could not be verified. Processing may have incurred charges; your work is kept."}</p><button type="button" disabled={!!busy || checking || extracting} onClick={() => void reviewUncertainty()}>Review and continue</button></div>}
    {recover&&!uncertain&&<button type="button" onClick={async()=>{if(await confirmation.confirm({title:'Prepare a new AI request?',description:'The previous result cannot be recovered. A new request may use another allowance and incur charges. Your current draft is kept.',action:'Prepare new request'})){if(identity.current)forgetOperation(identity.current.key);identity.current=null;setRecover(false);setError('');setMessage('Ready for a deliberate new request. Click Scan or Rewrite when ready.');}}}>Prepare a new request</button>}
    {showOverview && view === "scan" && !scan && !document && <details className="op-recent-disclosure"><summary>Recent saved CVs</summary><WorkspaceActivity /></details>}
    {scan && <section hidden={view !== "scan"} className="op-analysis op-reveal" aria-labelledby="scan-heading">
      <div className="op-section-heading"><h2 id="scan-heading" ref={heading} tabIndex={-1}>Your scan</h2><Link className="op-primary op-rewrite-link" href="/app/rewrite">Rewrite this CV <WorkbenchIcon name="arrow" /></Link></div>
      <div className="op-findings"><ScanFindings scan={scan} prefix="scan" /></div>
    </section>}
    <div hidden={view !== "rewrite"} className="op-rewrite-workspace">
      <div className="op-page-heading"><div><h1>Rewrite CV</h1><p>Shape your next draft without adding new claims.</p></div><Link href="/app/scan">Back to Scan CV</Link></div>
      {!scan && <section className="op-rewrite-empty"><h2>Start with a Scan</h2><p>Rewrite needs your CV, target job and a valid Scan in this open session. Nothing runs automatically.</p><Link className="op-rewrite-link" href="/app/scan">Go to Scan CV →</Link><p>Or reopen an explicitly saved CV from <Link href="/app/cvs">Saved CVs</Link>.</p></section>}
      <div className="op-writing-grid">
        <section hidden={!scan} id="rewrite-composer" className="op-composer" aria-labelledby="composer-heading">
          <details className="op-composer-options" open={!document || rewriteState === "pending"}><summary id="composer-heading">Rewrite instructions</summary>
          <div className="op-composer-fields">
            <label htmlFor="rewrite-request">How should we improve it?</label><textarea id="rewrite-request" rows={3} value={instructions} onChange={e => { cancel(); setInstructions(e.target.value); }} placeholder="Make the wording clearer and emphasize my relevant experience. Keep every claim accurate." />
            <div className="op-instruction-chips" aria-label="Instruction starters">{[["Make it concise", "Keep it concise without removing important information."], ["Clearer wording", "Use clear, direct language and preserve my responsibilities."], ["Keep my voice", "Keep my natural voice and avoid inflated claims."]].map(([label, text]) => <button type="button" key={label} onClick={() => { cancel(); setInstructions(value => value ? `${value}\n${text}` : text); window.document.getElementById("rewrite-request")?.focus({ preventScroll: true }); }}>{label}<span aria-hidden="true">+</span></button>)}</div>
            <label className="op-language">Language<select value={language} onChange={e => { cancel(); setLanguage(e.target.value as "English" | "Vietnamese"); }}><option>English</option><option>Vietnamese</option></select></label>
          </div>
          <button className="op-primary" disabled={!!busy || checking || extracting || uncertain || !instructions.trim()} aria-describedby="rewrite-prerequisites" aria-busy={busy === "rewrite" || checking} onClick={() => void run("rewrite")}><PendingLabel pending={busy === "rewrite" || checking} reserve="Rewrite again">{busy === "rewrite" ? "Rewriting…" : document ? "Rewrite again" : "Rewrite CV"}</PendingLabel><WorkbenchIcon name="arrow" /></button>
          <p id="rewrite-prerequisites" className="op-composer-note" role={busy === "rewrite" ? "status" : undefined}>{busy === "rewrite" ? "Waiting for your next draft. Your current work stays here." : !instructions.trim() ? "Add a direction or choose a starter above." : "A complete draft. Yours to review and edit."}</p>
          <details className="op-sharing"><summary>Privacy details</summary><ul><li>{sharing.external ? `Your CV, job description, validated Scan, current draft and rewrite instructions are processed by ${sharing.purpose === "unverified" ? "the configured AI service (verified before starting)" : sharing.provider}.` : "Fixed fictional preview; no external AI processing."}</li><li>Contact filtering is limited. Review personal details before starting.</li></ul></details>
          <ContextualUsage operation="rewrite" />
          <details className="op-writing-context"><summary>Source CV & JD</summary><h3>CV</h3><pre>{cv}</pre><h3>Target job</h3><pre>{jd}</pre><Link href="/app/scan">Edit sources in Scan CV</Link></details>
          {scan && <details className="op-writing-context"><summary>Scan findings & evidence ({scan.findings.length})</summary><ScanFindings scan={scan} prefix="rewrite" /></details>}
          </details>
        </section>
      <div hidden={!scan && !document} className="op-writing-result" data-request-state={rewriteState}>
        {rewriteState === "pending" && <section className="op-result-pending" role="status"><h2>Rewriting your CV…</h2><p>Your complete CV will appear here when the request succeeds.</p><button onClick={stopWaiting}>Stop waiting</button></section>}
         {rewriteState === "failed" && !uncertain && <p role="status" className="op-message">Rewrite did not complete. Your instructions and any previous result are kept. Review the message above.</p>}
        {!document && rewriteState !== "pending" && <section className="op-result-placeholder"><h2>Your complete CV will appear here</h2><p>Add your writing direction, then choose Rewrite CV. Editing, saving and exporting never call AI.</p></section>}
    {document && <section className="op-result" aria-labelledby="draft-heading"><div className="op-section-heading"><div><h2 id="draft-heading" ref={documentHeading} tabIndex={-1}>{rewriteState === "succeeded" ? "Your rewritten CV is ready" : "Previous CV result"}</h2></div><span className="op-draft-state" role="status"><span aria-hidden="true">●</span>{saved && JSON.stringify(snapshot) === saved ? "Saved draft" : "Unsaved draft"}</span>{resultNeedsAttention && <button className="op-view-result" onClick={revealResult}>View result</button>}</div>{(documentSource.cv !== cv || documentSource.jd !== jd) && <p role="status" className="op-message">Previous draft retained. Scan and rewrite the new inputs before saving it.</p>}
      <div className="op-result-controls">
        <div className="op-result-action-row">
          <button type="button" id="cv-edit-toggle" aria-expanded={resultPanel === "edit"} aria-controls="cv-edit-panel" onClick={() => setResultPanel(value => value === "edit" ? null : "edit")}><WorkbenchIcon name="edit" />Edit complete CV</button>
          <button type="button" id="cv-save-toggle" className={resultPanel !== "save" && serializedSnapshot !== saved ? "op-primary" : undefined} aria-expanded={resultPanel === "save"} aria-controls="cv-save-panel" onClick={() => setResultPanel(value => value === "save" ? null : "save")}>Save this CV (optional)</button>
        </div>
        <div className="op-result-panel" hidden={!resultPanel}>
          <div className="op-editor-panel" id="cv-edit-panel" role="region" aria-labelledby="cv-edit-toggle" hidden={resultPanel !== "edit"}>{structuredCV ? <StructuredCVEditor cv={structuredCV} onChange={value => { cancel(); setStructuredCV(value); setDocument(structuredText(value)); }} /> : <><label htmlFor="complete-cv">Complete CV text</label>{structure && <p>Changing raw text clears the structure assignments. Use Correct structure without AI again after editing; the saved version stays unchanged until you explicitly save.</p>}<textarea id="complete-cv" className="op-document-editor" value={document} onChange={e => { cancel(); setDocument(e.target.value); setStructure(undefined); setCorrecting(false); }} /><small>Your edits update the preview and exports. No AI request.</small></>}</div>
          <div className="op-save-panel" id="cv-save-panel" role="region" aria-labelledby="cv-save-toggle" hidden={resultPanel !== "save"}><div className="op-save-controls"><div><label htmlFor="cv-title">Title</label><input id="cv-title" value={title} onChange={e => setTitle(e.target.value)} /></div><button disabled={saving || !!busy || !snapshot} aria-busy={saving} aria-describedby="cv-save-state" onClick={() => void save()}><PendingLabel pending={saving} reserve="Saving…">{saving ? "Saving…" : "Save CV"}</PendingLabel></button></div><p id="cv-save-state" role="status">{saving ? "Saving this CV…" : !snapshot ? "Scan and rewrite the current inputs before saving." : saved ? serializedSnapshot === saved ? "CV saved." : "Current edits are not saved." : "Saving is optional. Your draft stays here."}</p></div>
        </div>
        <div hidden={resultPanel !== "save"}><ContextualUsage operation="save" /></div>
      </div>{!structuredCV && <details><summary>Legacy CV structure correction (optional)</summary><p>Older saved CVs remain editable without another Scan or Rewrite.</p><button type="button" disabled={!!busy || saving} onClick={() => setCorrecting(true)}>Correct structure without AI</button></details>}{correcting && !structuredCV && <CVStructureEditor text={document} sourceText={documentSource.cv} initial={structure} onCancel={() => setCorrecting(false)} onApply={value => { cancel(); setStructure(value); setCorrecting(false); setMessage("Structure applied to draft. Review and explicitly Save CV; accepted wording is unchanged."); }} />}<CVDocument text={document} templateId={templateId} structure={structure} structuredCV={structuredCV} />
      <details className="op-change-notes"><summary>What changed</summary>{changes.map((c, i) => <p key={i}>{c}</p>)}{notes.map((n, i) => <p key={i}>{n}</p>)}</details>
    </section>}
      </div></div>
    </div>
  </div>;
}
