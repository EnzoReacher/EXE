export const DISPLAY_NAME_LIMIT = 80;
export function displayName(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || !("display_name" in metadata)) return "";
  const value = metadata.display_name;
  return typeof value === "string" && value.length <= DISPLAY_NAME_LIMIT ? value.trim() : "";
}
export function validateDisplayName(value: string): string {
  const name = value.trim();
  if (name.length > DISPLAY_NAME_LIMIT || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error("Use no more than 80 characters, on one line.");
  return name;
}
export function accountInitials(name: string, email?: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const letters = parts.length ? [parts[0], ...(parts.length > 1 ? [parts[parts.length - 1]] : [])].map(part => Array.from(part)[0]).join("") : Array.from(email?.split("@")[0] || "").slice(0, 2).join("");
  return letters.toLocaleUpperCase() || "?";
}
