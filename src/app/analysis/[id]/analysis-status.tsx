"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivateScope } from "@/components/use-private-scope";
import { readPrivateResponse } from "@/lib/http/read-private-response";

function runStatus(body: Record<string, unknown>, id: string) {
  const details = body.details as { run?: { id?: unknown; status?: unknown } } | null;
  const run = details?.run;
  return run?.id === id && ["processing", "completed", "failed"].includes(String(run.status)) ? String(run.status) : null;
}

export function AnalysisStatus({ id }: { id: string }) {
  const router = useRouter();
  const [cycle, setCycle] = useState(0); const [state, setState] = useState("polling");
  const scope = usePrivateScope(() => setState("ended"));
  useEffect(() => {
    let cancelled = false; let attempts = 0; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController(); const epoch = scope.current.epoch;
    const current = () => !cancelled && !scope.current.blocked && scope.current.epoch === epoch;
    async function poll() {
      if (!current()) return;
      ++attempts;
      try {
        const body = await readPrivateResponse(await fetch(`/api/analysis/${id}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }), "Report status is unavailable.");
        if (!current()) return;
        const status = runStatus(body, id);
        if (status === "completed" || status === "failed") { setState(status); router.refresh(); return; }
      } catch { /* Bounded retry, no raw HTTP/parser message and no overlapping requests. */ }
      if (!current()) return;
      if (attempts >= 20) { setState("slow"); return; }
      timer = setTimeout(() => void poll(), 1500);
    }
    timer = setTimeout(() => void poll(), 1500);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [id, cycle, router, scope]);
  return <div className="analysis-status-card" role="status" aria-live="polite">
    {state === "polling" && <span className="analysis-spinner" aria-hidden="true" />}
    <div><strong>{state === "ended" ? "Your session ended" : state === "completed" ? "Your report completed" : state === "failed" ? "Your report could not be completed" : "Your report is being prepared"}</strong><p>{state === "slow" ? "Automatic checks paused. Refresh to start another bounded status check." : state === "ended" ? "Sign in again and reload this private page." : state === "completed" || state === "failed" ? "Refreshing the saved report. You can check again if this view has not updated." : "This local text check usually takes a moment."}</p></div>
    {state !== "polling" && state !== "ended" && <button type="button" className="text-button" onClick={() => { setState("polling"); setCycle(c => c + 1); router.refresh(); }}>Refresh report</button>}
  </div>;
}

export function RetryAnalysis({ id }: { id: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const locked = useRef(false); const scope = usePrivateScope(() => { setPending(false); setBusy(false); setError("Your session ended. Sign in again and reload."); });
  async function retry() {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; setBusy(true); setError(""); const epoch = scope.current.epoch;
    const current = () => scope.current.alive && !scope.current.blocked && epoch === scope.current.epoch;
    try {
      const response = await fetch(`/api/analysis/${id}`, { method: "POST" });
      const body = await readPrivateResponse(response, "We could not confirm retry. Your saved inputs are kept; try again.");
      if (!current()) return;
      const status = runStatus(body, id);
      if (!status || (response.status === 202 && status !== "processing")) throw new Error();
      setPending(status === "processing"); router.refresh();
    } catch { if (current()) setError("We could not confirm retry. Your saved inputs are kept; try again."); }
    finally { if (current()) { locked.current = false; setBusy(false); } }
  }
  if (pending) return <AnalysisStatus id={id} />;
  return <div className="analysis-retry"><button className="button button-primary" type="button" onClick={() => void retry()} disabled={busy || scope.current.blocked} aria-describedby={error ? "retry-error" : undefined}>{busy ? "Retrying…" : "Retry report"}</button><p className="sr-only" role="status">{busy ? "Retrying the report…" : ""}</p>{error && <p id="retry-error" className="field-error" role="alert">{error}</p>}</div>;
}
