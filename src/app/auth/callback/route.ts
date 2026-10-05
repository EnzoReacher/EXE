import { NextResponse } from "next/server";
import { getAuthRedirectUrl } from "@/lib/supabase/auth-redirect";
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
  const success = callbackResponse(request.url, "/assessment");
  const failure = callbackResponse(request.url, "/sign-in?status=confirmation-failed");
  if (!success || !failure) {
    return new Response("Authentication callback is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const code = new URL(request.url).searchParams.get("code");
  if (!code) return failure;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure : success;
  } catch {
    return failure;
  }
}
