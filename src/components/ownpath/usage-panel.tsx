"use client";
import { formatDate } from "@/lib/billing/view";
import { usePlanSummary, useSharedPlanSummary } from "./use-plan-summary";
import { useWorkspaceSettings } from "./workspace-settings-context";

export function ContextualUsage({ operation }: { operation: "scan" | "rewrite" | "save" }) {
  const shared = useSharedPlanSummary(); const { data, error, pending } = shared || { data: null, error: "", pending: false }; const open = useWorkspaceSettings();
  const p = data?.plan;
  const text = !p ? pending ? "Checking allowance…" : "Allowance unavailable; your work is kept." : operation === "save" ? `${p.saved_count} / ${p.saves} saved CVs · storage capacity` : operation === "scan" ? `${Math.max(0, p.scans - p.scan_used)} / ${p.scans} scans remaining` : `${Math.max(0, p.rewrites - p.rewrite_used)} / ${p.rewrites} rewrites remaining`;
  const normalScan = operation === "scan" && p && !error && !pending && p.scans - p.scan_used > 0;
  return <p className="op-contextual-usage">{!normalScan && <>{text}{p && (error || pending) ? " · Last checked values" : ""} </>}{open ? <button type="button" onClick={() => open("usage")}>View usage</button> : <a href="/app/account#usage-heading">View usage</a>}</p>;
}
export default function UsagePanel({ idPrefix = "" }: { idPrefix?: string }) {
  const { data, error, pending, refresh } = usePlanSummary(); const p = data?.plan;
  return <section className="op-usage-panel" aria-labelledby={`${idPrefix}usage-heading`}>
    <header><h2 id={`${idPrefix}usage-heading`}>Usage</h2><button disabled={pending || error.startsWith("Sign in")} onClick={refresh}>{pending ? "Refreshing…" : "Refresh usage"}</button></header>
    {pending && <p role="status">{p ? "Refreshing; last checked values shown." : "Checking usage…"}</p>}
    {error && <p role="alert">{error} {p ? "Last checked values shown; they may be out of date." : "No verified allowance available."}</p>}
    {error.startsWith("Sign in") && <a href="/sign-in" target="_blank" rel="noreferrer">Sign in again ↗</a>}
    {p && <><p>{p.plan} plan</p><dl><div><dt>Scans remaining</dt><dd>{Math.max(0, p.scans - p.scan_used)} / {p.scans}</dd></div><div><dt>Rewrites remaining</dt><dd>{Math.max(0, p.rewrites - p.rewrite_used)} / {p.rewrites}</dd></div><div><dt>Saved CVs</dt><dd>{p.saved_count} / {p.saves}</dd></div></dl><p>Saved CVs use storage capacity, not AI requests. Active or uncertain AI requests reserve allowance.</p><p>{p.plan === "Free" ? "Calendar month resets" : "Current paid period ends"}: <strong>{formatDate(p.ends_at)}</strong> (Asia/Ho_Chi_Minh, UTC+07:00).</p></>}
  </section>;
}
