import { webhook } from "@/lib/billing/server";
export const runtime="nodejs";
export async function POST(request:Request){return webhook(request);}
