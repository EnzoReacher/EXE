"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./ownpath.module.css";
import { AccountNavigation } from "./account-navigation";

function LandingBrand({ eager = false }: { eager?: boolean }) {
  return <Link className={styles.landingBrand} href="/" aria-label="OwnPath home">
    <Image className={styles.brandLogo} src="/brand/ownpath-logo.png" alt="OwnPath" width={1945} height={808} sizes="(max-width: 700px) 160px, 180px" loading={eager ? "eager" : "lazy"} />
  </Link>;
}

export function PublicHeader({ landing = false }: { landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className={`${styles.header} ${landing ? styles.landingHeader : ""}`} onKeyDown={event => { if (open && event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }}>
    {landing ? <LandingBrand eager /> : <Link className={styles.brand} href="/" aria-label="OwnPath home"><span className={styles.mark} aria-hidden="true">↗</span>OwnPath<span className={styles.brandDot}>.</span></Link>}
    <button ref={toggle} className={styles.menuToggle} type="button" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? "Close menu" : "Open menu"}</button>
    <nav id="public-navigation" aria-label="Main navigation" className={`${styles.nav} ${open ? styles.navOpen : ""}`} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }} onClick={() => setOpen(false)}>
      {landing && <><Link href="#example">Product</Link><Link href="#how-it-works">How it works</Link><Link href="#faq">FAQ</Link></>}
      {!landing && <Link href="/app">Workspace</Link>}
      <AccountNavigation />
    </nav>
  </header>;
}

export function PublicFooter({ landing = false }: { landing?: boolean }) {
  return <footer className={styles.footer}><div>{landing ? <LandingBrand /> : <Link className={styles.brand} href="/">OwnPath<span className={styles.brandDot}>.</span></Link>}{!landing && <p>Clearer words. The same honest experience.</p>}</div><nav aria-label="Footer navigation"><Link href="/app">Workspace</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></nav>{!landing && <p className={styles.small}>OwnPath · Your experience, your next step</p>}</footer>;
}
