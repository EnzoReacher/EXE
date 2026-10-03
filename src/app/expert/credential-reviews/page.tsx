import { requireCurrentUser } from "@/lib/intake/repository";
import CredentialWorkspace from "@/app/credential-versions/workspace";
export const metadata = { title: "Assigned credential reviews | EXE", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  let allowed = false;
  try { const { supabase } = await requireCurrentUser(); const result = await supabase.rpc("m11a_expert_queue"); allowed = !result.error; } catch { /* Neutral boundary, no identity or configuration details. */ }
  return <main id="main-content" tabIndex={-1} className="analysis-page"><div className="analysis-wrap"><h1>Assigned credential reviews</h1>{allowed ? <CredentialWorkspace expert /> : <p role="status">This private review workspace is unavailable.</p>}</div></main>;
}
