"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signIn" | "signUp";
type AuthControlsProps = {
  appearance?: "compact" | "standalone";
  initialMode?: AuthMode;
  notice?: string;
};
type AuthErrors = { email?: string; password?: string; passwordConfirmation?: string };

const GENERIC_FAILURE = "We could not complete sign-in or account creation. Check your details and connection, then try again.";

export default function AuthControls({
  appearance = "compact",
  initialMode = "signIn",
  notice,
}: AuthControlsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [message, setMessage] = useState(notice ?? (initialMode === "signIn"
    ? "Sign in to access your private intake workspace."
    : "Create an account to save your private career workspace."));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});

  function completeAuthentication() {
    if (appearance === "compact") {
      window.dispatchEvent(new Event("exe:workspace-signed-in"));
      return;
    }
    router.replace("/assessment");
    router.refresh();
  }

  async function authenticate(form: HTMLFormElement) {
    const intent = mode;
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const passwordConfirmation = String(values.get("password-confirmation") || "");
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const nextErrors: AuthErrors = {
      email: !email || !emailInput.validity.valid ? "Enter a valid email address." : undefined,
      password: password.length < 8 ? "Enter a password with at least 8 characters." : undefined,
      passwordConfirmation: intent === "signUp" && password !== passwordConfirmation
        ? "Enter the same password in both fields."
        : undefined,
    };

    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password || nextErrors.passwordConfirmation) {
      const field = nextErrors.email ? "email" : nextErrors.password ? "password" : "password-confirmation";
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    setBusy(true);
    setMessage(intent === "signIn" ? "Signing in…" : "Creating your account…");
    setFailed(false);

    try {
      const supabase = createSupabaseBrowserClient();
      if (intent === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Signed in. Opening your workspace…");
        completeAuthentication();
        return;
      }

      const emailRedirectTo = getAuthCallbackUrl(window.location.origin);
      if (!emailRedirectTo) throw new Error("Auth callback URL is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      if (data.session) {
        setMessage("Account created. Opening your workspace…");
        completeAuthentication();
        return;
      }

      setMessage("If this address can receive a confirmation, check its inbox. Return here after confirming your email.");
    } catch {
      setFailed(true);
      setMessage(GENERIC_FAILURE);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate(event.currentTarget);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setFailed(false);
    setMessage(nextMode === "signIn"
      ? "Sign in to access your private intake workspace."
      : "Create an account to save your private career workspace.");
  }

  const isSignUp = mode === "signUp";

  return (
    <form
      className={`auth-controls${appearance === "standalone" ? " auth-entry-form" : ""}`}
      onSubmit={submit}
      noValidate
      aria-label={isSignUp ? "Create an account" : "Sign in"}
      aria-busy={busy}
    >
      <label htmlFor={`auth-email-${appearance}`}>Email (required)
        <input
          id={`auth-email-${appearance}`}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `auth-email-error-${appearance}` : undefined}
          onChange={() => errors.email && setErrors((current) => ({ ...current, email: undefined }))}
        />
      </label>
      {errors.email && <p className="field-error" id={`auth-email-error-${appearance}`} role="alert">{errors.email}</p>}

      <label htmlFor={`auth-password-${appearance}`}>Password (required)
        <input
          id={`auth-password-${appearance}`}
          name="password"
          type="password"
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={`auth-password-help-${appearance}${errors.password ? ` auth-password-error-${appearance}` : ""}`}
          onChange={() => errors.password && setErrors((current) => ({ ...current, password: undefined }))}
        />
      </label>
      <p className="field-help" id={`auth-password-help-${appearance}`}>Use at least 8 characters.</p>
      {errors.password && <p className="field-error" id={`auth-password-error-${appearance}`} role="alert">{errors.password}</p>}

      {isSignUp && <>
        <label htmlFor={`auth-password-confirmation-${appearance}`}>Confirm password (required)
          <input
            id={`auth-password-confirmation-${appearance}`}
            name="password-confirmation"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.passwordConfirmation)}
            aria-describedby={errors.passwordConfirmation ? `auth-password-confirmation-error-${appearance}` : undefined}
            onChange={() => errors.passwordConfirmation && setErrors((current) => ({ ...current, passwordConfirmation: undefined }))}
          />
        </label>
        {errors.passwordConfirmation && <p className="field-error" id={`auth-password-confirmation-error-${appearance}`} role="alert">{errors.passwordConfirmation}</p>}
      </>}

      <button className="button button-primary" disabled={busy} type="submit">
        {busy ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create account" : "Sign in")}
      </button>
      <button
        className="text-button auth-mode-toggle"
        disabled={busy}
        type="button"
        onClick={() => switchMode(isSignUp ? "signIn" : "signUp")}
      >
        {isSignUp ? "I already have an account — sign in" : "Create account"}
      </button>
      <p role={failed ? "alert" : "status"} aria-live="polite">{message}</p>
    </form>
  );
}
