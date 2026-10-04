import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ evidence: vi.fn() }));
vi.mock("@/lib/credential-versions/repository", () => ({ evidenceFile: mocks.evidence }));
import { GET } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
beforeEach(() => { mocks.evidence.mockReset(); });
describe("authenticated private evidence delivery", () => {
  it("gives PDF review guidance with sandbox and no-store headers, without embedding a native viewer", async () => {
    mocks.evidence.mockResolvedValue({ bytes: new TextEncoder().encode("%PDF-fictional").buffer, mime: "application/pdf" });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?kind=credential&preview=1`), context);
    expect(mocks.evidence).toHaveBeenCalledWith(id, "credential");
    expect(result.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    const html = await result.text();
    expect(html).toContain("Review this PDF using the private download");
    expect(html).not.toContain("%PDF-fictional");
    expect(html).not.toMatch(/<(?:iframe|object|embed|script)\b/);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(result.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("wraps raster bytes in controlled HTML without enabling scripts or same-origin privileges", async () => {
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1]).buffer;
    mocks.evidence.mockResolvedValue({ bytes, mime: "image/png" });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?preview=1`), context);
    const html = await result.text();
    expect(html).toContain(`src="data:image/png;base64,${Buffer.from(bytes).toString("base64")}"`);
    expect(html).not.toContain(id);
    const policy = result.headers.get("Content-Security-Policy")!;
    expect(policy).toContain("sandbox;"); expect(policy).toContain("img-src data:");
    expect(policy).not.toMatch(/allow-scripts|allow-same-origin|unsafe-inline/);
  });
  it.each(["image/svg+xml", "text/html", "application/pdf"])("fails closed on unexpected or signature-mismatched %s previews", async (mime) => {
    mocks.evidence.mockResolvedValue({ bytes: new TextEncoder().encode('<script>private-sentinel</script>').buffer, mime });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}?preview=1`), context);
    expect(result.status).toBe(403); expect(await result.text()).not.toContain("private-sentinel");
  });
  it("preserves original bytes for authenticated downloads", async () => {
    const bytes = new TextEncoder().encode("%PDF-fictional").buffer;
    mocks.evidence.mockResolvedValue({ bytes, mime: "application/pdf" });
    const result = await GET(new Request(`http://localhost/api/credential-versions/evidence/${id}`), context);
    expect(result.headers.get("Content-Disposition")).toContain("attachment");
    expect(result.headers.get("Content-Disposition")).toContain("private-evidence.pdf");
    expect(await result.arrayBuffer()).toEqual(bytes);
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
