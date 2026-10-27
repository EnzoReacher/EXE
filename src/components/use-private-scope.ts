"use client";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Ignore private responses after unmount, session end or a different account. */
export function usePrivateScope(onEnd: () => void, owner?: string, verifiedSession = 0) {
  const scope = useRef({ alive: true, epoch: 0, blocked: false });
  const reset = useRef(onEnd);
  useEffect(() => { reset.current = onEnd; });
  useEffect(() => {
    const state = scope.current; state.alive = true; state.blocked = false;
    let observedOwner = owner; let unsubscribe: (() => void) | undefined;
    const end = () => { ++state.epoch; state.blocked = true; reset.current(); };
    window.addEventListener("ownpath:session-ended", end);
    try {
      const { data } = createSupabaseBrowserClient().auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || (session && observedOwner && session.user.id !== observedOwner)) end();
        else if (session) observedOwner = session.user.id;
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch { /* Server protection remains authoritative; configuration errors are recoverable in the caller. */ }
    return () => { state.alive = false; ++state.epoch; unsubscribe?.(); window.removeEventListener("ownpath:session-ended", end); };
  // A verified same-account transition may reopen the scope without remounting
  // the component tree that holds the private, unsaved draft.
  }, [owner, verifiedSession]);
  return scope;
}
