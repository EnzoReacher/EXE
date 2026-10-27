import "server-only";
import { type Provider } from "./provider";
import { record } from "@/lib/cv-review/domain";
import { input } from "./domain";
import { safety as sharedSafety } from "./rewrite-workflow";
import { scanOutputInstructions } from "./scan-contract";
import { scanCatalog, selectionSchema, parseSelection, selectionInstructions, requireSelectableRequirements } from "./scan-selection";

const safety = `${sharedSafety} ${scanOutputInstructions} Address the applicant directly as you/your. Each nextStep is an action the applicant can take to improve their CV, explain their own evidence or plan learning. Never instruct a recruiter to ask, probe, interview, screen or evaluate the candidate. Missing evidence is not proof of missing ability; suggest adding an example only if true, never inventing experience.`;
// Representative schema for diagnostics/tools. Dispatch ALWAYS uses its own catalog.
export const scanSchema = selectionSchema(scanCatalog({ cv: "Experience\nAssisted customers.", jd: "Customer service required." }));

/** Shared by the reserved web path and the explicitly authorized terminal check. */
export async function performScan(payload: unknown, provider: Provider, signal: AbortSignal) {
  const b = record(payload); if (b.consent !== true) throw new Error("Consent is required."); const source = input(b);
  const catalog = scanCatalog(source);
  requireSelectableRequirements(catalog);
  return parseSelection(await provider("ownpath_scan", `${safety} ${selectionInstructions}`, catalog, selectionSchema(catalog), signal), source, catalog);
}
