/** DETERMINISTIC FAKE PROVIDER FOR TESTS ONLY. Not evidence of real Stripe sandbox execution. */
import { createHash } from "node:crypto";
import type { BillingCatalog, CanonicalBilling, CanonicalSubscription, CheckoutCreate, ProviderCheckout, ProviderCustomer, ResolvedBillingEvent, SandboxBillingProvider, VerifiedBillingEvent } from "./billing-provider";
import { BillingSignatureError } from "./billing-provider";
export const TEST_CATALOG: BillingCatalog = { environment: "sandbox", accountId: "acct_fixture", priceId: "price_fixture", productId: "prod_fixture", amount: 500, currency: "usd", interval: "month", version: "fixture-v1" };
export function paidSubscription(customerId: string, now: number): CanonicalSubscription {
  return { id: "sub_fixture", customerId, environment: "sandbox", createdAtMs: now - 1000, status: "active", priceId: TEST_CATALOG.priceId, productId: TEST_CATALOG.productId, itemCount: 1, quantity: 1, currentPeriodStartMs: now - 1000, currentPeriodEndMs: now + 30 * 86400000, cancelAtPeriodEnd: false, unsupportedTerms: false, invoice: { id: "in_fixture", customerId, subscriptionId: "sub_fixture", status: "paid", currency: "usd", amountPaid: 500, total: 500, amountRemaining: 0, priceId: TEST_CATALOG.priceId, lineCount: 1, periodStartMs: now - 1000, periodEndMs: now + 30 * 86400000, automatic: true, paidAtMs: now - 500, verifiedSuccessfulCharge: true } };
}
export class FakeBillingProvider implements SandboxBillingProvider {
  readonly customers = new Map<string, ProviderCustomer>();
  readonly checkouts = new Map<string, ProviderCheckout>();
  readonly states = new Map<string, CanonicalBilling>();
  readonly customerKeys = new Map<string, string>();
  readonly checkoutKeys = new Map<string, string>();
  readonly portalCalls: { customerId: string; returnUrl: string; key: string }[] = [];
  customerCalls = 0; checkoutCalls = 0; canonicalCalls = 0;
  failCustomerBefore = false; loseCustomerResponse = false; loseCheckoutResponse = false; failCheckoutBefore = false; failCanonical = false;
  beforeCanonical: ((snapshot: CanonicalBilling) => Promise<void>) | null = null;
  beforeCustomer: (() => Promise<void>) | null = null;
  constructor(readonly now: () => number) {}
  async catalog(): Promise<BillingCatalog> { return { ...TEST_CATALOG }; }
  async findCustomers(binding: string): Promise<ProviderCustomer[]> { return [...this.customers.values()].filter(customer => customer.binding === binding).map(value => structuredClone(value)); }
  async createCustomer(binding: string, _logicalId: string, key: string): Promise<ProviderCustomer> {
    this.customerCalls++;
    await this.beforeCustomer?.();
    if (this.failCustomerBefore) throw new Error("Synthetic provider outage");
    const previous = this.customerKeys.get(key);
    if (previous) return structuredClone(this.customers.get(previous)!);
    const customer: ProviderCustomer = { id: `cus_fixture${this.customers.size + 1}`, binding, environment: "sandbox", deleted: false };
    this.customers.set(customer.id, customer); this.customerKeys.set(key, customer.id);
    if (this.loseCustomerResponse) throw new Error("Synthetic lost response after customer effect");
    return structuredClone(customer);
  }
  empty(customerId: string): CanonicalBilling { return { customer: structuredClone(this.customers.get(customerId)!), complete: true, subscriptions: [], risk: { refunded: false, disputed: false, unsupported: false } }; }
  async canonical(customerId: string): Promise<CanonicalBilling> {
    this.canonicalCalls++;
    if (this.failCanonical) throw new Error("Synthetic canonical outage");
    const snapshot = structuredClone(this.states.get(customerId) ?? this.empty(customerId));
    await this.beforeCanonical?.(snapshot);
    return snapshot;
  }
  async findCheckouts(customerId: string, logicalId: string): Promise<ProviderCheckout[]> { return [...this.checkouts.values()].filter(value => value.customerId === customerId && value.logicalId === logicalId).map(value => structuredClone(value)); }
  async createCheckout(input: CheckoutCreate): Promise<ProviderCheckout> {
    this.checkoutCalls++;
    if (this.failCheckoutBefore) throw new Error("Synthetic checkout outage");
    const previous = this.checkoutKeys.get(input.idempotencyKey);
    if (previous) return structuredClone(this.checkouts.get(previous)!);
    const checkout: ProviderCheckout = { id: `cs_fixture${this.checkouts.size + 1}`, customerId: input.customerId, logicalId: input.logicalId, environment: "sandbox", status: "open", subscriptionId: null, expiresAtMs: this.now() + 1800000, url: `https://checkout.stripe.com/c/pay/cs_fixture${this.checkouts.size + 1}` };
    this.checkouts.set(checkout.id, checkout); this.checkoutKeys.set(input.idempotencyKey, checkout.id);
    if (this.loseCheckoutResponse) throw new Error("Synthetic lost checkout response after effect");
    return structuredClone(checkout);
  }
  async retrieveCheckout(customerId: string, id: string): Promise<ProviderCheckout> {
    const checkout = structuredClone(this.checkouts.get(id)!);
    if (!checkout || checkout.customerId !== customerId) throw new Error("Synthetic customer mismatch");
    if (checkout.status === "open" && checkout.expiresAtMs <= this.now()) checkout.status = "expired";
    return checkout;
  }
  async createPortal(customerId: string, returnUrl: string, key: string): Promise<string> {
    this.portalCalls.push({ customerId, returnUrl, key });
    return `https://billing.stripe.com/p/session/${key}`;
  }
  verifyWebhook(raw: Uint8Array, signature: string): VerifiedBillingEvent {
    if (signature !== "fake-valid") throw new BillingSignatureError();
    const value = JSON.parse(new TextDecoder().decode(raw));
    if (value.livemode || value.account && value.account !== TEST_CATALOG.accountId) throw new BillingSignatureError();
    return { id: value.id, type: value.type, payloadHash: createHash("sha256").update(raw).digest("hex"), providerEvent: value };
  }
  async resolveEvent(event: VerifiedBillingEvent): Promise<ResolvedBillingEvent> {
    const value = event.providerEvent as { customerId: string; ignored?: boolean };
    return { id: event.id, type: event.type, payloadHash: event.payloadHash, customerId: value.customerId, ignored: value.ignored ?? false };
  }
}
