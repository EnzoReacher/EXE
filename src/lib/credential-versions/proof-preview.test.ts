import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { proofPreviewResponse } from "./proof-preview";

describe("controlled proof document", () => {
  it("hashes only its fixed style and treats markup appended to raster bytes as inert base64", async () => {
    const bytes = Buffer.concat([Buffer.from([255, 216, 255]), Buffer.from('<script>alert("fictional")</script>')]);
    const response = proofPreviewResponse(Uint8Array.from(bytes).buffer, "image/jpeg");
    const html = await response.text();
    const style = html.match(/<style>(.*?)<\/style>/)![1];
    expect(response.headers.get("Content-Security-Policy")).toContain(`style-src 'sha256-${createHash("sha256").update(style).digest("base64")}'`);
    expect(html).toContain(bytes.toString("base64")); expect(html).not.toContain('<script>alert');
    expect(html).not.toMatch(/https?:\/\/|storage_path|credential-private|<iframe|<object|<embed/);
  });
  it.each([0, 5 * 1024 * 1024 + 1])("refuses a %i-byte response before embedding it", (size) => {
    const bytes = new Uint8Array(size); bytes.set([255, 216, 255].slice(0, size));
    expect(() => proofPreviewResponse(bytes.buffer, "image/jpeg")).toThrow(/unavailable/);
  });
});
