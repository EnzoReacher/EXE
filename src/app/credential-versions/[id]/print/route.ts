import { loadExportSnapshot } from "@/lib/cv-export/repository";
import { printHtml, PRINT_CSP } from "@/lib/cv-export/print";
import { failure, PRIVATE_HEADERS } from "@/lib/credential-versions/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const snapshot = await loadExportSnapshot(id);
    return new Response(printHtml(snapshot.content), { headers: { ...PRIVATE_HEADERS,
      "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": PRINT_CSP,
      "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer",
    } });
  } catch (error) { return failure(error); }
}
