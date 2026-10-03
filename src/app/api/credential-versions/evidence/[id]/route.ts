import { evidenceFile } from "@/lib/credential-versions/repository";
import { failure, PRIVATE_HEADERS } from "@/lib/credential-versions/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") ?? "credential";
    const file = await evidenceFile(id, kind);
    const preview = kind === "credential" && params.get("preview") === "1" && ["application/pdf", "image/jpeg", "image/png"].includes(file.mime);
    return new Response(file.bytes, { headers: { ...PRIVATE_HEADERS, "Content-Type": file.mime, "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="private-evidence"`, "Content-Security-Policy": "sandbox; default-src 'none'", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return failure(error); }
}
