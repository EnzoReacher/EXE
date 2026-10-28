import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  if (!await getCurrentUser()) redirect("/sign-in?next=/app/scan");
  return null;
}
