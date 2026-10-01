"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthControls() {
  const [message, setMessage] = useState("Sign in to access your private intake workspace.");
  const [busy, setBusy] = useState(false);

  async function authenticate(form: HTMLFormElement, intent: "signIn" | "signUp") {
    const values = new FormData(form);
    setBusy(true); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const email = String(values.get("email") || ""); const password = String(values.get("password") || "");
      const { error } = intent === "signIn" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage(intent === "signIn" ? "Signed in. Refresh the private workspace below." : "Account created. Check your email if confirmation is enabled, then sign in.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "We could not complete sign-in."); }
    finally { setBusy(false); }
  }

  function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void authenticate(event.currentTarget, "signIn"); }
  function signUp(event: MouseEvent<HTMLButtonElement>) { const form = event.currentTarget.form; if (form?.reportValidity()) void authenticate(form, "signUp"); }

  return <form className="auth-controls" onSubmit={signIn}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" minLength={8} autoComplete="current-password" required /></label><button className="button button-primary" disabled={busy} type="submit">{busy ? "Working…" : "Sign in"}</button><button className="text-button" disabled={busy} type="button" onClick={signUp}>Create account</button><p aria-live="polite">{message}</p></form>;
}
