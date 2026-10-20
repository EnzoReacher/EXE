import { describe, expect, it } from "vitest";
import { validateAuth } from "./auth-validation";
import { accountCallbackUrl, authReturnPath } from "./auth-redirect";

describe("account boundaries", () => {
  it("allows only approved workspace paths without queries or fragments", () => {
    for (const value of ["/app", "/app/profile", "/app/tailor", "/app/cvs", "/app/account", "/app/cvs/11111111-1111-4111-8111-111111111111"]) expect(authReturnPath(value)).toBe(value);
    for (const value of ["/app/other", "/app?next=//evil.test", "/app/tailor#token", "/app/../account", "/experience-translator"]) expect(authReturnPath(value)).toBe("/app");
  });
  it("accepts existing-provider short passwords for sign in, not signup", () => {
    const fields = { email: "fictional@example.test", password: "old", confirm: "old" };
    expect(validateAuth("signIn", fields)).toEqual({});
    expect(validateAuth("signUp", fields).password).toBeTruthy();
  });
  it("requires confirmation on signup/reset, never trims passwords", () => {
    expect(validateAuth("reset", { email: "", password: "a fictional passphrase", confirm: "different" }).confirm).toBeTruthy();
    expect(validateAuth("signUp", { email: "fictional@example.test", password: "a fictional passphrase ", confirm: "a fictional passphrase " })).toEqual({});
  });
  it("resend and reset-request validate email without password", () => {
    const fields = { email: "fictional@example.test", password: "", confirm: "" };
    expect(validateAuth("forgot", fields)).toEqual({});
    expect(validateAuth("signIn", fields, true)).toEqual({});
    expect(validateAuth("signUp", { ...fields, email: "bad" }, true).email).toBeTruthy();
  });
  for (const value of ["https://evil.test", "//evil.test", "\\evil.test", "/%2f%2fevil.test", "/account?next=//evil.test", "/reset-password#token", "javascript:alert(1)", "/account/../reset-password", ["/experience-translator"], null, "/%61ccount", "/account\n"]) {
    it(`fails closed for return path ${JSON.stringify(value)}`, () => {
      expect(authReturnPath(value, true)).toBe("/app");
    });
  }
  it("permits reset callback but not a login redirect chain", () => {
    expect(authReturnPath("/reset-password")).toBe("/app");
    expect(authReturnPath("/reset-password", true)).toBe("/reset-password");
    expect(accountCallbackUrl("http://127.0.0.1:3000", "/reset-password", { siteUrl: "", nodeEnv: "development" })).toBe("http://127.0.0.1:3000/auth/callback?next=%2Freset-password");
  });
});
