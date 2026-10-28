import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { jsonTypes, outputConstraints, type OutputRule, type JsonType, type OutputConstraint } from "./domain";
import { providerErrorTypes, providerErrorClasses, providerErrorSignals, providerParameters, schemaKeywords, safeProviderSchemaPath, type ProviderErrorMetadata } from "./provider-errors";

type Stage = "authentication" | "configuration" | "origin" | "request" | "consent" | "input" | "reservation" | "provider_http" | "provider_body" | "provider_json" | "provider_envelope" | "structured_json" | "output_schema" | "grounding" | "application_response" | "reservation_finish";
type Reservation = "not_reserved" | "reserved" | "completed" | "failed" | "unknown" | "finish_unconfirmed";
type Diagnostic = { reference: string; requestId?: string; operation: "scan" | "rewrite"; stage: Stage; reservation: Reservation; httpStatus?: number; providerRequestId?: string; stopReason?: string; fieldPath?: string; validationRule?: OutputRule; actualType?: JsonType; constraint?: OutputConstraint } & Partial<ProviderErrorMetadata>;
const scope = new AsyncLocalStorage<Diagnostic>();
const reported = new WeakSet<Diagnostic>();
export function operationDiagnostics<T>(operation: "scan" | "rewrite", task: () => Promise<T>) {
  return scope.run({ reference: randomUUID(), operation, stage: "authentication", reservation: "not_reserved" }, task);
}
export function diagnosticStage(stage: Stage) { const current = scope.getStore(); if (current) current.stage = stage; }
export function diagnosticReservation(reservation: Reservation) { const current = scope.getStore(); if (current) current.reservation = reservation; }
/** Only canonical browser-generated UUIDv4 request IDs, never arbitrary input/identity. */
export function diagnosticRequest(id: string) {
  const current = scope.getStore();
  if (current && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id)) current.requestId = id;
}
/** Copy of allowlisted metadata only; the terminal diagnostic never captures logs. */
export function diagnosticSnapshot() { const current = scope.getStore(); return current ? { ...current } : undefined; }
export function diagnosticProviderError(detail: ProviderErrorMetadata) {
  const current = scope.getStore(); if (!current) return;
  current.providerErrorDetails = detail.providerErrorDetails === "available" ? "available" : "unavailable";
  if (providerErrorTypes.includes(detail.providerErrorType as never)) current.providerErrorType = detail.providerErrorType;
  if (providerErrorClasses.includes(detail.providerErrorClass as never)) current.providerErrorClass = detail.providerErrorClass;
  if (Array.isArray(detail.providerErrorSignals)) current.providerErrorSignals = providerErrorSignals.filter(signal => detail.providerErrorSignals!.includes(signal));
  if (providerParameters.includes(detail.providerParameter as never)) current.providerParameter = detail.providerParameter;
  if (safeProviderSchemaPath(detail.providerSchemaPath)) current.providerSchemaPath = detail.providerSchemaPath;
  if (schemaKeywords.includes(detail.providerSchemaKeyword as never)) current.providerSchemaKeyword = detail.providerSchemaKeyword;
}
export function diagnosticHttp(status: number, id: string | null) {
  const current = scope.getStore(); if (!current) return;
  if (Number.isInteger(status) && status >= 100 && status <= 599) current.httpStatus = status;
  if (id && /^req_[A-Za-z0-9_-]{1,120}$/u.test(id)) current.providerRequestId = id;
}
export function diagnosticStop(value: unknown) {
  const current = scope.getStore(); if (!current) return;
  current.stopReason = typeof value === "string" && ["end_turn", "max_tokens", "refusal", "tool_use", "pause_turn", "stop_sequence", "model_context_window_exceeded"].includes(value) ? value : "unrecognized";
}
export function diagnosticField(path: string, rule?: OutputRule, detail?: { actualType?: JsonType; constraint?: OutputConstraint }) {
  const structured = /^(?:cv\.)?(?:header(?:\.(?:name|title|contacts|nameSourceId|titleSourceId|contactSourceIds)(?:\[\d{1,3}\])?)?|sections(?:\.sourceCoverage|(?:\[\d{1,3}\])?(?:\.heading|\.entries(?:\[\d{1,3}\])?(?:\.(?:title|context|date|paragraphs|bullets|sourceIds)(?:\[\d{1,3}\])?)?)?)|document\.lines)$/u.test(path);
  const current = scope.getStore(); if (current && (structured || /^(?:\$|document|coverage|findings(?:\[\d{1,3}\])?(?:\.(?:title|requirement|requirementSourceId|excerpt|excerptSourceId|explanation|nextStep|group|priority|expectation))?|replacements(?:\[\d{1,3}\])?(?:\.(?:lineId|original|text))?|changes(?:\[\d{1,3}\])?|notes(?:\[\d{1,3}\])?)$/u.test(path))) {
    current.fieldPath = path;
    if (rule && ["field_shape", "enum", "jd_quote", "cv_quote", "supported_context", "not_found_excerpt", "line_reference", "line_original", "rewrite_guard"].includes(rule)) current.validationRule = rule;
    if (detail?.actualType && (jsonTypes as readonly string[]).includes(detail.actualType)) current.actualType = detail.actualType;
    if (detail?.constraint && (outputConstraints as readonly string[]).includes(detail.constraint)) current.constraint = detail.constraint;
  }
}
/** Never pass Error objects, request bodies, identity, tickets, headers or output. */
export function reportDiagnostic(outcome: "completed" | "rejected", code: "completed" | "preflight_rejected" | "output_schema" | "grounding" | "provider_failure" | "finish_unconfirmed") {
  const current = scope.getStore(); if (current && !reported.has(current)) { reported.add(current); console.info("ownpath.ai", JSON.stringify({ ...current, outcome, code })); }
}
