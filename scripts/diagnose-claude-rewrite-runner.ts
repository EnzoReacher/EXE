import { mkdir, lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { examples } from "@/lib/cv-review/examples";
import { parseScan, OutputValidationError } from "@/lib/scan-rewrite/domain";
import { createClaudeProvider, type ClaudeUsage } from "@/lib/scan-rewrite/claude";
import { performRewrite } from "@/lib/scan-rewrite/rewrite-workflow";
import { operationDiagnostics, diagnosticStage, diagnosticField, diagnosticSnapshot } from "@/lib/scan-rewrite/diagnostics";

export const diagnosticModel = "claude-haiku-4-5-20251001";
const root = fileURLToPath(new URL("../", import.meta.url));
export function syntheticRewritePayload() {
  const cv = examples.Sales;
  const jd = "Requirements:\nClear communication and accurate records.\nPreferred: supplier negotiation experience.";
  const scan = parseScan({ coverage: "Synthetic selected requirements only; not a live Scan.", findings: [
    { title: "Customer communication", requirement: "Clear communication and accurate records.", requirementSourceId: "jd", excerptSourceId: "cv:b4", excerpt: "Helped customers choose products and kept the stock list up to date.", explanation: "The supplied CV gives a direct customer assistance and record-keeping example.", nextStep: "Keep the direct example without invented metrics.", group: "supported", priority: "important", expectation: "required" },
    { title: "Supplier negotiation", requirement: "Preferred: supplier negotiation experience.", requirementSourceId: "jd", excerptSourceId: "cv:b5", excerpt: "My manager negotiated supplier contracts, not me.", explanation: "Negotiation is explicitly attributed to the manager, not the applicant.", nextStep: "Preserve attribution; add applicant evidence only if true.", group: "unclear", priority: "secondary", expectation: "preferred" },
  ] }, { cv, jd });
  return { cv, jd, consent: true, scanCV: cv, scanJD: jd, scan, base: cv, instructions: "Make the Sales CV clearer and concise. Preserve all facts, dates, qualifications and the manager's attribution/negation. Do not invent metrics or experience.", language: "English" };
}

// Dependency injection exists only in this local script for offline tests. No web
// modules import it; there is no account/reservation client in the import graph.
export async function runOwnerRewriteDiagnostic({ args, getKey = () => process.env.ANTHROPIC_API_KEY, request = fetch, outputDirectory = path.join(root, ".local-diagnostics") }: { args: readonly string[]; getKey?: () => string | undefined; request?: typeof fetch; outputDirectory?: string }) {
  if (args.length !== 1 || args[0] !== "--execute-paid-once") return { outcome: "not_executed", stage: "authorization", code: "explicit_flag_required" };
  const key = getKey()?.trim();
  if (!key || key.length > 4096 || /[\r\n]/u.test(key)) return { outcome: "not_executed", stage: "configuration", code: "key_unavailable" };
  const payload = syntheticRewritePayload();
  // Preflight the local sink before risking a paid dispatch. Never overwrite or
  // follow a result-file symlink, and reject an unsafe/symlinked output directory.
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const directory = await lstat(outputDirectory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077)) return { outcome: "not_executed", stage: "local_output", code: "unsafe_output_directory" };
  const resultFile = path.join(outputDirectory, `claude-rewrite-${randomUUID()}.json`);
  const file = await open(resultFile, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  let attempts = 0;
  let usage: ClaudeUsage = {};
  try {
    return await operationDiagnostics("rewrite", async () => {
      const oneRequest: typeof fetch = async (url, options) => {
        if (attempts || url !== "https://api.anthropic.com/v1/messages" || options?.method !== "POST" || typeof options.body !== "string" || Buffer.byteLength(options.body) > 32000) throw new Error("Diagnostic boundary rejected.");
        const body = JSON.parse(options.body);
        if (body.model !== diagnosticModel || body.max_tokens !== 8000 || body.thinking?.type !== "disabled" || body.stream !== false || body.tools || body.cache_control || options.redirect !== "error") throw new Error("Diagnostic boundary rejected.");
        attempts++;
        return request(url, options);
      };
      let result: Awaited<ReturnType<typeof performRewrite>> | undefined;
      let outcome = "rejected";
      diagnosticStage("input");
      try {
        const transport = createClaudeProvider({ key, model: diagnosticModel, origin: "http://127.0.0.1:4317" }, oneRequest, value => { usage = value; });
        result = await performRewrite(payload, async (...params) => { const value = await transport(...params); diagnosticStage("output_schema"); return value; }, AbortSignal.timeout(45000));
        diagnosticStage("application_response"); outcome = "accepted";
      } catch (error) {
        if (error instanceof OutputValidationError) { diagnosticStage(error.stage); diagnosticField(error.fieldPath, error.rule, error); }
      }
      const metadata = diagnosticSnapshot()!;
      const report = { ...metadata, reservation: "not_used_terminal_diagnostic", outcome, model: diagnosticModel, maxOutputTokens: 8000, inferenceRequests: attempts, usage, billingOutcome: "not_reconciled", resultFile };
      // Only accepted synthetic results are persisted; rejected/raw responses are
      // never saved as partial success or printed to the terminal.
      const content = JSON.stringify({ ...report, syntheticOnly: true, ...(result && outcome === "accepted" ? { source: { cv: payload.cv, jd: payload.jd }, result } : {}) }, null, 2);
      if (Buffer.byteLength(content) > 262144) throw new Error("Local result bound exceeded.");
      await file.writeFile(content); await file.sync();
      return report;
    });
  } finally { await file.close(); }
}
