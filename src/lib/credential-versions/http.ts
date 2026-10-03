import { IntakeError } from "@/lib/intake/types";
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export function failure(error: unknown) {
  const safe = error instanceof IntakeError ? error : new IntakeError("unavailable", "This private action is unavailable. Try again.", 500);
  return Response.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS });
}
export async function readAction(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 5000) throw new IntakeError("invalid_input", "Keep this request within the form limits.");
  let input;
  try { input = JSON.parse(text); } catch { throw new IntakeError("invalid_input", "Enter a valid form request."); }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new IntakeError("invalid_input", "Enter a valid form request.");
  return input;
}
