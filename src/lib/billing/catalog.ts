// Canonical draft catalog. The additive migration contains its deployment snapshot
// for atomic database enforcement; contract tests keep that snapshot in sync.
export const catalog = {
  version: "2026-10-draft-1",
  durationSeconds: 30 * 24 * 60 * 60,
  currency: "VND",
  free: { scans: 3, rewrites: 1, saves: 3 },
  pro: { scans: 30, rewrites: 15, saves: 30 },
} as const satisfies { version: string; durationSeconds: number; currency: "VND"; free: Benefits; pro: Benefits };
export type Benefits = { scans: number; rewrites: number; saves: number };
export type BillingMode = "OFF" | "LOCAL_FAKE" | "LIVE";
export const illustrativePrice = 79000; // Never a live-price default.
export type PlanSummary = { plan: "Free" | "Pro"; starts_at: string; ends_at: string; period_key: string; scans: number; rewrites: number; saves: number; scan_used: number; rewrite_used: number; saved_count: number; next_start: string | null; next_end: string | null };
