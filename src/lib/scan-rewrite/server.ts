import "server-only";
import { createHash } from "node:crypto";
import { configuration, createProvider, type Provider } from "./provider";
import { transmission } from "./provider";
import { LiveError } from "@/lib/experience-translator/server/validation";
import { Controls, requestBody, responseError } from "@/lib/experience-translator/server/requestcontrols";
import { getCurrentUser } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/cv-review/request-origin";
import { record, str } from "@/lib/cv-review/domain";
import { input, parseScan, sharedLines, OutputValidationError } from "./domain";
import { reserveUsage } from "./usage";
import { operationDiagnostics, diagnosticStage, diagnosticReservation, diagnosticField, diagnosticRequest, reportDiagnostic } from "./diagnostics";
import { scanCatalog, requireSelectableRequirements } from "./scan-selection";
import { performRewrite } from "./rewrite-workflow";
import { structuredSources } from "./structured-rewrite";
import { performScan } from "./scan-workflow";
export { scanSchema } from "./scan-workflow";
export { rewriteSchema } from "./rewrite-workflow";
export function perform(operation: "scan", payload: unknown, provider: Provider, signal: AbortSignal): ReturnType<typeof performScan>;
export function perform(operation: "rewrite", payload: unknown, provider: Provider, signal: AbortSignal): ReturnType<typeof performRewrite>;
export function perform(operation: "scan" | "rewrite", payload: unknown, provider: Provider, signal: AbortSignal): ReturnType<typeof performScan> | ReturnType<typeof performRewrite>;
export async function perform(operation: "scan" | "rewrite", payload: unknown, provider: Provider, signal: AbortSignal) {
  if (operation === "scan") return performScan(payload, provider, signal);
  return performRewrite(payload, provider, signal);
}
const controls = new Controls();
export function checkedPayload(operation:"scan"|"rewrite",payload:unknown) {
  const b=record(payload);if(b.consent!==true)throw new Error("Consent is required.");const source=input(b);sharedLines(source.cv);
  if(operation==='scan'){requireSelectableRequirements(scanCatalog(source));return {operation,...source,consent:true};}
  if(b.scanCV!==source.cv || b.scanJD!==source.jd)throw new Error("Scan this CV and job description again.");
  const scan=parseScan(b.scan,source),base=str(b.base,24000),instructions=str(b.instructions,4000);structuredSources(base);if(!['English','Vietnamese'].includes(String(b.language)))throw new Error("Choose an output language.");
  return {operation,...source,scan,base,instructions,language:b.language,consent:true};
}
export async function handleOperation(request: Request, operation: "scan" | "rewrite") {
  return operationDiagnostics(operation, async () => {
  try {
    const user = await getCurrentUser(); if (!user) { reportDiagnostic("rejected", "preflight_rejected"); return Response.json({ error: "Your session ended. Sign in again; your work is kept." }, { status: 401, headers: { "Cache-Control": "no-store" } }); }
    diagnosticStage("configuration");
    const config = configuration();
    diagnosticStage("origin");
    if (!sameOrigin(request) || request.headers.get("origin") !== config.origin) { reportDiagnostic("rejected", "preflight_rejected"); return Response.json({ error: "Open OwnPath at its configured address and retry." }, { status: 403, headers: { "Cache-Control": "no-store" } }); }
    diagnosticStage("request");
    const body = record(await requestBody(new Request(config.origin + new URL(request.url).pathname, request), config, request.signal, 350000));
    // Recipient/model changes must not reuse an acknowledgement for another send.
    // Older controlled preview configs have no provider tag and retain their seam.
    diagnosticStage("consent");
    // A deliberate action click acknowledges fresh Privacy details for this request.
    // Reject stale configuration before reserving usage; never silently retry.
    if (config.provider && body.consentPurpose !== transmission().purpose) throw new LiveError("consent_changed", "Processing details changed. Review Privacy details, then click Scan or Rewrite again when ready. No AI request was sent. Your work is kept.", 409);
    diagnosticStage("input");
    const id = str(body.requestId, 80); if (!/^[a-zA-Z0-9-]{16,80}$/u.test(id)) throw new Error("Invalid request.");
    diagnosticRequest(id);
    const digest=createHash('sha256').update(JSON.stringify(checkedPayload(operation,body))).digest('hex');
    const result = await controls.run(undefined, `${user.id}:${operation}:${id}`, body, async () => {
      diagnosticStage("reservation");
      const finish = await reserveUsage(id, operation,digest); diagnosticReservation("reserved");
      const transport = createProvider(config, fetch, 1); let sent = false;
      const provider: Provider = async (...args) => { sent = true; diagnosticStage("provider_http"); const value = await transport(...args); diagnosticStage("output_schema"); return value; };
      let result;
      try {
        request.signal.throwIfAborted();
        result = await perform(operation, body, provider, AbortSignal.any([request.signal, AbortSignal.timeout(45000)]));
        diagnosticStage("application_response");
        // Serialize before acknowledging completion, not after losing the held outcome.
        JSON.stringify(result);
      } catch (error) {
        if (error instanceof OutputValidationError) { diagnosticStage(error.stage); diagnosticField(error.fieldPath, error.rule, error); }
        const outcome = sent ? "unknown" : "failed";
        try { await finish(outcome); diagnosticReservation(outcome); }
        catch { diagnosticStage("reservation_finish"); diagnosticReservation("finish_unconfirmed"); reportDiagnostic("rejected", "finish_unconfirmed"); throw new LiveError("usage_acknowledgement", "The request outcome could not be confirmed. Your work is kept. Usage may be held and processing may have incurred charges; ask the owner to check before another request.", 503); }
        reportDiagnostic("rejected", error instanceof OutputValidationError ? error.stage : sent ? "provider_failure" : "preflight_rejected");
        if (sent && error instanceof OutputValidationError) throw new LiveError("result_rejected", "A result was received but failed safety or validity checks. No new CV result was applied. Processing may have incurred charges and usage is retained; ask the site operator to review before another request.", 502);
        if (sent) throw new LiveError("reconciliation_required", "The AI result could not be verified. Your work is kept. Processing may have incurred charges and usage is held; ask the owner to check before another request.", 502);
        throw error;
      }
      diagnosticStage("reservation_finish");
      try { await finish("completed"); diagnosticReservation("completed"); }
      catch { diagnosticReservation("finish_unconfirmed"); reportDiagnostic("rejected", "finish_unconfirmed"); throw new LiveError("usage_acknowledgement", "The result's usage acknowledgement could not be confirmed. Your work is kept. Do not send another request until the owner checks usage.", 503); }
      diagnosticStage("application_response"); reportDiagnostic("completed", "completed"); return result;
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OutputValidationError) { diagnosticStage("input"); diagnosticField(error.fieldPath, error.rule, error); }
    reportDiagnostic("rejected", "preflight_rejected");
    if (error instanceof Error && !("status" in error)) return responseError(new LiveError("invalid_input", "The request could not be checked before sending. Review your inputs; your work is kept.", 422));
    return responseError(error);
  }
  });
}
