"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { emptyDraft, type Draft } from "@/lib/cv-review/domain";
import WorkbenchIcon from "./workbench-icon";
import { LinkFeedback } from "./interaction-controls";
import ScanRewrite from "./scan-rewrite";
import { WorkspaceDiscardGuard, WorkspaceProfileGuard, WorkspaceSession, type SavedEntry } from "./workspace-session";
import { useConfirmation } from "./confirmation-dialog";
import { PlanSummaryProvider } from "./use-plan-summary";
import AccountMenu from "./account-menu";
import SettingsDialog from "./settings-dialog";
import { WorkspaceSettings, type SettingsSection } from "./workspace-settings-context";
import { useModalScroll } from "./modal-scroll";
const Context = createContext<{ draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; acknowledgeName: (id: string, name: string) => void } | null>(null);
export function useDraft() { const c = useContext(Context); if (!c) throw new Error("Workspace required"); return c; }
export function useAccountAcknowledgement() { return useDraft().acknowledgeName; }
const links = [["/app/scan", "Scan CV"], ["/app/rewrite", "Rewrite CV"], ["/app/cvs", "Saved CVs"]];
type WorkspaceShellProps = { children: React.ReactNode; owner: string; email?: string; displayName?: string };
export function WorkspaceShell(props: WorkspaceShellProps) {
  return <OwnerWorkspaceShell key={props.owner} {...props} />;
}
function OwnerWorkspaceShell({ children, owner, email, displayName = "" }: WorkspaceShellProps) {
  const router = useRouter(); const confirmation = useConfirmation();
  const [entry, setEntry] = useState<(SavedEntry & { key: number }) | null>(null);
  const hasWork = useRef(false);
  const workChanged = useCallback((value: boolean) => { hasWork.current = value; }, []);
  const profileGuards = useRef(new Map<object | string, () => boolean>());
  const profileGuard = useRef<(() => boolean) | null>(null);
  const registerProfileGuard = useCallback((guard: (() => boolean) | null, key: object | string = "direct") => { if (guard) profileGuards.current.set(key, guard); else profileGuards.current.delete(key); profileGuard.current = () => [...profileGuards.current.values()].every(check => check()); }, []);
  const [sessionVersion, setSessionVersion] = useState(0);
  async function openSaved(value: SavedEntry) {
    if (!active.current || expired) return;
    if (hasWork.current && !await confirmation.confirm({ title: "Open this saved CV?", description: "This replaces the current in-memory workspace, including unsaved edits. Cancel to return and save or export first.", action: "Open saved CV" })) return;
    if (!active.current) return;
    setEntry({ ...value, key: Date.now() }); router.push("/app/rewrite");
  }
  const [draft, setDraft] = useState<Draft>(emptyDraft); const [open, setOpen] = useState(false); const [expired, setExpired] = useState(false); const [switching, setSwitching] = useState(false);
  const latestDraft = useRef(draft); const recovery = useRef<{ draft: Draft; expires: number } | null>(null); const explicitLogout = useRef(false);
  const [resumeError, setResumeError] = useState(""); const [resuming, setResuming] = useState(false);
  const [retainScan, setRetainScan] = useState(true);
  const [scanVersion, setScanVersion] = useState(0);
  const sessionEpoch = useRef({ value: 0 });
  useEffect(() => { latestDraft.current = draft; }, [draft]);
  useEffect(() => { const timer = setInterval(() => { if (recovery.current && recovery.current.expires <= Date.now()) { recovery.current = null; setRetainScan(false); setEntry(null); } }, 30000); return () => clearInterval(timer); }, []);
  async function resumePrivateDraft() {
    if (resuming) return; setResuming(true); setResumeError("");
    const epoch = sessionEpoch.current.value;
    try {
      const response = await fetch("/api/cv-review/session", { cache: "no-store", signal: AbortSignal.timeout(10000) }); const identity = await response.json();
      if (epoch !== sessionEpoch.current.value || switched.current) return;
      if (!response.ok) throw new Error("Sign in again in the new tab, then retry here.");
      if (identity.owner !== owner) { recovery.current = null; switched.current = true; active.current = false; setRetainScan(false); setEntry(null); setSwitching(true); window.location.replace("/app"); return; }
      const kept = recovery.current; recovery.current = null;
      // Check the deadline here too: the cleanup interval may not have fired yet.
      if (!kept || kept.expires <= Date.now()) { setScanVersion(v => v + 1); setEntry(null); }
      active.current = true; setSessionVersion(v => v + 1); setExpired(false);
      if (kept && kept.expires > Date.now()) setDraft(kept.draft);
    } catch { if (epoch === sessionEpoch.current.value && !switched.current) setResumeError("Could not verify this account. Sign in again, then retry here. Your temporary draft remains private in this page's memory."); }
    finally { setResuming(false); }
  }
  const path = usePathname(); const trigger = useRef<HTMLButtonElement>(null); const drawer = useRef<HTMLElement>(null);
  const [savedName, setSavedName] = useState(displayName); const active = useRef(true); const switched = useRef(false);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const rail = collapsed && !accountOpen;
  const [settings, setSettings] = useState<SettingsSection | null>(null);
  const settingsTrigger = useRef<HTMLElement | null>(null);
  // Read before the first hydrated paint; the server and first client tree agree.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-paint hydration of an optional browser-only preference
    try { setCollapsed(localStorage.getItem("ownpath:sidebar-collapsed") === "true"); } catch { /* Storage is optional. */ }
  }, []);
  function toggleSidebar() { const next = !rail; setCollapsed(next); try { localStorage.setItem("ownpath:sidebar-collapsed", String(next)); } catch { /* Navigation still works. */ } }
  const openSettings = useCallback((section: SettingsSection) => { settingsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setOpen(false); setSettings(section); }, [setOpen]);
  useModalScroll(open);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 760px)"); if (!media) return;
    const update = () => { setMobile(media.matches); setOpen(false); if (media.matches && drawer.current?.contains(document.activeElement)) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };
    update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  function acknowledgeName(id: string, name: string) { if (active.current && id === owner) setSavedName(name); }
  const pageTitle = path.startsWith("/app/account") ? "Account" : path.startsWith("/app/cvs/") ? "Saved CV" : path.startsWith("/app/cvs") ? "Saved CVs" : path === "/app/rewrite" ? "Rewrite CV" : "Scan CV";
  useEffect(() => {
    active.current = true;
    const lifetime = sessionEpoch.current;
    const sdk = createSupabaseBrowserClient();
    const { data } = sdk.auth.onAuthStateChange((event, session) => {
      if (switched.current) return;
      if (session && session.user.id !== owner) { recovery.current = null; switched.current = true; active.current = false; setSavedName(""); window.dispatchEvent(new Event("ownpath:session-ended")); setDraft(emptyDraft); setSwitching(true); window.location.replace("/app"); }
      else if (session?.user.id === owner && (active.current || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) { if (!active.current && !recovery.current) setSessionVersion(value => value + 1); if (!recovery.current) { active.current = true; setExpired(false); } }
      else if (event === "SIGNED_OUT") { if (!explicitLogout.current && latestDraft.current.source) recovery.current = { draft: latestDraft.current, expires: Date.now() + 30 * 60000 }; active.current = false; setSavedName(""); setDraft(emptyDraft); setExpired(true); window.dispatchEvent(new Event("ownpath:session-ended")); }
    });
    const clearPrivate = () => {
      ++lifetime.value;
      const preserve = !explicitLogout.current && !switched.current;
      if (preserve && !recovery.current) recovery.current = { draft: latestDraft.current, expires: Date.now() + 30 * 60000 };
      active.current = false; setAccountOpen(false); setSettings(null); setOpen(false); setSavedName(""); setDraft(emptyDraft);
      // Keep the current Scan/Rewrite instance hidden in memory only until same-account
      // server verification. Explicit logout, account switching and timeout discard it.
      setRetainScan(preserve); if (!preserve) setEntry(null);
      hasWork.current = false; setExpired(true);
    };
    const unavailable = () => { if (!explicitLogout.current && latestDraft.current.source) recovery.current = { draft: latestDraft.current, expires: Date.now() + 30 * 60000 }; clearPrivate(); window.dispatchEvent(new Event("ownpath:session-ended")); };
    const logout = () => { ++lifetime.value; explicitLogout.current = true; recovery.current = null; };
    window.addEventListener("ownpath:explicit-logout", logout);
    window.addEventListener("ownpath:account-unavailable", unavailable);
    window.addEventListener("ownpath:session-ended", clearPrivate);
    return () => { ++lifetime.value; active.current = false; recovery.current = null; data.subscription.unsubscribe(); window.removeEventListener("ownpath:explicit-logout", logout); window.removeEventListener("ownpath:account-unavailable", unavailable); window.removeEventListener("ownpath:session-ended", clearPrivate); };
  }, [owner]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (draft.source) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [draft.source]);
  useEffect(() => { if (open) drawer.current?.querySelector<HTMLElement>("button,a")?.focus(); }, [open]);
  function close(restore = true) { setOpen(false); if (restore) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }
  function closeSettings() {
    setSettings(null);
    requestAnimationFrame(() => {
      const target = settingsTrigger.current;
      if (target?.isConnected && !target.closest("[hidden],[inert]") && target.getClientRects().length) target.focus({ preventScroll: true });
      else (mobile ? trigger.current : drawer.current?.querySelector<HTMLButtonElement>(".op-account-trigger"))?.focus({ preventScroll: true });
    });
  }
  if (switching) return <p role="status">Opening your workspace…</p>;
  return <Context.Provider value={{ draft, setDraft, acknowledgeName }}><WorkspaceSettings.Provider value={openSettings}><WorkspaceSession.Provider value={openSaved}><WorkspaceProfileGuard.Provider value={registerProfileGuard}><WorkspaceDiscardGuard.Provider value={() => (!profileGuard.current || profileGuard.current()) && (!hasWork.current || window.confirm("Sign out and clear this workspace? Save or export first to keep unsaved CV content."))}><PlanSummaryProvider verifiedSession={sessionVersion} enabled={!expired}><div data-sidebar-preference={collapsed ? "collapsed" : "expanded"} className={`op-workspace${rail ? " is-sidebar-collapsed" : ""}`}>{confirmation.dialog}
    {open && <div className="op-backdrop" onClick={() => close()} />}
    <aside ref={drawer} id="workspace-navigation" inert={mobile && !open || undefined} className={`op-sidebar ${open ? "is-open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Workspace navigation" onKeyDown={e => {
      if (e.key === "Escape") close();
      if (open && e.key === "Tab") { const nodes = Array.from(drawer.current?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]") || []).filter(node => !node.closest("[hidden]")); if (!nodes.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><div className="op-brand-row"><Link className="op-brand" href="/" aria-label="OwnPath home" onNavigate={() => close(false)}><span className="op-workspace-symbol" aria-hidden="true" /><span className="op-wordmark">OwnPath</span></Link><button type="button" className="op-sidebar-toggle" aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!rail} aria-controls="workspace-navigation" data-tooltip={rail ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}><WorkbenchIcon name="menu" /></button></div><button className="op-close" onClick={() => close()}>Close navigation</button><p className="op-kicker">CV WORKBENCH</p><nav aria-label="CV workspaces">{links.map(([href, title]) => <Link key={href} href={href} aria-label={title} data-tooltip={title} aria-current={(href === "/app/scan" ? path === "/app" || path === href : path.startsWith(href)) ? "page" : undefined} onNavigate={() => close(false)}><WorkbenchIcon name={href === "/app/scan" ? "scan" : href === "/app/rewrite" ? "edit" : "document"} /><span className="op-nav-label">{title}</span><LinkFeedback /></Link>)}</nav><div className="op-sidebar-bottom"><AccountMenu owner={owner} name={savedName} email={email} expired={expired} accountPage={path === "/app/account"} onDestination={() => close(false)} onOpenChange={setAccountOpen} /></div></aside>
    <main className="op-main" inert={open || undefined} id="main-content"><header className="op-top"><div><button className="op-menu" ref={trigger} aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(true)}><WorkbenchIcon name="menu" /></button><span className="op-top-label">WORKSPACE</span><strong>{pageTitle}</strong></div></header>{expired && <div className="op-message"><p role="alert">Your session ended. Private content is hidden. Your unsaved CV draft can be resumed for 30 minutes in this page after server verification of the same account. It is not stored in your browser or in a URL. Explicit sign-out discards it.</p><a href="/sign-in" target="_blank" rel="noreferrer">Sign in again in a new tab</a><button disabled={resuming} onClick={() => void resumePrivateDraft()}>Verify account and resume</button>{resumeError && <p role="alert">{resumeError}</p>}</div>}<div className="op-content">
      {(!expired || retainScan) && <ScanRewrite key={`${entry?.key || "session"}:${scanVersion}`} initial={entry?.initial} savedId={entry?.savedId} savedRevision={entry?.savedRevision} onWorkChange={workChanged} showOverview={!expired} view={expired ? "hidden" : path === "/app/rewrite" ? "rewrite" : path === "/app" || path === "/app/scan" ? "scan" : "hidden"} />}
      {!expired && children}
    </div></main>
    {!expired && settings && <SettingsDialog section={settings} onSection={setSettings} onClose={closeSettings} owner={owner} name={savedName} email={email} />}
   </div></PlanSummaryProvider></WorkspaceDiscardGuard.Provider></WorkspaceProfileGuard.Provider></WorkspaceSession.Provider></WorkspaceSettings.Provider></Context.Provider>;
}
