// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => { throw new Error("unconfigured"); } }));
import { getCurrentUser } from "@/lib/supabase/server";
import Home from "./page";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("OwnPath landing", () => {
  it("offers signup and explains the complete version journey", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); render(await Home());
    expect(screen.getAllByRole("link", { name: /Get started/ }).every(a => a.getAttribute("href") === "/sign-up")).toBe(true);
    expect(screen.getByRole("heading", {level:1}).textContent).toContain("Rewrite your CV.");
    expect(screen.getByText("Fictional example")).toBeTruthy();
    expect(screen.getByText(/Scan first · Rewrite when you choose/)).toBeTruthy();
    expect(screen.queryByText("Try the Translator")).toBeNull();
  });
  it("still renders landing on direct visits by signed-in users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({id:"synthetic"} as Awaited<ReturnType<typeof getCurrentUser>>); render(await Home());
    expect(screen.getAllByRole("link", {name:/Go to workspace/})[0].getAttribute("href")).toBe("/app");
    expect(screen.getByText("Fictional example")).toBeTruthy();
  });
});
