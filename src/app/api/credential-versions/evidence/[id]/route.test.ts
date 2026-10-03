import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ evidence: vi.fn() }));
vi.mock("@/lib/credential-versions/repository", () => ({ evidenceFile: mocks.evidence }));
import { GET } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
beforeEach(() => { mocks.evidence.mockReset(); });
describe("authenticated private evidence delivery", () => {
  it("previews allowed credential bytes with sandbox and no-store headers", async () => {
    mocks.evidence.mockResolvedValue({ bytes: new TextEncoder().encode("%PDF-fictional").buffer, mime: "application/pdf" });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?kind=credential&preview=1`), context);
    expect(mocks.evidence).toHaveBeenCalledWith(id, "credential");
    expect(result.headers.get("Content-Disposition")).toContain("inline");
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(result.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
  it("keeps portfolios as downloads even when inline preview is requested", async () => {
    mocks.evidence.mockResolvedValue({ bytes: new ArrayBuffer(0), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?kind=portfolio&preview=1`), context);
    expect(result.headers.get("Content-Disposition")).toContain("attachment");
  });
  it("returns a neutral private failure when authorization is denied", async () => {
    mocks.evidence.mockRejectedValue(new Error("fictional-private-account-path"));
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?preview=1`), context);
    expect(result.status).toBe(500);
    expect(await result.text()).not.toContain("fictional-private-account-path");
    expect(result.headers.get("Cache-Control")).toContain("no-store");
  });
});
