"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { PendingLabel } from "./interaction-controls";
const section = /^(summary|professional summary|profile|experience|work experience|employment|education|skills|projects|certifications?|certificates?|qualifications|volunteering|contact|tóm tắt|giới thiệu|kinh nghiệm(?: làm việc)?|học vấn|kỹ năng|dự án|chứng chỉ|hoạt động tình nguyện|liên hệ)\s*:?$/iu;
export function CVBody({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i) => i === 0 && line.trim() ? <h1 key={i}>{line}</h1> : section.test(line.trim()) ? <h2 key={i}>{line}</h2> : <p key={i}>{line || "\u00a0"}</p>)}</>;
}
function CVDocument({ text }: { text: string }) {
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const frame = useRef<HTMLIFrameElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "pending" | "copied">("idle");
  const copy = useRef({ locked: false, alive: true, epoch: 0 }); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const printHTML = useMemo(() => printDocument(text), [text]);
  useEffect(() => { const state = copy.current; state.alive = true; return () => { state.alive = false; ++state.epoch; clearTimeout(timer.current); }; }, []);
  async function copyText() {
    if (copy.current.locked) return;
    copy.current.locked = true; const epoch = ++copy.current.epoch;
    clearTimeout(timer.current); setCopyState("pending"); setError(""); setMessage("");
    try {
      await navigator.clipboard.writeText(text);
      if (!copy.current.alive || epoch !== copy.current.epoch) return;
      setCopyState("copied"); setMessage("CV copied.");
      timer.current = setTimeout(() => { if (copy.current.alive) setCopyState("idle"); }, 2000);
    } catch { if (copy.current.alive && epoch === copy.current.epoch) { setCopyState("idle"); setError("Copy unavailable. Select the complete CV text and copy manually."); } }
    finally { copy.current.locked = false; }
  }
  return <><div className="op-export-toolbar"><span>COMPLETE CV · EDITABLE DRAFT</span><div className="op-actions" role="group" aria-label="Export CV">
    <button type="button" disabled={copyState === "pending"} aria-busy={copyState === "pending"} onClick={() => void copyText()}><PendingLabel pending={copyState === "pending"} reserve="Copying…">{copyState === "pending" ? "Copying…" : copyState === "copied" ? "Copied" : "Copy text"}</PendingLabel></button>
    <button type="button" className="op-txt-button" onClick={() => { try { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "OwnPath-CV.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError(""); setMessage("TXT download requested. Check your browser’s downloads."); } catch { setError("Download unavailable. Copy the text instead."); } }}>Download TXT</button>
    <button type="button" onClick={() => { try { if (!frame.current?.contentWindow) throw new Error(); frame.current.contentWindow.focus(); frame.current.contentWindow.print(); setError(""); setMessage("Print requested. Choose a printer or Save as PDF in your browser; OwnPath cannot confirm whether you saved it."); } catch { setError("Printing unavailable. Copy or download the text and print from your editor."); } }}>Print / Save as PDF</button>
  </div></div><div className="op-document-surface"><article className="op-cv-paper" aria-label="Formatted CV"><CVBody text={text} /></article></div><small>Print uses A4 pages and keeps all content. Your browser shows the actual page count; turn off its headers and footers if needed.</small>
    <iframe ref={frame} title="CV print document" className="op-print-frame" srcDoc={printHTML} />
    <div className="op-export-feedback"><p role="alert" className={error ? "op-error" : undefined}>{error}</p><p role="status">{message}</p></div></>;
}
export default memo(CVDocument);
export function printDocument(text: string) {
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const body = text.split("\n").map((line, i) => { const tag = i === 0 && line.trim() ? "h1" : section.test(line.trim()) ? "h2" : "p"; return `<${tag}>${escape(line) || "&#160;"}</${tag}>`; }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>CV</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#172821;background:white;font:11pt/1.5 Arial,"Liberation Sans",sans-serif}h1{font-size:22pt;line-height:1.2;margin:0 0 12pt}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #abbcb4;margin:16pt 0 6pt;break-after:avoid}p{margin:0 0 4pt;white-space:pre-wrap;overflow-wrap:anywhere;orphans:2;widows:2}h1,h2{overflow-wrap:anywhere}main{width:auto}</style></head><body><main>${body}</main></body></html>`;
}
