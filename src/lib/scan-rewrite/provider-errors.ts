import "server-only";
import { boundedText } from "@/lib/experience-translator/server/openai";

// Never retain the provider's free-text message, param values or arbitrary keys.
export const providerErrorTypes = ["invalid_request_error", "authentication_error", "billing_error", "permission_error", "not_found_error", "conflict_error", "request_too_large", "rate_limit_error", "api_error", "timeout_error", "overloaded_error", "unrecognized"] as const;
export const providerParameters = ["model", "max_tokens", "thinking", "thinking.type", "thinking.budget_tokens", "stream", "system", "messages", "output_config", "output_config.format", "output_config.format.type", "output_config.format.schema", "temperature", "top_p", "top_k", "tools", "tool_choice", "anthropic-version", "anthropic-beta", "x-api-key"] as const;
export const schemaKeywords = ["type", "description", "pattern", "required", "additionalProperties", "enum", "items", "properties", "anyOf"] as const;
export const providerErrorClasses = ["schema_complexity", "schema_compilation_timeout", "spend_limit", "schema_regex", "schema_validation"] as const;
// Signals mean only that a fixed term appeared in the bounded message. They are
// not a diagnosis, a schema path or a copy of arbitrary provider text.
export const providerErrorSignals = ["schema", "regex", "pattern", "escape", "unicode", "unsupported", "parse", "compilation", "grammar", "spend_limit", "credit_balance", "token_budget", "thinking"] as const;
const signalTerms: Record<typeof providerErrorSignals[number], RegExp> = {
  schema: /\bschema\b/iu, regex: /\bregex|regular expression/iu, pattern: /\bpattern\b/iu,
  escape: /\bescape|\\[sSdDwW]/u, unicode: /\bunicode\b/iu,
  unsupported: /\bunsupported\b|not supported|does not support/iu,
  parse: /\bpars(?:e|er|ing)\b|syntax error/iu, compilation: /\bcompil(?:e|er|ing|ation)\b/iu,
  grammar: /\bgrammar\b/iu, spend_limit: /spend(?:ing)? limit/iu,
  credit_balance: /credit balance|insufficient credits/iu, token_budget: /max_tokens|token (?:limit|budget)/iu,
  thinking: /\bthinking\b/iu,
};
const schemaFields = ["coverage", "findings", "title", "requirement", "requirementSourceId", "explanation", "nextStep", "priority", "expectation", "group", "excerpt", "excerptSourceId", "replacements", "lineId", "original", "text", "changes", "notes", "header", "nameSourceId", "titleSourceId", "contactSourceIds", "sections", "heading", "entries", "context", "date", "paragraphs", "bullets", "sourceIds"];
const schemaRoot = "output_config.format.schema";
export type ProviderErrorMetadata = {
  providerErrorDetails: "available" | "unavailable";
  providerErrorType?: typeof providerErrorTypes[number];
  providerParameter?: typeof providerParameters[number];
  providerSchemaPath?: string;
  providerSchemaKeyword?: typeof schemaKeywords[number];
  providerErrorClass?: typeof providerErrorClasses[number];
  providerErrorSignals?: typeof providerErrorSignals[number][];
};
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function safeProviderSchemaPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 400 || !value.startsWith(schemaRoot)) return false;
  const suffix = value.slice(schemaRoot.length);
  if (!/^(?:\.[A-Za-z]+|\[\d{1,2}\])*$/u.test(suffix)) return false;
  return (suffix.match(/[A-Za-z]+/gu) || []).every(segment => [...schemaKeywords, ...schemaFields].includes(segment));
}
function schemaPaths(schema: Record<string, unknown>) {
  const paths = new Set<string>([schemaRoot]);
  function walk(node: unknown, path: string, depth: number) {
    const b = object(node); if (!b || depth > 12 || paths.size > 400) return;
    for (const keyword of schemaKeywords) {
      if (!(keyword in b)) continue;
      const next = `${path}.${keyword}`; paths.add(next);
      if (keyword === "properties") {
        const properties = object(b.properties);
        if (properties) for (const field of schemaFields) if (field in properties) { paths.add(`${next}.${field}`); walk(properties[field], `${next}.${field}`, depth + 1); }
      } else if (keyword === "items") walk(b.items, next, depth + 1);
      else if (keyword === "anyOf" && Array.isArray(b.anyOf)) b.anyOf.slice(0, 30).forEach((child, i) => { paths.add(`${next}[${i}]`); walk(child, `${next}[${i}]`, depth + 1); });
    }
  }
  walk(schema, schemaRoot, 0); return [...paths].filter(safeProviderSchemaPath).sort((a, b) => b.length - a.length);
}
function cited(message: string, candidate: string) {
  // Only return a candidate from our trusted request schema, never a captured
  // substring. Boundaries prevent partial matches on unrecognized field names.
  const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_./\\[\\]])${escaped}(?=$|[^A-Za-z0-9_./\\[\\]])`, "u").test(message);
}
export function sanitizeProviderError(value: unknown, schema: Record<string, unknown>): ProviderErrorMetadata {
  const error = object(object(value)?.error);
  if (!error) return { providerErrorDetails: "unavailable" };
  const result: ProviderErrorMetadata = { providerErrorDetails: "available", providerErrorType: providerErrorTypes.includes(error.type as never) ? error.type as ProviderErrorMetadata["providerErrorType"] : "unrecognized" };
  const message = typeof error.message === "string" ? error.message : "";
  result.providerErrorSignals = providerErrorSignals.filter(signal => signalTerms[signal].test(message));
  // Fixed classifications only, not excerpts. A provider assertion is diagnostic
  // evidence, not proof of the cause of a historical request or its billing outcome.
  if (/schema is too complex for compilation/iu.test(message)) result.providerErrorClass = "schema_complexity";
  else if (/schema compilation (?:timed out|timeout)|compilation timeout/iu.test(message)) result.providerErrorClass = "schema_compilation_timeout";
  else if (/(?:organization|workspace|monthly) spend limit|spend limit (?:has been |was )?(?:reached|exceeded)/iu.test(message)) result.providerErrorClass = "spend_limit";
  else if (/\b(?:regex|regular expression|pattern)\b/iu.test(message) && /unsupported|not supported|invalid|error|fail|pars(?:e|ing)|syntax/iu.test(message)) result.providerErrorClass = "schema_regex";
  else if (/invalid (?:json )?schema|schema (?:validation|is invalid)|unsupported (?:schema|constraint|keyword)/iu.test(message)) result.providerErrorClass = "schema_validation";
  for (const path of schemaPaths(schema)) {
    const relative = path.slice(schemaRoot.length + 1);
    const pointer = relative ? `/${relative.replace(/\./gu, "/").replace(/\[(\d+)\]/gu, "/$1")}` : "";
    const aliases = [path, ...(relative ? [relative, `schema.${relative}`, `$.${relative}`] : []), ...(pointer ? [pointer, `/output_config/format/schema${pointer}`] : [])];
    if (aliases.some(alias => error.param === alias || cited(message, alias))) {
      result.providerParameter = "output_config.format.schema"; result.providerSchemaPath = path;
      const last = path.split(".").at(-1);
      if (schemaKeywords.includes(last as never)) result.providerSchemaKeyword = last as ProviderErrorMetadata["providerSchemaKeyword"];
      break;
    }
  }
  if (!result.providerParameter) {
    const parameter = providerParameters.find(param => error.param === param || message.startsWith(`${param}:`) || cited(message, `\`${param}\``));
    if (parameter) result.providerParameter = parameter;
  }
  return result;
}
export async function readProviderError(response: Response, schema: Record<string, unknown>, signal: AbortSignal): Promise<ProviderErrorMetadata> {
  try {
    // At most 8 KiB / 2 seconds, still inside the existing overall deadline.
    // Parsing is local only; no raw body is saved, printed or attached to errors.
    const body = await boundedText(response, 8192, AbortSignal.any([signal, AbortSignal.timeout(2000)]));
    return sanitizeProviderError(JSON.parse(body), schema);
  } catch { return { providerErrorDetails: "unavailable" }; }
}
