import "server-only";
import { boundedText, type Configuration, type Provider } from "@/lib/experience-translator/server/openai";
import { LiveError } from "@/lib/experience-translator/server/validation";
import { diagnosticStage, diagnosticHttp, diagnosticStop, diagnosticProviderError } from "./diagnostics";
import { readProviderError } from "./provider-errors";

const unchecked = () => new LiveError("provider_output", "The AI response could not be verified. Your work is kept. Processing may have incurred charges; ask the owner to check usage before another request.", 502);
const interrupted = () => new LiveError("provider", "The request was cancelled or timed out. Your work is kept. The provider may still have processed it; do not submit a duplicate.", 502);

/** Transport envelope only. The shared application parsers still validate every
 * nested finding/replacement and its source relationships before applying it. */
export function parseClaudeEnvelope(value: unknown): unknown {
  diagnosticStage("provider_envelope");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw unchecked();
  const message = value as Record<string, unknown>;
  diagnosticStop(message.stop_reason);
  // Never accept partial JSON, refusals, tool use or an unfinished assistant turn.
  if (message.type !== "message" || message.role !== "assistant" || message.stop_reason !== "end_turn" || message.error || message.stop_sequence != null || !Array.isArray(message.content) || message.content.length > 8) throw unchecked();
  const parts: string[] = [];
  for (const raw of message.content) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw unchecked();
    const block = raw as Record<string, unknown>;
    // Defensively discard any reasoning block; thinking is disabled on requests.
    if (block.type === "thinking" && typeof block.thinking === "string" && typeof block.signature === "string") continue;
    if (block.type === "redacted_thinking" && typeof block.data === "string") continue;
    if (block.type !== "text" || typeof block.text !== "string" || !block.text.trim() || block.text.length > 60000) throw unchecked();
    parts.push(block.text);
  }
  if (parts.length !== 1) throw unchecked();
  diagnosticStage("structured_json");
  try { return JSON.parse(parts[0]); } catch { throw unchecked(); }
}

/** Native official Messages API. Exactly one attempt; no SDK retry, fallback,
 * tools, remote URLs, prompt cache persistence or provider-controlled redirects. */
export type ClaudeUsage = Partial<Record<"input_tokens" | "output_tokens" | "cache_creation_input_tokens" | "cache_read_input_tokens", number>>;
/** Numeric metadata only, including on refused/truncated envelopes. */
export function claudeUsage(value: unknown): ClaudeUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const usage = (value as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return {};
  const result: ClaudeUsage = {};
  for (const field of ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"] as const) {
    const n = (usage as Record<string, unknown>)[field];
    if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000) result[field] = n;
  }
  return result;
}
export function createClaudeProvider(config: Configuration, request: typeof fetch = fetch, observeUsage?: (usage: ClaudeUsage) => void): Provider {
  return async (_name, instructions, payload, schema, workflowSignal) => {
    const signal = AbortSignal.any([workflowSignal, AbortSignal.timeout(45000)]);
    try {
      signal.throwIfAborted();
      diagnosticStage("provider_http");
      const response = await request("https://api.anthropic.com/v1/messages", {
        method: "POST", redirect: "error", cache: "no-store", signal,
        headers: { "Content-Type": "application/json", "x-api-key": config.key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: config.model, max_tokens: 8000, stream: false,
          system: instructions,
          messages: [{ role: "user", content: JSON.stringify(payload) }],
          thinking: { type: "disabled" },
          output_config: { format: { type: "json_schema", schema } },
        }),
      });
      signal.throwIfAborted();
      diagnosticHttp(response.status, response.headers.get("request-id"));
      if (!response.ok) {
        // Preserve only bounded, allowlisted metadata. Public errors, validation,
        // accounting and the one-attempt transport policy remain unchanged.
        diagnosticProviderError(await readProviderError(response, schema, signal));
        if (response.status === 401 || response.status === 403) throw new LiveError("provider_auth", "AI access could not be authorized. Ask the site owner to check the connection. Your work is kept.", 503);
        if (response.status === 429) throw new LiveError("provider_rate", "The AI service is busy or its allowance is unavailable. Your work is kept; ask the owner to check usage before another request.", 429);
        if (response.status === 404) throw new LiveError("provider_model", "The selected AI model is unavailable to this connection. Ask the site owner to check model access. Your work is kept; no alternative model was used.", 503);
        if (response.status === 400) throw new LiveError("provider_request", "The AI service rejected this request. Ask the site owner to check model and structured-output compatibility. Your work is kept; no alternative model was used.", 502);
        throw new LiveError("provider", "The AI service could not complete this request. Your work is kept; no automatic retry was made.", 502);
      }
      try {
        diagnosticStage("provider_body");
        const body = await boundedText(response, 160000, signal);
        signal.throwIfAborted();
        diagnosticStage("provider_json");
        const envelope: unknown = JSON.parse(body);
        observeUsage?.(claudeUsage(envelope));
        return parseClaudeEnvelope(envelope);
      } catch { throw unchecked(); }
    } catch (error) {
      if (signal.aborted) throw interrupted();
      if (error instanceof LiveError && error.code.startsWith("provider")) throw error;
      throw new LiveError("provider", "The AI connection ended without a confirmed result. Your work is kept; no automatic retry was made.", 502);
    }
  };
}
