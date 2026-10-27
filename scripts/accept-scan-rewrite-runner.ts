import { mkdir, lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuration, type Configuration } from "@/lib/scan-rewrite/provider";
import { createClaudeProvider, type ClaudeUsage } from "@/lib/scan-rewrite/claude";
import { performScan } from "@/lib/scan-rewrite/scan-workflow";
import { performRewrite } from "@/lib/scan-rewrite/rewrite-workflow";
import { OutputValidationError } from "@/lib/scan-rewrite/domain";
import { operationDiagnostics, diagnosticStage, diagnosticField, diagnosticSnapshot } from "@/lib/scan-rewrite/diagnostics";
import { syntheticRewritePayload } from "./diagnose-claude-rewrite-runner";

const root = fileURLToPath(new URL("../", import.meta.url));
export async function runAcceptance({ args, getConfig = configuration, request = fetch, outputDirectory = path.join(root, ".local-diagnostics") }: { args: readonly string[]; getConfig?: () => Configuration; request?: typeof fetch; outputDirectory?: string }) {
  if (args.length !== 1 || args[0] !== "--execute-paid-pair-once") return { outcome: "not_executed", code: "explicit_flag_required" };
  const config = getConfig();
  if (config.provider !== "anthropic" || config.model !== "claude-haiku-4-5-20251001") return { outcome: "not_executed", code: "pinned_provider_required" };
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const directory = await lstat(outputDirectory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077)) return { outcome: "not_executed", code: "unsafe_output_directory" };
  // Exclusive run ledger prevents accidental repeat of this acceptance allowance.
  const resultFile = path.join(outputDirectory, "scan-rewrite-acceptance-20261025.json");
  const file = await open(resultFile, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const reports: Record<string, unknown>[] = [];
  let acceptedScan: Awaited<ReturnType<typeof performScan>> | undefined;
  let acceptedRewrite: Awaited<ReturnType<typeof performRewrite>> | undefined;
  const fixture = syntheticRewritePayload();
  const { cv, jd } = fixture;
  const save = async () => {
    const content = JSON.stringify({ coverage: "terminal_provider_workflows_only", resultFile, reports, syntheticOnly: true, source: { cv, jd }, acceptedScan, acceptedRewrite }, null, 2);
    if (Buffer.byteLength(content) > 262144) throw new Error("Local result bound exceeded.");
    await file.truncate(0); await file.write(content, 0, "utf8"); await file.sync();
  };
  try {
    await save();
    for (const operation of ["scan", "rewrite"] as const) {
      if (operation === "rewrite" && !acceptedScan) break;
      await operationDiagnostics(operation, async () => {
        let attempts = 0; let usage: ClaudeUsage = {};
        const report: Record<string, unknown> = { operation, outcome: "not_dispatched", inferenceRequests: 0, model: config.model, maxOutputTokens: 8000, reservation: "not_used_terminal_diagnostic", billingOutcome: "not_reconciled" };
        reports.push(report); await save();
        const oneRequest: typeof fetch = async (url, options) => {
          if (attempts || url !== "https://api.anthropic.com/v1/messages" || options?.method !== "POST" || typeof options.body !== "string" || Buffer.byteLength(options.body) > 32000) throw new Error("Diagnostic boundary rejected.");
          const body = JSON.parse(options.body);
          if (body.model !== config.model || body.max_tokens !== 8000 || body.stream !== false || body.thinking?.type !== "disabled" || body.tools || body.cache_control || options.redirect !== "error") throw new Error("Diagnostic boundary rejected.");
          attempts++; Object.assign(report, { outcome: "dispatching_unconfirmed", inferenceRequests: attempts }); await save();
          return request(url, options);
        };
        diagnosticStage("input");
        try {
          const provider = createClaudeProvider(config, oneRequest, value => { usage = value; });
          if (operation === "scan") acceptedScan = await performScan({ cv, jd, consent: true }, provider, AbortSignal.timeout(45000));
          else acceptedRewrite = await performRewrite({ ...fixture, scan: acceptedScan }, provider, AbortSignal.timeout(45000));
          diagnosticStage("application_response"); report.outcome = "accepted";
        } catch (error) {
          report.outcome = "rejected";
          if (error instanceof OutputValidationError) { diagnosticStage(error.stage); diagnosticField(error.fieldPath, error.rule, error); }
        }
        Object.assign(report, diagnosticSnapshot(), { reservation: "not_used_terminal_diagnostic", usage }); await save();
      });
    }
    return { coverage: "terminal_provider_workflows_only", reports, resultFile };
  } finally { await file.close(); }
}
