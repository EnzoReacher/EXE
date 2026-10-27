"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { summaryView, type Summary } from "@/lib/billing/view";
import { usePrivateScope } from "@/components/use-private-scope";

/** Presentation only; the existing authenticated summary remains authoritative. */
function useOwnPlanSummary(enabled = true, verifiedSession = 0) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(enabled);
  const [attempt, setAttempt] = useState(0);
  const scope = usePrivateScope(() => { setData(null); setPending(false); setError("Sign in again to view your plan."); }, undefined, verifiedSession);
  useEffect(() => {
    if (!enabled || scope.current.blocked) return;
    let active = true; const controller = new AbortController(); const epoch = scope.current.epoch;
    void fetch("/api/billing/summary", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to view your plan." : "Plan details are unavailable. Retry; your CVs are kept.");
      const checked = summaryView(await response.json());
      if (active && !scope.current.blocked && epoch === scope.current.epoch) { setData(checked); setError(""); }
    }).catch(error => {
      if (active && !scope.current.blocked && epoch === scope.current.epoch) { if (error instanceof Error && error.message.startsWith("Sign in")) setData(null); setError(error instanceof Error ? error.message : "Plan details are unavailable."); }
    }).finally(() => { if (active && !scope.current.blocked && epoch === scope.current.epoch) setPending(false); });
    return () => { active = false; controller.abort(); };
  }, [enabled, attempt, scope, verifiedSession]);
  const refresh = useCallback(() => { if (!enabled || scope.current.blocked) return; setPending(true); setError(""); setAttempt(n => n + 1); }, [enabled, scope]);
  return { data, error, pending, refresh };
}

const PlanSummaryContext = createContext<ReturnType<typeof useOwnPlanSummary> | null>(null);
export const useSharedPlanSummary = () => useContext(PlanSummaryContext);
/** One authenticated-shell read model, not a persistent cache or an entitlement source. */
export function PlanSummaryProvider({ children, enabled = true, verifiedSession = 0 }: { children: ReactNode; enabled?: boolean; verifiedSession?: number }) {
  const plan = useOwnPlanSummary(enabled, verifiedSession);
  return createElement(PlanSummaryContext.Provider, { value: plan }, children);
}
export function usePlanSummary(enabled = true) {
  const shared = useContext(PlanSummaryContext);
  const own = useOwnPlanSummary(enabled && !shared);
  return shared || own;
}
