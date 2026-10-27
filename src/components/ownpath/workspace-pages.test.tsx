// @vitest-environment jsdom
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { draftProfile, emptyDraft, parseReview, revision, type Draft } from "@/lib/cv-review/domain";
let initial: Draft;
const Shared = createContext<{draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>} | null>(null);
vi.mock("./workspace-shell",()=>({useDraft:()=>{const shared=useContext(Shared);const [draft,setDraft]=useState(initial);return shared || {draft,setDraft};}}));
import { TailorEditor, WorkspaceHome, ProfileEditor, VersionEditor } from "./workspace-pages";
const source="Nguyễn An\nChecked invoices.\nUpdated schedules.\nEducation\nDiploma 2023";
beforeEach(()=>{
 const profile={...draftProfile(source),confirmed:true};
 const review=parseReview({summary:["Synthetic response"],suggestions:[{blockId:"b2",original:"Checked invoices.",proposed:"Checked invoices!",reason:"Punctuation",kind:"wording",question:"",sourceIds:["b2"]},{blockId:"b3",original:"Updated schedules.",proposed:"Updated the schedules.",reason:"Grammar",kind:"clarification",question:"Which schedules?",sourceIds:["b3"]}],mapping:[]},profile,"","English");
 initial={...emptyDraft,source,profile,review,step:"review"};
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({profiles:[],versions:[]})}));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("applies explicit decisions and bulk undo without changing other sections",async()=>{
 render(<TailorEditor/>); await screen.findByText("Synthetic response");
 fireEvent.click(screen.getByRole("button",{name:"Accept eligible wording changes"}));expect(screen.getByTestId("final-cv").textContent).toBe(source.replace("Checked invoices.","Checked invoices!"));expect(screen.getByTestId("final-cv").textContent).toContain("Updated schedules.");
 fireEvent.click(screen.getByRole("button",{name:"Undo bulk acceptance"}));expect(screen.getByTestId("final-cv").textContent).toBe(source);
 fireEvent.click(screen.getAllByRole("button",{name:"Accept"})[1]);expect(screen.getByTestId("final-cv").textContent).toContain("Updated the schedules.");
 fireEvent.click(screen.getAllByRole("button",{name:"Edit"})[0]);fireEvent.change(screen.getByLabelText("Your wording"),{target:{value:"Kiểm tra hóa đơn."}});expect(screen.getByTestId("final-cv").textContent).toContain("Kiểm tra hóa đơn.");
 fireEvent.click(screen.getAllByRole("button",{name:"Dismiss"})[0]);expect(screen.getByTestId("final-cv").textContent).toContain("Checked invoices.");
 fireEvent.click(screen.getAllByRole("button",{name:"Undo"})[0]);expect(screen.getByTestId("final-cv").textContent).toContain("Checked invoices.");
 fireEvent.change(screen.getByLabelText("Job description (optional)"),{target:{value:"New job"}});expect(screen.queryByTestId("final-cv")).toBeNull();expect(screen.getByRole("status").textContent).toContain("Regenerate");
});
it("prevents duplicate AI submission and recovers malformed output with current inputs",async()=>{
 let resolve!:(v:unknown)=>void;const fetch=vi.fn().mockImplementation((path:string)=>path.includes("/review")?new Promise(r=>{resolve=r;}):Promise.resolve({ok:true,json:async()=>({profiles:[],versions:[]})}));vi.stubGlobal("fetch",fetch);
 render(<TailorEditor/>);fireEvent.click(screen.getByLabelText("I agree to send this experience and optional job description to OpenAI."));const button=screen.getByRole("button",{name:"Propose improvements"});act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(fetch.mock.calls.filter(([path])=>path.includes("/review"))).toHaveLength(1);
 await act(async()=>resolve({ok:true,json:async()=>({suggestions:[null],mapping:[],summary:[]})}));expect(screen.getByRole("alert").textContent).toContain("Your draft is kept");expect(screen.getByTestId("final-cv").textContent).toBe(source);expect(button.hasAttribute("disabled")).toBe(false);
});
it("does not claim saved on missing schema and preserves final CV",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockImplementation((_:string,options?:RequestInit)=>Promise.resolve(options?.method==="POST"?{ok:false,json:async()=>({error:"Apply the CV migration. Your draft is kept."})}:{ok:true,json:async()=>({profiles:[],versions:[]})})));
 render(<TailorEditor/>);fireEvent.change(screen.getByLabelText("Version name"),{target:{value:"My CV"}});fireEvent.click(screen.getByRole("button",{name:"Save named version"}));await screen.findByRole("alert");expect(screen.getByTestId("final-cv").textContent).toBe(source);expect(screen.queryByText("CV version saved. Open it in My CVs.")).toBeNull();
});
it("distinguishes failed retrieval from a genuinely empty account",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,json:async()=>({error:"Temporary retrieval failure"})}));render(<WorkspaceHome/>);await screen.findByRole("alert");expect(screen.queryByText("No saved versions yet. Start with your experience profile.")).toBeNull();expect(screen.getByRole("button",{name:"Retry retrieval"})).toBeTruthy();
});
it("shows first-user onboarding only after an actual empty saved response",async()=>{
 initial={...emptyDraft};render(<WorkspaceHome/>);expect(screen.queryByRole("link",{name:"Add your first CV"})).toBeNull();await screen.findByRole("link",{name:"Add your first CV"});expect(screen.getByText("No saved versions yet. Start with your experience profile.")).toBeTruthy();expect(screen.queryByRole("link",{name:"Tailor a CV for a job"})).toBeNull();
});
it("keeps the target JD when selecting reusable saved experience",async()=>{
 const payload={...initial,review:null,decisions:{},step:"profile"};initial={...emptyDraft,jd:"Customer support role"};vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({profiles:[{id:"profile-A",name:"My sales experience",payload}],versions:[]})}));
 render(<TailorEditor/>);await screen.findByRole("option",{name:"My sales experience"});fireEvent.change(screen.getByLabelText("Saved experience profile"),{target:{value:"profile-A"}});expect((screen.getByLabelText("Job description (optional)") as HTMLTextAreaElement).value).toBe("Customer support role");expect(screen.getByRole("button",{name:"Propose improvements"})).toBeTruthy();
});
it("shows the actual reviewed profile wording alongside original pasted wording after manual changes",()=>{
 const blocks=initial.profile!.blocks.map(b=>b.id==="b2"?{...b,text:"Checked original invoices."}:b);const profile={...initial.profile!,blocks,revision:revision(blocks)};const review=parseReview({summary:[],suggestions:[{blockId:"b2",original:"Checked original invoices.",proposed:"Checked original invoices!",reason:"Punctuation",sourceIds:["b2"],kind:"wording",question:""}],mapping:[]},profile,"","English");initial={...initial,profile,review};render(<TailorEditor/>);const details=screen.getByText("Source details").closest("details")!;expect(details.textContent).toContain("Checked original invoices.");expect(details.textContent).toContain("Original pasted wording: Checked invoices.");
});
it("keeps oversized source intact for correction",async()=>{
 initial={...emptyDraft,source:"x".repeat(24001)};render(<ProfileEditor/>);fireEvent.click(screen.getByRole("button",{name:"Review text myself"}));await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("oversized"));expect((screen.getByLabelText("Original CV or experience") as HTMLTextAreaElement).value.length).toBe(24001);
});
it("undoing bulk acceptance preserves subsequent manual edits",async()=>{
 render(<TailorEditor/>);fireEvent.click(screen.getByRole("button",{name:"Accept eligible wording changes"}));fireEvent.click(screen.getAllByRole("button",{name:"Edit"})[0]);fireEvent.change(screen.getByLabelText("Your wording"),{target:{value:"My corrected wording."}});fireEvent.click(screen.getByRole("button",{name:"Undo bulk acceptance"}));expect(screen.getByTestId("final-cv").textContent).toContain("My corrected wording.");
});
it("aborts a pending AI response on unmount without updating a newer draft",async()=>{
 let resolve!:(v:unknown)=>void;let signal:AbortSignal|undefined;
 vi.stubGlobal("fetch",vi.fn().mockImplementation((path:string,opts:RequestInit)=>path.includes("/organize")?new Promise(r=>{resolve=r;signal=opts.signal as AbortSignal;}):Promise.resolve({ok:true,json:async()=>({profiles:[],versions:[]})})));
 initial={...initial,profile:null,review:null,step:"input"};
 function Host(){const [draft,setDraft]=useState(initial);const [visible,setVisible]=useState(true);return <Shared.Provider value={{draft,setDraft}}><button onClick={()=>{setVisible(v=>!v);setDraft({...emptyDraft,source:"New source B"});}}>Navigate</button><output data-testid="shared-profile">{draft.profile?.source || "none"}</output>{visible && <ProfileEditor/>}</Shared.Provider>;}
 render(<Host/>);fireEvent.click(screen.getByLabelText("I agree to send this experience text to OpenAI."));fireEvent.click(screen.getByRole("button",{name:"Organize with AI"}));fireEvent.click(screen.getByRole("button",{name:"Navigate"}));expect(signal?.aborted).toBe(true);fireEvent.click(screen.getByRole("button",{name:"Navigate"}));
 await act(async()=>resolve({ok:true,json:async()=>draftProfile(source)}));expect((screen.getByLabelText("Original CV or experience") as HTMLTextAreaElement).value).toBe("New source B");expect(screen.getByTestId("shared-profile").textContent).toBe("none");expect(screen.queryByRole("heading",{name:"Review your profile"})).toBeNull();
});
it("warns before losing saved-version edits and clears the warning only after confirmed save",async()=>{
 const payload={...initial,name:"Saved CV"};vi.stubGlobal("confirm",vi.fn().mockReturnValue(false));
 vi.stubGlobal("fetch",vi.fn().mockImplementation((_:string,options:RequestInit)=>Promise.resolve({ok:true,json:async()=>options?.method==="PATCH"?{saved:true,revision:2}:{version:{id:"11111111-1111-4111-8111-111111111111",name:"Saved CV",payload,revision:1}}})));
  render(<><Link href="/app/cvs">Leave editor</Link><VersionEditor id="11111111-1111-4111-8111-111111111111"/></>);await screen.findByLabelText("Version name");fireEvent.change(screen.getByLabelText("Version name"),{target:{value:"Edited CV"}});const before=new Event("beforeunload",{cancelable:true});window.dispatchEvent(before);expect(before.defaultPrevented).toBe(true);expect(fireEvent.click(screen.getByRole("link",{name:"Leave editor"}))).toBe(false);expect(window.confirm).toHaveBeenCalledWith("Leave this CV without saving your edits?");fireEvent.click(screen.getByRole("button",{name:"Save changes"}));await screen.findByText("Changes saved.");await waitFor(()=>{const after=new Event("beforeunload",{cancelable:true});window.dispatchEvent(after);expect(after.defaultPrevented).toBe(false);});
});

