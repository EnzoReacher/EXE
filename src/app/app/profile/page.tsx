import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/ownpath/workspace-pages";
export default async function Page(){ if (!await getCurrentUser()) redirect("/sign-in?next=/app/profile"); return <ProfileEditor />; }
