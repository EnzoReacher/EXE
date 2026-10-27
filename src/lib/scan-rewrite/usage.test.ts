import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reserveUsage } from "./usage";
afterEach(() => vi.resetAllMocks());
function client(result: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: result, error });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>); return rpc;
}
it("fails closed for absent quota infrastructure", async () => {
  const rpc = client(null, { code: "missing" }); await expect(reserveUsage("synthetic-request-id", "scan",'a'.repeat(64))).rejects.toThrow(/usage controls are unavailable/); expect(rpc).toHaveBeenCalledTimes(1);
});
it.each(["duplicate", "busy", "quota", "reconcile", null])("does not permit provider work on %s", async state => {
  client(state); await expect(reserveUsage("synthetic-request-id", "rewrite",'a'.repeat(64))).rejects.toThrow();
});
it("uses session-derived RPC identity, a private random ticket and explicit outcome", async () => {
  const rpc = client("reserved"); const finish = await reserveUsage("synthetic-request-id", "scan",'a'.repeat(64)); rpc.mockResolvedValue({ data: true, error: null });
  expect(rpc.mock.calls[0][1]).toEqual({ p_id: "synthetic-request-id", p_action: "scan", p_ticket_hash: expect.stringMatching(/^[a-f0-9]{64}$/),p_digest:expect.stringMatching(/^[a-f0-9]{64}$/) });
  await finish("unknown"); expect(rpc.mock.calls[1][1]).toEqual({ p_id: "synthetic-request-id", p_ticket_hash: rpc.mock.calls[0][1].p_ticket_hash, p_state: "unknown" });
});
it.each([{ data: false, error: null }, { data: null, error: { message: "PRIVATE_RPC_DETAIL" } }])("requires a verified finish acknowledgement without exposing RPC internals", async reply => {
  const rpc = client("reserved"); const finish = await reserveUsage("synthetic-request-id", "scan", "a".repeat(64)); rpc.mockResolvedValue(reply);
  await expect(finish("unknown")).rejects.toMatchObject({ code: "usage_acknowledgement" }); expect(rpc).toHaveBeenCalledTimes(2);
});
