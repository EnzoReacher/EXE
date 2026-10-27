"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { PendingLabel } from "./interaction-controls";
import { documentLayout, documentText, emphasisAt, getTemplate, lineTag, templateHTML, type TemplateId } from "@/lib/cv-templates";
import type { CVStructure } from "@/lib/cv-templates/assignments";
import type { StructuredCV } from "@/lib/scan-rewrite/structured-cv";
import { structureWarnings } from "@/lib/cv-templates/structure";
export function CVBody({ text, templateId, structure, structuredCV }: { text: string; templateId?: TemplateId; structure?: CVStructure; structuredCV?: StructuredCV }) {
  return <>{documentLayout(text, templateId, structure, structuredCV).map((line, i) => { const Tag = lineTag(line); const boldAt = emphasisAt(line); return <Tag key={i} className={`cv-${line.kind}`}>{line.dateAt !== undefined ? <><span>{line.text.slice(0, line.dateAt)}</span><span className="cv-date">{line.text.slice(line.dateAt)}</span></> : boldAt ? <><strong>{line.text.slice(0, boldAt)}</strong>{line.text.slice(boldAt)}</> : line.text || "\u00a0"}</Tag>; })}</>;
}
function CVDocument({ text, templateId, structure, structuredCV, onCorrect }: { text: string; templateId?: TemplateId; structure?: CVStructure; structuredCV?: StructuredCV; onCorrect?: () => void }) {
  const template = getTemplate(templateId);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const frame = useRef<HTMLIFrameElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "pending" | "copied">("idle");
  const copy = useRef({ locked: false, alive: true, epoch: 0 }); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const printHTML = useMemo(() => printDocument(text, templateId, structure, structuredCV), [text, templateId, structure, structuredCV]);
  const exportText = useMemo(() => documentText(text, templateId, structure, structuredCV), [text, templateId, structure, structuredCV]);
  useEffect(() => { const state = copy.current; state.alive = true; return () => { state.alive = false; ++state.epoch; clearTimeout(timer.current); }; }, []);
  async function copyText() {
    if (copy.current.locked) return;
    copy.current.locked = true; const epoch = ++copy.current.epoch;
    clearTimeout(timer.current); setCopyState("pending"); setError(""); setMessage("");
    try {
      await navigator.clipboard.writeText(exportText);
      if (!copy.current.alive || epoch !== copy.current.epoch) return;
      setCopyState("copied"); setMessage("CV copied.");
      timer.current = setTimeout(() => { if (copy.current.alive) setCopyState("idle"); }, 2000);
    } catch { if (copy.current.alive && epoch === copy.current.epoch) { setCopyState("idle"); setError("Copy unavailable. Select the complete CV text and copy manually."); } }
    finally { copy.current.locked = false; }
  }
  const warnings = structure || structuredCV ? [] : structureWarnings(text);
  return <><style>{template.css}</style>{warnings.length > 0 && <aside className="op-message" aria-label="CV structure review"><strong>Check document structure</strong>{warnings.map(warning => <p key={warning}>{warning}</p>)}{onCorrect && <button type="button" onClick={onCorrect}>Correct structure without AI</button>}</aside>}<div className="op-export-toolbar"><span>COMPLETE CV · {template.label} template</span><div className="op-actions" role="group" aria-label="Export CV">
    <button type="button" disabled={copyState === "pending"} aria-busy={copyState === "pending"} onClick={() => void copyText()}><PendingLabel pending={copyState === "pending"} reserve="Copying…">{copyState === "pending" ? "Copying…" : copyState === "copied" ? "Copied" : "Copy text"}</PendingLabel></button>
    <button type="button" className="op-txt-button" onClick={() => { try { const url = URL.createObjectURL(new Blob([exportText], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "OwnPath-CV.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError(""); setMessage("TXT download requested. Check your browser’s downloads."); } catch { setError("Download unavailable. Copy the text instead."); } }}>Download TXT</button>
    <button type="button" onClick={() => { try { if (!frame.current?.contentWindow) throw new Error(); frame.current.contentWindow.focus(); frame.current.contentWindow.print(); setError(""); setMessage("Print requested. Choose a printer or Save as PDF in your browser; OwnPath cannot confirm whether you saved it."); } catch { setError("Printing unavailable. Copy or download the text and print from your editor."); } }}>Print / Save as PDF</button>
  </div></div><div className="op-document-surface"><article className={`op-cv-paper ${template.className}`} aria-label="Formatted CV"><CVBody text={text} templateId={template.id} structure={structure} structuredCV={structuredCV} /></article></div><small>Print uses A4 pages and keeps all content. Your browser shows the actual page count; turn off its headers and footers if needed.</small>
    <iframe ref={frame} title="CV print document" className="op-print-frame" srcDoc={printHTML} />
    <div className="op-export-feedback"><p role="alert" className={error ? "op-error" : undefined}>{error}</p><p role="status">{message}</p></div></>;
}
export default memo(CVDocument);
export function printDocument(text: string, templateId?: TemplateId, structure?: CVStructure, cv?: StructuredCV) {
  const template = getTemplate(templateId);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>CV</title><style>@page{size:A4;margin:12mm 14mm}*{box-sizing:border-box}body{margin:0;background:white}${template.css}</style></head><body><main class="${template.className}">${templateHTML(text, template.id, structure, cv)}</main></body></html>`;
}
