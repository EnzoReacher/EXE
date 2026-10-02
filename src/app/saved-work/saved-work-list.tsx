"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SavedWorkItem } from "@/lib/saved-work/repository";

const reportLabels = { processing: "Report in progress", completed: "Report ready", failed: "Report needs retry" } as const;
const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

export default function SavedWorkList() {
  const [items, setItems] = useState<SavedWorkItem[] | null>(null);
  const [error, setError] = useState<"session" | "load" | null>(null);
  const load = useCallback(async () => {
    setError(null); setItems(null);
    try {
      const response = await fetch("/api/saved-work", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(response.status === 401 ? "session" : "load"); return; }
      setItems(body.items as SavedWorkItem[]);
    } catch { setError("load"); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (items === null && !error) return <section className="analysis-status-card" role="status" aria-live="polite"><span className="analysis-spinner" aria-hidden="true" /><div><strong>Loading your saved work</strong><p>Checking your private workspace.</p></div></section>;
  if (error) return <section className="analysis-failure" role="alert"><div><strong>{error === "session" ? "Please sign in to see saved work" : "We could not load saved work"}</strong><p>{error === "session" ? "Your private workspace is available after you sign in." : "Your reports are still private. Please try again."}</p></div><button type="button" className="button button-secondary" onClick={() => void load()}>{error === "session" ? "Try again" : "Reload saved work"}</button></section>;
  if (!items?.length) return <section className="analysis-empty"><h2>No saved reports yet</h2><p>When you create an evidence report, it will appear here so you can return to it later.</p><Link className="button button-primary" href="/assessment">Start an assessment <span aria-hidden="true">→</span></Link></section>;
  return <section className="saved-work-list" aria-label="Saved reports">{items.map((item) => <article className="saved-work-card" key={item.analysisId}>
    <div className="saved-work-heading"><div><h2>{item.roleTitle}</h2><p>{item.companyName ?? "Company not added"}</p></div><span className={`saved-report-status ${item.reportStatus}`}>{reportLabels[item.reportStatus]}</span></div>
    <dl className="saved-work-details"><div><dt>CV</dt><dd>{item.cvFilename}</dd></div><div><dt>Last updated</dt><dd>{formatDate(item.updatedAt)}</dd></div><div><dt>Findings</dt><dd>{item.findingCounts.supported} supported · {item.findingCounts.partly_supported} partly supported · {item.findingCounts.unclear} unclear · {item.findingCounts.missing} missing</dd></div><div><dt>CV draft</dt><dd>{item.hasDraft ? item.draftAccepted ? "Accepted" : "Needs review" : "Not created yet"}</dd></div></dl>
    <div className="saved-work-actions"><Link className="button button-secondary" href={`/analysis/${item.analysisId}`}>{item.reportStatus === "failed" ? "Open and retry report" : "Open report"}</Link><Link className="button button-primary" href={`/analysis/${item.analysisId}/next-steps`}>{item.hasDraft ? "Open next steps and draft" : "Create next steps and draft"}</Link></div>
  </article>)}</section>;
}
