// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "./page";

afterEach(() => cleanup());

describe("public landing page", () => {
  it("opens the public synthetic Translator while keeping private sign-in available", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Translate a project" }).getAttribute("href")).toBe("/experience-translator");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });

  it("keeps the product description bounded to current prototype behavior", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Turn Your Experience Into Career Value." })).toBeTruthy();
    expect(screen.getByText(/does not score your hiring chances, verify qualifications, or guarantee a job/i)).toBeTruthy();
    expect(screen.getByText(/fictional project and job information/i)).toBeTruthy();
  });
});
