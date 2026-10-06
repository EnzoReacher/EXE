"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const sections = [
  ["/assessment", "Assessment workspace"],
  ["/saved-work", "Saved work"],
  ["/credential-versions", "CV versions and proof"],
  ["/opportunities", "Opportunities"],
  ["/expert/credential-reviews", "Expert reviews"],
] as const;

export default function WorkspaceHeader({ active }: { active?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const result = await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
      // Discard client state and the router cache containing private records.
      window.location.replace("/sign-in");
    } catch { setError(true); setBusy(false); }
  }
  return <header className="workspace-header">
    <div className="workspace-header-row">
      <Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link>
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>
    </div>
    <nav className="workspace-navigation" aria-label="Workspace navigation">{sections.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}</nav>
    {error && <p role="alert">We could not sign out. Check your connection and try again.</p>}
  </header>;
}
