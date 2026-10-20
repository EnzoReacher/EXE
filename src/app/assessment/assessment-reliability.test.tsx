// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
const auth = vi.hoisted(() => ({ callback: null as null | ((event: string, session: { user: { id: string } } | null) => void) }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: (callback: typeof auth.callback) => { auth.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import AssessmentForm from "./assessment-form";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const cv = (id: string) => ({ id, originalFilename: `${id}.pdf`, processingStatus: "ready" });
const job = (id: string) => ({ id, roleTitle: id, companyName: null });
const json = (body: unknown) => new Response(JSON.stringify(body));
it.each(["cv", "job"])("delayed %s deletion cannot restore a pre-refresh list or selection", async kind => {
  vi.spyOn(window, "confirm").mockReturnValue(true); let finish!: (r: Response) => void;
  const fetch = vi.fn().mockResolvedValueOnce(json({ cvs: [cv("A"), cv("B")] })).mockResolvedValueOnce(json({ jobs: [job("A"), job("B")] })).mockReturnValueOnce(new Promise<Response>(r => { finish = r; })).mockResolvedValueOnce(json({ cvs: [cv("A"), cv("C")] })).mockResolvedValueOnce(json({ jobs: [job("A"), job("C")] })); vi.stubGlobal("fetch", fetch);
  render(<AssessmentForm />); fireEvent.click(await screen.findByRole("button", { name: kind === "cv" ? "Delete CV A.pdf" : "Delete target job A" })); window.dispatchEvent(new Event("exe:workspace-signed-in")); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
  await act(async () => finish(json({ deleted: true }))); const select = screen.getByLabelText(kind === "cv" ? "Saved CV for report" : "Saved target job for report") as HTMLSelectElement;
  expect(select.value).not.toBe("B"); expect(Array.from(select.options).some(o => o.value === "B")).toBe(false); expect(Array.from(select.options).some(o => o.value === "C")).toBe(true);
});
it("cancels replacement without modifying saved records and restores focus", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ cvs: [cv("A")] })).mockResolvedValueOnce(json({ jobs: [] }))); render(<AssessmentForm />); fireEvent.click(await screen.findByRole("button", { name: "Replace A.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel replacement" })); expect(screen.queryByRole("heading", { name: "Replace your CV" })).toBeNull(); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Replace A.pdf" })); expect(screen.getByRole("button", { name: "Delete CV A.pdf" })).toBeTruthy();
});
it("an older pending workspace load cannot overwrite a newer refresh", async () => {
  let oldCvs!:(value:Response)=>void,oldJobs!:(value:Response)=>void;
  const fetch=vi.fn().mockReturnValueOnce(new Promise<Response>(r=>{oldCvs=r;})).mockReturnValueOnce(new Promise<Response>(r=>{oldJobs=r;})).mockResolvedValueOnce(json({cvs:[cv('C')]})).mockResolvedValueOnce(json({jobs:[job('C')]}));vi.stubGlobal('fetch',fetch);render(<AssessmentForm/>);await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));act(()=>window.dispatchEvent(new Event('exe:workspace-signed-in')));await screen.findByRole('button',{name:'Delete CV C.pdf'});
  await act(async()=>{oldCvs(json({cvs:[cv('A')]}));oldJobs(json({jobs:[job('A')]}));});expect((screen.getByLabelText('Saved CV for report') as HTMLSelectElement).value).toBe('C');expect(screen.queryByRole('button',{name:'Delete CV A.pdf'})).toBeNull();
});
it("failed delayed deletion preserves the latest refreshed records and selection", async()=>{
  vi.spyOn(window,'confirm').mockReturnValue(true);let finish!:(value:Response)=>void;const fetch=vi.fn().mockResolvedValueOnce(json({cvs:[cv('A'),cv('B')]})).mockResolvedValueOnce(json({jobs:[]})).mockReturnValueOnce(new Promise<Response>(r=>{finish=r;})).mockResolvedValueOnce(json({cvs:[cv('C')]})).mockResolvedValueOnce(json({jobs:[]}));vi.stubGlobal('fetch',fetch);render(<AssessmentForm/>);fireEvent.click(await screen.findByRole('button',{name:'Delete CV A.pdf'}));act(()=>window.dispatchEvent(new Event('exe:workspace-signed-in')));await screen.findByRole('button',{name:'Delete CV C.pdf'});await act(async()=>finish(new Response('gateway',{status:504})));expect((screen.getByLabelText('Saved CV for report') as HTMLSelectElement).value).toBe('C');expect(screen.queryByRole('button',{name:'Delete CV A.pdf'})).toBeNull();expect(screen.getByRole('alert').textContent).toContain('could not confirm');
});
it("account switching invalidates a pending deletion and clears old private state",async()=>{
  vi.spyOn(window,'confirm').mockReturnValue(true);let finish!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(json({cvs:[cv('A')]})).mockResolvedValueOnce(json({jobs:[]})).mockReturnValueOnce(new Promise<Response>(r=>{finish=r;})));render(<AssessmentForm owner="owner-A"/>);fireEvent.click(await screen.findByRole('button',{name:'Delete CV A.pdf'}));act(()=>auth.callback?.('SIGNED_IN',{user:{id:'owner-B'}}));await act(async()=>finish(json({deleted:true})));expect(screen.queryByRole('button',{name:'Delete CV A.pdf'})).toBeNull();expect(screen.queryByText(/Your CV and its dependent reports/)).toBeNull();
});
it("replacement posts only a new upload and keeps old/new CVs after a partial job-save failure",async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(json({cvs:[cv('A')]})).mockResolvedValueOnce(json({jobs:[]})).mockResolvedValueOnce(json({cv:cv('new')})).mockResolvedValueOnce(new Response('gateway',{status:502}));vi.stubGlobal('fetch',fetch);render(<AssessmentForm/>);fireEvent.click(await screen.findByRole('button',{name:'Replace A.pdf'}));await userEvent.upload(screen.getByLabelText('CV file (required)'),new File(['synthetic'],'new.pdf',{type:'application/pdf'}));fireEvent.change(screen.getByLabelText('Target role (required)'),{target:{value:'Synthetic role'}});fireEvent.change(screen.getByLabelText('Job description (required)'),{target:{value:'Synthetic requirements with more than thirty characters.'}});fireEvent.click(screen.getByRole('button',{name:'Save CV and target job'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Your uploaded CV is kept'));expect((fetch.mock.calls[2][1].body as FormData).has('replaceCvId')).toBe(false);expect(screen.getByRole('button',{name:'Delete CV A.pdf'})).toBeTruthy();expect(screen.getByRole('button',{name:'Delete CV new.pdf'})).toBeTruthy();expect(fetch.mock.calls.some(([,options])=>options?.method==='DELETE')).toBe(false);
});
