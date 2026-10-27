import { getCurrentUser } from "@/lib/supabase/server";
export async function GET() {
  const user = await getCurrentUser();
  return Response.json(user ? { owner: user.id } : { error: "Sign in again to resume your workspace." }, { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
