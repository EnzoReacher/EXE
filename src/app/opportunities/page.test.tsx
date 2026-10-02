// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./opportunities-workspace", () => ({ default: () => <section>Workspace</section> }));
import OpportunitiesPage, { metadata } from "./page";
afterEach(cleanup);

it("provides a descriptive title and focusable shared skip-link destination", () => {
  render(<OpportunitiesPage />);
  const main = screen.getByRole("main");
  expect(main.id).toBe("main-content");
  expect(main.tabIndex).toBe(-1);
  main.focus();
  expect(document.activeElement).toBe(main);
  expect(metadata.title).toBe("Private opportunities | EXE");
});
