"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerReviewShare, ReviewExpiry } from "@/lib/review-links/types";

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const expiryLabel = (hours: number) => hours === 24 ? "24 hours" : hours === 168 ? "7 days" : "30 days";

export default function ReviewLinks({ analysisId }: { analysisId: string }) {
  const [shares, setShares] = useState<OwnerReviewShare[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [expiry, setExpiry] = useState<ReviewExpiry>("7d");
  const [includeDraft, setIncludeDraft] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [url, setUrl] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const urlInput = useRef<HTMLInputElement>(null);

  async function readResponse(response: Response) {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "We could not update your private review links. Try again.");
    return body;
  }

  async function load() {
    setBusy("load"); setLoadError(false);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { cache: "no-store" }));
      if (!Array.isArray(body.shares)) throw new Error("Invalid link list");
      setShares(body.shares);
    } catch { setLoadError(true); }
    finally { setBusy(null); }
  }

  useEffect(() => {
    let current = true;
    fetch(`/api/analysis/${analysisId}/review-shares`, { cache: "no-store" })
      .then(readResponse)
      .then((body) => { if (!Array.isArray(body.shares)) throw new Error("Invalid link list"); if (current) setShares(body.shares); })
      .catch(() => { if (current) setLoadError(true); });
    return () => { current = false; };
  }, [analysisId]);

  async function create() {
    if (busy) return;
    setBusy("create"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiry, includeAcceptedDraft: includeDraft }) }));
      if (!body.token || !body.share?.id) throw new Error("We could not confirm creation. Reload the link list before trying again.");
      setUrl(`${window.location.origin}/review/${body.token}`); setCreatedId(body.share.id);
      setShares((current) => current ? [body.share, ...current] : current);
      setNotice({ tone: "success", text: "Your private review link is ready. Copy it now: it cannot be recovered after you leave or refresh this page." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not create your private review link. Try again." }); }
    finally { setBusy(null); }
  }

  async function revoke(shareId: string) {
    if (busy) return;
    setBusy(shareId); setNotice(null);
    try {
      await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareId }) }));
      setShares((current) => current?.map((share) => share.id === shareId ? { ...share, state: "revoked" } : share) ?? null);
      if (shareId === createdId) { setUrl(""); setCreatedId(""); }
      setNotice({ tone: "success", text: "This private review link was revoked. It can no longer be used." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not revoke that private review link. Try again." }); }
    finally { setBusy(null); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setNotice({ tone: "success", text: "Private review link copied." }); }
    catch { setNotice({ tone: "error", text: "Clipboard access failed. Select the URL field and copy the link manually with your keyboard or device menu." }); urlInput.current?.focus(); urlInput.current?.select(); }
  }

  return <section className="review-links-section" aria-labelledby="review-links-heading">
    <div className="next-steps-heading"><div><p className="eyebrow">PRIVATE REVIEW LINK</p><h2 id="review-links-heading">Ask for feedback you control</h2></div></div>
    <p className="review-links-intro">Anyone with this link can view the selected content until it expires or you revoke it. Share only with someone you trust. The reviewer can give feedback; they cannot change your CV or report.</p>
    <div className="review-link-controls">
      <label>Link expiry<select value={expiry} disabled={!!busy} onChange={(event) => setExpiry(event.target.value as ReviewExpiry)}><option value="24h">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option></select></label>
      <label className="review-checkbox"><input type="checkbox" checked={includeDraft} disabled={!!busy} aria-describedby="review-draft-help" onChange={(event) => setIncludeDraft(event.target.checked)} />Include my accepted CV draft</label>
      <p id="review-draft-help">Only an explicitly accepted draft can be included. An unaccepted or edited draft stays private.</p>
      <button className="button button-primary" type="button" onClick={() => void create()} disabled={!!busy || shares === null || loadError}>{busy === "create" ? "Creating link…" : "Create private review link"}</button>
    </div>
    <p className="sr-only" role="status">{busy === "create" ? "Creating private review link…" : busy === "load" ? "Loading review links…" : busy ? "Revoking private review link…" : ""}</p>
    {notice && <p className={`form-notice ${notice.tone === "error" ? "error" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
    {url && <div className="review-url"><label htmlFor="review-url">Copy your new private review URL</label><input ref={urlInput} id="review-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="button button-secondary" onClick={() => void copy()}>Copy link</button></div>}
    <div className="review-share-list"><h3>Your review links</h3>
      {loadError ? <div><p className="field-error" role="alert">We could not load your private review links. Your saved links have not been changed.</p><button className="button button-secondary" type="button" disabled={!!busy} onClick={() => void load()}>Retry loading links</button></div> : shares === null ? <p role="status">Loading your private review links…</p> : !shares.length ? <p>No review links yet. Create one only when you are ready to share this selected report.</p> : shares.map((share) => <article className="review-share-card" key={share.id}>
        <div><strong>{share.state === "active" ? "Active link" : share.state === "expired" ? "Expired link" : "Revoked link"}</strong><p>Created {formatDate(share.createdAt)} · Selected expiry {expiryLabel(share.expiryHours)} · Expires {formatDate(share.expiresAt)} · {share.includesAcceptedDraft ? "Accepted draft included" : "Report only"}</p></div>
        {share.state === "active" && <button className="text-button danger" type="button" disabled={!!busy} aria-label={`Revoke link created ${formatDate(share.createdAt)}`} onClick={() => void revoke(share.id)}>{busy === share.id ? "Revoking link…" : "Revoke link"}</button>}
        <div className="review-feedback"><strong>{share.feedback.length} feedback {share.feedback.length === 1 ? "entry" : "entries"}</strong>{share.feedback.length ? share.feedback.map((item) => <article key={item.id}><p><strong>{item.reviewerName ?? "Anonymous reviewer"}</strong>{item.reviewerRole ? ` · ${item.reviewerRole}` : ""}</p><p>{item.feedback}</p><small>{formatDate(item.createdAt)}</small></article>) : <p>No feedback yet. Feedback is advice, not verification.</p>}</div>
      </article>)}
    </div>
  </section>;
}
