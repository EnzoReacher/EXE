import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeApp, deleteApp, cert } from "firebase-admin/app";
import { generateKeyPairSync } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertDemoEnvironment } from "./accounts-emulators.mjs";
import { spawnSync } from "node:child_process";
import path from "node:path";

assertDemoEnvironment(process.env);
const projectId = process.env.GCLOUD_PROJECT;
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
const test = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: readFileSync(fileURLToPath(new URL("../firestore.rules", import.meta.url)), "utf8") } });
// Explicit inert emulator certificate prevents ambient ADC/metadata discovery.
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const admin = initializeApp({ projectId, credential: cert({ projectId, clientEmail: `ownpath-emulator@${projectId}.iam.gserviceaccount.com`, privateKey }) }, "accounts-emulator-evidence");
try {
  const auth = getAuth(admin), db = getFirestore(admin);
  const first = await auth.createUser({ uid: "synthetic-owner-a", email: "owner-a@example.test", password: "Synthetic-only-2026!", emailVerified: true });
  await auth.createUser({ uid: "synthetic-owner-b", email: "owner-b@example.test", password: "Synthetic-only-2026!" });
  await db.doc(`users/${first.uid}`).set({ displayName: "Synthetic A" });
  for (const context of [test.unauthenticatedContext(), test.authenticatedContext(first.uid), test.authenticatedContext("synthetic-owner-b")]) {
    for (const target of ["users/synthetic-owner-a", "users/synthetic-owner-a/sessions/example", "billingAccounts/synthetic-owner-a", "billingEvents/example"]) {
      await assertFails(getDoc(doc(context.firestore(), target)));
      await assertFails(setDoc(doc(context.firestore(), target), { tier: "pro" }));
    }
  }
  if (!(await db.doc(`users/${first.uid}`).get()).exists) throw new Error("ADMIN_DATABASE_UNAVAILABLE");
  console.log("Actual Firebase emulators: two Auth identities, Admin Firestore write/read, 24 direct-client deny checks PASS. This is not cloud IAM or server repository acceptance.");
} finally {
  await test.cleanup(); await deleteApp(admin);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = spawnSync(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "src/lib/accounts-billing/emulator.integration.test.ts", "src/lib/accounts-billing/billing-emulator.test.ts"], { cwd: root, env: { ...process.env, OWNPATH_EMULATOR_ACCEPTANCE: "1" }, stdio: "inherit", timeout: 180000 });
if (backend.status !== 0) throw new Error("ACTUAL_BACKEND_EMULATOR_ACCEPTANCE_FAILED");
if (process.env.OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE === "1") {
  const browser = spawnSync(process.execPath, [path.join(root, "scripts/accounts-browser-check.mjs")], { cwd: root, env: process.env, stdio: "inherit", timeout: 240000 });
  if (browser.status !== 0) throw new Error("ACTUAL_ACCOUNTS_BROWSER_ACCEPTANCE_FAILED");
}
