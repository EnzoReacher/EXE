import "server-only";
import { LiveError, object, text, list, fail } from "./validation";

type Schema = Record<string, unknown>;
const string = { type: "string" };
const boolean = { type: "boolean" };
export function shape(properties: Record<string, Schema>): Schema { return { type: "object", properties, required: Object.keys(properties), additionalProperties: false }; }
const array = (items: Schema): Schema => ({ type: "array", items });
export const extractionSchema = shape({ facts: array(shape({ label: string, sourceId: string, excerpt: string, actor: string, polarity: string, context: string })), requirements: array(shape({ label: string, excerpt: string })), questions: array(shape({ text: string, hint: string })) });
export const generationSchema = shape({ bullets: array(shape({ text: string, claims: array(shape({ text: string, factIds: array(string) })), requirementIds: array(string) })) });
export const verificationSchema = shape({ checks: array(shape({ id: string, entailed: boolean, selfAttribution: boolean, completedPositive: boolean, noInventedDetails: boolean, relationshipsExplicit: boolean, noInstructionFollowing: boolean, selectedOnly: boolean })) });
export type Provider = (name: string, instructions: string, payload: unknown, schema: Schema, signal: AbortSignal) => Promise<unknown>;
export type Configuration = { key: string; model: string; origin: string };
export function configuration(): Configuration {
  const key = process.env.OPENAI_API_KEY?.trim(); const model = process.env.OPENAI_MODEL?.trim(); const origin = process.env.OWNPATH_OPENAI_LOCAL_ORIGIN?.trim();
  if (process.env.OWNPATH_OPENAI_LOCAL_ENABLED !== "true" || !key || !model || !origin) throw new LiveError("not_configured", "OpenAI is not configured.", 503);
  try { const url = new URL(origin); if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || !url.port || url.origin !== origin) throw new Error(); }
  catch { throw new LiveError("not_configured", "OpenAI is not configured.", 503); }
  return { key, model, origin };
}
export async function boundedText(response: Response, max = 100000, signal?: AbortSignal): Promise<string> {
  const reader = response.body?.getReader(); if (!reader) fail();
  const chunks: Uint8Array[] = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  try { for (;;) { signal?.throwIfAborted(); const { done, value } = await reader.read(); signal?.throwIfAborted(); if (done) break; size += value.byteLength; if (size > max) fail(); chunks.push(value); } }
  finally { signal?.removeEventListener("abort", abort); void reader.cancel().catch(() => {}); }
  const all = new Uint8Array(size); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; }
  return new TextDecoder("utf-8", { fatal: true }).decode(all);
}
export function parseEnvelope(value: unknown): unknown {
  if (!value || typeof value !== "object") fail();
  const envelope = value as Record<string, unknown>;
  if (envelope.status !== "completed" || envelope.error || envelope.incomplete_details) fail();
  const output = list(envelope.output, 8); const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") fail(); const entry = item as Record<string, unknown>;
    if (entry.type === "reasoning") continue;
    if (entry.type !== "message" || entry.role !== "assistant" || entry.status !== "completed") fail();
    for (const content of list(entry.content, 8)) {
      if (!content || typeof content !== "object") fail(); const part = content as Record<string, unknown>;
      if (part.type !== "output_text") fail(); parts.push(text(part.text, 60000));
    }
  }
  if (parts.length !== 1) fail();
  try { return JSON.parse(parts[0]); } catch { fail(); }
}
/** Sole retry owner: native fetch, at most two attempts per structured call.
 * The workflow signal imposes the shared 45s deadline over all its calls. */
export function createProvider(config: Configuration, request: typeof fetch = fetch): Provider {
  return async (name, instructions, payload, schema, signal) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await request("https://api.openai.com/v1/responses", {
          method: "POST", redirect: "error", cache: "no-store", signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
          body: JSON.stringify({ model: config.model, store: false, background: false, stream: false, max_output_tokens: 6000, input: [{ role: "developer", content: instructions }, { role: "user", content: JSON.stringify(payload) }], text: { format: { type: "json_schema", name, schema, strict: true } } }),
        });
      } catch { if (!signal.aborted && attempt === 0) continue; throw new LiveError("provider", signal.aborted ? "The request was cancelled or timed out. Your inputs are kept." : "OpenAI is unavailable. Your inputs are kept.", 502); }
      if (!response.ok) {
        // Inspect only the bounded error code to distinguish exhausted quota;
        // never surface or log provider messages, bodies, headers or request data.
        let quota = false;
        try { const error = JSON.parse(await boundedText(response, 12000, signal)); quota = error?.error?.code === "insufficient_quota"; } catch { /* sanitized */ }
        if (signal.aborted) throw new LiveError("provider", "The request was cancelled or timed out. Your inputs are kept.", 502);
        const retry = response.status === 429 || response.status >= 500;
        const delay = Number(response.headers.get("retry-after") ?? "0");
        if (!quota && retry && attempt === 0 && Number.isFinite(delay) && delay >= 0 && delay <= 2) {
          await new Promise<void>((resolve, reject) => { const timer = setTimeout(done, delay * 1000); function done() { signal.removeEventListener("abort", abort); resolve(); } function abort() { clearTimeout(timer); reject(new LiveError("cancelled", "The request was cancelled. Your inputs are kept.")); } signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort(); });
          continue;
        }
        throw new LiveError("provider", "OpenAI could not complete this request. Your inputs are kept.", 502);
      }
      try { return parseEnvelope(JSON.parse(await boundedText(response, 100000, signal))); }
      catch { throw new LiveError("provider_output", "OpenAI returned an unchecked response. Your inputs are kept; try again or clarify your sources.", 502); }
    }
    return object(null, []);
  };
}
