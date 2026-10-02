"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AnalysisStatus({ id }: { id: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/analysis/${id}`, { cache: "no-store" });
        const body = await response.json();
        if (response.ok && ["completed", "failed"].includes(body.details?.run?.status)) {
          window.clearInterval(timer);
          router.refresh();
        } else if (attempts >= 20) {
          window.clearInterval(timer);
          setSlow(true);
        }
      } catch {
        if (attempts >= 20) {
          window.clearInterval(timer);
          setSlow(true);
        }
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [id, router]);

  return <div className="analysis-status-card" role="status" aria-live="polite">
    <span className="analysis-spinner" aria-hidden="true" />
    <div><strong>Your report is being prepared</strong><p>{slow ? "It is taking longer than expected. Refresh the page to check again." : "This local text check usually takes a moment."}</p></div>
    {slow && <button type="button" className="text-button" onClick={() => router.refresh()}>Refresh report</button>}
  </div>;
}

export function RetryAnalysis({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/analysis/${id}`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "We could not retry this report.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not retry this report.");
    } finally { setBusy(false); }
  }

  return <div className="analysis-retry"><button className="button button-primary" type="button" onClick={() => void retry()} disabled={busy} aria-describedby={error ? "retry-error" : undefined}>{busy ? "Retrying…" : "Retry report"}</button><p className="sr-only" role="status">{busy ? "Retrying the report…" : ""}</p>{error && <p id="retry-error" className="field-error" role="alert">{error}</p>}</div>;
}