it("manual profile review needs no consent/provider, preserves content, and clears saved status after edits",async()=>{
 initial={...emptyDraft,source};
 const writes:RequestInit[]=[];
 vi.stubGlobal("fetch",vi.fn((_:string,options?:RequestInit)=>{if(options?.method==="POST"){writes.push(options);const input=JSON.parse(options.body as string);return Promise.resolve({ok:true,json:async()=>({saved:true,id:input.id})});}return Promise.resolve({ok:true,json:async()=>({profiles:[],versions:[]})});}));
 render(<ProfileEditor/>);fireEvent.click(screen.getByRole("button",{name:"Review text myself"}));await screen.findByRole("heading",{name:"Review your profile"});
 expect(writes).toHaveLength(0);expect((screen.getByLabelText("Line 1") as HTMLTextAreaElement).value).toBe("Nguyễn An");
 fireEvent.click(screen.getByRole("button",{name:"Use this profile"}));fireEvent.click(screen.getByRole("button",{name:"Save profile"}));await screen.findByText("Profile snapshot saved. Save again after further edits.");
 fireEvent.change(screen.getByLabelText("Line 2"),{target:{value:"Checked original invoices."}});
 expect(screen.queryByText("Profile snapshot saved. Save again after further edits.")).toBeNull();
 expect(screen.getByRole("status").textContent).toContain("not saved");
});

