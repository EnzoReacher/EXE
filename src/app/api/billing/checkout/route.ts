import { handleBilling } from "@/lib/billing/server";
export const runtime="nodejs";
export async function POST(request:Request){return handleBilling(request,"checkout");}
