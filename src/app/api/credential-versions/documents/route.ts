import { uploadDocument } from "@/lib/credential-versions/repository";
import { failure, PRIVATE_HEADERS } from "@/lib/credential-versions/http";
import { IntakeError } from "@/lib/intake/types";
import { requireCurrentUser } from "@/lib/intake/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireCurrentUser();
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) throw new IntakeError("invalid_file", "Choose a file of at most 5 MiB.");
    const form = await request.formData();
    const file = form.get("file"); const kind = form.get("kind");
    if (!(file instanceof File) || (kind !== "portfolio" && kind !== "credential")) throw new IntakeError("invalid_file", "Choose a private credential or portfolio file.");
    return Response.json(await uploadDocument(file, kind, form.get("documentType")), { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) { return failure(error); }
}