it.each(["<html>private gateway details</html>","{broken"])("shows recoverable HTTP context for malformed workspace errors without exposing body (%s)",async(body)=>{
 vi.stubGlobal("fetch",vi.fn((_:string,options?:RequestInit)=>Promise.resolve(options?.method==="POST"?new Response(body,{status:502}):new Response(JSON.stringify({profiles:[],versions:[]})))));
 render(<TailorEditor/>);fireEvent.change(screen.getByLabelText("Version name"),{target:{value:"Synthetic CV"}});fireEvent.click(screen.getByRole("button",{name:"Save named version"}));
 const alert=await screen.findByRole("alert");expect(alert.textContent).toContain("HTTP 502");expect(alert.textContent).toContain("kept");expect(alert.textContent).not.toContain("private gateway");expect(screen.getByTestId("final-cv").textContent).toBe(source);
});

it("never claims a saved version for an unacknowledged 200 response",async()=>{
 vi.stubGlobal("fetch",vi.fn((_:string,options?:RequestInit)=>Promise.resolve({ok:true,json:async()=>options?.method==="POST"?{}:{profiles:[],versions:[]}})));
 render(<TailorEditor/>);fireEvent.change(screen.getByLabelText("Version name"),{target:{value:"Synthetic CV"}});fireEvent.click(screen.getByRole("button",{name:"Save named version"}));
 await screen.findByRole("alert");expect(screen.queryByText("CV version saved. Open it in My CVs.")).toBeNull();expect(screen.getByTestId("final-cv").textContent).toBe(source);
});

