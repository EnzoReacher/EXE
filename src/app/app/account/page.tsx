import AccountProfile from "@/components/ownpath/account-profile";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function Page(){ const user=await getCurrentUser(); if(!user) redirect("/sign-in?next=/app/account"); return <AccountProfile key={user.id} initialUser={{id:user.id,email:user.email,user_metadata:user.user_metadata}} />; }
