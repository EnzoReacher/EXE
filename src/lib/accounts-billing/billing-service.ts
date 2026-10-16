import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import type { BillingStatusResponse, CheckoutRequest, CheckoutResponse, Entitlement, PortalRequest, PortalResponse } from "./contracts";
import { parseCheckout, parsePortal } from "./contracts.validation";
import type { ServerIdentity } from "./server-identity";
import { requireVerified } from "./server-identity";
import { failure } from "./server-errors";
import type { BillingCatalog, ProviderCheckout, ResolvedBillingEvent, SandboxBillingProvider } from "./billing-provider";
import { approvedHostedUrl, invariant } from "./billing-provider";
import { evaluateBilling, projectionEntitlement, validateCatalog } from "./billing-policy";
import type { BillingProjection } from "./billing-policy";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
type Lease = { token: string; fence: number; untilMs: number; kind: "customer" | "checkout" | "portal" | "reconcile" };
type PendingOperation = { logicalId: string; key: string; startedAtMs: number };
type CheckoutSlot = PendingOperation & { providerId?: string; result?: Omit<CheckoutResponse, "operationId"> };
type Account = {
  uid: string; binding: string; environment: "sandbox"; customerId: string | null;
  customerOperation: PendingOperation | null; checkout: CheckoutSlot | null;
  fence: number; lease: Lease | null; dirty: number; reconciled: number; version: number;
  asOfMs: number; sync: "current" | "pending" | "unavailable"; projection: BillingProjection | null;
};
export type BillingOptions = { projectId: string; origin: string; quotaLimit?: number; leaseMs?: number; freshnessMs?: number };
const idempotencySafeWindowMs = 23 * 3600000;
const integer = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function operation(value: PendingOperation): void {
  invariant(value && /^[a-f0-9-]{36}$/.test(value.logicalId) && /^ownpath-(customer|checkout|portal)-[a-f0-9-]{36}$/.test(value.key) && integer(value.startedAtMs));
}

