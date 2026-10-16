import { confirmFacts, prepareSession } from "../experience-translator/engine";
import type { Answers, ReviewedBullet } from "../experience-translator/types";
import { CONTRACT_LIMITS } from "./contracts";
import type { AccountPatchRequest, CheckoutRequest, DeleteSessionRequest, ErrorCode, LogoutRequest, OperationGuard, RestoredSession, SavedSnapshotV1, SaveSessionRequest, SessionExchangeRequest, SessionListRequest, UpdateSessionRequest } from "./contracts";

export class ContractValidationError extends Error {
  constructor(public readonly code: ErrorCode = "INVALID_REQUEST") {
    super("The request could not be validated."); this.name = "ContractValidationError";
  }
}
function invalid(code?: ErrorCode): never { throw new ContractValidationError(code); }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const result = value as Record<string, unknown>;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return invalid();
  if (Object.keys(result).some(key => !keys.includes(key))) return invalid();
  return result;
}
function text(value: unknown, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return invalid();
  return value;
}
function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return invalid();
  return value;
}
export function parseOperationId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return invalid();
  return value.toLowerCase();
}
export function parseSessionId(value: unknown): string { return parseOperationId(value); }
export function parseSessionExchange(value: unknown): SessionExchangeRequest {
  const raw = object(value, ["idToken"]); return { idToken: text(raw.idToken, 1, 12000) };
}
export function parseLogout(value: unknown): LogoutRequest {
  const raw = object(value, ["scope"]);
  if (raw.scope !== "current" && raw.scope !== "all") return invalid();
  return { scope: raw.scope };
}
export function parseAccountPatch(value: unknown): AccountPatchRequest {
  const raw = object(value, ["displayName"]); return { displayName: text(raw.displayName, 0, 80).trim() };
}
export function parseCheckout(value: unknown): CheckoutRequest {
  const raw = object(value, ["planId", "operationId"]);
  if (raw.planId !== "pro") return invalid();
  return { planId: "pro", operationId: parseOperationId(raw.operationId) };
}
export function parsePortal(value: unknown): OperationGuard {
  const raw = object(value, ["operationId"]); return { operationId: parseOperationId(raw.operationId) };
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) return invalid();
  const result = value.map(item => text(item, 1, 160));
  if (new Set(result).size !== result.length) return invalid();
  return result;
}
function candidate(value: unknown): ReviewedBullet {
  const raw = object(value, ["id", "text", "factIds", "requirementIds", "currentText", "edited", "accepted", "rejected", "detached"]);
  if ([raw.edited, raw.accepted, raw.rejected].some(flag => typeof flag !== "boolean") || (raw.detached !== undefined && typeof raw.detached !== "boolean")) return invalid();
  return {
    id: text(raw.id, 1, 160), text: text(raw.text, 0, 500), currentText: text(raw.currentText, 0, 500),
    factIds: strings(raw.factIds), requirementIds: strings(raw.requirementIds), edited: raw.edited as boolean,
    accepted: raw.accepted as boolean, rejected: raw.rejected as boolean,
    ...(raw.detached === undefined ? {} : { detached: raw.detached as boolean }),
  };
}
// Compare JSON trees without depending on the request's object-key ordering.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export function parseSnapshot(value: unknown): SavedSnapshotV1 {
  // Input comes from bounded JSON decoding; reject oversized stored documents too.
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { return invalid(); }
  if (!serialized) return invalid();
  if (new TextEncoder().encode(serialized).byteLength > CONTRACT_LIMITS.snapshotBytes) return invalid("PAYLOAD_TOO_LARGE");
  const raw = object(value, ["schemaVersion", "intake", "answers", "prepared", "candidates"]);
  if (raw.schemaVersion !== 1) return invalid("UNSUPPORTED_SCHEMA");
  const intake = object(raw.intake, ["project", "jd"]);
  const answerInput = object(raw.answers, ["contribution", "technology", "outcome", "reference"]);
  const answers: Answers = {};
  for (const [key, item] of Object.entries(answerInput)) answers[key as keyof Answers] = text(item, 0, 1000);
  let prepared;
  try { prepared = prepareSession(intake, answers); } catch { return invalid(); }
  const stored = object(raw.prepared, ["intake", "sources", "facts", "requirements", "questions"]);
  if (!Array.isArray(stored.facts) || stored.facts.length > 100) return invalid();
  const confirmed: string[] = [];
  for (const value of stored.facts) {
    const fact = object(value, ["id", "code", "label", "sourceId", "excerpt", "start", "end", "confirmed", "evidenceKind"]);
    if (typeof fact.confirmed !== "boolean") return invalid();
    if (fact.confirmed) confirmed.push(text(fact.id, 1, 160));
  }
  try { prepared = confirmFacts(prepared, confirmed); } catch { return invalid(); }
  if (canonical(prepared) !== canonical(stored)) return invalid();
  if (!Array.isArray(raw.candidates) || raw.candidates.length > 50) return invalid();
  const candidates = raw.candidates.map(candidate);
  if (new Set(candidates.map(item => item.id)).size !== candidates.length) return invalid();
  for (const item of candidates) {
    if (item.factIds.some(id => !prepared.facts.some(fact => fact.id === id)) || item.requirementIds.some(id => !prepared.requirements.some(requirement => requirement.id === id))) return invalid();
  }
  return { schemaVersion: 1, intake: prepared.intake, answers, prepared, candidates };
}
export function parseSaveSession(value: unknown): SaveSessionRequest {
  const raw = object(value, ["operationId", "title", "snapshot"]);
  return { operationId: parseOperationId(raw.operationId), title: text(raw.title, 1, 120).trim(), snapshot: parseSnapshot(raw.snapshot) };
}
export function parseUpdateSession(value: unknown): UpdateSessionRequest {
  const raw = object(value, ["operationId", "title", "snapshot", "expectedRevision"]);
  return { ...parseSaveSession({ operationId: raw.operationId, title: raw.title, snapshot: raw.snapshot }), expectedRevision: revision(raw.expectedRevision) };
}
export function parseDeleteSession(value: unknown): DeleteSessionRequest {
  const raw = object(value, ["operationId", "expectedRevision"]);
  return { operationId: parseOperationId(raw.operationId), expectedRevision: revision(raw.expectedRevision) };
}
export function parseSessionList(value: unknown): SessionListRequest {
  const raw = object(value, ["cursor", "limit"]);
  const result: SessionListRequest = {};
  if (raw.cursor !== undefined) result.cursor = text(raw.cursor, 1, 2048);
  if (raw.limit !== undefined) {
    if (typeof raw.limit !== "number" || !Number.isInteger(raw.limit) || raw.limit < 1 || raw.limit > CONTRACT_LIMITS.maxPageSize) return invalid();
    result.limit = raw.limit;
  }
  return result;
}
/** Never hydrate core ReviewedBullet[] from storage: re-review facts and detached wording. */
export function restoreSnapshot(value: unknown): RestoredSession {
  const snapshot = parseSnapshot(value);
  return {
    intake: snapshot.intake, answers: snapshot.answers,
    prepared: prepareSession(snapshot.intake, snapshot.answers),
    wordingDrafts: snapshot.candidates.map(item => ({ id: item.id, currentText: item.currentText, previousGeneratedText: item.text, provenance: "untrusted_saved_wording" })),
    reviewRequired: true,
  };
}
