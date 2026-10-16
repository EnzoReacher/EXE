import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import type { Firestore, Transaction, DocumentData } from "firebase-admin/firestore";
import type { DeleteSessionRequest, DeleteSessionResponse, SavedSessionResponse, SavedSessionSummary, SaveSessionRequest, SessionListRequest, SessionListResponse, UpdateSessionRequest } from "./contracts";
import { parseDeleteSession, parseSaveSession, parseSessionId, parseSessionList, parseSnapshot, parseUpdateSession } from "./contracts.validation";
import { failure } from "./server-errors";
import { requireVerified } from "./server-identity";
import type { ServerIdentity } from "./server-identity";
import { hash } from "./server-security";

/** Must read/check entitlement in this SAME transaction. Never a browser-supplied decision. */
export type WriteAuthorization = (transaction: Transaction, identity: ServerIdentity) => Promise<{ limit: number }>;
/** Server-owned policy, independent of current Pro authorization so downgraded owners retain history. */
export type ReadQuotaPolicy = (identity: ServerIdentity) => Promise<{ limit: number }>;
const retentionMs = 24 * 60 * 60 * 1000;
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function validDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function summary(data: DocumentData | undefined, identity: ServerIdentity, id: string): SavedSessionSummary {
  if (!data || data.ownerUid !== identity.uid) return failure("NOT_FOUND");
  if (data.id !== id || typeof data.title !== "string" || !data.title.trim() || data.title.length > 120 || !Number.isSafeInteger(data.revision) || data.revision < 1 || !validDate(data.createdAt) || !validDate(data.updatedAt)) return failure("SERVICE_UNAVAILABLE", true);
  return { id, title: data.title, revision: data.revision, createdAt: data.createdAt, updatedAt: data.updatedAt };
}
function count(data: DocumentData | undefined): number {
  const value = data?.savedSessionCount;
  if (!Number.isSafeInteger(value) || value < 0) return failure("SERVICE_UNAVAILABLE", true);
  return value;
}
function matchingOperation(data: DocumentData | undefined, payloadHash: string, now: number): boolean {
  if (!data) return false;
  if (!Number.isSafeInteger(data.expiresAtMs) || data.expiresAtMs < 0 || typeof data.payloadHash !== "string" || !/^[a-f0-9]{64}$/.test(data.payloadHash)) return failure("SERVICE_UNAVAILABLE", true);
  if (data.expiresAtMs <= now) return false;
  if (data.payloadHash !== payloadHash) failure("OPERATION_CONFLICT");
  return true;
}
export class SavedSessionRepository {
  constructor(private readonly db: Firestore, private readonly authorizeWrite: WriteAuthorization, private readonly now: () => number = Date.now, private readonly readQuota: ReadQuotaPolicy = async () => ({ limit: 50 })) {}
  private user(identity: ServerIdentity) {
    requireVerified(identity);
    if (!identity.uid || identity.uid.includes("/") || identity.uid.length > 128) return failure("UNAUTHENTICATED");
    return this.db.collection("users").doc(identity.uid);
  }
  async create(identity: ServerIdentity, input: SaveSessionRequest): Promise<SavedSessionResponse> {
    return this.write(identity, parseSaveSession(input));
  }
  async update(identity: ServerIdentity, id: string, input: UpdateSessionRequest): Promise<SavedSessionResponse> {
    return this.write(identity, parseUpdateSession(input), parseSessionId(id));
  }
  private async write(identity: ServerIdentity, input: SaveSessionRequest | UpdateSessionRequest, id?: string): Promise<SavedSessionResponse> {
    const user = this.user(identity);
    const snapshot = parseSnapshot(input.snapshot);
    const payloadHash = hash(canonicalJson({ ...input, snapshot }));
    const opRef = user.collection("sessionOperations").doc(hash(`${id ? `update:${id}` : "create"}:${input.operationId}`));
    const proposedId = id ?? randomUUID();
    const sessionRef = user.collection("sessions").doc(proposedId);
    return this.db.runTransaction(async transaction => {
      const allowed = await this.authorizeWrite(transaction, identity);
      if (!Number.isSafeInteger(allowed.limit) || allowed.limit < 1 || allowed.limit > 50) return failure("PRO_REQUIRED");
      const now = this.now();
      const operation = await transaction.get(opRef);
      if (matchingOperation(operation.data(), payloadHash, now)) {
        const result = summary(operation.data()?.result, identity, operation.data()?.result?.id);
        // Original snapshot is supplied by the hash-matched retry, not duplicated in operational records.
        return { session: { ...result, snapshot } };
      }
      const [profile, existing] = await Promise.all([transaction.get(user), transaction.get(sessionRef)]);
      const used = count(profile.data());
      let result: SavedSessionSummary;
      const date = new Date(now).toISOString();
      if (id) {
        const previous = summary(existing.data(), identity, id);
        if (previous.revision !== (input as UpdateSessionRequest).expectedRevision) return failure("REVISION_CONFLICT");
        if (previous.revision >= Number.MAX_SAFE_INTEGER) return failure("REVISION_CONFLICT");
        result = { ...previous, title: input.title, revision: previous.revision + 1, updatedAt: date };
      } else {
        if (used >= allowed.limit) return failure("QUOTA_EXCEEDED");
        if (existing.exists) return failure("OPERATION_CONFLICT");
        result = { id: proposedId, title: input.title, revision: 1, createdAt: date, updatedAt: date };
        transaction.update(user, { savedSessionCount: used + 1 });
      }
      transaction.set(sessionRef, { ...result, ownerUid: identity.uid, snapshot });
      transaction.set(opRef, { payloadHash, result: { ...result, ownerUid: identity.uid }, expiresAtMs: now + retentionMs, expiresAt: new Date(now + retentionMs) });
      return { session: { ...result, snapshot } };
    });
  }
  async get(identity: ServerIdentity, id: string): Promise<SavedSessionResponse> {
    const user = this.user(identity);
    id = parseSessionId(id);
    const doc = await user.collection("sessions").doc(id).get();
    const value = summary(doc.data(), identity, id);
    return { session: { ...value, snapshot: parseSnapshot(doc.data()?.snapshot) } };
  }
  async delete(identity: ServerIdentity, id: string, input: DeleteSessionRequest): Promise<DeleteSessionResponse> {
    const user = this.user(identity);
    id = parseSessionId(id);
    input = parseDeleteSession(input);
    const ref = user.collection("sessions").doc(id);
    const opRef = user.collection("sessionOperations").doc(hash(`delete:${id}:${input.operationId}`));
    const payloadHash = hash(canonicalJson(input));
    return this.db.runTransaction(async transaction => {
      const now = this.now();
      const op = await transaction.get(opRef);
      if (matchingOperation(op.data(), payloadHash, now)) return { id, deleted: true };
      const [doc, profile] = await Promise.all([transaction.get(ref), transaction.get(user)]);
      const previous = summary(doc.data(), identity, id);
      if (previous.revision !== input.expectedRevision) return failure("REVISION_CONFLICT");
      const used = count(profile.data());
      if (used < 1) return failure("SERVICE_UNAVAILABLE", true);
      transaction.delete(ref);
      transaction.update(user, { savedSessionCount: used - 1 });
      transaction.set(opRef, { payloadHash, expiresAtMs: now + retentionMs, expiresAt: new Date(now + retentionMs) });
      return { id, deleted: true };
    });
  }
  async list(identity: ServerIdentity, input: SessionListRequest): Promise<SessionListResponse> {
    const user = this.user(identity);
    input = parseSessionList(input);
    const limit = input.limit ?? 20;
    let query = user.collection("sessions").orderBy("updatedAt", "desc").orderBy(FieldPath.documentId(), "desc");
    if (input.cursor) {
      if (!/^[a-f0-9]{64}$/.test(input.cursor)) return failure("INVALID_REQUEST");
      const cursor = await user.collection("sessionCursors").doc(hash(input.cursor)).get();
      const value = cursor.data();
      if (!value || !Number.isSafeInteger(value.expiresAtMs) || value.expiresAtMs <= this.now() || typeof value.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id) || !validDate(value.updatedAt)) return failure("INVALID_REQUEST");
      query = query.startAfter(value.updatedAt, value.id);
    }
    const [docs, profile, quota] = await Promise.all([query.limit(limit + 1).get(), user.get(), this.readQuota(identity)]);
    if (!quota || !Number.isSafeInteger(quota.limit) || quota.limit < 1 || quota.limit > 50) return failure("SERVICE_UNAVAILABLE", true);
    const sessions = docs.docs.slice(0, limit).map(doc => summary(doc.data(), identity, doc.id));
    let nextCursor: string | null = null;
    if (docs.size > limit) {
      const last = sessions[sessions.length - 1];
      nextCursor = randomBytes(32).toString("hex");
      const expiresAtMs = this.now() + 1800000;
      await user.collection("sessionCursors").doc(hash(nextCursor)).create({ id: last.id, updatedAt: last.updatedAt, expiresAtMs, expiresAt: new Date(expiresAtMs) });
    }
    return { sessions, nextCursor, quota: { used: count(profile.data()), limit: quota.limit } };
  }
}
