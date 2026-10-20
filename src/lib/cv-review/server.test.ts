import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({getCurrentUser:vi.fn()}));
import { getCurrentUser } from "@/lib/supabase/server";
import { handleReview, organizeProfile, reviewProfile } from "./server";
import { draftProfile } from "./domain";
import { examples } from "./examples";
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("bounded AI pipeline with synthetic provider",()=>{
  it.each(Object.entries(examples))("uses supplied %s language and explicit instructions without adding facts",async(_,source)=>{
    const provider=vi.fn().mockResolvedValue({summary:["Synthetic review"],suggestions:[],mapping:[]});const profile={...draftProfile(source),confirmed:true};
    const r=await reviewProfile({profile,jd:"",language:"English",consent:true},provider,new AbortController().signal);
    expect(r.mapping).toEqual([]);expect(provider).toHaveBeenCalledOnce();const [,instructions,payload]=provider.mock.calls[0];expect(instructions).toContain("Preserve negation");expect(instructions).toContain("untrusted DATA");expect(JSON.stringify(payload)).not.toContain(source.split("\n")[0]);expect(JSON.stringify(payload)).toContain(source.split("\n").at(-1));
  });
  it("requires explicit consent before any provider call",async()=>{const p=vi.fn();await expect(reviewProfile({consent:false},p,new AbortController().signal)).rejects.toThrow(/consent/);expect(p).not.toHaveBeenCalled();});
  it("fails closed before configuration or model calls for anonymous requests",async()=>{vi.mocked(getCurrentUser).mockResolvedValue(null);const r=await handleReview(new Request("http://localhost/api/cv-review/review",{method:"POST"}));expect(r.status).toBe(401);});
  it("organizes without losing original lines or resolving ambiguity",async()=>{const source=examples["Entry-level"];const profile=draftProfile(source);const provider=vi.fn().mockResolvedValue({sections:profile.blocks.slice(1).map(b=>({id:b.id,section:b.section}))});const p=await organizeProfile({source,consent:true},provider,new AbortController().signal);expect(p.source).toBe(source);expect(p.blocks.map(b=>b.text).join("\n")).toBe(source);expect(p.confirmed).toBe(false);});
  it("rejects malformed organization instead of substituting demo content",async()=>{await expect(organizeProfile({source:examples.Sales,consent:true},vi.fn().mockResolvedValue({sections:null}),new AbortController().signal)).rejects.toThrow();});
  it("returns recoverable missing configuration without a provider request",async()=>{
    vi.mocked(getCurrentUser).mockResolvedValue({id:"synthetic"} as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.stubEnv("OWNPATH_OPENAI_LOCAL_ENABLED","false");const request=vi.fn();vi.stubGlobal("fetch",request);
    const r=await handleReview(new Request("http://127.0.0.1:4317/api/cv-review/organize",{method:"POST"}),true);
    expect(r.status).toBe(503);expect((await r.json()).error.message).toBe("OpenAI is not configured.");expect(request).not.toHaveBeenCalled();
  });
  it.each(Object.entries(examples))("controlled %s review preserves attribution/negation and only maps missing JD skills as missing",async(_,source)=>{
    const profile={...draftProfile(source),confirmed:true};const original=profile.blocks.find(b=>b.text.endsWith("."))!;
    const provider=vi.fn().mockResolvedValue({summary:["Check wording; no complete JD coverage claim."],suggestions:[{blockId:original.id,original:original.text,proposed:original.text.replace(/\.$/,"!"),reason:"Punctuation only",sourceIds:[original.id],kind:"wording",question:""}],mapping:[{requirement:"Supplier negotiation certification",experience:"",sourceIds:[],status:"not found"}]});
    const result=await reviewProfile({profile,jd:"Supplier negotiation certification required.",language:"English",consent:true},provider,new AbortController().signal);
    expect(result.mapping[0]).toEqual({requirement:"Supplier negotiation certification",experience:"",sourceIds:[],status:"not found"});
    expect(result.suggestions[0].proposed.replace(/!$/,".")).toBe(original.text);
    const [,rules]=provider.mock.calls[0];expect(rules).toContain("other people's contributions");expect(rules).toContain("Do not insert job requirements");
  });
});
