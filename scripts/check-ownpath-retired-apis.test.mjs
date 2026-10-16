import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { checkRetiredApis, validateOrigin } from "./check-ownpath-retired-apis.mjs";

describe("retired API acceptance", () => {
  it("rejects non-disposable origins and credentials before requests", () => {
    for (const value of ["https://example.test", "http://127.0.0.1", "http://user:pass@127.0.0.1:1234", "http://127.0.0.1:1234/path", "http://127.0.0.1:1234/?private=value"]) expect(() => validateOrigin(value)).toThrow();
    expect(validateOrigin("http://127.0.0.1:1234")).toBe("http://127.0.0.1:1234");
  });
  it("checks all methods and rejects successful, redirected, authorized-only or broken legacy responses", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "ownpath-retired-"));
    try {
      mkdirSync(path.join(root, ".next/server"), { recursive: true });
      const manifest = path.join(root, ".next/server/app-paths-manifest.json");
      writeFileSync(manifest, JSON.stringify({ "/experience-translator/page": "page.js" }));
      const request = vi.fn(async () => new Response(null, { status: 404 }));
      expect(await checkRetiredApis(root, "http://127.0.0.1:1234", request)).toBe(119);
      expect(new Set(request.mock.calls.map(([, options]) => options.method)).size).toBe(7);
      expect(request.mock.calls.every(([, options]) => options.redirect === "manual")).toBe(true);
      for (const status of [200, 307, 401, 403, 500]) await expect(checkRetiredApis(root, "http://127.0.0.1:1234", async () => new Response(null, { status }))).rejects.toThrow(String(status));
      writeFileSync(manifest, JSON.stringify({ "/api/intake/cv/route": "route.js" })); request.mockClear();
      await expect(checkRetiredApis(root, "http://127.0.0.1:1234", request)).rejects.toThrow(/Compiled build/); expect(request).not.toHaveBeenCalled();
      for (const name of ["/api/auth/session/route", "/api/sessions/[id]/route", "/api/webhooks/stripe/route"]) {
        writeFileSync(manifest, JSON.stringify({ [name]: "route.js" }));
        expect(await checkRetiredApis(root, "http://127.0.0.1:1234", request)).toBe(119);
      }
      for (const name of ["/api/[...path]/route", "/api/[[...path]]/route", "/api/analysis/route", "/api/unknown/route"]) {
        writeFileSync(manifest, JSON.stringify({ [name]: "route.js" })); request.mockClear();
        await expect(checkRetiredApis(root, "http://127.0.0.1:1234", request)).rejects.toThrow(/Compiled build/); expect(request).not.toHaveBeenCalled();
      }
      writeFileSync(manifest, "{}"); mkdirSync(path.join(root, "src/app/api/intake/cv"), { recursive: true }); writeFileSync(path.join(root, "src/app/api/intake/cv/route.ts"), "retained");
      await expect(checkRetiredApis(root, "http://127.0.0.1:1234", request)).rejects.toThrow(/source/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
