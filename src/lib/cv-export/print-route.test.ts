import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/cv-export/repository", () => ({ loadExportSnapshot: mocks.load }));
import { GET as print } from "@/app/credential-versions/[id]/print/route";
import { IntakeError } from "@/lib/intake/types";

// Relocated from the retired API export suite: the frontend-owned print route
// remains active until coordinated page retirement, so retain its coverage.
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
const content = "Fictional immutable CV text";
beforeEach(() => { mocks.load.mockReset(); });
describe("retained private print route during API retirement", () => {
  it.each([401, 404])("denies unauthenticated or unavailable print with status %s", async (status) => {
    mocks.load.mockRejectedValue(new IntakeError("unavailable", "This accepted CV export is unavailable.", status));
    const response = await print(new Request("http://localhost/private"), context);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(await response.text()).not.toContain(content);
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
