// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "./error";

afterEach(cleanup);

it("allows keyboard retry without disclosing error details or workspace navigation", async () => {
  const retry = vi.fn();
  render(<ErrorPage error={Object.assign(new Error("fictional private storage path /owner/secret"), { digest: "fictional-internal-id" })} retry={retry} />);
  expect(screen.getByRole("main").id).toBe("main-content");
  expect(screen.queryByText(/fictional private storage/)).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("may not have finished");
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retry loading this page" }));
  await userEvent.keyboard("{Enter}");
  expect(retry).toHaveBeenCalledOnce();
});
