export type Disclosure = { provider: string; purpose: string; external: boolean };
export function parseDisclosure(value: unknown): Disclosure {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Sharing details could not be checked. Your work is kept; retry.");
  const d = value as Record<string, unknown>;
  if (typeof d.provider !== "string" || !d.provider.trim() || d.provider.length > 80 || typeof d.purpose !== "string" || !d.purpose.trim() || d.purpose.length > 80 || typeof d.external !== "boolean") throw new Error("Sharing details could not be checked. Your work is kept; retry.");
  return { provider: d.provider, purpose: d.purpose, external: d.external };
}
