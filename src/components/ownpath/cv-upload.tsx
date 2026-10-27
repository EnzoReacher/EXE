"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useConfirmation } from "./confirmation-dialog";
import WorkbenchIcon from "./workbench-icon";
export default function CVUpload({ cv, onExtract, onProcessingChange, invalid = false }: { cv: string; onExtract: (text: string) => void; onProcessingChange?: (busy: boolean) => void; invalid?: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  const review = useRef<HTMLDetailsElement>(null);
  const operation = useRef({ id: 0, controller: null as AbortController | null });
  const [filename, setFilename] = useState(""); const [pending, setBusy] = useState(false); const [sourceAtStart, setSourceAtStart] = useState(cv); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  const busy = pending && sourceAtStart === cv;
  const [manual, setManual] = useState(false);
  const processingListener = useRef(onProcessingChange);
  useLayoutEffect(() => { processingListener.current = onProcessingChange; }, [onProcessingChange]);
  const confirmation = useConfirmation();
  function invalidate() { operation.current.id++; operation.current.controller?.abort(); setBusy(false); onProcessingChange?.(false); }
  useLayoutEffect(() => {
    const state = operation.current;
    // A newly mounted child owns no extraction. Release any stale parent lock
    // left by an older child/HMR cleanup without changing the retained CV text.
    processingListener.current?.(false);
    const stop = () => { state.id++; state.controller?.abort(); setBusy(false); processingListener.current?.(false); setStatus("Session changed. Extraction cancelled; no text was applied."); };
    window.addEventListener("ownpath:session-ended", stop);
    return () => { state.id++; state.controller?.abort(); processingListener.current?.(false); window.removeEventListener("ownpath:session-ended", stop); };
  }, [cv]);
  async function select(file?: File) {
    if (!file) return;
    invalidate(); const id = operation.current.id; setError(""); setStatus("");
    const kind = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : file.name.toLowerCase().endsWith(".docx") ? "docx" : null;
    const mime = kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!kind || (file.type && file.type !== mime) || !file.size || file.size > 5 * 1024 * 1024) { setError("Choose a nonempty PDF or DOCX, up to 5 MiB. Your CV text is kept."); return; }
    if (cv.trim() && !await confirmation.confirm({ title: "Replace your CV text?", description: "Extracted text will replace the CV input, including your edits. The job description and previous rewritten draft are kept.", action: "Replace CV text" })) return;
    if (id !== operation.current.id) return;
    const controller = new AbortController(); operation.current.controller = controller;
    setSourceAtStart(cv); setFilename(file.name); setBusy(true); onProcessingChange?.(true); setStatus("Extracting text…");
    try {
      const response = await fetch(`/api/cv-review/extract?type=${kind}`, { method: "POST", headers: { "Content-Type": mime }, body: file, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]) });
      let result; try { result = await response.json(); } catch { throw new Error("The upload response could not be read. Try again or paste text."); }
      if (id !== operation.current.id || controller.signal.aborted) return;
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "Extraction failed. Try another file or paste text.");
      if (typeof result?.text !== "string" || !result.text.trim() || result.text.length > 24000 || result.text.split("\n").length > 500) throw new Error("No usable text received. Paste text or try another document.");
      setSourceAtStart(result.text); onExtract(result.text); setStatus("Extraction complete.");
      requestAnimationFrame(() => { if (review.current) review.current.open = true; });
    } catch (e) { if (id === operation.current.id && !controller.signal.aborted) { setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "Extraction timed out. Try again or paste text."); setStatus(""); } }
    finally { if (id === operation.current.id) { setBusy(false); onProcessingChange?.(false); } }
  }
  async function clearText() {
    if (!await confirmation.confirm({ title: "Clear CV content?", description: "This clears the CV input and attachment label. Your job description, instructions and previous rewritten draft are kept.", action: "Clear CV content" })) return;
    invalidate(); setFilename(""); setError(""); setStatus(""); setManual(false); onExtract("");
  }
  function editManually() { setManual(true); requestAnimationFrame(() => { if (review.current) review.current.open = true; document.getElementById("scan-cv")?.focus(); }); }
  return <div className="op-cv-upload">{confirmation.dialog}
    <input ref={picker} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void select(file); }} />
    <div className="op-upload-entry" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length !== 1) { setError("Choose one PDF or DOCX file."); return; } void select(e.dataTransfer.files[0]); }}>
      <span className="op-upload-symbol" aria-hidden="true"><WorkbenchIcon /></span>
      <strong>{filename ? filename : cv.trim() ? "CV text retained" : "Upload your CV"}</strong>
      <span id="cv-upload-help">PDF or DOCX · Max 5 MiB</span>
      <div className="op-upload-actions"><button id="cv-input-entry" type="button" aria-describedby={`cv-upload-help${invalid ? " scan-error" : ""}`} onClick={() => picker.current?.click()}>{filename ? "Replace" : "Select file"}</button>
      {filename && <button type="button" onClick={() => { invalidate(); setFilename(""); setError(""); setStatus("Attachment removed. Your CV text is unchanged."); }}>Remove attachment</button>}
      {busy && <button type="button" onClick={() => { invalidate(); setStatus("Extraction cancelled. Your CV text is unchanged."); }}>Cancel extraction</button>}
      </div>
      {status && <p role="status">{sourceAtStart !== cv && pending ? "Extraction cancelled; your edits are kept." : status}</p>}
    </div>
    {error && <div><p role="alert" className="op-error">{error}{cv.trim() ? " Previous CV text is kept." : ""}</p><button type="button" onClick={editManually}>Enter or correct text manually</button></div>}
    {(cv || manual) && <details ref={review} className="op-extracted-review"><summary>Review extracted text</summary><label htmlFor="scan-cv">Your CV</label><textarea id="scan-cv" className="op-source" aria-invalid={invalid || undefined} aria-describedby={`cv-limit${invalid ? " scan-error" : ""}`} value={cv} onChange={e => onExtract(e.target.value)} /><small id="cv-limit">{cv.length.toLocaleString()} / 24,000 characters · 500 lines max</small><p>Review the reading order, name, headings and entry dates against your source before Scan. Ambiguous associations are not guessed. Correct the text here; no AI request.</p><button type="button" onClick={() => void clearText()}>Clear CV content</button></details>}
    <details className="op-file-help"><summary>File help</summary><p>Text-based, unencrypted PDF or DOCX only; no OCR. Files are extracted temporarily on this server, not sent to AI or saved. For image-only/encrypted PDFs, use a text-based unencrypted file or enter text manually after an extraction error.</p></details>
  </div>;
}
