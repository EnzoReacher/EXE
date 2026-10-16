/** Internal server/provider boundary. These are NOT browser DTOs or Firestore client-writable data. */
export type BillingCatalog = {
  environment: "sandbox"; accountId: string; priceId: string; productId: string;
  amount: number; currency: "usd"; interval: "month"; version: string;
};
export type ProviderCustomer = { id: string; binding: string; environment: "sandbox"; deleted: boolean };
export type ProviderCheckout = {
  id: string; customerId: string; logicalId: string; environment: "sandbox";
  status: "open" | "complete" | "expired"; url: string | null; expiresAtMs: number;
  subscriptionId: string | null;
};
export type PaidInvoice = {
  id: string; customerId: string; subscriptionId: string; status: string | null;
  currency: string; amountPaid: number; total: number; amountRemaining: number;
  priceId: string | null; lineCount: number; periodStartMs: number; periodEndMs: number;
  automatic: boolean; paidAtMs: number | null; verifiedSuccessfulCharge: boolean;
};
export type CanonicalSubscription = {
  id: string; customerId: string; environment: "sandbox"; createdAtMs: number;
  status: "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "paused" | "trialing" | "unpaid";
  priceId: string | null; productId: string | null; itemCount: number; quantity: number;
  currentPeriodStartMs: number; currentPeriodEndMs: number; cancelAtPeriodEnd: boolean;
  unsupportedTerms: boolean; invoice: PaidInvoice | null;
};
export type CanonicalBilling = {
  customer: ProviderCustomer; complete: true; subscriptions: CanonicalSubscription[];
  /** Deliberately conservative: any historical refund/dispute blocks until a separately reviewed risk policy. */
  risk: { refunded: boolean; disputed: boolean; unsupported: boolean };
};
export type VerifiedBillingEvent = { id: string; type: string; payloadHash: string; providerEvent: unknown };
export type ResolvedBillingEvent = { id: string; type: string; payloadHash: string; customerId: string | null; ignored: boolean };
export type CheckoutCreate = { customerId: string; logicalId: string; idempotencyKey: string; successUrl: string; cancelUrl: string };
export interface SandboxBillingProvider {
  catalog(): Promise<BillingCatalog>;
  findCustomers(binding: string): Promise<ProviderCustomer[]>;
  createCustomer(binding: string, logicalId: string, idempotencyKey: string): Promise<ProviderCustomer>;
  canonical(customerId: string): Promise<CanonicalBilling>;
  findCheckouts(customerId: string, logicalId: string): Promise<ProviderCheckout[]>;
  createCheckout(input: CheckoutCreate): Promise<ProviderCheckout>;
  retrieveCheckout(customerId: string, checkoutId: string): Promise<ProviderCheckout>;
  createPortal(customerId: string, returnUrl: string, idempotencyKey: string): Promise<string>;
  verifyWebhook(raw: Uint8Array, signature: string): VerifiedBillingEvent;
  /** Confirms event membership in the configured test account and resolves refund/dispute charge references. */
  resolveEvent(event: VerifiedBillingEvent): Promise<ResolvedBillingEvent>;
}
export class BillingInvariantError extends Error {
  constructor() { super("The sandbox provider state could not be verified."); }
}
export class BillingSignatureError extends Error {
  constructor() { super("The webhook could not be verified."); }
}
export function invariant(condition: unknown): asserts condition { if (!condition) throw new BillingInvariantError(); }
export function approvedHostedUrl(value: string, kind: "checkout" | "portal"): string {
  const url = new URL(value);
  invariant(url.protocol === "https:" && !url.username && !url.password && !url.port && url.hostname === (kind === "checkout" ? "checkout.stripe.com" : "billing.stripe.com"));
  return url.href;
}
