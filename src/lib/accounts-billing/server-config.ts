import "server-only";

export class AccountsUnavailable extends Error {
  constructor() { super("Accounts are not configured for this environment."); }
}
export type AccountsConfig = { projectId: string; origin: string; sessionMilliseconds: number; emulator: true };
export function isLoopback(host: string): boolean { return ["localhost", "127.0.0.1", "[::1]"].includes(host); }
export function accountsConfig(env: Readonly<Record<string, string | undefined>> = process.env): AccountsConfig {
  if (env.OWNPATH_ACCOUNTS_MODE !== "emulator") throw new AccountsUnavailable();
  const projectId = env.OWNPATH_FIREBASE_PROJECT_ID;
  if (!projectId || !/^demo-[a-z0-9-]+$/.test(projectId)) throw new AccountsUnavailable();
  for (const name of ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST"] as const) {
    const value = env[name];
    if (!value || !/^(localhost|127\.0\.0\.1|\[::1\]):[1-9][0-9]{0,4}$/.test(value)) throw new AccountsUnavailable();
    const port = Number(value.slice(value.lastIndexOf(":") + 1));
    if (port > 65535) throw new AccountsUnavailable();
  }
  let origin: URL;
  try { origin = new URL(env.OWNPATH_APP_ORIGIN ?? ""); } catch { throw new AccountsUnavailable(); }
  if (!isLoopback(origin.hostname) || !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new AccountsUnavailable();
  const days = Number(env.OWNPATH_SESSION_DAYS ?? "5");
  // Firebase session cookies support five minutes through fourteen days.
  if (!Number.isFinite(days) || days < 5 / 1440 || days > 14) throw new AccountsUnavailable();
  return { projectId, origin: origin.origin, sessionMilliseconds: Math.floor(days * 86400000), emulator: true };
}
