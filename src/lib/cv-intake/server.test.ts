import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readUpload, extractUpload, FILE_LIMIT } from "./server";
import { Document, Packer, Paragraph } from "docx";
afterEach(() => vi.useRealTimers());
it("bounds actual streamed bytes even without Content-Length", async () => {
  const request = new Request("http://localhost", { method: "POST", body: new Uint8Array(FILE_LIMIT + 1) });
  await expect(readUpload(request)).rejects.toThrow(/5 MiB/);
  await expect(readUpload(new Request("http://localhost", { method: "POST", body: "", headers: { "content-length": String(FILE_LIMIT + 1) } }))).rejects.toThrow(/5 MiB/);
  await expect(readUpload(new Request("http://localhost", { method: "POST", body: "" }))).rejects.toThrow(/nonempty/);
});
it("a stalled body is cancelled, never parsed as partial success", async () => {
  vi.useFakeTimers(); const cancel = vi.fn();
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2])); }, cancel });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
  const result = readUpload(request); const rejection = expect(result).rejects.toThrow(/timed out/);
  await vi.advanceTimersByTimeAsync(10001); await rejection; expect(cancel).toHaveBeenCalledOnce();
});
it("terminates real child processes on cancellation and frees admission slots", async () => {
  for (let i = 0; i < 3; i++) { const controller = new AbortController(); const result = extractUpload(Buffer.from("%PDF-1.7 test"), "pdf", controller.signal); controller.abort(); await expect(result).rejects.toThrow(/cancelled/); }
});
it("deadline kills a real child and releases its slot after process close", async () => {
  vi.useFakeTimers();
  const result = extractUpload(Buffer.from("%PDF-1.7 test"), "pdf", new AbortController().signal);
  const rejection = expect(result).rejects.toThrow(/too long/);
  await vi.advanceTimersByTimeAsync(12001); vi.useRealTimers(); await rejection;
});
it("preserves Unicode across multiple child stdout chunks", async () => {
  const text = "ế".repeat(23000); const bytes = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph(text)] }] }));
  expect((await extractUpload(bytes, "docx", new AbortController().signal)).text).toBe(text);
});
it("bounds actual parser concurrency without queuing more children", async () => {
  const controller = new AbortController(); const first = extractUpload(Buffer.from("%PDF-1.7 test"), "pdf", controller.signal); const second = extractUpload(Buffer.from("%PDF-1.7 test"), "pdf", controller.signal);
  await expect(extractUpload(Buffer.from("test"), "pdf", controller.signal)).rejects.toThrow(/busy/);
  const complete = Promise.allSettled([first, second]); controller.abort(); expect((await complete).every(r => r.status === "rejected")).toBe(true);
});
