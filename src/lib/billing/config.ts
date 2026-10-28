import "server-only";
import { createHash } from "node:crypto";
import { illustrativePrice, type BillingMode } from "./catalog";
// Reviewable acceptance is deliberately unperformed. Keys/flags alone cannot open sales.
export const liveAcceptance = { commercialPrice: false, merchant: false, hostedEntitlements: false, hostedAI: false };
export function billingConfig() {
  const mode: BillingMode = process.env.OWNPATH_BILLING_MODE === "LOCAL_FAKE" ? "LOCAL_FAKE" : process.env.OWNPATH_BILLING_MODE === "LIVE" ? "LIVE" : "OFF";
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4317").origin;
  const fakeOrigin = process.env.OWNPATH_BILLING_FAKE_ORIGIN || "";
  const local = mode === "LOCAL_FAKE" && /^http:\/\/127\.0\.0\.[123]:\d+$/.test(origin) && /^http:\/\/127\.0\.0\.[123]:\d+$/.test(fakeOrigin) && /^http:\/\/127\.0\.0\.[123]:\d+$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const raw = process.env.OWNPATH_PRO_PRICE_VND; const price = mode === "LOCAL_FAKE" && local ? illustrativePrice : raw && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw)>0 && Number(raw)<=1000000000 ? Number(raw) : null;
  const live = mode === "LIVE" && Object.values(liveAcceptance).every(Boolean) && origin.startsWith("https://") && !!price;
  const channel = createHash("sha256").update(mode === "LOCAL_FAKE" ? "fictional-billing-channel" : process.env.PAYOS_CLIENT_ID || "unconfigured").digest("hex");
  const support = process.env.OWNPATH_BILLING_SUPPORT_URL || "";
  return { mode, origin, fakeOrigin, price, channel, enabled: local || live, support: /^(https:\/\/|mailto:)/.test(support) ? support : null, reason: mode === "LOCAL_FAKE" && !local ? "Local billing requires isolated loopback configuration." : "Live checkout awaits price, merchant, hosted entitlement and hosted AI acceptance." };
}
