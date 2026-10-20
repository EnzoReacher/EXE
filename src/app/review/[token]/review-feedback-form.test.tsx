// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReviewFeedbackForm from "./review-feedback-form";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const feedback = "This is a useful example to expand on.";
const response = (ok: boolean, body: object) => ({ ok, json: async () => body });

describe("private reviewer feedback", () => {
  it("resets only after confirmed success, without the post-await currentTarget failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReviewFeedbackForm token="test-link" />);
    const input = screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement;
    expect(input.getAttribute("aria-describedby")).toBe("reviewer-feedback-length");
    await user.type(screen.getByLabelText(/Display name/), "Test reviewer");
    await user.type(input, feedback);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => expect(screen.getByText(/Thank you/)).toBeTruthy());
    expect(input.value).toBe("");
    expect((screen.getByLabelText(/Display name/) as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves all entered data on failure and reuses the submission ID when retrying", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValueOnce(response(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReviewFeedbackForm token="test-link" />);
    await user.type(screen.getByLabelText(/Display name/), "Test reviewer");
    await user.type(screen.getByLabelText(/^Role/), "Mentor");
    await user.type(screen.getByLabelText("Feedback (required)"), feedback);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Connection interrupted");
    expect((screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement).value).toBe(feedback);
    expect((screen.getByLabelText(/Display name/) as HTMLInputElement).value).toBe("Test reviewer");
    expect((screen.getByLabelText(/^Role/) as HTMLInputElement).value).toBe("Mentor");
    await user.click(screen.getByRole("button", { name: "Retry original feedback" }));
    await screen.findByText(/Thank you/);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    const retry = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retry).toEqual(first);
  });

  it("binds a committed submission with a lost response to its original payload, never revised feedback", async () => {
    const saved = new Map<string, { submissionId: string; feedback: string }>();
    let loseResponse = true;
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(options.body as string);
      // Model the server's ON CONFLICT DO NOTHING behavior.
      if (!saved.has(payload.submissionId)) saved.set(payload.submissionId, payload);
      if (loseResponse) { loseResponse = false; throw new Error("Response lost after commit"); }
      return response(true, { submitted: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReviewFeedbackForm token="test-link" />);
    const input = screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement;
    await user.type(screen.getByLabelText(/Display name/), "Original reviewer");
    await user.type(screen.getByLabelText(/^Role/), "Original role");
    await user.type(input, feedback);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByRole("alert");
    expect(saved.size).toBe(1);
    expect(screen.getByText(/Your feedback may already have reached/)).toBeTruthy();
    for (const field of [input, screen.getByLabelText(/Display name/), screen.getByLabelText(/^Role/)]) {
      expect((field as HTMLInputElement).disabled).toBe(true);
    }
    await user.type(input, "Revised feedback must not be claimed as submitted.");
    expect(input.value).toBe(feedback);
    // Even an out-of-band DOM edit cannot change the payload bound to this ID.
    input.value = "Revised feedback must not be claimed as submitted.";
    await user.click(screen.getByRole("button", { name: "Retry original feedback" }));
    await screen.findByText("Thank you. Your original feedback was shared with the report owner.");
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
    expect(saved.size).toBe(1);
    expect([...saved.values()][0].feedback).toBe(feedback);
    expect(screen.queryByText("Thank you. Your feedback was shared with the report owner.")).toBeNull();
    expect(input.value).toBe("");
    expect(input.disabled).toBe(false);
  });

  it("allows corrections after a definite validation rejection and assigns a new payload ID", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ...response(false, { error: "Please correct your feedback" }), status: 400 })
      .mockResolvedValueOnce(response(true, { submitted: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReviewFeedbackForm token="test-link" />);
    const input = screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement;
    await user.type(input, feedback);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByRole("alert");
    expect(input.disabled).toBe(false);
    await user.clear(input);
    await user.type(input, "This is corrected feedback for the owner.");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByText(/Thank you/);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    const corrected = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(corrected.submissionId).not.toBe(first.submissionId);
    expect(corrected.feedback).toBe("This is corrected feedback for the owner.");
  });

  it("announces pending feedback and prevents edits and duplicate submission while pending", async () => {
    let finish!: (value: object) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReviewFeedbackForm token="test-link" />);
    await user.type(screen.getByLabelText("Feedback (required)"), feedback);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(screen.getByRole("status").textContent).toContain("Please wait");
    expect((screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement).disabled).toBe(true);
    const button = screen.getByRole("button", { name: "Submitting feedback…" });
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(response(false, { error: "Try again" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Feedback (required)") as HTMLTextAreaElement).value).toBe(feedback);
  });
});
