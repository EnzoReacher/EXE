import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
export const metadata = { title: "Your account | OwnPath" };
export default async function AccountPage() { redirect(await getCurrentUser() ? "/app/account" : "/sign-in?next=/app/account"); }
