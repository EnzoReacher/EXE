import { handleApi } from "@/lib/accounts-billing/server-api";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return handleApi("savedSession", request, (await context.params).id); }
export async function PATCH(request: Request, context: Context) { return handleApi("savedSession", request, (await context.params).id); }
export async function DELETE(request: Request, context: Context) { return handleApi("savedSession", request, (await context.params).id); }
