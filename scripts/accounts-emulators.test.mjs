import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertDemoEnvironment, createOwnedDirectory, safeEmulatorLine, forwardEmulatorOutput } from "./accounts-emulators.mjs";
import { PassThrough } from "node:stream";
import { once } from "node:events";

describe("owned emulator guard", () => {
  it("buffers split secret-bearing chunks on both CLI output streams and flushes final unterminated lines safely", async () => {
    for (const label of ["stdout", "stderr"]) {
      const input = new PassThrough(), output = new PassThrough(); let text = "";
      output.on("data", chunk => { text += chunk.toString(); });
      const lines = forwardEmulatorOutput(input, output), closed = once(lines, "close");
      input.write(`${label} ready\noob`); input.write("Code=PRIVATE");
      expect(text).toBe(`${label} ready\n`);
      input.end("_SYNTHETIC_ACTION"); await closed;
      expect(text).toBe(`${label} ready\n[EMULATOR_ACTION_DETAILS_REDACTED]\n`);
    }
  });
  it("redacts CLI verification/reset links and action secrets while retaining safe acceptance output", () => {
    for (const line of ["i To verify the email synthetic@example.test follow http://127.0.0.1/emulator/action?oobCode=PRIVATE", "reset URL newPassword=PRIVATE", "oobCode=PRIVATE", "actionCode=PRIVATE"]) {
      expect(safeEmulatorLine(line)).toBe("[EMULATOR_ACTION_DETAILS_REDACTED]");
      expect(safeEmulatorLine(line)).not.toContain("PRIVATE");
    }
    expect(safeEmulatorLine("21 backend cases PASS")).toBe("21 backend cases PASS");
  });
  it("creates a missing temporary parent and refuses symlink parents", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ownpath-parent-"));
    try {
      const parent = path.join(root, "missing", "parent");
      const owned = createOwnedDirectory(parent);
      expect(existsSync(owned)).toBe(true); expect(path.dirname(owned)).toBe(parent);
      const link = path.join(root, "link"); symlinkSync(parent, link);
      expect(() => createOwnedDirectory(link)).toThrow("OWNED_TEMP_PARENT_REQUIRED");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  const safe = { GCLOUD_PROJECT: "demo-ownpath-accounts", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080" };
  it("rejects cloud targets, remote services and ambient credentials", () => {
    expect(() => assertDemoEnvironment(safe)).not.toThrow();
    expect(() => assertDemoEnvironment({ ...safe, FIREBASE_CONFIG: JSON.stringify({ projectId: safe.GCLOUD_PROJECT, storageBucket: `${safe.GCLOUD_PROJECT}.appspot.com`, databaseURL: `https://${safe.GCLOUD_PROJECT}.firebaseio.com` }) })).not.toThrow();
    for (const patch of [{ GCLOUD_PROJECT: "production" }, { GCLOUD_PROJECT: "demo-other" }, { FIRESTORE_EMULATOR_HOST: "example.test:8080" }, { FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099" }, { GOOGLE_APPLICATION_CREDENTIALS: "private.json" }, { FIREBASE_CONFIG: "{}" }, { STRIPE_SECRET_KEY: "sk_test_fixture" }]) expect(() => assertDemoEnvironment({ ...safe, ...patch })).toThrow();
  });
});
