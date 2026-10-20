import { handleOperation } from "@/lib/scan-rewrite/server";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleOperation(request, "rewrite"); }
