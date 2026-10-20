"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerReviewShare, ReviewExpiry } from "@/lib/review-links/types";
import { readPrivateResponse } from "@/lib/http/read-private-response";
import { usePrivateScope } from "@/components/use-private-scope";

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const expiryLabel = (hours: number) => hours === 24 ? "24 hours" : hours === 168 ? "7 days" : "30 days";

export default function ReviewLinks({ analysisId, owner }: { analysisId: string; owner?: string }) {
  return <ReviewLinksContent key={`${owner}:${analysisId}`} analysisId={analysisId} owner={owner} />;
}
function ReviewLinksContent({ analysisId, owner }: { analysisId: string; owner?: string }) {
  const [shares, setShares] = useState<OwnerReviewShare[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [expiry, setExpiry] = useState<ReviewExpiry>("7d");
  const [includeDraft, setIncludeDraft] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [url, setUrl] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const scope = usePrivateScope(() => { setShares(null); setUrl(""); setCreatedId(""); setBusy(null); setLoadError(true); locked.current = false; }, owner);
  const message = "We could not confirm your private review link request. Your selections are kept. Reload the list before retrying.";
  const current = (epoch: number) => scope.current.alive && !scope.current.blocked && scope.current.epoch === epoch;
  function validShare(value: unknown): value is OwnerReviewShare {
    if (!value || typeof value !== "object") return false;
    const s = value as OwnerReviewShare;
    return typeof s.id === "string" && !!s.id && ["active", "expired", "revoked"].includes(s.state) && Number.isFinite(Date.parse(s.createdAt)) && Number.isFinite(Date.parse(s.expiresAt)) && [24, 168, 720].includes(s.expiryHours) && typeof s.includesAcceptedDraft === "boolean" && Array.isArray(s.feedback) && s.feedback.every(f => f && typeof f.id === "string" && typeof f.feedback === "string" && (f.reviewerName === null || typeof f.reviewerName === "string") && (f.reviewerRole === null || typeof f.reviewerRole === "string") && Number.isFinite(Date.parse(f.createdAt)));
  }

  async function readResponse(response: Response) {
    return readPrivateResponse(response, message);
  }

  async function load() {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy("load"); setLoadError(false);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { cache: "no-store" }));
      if (!Array.isArray(body.shares) || !body.shares.every(validShare)) throw new Error(message);
      if (!current(epoch)) return;
      setShares(body.shares);
    } catch { if (current(epoch)) setLoadError(true); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  useEffect(() => {
    let current = true;
    const epoch = scope.current.epoch;
    fetch(`/api/analysis/${analysisId}/review-shares`, { cache: "no-store" })
      .then(readResponse)
      .then((body) => { if (!Array.isArray(body.shares) || !body.shares.every(validShare)) throw new Error(message); if (current && !scope.current.blocked && epoch === scope.current.epoch) setShares(body.shares); })
      .catch(() => { if (current && !scope.current.blocked && epoch === scope.current.epoch) setLoadError(true); });
    return () => { current = false; };
  }, [analysisId, scope]);

  async function create() {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy("create"); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiry, includeAcceptedDraft: includeDraft }) }));
      if (!current(epoch)) return;
      if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token) || !validShare(body.share) || body.share.state !== "active" || body.share.includesAcceptedDraft !== includeDraft) throw new Error(message);
      const share = body.share;
      setUrl(`${window.location.origin}/review/${body.token}`); setCreatedId(share.id);
      setShares((current) => current ? [share, ...current] : current);
      setNotice({ tone: "success", text: "Your private review link is ready. Copy it now: it cannot be recovered after you leave or refresh this page." });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: message }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
  }

  async function revoke(shareId: string) {
    if (locked.current || scope.current.blocked) return;
    locked.current = true; const epoch = scope.current.epoch;
    setBusy(shareId); setNotice(null);
    try {
      const body = await readResponse(await fetch(`/api/analysis/${analysisId}/review-shares`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareId }) }));
      if (!current(epoch)) return;
      if (body.revoked !== true || body.shareId !== shareId) throw new Error(message);
      setShares((current) => current?.map((share) => share.id === shareId ? { ...share, state: "revoked" } : share) ?? null);
      if (shareId === createdId) { setUrl(""); setCreatedId(""); }
      setNotice({ tone: "success", text: "This private review link was revoked. It can no longer be used." });
    } catch { if (current(epoch)) setNotice({ tone: "error", text: message }); }
    finally { if (current(epoch)) { locked.current = false; setBusy(null); } }
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
