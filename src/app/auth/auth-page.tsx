import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { authReturnPath } from "@/lib/supabase/auth-redirect";
import type { AccountMode } from "@/lib/supabase/auth-validation";
import AuthPanel from "@/components/ownpath/auth-panel";
import { PublicHeader, PublicFooter } from "@/components/ownpath/public-shell";
import styles from "@/components/ownpath/ownpath.module.css";

export default async function AuthPage({ mode, notice, next }: { mode: AccountMode; notice?: string; next?: string }) {
  const user = await getCurrentUser();
  if (user && (mode === "signIn" || mode === "signUp")) redirect(authReturnPath(next));
  const heading = mode === "signUp" ? "A simple place to sign in." : mode === "forgot" || mode === "reset" ? "A fresh start for your password." : mode === "account" ? "You’re in control." : "Welcome back to OwnPath.";
  return <main className={styles.publicPage} data-ownpath-public id="main-content" tabIndex={-1}>
    <PublicHeader />
    <div className={styles.authSection}><div className={styles.authIntro}><p className={styles.eyebrow}>YOUR NEXT STEP, AT YOUR PACE</p><h1>{heading}</h1><p>Turn your real experience into clear CVs for different jobs. Review every change and save the versions you choose.</p></div><AuthPanel key={mode} mode={mode} notice={notice} next={authReturnPath(next)} initialUser={user ? { id: user.id, email: user.email } : null} resetAllowed={!!user} /></div>
    <PublicFooter />
  </main>;
}
