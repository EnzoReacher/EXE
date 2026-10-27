import { handleReview } from "@/lib/cv-review/server";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleReview(request, "organize"); }
