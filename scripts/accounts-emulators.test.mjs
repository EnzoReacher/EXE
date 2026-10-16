import { describe, it, expect } from "vitest";
import { assertDemoEnvironment } from "./accounts-emulators.mjs";

describe("owned emulator guard", () => {
  const safe = { GCLOUD_PROJECT: "demo-ownpath-accounts", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080" };
  it("rejects cloud targets, remote services and ambient credentials", () => {
    expect(() => assertDemoEnvironment(safe)).not.toThrow();
    expect(() => assertDemoEnvironment({ ...safe, FIREBASE_CONFIG: JSON.stringify({ projectId: safe.GCLOUD_PROJECT, storageBucket: `${safe.GCLOUD_PROJECT}.appspot.com`, databaseURL: `https://${safe.GCLOUD_PROJECT}.firebaseio.com` }) })).not.toThrow();
    for (const patch of [{ GCLOUD_PROJECT: "production" }, { GCLOUD_PROJECT: "demo-other" }, { FIRESTORE_EMULATOR_HOST: "example.test:8080" }, { FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099" }, { GOOGLE_APPLICATION_CREDENTIALS: "private.json" }, { FIREBASE_CONFIG: "{}" }, { STRIPE_SECRET_KEY: "sk_test_fixture" }]) expect(() => assertDemoEnvironment({ ...safe, ...patch })).toThrow();
  });
});
