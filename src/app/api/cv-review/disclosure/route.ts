// Transmission information only. No fixture mode, provider call or quota mutation.
import { transmission } from "@/lib/scan-rewrite/provider";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(transmission(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Sharing details are unavailable. Your work is kept." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
