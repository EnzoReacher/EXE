import { open, mkdir, lstat, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { configuration, type Configuration } from "@/lib/scan-rewrite/provider";
import { createClaudeProvider, type ClaudeUsage } from "@/lib/scan-rewrite/claude";
import { performRewrite, rewriteSchemaFor } from "@/lib/scan-rewrite/rewrite-workflow";
import { parseScan, scanSources, OutputValidationError } from "@/lib/scan-rewrite/domain";
import { operationDiagnostics, diagnosticStage, diagnosticField, diagnosticSnapshot } from "@/lib/scan-rewrite/diagnostics";
import { syntheticRewritePayload } from "./diagnose-claude-rewrite-runner";

const root = fileURLToPath(new URL("../", import.meta.url));
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sourceFiles = ["scripts/claude-diagnostic-loader.mjs", "scripts/diagnose-rewrite-followup.mjs", "scripts/diagnose-rewrite-followup-runner.ts", "scripts/diagnose-claude-rewrite-runner.ts", "src/lib/scan-rewrite/provider.ts", "src/lib/scan-rewrite/claude.ts", "src/lib/scan-rewrite/rewrite-contract.ts", "src/lib/scan-rewrite/rewrite-workflow.ts", "src/lib/scan-rewrite/domain.ts", "src/lib/scan-rewrite/provider-errors.ts", "src/lib/scan-rewrite/diagnostics.ts", "src/lib/cv-review/domain.ts", "src/lib/cv-review/privacy.ts", "src/lib/experience-translator/server/openai.ts", "src/lib/experience-translator/server/validation.ts"];
async function sourceIdentity() {
  const files = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, digest(await readFile(path.join(root, file)))])));
  return { files, sha256: digest(JSON.stringify(files)) };
}
/** Fixed fictional source only; never accept an arbitrary owner CV or fabricated Scan. */
export async function acceptedRewriteInput(acceptedFile: string) {
  const file = await open(acceptedFile, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat(); if (!stat.isFile() || stat.size > 262144 || (stat.mode & 0o077)) throw new Error("Unsafe accepted source.");
    const buffer = Buffer.alloc(262145); const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 262144) throw new Error("Accepted source bound exceeded.");
    const raw = buffer.subarray(0, bytesRead); const artifact = JSON.parse(raw.toString("utf8"));
    const fixture = syntheticRewritePayload();
    const report = artifact.reports?.find((r: Record<string, unknown>) => r.operation === "scan");
    if (artifact.syntheticOnly !== true || artifact.source?.cv !== fixture.cv || artifact.source?.jd !== fixture.jd || report?.outcome !== "accepted" || report?.inferenceRequests !== 1 || report?.httpStatus !== 200 || report?.stopReason !== "end_turn" || report?.model !== "claude-haiku-4-5-20251001") throw new Error("Accepted Scan provenance unavailable.");
    const scan = parseScan(artifact.acceptedScan, fixture, scanSources(fixture));
    return { payload: { ...fixture, scan }, acceptedArtifactSha256: digest(raw), acceptedScanSha256: digest(JSON.stringify(scan)), acceptedScanRequestId: /^req_[A-Za-z0-9_-]{1,120}$/u.test(report.providerRequestId) ? report.providerRequestId as string : undefined };
  } finally { await file.close(); }
}
export async function runRewriteFollowup({ args, getConfig = configuration, request = fetch, outputDirectory = path.join(root, ".local-diagnostics"), acceptedFile = path.join(root, ".local-diagnostics/scan-rewrite-acceptance-20261025.json") }: { args: readonly string[]; getConfig?: () => Configuration; request?: typeof fetch; outputDirectory?: string; acceptedFile?: string }) {
  if (args.length !== 1 || args[0] !== "--execute-paid-rewrite-followup-once") return { outcome: "not_executed", code: "explicit_flag_required" };
  const config = getConfig();
  if (config.provider !== "anthropic" || config.model !== "claude-haiku-4-5-20251001" || !config.key || config.key.length > 4096 || /[\r\n]/u.test(config.key)) return { outcome: "not_executed", code: "pinned_configuration_required" };
  const input = await acceptedRewriteInput(acceptedFile);
  const source = await sourceIdentity();
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 }); const directory = await lstat(outputDirectory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077)) return { outcome: "not_executed", code: "unsafe_output_directory" };
  const resultFile = path.join(outputDirectory, "rewrite-followup-20261025.json");
  // Exclusive fixed ledger refuses a second execution, including after crashes.
  const file = await open(resultFile, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  let attempts = 0; let usage: ClaudeUsage = {}; let result: Awaited<ReturnType<typeof performRewrite>> | undefined;
  const report: Record<string, unknown> = { operation: "rewrite", outcome: "not_dispatched", inferenceRequests: 0, model: config.model, maxOutputTokens: 8000, source, acceptedArtifactSha256: input.acceptedArtifactSha256, acceptedScanSha256: input.acceptedScanSha256, acceptedScanRequestId: input.acceptedScanRequestId, reservation: "not_used_terminal_diagnostic", billingOutcome: "not_reconciled", resultFile };
  const save = async () => {
    const content = JSON.stringify({ ...report, syntheticOnly: true, ...(result && report.outcome === "accepted" ? { result } : {}) }, null, 2);
    if (Buffer.byteLength(content) > 262144) throw new Error("Local result bound exceeded.");
    await file.truncate(0); await file.write(content, 0, "utf8"); await file.sync();
  };
  try {
    await save();
    return await operationDiagnostics("rewrite", async () => {
      const oneRequest: typeof fetch = async (url, options) => {
        if (attempts || url !== "https://api.anthropic.com/v1/messages" || options?.method !== "POST" || typeof options.body !== "string" || Buffer.byteLength(options.body) > 32000 || options.redirect !== "error") throw new Error("Diagnostic boundary rejected.");
        const body = JSON.parse(options.body);
        if (body.model !== config.model || body.max_tokens !== 8000 || body.stream !== false || body.thinking?.type !== "disabled" || body.tools || body.cache_control || JSON.stringify(body.output_config?.format?.schema) !== JSON.stringify(rewriteSchemaFor(syntheticRewritePayload().base))) throw new Error("Diagnostic boundary rejected.");
        if ((await sourceIdentity()).sha256 !== source.sha256) throw new Error("Source changed before dispatch.");
        Object.assign(report, { outcome: "dispatching_unconfirmed", inferenceRequests: 1, requestSha256: digest(options.body), schemaSha256: digest(JSON.stringify(rewriteSchemaFor(syntheticRewritePayload().base))), systemSha256: digest(body.system), payloadSha256: digest(body.messages[0].content) });
        await save(); attempts++;
        return request(url, options);
      };
      diagnosticStage("input");
      try {
        // Same production adapter and workflow, loaded from source by the loader.
        result = await performRewrite(input.payload, createClaudeProvider(config, oneRequest, value => { usage = value; }), AbortSignal.timeout(45000));
        diagnosticStage("application_response"); report.outcome = "accepted";
      } catch (error) {
        report.outcome = "rejected";
        if (error instanceof OutputValidationError) { diagnosticStage(error.stage); diagnosticField(error.fieldPath, error.rule, error); }
      }
      Object.assign(report, diagnosticSnapshot(), { inferenceRequests: attempts, usage, reservation: "not_used_terminal_diagnostic" }); await save();
      return report;
    });
  } finally { await file.close(); }
}
