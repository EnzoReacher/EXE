import { describe, expect, it } from "vitest";
import { evaluateBilling, projectionEntitlement } from "./billing-policy";
import type { CanonicalBilling } from "./billing-provider";
import { BillingInvariantError } from "./billing-provider";
import { paidSubscription, TEST_CATALOG } from "./billing-test-fixtures";
const now = Date.UTC(2026, 9, 16);
const canonical = (): CanonicalBilling => ({ customer: { id: "cus_fixture", binding: "owned", environment: "sandbox", deleted: false }, complete: true, subscriptions: [paidSubscription("cus_fixture", now)], risk: { refunded: false, disputed: false, unsupported: false } });
const evaluate = (value: CanonicalBilling) => evaluateBilling(value, TEST_CATALOG, "cus_fixture", "owned", now);
describe("conservative canonical sandbox entitlement policy", () => {
  it("requires active paid supported subscription and expires capabilities at authorization time", () => {
    const value = canonical(); value.subscriptions[0].cancelAtPeriodEnd = true;
    const result = evaluate(value);
    expect(result.subscription).toBe("active"); expect(result.cancelAtPeriodEnd).toBe(true);
    expect(projectionEntitlement(result, true, 1, now, true, now, 2).capabilities).toEqual({ canSave: true, canReadSaved: true, canDeleteSaved: true, savedSessionLimit: 2 });
    expect(projectionEntitlement(result, true, 1, now, true, result.proUntilMs!, 2).planId).toBe("free");
    expect(projectionEntitlement(result, false, 1, now, true, now).capabilities.canSave).toBe(false);
    expect(projectionEntitlement(result, true, 1, now, false, now).capabilities.canSave).toBe(false);
  });
  it("denies failed/pending/paused/trialing/canceled states and retains no stale paid grant", () => {
    for (const status of ["canceled", "incomplete", "incomplete_expired", "past_due", "paused", "trialing", "unpaid"] as const) {
      const value = canonical(); value.subscriptions[0].status = status;
      expect(evaluate(value).proUntilMs).toBeNull();
    }
    const value = canonical(); value.subscriptions[0].invoice = null;
    expect(evaluate(value).subscription).toBe("pending");
  });
  it("blocks wrong price/product, unsupported terms and unpaid/out-of-band invoices", () => {
    for (const patch of [{ priceId: "price_wrong" }, { productId: "prod_wrong" }, { quantity: 2 }, { unsupportedTerms: true }, { itemCount: 2 }]) {
      const value = canonical(); Object.assign(value.subscriptions[0], patch);
      expect(evaluate(value).subscription).toBe("blocked");
    }
    for (const patch of [{ customerId: "cus_wrong" }, { subscriptionId: "sub_wrong" }, { amountPaid: 0 }, { currency: "eur" }, { verifiedSuccessfulCharge: false }, { automatic: false }, { priceId: "price_wrong" }, { periodEndMs: now + 366 * 86400000 }]) {
      const value = canonical(); Object.assign(value.subscriptions[0].invoice!, patch);
      expect(evaluate(value).proUntilMs).toBeNull();
    }
  });
  it("blocks refunds/disputes/duplicates and rejects foreign customer/mode/catalog", () => {
    for (const field of ["refunded", "disputed", "unsupported"] as const) { const value = canonical(); value.risk[field] = true; expect(evaluate(value).riskBlocked).toBe(true); }
    const duplicate = canonical(); duplicate.subscriptions.push({ ...duplicate.subscriptions[0], id: "sub_second" });
    expect(evaluate(duplicate).subscription).toBe("blocked");
    const foreign = canonical(); foreign.customer.id = "cus_other"; expect(() => evaluate(foreign)).toThrow(BillingInvariantError);
    expect(() => evaluateBilling(canonical(), { ...TEST_CATALOG, environment: "live" } as unknown as typeof TEST_CATALOG, "cus_fixture", "owned", now)).toThrow(BillingInvariantError);
  });
});