it("keeps a manual profile after failed save, locks duplicate clicks, and retries the same immutable ID",async()=>{
 initial={...emptyDraft,source};let finish!:(r:Response)=>void;const writes:{id:string;payload:Draft}[]=[];
 vi.stubGlobal("fetch",vi.fn((_:string,options?:RequestInit)=>{if(options?.method==="POST"){const body=JSON.parse(options.body as string);writes.push(body);if(writes.length===1)return new Promise<Response>(r=>{finish=r;});return Promise.resolve(new Response(JSON.stringify({saved:true,id:body.id})));}return Promise.resolve(new Response(JSON.stringify({profiles:[],versions:[]})));}));
 render(<ProfileEditor/>);fireEvent.click(screen.getByRole("button",{name:"Review text myself"}));fireEvent.click(screen.getByRole("button",{name:"Use this profile"}));const button=screen.getByRole("button",{name:"Save profile"});
 act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(writes).toHaveLength(1);expect(screen.queryByText("Profile snapshot saved. Save again after further edits.")).toBeNull();
 await act(async()=>finish(new Response(JSON.stringify({error:"Temporary storage error; retry."}),{status:503})));await screen.findByRole("alert");expect((screen.getByLabelText("Line 2") as HTMLTextAreaElement).value).toBe("Checked invoices.");
 fireEvent.click(button);await screen.findByText("Profile snapshot saved. Save again after further edits.");expect(writes[0].id).toBe(writes[1].id);
 fireEvent.change(screen.getByLabelText("Line 2"),{target:{value:"Matched receipts."}});fireEvent.click(screen.getByRole("button",{name:"Use this profile"}));fireEvent.click(button);
 await waitFor(()=>expect(writes).toHaveLength(3));expect(writes[2].id).not.toBe(writes[1].id);expect(writes[1].payload.profile?.blocks[1].text).toBe("Checked invoices.");
});

it("keeps work on missing AI configuration and still permits manual review without consent",async()=>{
 initial={...emptyDraft,source};vi.stubGlobal("fetch",vi.fn((path:string)=>Promise.resolve(new Response(JSON.stringify(path.endsWith("organize")?{error:{message:"OpenAI is not configured."}}:{profiles:[],versions:[]}),{status:path.endsWith("organize")?503:200}))));
 render(<ProfileEditor/>);fireEvent.click(screen.getByLabelText("I agree to send this experience text to OpenAI."));fireEvent.click(screen.getByRole("button",{name:"Organize with AI"}));await screen.findByText("OpenAI is not configured.");expect((screen.getByLabelText("Original CV or experience") as HTMLTextAreaElement).value).toBe(source);
 fireEvent.click(screen.getByLabelText("I agree to send this experience text to OpenAI."));fireEvent.click(screen.getByRole("button",{name:"Review text myself"}));await screen.findByRole("heading",{name:"Review your profile"});expect(screen.queryByRole("alert")).toBeNull();
});

it("recovers clipboard and export failures without losing the complete preview",async()=>{
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error("denied"))}});
 vi.stubGlobal("URL",class extends URL{static createObjectURL():string{throw new Error("download unavailable");}});
 render(<TailorEditor/>);fireEvent.click(screen.getByRole("button",{name:"Copy CV"}));await screen.findByText(/Select the complete preview/);expect(screen.getByTestId("final-cv").textContent).toBe(source);
 fireEvent.click(screen.getByRole("button",{name:"Download TXT (plain text)"}));await screen.findByText(/Download could not start/);expect(screen.getByTestId("final-cv").textContent).toBe(source);
});
