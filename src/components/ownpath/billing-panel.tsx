"use client";
import { formatDate, money } from "@/lib/billing/view";
import { usePlanSummary } from "./use-plan-summary";
import styles from "./billing.module.css";
const statusLabels: Record<string, string> = { pending: "Pending verification", confirmed: "Payment confirmed", activating: "Scheduled period", active: "Active", expired: "Expired", needs_review: "Needs review" };
export default function BillingPanel({ idPrefix = "" }: { idPrefix?: string }) {
  const { data, error, pending, refresh } = usePlanSummary();
  return <section className={styles.panel} aria-labelledby={`${idPrefix}plan-billing-heading`}>
    <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>YOUR ALLOWANCE</p><h2 id={`${idPrefix}plan-billing-heading`}>Plan & billing</h2></div><button className={styles.secondary} type="button" disabled={pending || error.startsWith("Sign in")} onClick={refresh}>{pending ? "Checking…" : "Refresh plan"}</button></header>
    {pending && <p role="status" className={styles.muted}>Checking your plan…</p>}
    {error && <div role="alert" className={styles.error}><p>{error} {data ? "Last checked values shown; they may be out of date." : ""}</p>{error.startsWith("Sign in") && <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in ↗</a>}</div>}
    {data && <>
      {data.mode==="LOCAL_FAKE"&&<p className={styles.badge}>Local billing demo · No real money</p>}
      <div className={styles.currentPeriod}><div><span className={styles.chip}>Current plan</span><h3>{data.plan.plan}</h3></div><div><p className={styles.muted}>{data.plan.plan === "Pro" ? "Current period ends" : "Free month resets"}</p><strong>{formatDate(data.plan.ends_at)}</strong></div></div>
      <dl className={styles.usage}><div><dt>Scans remaining</dt><dd>{Math.max(0, data.plan.scans - data.plan.scan_used)}<span> / {data.plan.scans}</span></dd></div><div><dt>Rewrites remaining</dt><dd>{Math.max(0, data.plan.rewrites - data.plan.rewrite_used)}<span> / {data.plan.rewrites}</span></dd></div><div><dt>Saved CV versions</dt><dd>{data.plan.saved_count}<span> / {data.plan.saves}</span></dd></div></dl>
      {data.plan.next_start && <div className={styles.nextPeriod}><strong>Purchased next period</strong><p>{formatDate(data.plan.next_start)} – {formatDate(data.plan.next_end!)}</p><small>Its quota becomes available when this period starts.</small></div>}
      {data.plan.saved_count > data.plan.saves && <p className={styles.muted}>Your existing CVs remain accessible. Delete a version before creating another; edits and exports still work.</p>}
      <div className={styles.row}><a className={styles.button} href="/pricing" target="_blank" rel="noopener noreferrer">{data.plan.plan === "Pro" ? "Renew for 30 days" : "View Pro plans"} ↗</a>{data.support && <a href={data.support} target="_blank" rel="noopener noreferrer">Contact support ↗</a>}</div>
      <details className={styles.faq}><summary>Quota and transaction details</summary><p>Draft limits. Free follows calendar months in Asia/Ho_Chi_Minh. Each purchase buys exactly 30 × 24 hours; early renewals append without resetting current usage. No automatic renewal or quota rollover. Active, pending and uncertain AI requests reserve quota. These are transaction details, not tax invoices.</p></details>
      <div className={styles.historyHeading}><h3>Your transactions</h3><span className={styles.muted}>Latest {data.orders.length}</span></div>
      <ul className={styles.orders}>{data.orders.map(order => <li key={order.id}><div><strong>{money(order.amount)}</strong><p className={styles.muted}>{formatDate(order.created_at)}</p><a href={`/checkout?order=${order.id}`} target="_blank" rel="noopener noreferrer">Order {order.order_code} ↗</a></div><span className={`${styles.chip} ${["pending", "confirmed", "activating"].includes(order.state) ? styles.pendingChip : ""}`}>{statusLabels[order.state] || "Status unavailable"}</span></li>)}</ul>
      {!data.orders.length && <p className={styles.emptyHistory}>No purchases yet. Your transaction details will appear here.</p>}
    </>}
  </section>;
}
