import { describe, expect, it } from "vitest";
import { assertBrowserScope, stopOwnedGroup, waitForOwnedServer } from "./accounts-browser-check.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";

describe("authenticated acceptance refuses unowned services and cloud configuration", () => {
  const safe = { GCLOUD_PROJECT: "demo-ownpath-accounts-abc123", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080", TMPDIR: "/tmp/opencode/ownpathaccounts-AbC123/tmp", OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE: "1" };
  it("requires matching owned scope, explicit acceptance and demo service identity", () => {
    expect(assertBrowserScope(safe)).toBe(safe.TMPDIR);
    for (const patch of [{ OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE: "" }, { TMPDIR: "/tmp" }, { TMPDIR: "/tmp/opencode/owner/tmp" }, { GCLOUD_PROJECT: "demo-ownpath-accounts-other" }, { OWNPATH_TEST_URL: "http://127.0.0.1:3000" }, { OWNPATH_SANDBOX_BILLING_ENABLED: "true" }]) expect(() => assertBrowserScope({ ...safe, ...patch })).toThrow();
  });
  it("rejects external emulators and credentials before any build or process is launched", () => {
    for (const patch of [{ GCLOUD_PROJECT: "cloud-project" }, { FIRESTORE_EMULATOR_HOST: "remote.test:8080" }, { GOOGLE_APPLICATION_CREDENTIALS: "private.json" }, { STRIPE_SECRET_KEY: "sk_test_synthetic" }]) expect(() => assertBrowserScope({ ...safe, ...patch })).toThrow();
  });
});

function live(pid) {
  try { const state = readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" ")[0]; return !["Z", "X"].includes(state); } catch { return false; }
}
async function groupFixture(exitEarly) {
  const source = `const {spawn}=require("node:child_process"); const child=spawn(process.execPath,["-e",'process.on("SIGTERM",()=>{}); console.log("READY"); setInterval(()=>{},1000)'],{stdio:["ignore","pipe","ignore"]}); child.stdout.once("data",()=>{ console.log(child.pid); ${exitEarly ? "process.exit(0)" : "process.on('SIGTERM',()=>process.exit(0)); setInterval(()=>{},1000)"} });`;
  const leader = spawn(process.execPath, ["-e", source], { detached: true, stdio: ["ignore", "pipe", "ignore"] });
  const exit = once(leader, "exit");
  const [data] = await once(leader.stdout, "data");
  const descendant = Number(data.toString().trim());
  if (exitEarly) await exit;
  return { leader, descendant };
}
describe("owned process lifecycle", () => {
  it.each([true, false])("reaps live descendants when leader already exited or exits on TERM; early=%s", async exitEarly => {
    const { leader, descendant } = await groupFixture(exitEarly);
    try {
      expect(live(descendant)).toBe(true);
      await stopOwnedGroup(leader, { graceMs: 50, killMs: 1000 });
      expect(live(descendant)).toBe(false);
    } finally { try { process.kill(-leader.pid, "SIGKILL"); } catch { /* Owned group already gone. */ } }
  });
  it("never probes or launches acceptance against a competing listener when owned startup fails", async () => {
    const competing = createServer();
    await new Promise(resolve => competing.listen(0, "127.0.0.1", resolve));
    const port = competing.address().port;
    const owned = spawn(process.execPath, ["-e", `require("node:net").createServer().on("error",()=>process.exit(1)).listen(${port},"127.0.0.1")`], { detached: true, stdio: ["ignore", "pipe", "ignore"] });
    let requests = 0;
    try {
      await expect(waitForOwnedServer(owned, async () => { requests++; return true; })).rejects.toThrow("OWNED_SERVER_START_FAILED");
      expect(requests).toBe(0);
    } finally { await stopOwnedGroup(owned); await new Promise(resolve => competing.close(resolve)); }
  });
});
