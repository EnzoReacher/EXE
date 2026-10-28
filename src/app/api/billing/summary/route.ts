import { handleBilling } from "@/lib/billing/server";
export async function GET(request:Request){return handleBilling(request,"summary");}
