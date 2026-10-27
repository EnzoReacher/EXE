"use client";
import Link from "next/link";
import { catalog } from "@/lib/billing/catalog";
import { formatDate, money } from "@/lib/billing/view";
import { usePlanSummary } from "./use-plan-summary";
import styles from "./billing.module.css";

export default function Pricing({ signedIn, enabled, price, mode }: { signedIn: boolean; enabled: boolean; price: number | null; mode: string }) {
  const { data: summary, pending, error, refresh } = usePlanSummary(signedIn);
  const pro = summary?.plan.plan === "Pro";
  return <main className={styles.page} id="main-content">
    <nav className={styles.pageNav} aria-label="Pricing navigation"><Link href="/">↗ OwnPath</Link><a href="/app/account">Account & billing</a></nav>
    <header className={styles.pageHeading}><p className={styles.eyebrow}>FREE & PRO</p><h1>A little room for your next step.</h1><p>The same grounded CV tools. Choose the allowance that fits your applications.</p></header>
    {mode==='LOCAL_FAKE'&&<p className={styles.badge}>Local billing demo · Illustrative price · No real money</p>}
    {signedIn && pending && <p role="status" className={styles.muted}>Checking your current plan…</p>}
    {signedIn && error && <div className={styles.error} role="alert"><p>{error}</p>{error.startsWith("Sign in") ? <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in ↗</a> : <button className={styles.secondary} disabled={pending} onClick={refresh}>Retry current plan</button>}</div>}
    <div className={styles.cards}>
      <section className={styles.card} aria-labelledby="free-plan-heading">
        <header><div className={styles.planTitle}><h2 id="free-plan-heading">Free</h2>{summary?.plan.plan === "Free" && <span className={styles.chip}>Current plan</span>}</div><p>For occasional CV updates.</p></header>
        <div className={styles.priceBlock}><p className={styles.price}>0 <span>VND</span></p><p className={styles.muted}>Per calendar month in Asia/Ho_Chi_Minh</p></div>
        <ul><li>{catalog.free.scans} Scans and {catalog.free.rewrites} Rewrite per month</li><li>Up to {catalog.free.saves} saved CV versions</li><li>Manual editing and Classic template</li><li>Copy, TXT and print / PDF export</li></ul>
        <footer className={styles.cardFooter}><a className={styles.secondary} href="/app">{signedIn ? "Open workspace" : "Get started"}</a><small>No payment needed.</small></footer>
      </section>
      <section className={`${styles.card} ${styles.proCard}`} aria-labelledby="pro-plan-heading">
        <header><div className={styles.planTitle}><h2 id="pro-plan-heading">Pro</h2>{pro && <span className={styles.chip}>Current plan</span>}</div><p>More room for focused applications.</p></header>
        <div className={styles.priceBlock}><p className={price ? styles.price : styles.unsetPrice}>{price ? money(price) : "Price not configured"}</p><p className={styles.muted}>30 × 24 hours · No automatic renewal</p>{mode === "LOCAL_FAKE" && <p className={styles.previewPrice}>Preview-only illustrative price</p>}</div>
        <ul><li>{catalog.pro.scans} Scans and {catalog.pro.rewrites} Rewrites per period</li><li>Up to {catalog.pro.saves} saved CV versions</li><li>The same manual editing and Classic template</li><li>The same copy, TXT and print / PDF export</li></ul>
        {pro && <p className={styles.nextPeriod}>Your next purchase begins {formatDate(summary!.plan.next_end || summary!.plan.ends_at)}. Current time and usage stay intact.</p>}
        <footer className={styles.cardFooter}>{!enabled ? <><button disabled>Checkout unavailable</button><small>Live checkout awaits owner setup and acceptance.</small></> : <><a className={styles.button} href={signedIn ? "/checkout" : "/sign-in"} target="_blank" rel="noopener noreferrer">{signedIn ? pro ? "Renew for 30 days" : summary ? "Buy 30 days" : "Continue to checkout" : "Sign in to choose Pro"} ↗</a><small>One purchase. No automatic renewal.</small></>}</footer>
      </section>
    </div>
    <details className={styles.faq}><summary>How periods, usage and support work</summary><p>These are configurable draft limits, not confirmed commercial economics. Unused quota does not roll over. Free quota is not added while Pro is active. Early renewals append after purchased periods, without resetting current usage.</p><p>Existing saved CVs remain available after Pro expires, even above Free&apos;s creation limit. Checkout opens separately to protect workspace drafts. Payment cancellation is not a refund; a support request does not mean money was returned.</p></details>
  </main>;
}
