import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { failure } from "./server-errors";
import { hash } from "./server-security";

/** Shared durable emulator strategy; unlike an in-memory counter, coordinates all local workers. */
export async function rateLimit(db: Firestore, scope: string, limit: number, now = Date.now()): Promise<void> {
  const window = Math.floor(now / 60000);
  const ref = db.collection("accountRateLimits").doc(hash(`${scope}:${window}`));
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const count = snap.exists ? snap.data()?.count : 0;
    if (!Number.isSafeInteger(count) || count < 0) failure("SERVICE_UNAVAILABLE", true);
    if (count >= limit) failure("RATE_LIMITED", true);
    transaction.set(ref, { count: count + 1, expiresAt: new Date((window + 2) * 60000) });
  });
}
