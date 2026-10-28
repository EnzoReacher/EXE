"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { accountInitials, displayName, DISPLAY_NAME_LIMIT, validateDisplayName } from "@/lib/supabase/account-profile";
import { useAccountAcknowledgement } from "./workspace-shell";
import WorkbenchIcon from "./workbench-icon";
import AuthPanel from "./auth-panel";
import { PendingLabel } from "./interaction-controls";
import { useWorkspaceDiscardGuard, useWorkspaceProfileGuard } from "./workspace-session";

type Identity = { id: string; email?: string; user_metadata?: Record<string, unknown> };
function missingSession(error: { status?: number; name?: string; code?: string } | null) {
  return error?.status === 401 || error?.name === "AuthSessionMissingError" || error?.code === "session_not_found";
}
export default function AccountProfile({ initialUser, section = "all", onUnsavedChange, onPendingChange, idPrefix = "" }: { initialUser: Identity; section?: "all" | "profile" | "security" | "hidden"; onUnsavedChange?: (value: boolean) => void; onPendingChange?: (value: boolean) => void; idPrefix?: string }) {
  const id = (value: string) => idPrefix + value;
  const beforeDiscard = useWorkspaceDiscardGuard();
  const registerProfileGuard = useWorkspaceProfileGuard();
  const guardKey = useRef({});
  const initialName = displayName(initialUser.user_metadata);
  const [identity, setIdentity] = useState<Identity | null>(initialUser);
  const [name, setName] = useState(initialName); const [acknowledged, setAcknowledged] = useState(initialName);
  const [ready, setReady] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const sdk = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const state = useRef({ alive: false, epoch: 0, locked: false, name: initialName, acknowledged: initialName });
  const field = useRef<HTMLInputElement>(null); const acknowledgeName = useAccountAcknowledgement();
  const dirty = name.trim() !== acknowledged; const changed = name !== acknowledged;
  useEffect(() => { onUnsavedChange?.(dirty || saving); }, [dirty, saving, onUnsavedChange]);
  useEffect(() => { onPendingChange?.(saving); }, [saving, onPendingChange]);
  useEffect(() => {
    registerProfileGuard?.(() => !dirty || window.confirm("Sign out without saving your display name? Your unsaved changes will be lost."), guardKey.current);
    const key = guardKey.current;
    return () => registerProfileGuard?.(null, key);
  }, [dirty, registerProfileGuard]);
  function edit(value: string) { state.current.name = value; setName(value); setError(""); }
  function cancel() { edit(state.current.acknowledged); field.current?.focus(); }
  function invalidate() {
    ++state.current.epoch; state.current.locked = false; state.current.name = ""; state.current.acknowledged = "";
    setIdentity(null); setName(""); setAcknowledged(""); setSaved(false); setSaving(false); setReady(true);
    window.dispatchEvent(new Event("ownpath:account-unavailable"));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!ready || !identity || state.current.locked || !sdk.current || !dirty) return;
    let submitted: string;
    try { submitted = validateDisplayName(name); } catch (e) { setError((e as Error).message); field.current?.focus(); return; }
    state.current.locked = true; setSaving(true); setError(""); setSaved(false);
    const epoch = ++state.current.epoch; const current = () => state.current.alive && state.current.epoch === epoch;
    try {
      const verified = await sdk.current.auth.getUser(); if (!current()) return;
      if (missingSession(verified.error)) { invalidate(); return; }
      if (verified.error) throw new Error("We could not verify your session. Your edits are kept; retry or sign in again.");
      if (!verified.data.user || verified.data.user.id !== initialUser.id) { invalidate(); return; }
      const result = await sdk.current.auth.updateUser({ data: { ...verified.data.user.user_metadata, display_name: submitted } });
      if (!current()) return;
      if (missingSession(result.error)) { invalidate(); return; }
      if (result.error) throw new Error("Your changes could not be saved. Your edits are kept; please retry.");
      if (!result.data.user || result.data.user.id !== initialUser.id || displayName(result.data.user.user_metadata) !== submitted) throw new Error("The saved name was not confirmed. Your edits are kept; retry.");
      state.current.acknowledged = submitted; setAcknowledged(submitted); setIdentity(result.data.user); setSaved(true);
      if (state.current.name.trim() === submitted) { state.current.name = submitted; setName(submitted); }
      acknowledgeName(initialUser.id, submitted);
    } catch { if (current()) setError("Could not save your name or confirm the saved changes. Your edits are kept; please retry."); }
    finally { if (current()) { state.current.locked = false; setSaving(false); } }
  }
  useEffect(() => {
    const current = state.current; current.alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    async function verify() {
      if (current.locked) return;
      const epoch = ++current.epoch;
      try {
        const client = sdk.current; if (!client) return;
        const result = await client.auth.getUser(); if (!current.alive || epoch !== current.epoch) return;
        if (missingSession(result.error)) { invalidate(); return; }
        if (result.error) throw new Error();
        if (!result.data.user || result.data.user.id !== initialUser.id) { invalidate(); return; }
        const value = displayName(result.data.user.user_metadata);
        setIdentity(result.data.user);
        if (current.name.trim() === current.acknowledged) { current.name = value; setName(value); }
        current.acknowledged = value; setAcknowledged(value); setReady(true); setError("");
      } catch { if (current.alive && epoch === current.epoch) { setReady(true); setError("We could not check your account. Your edits are kept; try saving again."); } }
    }
    try {
      const client = createSupabaseBrowserClient(); sdk.current = client;
      const subscription = client.auth.onAuthStateChange((event, session) => {
        if (!current.alive) return;
        if (event === "SIGNED_OUT" || (session && session.user.id !== initialUser.id)) { clearTimeout(timer); invalidate(); }
        else if (["SIGNED_IN", "TOKEN_REFRESHED"].includes(event) && !current.locked) { clearTimeout(timer); timer = setTimeout(() => void verify(), 0); }
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
      void verify();
    } catch { queueMicrotask(() => { if (current.alive) { setReady(true); setError("Authentication is not configured. Your edits are kept."); } }); }
    return () => { current.alive = false; ++current.epoch; clearTimeout(timer); unsubscribe?.(); sdk.current = null; };
  }, [initialUser.id]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download") || link.href === window.location.href || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Leave without saving your display name? Your unsaved changes will be lost.")) { event.preventDefault(); event.stopPropagation(); }
    };
    // Same-document Back/Forward does not fire beforeunload in app-router pages.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType === "traverse" && event.cancelable && !window.confirm("Leave without saving your display name? Your unsaved changes will be lost.")) event.preventDefault();
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    navigation?.addEventListener("navigate", traverse);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); navigation?.removeEventListener("navigate", traverse); };
  }, [dirty]);
  return <div className={`op-profile-page op-account-section-${section}`}>
    <div className="op-page-heading"><div><p className="op-eyebrow">PROFILE & SECURITY</p><h1>Your account</h1><p>The details that make this workspace yours.</p></div><Link href="/app/cvs" className="op-profile-library"><WorkbenchIcon />Saved CVs<WorkbenchIcon name="arrow" /></Link></div>
    {!identity ? <div className="op-card" role="status"><h2>Your session is no longer available.</h2><p>Sign in again to manage your account.</p><Link className="op-button" href="/sign-in">Sign in</Link></div> : <>
      <section className="op-profile-summary" aria-label="Profile summary"><span className="op-profile-avatar" aria-hidden="true">{accountInitials(acknowledged, identity.email)}</span><div><h2>{acknowledged || "Add a display name"}</h2><p>{identity.email || "No email supplied by your provider"}</p></div><span className="op-profile-summary-note">Your OwnPath account</span></section>
    </>}
      <div className={`op-profile-grid${identity ? "" : " op-profile-ended"}`}>{identity && <section className="op-profile-card" aria-labelledby={id("personal-details-heading")}><header><span className="op-icon-tile"><WorkbenchIcon name="account" /></span><div><h2 id={id("personal-details-heading")}>Personal details</h2><p>A name for your account, not your CV.</p></div></header>
        <form onSubmit={event => void save(event)} aria-label="Personal details" aria-busy={saving} noValidate>
          <label htmlFor={id("account-display-name")}>Display name <span className="op-optional">Optional</span></label><input ref={field} id={id("account-display-name")} name="displayName" autoComplete="nickname" maxLength={DISPLAY_NAME_LIMIT} value={name} onChange={event => edit(event.target.value)} aria-describedby={`${id("display-name-help")}${error ? ` ${id("account-name-error")}` : ""}`} aria-invalid={!!error} /><p id={id("display-name-help")} className="op-field-hint">Up to 80 characters. You can leave this blank.</p>
          <label htmlFor={id("account-email")}>Email address <span className="op-optional">Read-only</span></label><input id={id("account-email")} type="email" value={identity.email || ""} readOnly autoComplete="email" /><p className="op-field-hint">Email changes aren’t available here.</p>
          {error && <p className="op-error" id={id("account-name-error")} role="alert">{error}</p>}
           <div className="op-profile-form-footer"><div className="op-actions"><button className="op-primary" disabled={!ready || saving || !dirty} aria-busy={saving} type="submit"><PendingLabel pending={saving} reserve="Save changes">{saving ? "Saving…" : "Save changes"}</PendingLabel></button><button disabled={!changed || saving} type="button" onClick={cancel}>Cancel</button></div><p className="op-profile-status" role="status">{!ready ? "Checking account…" : saving ? "Saving your display name…" : dirty ? "Unsaved changes." : saved ? "Changes saved." : "Up to date."}</p></div>
        </form>
      </section>}<div className="op-security-stack"><AuthPanel mode="account" accountView="security" idPrefix={idPrefix} initialUser={{ id: initialUser.id, email: identity?.email }} beforeSignOut={() => beforeDiscard ? beforeDiscard() : !dirty || window.confirm("Sign out without saving your display name? Your unsaved changes will be lost.")} /></div></div>
      {identity && <p className="op-profile-footnote">Your account name doesn’t change names or content in saved CVs.</p>}
  </div>;
}
