import type { FindingStatus } from "@/lib/analysis/types";

export const evidenceLabels: Record<FindingStatus, string> = {
  supported: "Supported",
  partly_supported: "Partly supported",
  unclear: "Unclear",
  missing: "Missing",
};
