import { NextResponse } from "next/server";
import { authReturnPath, getAuthRedirectUrl } from "@/lib/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function callbackResponse(requestUrl: string, path: string) {
  const target = getAuthRedirectUrl(requestUrl, path);
  if (!target) return null;

  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.getAll("next");
  const next = requested.length === 1 ? authReturnPath(requested[0], true) : "/app";
  const success = callbackResponse(request.url, next);
  const failure = callbackResponse(request.url, "/sign-in?status=confirmation-failed");
  if (!success || !failure) {
    return new Response("Authentication callback is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const code = params.get("code");
  if (!code || code.length > 4096 || params.getAll("code").length !== 1 || params.has("error")) return failure;

  try {
    const supabase = await createSupabaseServerClient(success);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const verified = await supabase.auth.getUser();
      if (!verified.error && verified.data.user) return success;
    }
    success.cookies.getAll().forEach((cookie) => failure.cookies.set(cookie));
    return failure;
  } catch {
    success.cookies.getAll().forEach((cookie) => failure.cookies.set(cookie));
    return failure;
  }
}
