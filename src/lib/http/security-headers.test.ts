import { describe, expect, it } from "vitest";
import { PRIVATE_NO_STORE_HEADERS, SECURITY_HEADERS } from "./security-headers";
import nextConfig from "../../../next.config";

describe("release-candidate response header policy", () => {
  it("sets baseline browser hardening headers", () => {
    expect(Object.fromEntries(SECURITY_HEADERS.map((header) => [header.key, header.value]))).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
  });

  it("marks private API data as non-storable", () => {
    expect(PRIVATE_NO_STORE_HEADERS).toContainEqual({ key: "Cache-Control", value: "private, no-store, max-age=0" });
  });

  it("does not loosen the review-token referrer boundary", () => {
    expect(SECURITY_HEADERS).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
  });

  it("wires browser hardening globally and no-store to API and private review paths", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.find((rule) => rule.source === "/:path*")?.headers).toEqual([...SECURITY_HEADERS]);
    expect(rules.find((rule) => rule.source === "/api/:path*")?.headers).toEqual([...PRIVATE_NO_STORE_HEADERS]);
    expect(rules.find((rule) => rule.source === "/review/:path*")?.headers).toEqual([
      ...PRIVATE_NO_STORE_HEADERS,
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]);
  });
});
