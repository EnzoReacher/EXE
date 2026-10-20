"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./ownpath.module.css";
import { LinkFeedback } from "./interaction-controls";

// Presentation only. Never treats a session-event payload as verified identity.
export function AccountNavigation() {
  const [state, setState] = useState<"checking" | "verified" | "guest">("checking");
  useEffect(() => {
    let stopped = false;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      await Promise.resolve();
      if (stopped) return;
      try {
        const sdk = createSupabaseBrowserClient();
        const verify = async () => {
          const check = ++revision;
          try {
            const result = await sdk.auth.getUser();
            if (!stopped && check === revision) setState(!result.error && result.data.user ? "verified" : "guest");
          } catch {
            if (!stopped && check === revision) setState("guest");
          }
        };
        const subscription = sdk.auth.onAuthStateChange((event) => {
          if (stopped) return;
          ++revision; clearTimeout(timer);
          // Never re-enter SDK from its callback, or show stale signed-in state.
          setState(event === "SIGNED_OUT" ? "guest" : "checking");
          if (event !== "SIGNED_OUT") timer = setTimeout(() => { void verify(); }, 0);
        });
        unsubscribe = () => subscription.data.subscription.unsubscribe();
        void verify();
      } catch { if (!stopped) setState("guest"); }
    }
    void initialize();
    return () => { stopped = true; ++revision; clearTimeout(timer); unsubscribe?.(); };
  }, []);
  return <span className={styles.accountNavigation} aria-busy={state === "checking"}>
    {state === "verified" ? <Link prefetch={false} href="/app">Go to workspace<LinkFeedback /></Link> : <>
      {state === "checking" && <span className={styles.sessionHint}>Checking account…</span>}
      <Link prefetch={false} href="/sign-in">Sign in<LinkFeedback /></Link>
      {state === "guest" && <Link prefetch={false} href="/sign-up">Create account<LinkFeedback /></Link>}
    </>}
  </span>;
}
