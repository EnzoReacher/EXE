// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CVUpload from "./cv-upload";
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const file = (name = "synthetic.pdf") => new File(["%PDF-1.7 synthetic"], name, { type: "application/pdf" });
function select(container: HTMLElement, value = file()) { fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [value] } }); }
it("populates editable source only after extraction; no AI operation", async () => {
  const onExtract = vi.fn(); const fetch = vi.fn().mockResolvedValue(Response.json({ text: "Fictional teacher" })); vi.stubGlobal("fetch", fetch);
  const view = render(<CVUpload cv="" onExtract={onExtract} />); select(view.container);
  await waitFor(() => expect(onExtract).toHaveBeenCalledWith("Fictional teacher"));
  expect(fetch.mock.calls[0][0]).toBe("/api/cv-review/extract?type=pdf"); expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove attachment" })); expect(onExtract).toHaveBeenCalledTimes(1);
});
it("requires cancel-first confirmation before replacing text", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const view = render(<CVUpload cv="Manual CV" onExtract={vi.fn()} />); select(view.container);
  fireEvent.click(await screen.findByRole("button", { name: "Cancel" })); expect(fetch).not.toHaveBeenCalled();
});
it("rejects unsupported and oversized files before transmission", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const view = render(<CVUpload cv="" onExtract={vi.fn()} />);
  select(view.container, file("wrong.doc")); expect(screen.getByRole("alert").textContent).toMatch(/PDF or DOCX/);
  select(view.container, new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })); expect(fetch).not.toHaveBeenCalled();
});
it("late extraction cannot replace newer manual text", async () => {
  let resolve!: (response: Response) => void; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const onExtract = vi.fn(); const view = render(<CVUpload cv="" onExtract={onExtract} />); select(view.container);
  view.rerender(<CVUpload cv="New manual edit" onExtract={onExtract} />); resolve(Response.json({ text: "Late result" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Extraction cancelled/)); expect(onExtract).not.toHaveBeenCalled();
});
it("rapid replacement and cancellation ignore pending replies", async () => {
  const resolvers: ((r: Response) => void)[] = []; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => resolvers.push(r))));
  const onExtract = vi.fn(); const view = render(<CVUpload cv="" onExtract={onExtract} />); select(view.container); select(view.container, file("second.pdf"));
  resolvers[0](Response.json({ text: "First stale result" })); fireEvent.click(screen.getByRole("button", { name: "Cancel extraction" })); resolvers[1](Response.json({ text: "Second cancelled result" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/cancelled/)); expect(onExtract).not.toHaveBeenCalled();
});
it("releases the parent extraction lock when the upload child unmounts; retained text needs no reupload", async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>(r => { resolve = r; })); vi.stubGlobal("fetch", fetch);
  const processing = vi.fn(); const onExtract = vi.fn();
  const view = render(<CVUpload cv="Retained valid CV" onExtract={onExtract} onProcessingChange={processing} />);
  select(view.container); fireEvent.click(await screen.findByRole("button", { name: "Replace CV text" }));
  await waitFor(() => expect(processing).toHaveBeenLastCalledWith(true));
  view.unmount(); expect(processing).toHaveBeenLastCalledWith(false);
  resolve(Response.json({ text: "Late text" })); await Promise.resolve(); expect(onExtract).not.toHaveBeenCalled();
  render(<CVUpload cv="Retained valid CV" onExtract={onExtract} onProcessingChange={processing} />);
  expect(processing).toHaveBeenLastCalledWith(false); expect(screen.getByText("CV text retained")).toBeTruthy(); expect(fetch).toHaveBeenCalledOnce();
});
