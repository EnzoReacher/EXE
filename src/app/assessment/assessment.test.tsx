// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssessmentForm from "./assessment-form";
import AuthControls from "./auth-controls";

const { signIn, signUp, replace, refresh } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: { signInWithPassword: signIn, signUp } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); signIn.mockReset(); signUp.mockReset(); replace.mockReset(); refresh.mockReset(); });
const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status });
function workspaceFetch() {
  return vi.fn().mockResolvedValueOnce(json({ cvs: [] })).mockResolvedValueOnce(json({ jobs: [] }));
}

describe("Assessment interactions", () => {
  it("returns focus to the persistent CV heading after confirmed deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ cvs: [{ id: "sample-cv", originalFilename: "sample.pdf", processingStatus: "ready" }] })).mockResolvedValueOnce(json({ jobs: [] })).mockResolvedValueOnce(json({ deleted: true })));
    render(<AssessmentForm />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete CV sample.pdf" }));
    await screen.findByText("Your CV, extracted text, and saved evidence reports were deleted. Target jobs were kept.");
    expect(screen.queryByRole("button", { name: "Delete CV sample.pdf" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Add your CV" }));
  });

  it("locks intake edits through deferred upload and job save and submits the validated snapshot", async () => {
    let resolveUpload!: (response: Response) => void;
    let resolveJob!: (response: Response) => void;
    const upload = new Promise<Response>((resolve) => { resolveUpload = resolve; });
    const job = new Promise<Response>((resolve) => { resolveJob = resolve; });
    const fetchMock = workspaceFetch().mockReturnValueOnce(upload).mockReturnValueOnce(job);
    vi.stubGlobal("fetch", fetchMock);
    render(<AssessmentForm />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Save CV and target job" }) as HTMLButtonElement).disabled).toBe(false));
    const file = screen.getByLabelText("CV file (required)") as HTMLInputElement;
    const role = screen.getByLabelText("Target role (required)") as HTMLInputElement;
    const company = screen.getByLabelText(/Company/) as HTMLInputElement;
    const description = screen.getByLabelText("Job description (required)") as HTMLTextAreaElement;
    const sampleDescription = "Sample responsibilities and requirements for testing.";
    await userEvent.upload(file, new File(["sample"], "sample.pdf", { type: "application/pdf" }));
    await userEvent.type(role, "  Sample analyst  ");
    await userEvent.type(company, "  Sample company  ");
    await userEvent.type(description, `  ${sampleDescription}  `);
    await userEvent.click(screen.getByRole("button", { name: "Save CV and target job" }));
    for (const field of [file, role, company, description]) expect(field.disabled).toBe(true);
    await userEvent.type(role, "unsaved edit");
    await userEvent.type(company, "unsaved edit");
    await userEvent.type(description, "unsaved edit");
    await userEvent.upload(file, new File(["changed"], "changed.pdf", { type: "application/pdf" }));
    expect(file.files?.[0].name).toBe("sample.pdf");
    expect(role.value).toBe("  Sample analyst  ");
    expect(company.value).toBe("  Sample company  ");
    expect(description.value).toBe(`  ${sampleDescription}  `);

    resolveUpload(json({ cv: { id: "sample-cv", originalFilename: "sample.pdf", processingStatus: "ready" } }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe("/api/intake/jobs");
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ roleTitle: "Sample analyst", companyName: "Sample company", jobDescription: sampleDescription });
    for (const field of [file, role, company, description]) expect(field.disabled).toBe(true);
    await userEvent.type(role, "another unsaved edit");
    expect(role.value).toBe("  Sample analyst  ");
    resolveJob(json({ error: "Sample job save failed" }, 500));
    await screen.findByText(/Sample job save failed.*Your uploaded CV is kept/);
    for (const field of [file, role, company, description]) expect(field.disabled).toBe(false);
    expect(file.files?.length).toBe(0);
    expect(role.value).toBe("  Sample analyst  ");
    expect(company.value).toBe("  Sample company  ");
    expect(description.value).toBe(`  ${sampleDescription}  `);
    expect(screen.getByRole("button", { name: "Save target job" })).toBeTruthy();
    fetchMock.mockResolvedValueOnce(json({ job: { id: "sample-job", roleTitle: "Sample analyst", companyName: "Sample company" } }));
    await userEvent.click(screen.getByRole("button", { name: "Save target job" }));
    await screen.findByText("Your target job was saved. Choose a processed CV below to create a report.");
    expect(fetchMock.mock.calls.filter(([url, options]) => url === "/api/intake/cv" && options?.method === "POST")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url, options]) => url === "/api/intake/jobs" && options?.method === "POST")).toHaveLength(2);

  });

  it("reloads the dependent workspace after successful sign-in", async () => {
    signIn.mockResolvedValue({ error: null });
    const fetchMock = workspaceFetch().mockResolvedValueOnce(json({ cvs: [] })).mockResolvedValueOnce(json({ jobs: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<><AuthControls /><AssessmentForm /></>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await userEvent.type(screen.getByLabelText("Email (required)"), "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });

  it("connects field errors, focuses the first error, and preserves entered values", async () => {
    const fetchMock = workspaceFetch(); vi.stubGlobal("fetch", fetchMock);
    render(<AssessmentForm />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Save CV and target job" }) as HTMLButtonElement).disabled).toBe(false));
    const role = screen.getByLabelText("Target role (required)") as HTMLInputElement;
    fireEvent.change(role, { target: { value: "A" } });
    await userEvent.click(screen.getByRole("button", { name: "Save CV and target job" }));
    const file = screen.getByLabelText("CV file (required)");
    expect(document.activeElement).toBe(file);
    expect(file.getAttribute("aria-invalid")).toBe("true");
    expect(role.value).toBe("A");
    expect(role.getAttribute("aria-describedby")).toContain("role-error");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves file and job input after a save error and permits workspace reload", async () => {
    const fetchMock = workspaceFetch().mockResolvedValueOnce(json({ error: "Sample upload failed" }, 500)).mockResolvedValueOnce(json({ cvs: [] })).mockResolvedValueOnce(json({ jobs: [] }));
    vi.stubGlobal("fetch", fetchMock); render(<AssessmentForm />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Reload workspace" }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.upload(screen.getByLabelText("CV file (required)"), new File(["sample"], "sample.pdf", { type: "application/pdf" }));
    await userEvent.type(screen.getByLabelText("Target role (required)"), "Sample analyst");
    await userEvent.type(screen.getByLabelText("Job description (required)"), "Sample responsibilities and requirements for testing.");
    await userEvent.click(screen.getByRole("button", { name: "Save CV and target job" }));
    await screen.findByText("Sample upload failed");
    expect((screen.getByLabelText("Target role (required)") as HTMLInputElement).value).toBe("Sample analyst");
    expect((screen.getByLabelText("CV file (required)") as HTMLInputElement).files?.[0].name).toBe("sample.pdf");
    await userEvent.click(screen.getByRole("button", { name: "Reload workspace" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  });

  it("blocks duplicate CV retry and overlapping actions while processing", async () => {
    let resolveRetry!: (response: Response) => void;
    const retry = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    const cv = { id: "cv-sample", originalFilename: "sample.pdf", processingStatus: "failed" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ cvs: [cv] })).mockResolvedValueOnce(json({ jobs: [] })).mockReturnValueOnce(retry));
    render(<AssessmentForm />);
    const button = await screen.findByRole("button", { name: "Retry processing sample.pdf" });
    await userEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Delete CV sample.pdf" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Save target job" }) as HTMLButtonElement).disabled).toBe(true);
    resolveRetry(json({ cv: { ...cv, processingStatus: "ready" } }));
    await screen.findByText("Your CV was processed successfully.");
  });

  it("validates sign-in fields and retains credentials when authentication fails", async () => {
    signIn.mockResolvedValue({ error: new Error("Fictional internal database configuration detail") });
    render(<AuthControls />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const email = screen.getByLabelText("Email (required)") as HTMLInputElement;
    expect(document.activeElement).toBe(email);
    expect(email.getAttribute("aria-invalid")).toBe("true");
    await userEvent.type(email, "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("We could not complete sign-in or account creation. Check your details and connection, then try again.");
    expect(screen.queryByText(/Fictional internal database/)).toBeNull();
    expect(email.value).toBe("sample@example.invalid");
    expect((screen.getByLabelText("Password (required)") as HTMLInputElement).value).toBe("sample-password");
  });

  it("submits sign-up with a same-origin PKCE callback and gives a neutral confirmation message", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "synthetic-user" }, session: null }, error: null });
    render(<AuthControls appearance="standalone" initialMode="signUp" />);
    await userEvent.type(screen.getByLabelText("Email (required)"), "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    await userEvent.type(screen.getByLabelText("Confirm password (required)"), "sample-password");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByText(/If this address can receive a confirmation/);
    expect(signUp).toHaveBeenCalledWith({
      email: "sample@example.invalid",
      password: "sample-password",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens the workspace when local Supabase returns an active sign-up session", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "synthetic-user" }, session: { access_token: "synthetic-token" } }, error: null });
    render(<AuthControls appearance="standalone" initialMode="signUp" />);
    await userEvent.type(screen.getByLabelText("Email (required)"), "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    await userEvent.type(screen.getByLabelText("Confirm password (required)"), "sample-password");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/assessment"));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires matching passwords before sending a sign-up request", async () => {
    render(<AuthControls appearance="standalone" initialMode="signUp" />);
    await userEvent.type(screen.getByLabelText("Email (required)"), "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    const confirmation = screen.getByLabelText("Confirm password (required)");
    await userEvent.type(confirmation, "different-password");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByText("Enter the same password in both fields.");
    expect(document.activeElement).toBe(confirmation);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("navigates to the private workspace after successful sign-in", async () => {
    signIn.mockResolvedValue({ data: { user: { id: "synthetic-user" }, session: {} }, error: null });
    render(<AuthControls appearance="standalone" />);
    await userEvent.type(screen.getByLabelText("Email (required)"), "sample@example.invalid");
    await userEvent.type(screen.getByLabelText("Password (required)"), "sample-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/assessment"));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not announce success when CV retry saves a failed parse state", async () => {
    const cv = { id: "cv-sample", originalFilename: "sample.pdf", processingStatus: "failed" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ cvs: [cv] })).mockResolvedValueOnce(json({ jobs: [] })).mockResolvedValueOnce(json({ cv })));
    render(<AssessmentForm />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry processing sample.pdf" }));
    await screen.findByText("We still could not read this CV. Check the file, replace it with a readable PDF or DOCX, or delete it.");
    expect(screen.queryByText("Your CV was processed successfully.")).toBeNull();
    expect((screen.getByRole("button", { name: "Retry processing sample.pdf" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
