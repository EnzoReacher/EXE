import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
// The authenticated layout owns one mounted Scan/Rewrite workspace, including this alias.
export default async function Page(){ if (!await getCurrentUser()) redirect("/sign-in?next=/app"); return null; }
