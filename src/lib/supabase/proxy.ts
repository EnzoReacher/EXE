import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http/security-headers";

const privatePages = ["/assessment", "/saved-work", "/analysis", "/credential-versions", "/expert", "/opportunities"];

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Read runtime settings: isolated fixture rendering has no configured Auth.
  const settings = process.env;
  const url = settings.NEXT_PUBLIC_SUPABASE_URL;
  const key = settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

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

  const path = request.nextUrl.pathname;
  if (!authenticated && privatePages.some((prefix) => path === prefix || path.startsWith(prefix + "/"))) {
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    target.search = "";
    const redirect = NextResponse.redirect(target);
    // Retain rotations/deletions from the refresh layer when redirecting.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, name) => {
      if (["cache-control", "expires", "pragma"].includes(name)) redirect.headers.set(name, value);
    });
    PRIVATE_NO_STORE_HEADERS.forEach(({ key, value }) => redirect.headers.set(key, value));
    return redirect;
  }

  if (path === "/sign-in" || path === "/sign-up") {
    PRIVATE_NO_STORE_HEADERS.forEach(({ key, value }) => response.headers.set(key, value));
  }

  return response;
}
