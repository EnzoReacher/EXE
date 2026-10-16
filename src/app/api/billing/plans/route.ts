import { handleApi } from "@/lib/accounts-billing/server-api";
export const runtime = "nodejs";
export function GET(request: Request) { return handleApi("plans", request); }
