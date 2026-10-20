// A new document sends persisted Auth cookies and avoids stale anonymous RSC data.
export function continueAfterAuth() {
  window.location.replace("/app");
}
