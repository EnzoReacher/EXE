// A new document sends persisted Auth cookies and avoids stale anonymous RSC data.
import { authReturnPath } from "@/lib/supabase/auth-redirect";
export function continueAfterAuth(next: unknown = "/app") {
  window.location.replace(authReturnPath(next));
}
