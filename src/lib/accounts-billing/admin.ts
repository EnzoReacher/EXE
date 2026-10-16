import "server-only";
import { generateKeyPairSync } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { accountsConfig } from "./server-config";

/** Emulator-only: never selects ambient application-default cloud credentials. */
export function adminServices() {
  const config = accountsConfig();
  const name = `ownpath-accounts-${config.projectId}`;
  let app = getApps().find(value => value.name === name);
  if (!app) {
    // Admin's Firestore adapter requires a certificate/ADC credential even for emulators.
    // Generate an ephemeral inert certificate: no cloud service account owns this key,
    // no ambient credentials/metadata discovery, no key leaves this process.
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    app = initializeApp({ projectId: config.projectId, credential: cert({ projectId: config.projectId, clientEmail: `ownpath-emulator@${config.projectId}.iam.gserviceaccount.com`, privateKey }) }, name);
  }
  return { auth: getAuth(app), db: getFirestore(app), config };
}
