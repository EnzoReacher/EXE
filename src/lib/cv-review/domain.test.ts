import { describe, expect, it } from "vitest";
import { draftProfile, emptyDraft, finalDocument, isCurrent, parseDraft, parseReview, revision } from "./domain";
import { validateSave } from "./persistence";
import { examples } from "./examples";
import { shareableBlocks } from "./privacy";
const response = (blockId: string, original: string, proposed: string) => ({ summary: ["Review wording"], suggestions: [{blockId, original, proposed, reason:"Clearer wording",sourceIds:[blockId],kind:"wording",question:""}],mapping:[] });
describe("complete CV decisions", () => {
  it("targets repeated lines by stable ID and preserves untouched sections and Unicode", () => {
    const profile = draftProfile("Nguyễn An\nHelped customers.\nHelped customers.\nEducation\nDiploma 2023");
    const review = parseReview(response("b3", "Helped customers.", "Assisted customers."), profile, "", "English");
    expect(finalDocument(profile, review, {})).toBe(profile.source);
    expect(finalDocument(profile, review, {s1:{action:"accepted",text:""}})).toBe("Nguyễn An\nHelped customers.\nAssisted customers.\nEducation\nDiploma 2023");
    expect(finalDocument(profile, review, {s1:{action:"edited",text:"Hỗ trợ khách hàng."}})).toContain("Helped customers.\nHỗ trợ khách hàng.");
    expect(finalDocument(profile, review, {s1:{action:"dismissed",text:""}})).toBe(profile.source);
  });
  it("rejects conflicting replacements, bad references, changed numbers and malformed nested values", () => {
    const profile = draftProfile("Name\nChecked 12 invoices."); const raw = response("b2", "Checked 12 invoices.", "Reviewed 12 invoices.");
    for (const bad of [{...raw,suggestions:[...raw.suggestions,...raw.suggestions]}, {...raw,suggestions:[{...raw.suggestions[0],sourceIds:["b9"]}]}, response("b2", "Checked 12 invoices.", "Reviewed 100 invoices."), {...raw,suggestions:[null]}, {...raw,mapping:null}]) expect(() => parseReview(bad,profile,"","English")).toThrow();
  });
  it("invalidates changes to profile, JD and language", () => {
    const p=draftProfile("Name\nChecked invoices."); const r=parseReview(response("b2","Checked invoices.","Reviewed invoices."),p,"JD","English");
    expect(isCurrent(r,p,"JD","English")).toBe(true); expect(isCurrent(r,p,"New JD","English")).toBe(false); expect(isCurrent(r,p,"JD","Vietnamese")).toBe(false);
    const blocks=p.blocks.map(b=>({...b,text:b.text+" correction"})); expect(isCurrent(r,{...p,blocks,revision:revision(blocks)},"JD","English")).toBe(false);
  });
  it("bulk eligibility excludes factual additions and ordinary semantic rewrites", () => {
    const p=draftProfile("Name\nChecked invoices.");
    expect(parseReview(response("b2","Checked invoices.","Checked invoices!"),p,"","English").suggestions[0].bulkEligible).toBe(true);
    expect(parseReview(response("b2","Checked invoices.","Invoices checked."),p,"","English").suggestions[0].bulkEligible).toBe(false);
    expect(parseReview(response("b2","Checked invoices.","Managed invoices."),p,"","English").suggestions[0].bulkEligible).toBe(false);
  });
  it("supports unchanged snapshots, validates exact final bytes and rejects stale saves", () => {
    const profile={...draftProfile(examples.Accounting),confirmed:true}; const review=parseReview({summary:[],suggestions:[],mapping:[]},profile,"","English");
    const payload={...emptyDraft,source:profile.source,profile,review,step:"final",name:"Accounting CV"}; const input={id:"11111111-1111-4111-8111-111111111111",kind:"version",payload};
    expect(validateSave(input).payload.finalDocument).toBe(profile.source); expect(parseDraft(payload).profile?.source).toBe(profile.source);
    expect(()=>validateSave({...input,payload:{...payload,jd:"Changed"}})).toThrow(/Regenerate/);
  });
  it.each(Object.entries(examples))("preserves all original %s details without requiring a JD", (_, source) => {
    const p=draftProfile(source);const r=parseReview({summary:[],suggestions:[],mapping:[]},p,"","English"); expect(finalDocument(p,r,{})).toBe(source);
  });
  it("preserves oversized input for caller correction by rejecting instead of truncating", () => { expect(()=>draftProfile("x".repeat(24001))).toThrow(); });
  it("excludes contact lines from provider payload while preserving document", () => { const p=draftProfile("Nguyễn An\nContact\na@example.test\n+84 123 456 789\nExperience\nChecked invoices."); expect(shareableBlocks(p.blocks).map(b=>b.text).join("\n")).toBe("Experience\nChecked invoices.");expect(p.source).toContain("a@example.test"); });
  it("does not drop a single-paragraph experience description as a contact line", () => { const p=draftProfile("Helped customers choose products at a local shop.");expect(shareableBlocks(p.blocks)).toHaveLength(1); });
});
