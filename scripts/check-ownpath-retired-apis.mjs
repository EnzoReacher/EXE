import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Full CF-04A inventory. Parameter values are fictional and never reference
// an existing record. This check must target an owned disposable compiled app.
export const retiredApis = [
  "/api/intake/cv", "/api/intake/cv/[id]", "/api/intake/jobs", "/api/intake/jobs/[id]",
  "/api/analysis", "/api/analysis/[id]", "/api/analysis/[id]/next-steps", "/api/analysis/[id]/review-shares",
  "/api/opportunities", "/api/opportunities/[id]", "/api/saved-work", "/api/review/[token]",
  "/api/expert/credential-reviews", "/api/credential-versions", "/api/credential-versions/documents",
  "/api/credential-versions/evidence/[id]", "/api/credential-versions/[id]/export",
];
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
export function validateOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || !url.port || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("An explicit disposable numeric loopback origin and port are required.");
  return url.origin;
}
export async function checkRetiredApis(root, origin, request = fetch) {
  const base = validateOrigin(origin);
  // Fail before making requests if source/build still registers any API handler.
  const manifest = JSON.parse(readFileSync(path.join(root, ".next/server/app-paths-manifest.json"), "utf8"));
  if (Object.keys(manifest).some((name) => name.startsWith("/api/"))) throw new Error("Compiled build still contains an API handler; rebuild the cleanup candidate.");
  for (const route of retiredApis) if (existsSync(path.join(root, "src/app", route.slice(1), "route.ts"))) throw new Error("Retired API source is still present.");
  let checked = 0;
  for (const route of retiredApis) {
    const pathname = route.replaceAll("[id]", "11111111-1111-4111-8111-111111111111").replaceAll("[token]", "ownpath-retired-fictional-token");
    for (const method of methods) {
      const response = await request(base + pathname, { method, redirect: "manual", signal: AbortSignal.timeout(5000) });
      await response.body?.cancel();
      if (response.status !== 404 && response.status !== 405) throw new Error(`Retired API remains active or redirected: ${method} ${route} returned ${response.status}.`);
      checked++;
    }
  }
  return checked;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: node scripts/check-ownpath-retired-apis.mjs http://127.0.0.1:<owned-compiled-server-port>");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    console.log(`Retired API acceptance PASS: ${await checkRetiredApis(root, process.argv[2])} HTTP checks across ${retiredApis.length} route patterns.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
