"use client";

import { useEffect, useRef, useState } from "react";
import { downloadFilename, exportBlockReason } from "@/lib/cv-export/contract";
import type { Version } from "@/lib/credential-versions/types";

export default function ExportControls({ version, disabled = false }: { version: Version; disabled?: boolean }) {
  const reason = exportBlockReason(version);
  const working = useRef(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!busy) trigger.current?.focus(); }, [busy]);
  async function download(format: "docx" | "txt", button: HTMLButtonElement) {
    if (working.current || disabled) return;
    trigger.current = button; working.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/credential-versions/${version.id}/export?format=${format}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in again, then retry your private export." : "This accepted CV export is unavailable. Refresh version history or retry.");
      const expected = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain";
      if (!response.headers.get("Content-Type")?.startsWith(expected)) throw new Error("The CV download was not confirmed. Retry.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        const serverName = response.headers.get("Content-Disposition")?.match(/filename="([a-zA-Z0-9_-]+\.(?:docx|txt))"/)?.[1];
        anchor.download = serverName ?? downloadFilename("accepted-cv", version.number, format);
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
      } finally { const revoke = URL.revokeObjectURL.bind(URL); setTimeout(() => revoke(url), 1000); }
      setMessage("CV download requested. Check your browser’s downloads; saving the file is controlled by your browser.");
    } catch (failure) {
      setError(failure instanceof Error && ["Sign in again, then retry your private export.", "This accepted CV export is unavailable. Refresh version history or retry.", "The CV download was not confirmed. Retry."].includes(failure.message) ? failure.message : "The private CV download failed. Retry.");
    } finally { working.current = false; setBusy(false); }
  }
  if (reason) return <p>{reason}</p>;
  return <div aria-label={`Export version ${version.number}`} aria-busy={busy}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      <button className="button button-secondary" disabled={disabled || busy} onClick={(event) => void download("docx", event.currentTarget)}>Download editable DOCX — version {version.number}</button>
      <button className="button button-secondary" disabled={disabled || busy} onClick={(event) => void download("txt", event.currentTarget)}>Download TXT — version {version.number}</button>
      {!disabled && <a className="text-link" href={`/credential-versions/${version.id}/print`} target="_blank" rel="noopener noreferrer">Print / Save as PDF — version {version.number} (opens a new tab)</a>}
    </div>
    <p role={error ? "alert" : "status"} aria-live="polite">{error || (busy ? "Preparing your private CV download…" : message)}</p>
    <p>Exports use saved CV text. Evidence and acceptance are checked again when you download or open the print view.</p>
  </div>;
}
