import type { ReactNode } from "react";

/** Keep the live region mounted while its message changes. */
export function StatusNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p className={`form-notice${error ? " error" : ""}`} role={error ? "alert" : "status"} aria-atomic="true">{children}</p>;
}
