// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "./page";

afterEach(() => cleanup());

describe("public landing page", () => {
  it("provides working sign-up and sign-in destinations", () => {
    render(<Home />);
    expect(screen.getAllByRole("link", { name: "Create account" }).every((link) => link.getAttribute("href") === "/sign-up")).toBe(true);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });

  it("keeps the product description bounded to current prototype behavior", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "See how your CV connects to a target role." })).toBeTruthy();
    expect(screen.getByText(/does not score your hiring chances, verify qualifications, or guarantee a job/i)).toBeTruthy();
    expect(screen.getByText(/fictional CV and job information/i)).toBeTruthy();
  });
});
