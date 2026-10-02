"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthControls() {
  const [message, setMessage] = useState("Sign in to access your private intake workspace.");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function authenticate(form: HTMLFormElement, intent: "signIn" | "signUp") {
    const values = new FormData(form);
    const email = String(values.get("email") || ""); const password = String(values.get("password") || "");
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const nextErrors = { email: !email || !emailInput.validity.valid ? "Enter a valid email address." : undefined, password: password.length < 8 ? "Enter a password with at least 8 characters." : undefined };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) { (form.elements.namedItem(nextErrors.email ? "email" : "password") as HTMLInputElement).focus(); return; }
    setBusy(true); setMessage(intent === "signIn" ? "Signing in…" : "Creating your account…"); setFailed(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = intent === "signIn" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (intent === "signIn") window.dispatchEvent(new Event("exe:workspace-signed-in"));
      setMessage(intent === "signIn" ? "Signed in. Reloading your saved CVs and jobs below. You can also select Reload workspace to try again." : "Account created. Check your email if confirmation is enabled, then sign in.");
    } catch { setFailed(true); setMessage("We could not complete sign-in or account creation. Check your details and connection, then try again."); }
    finally { setBusy(false); }
  }

  function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void authenticate(event.currentTarget, "signIn"); }
  function signUp(event: MouseEvent<HTMLButtonElement>) { const form = event.currentTarget.form; if (form) void authenticate(form, "signUp"); }

  return <form className="auth-controls" onSubmit={signIn} noValidate aria-label="Sign in or create an account" aria-busy={busy}><label>Email (required)<input name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "auth-email-error" : undefined} /></label>{errors.email && <p className="field-error" id="auth-email-error" role="alert">{errors.email}</p>}<label>Password (required)<input name="password" type="password" minLength={8} autoComplete="current-password" required aria-invalid={Boolean(errors.password)} aria-describedby={`auth-password-help${errors.password ? " auth-password-error" : ""}`} /></label><p className="field-help" id="auth-password-help">Use at least 8 characters.</p>{errors.password && <p className="field-error" id="auth-password-error" role="alert">{errors.password}</p>}<button className="button button-primary" disabled={busy} type="submit">Sign in</button><button className="text-button" disabled={busy} type="button" onClick={signUp}>Create account</button><p role={failed ? "alert" : "status"}>{message}</p></form>;
}
