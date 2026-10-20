"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./ownpath.module.css";
import { AccountNavigation } from "./account-navigation";

export function PublicHeader({ landing = false }: { landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className={styles.header} onKeyDown={event => { if (open && event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }}>
    <Link className={styles.brand} href="/" aria-label="OwnPath home"><span className={styles.mark} aria-hidden="true">↗</span>OwnPath<span className={styles.brandDot}>.</span></Link>
    <button ref={toggle} className={styles.menuToggle} type="button" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? "Close menu" : "Open menu"}</button>
    <nav id="public-navigation" aria-label="Main navigation" className={`${styles.nav} ${open ? styles.navOpen : ""}`} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }} onClick={() => setOpen(false)}>
      {landing && <><Link href="#how-it-works">How it works</Link><Link href="#faq">FAQ</Link></>}
      {!landing && <Link href="/app">Workspace</Link>}
      <AccountNavigation />
    </nav>
  </header>;
}

export function PublicFooter() {
  return <footer className={styles.footer}><div><Link className={styles.brand} href="/">OwnPath<span className={styles.brandDot}>.</span></Link><p>Clearer words. The same honest experience.</p></div><nav aria-label="Footer navigation"><Link href="/app">Workspace</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></nav><p className={styles.small}>OwnPath · Your experience, your next step</p></footer>;
}
