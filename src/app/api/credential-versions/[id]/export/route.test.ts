import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/cv-export/repository", () => ({ loadExportSnapshot: mocks.load }));
import { GET } from "./route";
import { GET as print } from "@/app/credential-versions/[id]/print/route";
import { IntakeError } from "@/lib/intake/types";
import { DOCX_MIME } from "@/lib/cv-export/document";
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
const content = "  Fictional CV\r\n\r\nApproved additional skills\nFictional SQL\tpractice  \n";
beforeEach(() => { mocks.load.mockReset(); mocks.load.mockResolvedValue({ content, name: 'Fictional"\r\nInjection.pdf', number: 2 }); });
describe("private export responses", () => {
  it("downloads a real DOCX package with safe attachment and private headers", async () => {
    const response = await GET(new Request(`http://localhost/api/credential-versions/${id}/export`), context);
    expect(mocks.load).toHaveBeenCalledWith(id);
    expect(response.headers.get("Content-Type")).toBe(DOCX_MIME);
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="Fictional-Injection-version-2.docx"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]));
  });
  it("TXT preserves the exact immutable UTF-8 text including CRLF and tabs", async () => {
    const response = await GET(new Request(`http://localhost/api/credential-versions/${id}/export?format=txt`), context);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new TextEncoder().encode(content));
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });
  it("does not claim or serve a generated PDF", async () => {
    const response = await GET(new Request(`http://localhost/api/credential-versions/${id}/export?format=pdf`), context);
    expect(response.status).toBe(404); expect(response.headers.get("Content-Disposition")).toBeNull();
  });
  it.each([401, 404])("denies unauthenticated or unavailable download/print with status %s", async (status) => {
    mocks.load.mockRejectedValue(new IntakeError("unavailable", "This accepted CV export is unavailable.", status));
    for (const handler of [GET, print]) {
      const response = await handler(new Request("http://localhost/private"), context);
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Content-Disposition")).toBeNull();
      expect(await response.text()).not.toContain(content);
    }
  });
  it("renders print text escaped, owner-checked and uncached with no object URLs", async () => {
    mocks.load.mockResolvedValue({ content: "Fictional <img src=x onerror=alert(1)> CV", name: "fictional.pdf", number: 1 });
    const response = await print(new Request("http://localhost/private"), context);
    expect(mocks.load).toHaveBeenCalledWith(id);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    const html = await response.text();
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img"); expect(html).not.toContain("storage/v1");
  });
});
