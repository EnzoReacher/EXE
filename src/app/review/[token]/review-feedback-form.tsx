"use client";

import { useRef, useState, type FormEvent } from "react";

export default function ReviewFeedbackForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  // A submission ID always travels with the exact payload it was created for.
  // A lost response may mean the owner already received that submission.
  const pendingPayload = useRef<string | null>(null);
  const [retryOriginal, setRetryOriginal] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // React's currentTarget is only available during the synchronous event handler.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage(null);
    try {
      pendingPayload.current ??= JSON.stringify({ reviewerName: form.get("reviewerName"), reviewerRole: form.get("reviewerRole"), feedback: form.get("feedback"), submissionId: crypto.randomUUID() });
      const response = await fetch(`/api/review/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: pendingPayload.current,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Validation rejection happens before persistence, so corrections are safe.
        // Other failures (including a lost response) must retry the original data.
        if (response.status === 400) pendingPayload.current = null;
        throw new Error(body.error || "We could not confirm your feedback submission.");
      }
      formElement.reset();
      pendingPayload.current = null;
      setRetryOriginal(false);
      setMessage({ tone: "success", text: retryOriginal ? "Thank you. Your original feedback was shared with the report owner." : "Thank you. Your feedback was shared with the report owner." });
    } catch (error) {
      setRetryOriginal(pendingPayload.current !== null);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "We could not confirm your feedback submission." });
    } finally { setBusy(false); }
  }

  return <section className="reviewer-feedback" aria-labelledby="reviewer-feedback-heading">
    <h2 id="reviewer-feedback-heading">Leave feedback</h2>
    <p id="reviewer-feedback-help">Your feedback is advice for the owner. Do not include sensitive personal information. You cannot change their CV or report.</p>
    <form onSubmit={submit} aria-describedby={`reviewer-feedback-help${retryOriginal ? " reviewer-feedback-retry-help" : ""}`} aria-busy={busy}>
      <div className="form-fields-row">
        <label className="form-field" htmlFor="reviewer-name">Display name <span className="optional-label">Optional</span><input id="reviewer-name" name="reviewerName" maxLength={120} autoComplete="name" disabled={busy || retryOriginal} /></label>
        <label className="form-field" htmlFor="reviewer-role">Role <span className="optional-label">Optional</span><input id="reviewer-role" name="reviewerRole" maxLength={120} autoComplete="organization-title" disabled={busy || retryOriginal} /></label>
      </div>
      <label className="form-field" htmlFor="reviewer-feedback">Feedback (required)<textarea id="reviewer-feedback" name="feedback" minLength={20} maxLength={4000} rows={7} required disabled={busy || retryOriginal} aria-describedby="reviewer-feedback-length" /></label>
      <p className="field-help" id="reviewer-feedback-length">Use 20–4,000 characters.</p>
      {retryOriginal && <p className="field-help" id="reviewer-feedback-retry-help" role="status">Your feedback may already have reached the owner. Entries are locked to prevent changing a submission that may already be saved. Retry to confirm the original feedback without sending a duplicate.</p>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Submitting feedback…" : retryOriginal ? "Retry original feedback" : "Submit feedback"}</button>
    </form>
    <p className="sr-only" role="status">{busy ? "Submitting feedback. Please wait." : ""}</p>
    {message && <p className={`form-notice ${message.tone === "error" ? "error" : ""}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
  </section>;
}
