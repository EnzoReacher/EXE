export const runtime = "nodejs";
export async function POST() { return Response.json({ error: { code: "retired", message: "Experience Translator has retired. Open /app/tailor to review your CV." } }, { status: 410, headers: { "Cache-Control": "no-store" } }); }
