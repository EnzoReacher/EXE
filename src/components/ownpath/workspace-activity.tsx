"use client";
import { useEffect, useState } from "react";
import { usePrivateScope } from "@/components/use-private-scope";
import { usePlanSummary } from "./use-plan-summary";
import WorkbenchIcon from "./workbench-icon";

type Recent = { id: string; name: string; date: string | null };
function recentRows(value: unknown): Recent[] {
  if (!value || typeof value !== "object" || !("versions" in value) || !Array.isArray(value.versions) || value.versions.length > 50) throw new Error("Recent CVs are unavailable.");
  return value.versions.map(row => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" || !/^[a-f0-9-]{36}$/i.test(row.id) || typeof row.name !== "string" || !row.name.trim() || row.name.length > 120) throw new Error("Recent CVs are unavailable.");
    const date = row.updated_at || row.created_at;
    return { id: row.id, name: row.name, date: typeof date === "string" && Number.isFinite(Date.parse(date)) ? date : null };
  });
}
export function WorkspaceUsage({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const plan = usePlanSummary();
  useEffect(() => { if (!refreshVersion) return; const timer = setTimeout(plan.refresh, 0); return () => clearTimeout(timer); }, [refreshVersion, plan.refresh]);
  return <section className="op-usage-bar" aria-label="Plan and remaining usage">
    {plan.data && <><a className="op-usage-plan" href="/app/account" target="_blank" rel="noopener noreferrer">{plan.data.plan.plan} plan ↗</a><dl aria-label="Current plan usage">
      <div><dt>Scans left</dt><dd>{Math.max(0, plan.data.plan.scans - plan.data.plan.scan_used)} / {plan.data.plan.scans}</dd></div>
      <div><dt>Rewrites left</dt><dd>{Math.max(0, plan.data.plan.rewrites - plan.data.plan.rewrite_used)} / {plan.data.plan.rewrites}</dd></div>
      <div><dt>Saved CVs</dt><dd>{plan.data.plan.saved_count} / {plan.data.plan.saves}</dd></div>
    </dl></>}
    {plan.pending && <span role="status">Checking usage…</span>}
    {plan.error && <span>{plan.error}</span>}
    {plan.error.startsWith("Sign in") ? <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in ↗</a> : <button disabled={plan.pending} onClick={plan.refresh}>{plan.error ? "Retry usage" : "Refresh usage"}</button>}
  </section>;
}
export default function WorkspaceActivity() {
  const [rows, setRows] = useState<Recent[] | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0), [pending, setPending] = useState(true);
  const scope = usePrivateScope(() => { setRows(null); setPending(false); setError("Sign in again to view recent CVs."); });
  useEffect(() => {
    let active = true; const controller = new AbortController(); const epoch = scope.current.epoch;
    void fetch("/api/cv-review/saved", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }).then(async response => {
      if (!response.ok) throw new Error("Recent CVs are unavailable. Your current draft is kept.");
      const checked = recentRows(await response.json());
      if (active && !scope.current.blocked && epoch === scope.current.epoch) { setRows(checked); setError(""); }
    }).catch(() => { if (active && !scope.current.blocked) { setRows(null); setError("Recent CVs are unavailable. Your current draft is kept."); } }).finally(() => { if (active && !scope.current.blocked) setPending(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt, scope]);
  return <section className="op-activity" aria-labelledby="activity-heading">
    <header className="op-activity-heading"><h2 id="activity-heading">Recent CVs</h2><div className="op-activity-links"><button disabled={pending || scope.current.blocked} onClick={() => { setPending(true); setAttempt(n => n + 1); }}>Refresh recent CVs</button><a href="/app/cvs" target="_blank" rel="noopener noreferrer">View all saved CVs ↗</a></div></header>
    <div className="op-recent">{pending && <p role="status">Loading recent CVs…</p>}
      {error && <div role="alert"><p>{error}</p><button disabled={pending || scope.current.blocked} onClick={() => { setPending(true); setError(""); setAttempt(n => n + 1); }}>Retry recent CVs</button></div>}
      {rows && !rows.length && <div className="op-recent-empty"><span className="op-icon-tile"><WorkbenchIcon /></span><div><strong>No saved CVs yet.</strong><p>Saving is optional.</p></div><a href="#cv-input-entry" onClick={() => { document.getElementById("cv-input-entry")?.focus(); }}>Add your first CV ↑</a></div>}
      {rows && !!rows.length && <ul className="op-recent-list">{rows.slice(0, 3).map(row => <li key={row.id}><span className="op-icon-tile"><WorkbenchIcon /></span><div><a href={`/app/cvs/${row.id}`} target="_blank" rel="noopener noreferrer">{row.name} ↗</a>{row.date && <time dateTime={row.date}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(row.date))}</time>}</div></li>)}</ul>}
    </div><p className="op-quiet">Saved CVs open in a new tab.</p>
  </section>;
}
