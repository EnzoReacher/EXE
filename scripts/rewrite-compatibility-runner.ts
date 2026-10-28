// Owner-authorized synthetic compatibility experiment only. Never imported by web routes.
import { mkdir, lstat, open, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuration, type Configuration } from "@/lib/scan-rewrite/provider";
import { createClaudeProvider, type ClaudeUsage } from "@/lib/scan-rewrite/claude";
import { boundedText } from "@/lib/experience-translator/server/openai";
import { performRewrite, rewriteSchema } from "@/lib/scan-rewrite/rewrite-workflow";
import { OutputValidationError } from "@/lib/scan-rewrite/domain";
import { operationDiagnostics, diagnosticStage, diagnosticField, diagnosticSnapshot } from "@/lib/scan-rewrite/diagnostics";
import { syntheticRewritePayload } from "./diagnose-claude-rewrite-runner";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sources = ["scripts/rewrite-compatibility-runner.ts", "scripts/diagnose-claude-rewrite-runner.ts", "src/lib/scan-rewrite/rewrite-contract.ts", "src/lib/scan-rewrite/rewrite-workflow.ts", "src/lib/scan-rewrite/domain.ts", "src/lib/scan-rewrite/claude.ts", "src/lib/scan-rewrite/provider.ts"];
async function fingerprints() {
  return Object.fromEntries(await Promise.all(sources.map(async file => [file, hash(await readFile(path.join(root, file)))])));
}

/** Free technical wording is retained privately, not allowlisted away. This is
 * defense-in-depth redaction, not a general-purpose secret detector. */
export function redactDiagnosticMessage(message: string, key: string) {
  let safe = message;
  // Replace BEFORE bounding so a cut credential cannot leave a visible prefix.
  for (const secret of [key, encodeURIComponent(key), JSON.stringify(key).slice(1, -1)]) {
    if (secret) safe = safe.split(secret).join("[REDACTED]");
  }
  safe = safe.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/giu, "[REDACTED]")
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;"'<>]+/giu, "[REDACTED]")
    .replace(/\b(?:sk[-_][A-Za-z0-9_-]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|AKIA[A-Z0-9]{16})\b/gu, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, "[REDACTED]")
    .replace(/\b(?:[a-z0-9_-]*(?:api[_-]?key|token|password|secret|cookie|authorization)[a-z0-9_-]*)["']?\s*[:=]\s*["']?[^\s,"';}]+/giu, "[REDACTED]")
    .replace(/https?:\/\/[^\s"'<>]+/giu, "[URL REDACTED]")
    .replace(/[A-Za-z0-9_+\/-]{40,}={0,2}/gu, "[REDACTED]")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, "");
  safe = safe.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[EMAIL REDACTED]");
  return safe.slice(0, 4096);
}

export async function runRewriteCompatibility({ args, getConfig = configuration, request = fetch, outputDirectory = path.join(root, ".local-diagnostics") }: { args: readonly string[]; getConfig?: () => Configuration; request?: typeof fetch; outputDirectory?: string }) {
  if (args.length !== 1 || args[0] !== "--execute-compatibility-rewrite-once") return { outcome: "not_executed", code: "explicit_flag_required" };
  const config = getConfig();
  if (config.provider !== "anthropic" || config.model !== "claude-haiku-4-5-20251001" || !config.key || config.key.length > 4096 || /[\r\n]/u.test(config.key)) throw new Error("Pinned configuration required.");
  if (JSON.stringify(rewriteSchema).includes('"pattern"')) throw new Error("Compatibility schema required.");
  const payload = syntheticRewritePayload(); // exact fictional CV/JD + locally validated Scan
  const source = await fingerprints();
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const directory = await lstat(outputDirectory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077)) throw new Error("Unsafe diagnostic directory.");
  const resultFile = path.join(outputDirectory, "rewrite-compatibility-20261025.json");
  const file = await open(resultFile, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const report: Record<string, unknown> = { operation: "rewrite", step: "A", outcome: "not_dispatched", inferenceRequests: 0, taskDispatchLimit: 3, terminalDispatchLimit: 1, model: config.model, maxOutputTokens: 8000, source, schemaSha256: hash(JSON.stringify(rewriteSchema)), syntheticOnly: true, reservation: "not_used_terminal_diagnostic", billingOutcome: "not_reconciled", resultFile };
  let attempts = 0; let usage: ClaudeUsage = {}; let providerErrorMessage: string | undefined;
  let result: Awaited<ReturnType<typeof performRewrite>> | undefined;
  const save = async () => {
    const content = JSON.stringify({ ...report, ...(providerErrorMessage !== undefined ? { providerErrorMessage } : {}), ...(result && report.outcome === "accepted" ? { result } : {}) }, null, 2);
    if (Buffer.byteLength(content) > 262144) throw new Error("Diagnostic size bound exceeded.");
    await file.truncate(0); await file.write(content, 0, "utf8"); await file.sync();
  };
  try {
    await save();
    return await operationDiagnostics("rewrite", async () => {
      const oneRequest: typeof fetch = async (url, options) => {
        if (attempts || url !== "https://api.anthropic.com/v1/messages" || options?.method !== "POST" || options.redirect !== "error" || typeof options.body !== "string" || Buffer.byteLength(options.body) > 32000) throw new Error("Diagnostic boundary rejected.");
        const body = JSON.parse(options.body);
        if (body.model !== config.model || body.max_tokens !== 8000 || body.thinking?.type !== "disabled" || body.stream !== false || body.tools || body.cache_control || JSON.stringify(body.output_config?.format?.schema) !== JSON.stringify(rewriteSchema)) throw new Error("Diagnostic envelope rejected.");
        if (JSON.stringify(await fingerprints()) !== JSON.stringify(source)) throw new Error("Source changed before dispatch.");
        Object.assign(report, { outcome: "dispatching_unconfirmed", inferenceRequests: 1, requestSha256: hash(options.body) });
        await save(); attempts++;
        const response = await request(url, options);
        if (response.ok) return response;
        let errorBody = "{}";
        try {
          errorBody = await boundedText(response, 8192, AbortSignal.any([options.signal!, AbortSignal.timeout(2000)]));
          const parsed = JSON.parse(errorBody);
          if (typeof parsed?.error?.message === "string") providerErrorMessage = redactDiagnosticMessage(parsed.error.message, config.key);
        } catch { report.privateErrorCapture = "unavailable_bounded_body"; }
        // Only the redacted error.message is saved, never the raw body or headers.
        report.httpStatus = response.status; report.privateErrorCapture ??= providerErrorMessage === undefined ? "message_absent" : "retained_redacted";
        await save();
        return new Response(errorBody, { status: response.status, headers: response.headers });
      };
      diagnosticStage("input");
      try {
        result = await performRewrite(payload, createClaudeProvider(config, oneRequest, value => { usage = value; }), AbortSignal.timeout(45000));
        diagnosticStage("application_response"); report.outcome = "accepted";
      } catch (error) {
        report.outcome = "rejected";
        if (error instanceof OutputValidationError) { diagnosticStage(error.stage); diagnosticField(error.fieldPath, error.rule, error); }
      }
      Object.assign(report, diagnosticSnapshot(), { inferenceRequests: attempts, usage, reservation: "not_used_terminal_diagnostic" });
      await save();
      // Public terminal metadata deliberately excludes even the redacted free text.
      return report;
    });
  } finally { await file.close(); }
}
