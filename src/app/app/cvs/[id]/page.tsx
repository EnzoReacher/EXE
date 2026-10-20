import { SavedCV } from "@/components/ownpath/saved-cvs";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function Page({params}:{params:Promise<{id:string}>}){ if (!await getCurrentUser()) redirect("/sign-in?next=/app/cvs"); const {id}=await params; return <SavedCV key={id} id={id}/>; }
