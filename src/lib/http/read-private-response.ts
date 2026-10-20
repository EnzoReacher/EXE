/** Do not surface gateway HTML, parser messages or provider/internal error text. */
export async function readPrivateResponse(response: Response, message: string): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error(message); }
  if (!response.ok || !value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}
