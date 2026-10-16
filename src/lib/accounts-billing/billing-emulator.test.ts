import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
vi.mock("server-only", () => ({}));
import { adminServices } from "./admin";
import { bootstrapProfile } from "./server-identity";
import type { ServerIdentity } from "./server-identity";
import { SavedSessionRepository } from "./server-sessions";
import { prepareSession } from "../experience-translator/engine";
import { BillingService } from "./billing-service";
import { FakeBillingProvider, paidSubscription, TEST_CATALOG } from "./billing-test-fixtures";

/** Real Firestore transactions + explicitly FAKE provider, NOT real Stripe sandbox acceptance. */
describe.skipIf(process.env.OWNPATH_EMULATOR_ACCEPTANCE !== "1")("billing: actual Firestore / deterministic fake provider", () => {
  let db: Firestore;
  let identity: ServerIdentity;
  let provider: FakeBillingProvider;
  let service: BillingService;
  let now: number;
  const options = () => ({ projectId: process.env.OWNPATH_FIREBASE_PROJECT_ID!, origin: process.env.OWNPATH_APP_ORIGIN!, quotaLimit: 2, leaseMs: 1000, freshnessMs: 300000 });
  const event = (customerId: string, id = `evt_${randomUUID().replaceAll("-", "")}`, type = "invoice.paid") => ({ id, raw: Buffer.from(JSON.stringify({ id, type, customerId, livemode: false, account: TEST_CATALOG.accountId })) });
  async function receive(customerId: string, id?: string, type?: string) {
    const payload = event(customerId, id, type);
    await service.receiveWebhook(payload.raw, "fake-valid"); return payload;
  }
  async function active() {
    const customerId = await service.ensureCustomer(identity);
    provider.states.set(customerId, { ...provider.empty(customerId), subscriptions: [paidSubscription(customerId, now)] });
    await service.reconcile(identity.uid); return customerId;
  }
  beforeEach(async () => {
    const admin = adminServices(); db = admin.db;
    expect(admin.config.projectId).toMatch(/^demo-ownpath-/);
    const uid = `billing-fixture-${randomUUID()}`;
    await admin.auth.createUser({ uid, email: `${uid}@example.test`, emailVerified: true });
    identity = { uid, email: `${uid}@example.test`, emailVerified: true, authTime: Math.floor(Date.now() / 1000) };
    await bootstrapProfile(db, identity);
    now = Date.now(); provider = new FakeBillingProvider(() => now);
    service = new BillingService(db, provider, TEST_CATALOG, options(), () => now);
  }, 30000);
  afterEach(async () => {
    vi.restoreAllMocks();
    if (!identity) return;
    for (const customer of provider.customers.values()) await db.collection("billingCustomers").doc(customer.id).delete();
    for (const collection of ["checkoutOperations", "billingPortalOperations", "billingEvents"]) {
      const records = await db.collection(collection).where("uid", "==", identity.uid).get();
      for (const record of records.docs) await record.ref.delete();
    }
    await db.collection("billingAccounts").doc(identity.uid).delete();
    await db.recursiveDelete(db.collection("users").doc(identity.uid));
    await adminServices().auth.deleteUser(identity.uid);
  }, 30000);
  it("reserves one customer and one pending checkout across tabs/operation keys", async () => {
    let release!: () => void;
    let started = false;
    provider.beforeCustomer = async () => { started = true; await new Promise<void>(resolve => { release = resolve; }); };
    const first = service.ensureCustomer(identity);
    await vi.waitFor(() => expect(started).toBe(true));
    await expect(service.ensureCustomer(identity)).rejects.toMatchObject({ code: "OPERATION_PENDING" });
    release(); const customerId = await first;
    provider.beforeCustomer = null;
    expect(await service.ensureCustomer(identity)).toBe(customerId);
    expect(provider.customerCalls).toBe(1);
    const one = await service.checkout(identity, { planId: "pro", operationId: randomUUID() });
    const two = await service.checkout(identity, { planId: "pro", operationId: randomUUID() });
    expect(two.checkoutUrl).toBe(one.checkoutUrl);
    expect(provider.checkoutCalls).toBe(1);
    expect((await service.status(identity)).subscription).toBe("pending");
    expect((await service.entitlement(identity)).planId).toBe("free");
  }, 30000);
  it("recovers customer and checkout effects after lost responses without new provider operations", async () => {
    provider.loseCustomerResponse = true;
    await expect(service.ensureCustomer(identity)).rejects.toThrow("Synthetic lost response");
    provider.loseCustomerResponse = false;
    const customerId = await service.ensureCustomer(identity);
    expect(provider.customerCalls).toBe(1);
    provider.loseCheckoutResponse = true;
    const input = { planId: "pro" as const, operationId: randomUUID() };
    await expect(service.checkout(identity, input)).rejects.toThrow("Synthetic lost checkout");
    provider.loseCheckoutResponse = false;
    const recovered = await service.checkout(identity, input);
    expect(recovered.checkoutUrl).toContain("checkout.stripe.com");
    expect(provider.checkoutCalls).toBe(1);
    expect((await service.checkout(identity, { ...input, operationId: randomUUID() })).checkoutUrl).toBe(recovered.checkoutUrl);
    expect(provider.customers.size).toBe(1);
    expect(customerId).toBe([...provider.customers.keys()][0]);
  }, 30000);
  it.each([false, true])("retires completed checkout and permits resubscription; past paid-through=%s", async (pastPaidThrough) => {
    const input = { planId: "pro" as const, operationId: randomUUID() };
    await service.checkout(identity, input);
    const customerId = [...provider.customers.keys()][0];
    const checkout = [...provider.checkouts.values()][0];
    checkout.status = "complete";
    // Completion alone remains uncertain until the matching subscription is canonical.
    await expect(service.checkout(identity, { ...input, operationId: randomUUID() })).rejects.toMatchObject({ code: "OPERATION_PENDING" });
    checkout.subscriptionId = "sub_fixture";
    provider.states.set(customerId, { ...provider.empty(customerId), subscriptions: [paidSubscription(customerId, now)] });
    await service.reconcile(identity.uid);
    if (pastPaidThrough) now += 31 * 86400000;
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    await service.reconcile(identity.uid);
    await expect(service.checkout(identity, input)).rejects.toMatchObject({ code: "OPERATION_CONFLICT" });
    const fresh = await service.checkout(identity, { ...input, operationId: randomUUID() });
    expect(fresh.checkoutUrl).not.toBe(checkout.url);
    expect(provider.checkoutCalls).toBe(2);
  }, 30000);
  it("never reissues uncertain customer creation beyond provider idempotency retention", async () => {
    provider.failCustomerBefore = true;
    await expect(service.ensureCustomer(identity)).rejects.toThrow("Synthetic provider outage");
    now += 25 * 3600000; provider.failCustomerBefore = false;
    await expect(service.ensureCustomer(identity)).rejects.toMatchObject({ code: "OPERATION_PENDING" });
    expect(provider.customerCalls).toBe(1); expect(provider.customers.size).toBe(0);
  }, 30000);
  it("never reissues an uncertain checkout beyond retention even with a different browser key", async () => {
    await service.ensureCustomer(identity); provider.failCheckoutBefore = true;
    await expect(service.checkout(identity, { planId: "pro", operationId: randomUUID() })).rejects.toThrow("Synthetic checkout outage");
    now += 25 * 3600000; provider.failCheckoutBefore = false;
    await expect(service.checkout(identity, { planId: "pro", operationId: randomUUID() })).rejects.toMatchObject({ code: "OPERATION_PENDING" });
    expect(provider.checkoutCalls).toBe(1); expect(provider.checkouts.size).toBe(0);
  }, 30000);
  it("receipts checkout completion without granting Pro; grants only canonical paid authority and consistent quota", async () => {
    const customerId = await service.ensureCustomer(identity);
    const completed = await receive(customerId, undefined, "checkout.session.completed");
    await service.processEvent(completed.id);
    expect((await service.entitlement(identity)).planId).toBe("free");
    provider.states.set(customerId, { ...provider.empty(customerId), subscriptions: [paidSubscription(customerId, now)] });
    const paid = await receive(customerId);
    await service.processEvent(paid.id);
    const status = await service.status(identity);
    expect(status.entitlement.capabilities).toEqual({ canSave: true, canReadSaved: true, canDeleteSaved: true, savedSessionLimit: 2 });
    const repository = new SavedSessionRepository(db, service.authorizeWrite, () => now, service.readQuota);
    const intake = { project: "I built product listing and search using React. The demo is working.", jd: "Frontend Developer Intern requirements: React, JavaScript and HTML and CSS." };
    const save = () => ({ title: "Explicit fixture save", operationId: randomUUID(), snapshot: { schemaVersion: 1 as const, intake, answers: {}, prepared: prepareSession(intake), candidates: [] } });
    const one = await repository.create(identity, save()); await repository.create(identity, save());
    await expect(repository.create(identity, save())).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect((await repository.list(identity, {})).quota).toEqual({ used: 2, limit: 2 });
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    await service.reconcile(identity.uid);
    expect((await service.entitlement(identity)).capabilities).toMatchObject({ canSave: false, canReadSaved: true, savedSessionLimit: 2 });
    await expect(repository.create(identity, save())).rejects.toMatchObject({ code: "PRO_REQUIRED" });
    expect((await repository.list(identity, {})).quota).toEqual({ used: 2, limit: 2 });
    await repository.delete(identity, one.session.id, { operationId: randomUUID(), expectedRevision: 1 });
  }, 30000);
  it("deduplicates a lost durable receipt response and retries canonical outages durably", async () => {
    const customerId = await active();
    const payload = event(customerId);
    const original = db.runTransaction.bind(db);
    vi.spyOn(db, "runTransaction").mockImplementationOnce(async work => { await original(work); throw new Error("Injected lost Firestore commit response"); });
    await expect(service.receiveWebhook(payload.raw, "fake-valid")).rejects.toThrow("Injected lost Firestore");
    await service.receiveWebhook(payload.raw, "fake-valid");
    expect((await db.collection("billingAccounts").doc(identity.uid).get()).data()?.dirty).toBe(1);
    provider.failCanonical = true;
    await expect(service.processEvent(payload.id)).rejects.toThrow("Synthetic canonical outage");
    expect((await service.entitlement(identity)).planId).toBe("free");
    const stored = (await db.collection("billingEvents").doc(payload.id).get()).data()!;
    expect(stored).toMatchObject({ state: "pending", attempts: 1, failureCode: "reconciliation_unavailable" });
    expect(stored).not.toHaveProperty("providerEvent");
    expect(stored.nextAttemptAtMs).toBe(now + 2000);
    provider.failCanonical = false;
    expect(await service.retryPending(1)).toEqual({ completed: 0, failed: 0 });
    now += 2000;
    expect(await service.retryPending()).toEqual({ completed: 1, failed: 0 });
    expect((await service.entitlement(identity)).planId).toBe("pro");
  }, 30000);
  it("recovers a committed but unprocessed signed receipt with a fresh worker and keeps duplicates inert", async () => {
    const customerId = await active();
    const originalVersion = (await service.entitlement(identity)).version;
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    const payload = await receive(customerId, undefined, "customer.subscription.deleted");
    expect((await db.collection("billingEvents").doc(payload.id).get()).data()).toMatchObject({ state: "pending", attempts: 0 });
    expect((await service.status(identity))).toMatchObject({ reconciliation: "pending", entitlement: { planId: "free" } });

    // The request/worker ends after the durable receipt, without invoking processEvent.
    const restarted = new BillingService(db, provider, TEST_CATALOG, options(), () => now);
    expect(await restarted.retryPending(1)).toEqual({ completed: 1, failed: 0 });
    expect((await restarted.status(identity))).toMatchObject({ reconciliation: "current", subscription: "canceled", entitlement: { planId: "free", version: originalVersion + 1 } });
    expect((await db.collection("billingEvents").doc(payload.id).get()).data()).toMatchObject({ state: "done", attempts: 1 });
    await restarted.receiveWebhook(payload.raw, "fake-valid");
    await restarted.processEvent(payload.id);
    expect(await restarted.retryPending(1)).toEqual({ completed: 0, failed: 0 });
    expect((await db.collection("billingAccounts").doc(identity.uid).get()).data()).toMatchObject({ dirty: 1, reconciled: 1, version: originalVersion + 1 });
    expect(provider.customerCalls).toBe(1);
    expect(provider.checkoutCalls).toBe(0);
  }, 30000);
  it("does not let an abandoned event claim overwrite recovery after its lease expires", async () => {
    const customerId = await active();
    const originalVersion = (await service.entitlement(identity)).version;
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    const payload = await receive(customerId, undefined, "customer.subscription.deleted");
    let release!: () => void;
    let entered = false;
    provider.beforeCanonical = async () => { entered = true; await new Promise<void>(resolve => { release = resolve; }); };
    const abandoned = service.processEvent(payload.id).catch(error => error);
    try {
      await vi.waitFor(() => expect(entered).toBe(true));
      expect(await service.retryPending(1)).toEqual({ completed: 0, failed: 1 });
      expect((await db.collection("billingEvents").doc(payload.id).get()).data()).toMatchObject({ state: "pending", attempts: 1 });
      expect((await service.entitlement(identity)).planId).toBe("free");

      now += 1001; // the claimed event and account leases have expired
      provider.beforeCanonical = null;
      expect(await new BillingService(db, provider, TEST_CATALOG, options(), () => now).retryPending(1)).toEqual({ completed: 1, failed: 0 });
    } finally {
      provider.beforeCanonical = null;
      release?.();
    }
    expect(await abandoned).toMatchObject({ code: "OPERATION_PENDING" });
    expect((await db.collection("billingEvents").doc(payload.id).get()).data()).toMatchObject({ state: "done", attempts: 2, lease: null });
    expect((await service.status(identity))).toMatchObject({ reconciliation: "current", subscription: "canceled", entitlement: { planId: "free", version: originalVersion + 1 } });
    expect(provider.customerCalls).toBe(1);
    expect(provider.checkoutCalls).toBe(0);
  }, 30000);
  it("fences a stale canonical response after a successor lease committed cancellation", async () => {
    const customerId = await active();
    let release!: () => void; let started = false;
    provider.beforeCanonical = async () => { started = true; await new Promise<void>(resolve => { release = resolve; }); };
    const stale = service.reconcile(identity.uid);
    const staleOutcome = stale.catch(error => error);
    await vi.waitFor(() => expect(started).toBe(true));
    now += 1001; provider.beforeCanonical = null;
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    await service.reconcile(identity.uid);
    const version = (await service.entitlement(identity)).version;
    release(); expect(await staleOutcome).toMatchObject({ code: "OPERATION_PENDING" });
    expect((await service.status(identity))).toMatchObject({ subscription: "canceled", entitlement: { planId: "free", version } });
  }, 30000);
  it("invalidates a fetch when a newer receipt arrives and ignores stale event delivery order", async () => {
    const customerId = await active();
    let release!: () => void; let started = false;
    provider.beforeCanonical = async () => { started = true; await new Promise<void>(resolve => { release = resolve; }); };
    const old = service.reconcile(identity.uid).catch(error => error);
    await vi.waitFor(() => expect(started).toBe(true));
    const canceled = await receive(customerId, undefined, "customer.subscription.deleted");
    expect((await service.entitlement(identity)).planId).toBe("free");
    provider.states.get(customerId)!.subscriptions[0].status = "canceled";
    provider.beforeCanonical = null; release();
    expect(await old).toMatchObject({ code: "OPERATION_PENDING" });
    await service.processEvent(canceled.id);
    const lateOldPaid = await receive(customerId, undefined, "invoice.paid");
    await service.processEvent(lateOldPaid.id);
    await service.receiveWebhook(canceled.raw, "fake-valid"); await service.processEvent(canceled.id);
    expect((await service.status(identity))).toMatchObject({ subscription: "canceled", entitlement: { planId: "free" } });
  }, 30000);
  it("expires authorization without a webhook and handles renewal/failure/refund/dispute conservatively", async () => {
    const customerId = await active();
    provider.states.get(customerId)!.subscriptions[0].cancelAtPeriodEnd = true;
    await service.reconcile(identity.uid);
    const until = (await service.entitlement(identity)).validUntil!;
    now += 300001;
    expect((await service.entitlement(identity)).planId).toBe("free"); // bounded stale projection
    await service.reconcile(identity.uid); expect((await service.entitlement(identity)).planId).toBe("pro");
    now = Date.parse(until);
    expect((await service.entitlement(identity)).planId).toBe("free");
    provider.states.set(customerId, { ...provider.empty(customerId), subscriptions: [paidSubscription(customerId, now)] });
    await service.reconcile(identity.uid); expect((await service.entitlement(identity)).planId).toBe("pro");
    provider.states.get(customerId)!.subscriptions[0].status = "past_due";
    await service.reconcile(identity.uid); expect((await service.entitlement(identity)).planId).toBe("free");
    for (const risk of ["refunded", "disputed"] as const) {
      provider.states.set(customerId, { ...provider.empty(customerId), subscriptions: [paidSubscription(customerId, now)] });
      provider.states.get(customerId)!.risk[risk] = true;
      await service.reconcile(identity.uid); expect((await service.status(identity)).subscription).toBe("blocked");
      await expect(service.checkout(identity, { planId: "pro", operationId: randomUUID() })).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
    }
  }, 30000);
  it("binds portal to the verified owner and refuses bad signatures, unknown customers and forged account data", async () => {
    const customerId = await active();
    const key = { operationId: randomUUID() };
    expect(await service.portal(identity, key)).toEqual(await service.portal(identity, key));
    expect(provider.portalCalls).toHaveLength(1);
    expect(provider.portalCalls[0]).toMatchObject({ customerId, returnUrl: `${options().origin}/account/billing` });
    await expect(service.portal({ ...identity, emailVerified: false }, { operationId: randomUUID() })).rejects.toMatchObject({ code: "EMAIL_VERIFICATION_REQUIRED" });
    const payload = event(customerId);
    await expect(service.receiveWebhook(payload.raw, "bad-signature")).rejects.toThrow();
    expect((await db.collection("billingEvents").doc(payload.id).get()).exists).toBe(false);
    await expect(receive("cus_unknown")).rejects.toMatchObject({ code: "OPERATION_PENDING" });
    await db.collection("billingAccounts").doc(identity.uid).set({ fixturePro: true, planId: "pro", limit: 2, validUntilMs: now + 100000 });
    await expect(service.entitlement(identity)).rejects.toThrow();
  }, 30000);
});
