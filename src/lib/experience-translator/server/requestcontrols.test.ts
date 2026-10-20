import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { Controls, requestBody } from "./requestcontrols";
import type { LiveSession } from "../live-types";
const view: LiveSession = { token: "capability", revision: 1, sources: [], facts: [], questions: [], requirements: [] };
describe("bounded local capabilities", () => {
  it("expires sessions, rejects foreign/old revisions and forgets", () => {
    let now = 100; const c = new Controls(() => now); c.add(view, "jd"); expect(c.get(view.token, 1).view).toBe(view);
    expect(() => c.get("foreign", 1)).toThrow(); expect(() => c.get(view.token, 2)).toThrow();
    now += 15 * 60000; expect(() => c.get(view.token, 1)).toThrow(); c.add(view, "jd"); c.forget(view.token); expect(() => c.get(view.token, 1)).toThrow();
  });
  it("coalesces inflight duplicates and rejects request-ID payload conflicts", async () => {
    const c = new Controls(); c.add(view, "jd"); const s = c.get(view.token, 1); let finish!: (v: string) => void;
    const task = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    const a = c.run(s, "id", { a: 1 }, task); const b = c.run(s, "id", { a: 1 }, task); await Promise.resolve();
    await expect(c.run(s, "id", { a: 2 }, task)).rejects.toThrow(/different input/); finish("ok"); expect(await a).toBe("ok"); expect(await b).toBe("ok"); expect(task).toHaveBeenCalledTimes(1);
  });
  it("bounds concurrent operations, workflow calls, store size and rate", async () => {
    const c = new Controls(); c.add(view, "jd"); const s = c.get(view.token, 1);
    for (let i = 0; i < 6; i++) await c.run(s, String(i), i, async () => i);
    await expect(c.run(s, "excess", {}, async () => 1)).rejects.toThrow(/Too many/);
    const d = new Controls(); const pending = d.run(undefined, "a", {}, () => new Promise(() => {})); void pending;
    void d.run(undefined, "b", {}, () => new Promise(() => {})); await expect(d.run(undefined, "c", {}, async () => 1)).rejects.toThrow(/Too many/);
    for (let i = 1; i < 64; i++) c.add({ ...view, token: String(i) }, "jd"); expect(() => c.add({ ...view, token: "extra" }, "jd")).toThrow(/full/);
  });
  it("rejects origin/host/content/body mismatches before processing", async () => {
    const config = { origin: "http://127.0.0.1:4351", key: "synthetic", model: "synthetic" };
    const headers = { host: "127.0.0.1:4351", origin: config.origin, "content-type": "application/json" };
    const request = (extra = {}, body = "{}") => new Request(config.origin + "/api/experience-translator/prepare", { method: "POST", headers: { ...headers, ...extra }, body });
    expect(await requestBody(request(), config)).toEqual({});
    for (const extra of [{ origin: "http://evil.test" }, { host: "evil.test" }, { "content-type": "text/plain" }, { "sec-fetch-site": "cross-site" }, { "content-length": "100001" }]) await expect(requestBody(request(extra), config)).rejects.toThrow();
    await expect(requestBody(request({}, "x"), config)).rejects.toThrow(); await expect(requestBody(request({}, "x".repeat(100001)), config)).rejects.toThrow();
  });
});
