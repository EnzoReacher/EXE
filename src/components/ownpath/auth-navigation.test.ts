import { afterEach, expect, it, vi } from "vitest";
import { continueAfterAuth } from "./auth-navigation";

afterEach(() => vi.unstubAllGlobals());

it("uses fresh-document replacement directly to /app", () => {
  const replace = vi.fn();
  vi.stubGlobal("window", { location: { replace } });
  continueAfterAuth();
  expect(replace).toHaveBeenCalledExactlyOnceWith("/app");
});
