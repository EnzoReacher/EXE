import { handleBilling } from "@/lib/billing/server";
export async function POST(request:Request){return handleBilling(request,"recheck");}
