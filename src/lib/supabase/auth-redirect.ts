const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

type AuthRedirectOptions = {
  siteUrl?: string;
  nodeEnv?: string;
};

function allowedOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    if (parsed.protocol === "https:") return parsed.origin;
    if (parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname)) return parsed.origin;
  } catch {
    return null;
  }

  return null;
}

function safePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  try {
    return new URL(path, "https://exe.invalid").origin === "https://exe.invalid";
  } catch {
    return false;
  }
}

export function getAuthRedirectUrl(
  requestUrl: string,
  path: string,
  options: AuthRedirectOptions = {},
): string | null {
  if (!safePath(path)) return null;

  const configuredSiteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  let requestOrigin: string;
  try {
    requestOrigin = new URL(requestUrl).origin;
  } catch {
    return null;
  }

  const origin = configuredSiteUrl?.trim()
    ? allowedOrigin(configuredSiteUrl.trim())
    : nodeEnv === "production"
      ? null
      : allowedOrigin(requestOrigin);

  return origin ? new URL(path, origin).toString() : null;
}

export function getAuthCallbackUrl(
  browserOrigin: string,
  options: AuthRedirectOptions = {},
): string | null {
  return getAuthRedirectUrl(browserOrigin, "/auth/callback", options);
}

// Exact paths only: no nested queries, decoding, fragments or redirect chains.
// The callback separately allows reset after provider code exchange.
export function authReturnPath(value: unknown, recovery = false): string {
  if (typeof value === "string" && (["/app", "/app/profile", "/app/tailor", "/app/cvs", "/app/account"].includes(value) || /^\/app\/cvs\/[0-9a-f-]{36}$/u.test(value))) return value;
  if (recovery && value === "/reset-password") return value;
  return "/app";
}

export function accountCallbackUrl(browserOrigin: string, next: string, options: AuthRedirectOptions = {}) {
  const base = getAuthCallbackUrl(browserOrigin, options);
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set("next", authReturnPath(next, true));
  return url.toString();
}
