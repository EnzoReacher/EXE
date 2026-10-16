import "server-only";
import Stripe from "stripe";
import type { BillingStatusResponse, CatalogResponse } from "./contracts";
import type { ServerIdentity } from "./server-identity";
import { freeEntitlement } from "./server-identity";
import { failure } from "./server-errors";

export function unavailableCatalog(): CatalogResponse {
  return { environment: "sandbox", catalogVersion: "sandbox-v1-gated", free: { planId: "free", amount: 0 }, pro: { planId: "pro", availability: "unavailable", reason: "not_configured" } };
}
export function billingStatus(identity: ServerIdentity, quota = 50): BillingStatusResponse {
  const entitlement = freeEntitlement(identity, new Date(), quota);
  return { environment: "sandbox", entitlement, subscription: "none", cancelAtPeriodEnd: false, paidThrough: null, reconciliation: "unavailable", canManageBilling: false, asOf: entitlement.asOf };
}
export function sandboxStripe(env: Readonly<Record<string, string | undefined>> = process.env): { stripe: Stripe; accountId: string; priceId: string; webhookSecret: string } {
  if (!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "") || !/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID ?? "") || !/^price_[A-Za-z0-9]+$/.test(env.STRIPE_PRICE_ID ?? "") || !/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET ?? "")) return failure("BILLING_UNAVAILABLE");
  return { stripe: new Stripe(env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2, timeout: 10000 }), accountId: env.STRIPE_ACCOUNT_ID!, priceId: env.STRIPE_PRICE_ID!, webhookSecret: env.STRIPE_WEBHOOK_SECRET! };
}
/** Real SDK read adapter, not exposed as checkout-ready catalog while lifecycle is gated. */
export async function fetchConfiguredTestPrice(env: Readonly<Record<string, string | undefined>> = process.env): Promise<{ amount: number; currency: "usd"; interval: "month" }> {
  const { stripe, accountId, priceId } = sandboxStripe(env);
  const [account, price] = await Promise.all([stripe.accounts.retrieve(null), stripe.prices.retrieve(priceId, { expand: ["product"] })]);
  if (account.id !== accountId || price.livemode || !price.active || price.type !== "recurring" || price.currency !== "usd" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed" || price.billing_scheme !== "per_unit" || !Number.isSafeInteger(price.unit_amount) || (price.unit_amount ?? 0) <= 0 || typeof price.product === "string" || price.product.deleted || !price.product.active || price.product.livemode) return failure("BILLING_UNAVAILABLE");
  return { amount: price.unit_amount!, currency: "usd", interval: "month" };
}
