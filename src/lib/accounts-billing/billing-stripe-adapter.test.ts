import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("server-only", () => ({}));
import { StripeSandboxProvider } from "./billing-stripe";
import { evaluateBilling } from "./billing-policy";

// SDK-shaped responses through the REAL adapter. No Stripe network execution.
function fixture() {
  const now = Math.floor(Date.now() / 1000);
  const config = { secretKey: "sk_test_synthetic", webhookSecret: "whsec_synthetic", accountId: "acct_synthetic", priceId: "price_synthetic" };
  const product = { id: "prod_synthetic", active: true, livemode: false };
  const price = { id: config.priceId, product, active: true, livemode: false, type: "recurring", currency: "usd", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" }, billing_scheme: "per_unit", unit_amount: 500 };
  const customer = { id: "cus_synthetic", livemode: false, metadata: { ownpath_binding: "binding" } };
  const line = { pricing: { price_details: { price: price.id } }, period: { start: now - 10, end: now + 2592000 }, parent: { type: "subscription_item_details", subscription_item_details: { proration: false } } };
  const invoice = { id: "in_synthetic", livemode: false, customer: customer.id, parent: { subscription_details: { subscription: "sub_synthetic" } }, status: "paid", currency: "usd", amount_paid: 500, total: 500, amount_remaining: 0, collection_method: "charge_automatically", discounts: [], status_transitions: { paid_at: now - 5 } };
  const payment = { livemode: false, invoice: invoice.id, currency: "usd", status: "paid", amount_paid: 500, payment: { type: "payment_intent", payment_intent: "pi_synthetic" } };
  const intent = { id: "pi_synthetic", livemode: false, customer: customer.id, status: "succeeded", amount_received: 500, latest_charge: "ch_synthetic" };
  const charge = { id: "ch_synthetic", livemode: false, customer: customer.id, payment_intent: intent.id, status: "succeeded", paid: true, captured: true, amount_captured: 500, amount_refunded: 0, refunded: false, disputed: false };
  const subscription = { id: "sub_synthetic", livemode: false, customer: customer.id, created: now - 10, status: "active", items: { has_more: false, data: [{ price, quantity: 1, current_period_start: now - 10, current_period_end: now + 2592000 }] }, cancel_at_period_end: false, trial_end: null, discounts: [], pause_collection: null, latest_invoice: invoice.id };
  const checkout = { id: "cs_synthetic", livemode: false, mode: "subscription", customer: customer.id, client_reference_id: "logical", metadata: { ownpath_operation: "logical" }, status: "open", expires_at: now + 1800, url: "https://checkout.stripe.com/c/pay/cs_synthetic", subscription: null as string | null };
  const lines = [line]; const payments = [payment];
  const refunds: { status: string }[] = []; const disputes: { id: string }[] = [];
  // Yield separate pages to prove the adapter consumes the entire SDK iterator.
  const paged = <T,>(values: T[]) => ({ async *[Symbol.asyncIterator]() { for (const value of values) yield structuredClone(value); } });
  const client = {
    accounts: { retrieve: vi.fn(async () => ({ id: config.accountId })) },
    prices: { retrieve: vi.fn(async () => price) },
    customers: { retrieve: vi.fn(async () => customer), list: vi.fn(() => paged([customer])), create: vi.fn(async () => customer) },
    subscriptions: { list: vi.fn(() => paged([subscription])) },
    invoices: { retrieve: vi.fn(async () => invoice), listLineItems: vi.fn(() => paged(lines)) },
    invoicePayments: { list: vi.fn(() => paged(payments)) },
    paymentIntents: { retrieve: vi.fn(async () => intent) },
    charges: { retrieve: vi.fn(async () => charge), list: vi.fn(() => paged([charge])) },
    refunds: { list: vi.fn(() => paged(refunds)) }, disputes: { list: vi.fn(() => paged(disputes)) },
    checkout: { sessions: { create: vi.fn(async () => checkout), retrieve: vi.fn(async () => checkout), list: vi.fn(() => paged([checkout])), listLineItems: vi.fn(() => paged([{ price, quantity: 1 }])) } },
    billingPortal: { sessions: { create: vi.fn(async () => ({ url: "https://billing.stripe.com/p/session/synthetic" })) } },
    events: { retrieve: vi.fn(async () => ({ id: "evt_synthetic", type: "charge.dispute.created", livemode: false, data: { object: { charge: charge.id } } })) },
  };
  const adapter = new StripeSandboxProvider(config, client as unknown as Stripe);
  return { adapter, client, config, now, customer, price, subscription, invoice, lines, payments, intent, charge, refunds, disputes, checkout };
}

describe("real Stripe23 adapter with deterministic SDK responses", () => {
  it("derives Pro from item periods, Invoice.parent and a verified InvoicePayment/intent/charge chain", async () => {
    const f = fixture(); const catalog = await f.adapter.catalog();
    const canonical = await f.adapter.canonical(f.customer.id);
    expect(evaluateBilling(canonical, catalog, f.customer.id, "binding", f.now * 1000)).toMatchObject({ subscription: "active", proUntilMs: (f.now + 2592000) * 1000 });
    expect(f.client.invoicePayments.list).toHaveBeenCalledWith({ invoice: f.invoice.id, status: "paid", limit: 100 });
    expect(f.client.paymentIntents.retrieve).toHaveBeenCalledWith("pi_synthetic");
    expect(f.client.charges.retrieve).toHaveBeenCalledWith("ch_synthetic");
  });
  it("rejects wrong customer evidence and mismatched subscription/price/payment authority", async () => {
    for (const field of ["customer", "subscription", "price", "intent", "charge"] as const) {
      const f = fixture(); const catalog = await f.adapter.catalog();
      if (field === "customer") f.invoice.customer = "cus_other";
      if (field === "subscription") f.invoice.parent.subscription_details.subscription = "sub_other";
      if (field === "price") f.lines[0].pricing.price_details.price = "price_other";
      if (field === "intent") f.intent.status = "requires_action";
      if (field === "charge") f.charge.customer = "cus_other";
      if (field === "customer" || field === "charge") await expect(f.adapter.canonical(f.customer.id)).rejects.toThrow();
      else expect(evaluateBilling(await f.adapter.canonical(f.customer.id), catalog, f.customer.id, "binding", f.now * 1000).proUntilMs).toBeNull();
    }
  });
  it("consumes all line/payment/refund/dispute iterator entries and fails conservatively", async () => {
    for (const collection of ["lines", "payments", "refunds", "disputes"] as const) {
      const f = fixture(); const catalog = await f.adapter.catalog();
      if (collection === "lines") f.lines.push(structuredClone(f.lines[0]));
      if (collection === "payments") f.payments.push(structuredClone(f.payments[0]));
      if (collection === "refunds") f.refunds.push({ status: "failed" }, { status: "succeeded" });
      if (collection === "disputes") f.disputes.push({ id: "dp_laterpage" });
      expect(evaluateBilling(await f.adapter.canonical(f.customer.id), catalog, f.customer.id, "binding", f.now * 1000).proUntilMs).toBeNull();
    }
  });
  it("blocks partially refunded/disputed charge evidence even without a risk-list result", async () => {
    for (const field of ["amount_refunded", "disputed"] as const) {
      const f = fixture(); const catalog = await f.adapter.catalog();
      if (field === "amount_refunded") f.charge.amount_refunded = 100; else f.charge.disputed = true;
      expect(evaluateBilling(await f.adapter.canonical(f.customer.id), catalog, f.customer.id, "binding", f.now * 1000).proUntilMs).toBeNull();
    }
  });
  it("resolves signed refund/dispute customer references with the configured account's event lookup", async () => {
    const f = fixture();
    expect(await f.adapter.resolveEvent({ id: "evt_synthetic", type: "charge.dispute.created", payloadHash: "digest", providerEvent: {} })).toMatchObject({ customerId: f.customer.id, ignored: false });
    expect(f.client.charges.retrieve).toHaveBeenCalledWith("ch_synthetic");
    f.client.events.retrieve.mockResolvedValueOnce({ id: "evt_synthetic", type: "refund.created", livemode: false, data: { object: { charge: "ch_synthetic" } } });
    expect(await f.adapter.resolveEvent({ id: "evt_synthetic", type: "refund.created", payloadHash: "digest", providerEvent: {} })).toMatchObject({ customerId: f.customer.id, ignored: false });
  });
  it("creates, retrieves and recovers a fixed-price checkout with stable provider keys and owned portal", async () => {
    const f = fixture();
    const input = { customerId: f.customer.id, logicalId: "logical", idempotencyKey: "stable-key", successUrl: "http://127.0.0.1:3000/checkout/return", cancelUrl: "http://127.0.0.1:3000/checkout/cancel" };
    const created = await f.adapter.createCheckout(input);
    expect(f.client.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: f.customer.id, mode: "subscription", line_items: [{ price: f.price.id, quantity: 1 }], allow_promotion_codes: false, allowed_payment_method_types: ["card"], success_url: input.successUrl, cancel_url: input.cancelUrl }), { idempotencyKey: input.idempotencyKey });
    expect(await f.adapter.findCheckouts(f.customer.id, "logical")).toEqual([created]);
    f.checkout.status = "complete"; f.checkout.subscription = "sub_synthetic";
    expect(await f.adapter.retrieveCheckout(f.customer.id, created.id)).toMatchObject({ status: "complete", subscriptionId: "sub_synthetic" });
    await f.adapter.createPortal(f.customer.id, input.successUrl, "portal-key");
    expect(f.client.billingPortal.sessions.create).toHaveBeenCalledWith({ customer: f.customer.id, return_url: input.successUrl }, { idempotencyKey: "portal-key" });
  });
});