/** All external calls happen between transactions. Durable logical keys are NEVER recycled. */
export class BillingService {
  private readonly quota: number;
  private readonly leaseMs: number;
  private readonly freshnessMs: number;
  constructor(private readonly db: Firestore, private readonly provider: SandboxBillingProvider, readonly catalog: BillingCatalog, private readonly options: BillingOptions, private readonly now: () => number = Date.now) {
    validateCatalog(catalog);
    const origin = new URL(options.origin);
    invariant(origin.origin === options.origin && /^demo-[a-z0-9-]+$/.test(options.projectId));
    this.quota = options.quotaLimit ?? 50;
    this.leaseMs = options.leaseMs ?? 90000;
    this.freshnessMs = options.freshnessMs ?? 300000;
    invariant(integer(this.quota) && this.quota >= 1 && this.quota <= 50 && integer(this.leaseMs) && this.leaseMs >= 1000 && this.leaseMs <= 300000 && integer(this.freshnessMs) && this.freshnessMs >= 1000 && this.freshnessMs <= 300000);
  }
  private ref(uid: string) {
    if (!uid || uid.includes("/") || uid.length > 128) return failure("UNAUTHENTICATED");
    return this.db.collection("billingAccounts").doc(uid);
  }
  private binding(uid: string): string { return hash(`${this.options.projectId}:sandbox:${uid}`); }
  private initial(uid: string): Account {
    return { uid, binding: this.binding(uid), environment: "sandbox", customerId: null, customerOperation: null, checkout: null, fence: 0, lease: null, dirty: 0, reconciled: 0, version: 0, asOfMs: this.now(), sync: "unavailable", projection: null };
  }
  private account(value: unknown, uid: string): Account {
    if (!value) return this.initial(uid);
    const account = value as Account;
    invariant(account.uid === uid && account.binding === this.binding(uid) && account.environment === "sandbox" && [account.fence, account.dirty, account.reconciled, account.version, account.asOfMs].every(integer) && ["current", "pending", "unavailable"].includes(account.sync) && account.reconciled <= account.dirty);
    invariant(account.customerId === null || /^cus_[A-Za-z0-9]+$/.test(account.customerId));
    invariant(account.customerOperation === null || typeof account.customerOperation === "object");
    invariant(account.checkout === null || typeof account.checkout === "object");
    if (account.customerOperation) operation(account.customerOperation);
    if (account.checkout) operation(account.checkout);
    if (account.projection) {
      const projection = account.projection;
      invariant(projection.environment === "sandbox" && projection.customerId === account.customerId && typeof projection.catalogVersion === "string" && typeof projection.riskBlocked === "boolean" && typeof projection.blocksCheckout === "boolean");
      invariant(projection.proUntilMs === null || (integer(projection.proUntilMs) && integer(projection.paidThroughMs) && projection.proUntilMs <= projection.paidThroughMs));
    }
    if (account.lease) invariant(typeof account.lease.token === "string" && integer(account.lease.fence) && integer(account.lease.untilMs) && account.lease.fence <= account.fence);
    return account;
  }
  private async bound(transaction: Transaction, account: Account): Promise<void> {
    if (!account.customerId) return;
    const mapping = (await transaction.get(this.db.collection("billingCustomers").doc(account.customerId))).data();
    invariant(mapping?.uid === account.uid && mapping.binding === account.binding && mapping.environment === "sandbox");
  }
  private checkLease(account: Account, lease: Lease): void {
    if (account.lease?.token !== lease.token || account.fence !== lease.fence || account.lease.untilMs <= this.now()) failure("OPERATION_PENDING", true);
  }
  private async acquire(uid: string, kind: Lease["kind"], invalidate = false): Promise<{ account: Account; lease: Lease }> {
    return this.db.runTransaction(async transaction => {
      const ref = this.ref(uid);
      const account = this.account((await transaction.get(ref)).data(), uid);
      await this.bound(transaction, account);
      if (account.lease && account.lease.untilMs > this.now()) return failure("OPERATION_PENDING", true);
      invariant(account.fence < Number.MAX_SAFE_INTEGER);
      const lease = { token: randomUUID(), fence: account.fence + 1, untilMs: this.now() + this.leaseMs, kind };
      const next = { ...account, fence: lease.fence, lease, ...(invalidate ? { sync: "pending" as const } : {}) };
      transaction.set(ref, next);
      return { account: next, lease };
    });
  }
  private async commit<T>(uid: string, lease: Lease, work: (transaction: Transaction, account: Account) => Promise<{ account: Account; result: T }>): Promise<T> {
    return this.db.runTransaction(async transaction => {
      const ref = this.ref(uid);
      const account = this.account((await transaction.get(ref)).data(), uid);
      this.checkLease(account, lease);
      await this.bound(transaction, account);
      const result = await work(transaction, account);
      transaction.set(ref, result.account);
      return result.result;
    });
  }
  private async releaseFailure(uid: string, lease: Lease): Promise<void> {
    await this.db.runTransaction(async transaction => {
      const ref = this.ref(uid);
      const account = this.account((await transaction.get(ref)).data(), uid);
      // A stale worker may not clear a successor's lease or overwrite a newer projection.
      if (account.lease?.token !== lease.token || account.fence !== lease.fence) return;
      transaction.set(ref, { ...account, lease: null, ...(["reconcile", "checkout"].includes(lease.kind) ? { sync: "unavailable" } : {}) });
    });
  }
  private async latestCatalog(): Promise<void> { invariant((await this.provider.catalog()).version === this.catalog.version); }
  async ensureCustomer(identity: ServerIdentity): Promise<string> {
    requireVerified(identity);
    const { account, lease } = await this.acquire(identity.uid, "customer");
    try {
      if (account.customerId) return await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...current, lease: null }, result: current.customerId! }));
      const operation = account.customerOperation ?? { logicalId: randomUUID(), key: `ownpath-customer-${randomUUID()}`, startedAtMs: this.now() };
      await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...current, customerOperation: operation }, result: undefined }));
      await this.latestCatalog();
      const found = await this.provider.findCustomers(account.binding);
      invariant(found.length <= 1);
      if (!found.length && this.now() - operation.startedAtMs >= idempotencySafeWindowMs) failure("OPERATION_PENDING", true);
      const customer = found[0] ?? await this.provider.createCustomer(account.binding, operation.logicalId, operation.key);
      invariant(customer.environment === "sandbox" && customer.binding === account.binding && !customer.deleted && /^cus_[A-Za-z0-9]+$/.test(customer.id));
      return await this.commit(identity.uid, lease, async (transaction, current) => {
        const reverse = this.db.collection("billingCustomers").doc(customer.id);
        const previous = (await transaction.get(reverse)).data();
        invariant(!previous || (previous.uid === identity.uid && previous.binding === account.binding && previous.environment === "sandbox"));
        transaction.set(reverse, { uid: identity.uid, binding: account.binding, environment: "sandbox" });
        return { account: { ...current, customerId: customer.id, customerOperation: null, lease: null }, result: customer.id };
      });
    } catch (error) { await this.releaseFailure(identity.uid, lease); throw error; }
  }
  private project(account: Account, projection: BillingProjection, generation: number): Account {
    if (account.dirty !== generation) return failure("OPERATION_PENDING", true);
    invariant(account.version < Number.MAX_SAFE_INTEGER);
    return { ...account, projection, reconciled: generation, sync: "current", version: account.version + 1, asOfMs: this.now() };
  }
  async reconcile(uid: string): Promise<void> {
    const { account, lease } = await this.acquire(uid, "reconcile", true);
    try {
      invariant(account.customerId);
      await this.latestCatalog();
      const canonical = await this.provider.canonical(account.customerId);
      const projection = evaluateBilling(canonical, this.catalog, account.customerId, account.binding, this.now());
      let slot = account.checkout;
      if (slot?.providerId) {
        const checkout = await this.provider.retrieveCheckout(account.customerId, slot.providerId);
        invariant(checkout.customerId === account.customerId && checkout.logicalId === slot.logicalId && checkout.environment === "sandbox");
        if (checkout.status === "expired" || (checkout.status === "complete" && canonical.subscriptions.some(subscription => subscription.id === checkout.subscriptionId))) slot = null;
      }
      await this.commit(uid, lease, async (_transaction, current) => ({ account: { ...this.project(current, projection, account.dirty), checkout: slot, lease: null }, result: undefined }));
    } catch (error) { await this.releaseFailure(uid, lease); throw error; }
  }
  private checkoutResult(checkout: ProviderCheckout, customerId: string, logicalId: string): Omit<CheckoutResponse, "operationId"> {
    invariant(checkout.customerId === customerId && checkout.logicalId === logicalId && checkout.environment === "sandbox");
    if (checkout.status !== "open" || checkout.expiresAtMs <= this.now() || !checkout.url) return failure("OPERATION_PENDING", true);
    return { checkoutUrl: approvedHostedUrl(checkout.url, "checkout"), expiresAt: new Date(checkout.expiresAtMs).toISOString(), environment: "sandbox" };
  }
  async checkout(identity: ServerIdentity, raw: CheckoutRequest): Promise<CheckoutResponse> {
    requireVerified(identity);
    const input = parseCheckout(raw);
    const customerId = await this.ensureCustomer(identity);
    const { account, lease } = await this.acquire(identity.uid, "checkout", true);
    const opRef = this.db.collection("checkoutOperations").doc(hash(`${identity.uid}:${input.operationId}`));
    try {
      await this.latestCatalog();
      const canonical = await this.provider.canonical(customerId);
      const projection = evaluateBilling(canonical, this.catalog, customerId, account.binding, this.now());
      if (projection.blocksCheckout) {
        await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...this.project(current, projection, account.dirty), lease: null }, result: undefined }));
        return failure(projection.riskBlocked ? "BILLING_UNAVAILABLE" : "ALREADY_SUBSCRIBED");
      }
      const existingOp = await opRef.get();
      if (existingOp.exists) {
        const value = existingOp.data()!;
        invariant(value.uid === identity.uid && value.planId === "pro");
        if (value.result) {
          if (Date.parse(value.result.expiresAt) <= this.now()) failure("OPERATION_CONFLICT");
          if (value.logicalId !== account.checkout?.logicalId || !account.checkout?.providerId) failure("OPERATION_CONFLICT");
          const previousCheckout = await this.provider.retrieveCheckout(customerId, account.checkout.providerId);
          if (previousCheckout.status !== "open") failure("OPERATION_CONFLICT");
          await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...this.project(current, projection, account.dirty), lease: null }, result: undefined }));
          return { operationId: input.operationId, ...value.result, checkoutUrl: approvedHostedUrl(value.result.checkoutUrl, "checkout") };
        }
        if (value.logicalId !== account.checkout?.logicalId) failure("OPERATION_CONFLICT");
      }
      let slot = account.checkout;
      let providerCheckout: ProviderCheckout | undefined;
      if (slot?.providerId) {
        providerCheckout = await this.provider.retrieveCheckout(customerId, slot.providerId);
        invariant(providerCheckout.customerId === customerId && providerCheckout.logicalId === slot.logicalId && providerCheckout.environment === "sandbox");
        if (providerCheckout.status === "complete") {
          if (!canonical.subscriptions.some(subscription => subscription.id === providerCheckout!.subscriptionId)) failure("OPERATION_PENDING", true);
          if (existingOp.exists) failure("OPERATION_CONFLICT");
          slot = null; providerCheckout = undefined;
        }
        if (providerCheckout?.status === "expired") {
          if (existingOp.exists) failure("OPERATION_CONFLICT");
          slot = null; providerCheckout = undefined;
        }
      }
      slot ??= { logicalId: randomUUID(), key: `ownpath-checkout-${randomUUID()}`, startedAtMs: this.now() };
      const reserved = slot;
      await this.commit(identity.uid, lease, async (transaction, current) => {
        if (current.dirty !== account.dirty) failure("OPERATION_PENDING", true);
        transaction.set(opRef, { uid: identity.uid, planId: "pro", logicalId: reserved.logicalId });
        return { account: { ...current, checkout: reserved }, result: undefined };
      });
      if (!providerCheckout) {
        const recovered = await this.provider.findCheckouts(customerId, reserved.logicalId);
        invariant(recovered.length <= 1);
        if (!recovered.length && this.now() - reserved.startedAtMs >= idempotencySafeWindowMs) failure("OPERATION_PENDING", true);
        providerCheckout = recovered[0] ?? await this.provider.createCheckout({ customerId, logicalId: reserved.logicalId, idempotencyKey: reserved.key, successUrl: `${this.options.origin}/checkout/return`, cancelUrl: `${this.options.origin}/checkout/cancel` });
      }
      if (providerCheckout.status !== "open") {
        await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...current, checkout: { ...reserved, providerId: providerCheckout!.id }, lease: null }, result: undefined }));
        failure(providerCheckout.status === "expired" ? "OPERATION_CONFLICT" : "OPERATION_PENDING", true);
      }
      const result = this.checkoutResult(providerCheckout, customerId, reserved.logicalId);
      return await this.commit(identity.uid, lease, async (transaction, current) => {
        const next = this.project(current, projection, account.dirty);
        transaction.set(opRef, { uid: identity.uid, planId: "pro", logicalId: reserved.logicalId, result });
        return { account: { ...next, checkout: { ...reserved, providerId: providerCheckout!.id, result }, lease: null }, result: { operationId: input.operationId, ...result } };
      });
    } catch (error) { await this.releaseFailure(identity.uid, lease); throw error; }
  }
  async portal(identity: ServerIdentity, raw: PortalRequest): Promise<PortalResponse> {
    requireVerified(identity);
    const input = parsePortal(raw);
    const { account, lease } = await this.acquire(identity.uid, "portal");
    const ref = this.db.collection("billingPortalOperations").doc(hash(`${identity.uid}:${input.operationId}`));
    try {
      if (!account.customerId) failure("BILLING_UNAVAILABLE");
      const previous = (await ref.get()).data();
      if (previous) invariant(previous.uid === identity.uid && previous.customerId === account.customerId && integer(previous.startedAtMs));
      if (previous?.result) {
        if (previous.expiresAtMs <= this.now()) failure("OPERATION_CONFLICT");
        await this.commit(identity.uid, lease, async (_transaction, current) => ({ account: { ...current, lease: null }, result: undefined }));
        return { portalUrl: approvedHostedUrl(previous.result, "portal"), environment: "sandbox" };
      }
      const operation = previous ?? { uid: identity.uid, customerId: account.customerId, startedAtMs: this.now(), key: `ownpath-portal-${randomUUID()}` };
      await this.commit(identity.uid, lease, async (transaction, current) => { transaction.set(ref, operation); return { account: current, result: undefined }; });
      if (this.now() - operation.startedAtMs >= idempotencySafeWindowMs) failure("OPERATION_PENDING", true);
      const url = approvedHostedUrl(await this.provider.createPortal(account.customerId, `${this.options.origin}/account/billing`, operation.key), "portal");
      return await this.commit(identity.uid, lease, async (transaction, current) => {
        transaction.set(ref, { ...operation, result: url, expiresAtMs: this.now() + 300000 });
        return { account: { ...current, lease: null }, result: { portalUrl: url, environment: "sandbox" as const } };
      });
    } catch (error) { await this.releaseFailure(identity.uid, lease); throw error; }
  }
  async receiveWebhook(raw: Uint8Array, signature: string): Promise<{ eventId: string }> {
    const verified = this.provider.verifyWebhook(raw, signature);
    invariant(/^evt_[A-Za-z0-9]+$/.test(verified.id));
    const event = await this.provider.resolveEvent(verified);
    invariant(event.id === verified.id && event.payloadHash === verified.payloadHash);
    return this.receiveEvent(event);
  }
  private async receiveEvent(event: ResolvedBillingEvent): Promise<{ eventId: string }> {
    return this.db.runTransaction(async transaction => {
      const ref = this.db.collection("billingEvents").doc(event.id);
      const previous = (await transaction.get(ref)).data();
      if (previous) { invariant(previous.payloadHash === event.payloadHash && previous.type === event.type && previous.customerId === event.customerId); return { eventId: event.id }; }
      if (event.ignored) { transaction.create(ref, { ...event, state: "done", attempts: 0, createdAtMs: this.now() }); return { eventId: event.id }; }
      invariant(event.customerId && /^cus_[A-Za-z0-9]+$/.test(event.customerId));
      const binding = (await transaction.get(this.db.collection("billingCustomers").doc(event.customerId))).data();
      if (!binding || typeof binding.uid !== "string") failure("OPERATION_PENDING", true);
      const accountRef = this.ref(binding.uid);
      const account = this.account((await transaction.get(accountRef)).data(), binding.uid);
      invariant(binding.binding === account.binding && binding.environment === "sandbox" && account.customerId === event.customerId && account.dirty < Number.MAX_SAFE_INTEGER);
      const generation = account.dirty + 1;
      transaction.create(ref, { id: event.id, type: event.type, payloadHash: event.payloadHash, customerId: event.customerId, uid: binding.uid, generation, state: "pending", attempts: 0, nextAttemptAtMs: this.now(), lease: null, createdAtMs: this.now() });
      transaction.set(accountRef, { ...account, dirty: generation, sync: "pending" });
      return { eventId: event.id };
    });
  }
  async processEvent(eventId: string): Promise<void> {
    invariant(/^evt_[A-Za-z0-9]+$/.test(eventId));
    const ref = this.db.collection("billingEvents").doc(eventId);
    const claim = await this.db.runTransaction(async transaction => {
      const value = (await transaction.get(ref)).data();
      invariant(value);
      if (value.state === "done") return null;
      invariant(value.state === "pending" && typeof value.uid === "string" && integer(value.attempts) && integer(value.generation));
      if (value.nextAttemptAtMs > this.now() || (value.lease && value.lease.untilMs > this.now())) failure("OPERATION_PENDING", true);
      const token = randomUUID();
      transaction.update(ref, { lease: { token, untilMs: this.now() + this.leaseMs }, attempts: value.attempts + 1 });
      return { uid: value.uid as string, generation: value.generation as number, token, attempts: value.attempts + 1 };
    });
    if (!claim) return;
    try {
      await this.reconcile(claim.uid);
      await this.db.runTransaction(async transaction => {
        const [event, accountDoc] = await Promise.all([transaction.get(ref), transaction.get(this.ref(claim.uid))]);
        const value = event.data();
        const account = this.account(accountDoc.data(), claim.uid);
        if (value?.lease?.token !== claim.token || value.lease.untilMs <= this.now()) failure("OPERATION_PENDING", true);
        if (account.reconciled < claim.generation || account.sync !== "current") failure("OPERATION_PENDING", true);
        transaction.update(ref, { state: "done", lease: null, completedAtMs: this.now(), failureCode: null });
      });
    } catch (error) {
      await this.db.runTransaction(async transaction => {
        const value = (await transaction.get(ref)).data();
        if (value?.lease?.token !== claim.token) return;
        transaction.update(ref, { lease: null, state: "pending", failureCode: "reconciliation_unavailable", nextAttemptAtMs: this.now() + Math.min(3600000, 1000 * 2 ** Math.min(claim.attempts, 12)) });
      });
      throw error;
    }
  }
  /** Explicit local/operator worker entry. No scheduler/deployed worker is implied by its existence. */
  async retryPending(limit = 20): Promise<{ completed: number; failed: number }> {
    invariant(Number.isInteger(limit) && limit >= 1 && limit <= 100);
    const events = await this.db.collection("billingEvents").where("state", "==", "pending").orderBy("nextAttemptAtMs").limit(limit).get();
    let completed = 0; let failed = 0;
    for (const event of events.docs) {
      if (event.data().nextAttemptAtMs > this.now()) continue;
      try { await this.processEvent(event.id); completed++; } catch { failed++; }
    }
    return { completed, failed };
  }
  private current(account: Account): boolean {
    const projection = account.projection;
    return account.sync === "current" && account.dirty === account.reconciled && account.version > 0 && account.asOfMs <= this.now() + 60000 && this.now() - account.asOfMs <= this.freshnessMs && projection?.environment === "sandbox" && projection.catalogVersion === this.catalog.version && projection.customerId === account.customerId;
  }
  readonly readQuota = async (): Promise<{ limit: number }> => ({ limit: this.quota });
  readonly authorizeWrite = async (transaction: Transaction, identity: ServerIdentity): Promise<{ limit: number }> => {
    requireVerified(identity);
    const account = this.account((await transaction.get(this.ref(identity.uid))).data(), identity.uid);
    await this.bound(transaction, account);
    const entitlement = projectionEntitlement(account.projection, identity.emailVerified, account.version, account.asOfMs, this.current(account), this.now(), this.quota);
    if (!entitlement.capabilities.canSave) failure("PRO_REQUIRED");
    return { limit: this.quota };
  };
  async entitlement(identity: ServerIdentity): Promise<Entitlement> { return (await this.status(identity)).entitlement; }
  async status(identity: ServerIdentity): Promise<BillingStatusResponse> {
    const account = await this.db.runTransaction(async transaction => {
      const value = this.account((await transaction.get(this.ref(identity.uid))).data(), identity.uid);
      await this.bound(transaction, value); return value;
    });
    const current = this.current(account);
    const projection = account.projection;
    const entitlement = projectionEntitlement(projection, identity.emailVerified, account.version, account.asOfMs, current, this.now(), this.quota);
    return { environment: "sandbox", entitlement, subscription: projection?.subscription === "active" && projection.proUntilMs !== null && projection.proUntilMs <= this.now() ? "expired" : account.checkout && !projection?.blocksCheckout ? "pending" : projection?.subscription ?? "none", cancelAtPeriodEnd: projection?.cancelAtPeriodEnd ?? false, paidThrough: projection?.paidThroughMs ? new Date(projection.paidThroughMs).toISOString() : null, reconciliation: current ? "current" : account.sync === "unavailable" ? "unavailable" : "pending", canManageBilling: Boolean(account.customerId), asOf: new Date(account.asOfMs).toISOString() };
  }
}
