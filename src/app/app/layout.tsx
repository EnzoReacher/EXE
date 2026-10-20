import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/ownpath/workspace-shell";
import "./workspace.css";
import { displayName } from "@/lib/supabase/account-profile";
export const dynamic = "force-dynamic";
export const metadata = { title: "Workspace | OwnPath", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/app");
  return <WorkspaceShell key={user.id} owner={user.id} email={user.email} displayName={displayName(user.user_metadata)}>{children}</WorkspaceShell>;
}
