import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertDemoEnvironment } from "./accounts-emulators.mjs";

assertDemoEnvironment(process.env);
const projectId = process.env.GCLOUD_PROJECT;
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
const test = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: readFileSync(fileURLToPath(new URL("../firestore.rules", import.meta.url)), "utf8") } });
const admin = initializeApp({ projectId }, "accounts-emulator-evidence");
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
