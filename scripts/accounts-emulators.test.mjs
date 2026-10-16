import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertDemoEnvironment, createOwnedDirectory } from "./accounts-emulators.mjs";

describe("owned emulator guard", () => {
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
