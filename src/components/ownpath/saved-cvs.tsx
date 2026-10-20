"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { finalDocument, parseDraft, type Draft } from "@/lib/cv-review/domain";
import { parseSnapshot, type Snapshot } from "@/lib/scan-rewrite/saved";
import ScanRewrite from "./scan-rewrite";
import CVDocument from "./cv-document";
import WorkbenchIcon from "./workbench-icon";
import { LinkFeedback, PendingLabel, Spinner } from "./interaction-controls";
import { useConfirmation } from "./confirmation-dialog";
import { usePrivateScope } from "@/components/use-private-scope";
type Row = { id: string; name: string; payload: unknown; revision: number; created_at?: string; updated_at?: string };
function openLabel(payload: unknown) { return payload && typeof payload === "object" && "schemaVersion" in payload && payload.schemaVersion === 2 ? "Open & rename" : "Open CV"; }
function SavedMetadata({ row }: { row: Row }) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload as Record<string, unknown> : {};
  const context = [payload.role, payload.company].filter((value): value is string => typeof value === "string" && !!value.trim()).join(" · ");
  const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : null;
  return <>{context && <p>{context}</p>}<p className="op-saved-date">{date(row.created_at) && <>Saved <time dateTime={row.created_at}>{date(row.created_at)}</time></>}{date(row.updated_at) && row.updated_at !== row.created_at && <> · Updated <time dateTime={row.updated_at}>{date(row.updated_at)}</time></>}</p></>;
}
async function read(url: string, options?: RequestInit) {
  const signal = options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(url, { cache: "no-store", ...options, signal }); let data;
  try { data = await response.json(); } catch { throw new Error(`Unreadable response (HTTP ${response.status}). Retry.`); }
  if (!response.ok) throw new Error(data.error || "Saved CVs are unavailable. Retry."); return data;
}
export function SavedCVs() {
  const [data, setData] = useState<{ versions: Row[]; profiles: Row[] } | null>(null); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0); const [busy, setBusy] = useState(false); const [legacy, setLegacy] = useState<Draft | null>(null);
  const confirmation = useConfirmation(); const locked = useRef(false); const [removing, setRemoving] = useState(""); const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null); const list = useRef<HTMLDivElement>(null); const focusNext = useRef<string | null>(null);
  const scope = usePrivateScope(() => { setData(null); setLegacy(null); setError("Your session ended. Sign in again, then reload to open saved CVs."); });
  useEffect(() => { let active = true; const controller = new AbortController(); read("/api/cv-review/saved", { signal: controller.signal }).then(value => { if (!Array.isArray(value.versions) || !Array.isArray(value.profiles)) throw new Error("Invalid saved records. Retry."); if (active && !scope.current.blocked) { setData(value); setError(""); } }).catch(e => { if (active && !scope.current.blocked) setError(e.message); }); return () => { active = false; controller.abort(); }; }, [attempt, scope]);
  useEffect(() => {
    if (focusNext.current === null) return;
    const target = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-cv-id]") || []).find(row => row.dataset.cvId === focusNext.current)?.querySelector<HTMLElement>("a");
    (target || heading.current)?.focus({ preventScroll: true }); focusNext.current = null;
  }, [data]);
  async function remove(row: Row) {
    if (locked.current || scope.current.blocked) return;
    locked.current = true;
    try {
      if (!await confirmation.confirm({ title: `Delete “${row.name}”?`, description: "This deletes this saved CV version. Other saved CVs and experience profiles are kept. This cannot be undone.", action: "Delete CV" }) || scope.current.blocked || !scope.current.alive) return;
      setBusy(true); setRemoving(row.id); setError(""); setMessage(""); const epoch = scope.current.epoch;
      const result = await read("/api/cv-review/saved", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "version", id: row.id }) });
      if (!scope.current.alive || scope.current.blocked || epoch !== scope.current.epoch) return;
      if (result.deleted !== true) throw new Error("Deletion was not confirmed. Retry.");
      const index = data?.versions.findIndex(item => item.id === row.id) ?? -1;
      focusNext.current = data?.versions[index + 1]?.id || data?.versions[index - 1]?.id || "";
      setData(d => d ? { ...d, versions: d.versions.filter(v => v.id !== row.id) } : d); setMessage(`“${row.name}” was deleted.`);
    } catch { if (scope.current.alive && !scope.current.blocked) setError("We could not confirm deletion. Your other CVs are kept; retry or reload to check this version."); }
    finally { locked.current = false; if (scope.current.alive) { setBusy(false); setRemoving(""); } }
  }
  return <>{confirmation.dialog}
    <div className="op-page-heading"><div><p className="op-eyebrow">YOUR APPLICATION LIBRARY</p><h1 ref={heading} tabIndex={-1}>Saved CVs</h1><p>Your experience, ready for the next opportunity.</p></div><Link className="op-button" href="/app"><WorkbenchIcon name="scan" />New CV<LinkFeedback /></Link></div>
    {error && <div role="alert" className="op-error">{error}<div className="op-actions"><button onClick={() => { if (scope.current.blocked) { window.location.reload(); return; } setError(""); setAttempt(n => n + 1); }}>{scope.current.blocked ? "Reload" : "Retry"}</button></div></div>}
    <p role="status" className="op-inline-status">{message}</p>
    {!data && !error && <div role="status" className="op-loading"><Spinner />Loading saved CVs…</div>}
    {data && <>
      {!data.versions.length && <div className="op-empty"><span className="op-icon-tile"><WorkbenchIcon /></span><h2>Your next chapter starts here.</h2><p>No saved CVs yet. Saving is optional.</p><Link className="op-button op-primary" href="/app">Scan & Rewrite<WorkbenchIcon name="arrow" /></Link></div>}
      <div className="op-saved-list" ref={list}>{data.versions.map(row => <article className="op-saved-card" key={row.id} data-cv-id={row.id}>
        <span className="op-icon-tile"><WorkbenchIcon /></span>
        <div className="op-saved-copy"><h2><Link href={`/app/cvs/${row.id}`}>{row.name} →<LinkFeedback /></Link></h2><SavedMetadata row={row} /></div>
        <div className="op-saved-actions"><Link href={`/app/cvs/${row.id}`}>{openLabel(row.payload)}<LinkFeedback /></Link><button disabled={busy} aria-busy={removing === row.id} aria-label={removing === row.id ? `Deleting ${row.name}` : `Delete ${row.name}`} onClick={() => void remove(row)}><PendingLabel pending={removing === row.id} reserve="Deleting…">{removing === row.id ? "Deleting…" : "Delete"}</PendingLabel></button></div>
      </article>)}</div>
      {!!data.profiles.length && <details className="op-card"><summary>Earlier experience profiles</summary>{data.profiles.map(row => <div className="op-row" key={row.id}><div><strong>{row.name}</strong><SavedMetadata row={row} /></div><button onClick={() => { try { setLegacy(parseDraft(row.payload)); } catch { setError("This earlier profile could not be read."); } }}>View earlier profile</button></div>)}</details>}
    </>}
    {legacy?.profile && <section><h2>Earlier profile</h2><p>Copy this text into Scan & Rewrite to use it for a new application.</p><CVDocument text={legacy.profile.blocks.map(b => b.text).join("\n")} /></section>}
  </>;
}
export function SavedCV({ id }: { id: string }) {
  const [row, setRow] = useState<Row | null>(null); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; read(`/api/cv-review/saved?id=${encodeURIComponent(id)}`).then(data => { if (!data.version) throw new Error("This CV could not be opened."); if (active) setRow(data.version); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id, attempt]);
  if (error) return <><h1>Saved CV</h1><p role="alert" className="op-error">{error}</p><button onClick={() => { setError(""); setAttempt(n => n + 1); }}>Retry</button></>;
  if (!row) return <div className="op-loading" role="status"><Spinner />Opening CV…</div>;
  let snapshot: Snapshot | null = null; let legacyText: string | null = null;
  try {
    const payload = row.payload as Record<string, unknown>;
    if ("schemaVersion" in payload) snapshot = parseSnapshot(payload);
    else { const legacy = parseDraft(payload); if (!legacy.profile || !legacy.review) throw new Error(); legacyText = finalDocument(legacy.profile, legacy.review, legacy.decisions); }
  } catch { /* Show a recoverable format error without changing the record. */ }
  if (snapshot) return <ScanRewrite initial={snapshot} savedId={row.id} savedRevision={row.revision} />;
  if (legacyText !== null) return <><h1>{row.name}</h1><p>Earlier saved CV. Copy its text into Scan & Rewrite to create a new draft.</p><CVDocument text={legacyText} /><Link className="op-button" href="/app">Scan & Rewrite</Link></>;
  return <><h1>Saved CV</h1><p role="alert">This saved format could not be read. Your record has not been changed.</p><Link href="/app/cvs">Back to saved CVs</Link></>;
}
