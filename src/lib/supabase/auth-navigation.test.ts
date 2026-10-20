import { afterEach, expect, it, vi } from "vitest";
import { openAuthenticatedWorkspace } from "./auth-navigation";

afterEach(() => vi.unstubAllGlobals());

it("replaces the document so the first workspace request includes persisted cookies", () => {
  const replace = vi.fn();
  vi.stubGlobal("window", { location: { replace } });
  openAuthenticatedWorkspace();
  expect(replace).toHaveBeenCalledExactlyOnceWith("/assessment");
});
