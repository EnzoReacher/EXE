import { loadExportSnapshot } from "@/lib/cv-export/repository";
import { createDocx, DOCX_MIME } from "@/lib/cv-export/document";
import { downloadFilename } from "@/lib/cv-export/contract";
import { failure, PRIVATE_HEADERS } from "@/lib/credential-versions/http";
import { IntakeError } from "@/lib/intake/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const snapshot = await loadExportSnapshot(id);
    const format = new URL(request.url).searchParams.get("format") ?? "docx";
    if (format !== "docx" && format !== "txt") throw new IntakeError("unavailable", "This accepted CV export is unavailable. Return to version history and refresh.", 404);
    const bytes = format === "docx" ? await createDocx(snapshot.content) : new TextEncoder().encode(snapshot.content);
    return new Response(bytes, { headers: { ...PRIVATE_HEADERS,
      "Content-Type": format === "docx" ? DOCX_MIME : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadFilename(snapshot.name, snapshot.number, format)}"`,
      "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer",
    } });
  } catch (error) { return failure(error); }
}
