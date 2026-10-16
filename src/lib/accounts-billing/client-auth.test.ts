import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const user = { emailVerified: false, getIdToken: vi.fn(async () => "synthetic-token") };
  return {
    auth: {}, user, apps: [] as { name: string }[], persistence: vi.fn(), signOut: vi.fn(),
    create: vi.fn(async () => ({ user })), login: vi.fn(async () => ({ user })),
    sendVerification: vi.fn(), reset: vi.fn(), checkAction: vi.fn(async () => ({ operation: "VERIFY_EMAIL" })),
    applyAction: vi.fn(), checkReset: vi.fn(), completeReset: vi.fn(), fetch: vi.fn(),
  };
});
vi.mock("firebase/app", () => ({
  getApps: () => mocks.apps,
  initializeApp: (_options: unknown, name: string) => { const app = { name }; mocks.apps.push(app); return app; },
}));
vi.mock("firebase/auth", () => ({
  getAuth: () => mocks.auth, connectAuthEmulator: vi.fn(), inMemoryPersistence: "memory-only",
  setPersistence: mocks.persistence, signOut: mocks.signOut,
  createUserWithEmailAndPassword: mocks.create, signInWithEmailAndPassword: mocks.login,
  sendEmailVerification: mocks.sendVerification, sendPasswordResetEmail: mocks.reset,
  checkActionCode: mocks.checkAction, applyActionCode: mocks.applyAction,
  verifyPasswordResetCode: mocks.checkReset, confirmPasswordReset: mocks.completeReset,
  reload: vi.fn(), validatePassword: vi.fn(async () => ({ isValid: true })),
}));
import { AccountAuthError, accountsRequest, createAccountsAuthAdapter } from "./client-auth";
const options = { projectId: "demo-ownpath-accounts", apiKey: "synthetic-key" };
const credentials = { email: "synthetic@example.test", password: "not-real-123#" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.emailVerified = false;
  mocks.create.mockResolvedValue({ user: mocks.user });
  mocks.login.mockResolvedValue({ user: mocks.user });
  mocks.sendVerification.mockResolvedValue(undefined);
  mocks.reset.mockResolvedValue(undefined);
  mocks.checkAction.mockResolvedValue({ operation: "VERIFY_EMAIL" });
  mocks.fetch.mockImplementation(async (path: string) => Response.json(path === "/api/auth/csrf" ? { csrfToken: "binding" } : { account: { setup: "ready" }, expiresAt: "2030-01-01T00:00:00.000Z" }));
  vi.stubGlobal("fetch", mocks.fetch);
});
describe("official Firebase client adapter", () => {
  it("uses memory persistence and clears credentials after cookie issuance", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    await adapter.login(credentials);
    expect(mocks.persistence).toHaveBeenCalledWith(mocks.auth, "memory-only");
    expect(mocks.login).toHaveBeenCalledWith(mocks.auth, credentials.email, credentials.password);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/auth/session", expect.objectContaining({ body: JSON.stringify({ idToken: "synthetic-token" }), headers: { "Content-Type": "application/json", "X-CSRF-Token": "binding" }, credentials: "same-origin" }));
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.fetch.mock.calls)).not.toContain(credentials.password);
  });
  it("distinguishes created identity/session failure and pending verification email without compensation deletion", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    mocks.sendVerification.mockRejectedValueOnce({ code: "auth/network-request-failed" });
    expect((await adapter.register(credentials)).verificationEmail).toBe("pending");
    mocks.fetch.mockImplementation(async (path: string) => Response.json(path === "/api/auth/csrf" ? { csrfToken: "binding" } : { error: { code: "SERVICE_UNAVAILABLE", message: "safe", retryable: true, requestId: "id" } }, { status: path === "/api/auth/csrf" ? 200 : 503 }));
    await expect(adapter.register(credentials)).rejects.toMatchObject({ phase: "identity_created_session_pending", code: "UNAVAILABLE" });
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
  it("keeps credentials/recovery errors neutral and cleans up failed sign-ins", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    for (const code of ["auth/user-not-found", "auth/wrong-password", "auth/user-disabled", "auth/email-already-in-use"]) {
      mocks.login.mockRejectedValueOnce({ code, message: "private provider details" });
      await expect(adapter.login(credentials)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    }
    mocks.reset.mockRejectedValueOnce({ code: "auth/user-not-found" });
    await expect(adapter.requestPasswordReset(credentials.email)).resolves.toEqual({ requested: true });
    expect(mocks.signOut).toHaveBeenCalledTimes(4);
  });
  it("serializes credential operations across adapter instances sharing the Firebase Auth object", async () => {
    const first = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    const second = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    let release!: () => void;
    mocks.login.mockImplementationOnce(async () => { await new Promise<void>(resolve => { release = resolve; }); return { user: mocks.user }; });
    const one = first.login(credentials);
    const two = second.login(credentials);
    await vi.waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    release();
    await Promise.all([one, two]);
    expect(mocks.login).toHaveBeenCalledTimes(2);
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
  it("checks verification action type and accepts only emulator config/declared same-origin transport", async () => {
    await expect(createAccountsAuthAdapter({ projectId: "cloud" }, "http://127.0.0.1:9099")).rejects.toBeInstanceOf(AccountAuthError);
    await expect(createAccountsAuthAdapter(options, "http://evil.test:9099")).rejects.toBeInstanceOf(AccountAuthError);
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    mocks.checkAction.mockResolvedValueOnce({ operation: "PASSWORD_RESET" });
    await expect(adapter.applyVerification("synthetic-code")).rejects.toMatchObject({ code: "INVALID_ACTION" });
    expect(mocks.applyAction).not.toHaveBeenCalled();
    for (const path of ["https://evil.test/api/account", "//evil.test/api/account", "/api/saved-work", "/api/account#x", "/api/account?x=y"]) await expect(accountsRequest(path)).rejects.toBeInstanceOf(AccountAuthError);
    await accountsRequest("/api/sessions?limit=20&cursor=opaque");
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/sessions?limit=20&cursor=opaque", expect.anything());
  });
  it("orders logout after an in-flight login so a late cookie exchange cannot resurrect the session", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    let release!: () => void;
    mocks.login.mockImplementationOnce(async () => { await new Promise<void>(resolve => { release = resolve; }); return { user: mocks.user }; });
    const login = adapter.login(credentials);
    const logout = adapter.logout();
    await vi.waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).not.toHaveBeenCalled();
    release();
    await Promise.all([login, logout]);
    const mutations = mocks.fetch.mock.calls.filter(call => call[1]?.method && call[1].method !== "GET");
    expect(mutations.map(call => call[1].method)).toEqual(["POST", "DELETE"]);
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
  it("reports network transport failure as unavailable rather than invalid credentials", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    mocks.fetch.mockRejectedValueOnce(new TypeError("network details"));
    await expect(adapter.login(credentials)).rejects.toMatchObject({ code: "UNAVAILABLE", phase: "session" });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
  it("singleflights simultaneous first-use CSRF bootstrap with a simulated shared cookie jar", async () => {
    let cookie = "";
    let csrfCalls = 0;
    const releases: (() => void)[] = [];
    mocks.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/auth/csrf") {
        const token = `binding-${++csrfCalls}`;
        await new Promise<void>(resolve => releases.push(resolve));
        cookie = token;
        return Response.json({ csrfToken: token });
      }
      const token = (init?.headers as Record<string, string>)["X-CSRF-Token"];
      return token === cookie ? Response.json({ okay: true }) : Response.json({ error: { code: "CSRF_INVALID" } }, { status: 403 });
    });
    const one = accountsRequest("/api/billing/checkout", "POST", { planId: "pro", operationId: "same-logical-key" });
    const two = accountsRequest("/api/billing/portal", "POST", { operationId: "other-logical-key" });
    await vi.waitFor(() => expect(releases.length).toBeGreaterThan(0));
    // Release all pending bootstrap responses together to model interleaved Set-Cookie application.
    releases.forEach(release => release());
    await expect(Promise.all([one, two])).resolves.toEqual([{ okay: true }, { okay: true }]);
    expect(csrfCalls).toBe(1);
  });
  it("recovers a definitive cross-tab CSRF rejection exactly once with the identical serialized operation", async () => {
    const bodies: unknown[] = [];
    let cookie = "first-binding";
    let csrfCalls = 0;
    let mutations = 0;
    mocks.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/auth/csrf") {
        csrfCalls++;
        return Response.json({ csrfToken: cookie });
      }
      bodies.push(init?.body);
      mutations++;
      if (mutations === 1) cookie = "other-tab-cookie-overwrite";
      const token = (init?.headers as Record<string, string>)["X-CSRF-Token"];
      return token === cookie ? Response.json({ okay: true }) : Response.json({ error: { code: "CSRF_INVALID" } }, { status: 403 });
    });
    const input = { planId: "pro", operationId: "stable-uuid-key" };
    await expect(accountsRequest("/api/billing/checkout", "POST", input)).resolves.toEqual({ okay: true });
    expect(csrfCalls).toBe(2);
    expect(bodies).toEqual([JSON.stringify(input), JSON.stringify(input)]);
  });
  it("never loops on CSRF errors or retries network/ambiguous provider successes", async () => {
    let mutations = 0;
    mocks.fetch.mockImplementation(async (path: string) => {
      if (path === "/api/auth/csrf") return Response.json({ csrfToken: "binding" });
      mutations++;
      return Response.json({ error: { code: "CSRF_INVALID" } }, { status: 403 });
    });
    await expect(accountsRequest("/api/billing/checkout", "POST", {})).rejects.toMatchObject({ apiError: { code: "CSRF_INVALID" } });
    expect(mutations).toBe(2);
    mutations = 0;
    mocks.fetch.mockImplementation(async (path: string) => {
      if (path === "/api/auth/csrf") return Response.json({ csrfToken: "binding" });
      mutations++;
      throw new TypeError("lost response after potential provider effect");
    });
    await expect(accountsRequest("/api/billing/checkout", "POST", {})).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(mutations).toBe(1);
    mutations = 0;
    mocks.fetch.mockImplementation(async (path: string) => {
      if (path === "/api/auth/csrf") return Response.json({ csrfToken: "binding" });
      mutations++;
      return new Response("not-json", { status: 200 });
    });
    await expect(accountsRequest("/api/billing/checkout", "POST", {})).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(mutations).toBe(1);
  });
  it("contains SDK credential-cleanup failures without leaking provider exception messages", async () => {
    const adapter = await createAccountsAuthAdapter(options, "http://127.0.0.1:9099");
    mocks.signOut.mockRejectedValueOnce({ code: "auth/network-request-failed", message: "private SDK details" });
    const error = await adapter.login(credentials).catch(error => error);
    expect(error).toMatchObject({ code: "UNAVAILABLE", phase: "session" });
    expect(error.message).not.toContain("private SDK");
  });
});
