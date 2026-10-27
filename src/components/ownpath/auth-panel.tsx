"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { accountCallbackUrl } from "@/lib/supabase/auth-redirect";
import { validateAuth, type AccountMode, type AuthErrors, type AuthFields } from "@/lib/supabase/auth-validation";
import styles from "./ownpath.module.css";
import { continueAfterAuth } from "./auth-navigation";
import WorkbenchIcon from "./workbench-icon";
import { PendingLabel } from "./interaction-controls";

type User = { id: string; email?: string };
type Client = ReturnType<typeof createSupabaseBrowserClient>;
const empty: AuthFields = { email: "", password: "", confirm: "" };
const titles: Record<AccountMode, string> = { signIn: "Sign in", signUp: "Create your account", forgot: "Reset your password", reset: "Choose a new password", account: "Your account" };

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {visible ? <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.8M6.5 6.5A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.5-1.5" /> : <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
  </svg>;
}

export default function AuthPanel({ mode, notice, next, initialUser, resetAllowed = false, accountView, beforeSignOut, idPrefix = "" }: {
  mode: AccountMode; notice?: string; next?: string; initialUser?: User | null; resetAllowed?: boolean; accountView?: "security" | "menu"; beforeSignOut?: () => boolean; idPrefix?: string;
}) {
  const [fields, setFields] = useState<AuthFields>(empty);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [message, setMessage] = useState(notice || "");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("submit");
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [complete, setComplete] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (confirmationPending) confirmationHeading.current?.focus(); }, [confirmationPending]);
  const client = useRef<Client | null>(null);
  const alive = useRef(false);
  const locked = useRef(false);
  const epoch = useRef(0);
  const identityRevision = useRef(0);
  const identityEnded = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  const initialUserId = initialUser?.id;
  useEffect(() => {
    alive.current = true;
    let stopped = false;
    const requestEpoch = epoch;
    // This UI does not accept implicit-flow tokens or carry them into links.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    let checkRevision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    const unavailable = () => { identityEnded.current = true; ++checkRevision; ++epoch.current; setUser(null); setFields(empty); setReady(true); };
    if (accountView === "security" || accountView === "menu") window.addEventListener("ownpath:account-unavailable", unavailable);
    const verify = async (sdk: Client) => {
      const revision = ++checkRevision;
      try {
        const { data, error } = await sdk.auth.getUser();
        if (alive.current && revision === checkRevision) {
          setUser(error || (initialUserId && data.user?.id !== initialUserId) ? null : data.user);
          if (accountView === "menu" && ((!error && (!data.user || data.user.id !== initialUserId)) || error?.status === 401 || error?.name === "AuthSessionMissingError")) window.dispatchEvent(new Event("ownpath:account-unavailable"));
        }
      } catch {
        if (alive.current && revision === checkRevision) { setUser(null); setError("We could not check your session. Reload to try again."); }
      } finally {
        if (alive.current && revision === checkRevision) setReady(true);
      }
    };
    async function initialize() {
      await Promise.resolve();
      if (stopped) return;
      try {
      const sdk = createSupabaseBrowserClient();
      client.current = sdk;
      setConfigured(true);
      const { data } = sdk.auth.onAuthStateChange((event, session) => {
        if (!alive.current) return;
        if (initialUserId && session && session.user.id !== initialUserId) {
          identityEnded.current = true;
          ++identityRevision.current; ++checkRevision; ++epoch.current; clearTimeout(timer);
          setUser(null); setFields(empty); setReady(true); return;
        }
        if (event === "SIGNED_OUT") {
          identityEnded.current = true;
          ++checkRevision; ++epoch.current; setUser(null); setVerificationPending(false);
          // A session check can emit SIGNED_OUT after the visitor starts typing.
          // Clear secrets, not a harmless email needed to request a fresh link.
          setFields((value) => ({ ...value, password: "", confirm: "" })); setReady(true);
        } else if (["SIGNED_IN", "TOKEN_REFRESHED", "PASSWORD_RECOVERY", "USER_UPDATED"].includes(event)) {
          if (identityEnded.current && event === "USER_UPDATED") return;
          identityEnded.current = false;
          // Do not re-enter the SDK while it is dispatching an auth callback.
          clearTimeout(timer); timer = setTimeout(() => { void verify(sdk); }, 0);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void verify(sdk);
      } catch {
        setError("Authentication is not configured."); setReady(true);
      }
    }
    void initialize();
    return () => {
      stopped = true; alive.current = false; ++requestEpoch.current; ++checkRevision;
      clearTimeout(timer); unsubscribe?.(); client.current = null;
      window.removeEventListener("ownpath:account-unavailable", unavailable);
    };
  }, [initialUserId, accountView]);

  async function verifyAndContinue(sdk: Client) {
    const revision = epoch.current;
    try {
      const verified = await sdk.auth.getUser();
      if (!alive.current || revision !== epoch.current) return;
      if (verified.error || !verified.data.user) {
        setUser(null); setError("We could not verify your session. Retry verification or sign in again. You have not been redirected."); return;
      }
      continueAfterAuth(mode === "signUp" ? "/app" : next);
    } catch {
      if (alive.current && revision === epoch.current) setError("We could not verify your session. Retry verification or sign in again. You have not been redirected.");
    }
  }

  async function reportLogoutFailure(sdk: Client, identity: number) {
    // Installed SDK may remove the local session even when remote logout fails.
    // Reverify rather than restoring stale identity or claiming either outcome.
    try {
      const verified = await sdk.auth.getUser();
      if (!alive.current || identity !== identityRevision.current) return;
      const active = !verified.error && (!initialUser || verified.data.user?.id === initialUser.id) ? verified.data.user : null;
      setUser(active);
      setError(active
        ? "Could not sign out. Your verified session is still active. Try again."
        : "The provider could not confirm sign-out. This browser session is no longer verified. Sign in again if needed.");
    } catch {
      if (alive.current && identity === identityRevision.current) {
        setUser(null);
        setError("The provider could not confirm sign-out or verify your session. Reload or sign in again. Remote sign-out is not confirmed.");
      }
    }
  }

  function currentFields(): AuthFields {
    // Some password managers fill the native controls without firing React's
    // change event. Validate and submit the same values the user sees.
    if (!form.current) return fields;
    const data = new FormData(form.current);
    return {
      email: String(data.get("email") ?? fields.email),
      password: String(data.get("password") ?? ""),
      confirm: String(data.get("confirm") ?? ""),
    };
  }

  async function submit(event?: FormEvent, action: "submit" | "resend" | "logout" | "verify" = "submit") {
    event?.preventDefault();
    if (locked.current || !ready || !client.current) return;
    if (action === "logout" && beforeSignOut && !beforeSignOut()) return;
    const sdk = client.current;
    const values = currentFields();
    const found = action === "logout" || action === "verify" ? {} : validateAuth(mode, values, action === "resend");
    setFields(values);
    setErrors(found); setError(""); setMessage("");
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    locked.current = true; setPendingAction(action); setBusy(true);
    const revision = epoch.current;
    const logoutIdentity = identityRevision.current;
    const current = () => alive.current && revision === epoch.current;
    try {
      if (action === "verify") { await verifyAndContinue(sdk); return; }
      if (action === "logout") {
        window.dispatchEvent(new Event("ownpath:explicit-logout"));
        const { error } = await sdk.auth.signOut({ scope: "local" });
        // SDK SIGNED_OUT can increment epoch; successful logout does not navigate.
        if (!alive.current || logoutIdentity !== identityRevision.current) return;
        if (error) { await reportLogoutFailure(sdk, logoutIdentity); return; }
        setUser(null); setFields(empty); window.location.replace("/");
        return;
      }
      if (action === "resend" || mode === "forgot" || mode === "signUp") {
        const callback = accountCallbackUrl(window.location.origin, mode === "forgot" ? "/reset-password" : "/app");
        if (!callback) { setError("Authentication callback is not configured. Please contact the site owner."); return; }
        const email = values.email.trim();
        const result = action === "resend"
          ? await sdk.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback } })
          : mode === "forgot"
            ? await sdk.auth.resetPasswordForEmail(email, { redirectTo: callback })
            : await sdk.auth.signUp({ email, password: values.password, options: { emailRedirectTo: callback } });
        if (!current()) return;
        if (result.error) { setError("We could not complete the request. Please wait and try again. No email delivery is confirmed."); return; }
        setFields((value) => ({ ...value, password: "", confirm: "" }));
        if (mode === "signUp" && action === "submit") {
          // Only signUp's response carries a session; resend/recovery do not.
          if ("data" in result && result.data && "session" in result.data && result.data.session) {
            setVerificationPending(true);
            await verifyAndContinue(sdk);
            return;
          }
          setConfirmationPending(true);
          setMessage("If this address is eligible, check its inbox and spam folder for a confirmation link. Open the newest link in this browser. You may already have an account; try signing in. No email delivery is confirmed.");
          return;
        }
        setMessage(mode === "forgot"
          ? "If this address can receive a reset email, check its inbox and spam folder. Open the newest link in this same browser."
          : "If this address is eligible, check its inbox and spam folder for a confirmation link. Open the newest link in this same browser. You may already have an account; try signing in.");
        // Neutral even for an obfuscated existing-account response; no delivery claim.
        return;
      }
      if (mode === "reset") {
        if (!resetAllowed) { setError("Open a valid recovery link or sign in before changing your password."); return; }
        const verified = await sdk.auth.getUser();
        if (!current()) return;
        if (verified.error || !verified.data.user || (initialUser && verified.data.user.id !== initialUser.id)) { setUser(null); setFields(empty); setError("Your session expired or changed. Sign in again or request a new password reset link."); return; }
        const { error } = await sdk.auth.updateUser({ password: values.password });
        if (!current()) return;
        if (error) { setError("Could not update your password. Your link may have expired or your provider may require a different password. Try a new reset link."); return; }
        setFields(empty); setComplete(true); setMessage("Your password has been updated. You can continue to your account.");
        return;
      }
      const { data, error } = await sdk.auth.signInWithPassword({ email: values.email.trim(), password: values.password });
      if (!current()) return;
      if (error || !data.session || !data.user) { setError("Could not sign in. Check your email and password, or request a password reset."); return; }
      setFields((value) => ({ ...value, password: "", confirm: "" }));
      setVerificationPending(true);
      await verifyAndContinue(sdk);
    } catch {
      if (action === "logout") await reportLogoutFailure(sdk, logoutIdentity);
      else if (current()) setError("We could not reach authentication. Your inputs are kept. Check your connection and try again.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const protectedMode = mode === "account" || mode === "reset";
  const canReset = mode !== "reset" || (resetAllowed && !!user);
  const hasPassword = mode === "signIn" || mode === "signUp" || mode === "reset";
  const showForm = mode !== "account" && canReset && !complete && !confirmationPending;
  const actionLabel = verificationPending ? "Retry verification" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : titles[mode];
  const pendingLabel = pendingAction === "verify" ? "Verifying session…" : mode === "forgot" ? "Sending reset link…" : mode === "reset" ? "Updating password…" : mode === "signIn" ? "Signing in…" : "Creating account…";
  if (mode === "account" && accountView === "menu") return <div className="op-account-signout">
    {!ready && <p role="status">Checking authentication…</p>}
    {error && <p role="alert" className="op-error">{error}</p>}
    {ready && !user && <a data-account-item href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in again ↗</a>}
    <button data-account-item type="button" disabled={!ready || busy || !user} aria-busy={busy} onClick={() => void submit(undefined, "logout")}><WorkbenchIcon name="account" /><PendingLabel pending={busy} reserve="Signing out…">{busy ? "Signing out…" : "Sign out"}</PendingLabel></button>
  </div>;
  if (mode === "account" && accountView === "security") return <>
    {user && <section className="op-profile-card" aria-labelledby={`${idPrefix}account-security-heading`}><header><span className="op-icon-tile"><WorkbenchIcon name="account" /></span><div><h2 id={`${idPrefix}account-security-heading`}>Security</h2><p>Keep access to your account secure.</p></div></header><h3>Password</h3><p>Choose a new password using our secure password form.</p><Link className="op-button" href="/reset-password">Change password<WorkbenchIcon name="arrow" /></Link></section>}
    {(user || error) && <section className="op-profile-card op-signout-card" aria-labelledby={`${idPrefix}account-signout-heading`}><h2 id={`${idPrefix}account-signout-heading`}>Sign out</h2><p>Sign out of OwnPath in this browser.</p>{!ready && <p role="status">Checking authentication…</p>}{error && <p className="op-error" role="alert">{error}</p>}{user && <button disabled={!ready || busy} aria-busy={busy} onClick={() => void submit(undefined, "logout")}><PendingLabel pending={busy} reserve="Signing out…">{busy ? "Signing out…" : "Sign out"}</PendingLabel></button>}</section>}
  </>;
  return <section className={styles.authCard} aria-labelledby="auth-form-title">
    <h2 id="auth-form-title">{titles[mode]}</h2>
    <p>{mode === "account" ? "Manage your account and security." : "One experience profile. Multiple job-specific CV versions."}</p>
    {!ready && <p role="status">Checking authentication…</p>}
    {error && <div className={styles.error} role="alert">{error}</div>}
    {message && <div className={styles.notice} role="status">{message}</div>}
    {confirmationPending && <section aria-labelledby="confirmation-heading"><h3 id="confirmation-heading" ref={confirmationHeading} tabIndex={-1}>Check your email</h3><p>Confirm your account before opening the workspace. You have not been signed in or redirected.</p><button type="button" disabled={busy || !ready} onClick={() => void submit(undefined, "resend")}>{busy ? "Sending…" : "Resend confirmation email"}</button><button type="button" disabled={busy} onClick={() => { setConfirmationPending(false); setMessage(""); setError(""); }}>Change email</button></section>}
    {protectedMode && ready && !user && configured && <div className={styles.notice}>Your session is missing or expired. Sign in, or request a fresh reset link.</div>}
    {mode === "reset" && !resetAllowed && <p>We could not verify a signed-in session on the server. Open the newest recovery link in the browser that requested it, or sign in first.</p>}
    {mode === "account" && user && <><p className={styles.accountEmail}>{user.email || "Signed-in account"}</p><button className={styles.primary} disabled={!ready || busy} aria-busy={busy} onClick={() => void submit(undefined, "logout")}><PendingLabel pending={busy} reserve="Signing out…">{busy ? "Signing out…" : "Sign out"}</PendingLabel></button></>}
    {showForm && <form ref={form} className={styles.form} noValidate onSubmit={(event) => void submit(event, verificationPending ? "verify" : "submit")} aria-busy={busy}>
      {mode !== "reset" && <div className={styles.field}><label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" required value={fields.email} disabled={busy} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} onChange={(event) => setFields({ ...currentFields(), email: event.target.value })} />{errors.email && <p className={styles.fieldError} id="email-error">{errors.email}</p>}</div>}
      {hasPassword && <div className={styles.field}>
        <label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}</label>
        <div className={styles.passwordControl}>
          <input id="auth-password" name="password" type={passwordVisible ? "text" : "password"} autoComplete={mode === "signIn" ? "current-password" : "new-password"} required value={fields.password} disabled={busy} aria-invalid={!!errors.password} aria-describedby={`${mode !== "signIn" ? "password-help " : ""}${errors.password ? "password-error" : ""}`.trim() || undefined} onChange={(event) => setFields({ ...currentFields(), password: event.target.value })} />
          <button className={styles.passwordToggle} type="button" disabled={busy} aria-controls="auth-password" aria-label={`${passwordVisible ? "Hide" : "Show"} password`} onClick={() => { setFields(currentFields()); setPasswordVisible(value => !value); }}><PasswordVisibilityIcon visible={passwordVisible} /></button>
        </div>
        {mode !== "signIn" && <p id="password-help">12–128 characters. Use a unique passphrase. To inspect or copy your entry, use the eye button to show your password. Copying a hidden password may be blocked by your browser.</p>}
        {errors.password && <p className={styles.fieldError} id="password-error">{errors.password}</p>}
      </div>}
      {(mode === "signUp" || mode === "reset") && <div className={styles.field}>
        <label htmlFor="auth-confirm">Confirm password</label>
        <div className={styles.passwordControl}>
          <input id="auth-confirm" name="confirm" type={confirmVisible ? "text" : "password"} autoComplete="new-password" required value={fields.confirm} disabled={busy} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-error" : undefined} onChange={(event) => setFields({ ...currentFields(), confirm: event.target.value })} />
          <button className={styles.passwordToggle} type="button" disabled={busy} aria-controls="auth-confirm" aria-label={`${confirmVisible ? "Hide" : "Show"} confirmation password`} onClick={() => { setFields(currentFields()); setConfirmVisible(value => !value); }}><PasswordVisibilityIcon visible={confirmVisible} /></button>
        </div>
        {errors.confirm && <p className={styles.fieldError} id="confirm-error">{errors.confirm}</p>}
      </div>}
      <button className={styles.primary} type="submit" aria-busy={busy && pendingAction !== "resend"} disabled={!ready || busy || !configured}><PendingLabel pending={busy && pendingAction !== "resend"} reserve={actionLabel}>{busy && pendingAction !== "resend" ? pendingLabel : actionLabel}</PendingLabel></button>
      {(mode === "signIn" || mode === "signUp") && <button className={styles.outline} type="button" aria-busy={busy && pendingAction === "resend"} disabled={!ready || busy || !configured} onClick={() => void submit(undefined, "resend")}><PendingLabel pending={busy && pendingAction === "resend"} reserve="Resend confirmation email">{busy && pendingAction === "resend" ? "Sending confirmation…" : "Resend confirmation email"}</PendingLabel></button>}
    </form>}
    <nav className={styles.authLinks} aria-label="Account options">
      {mode !== "signIn" && <Link href="/sign-in">Sign in</Link>}{mode !== "signUp" && <Link href="/sign-up">Create account</Link>}
      {mode !== "forgot" && <Link href="/forgot-password">Forgot password?</Link>}{user && mode !== "account" && <Link href="/account">Your account</Link>}
      {mode === "account" && user && <Link href="/reset-password">Change password</Link>}<Link href="/">Back to OwnPath</Link>
    </nav>
  </section>;
}
