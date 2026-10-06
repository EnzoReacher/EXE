export function openAuthenticatedWorkspace() {
  // Supabase has persisted its cookie before this is called. A new document
  // sends that cookie to the server and discards anonymous App Router state.
  window.location.replace("/assessment");
}
