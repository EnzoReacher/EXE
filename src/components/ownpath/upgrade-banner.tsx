"use client";
import { usePlanSummary } from "./use-plan-summary";
import styles from "./billing.module.css";
export default function UpgradeBanner() {
  const { data, error, pending, refresh } = usePlanSummary();
  const pro = data?.plan.plan === "Pro";
  return <aside className={styles.banner} aria-label="Plan options"><div><h2>{pro ? "Keep your next application moving." : data ? "More room for your next application." : "A plan that fits your next step."}</h2><p>{pro ? "Your Pro time and usage stay intact when you renew early." : "Compare Scan, Rewrite and saved-version allowances in one place."}</p>{pending && <small role="status">Checking your current plan…</small>}{error && <div className={styles.row}><small>Current plan unavailable.</small><button disabled={pending} onClick={refresh}>Retry plan</button></div>}</div><a className={styles.button} href="/pricing" target="_blank" rel="noopener noreferrer">{pro ? "Manage Pro" : "View Pro plans"} ↗</a></aside>;
}
