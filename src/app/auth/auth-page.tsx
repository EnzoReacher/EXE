import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import AuthControls from "../assessment/auth-controls";

type AuthMode = "signIn" | "signUp";

export default async function AuthPage({ mode, notice }: { mode: AuthMode; notice?: string }) {
  if (await getCurrentUser()) redirect("/assessment");
  const isSignUp = mode === "signUp";

  return (
    <main className="auth-entry" id="main-content" tabIndex={-1}>
      <header className="auth-entry-header">
        <Link className="brand" href="/" aria-label="EXE career readiness home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span>
        </Link>
        <Link href="/" className="auth-back-link">Back to EXE</Link>
      </header>

      <section className="auth-entry-card" aria-labelledby="auth-entry-title">
        <p className="eyebrow">PRIVATE CAREER WORKSPACE</p>
        <h1 id="auth-entry-title">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-entry-intro">
          {isSignUp
            ? "Create a private workspace for your CV, target jobs, evidence reports, and next steps."
            : "Sign in to continue to your CV and target-job workspace."}
        </p>
        {notice && <p className="auth-entry-notice" role="status">{notice}</p>}
        <AuthControls appearance="standalone" initialMode={mode} />
        <p className="auth-entry-privacy">
          Use fictional data while EXE is a prototype. CV files and extracted text are stored in your account’s private Supabase workspace; the team has not completed production backup, retention, or deletion review.
        </p>
      </section>

      <footer className="auth-entry-footer">
        EXE offers advisory career guidance. It does not make hiring decisions, verify qualifications, or guarantee employment.
      </footer>
    </main>
  );
}
