import { evidenceFile } from "@/lib/credential-versions/repository";
import { failure, PRIVATE_HEADERS } from "@/lib/credential-versions/http";
import { proofPreviewResponse, PROOF_HEADERS } from "@/lib/credential-versions/proof-preview";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") ?? "credential";
    const file = await evidenceFile(id, kind);
    if (kind === "credential" && params.get("preview") === "1") return proofPreviewResponse(file.bytes, file.mime);
    const extensions: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx" };
    const extension = extensions[file.mime];
    return new Response(file.bytes, { headers: { ...PRIVATE_HEADERS, "Content-Type": extension ? file.mime : "application/octet-stream", "Content-Disposition": 'attachment; filename="private-evidence.' + (extension ?? "bin") + '"', "Content-Security-Policy": "sandbox; default-src 'none'", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    const response = failure(error);
    for (const [name, value] of Object.entries(PROOF_HEADERS)) response.headers.set(name, value);
    return response;
  }
}
