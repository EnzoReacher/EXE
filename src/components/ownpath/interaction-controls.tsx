"use client";
import { useLinkStatus } from "next/link";

export function Spinner() { return <span className="op-spinner" aria-hidden="true" />; }
export function PendingLabel({ pending, reserve, children }: { pending: boolean; reserve: string; children: string }) {
  return <span className="op-button-label"><span className="op-button-reserve" aria-hidden="true"><Spinner />{reserve}</span><span className="op-button-live">{pending && <Spinner />}{children}</span></span>;
}
export function LinkFeedback() {
  const { pending } = useLinkStatus();
  return <span className={`op-link-feedback${pending ? " is-pending" : ""}`} aria-hidden="true"><Spinner /></span>;
}
