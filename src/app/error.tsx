"use client";

import { StatusNotice } from "@/components/status-notice";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" tabIndex={-1} className="reviewer-page">
    <section className="reviewer-wrap reviewer-unavailable">
      <h1>This page could not be loaded</h1>
      <StatusNotice error>Your last action may not have finished. Try loading this page again, then check its saved state before repeating a save or delete.</StatusNotice>
      <button type="button" className="button button-primary" onClick={retry}>Retry loading this page</button>
    </section>
  </main>;
}
