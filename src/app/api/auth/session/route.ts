import { handleApi } from "@/lib/accounts-billing/server-api";
export const runtime = "nodejs";
export function POST(request: Request) { return handleApi("session", request); }
export function DELETE(request: Request) { return handleApi("session", request); }
