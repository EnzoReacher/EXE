import "server-only";
import { createHash } from "node:crypto";
import { configuration as openAIConfiguration, createProvider as createOpenAIProvider, type Configuration as OpenAIConfiguration, type Provider } from "@/lib/experience-translator/server/openai";
import { LiveError } from "@/lib/experience-translator/server/validation";
import { createClaudeProvider } from "./claude";
import type { Disclosure } from "./disclosure";

// Re-export preserves the existing small app contract and disposable preview seam.
export { shape, type Provider } from "@/lib/experience-translator/server/openai";
export type Configuration = OpenAIConfiguration & { provider?: "openai" | "anthropic" };
const unavailable = () => new LiveError("not_configured", "AI is not configured for this local workspace. Ask the site owner to check the connection. Your work is kept.", 503);
function selectedProvider() {
  const selected = process.env.OWNPATH_SCAN_PROVIDER?.trim() || "openai";
  if (selected !== "openai" && selected !== "anthropic") throw unavailable();
  return selected;
}

/** Public transmission metadata reads no credential and makes no network call. */
export function transmission(): Disclosure {
  const provider = selectedProvider();
  const model = (provider === "anthropic" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL)?.trim() || "unconfigured";
  const identity = createHash("sha256").update(JSON.stringify(["scan-structured-cv-v2", provider, model])).digest("hex").slice(0, 24);
  return { provider: provider === "anthropic" ? "Anthropic (Claude)" : "OpenAI", purpose: `scan-structured-cv-v2-${identity}`, external: true };
}

export function configuration(): Configuration {
  if (selectedProvider() === "openai") {
    try { return { ...openAIConfiguration(), provider: "openai" }; }
    catch { throw unavailable(); }
  }
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  const origin = process.env.OWNPATH_CLAUDE_LOCAL_ORIGIN?.trim();
  // The only Claude model/capabilities verified for this adapter. No guessed ID,
  // default model, live probing or automatic model/provider substitution.
  if (process.env.OWNPATH_CLAUDE_LOCAL_ENABLED !== "true" || !key || model !== "claude-haiku-4-5-20251001" || !origin || ![undefined, "", "OFF"].includes(process.env.OWNPATH_BILLING_MODE)) throw unavailable();
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || !url.port || url.origin !== origin) throw unavailable();
  } catch { throw unavailable(); }
  return { key, model, origin, provider: "anthropic" };
}

export function createProvider(config: Configuration, request: typeof fetch = fetch, maxAttempts: 1 | 2 = 1): Provider {
  return config.provider === "anthropic" ? createClaudeProvider(config, request) : createOpenAIProvider(config, request, maxAttempts);
}
