import type { BillingStatusResponse, Entitlement } from "./contracts";
import type { BillingCatalog, CanonicalBilling } from "./billing-provider";
import { invariant } from "./billing-provider";

export type BillingProjection = {
  environment: "sandbox"; catalogVersion: string; customerId: string;
  subscription: BillingStatusResponse["subscription"]; subscriptionId: string | null;
  proUntilMs: number | null; cancelAtPeriodEnd: boolean; paidThroughMs: number | null;
  blocksCheckout: boolean; riskBlocked: boolean;
};
export function validateCatalog(catalog: BillingCatalog): void {
  invariant(catalog.environment === "sandbox" && /^acct_[A-Za-z0-9]+$/.test(catalog.accountId) && /^price_[A-Za-z0-9]+$/.test(catalog.priceId) && /^prod_[A-Za-z0-9]+$/.test(catalog.productId));
  invariant(Number.isSafeInteger(catalog.amount) && catalog.amount > 0 && catalog.currency === "usd" && catalog.interval === "month" && typeof catalog.version === "string" && catalog.version.length > 0 && catalog.version.length < 256);
}
/** A checkout event/client redirect is never an input to this decision. */
export function evaluateBilling(canonical: CanonicalBilling, catalog: BillingCatalog, customerId: string, binding: string, now: number): BillingProjection {
  validateCatalog(catalog);
  invariant(canonical.complete === true && canonical.customer.id === customerId && canonical.customer.binding === binding && canonical.customer.environment === "sandbox");
  const base: BillingProjection = { environment: "sandbox", catalogVersion: catalog.version, customerId, subscription: "none", subscriptionId: null, proUntilMs: null, cancelAtPeriodEnd: false, paidThroughMs: null, blocksCheckout: false, riskBlocked: false };
  if (canonical.customer.deleted || canonical.risk.refunded || canonical.risk.disputed || canonical.risk.unsupported) return { ...base, subscription: "blocked", blocksCheckout: true, riskBlocked: true };
  for (const subscription of canonical.subscriptions) invariant(subscription.customerId === customerId && subscription.environment === "sandbox");
  const current = canonical.subscriptions.filter(subscription => !["canceled", "incomplete_expired"].includes(subscription.status));
  if (current.length > 1) return { ...base, subscription: "blocked", blocksCheckout: true, riskBlocked: true };
  const selected = current[0] ?? [...canonical.subscriptions].sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
  if (!selected) return base;
  const result = { ...base, subscriptionId: selected.id, cancelAtPeriodEnd: selected.cancelAtPeriodEnd, blocksCheckout: current.length > 0 };
  if (selected.status === "canceled") return { ...result, subscription: "canceled" };
  if (selected.status === "incomplete_expired") return { ...result, subscription: "expired" };
  if (selected.status !== "active") return { ...result, subscription: selected.status === "trialing" ? "blocked" : selected.status };
  const invoice = selected.invoice;
  const allowed = selected.priceId === catalog.priceId && selected.productId === catalog.productId && selected.itemCount === 1 && selected.quantity === 1 && !selected.unsupportedTerms;
  if (!allowed) return { ...result, subscription: "blocked", riskBlocked: true };
  if (!invoice || invoice.status !== "paid") return { ...result, subscription: "pending" };
  const invoiceAllowed = invoice.customerId === customerId && invoice.subscriptionId === selected.id && invoice.currency === catalog.currency && invoice.amountPaid === catalog.amount && invoice.total === catalog.amount && invoice.amountRemaining === 0 && invoice.priceId === catalog.priceId && invoice.lineCount === 1 && invoice.automatic && invoice.verifiedSuccessfulCharge && invoice.paidAtMs !== null && invoice.paidAtMs <= now + 60000;
  const periods = [selected.currentPeriodStartMs, selected.currentPeriodEndMs, invoice.periodStartMs, invoice.periodEndMs];
  const validPeriod = periods.every(Number.isSafeInteger) && selected.currentPeriodStartMs <= now && invoice.periodStartMs <= now && selected.currentPeriodEndMs > selected.currentPeriodStartMs && invoice.periodEndMs > invoice.periodStartMs && selected.currentPeriodEndMs - selected.currentPeriodStartMs <= 35 * 86400000 && invoice.periodEndMs - invoice.periodStartMs <= 35 * 86400000;
  if (!invoiceAllowed || !validPeriod) return { ...result, subscription: "blocked", riskBlocked: true };
  const paidThroughMs = Math.min(selected.currentPeriodEndMs, invoice.periodEndMs);
  return { ...result, subscription: paidThroughMs > now ? "active" : "expired", paidThroughMs, proUntilMs: paidThroughMs > now ? paidThroughMs : null };
}
export function projectionEntitlement(projection: BillingProjection | null, verified: boolean, version: number, asOfMs: number, current: boolean, now: number, limit = 50): Entitlement {
  const pro = verified && current && projection?.subscription === "active" && projection.proUntilMs !== null && Number.isSafeInteger(projection.proUntilMs) && projection.proUntilMs > now && !projection.riskBlocked;
  return { planId: pro ? "pro" : "free", capabilities: { canSave: pro, canReadSaved: verified, canDeleteSaved: verified, savedSessionLimit: limit }, validUntil: pro ? new Date(projection.proUntilMs!).toISOString() : null, version, asOf: new Date(asOfMs).toISOString() };
}
