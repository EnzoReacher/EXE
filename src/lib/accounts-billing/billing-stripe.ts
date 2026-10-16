import "server-only";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import type { BillingCatalog, CanonicalBilling, CanonicalSubscription, CheckoutCreate, PaidInvoice, ProviderCheckout, ProviderCustomer, ResolvedBillingEvent, SandboxBillingProvider, VerifiedBillingEvent } from "./billing-provider";
import { approvedHostedUrl, BillingSignatureError, invariant } from "./billing-provider";

type StripeConfig = { secretKey: string; webhookSecret: string; accountId: string; priceId: string };
const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const idOf = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id ?? null;
async function all<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) { values.push(value); invariant(values.length <= 1000); }
  return values;
}
/** Stripe 23 stable generated schema: item periods, Invoice.parent, InvoicePayment and PaymentIntent. */
export class StripeSandboxProvider implements SandboxBillingProvider {
  private readonly stripe: Stripe;
  constructor(private readonly config: StripeConfig, client?: Stripe) {
    invariant(/^sk_test_[A-Za-z0-9]+$/.test(config.secretKey) && /^whsec_[A-Za-z0-9]+$/.test(config.webhookSecret) && /^acct_[A-Za-z0-9]+$/.test(config.accountId) && /^price_[A-Za-z0-9]+$/.test(config.priceId));
    // Use the installed SDK's stable default API version; never fabricate a version string.
    this.stripe = client ?? new Stripe(config.secretKey, { timeout: 10000, maxNetworkRetries: 1 });
  }
  async catalog(): Promise<BillingCatalog> {
    const [account, price] = await Promise.all([this.stripe.accounts.retrieve(null), this.stripe.prices.retrieve(this.config.priceId, { expand: ["product"] })]);
    invariant(account.id === this.config.accountId && !price.livemode && price.active && price.type === "recurring" && price.currency === "usd" && price.recurring?.interval === "month" && price.recurring.interval_count === 1 && price.recurring.usage_type === "licensed" && price.billing_scheme === "per_unit" && Number.isSafeInteger(price.unit_amount) && price.unit_amount! > 0 && typeof price.product !== "string" && !price.product.deleted && price.product.active && !price.product.livemode);
    const productId = price.product.id;
    return { environment: "sandbox", accountId: account.id, priceId: price.id, productId, amount: price.unit_amount!, currency: "usd", interval: "month", version: digest(`${account.id}:${price.id}:${productId}:${price.unit_amount}:usd:month`) };
  }
  private customer(value: Stripe.Customer): ProviderCustomer {
    invariant(!value.livemode && typeof value.metadata.ownpath_binding === "string");
    return { id: value.id, binding: value.metadata.ownpath_binding, environment: "sandbox", deleted: false };
  }
  async findCustomers(binding: string): Promise<ProviderCustomer[]> {
    await this.catalog();
    // Strong listing rather than eventually consistent Search for uncertain side-effect recovery.
    return (await all(this.stripe.customers.list({ limit: 100 }))).filter(value => value.metadata.ownpath_binding === binding).map(value => this.customer(value));
  }
  async createCustomer(binding: string, logicalId: string, idempotencyKey: string): Promise<ProviderCustomer> {
    await this.catalog();
    return this.customer(await this.stripe.customers.create({ metadata: { ownpath_binding: binding, ownpath_operation: logicalId } }, { idempotencyKey }));
  }
  private async invoice(value: string | Stripe.Invoice | null, customerId: string): Promise<PaidInvoice | null> {
    if (!value) return null;
    const invoice = typeof value === "string" ? await this.stripe.invoices.retrieve(value) : value;
    invariant(!invoice.livemode && idOf(invoice.customer) === customerId);
    const lines = await all(this.stripe.invoices.listLineItems(invoice.id, { limit: 100 }));
    const payments = await all(this.stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 }));
    let verifiedSuccessfulCharge = false;
    if (payments.length === 1) {
      const payment = payments[0];
      const paymentIntentId = idOf(payment.payment.payment_intent);
      if (!payment.livemode && payment.status === "paid" && idOf(payment.invoice) === invoice.id && payment.currency === invoice.currency && payment.amount_paid === invoice.amount_paid && payment.payment.type === "payment_intent" && paymentIntentId) {
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId = idOf(intent.latest_charge);
        if (!intent.livemode && idOf(intent.customer) === customerId && intent.status === "succeeded" && intent.amount_received === invoice.amount_paid && chargeId) {
          const charge = await this.stripe.charges.retrieve(chargeId);
          verifiedSuccessfulCharge = !charge.livemode && idOf(charge.customer) === customerId && idOf(charge.payment_intent) === intent.id && charge.status === "succeeded" && charge.paid && charge.captured && charge.amount_captured === invoice.amount_paid && charge.amount_refunded === 0 && !charge.refunded && !charge.disputed;
        }
      }
    }
    const line = lines[0];
    return { id: invoice.id, customerId, subscriptionId: idOf(invoice.parent?.subscription_details?.subscription) ?? "", status: invoice.status, currency: invoice.currency, amountPaid: invoice.amount_paid, total: invoice.total, amountRemaining: invoice.amount_remaining, priceId: idOf(line?.pricing?.price_details?.price), lineCount: lines.length, periodStartMs: (line?.period.start ?? 0) * 1000, periodEndMs: (line?.period.end ?? 0) * 1000, automatic: invoice.collection_method === "charge_automatically" && invoice.discounts.length === 0 && line?.parent?.type === "subscription_item_details" && line.parent.subscription_item_details?.proration === false, paidAtMs: invoice.status_transitions.paid_at === null ? null : invoice.status_transitions.paid_at * 1000, verifiedSuccessfulCharge };
  }
  async canonical(customerId: string): Promise<CanonicalBilling> {
    await this.catalog();
    const [customer, subscriptions, charges] = await Promise.all([this.stripe.customers.retrieve(customerId), all(this.stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })), all(this.stripe.charges.list({ customer: customerId, limit: 100 }))]);
    invariant(!customer.deleted);
    const parsed: CanonicalSubscription[] = [];
    for (const subscription of subscriptions) {
      invariant(!subscription.livemode && idOf(subscription.customer) === customerId);
      invariant(["active", "canceled", "incomplete", "incomplete_expired", "past_due", "paused", "trialing", "unpaid"].includes(subscription.status));
      const item = subscription.items.data[0];
      parsed.push({ id: subscription.id, customerId, environment: "sandbox", createdAtMs: subscription.created * 1000, status: subscription.status as CanonicalSubscription["status"], priceId: item?.price.id ?? null, productId: idOf(item?.price.product), itemCount: subscription.items.has_more ? 2 : subscription.items.data.length, quantity: item?.quantity ?? 0, currentPeriodStartMs: (item?.current_period_start ?? 0) * 1000, currentPeriodEndMs: (item?.current_period_end ?? 0) * 1000, cancelAtPeriodEnd: subscription.cancel_at_period_end, unsupportedTerms: subscription.trial_end !== null || subscription.discounts.length > 0 || subscription.pause_collection !== null || Boolean(item?.price.livemode), invoice: await this.invoice(subscription.latest_invoice, customerId) });
    }
    let refunded = false;
    let disputed = false;
    for (const charge of charges) {
      invariant(!charge.livemode && idOf(charge.customer) === customerId);
      const refunds = await all(this.stripe.refunds.list({ charge: charge.id, limit: 100 }));
      const disputes = await all(this.stripe.disputes.list({ charge: charge.id, limit: 100 }));
      refunded ||= charge.amount_refunded > 0 || charge.refunded || refunds.some(refund => !["failed", "canceled"].includes(refund.status ?? "unknown"));
      disputed ||= charge.disputed || disputes.length > 0;
    }
    return { customer: this.customer(customer), complete: true, subscriptions: parsed, risk: { refunded, disputed, unsupported: false } };
  }
  private async checkout(value: Stripe.Checkout.Session, customerId: string): Promise<ProviderCheckout> {
    invariant(!value.livemode && value.mode === "subscription" && idOf(value.customer) === customerId && value.client_reference_id === value.metadata?.ownpath_operation && typeof value.metadata?.ownpath_operation === "string" && value.status !== null && ["open", "complete", "expired"].includes(value.status));
    const catalog = await this.catalog();
    const lines = await all(this.stripe.checkout.sessions.listLineItems(value.id, { limit: 100 }));
    invariant(lines.length === 1 && lines[0].price?.id === catalog.priceId && idOf(lines[0].price?.product) === catalog.productId && lines[0].quantity === 1);
    return { id: value.id, customerId, logicalId: value.metadata!.ownpath_operation, environment: "sandbox", status: value.status as ProviderCheckout["status"], subscriptionId: idOf(value.subscription), expiresAtMs: value.expires_at * 1000, url: value.url ? approvedHostedUrl(value.url, "checkout") : null };
  }
  async findCheckouts(customerId: string, logicalId: string): Promise<ProviderCheckout[]> {
    const sessions = await all(this.stripe.checkout.sessions.list({ customer: customerId, limit: 100 }));
    return Promise.all(sessions.filter(value => value.metadata?.ownpath_operation === logicalId).map(value => this.checkout(value, customerId)));
  }
  async createCheckout(input: CheckoutCreate): Promise<ProviderCheckout> {
    const catalog = await this.catalog();
    const session = await this.stripe.checkout.sessions.create({ customer: input.customerId, mode: "subscription", line_items: [{ price: catalog.priceId, quantity: 1 }], allow_promotion_codes: false, allowed_payment_method_types: ["card"], client_reference_id: input.logicalId, metadata: { ownpath_operation: input.logicalId }, subscription_data: { metadata: { ownpath_operation: input.logicalId } }, success_url: input.successUrl, cancel_url: input.cancelUrl, expires_at: Math.floor(Date.now() / 1000) + 1800 }, { idempotencyKey: input.idempotencyKey });
    return this.checkout(session, input.customerId);
  }
  async retrieveCheckout(customerId: string, checkoutId: string): Promise<ProviderCheckout> { return this.checkout(await this.stripe.checkout.sessions.retrieve(checkoutId), customerId); }
  async createPortal(customerId: string, returnUrl: string, idempotencyKey: string): Promise<string> {
    await this.catalog();
    const session = await this.stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl }, { idempotencyKey });
    return approvedHostedUrl(session.url, "portal");
  }
  verifyWebhook(raw: Uint8Array, signature: string): VerifiedBillingEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(Buffer.from(raw), signature, this.config.webhookSecret);
      if (event.livemode || (event.account && event.account !== this.config.accountId)) throw new BillingSignatureError();
      return { id: event.id, type: event.type, payloadHash: digest(raw), providerEvent: event };
    } catch { throw new BillingSignatureError(); }
  }
  async resolveEvent(verified: VerifiedBillingEvent): Promise<ResolvedBillingEvent> {
    await this.catalog();
    // Direct-account events omit account. Retrieving by this account's test key verifies membership;
    // a wrongly paired webhook secret must not route another account's event into this projection.
    const event = await this.stripe.events.retrieve(verified.id);
    invariant(event.id === verified.id && event.type === verified.type && !event.livemode && (!event.account || event.account === this.config.accountId));
    const supported = /^(customer\.subscription\.|invoice\.(paid|payment_failed|payment_action_required|voided|marked_uncollectible)$|checkout\.session\.(completed|expired|async_payment_succeeded|async_payment_failed)$|charge\.(refunded|dispute\.)|refund\.(created|updated|failed)$)/.test(event.type);
    if (!supported) return { id: verified.id, type: verified.type, payloadHash: verified.payloadHash, customerId: null, ignored: true };
    const object = event.data.object as unknown as { customer?: string | { id: string }; charge?: string | { id: string } | null; payment_intent?: string | { id: string } | null };
    let customerId = idOf(object.customer);
    if (!customerId && idOf(object.charge)) customerId = idOf((await this.stripe.charges.retrieve(idOf(object.charge)!)).customer);
    if (!customerId && idOf(object.payment_intent)) customerId = idOf((await this.stripe.paymentIntents.retrieve(idOf(object.payment_intent)!)).customer);
    invariant(customerId && /^cus_[A-Za-z0-9]+$/.test(customerId));
    return { id: verified.id, type: verified.type, payloadHash: verified.payloadHash, customerId, ignored: false };
  }
}
