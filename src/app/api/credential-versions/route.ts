import { loadWorkspace, ownerAction, versionDetail } from "@/lib/credential-versions/repository";
import { failure, PRIVATE_HEADERS, readAction } from "@/lib/credential-versions/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("version");
    return Response.json(id ? await versionDetail(id) : await loadWorkspace(), { headers: PRIVATE_HEADERS });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return Response.json(await ownerAction(await readAction(request)), { headers: PRIVATE_HEADERS }); }
  catch (error) { return failure(error); }
}
