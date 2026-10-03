import { expertQueue, expertDetail, expertDecision } from "@/lib/credential-versions/repository";
import { failure, PRIVATE_HEADERS, readAction } from "@/lib/credential-versions/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { const id = new URL(request.url).searchParams.get("claim"); return Response.json(id ? await expertDetail(id) : await expertQueue(), { headers: PRIVATE_HEADERS }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return Response.json(await expertDecision(await readAction(request)), { headers: PRIVATE_HEADERS }); }
  catch (error) { return failure(error); }
}
