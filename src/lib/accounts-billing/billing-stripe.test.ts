import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
import { StripeSandboxProvider } from "./billing-stripe";
import { approvedHostedUrl, BillingSignatureError } from "./billing-provider";
const config = { secretKey: "sk_test_synthetic", webhookSecret: "whsec_synthetic", accountId: "acct_synthetic", priceId: "price_synthetic" };
describe("real Stripe SDK cryptography and sandbox configuration gates (no API calls)", () => {
  it("checks unmodified raw bytes, timestamp, account and mode using actual SDK signatures", () => {
    const adapter = new StripeSandboxProvider(config);
    const stripe = new Stripe(config.secretKey);
    const body = JSON.stringify({ id: "evt_synthetic", type: "invoice.paid", livemode: false, account: config.accountId, data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: config.webhookSecret });
    expect(adapter.verifyWebhook(Buffer.from(body), signature).id).toBe("evt_synthetic");
    expect(() => adapter.verifyWebhook(Buffer.from(`${body} `), signature)).toThrow(BillingSignatureError);
    const old = stripe.webhooks.generateTestHeaderString({ payload: body, secret: config.webhookSecret, timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect(() => adapter.verifyWebhook(Buffer.from(body), old)).toThrow(BillingSignatureError);
    for (const patch of [{ livemode: true }, { account: "acct_wrong" }]) {
      const payload = JSON.stringify({ ...JSON.parse(body), ...patch });
      const signed = stripe.webhooks.generateTestHeaderString({ payload, secret: config.webhookSecret });
      expect(() => adapter.verifyWebhook(Buffer.from(payload), signed)).toThrow(BillingSignatureError);
    }
  });
  it("never accepts live keys or arbitrary hosted redirect destinations", () => {
    expect(() => new StripeSandboxProvider({ ...config, secretKey: "sk_live_forbidden" })).toThrow();
    for (const url of ["http://checkout.stripe.com/x", "https://checkout.stripe.com.evil.test/x", "https://evil.test/x", "https://user@checkout.stripe.com/x"]) expect(() => approvedHostedUrl(url, "checkout")).toThrow();
  });
});
