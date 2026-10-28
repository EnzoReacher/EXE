import { getCurrentUser } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/cv-review/request-origin";
import { extractUpload, readUpload, IntakeError } from "@/lib/cv-intake/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!await getCurrentUser()) return Response.json({ error: "Your session ended. Sign in again; your text is kept." }, { status: 401, headers });
  if (!sameOrigin(request)) return Response.json({ error: "Open OwnPath at its configured address and retry." }, { status: 403, headers });
  const kind = new URL(request.url).searchParams.get("type");
  const mime = request.headers.get("content-type")?.split(";")[0];
  if (!((kind === "pdf" && mime === "application/pdf") || (kind === "docx" && mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) return Response.json({ error: "Upload a PDF or DOCX document." }, { status: 415, headers });
  try { return Response.json(await extractUpload(await readUpload(request), kind as "pdf" | "docx", request.signal), { headers }); }
  catch (error) { return Response.json({ error: error instanceof IntakeError ? error.message : "Extraction failed. Your text is kept. Try another file or paste text." }, { status: 422, headers }); }
}
