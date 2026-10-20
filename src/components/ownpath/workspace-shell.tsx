"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { emptyDraft, type Draft } from "@/lib/cv-review/domain";
import WorkbenchIcon from "./workbench-icon";
import { LinkFeedback } from "./interaction-controls";
const Context = createContext<{ draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; acknowledgeName: (id: string, name: string) => void } | null>(null);
export function useDraft() { const c = useContext(Context); if (!c) throw new Error("Workspace required"); return c; }
export function useAccountAcknowledgement() { return useDraft().acknowledgeName; }
const links = [["/app", "Scan & Rewrite"], ["/app/cvs", "Saved CVs"], ["/app/account", "Account"]];
export function WorkspaceShell({ children, owner, email, displayName = "" }: { children: React.ReactNode; owner: string; email?: string; displayName?: string }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft); const [open, setOpen] = useState(false); const [expired, setExpired] = useState(false); const [switching, setSwitching] = useState(false);
  const path = usePathname(); const trigger = useRef<HTMLButtonElement>(null); const drawer = useRef<HTMLElement>(null);
  const [savedName, setSavedName] = useState(displayName); const active = useRef(true); const switched = useRef(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 760px)"); if (!media) return;
    const update = () => { setMobile(media.matches); if (!media.matches) setOpen(false); };
    update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  function acknowledgeName(id: string, name: string) { if (active.current && id === owner) setSavedName(name); }
  const pageTitle = path.startsWith("/app/account") ? "Account" : path.startsWith("/app/cvs/") ? "Saved CV" : path.startsWith("/app/cvs") ? "Saved CVs" : "Scan & Rewrite";
  useEffect(() => {
    active.current = true;
    const sdk = createSupabaseBrowserClient();
    const { data } = sdk.auth.onAuthStateChange((event, session) => {
      if (switched.current) return;
      if (session && session.user.id !== owner) { switched.current = true; active.current = false; setSavedName(""); window.dispatchEvent(new Event("ownpath:session-ended")); setDraft(emptyDraft); setSwitching(true); window.location.replace("/app"); }
      else if (session?.user.id === owner && (active.current || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) { active.current = true; setExpired(false); }
      else if (event === "SIGNED_OUT") { active.current = false; setSavedName(""); setExpired(true); window.dispatchEvent(new Event("ownpath:session-ended")); }
    });
    const unavailable = () => { active.current = false; setSavedName(""); setExpired(true); };
    window.addEventListener("ownpath:account-unavailable", unavailable);
    return () => { active.current = false; data.subscription.unsubscribe(); window.removeEventListener("ownpath:account-unavailable", unavailable); };
  }, [owner]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (draft.source) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [draft.source]);
  useEffect(() => { if (open) drawer.current?.querySelector<HTMLElement>("button,a")?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function close(restore = true) { setOpen(false); if (restore) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }
  if (switching) return <p role="status">Opening your workspace…</p>;
  return <Context.Provider value={{ draft, setDraft, acknowledgeName }}><div className="op-workspace">
    {open && <div className="op-backdrop" onClick={() => close()} />}
    <aside ref={drawer} id="workspace-navigation" inert={mobile && !open || undefined} className={`op-sidebar ${open ? "is-open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Workspace navigation" onKeyDown={e => {
      if (e.key === "Escape") close();
      if (open && e.key === "Tab") { const nodes = drawer.current?.querySelectorAll<HTMLElement>("button,a"); if (!nodes?.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><Link className="op-brand" href="/" aria-label="OwnPath home" onNavigate={() => close(false)}><span className="op-brand-mark">↗</span>OwnPath<span className="op-brand-dot">.</span></Link><button className="op-close" onClick={() => close()}>Close navigation</button><p className="op-kicker">CV WORKBENCH</p><nav>{links.map(([href, title]) => <Link key={href} href={href} aria-current={(href === "/app" ? path === href : path.startsWith(href)) ? "page" : undefined} className={href === "/app/account" ? "op-account-link" : undefined} onNavigate={() => close(false)}><WorkbenchIcon name={href === "/app/account" ? "account" : href === "/app" ? "scan" : "document"} />{title}<LinkFeedback /></Link>)}</nav><div className="op-sidebar-bottom">{email && !expired && <Link className="op-identity" href="/app/account" onNavigate={() => close(false)}><WorkbenchIcon name="account" /><span><small>Signed in as</small><strong>{savedName || email}</strong>{savedName && <small>{email}</small>}</span><LinkFeedback /></Link>}<p className="op-sidebar-note">Your experience.<br />Your next chapter.</p></div></aside>
    <main className="op-main" inert={open || undefined} id="main-content"><header className="op-top"><div><button className="op-menu" ref={trigger} aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(true)}><WorkbenchIcon name="menu" /></button><span className="op-top-label">WORKBENCH</span><strong>{pageTitle}</strong></div><Link href="/app/account" aria-label="Account & security"><WorkbenchIcon name="account" /><span>Account & security</span></Link></header>{expired && !path.startsWith("/app/account") && <div role="alert" className="op-message">Your session ended. This draft remains in memory. Sign in in a separate tab, then retry. Leaving or reloading this page loses unsaved work. <a href="/sign-in" target="_blank" rel="noreferrer">Sign in</a><button onClick={() => { setDraft(emptyDraft); window.location.replace("/"); }}>Clear draft and leave</button></div>}<div className="op-content">{children}</div></main>
  </div></Context.Provider>;
}
