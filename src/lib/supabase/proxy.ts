import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http/security-headers";
import { authReturnPath } from "./auth-redirect";

const privatePages = ["/app", "/assessment", "/saved-work", "/analysis", "/credential-versions", "/expert", "/opportunities"];

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isAccountPage = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/account"].includes(path) || path.startsWith("/auth/");
  const accountHeaders = () => {
    if (isAccountPage || path === "/app" || path.startsWith("/app/")) {
      PRIVATE_NO_STORE_HEADERS.forEach(({ key, value }) => response.headers.set(key, value));
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return accountHeaders();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, cacheHeaders) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  let authenticated = false;
  try {
    // Refresh/verify the cookie session. Route handlers still authorize every protected operation.
    const { data, error } = await supabase.auth.getClaims();
    authenticated = !error && Boolean(data?.claims?.sub);
  } catch {
    // A transient Auth outage must not turn this session-refresh layer into an authorization grant.
  }

  // Print is an authenticated Route Handler with its own 401/404 response
  // contract, rather than a workspace page. Do not replace it with a redirect.
  const isPrintEndpoint = /^\/credential-versions\/[^/]+\/print\/?$/.test(path);
  if (!authenticated && !isPrintEndpoint && privatePages.some((prefix) => path === prefix || path.startsWith(prefix + "/"))) {
    const target = new URL("/sign-in", request.url);
    if (path === "/app" || path.startsWith("/app/")) target.searchParams.set("next", authReturnPath(path));
    // NextURL normalizes loopback hosts to localhost. Preserve the browser's
    // actual request host so redirects do not cross Auth cookie scopes.
    // Next normalizes numeric loopback to localhost. Restore only that narrow
    // equivalent, with the same port; never accept arbitrary forwarded hosts.
    const rawHost = request.headers.get("host");
    if (target.hostname === "localhost" && rawHost === `127.0.0.1${target.port ? ":" + target.port : ""}`) target.hostname = "127.0.0.1";
    const redirect = NextResponse.redirect(target);
    // Retain rotations/deletions from the refresh layer when redirecting.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, name) => {
      if (["cache-control", "expires", "pragma"].includes(name)) redirect.headers.set(name, value);
    });
    PRIVATE_NO_STORE_HEADERS.forEach(({ key, value }) => redirect.headers.set(key, value));
    return redirect;
  }

  return accountHeaders();
}
