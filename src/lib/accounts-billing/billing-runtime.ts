import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { CatalogResponse } from "./contracts";
import type { AccountsConfig } from "./server-config";
import { accountsConfig } from "./server-config";
import { failure } from "./server-errors";
import { BillingService } from "./billing-service";
import { StripeSandboxProvider } from "./billing-stripe";
import type { SandboxBillingProvider } from "./billing-provider";

export function configuredQuota(env: Readonly<Record<string, string | undefined>> = process.env): number {
  const raw = env.OWNPATH_SAVED_SESSION_LIMIT ?? "50";
  if (!/^[1-9][0-9]?$/.test(raw) || Number(raw) > 50) return failure("SERVICE_UNAVAILABLE");
  return Number(raw);
}
export function configuredStripe(env: Readonly<Record<string, string | undefined>> = process.env): StripeSandboxProvider | null {
  if (env.OWNPATH_SANDBOX_BILLING_ENABLED !== "true") return null;
  const { STRIPE_SECRET_KEY: secretKey, STRIPE_WEBHOOK_SECRET: webhookSecret, STRIPE_ACCOUNT_ID: accountId, STRIPE_PRICE_ID: priceId } = env;
  if (!secretKey && !webhookSecret && !accountId && !priceId) return null;
  if (!secretKey || !webhookSecret || !accountId || !priceId) return null;
  try { return new StripeSandboxProvider({ secretKey, webhookSecret, accountId, priceId }); }
  catch { return failure("BILLING_UNAVAILABLE"); }
}
export async function billingForRequest(db: Firestore, config: AccountsConfig, provider: SandboxBillingProvider | null = configuredStripe()): Promise<BillingService | null> {
  const quotaLimit = configuredQuota();
  if (!provider) return null;
  try { return new BillingService(db, provider, await provider.catalog(), { origin: config.origin, projectId: config.projectId, quotaLimit }); }
  catch { return failure("BILLING_UNAVAILABLE", true); }
}
export async function publicBillingCatalog(): Promise<CatalogResponse> {
  const unavailable = (reason: "not_configured" | "provider_unavailable"): CatalogResponse => ({ environment: "sandbox", catalogVersion: "sandbox-v1-unavailable", free: { planId: "free", amount: 0 }, pro: { planId: "pro", availability: "unavailable", reason } });
  try { accountsConfig(); } catch { return unavailable("not_configured"); }
  let provider;
  try { provider = configuredStripe(); } catch { return unavailable("not_configured"); }
  if (!provider) return unavailable("not_configured");
  try {
    const catalog = await provider.catalog();
    return { environment: "sandbox", catalogVersion: catalog.version, free: { planId: "free", amount: 0 }, pro: { planId: "pro", availability: "available", amount: catalog.amount, currency: "usd", interval: "month" } };
  } catch { return unavailable("provider_unavailable"); }
}
