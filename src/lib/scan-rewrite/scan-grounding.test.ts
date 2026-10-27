import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { examples } from "@/lib/cv-review/examples";
import { parseScan, scanSources } from "./domain";
import { perform, scanSchema } from "./server";
import { createClaudeProvider } from "./claude";
import { selectedScan } from "./scan-selection.fixture";
import { scanCatalog, selectionSchema } from "./scan-selection";

const cv = examples.Sales;
const jd = "Requirements:\nClear communication and accurate records.\nPreferred: supplier negotiation experience.";
const finding = { title: "Negotiation", requirement: "Preferred: supplier negotiation experience.", requirementSourceId: "jd", excerpt: "", excerptSourceId: "", group: "not_found", explanation: "Not demonstrated here, not proof of missing ability.", nextStep: "Add your own example only if accurate.", priority: "secondary", expectation: "preferred" };
const scan = (f = finding) => ({ coverage: "Selected requirements only.", findings: [f] });
// Public/saved result grounding remains strict after source selection resolution.
const run = async (value: unknown, source = { cv, jd }) => parseScan(value, source, scanSources(source));
const legacyFinding = () => Object.fromEntries(Object.entries(finding).filter(([key]) => !key.endsWith("SourceId")));

it("reproduces the confirmed category contradiction after a successful exact CV quote check", () => {
  expect(() => parseScan(scan({ ...finding, excerptSourceId: "cv:b5", excerpt: "My manager negotiated supplier contracts, not me." }), { cv, jd })).toThrow(expect.objectContaining({ rule: "not_found_excerpt", fieldPath: "findings[0].excerpt" }));
});

it("requires identified sources on every new provider finding, without accepting a legacy response", async () => {
  await expect(run({ coverage: "Selected requirements only.", findings: [legacyFinding()] })).rejects.toMatchObject({ rule: "line_reference" });
});

it.each([
  { requirementSourceId: "cv:b5" },
  { excerpt: "My manager negotiated supplier contracts, not me.", excerptSourceId: "cv:b4", group: "unclear" },
  { excerpt: "supplier negotiation experience", excerptSourceId: "jd", group: "unclear" },
  { excerpt: "Linh Nguyen", excerptSourceId: "cv:b1", group: "unclear" },
  { requirement: "Sales assistant, Riverside Shop", requirementSourceId: "jd" },
])("rejects wrong-source and filtered citations %#", async change => {
  await expect(run(scan({ ...finding, ...change }))).rejects.toThrow();
});

it.each(["Negotiated supplier contracts.", "Increased sales by 40%."])("rejects paraphrased or invented CV evidence %#", async excerpt => {
  await expect(run(scan({ ...finding, excerpt, excerptSourceId: "cv:b4", group: "unclear" }))).rejects.toMatchObject({ rule: "cv_quote" });
});

it("keeps missing evidence empty, but retains verbatim ambiguous context under unclear", async () => {
  await expect(run(scan())).resolves.toEqual(scan());
  const ambiguous = scan({ ...finding, group: "unclear", excerptSourceId: "cv:b5", excerpt: "My manager negotiated supplier contracts, not me." });
  await expect(run(ambiguous)).resolves.toEqual(ambiguous);
  await expect(run(scan({ ...ambiguous.findings[0], group: "supported" }))).rejects.toMatchObject({ rule: "supported_context" });
  await expect(run(scan({ ...finding, excerptSourceId: "cv:b5" }))).rejects.toMatchObject({ rule: "line_reference" });
});

it("pins the provider payload to untouched original text and constrains missing evidence in the schema", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(selectedScan(scan())) }] }));
  const provider = createClaudeProvider({ key: "synthetic", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4317" }, request);
  await perform("scan", { cv, jd, consent: true }, provider, new AbortController().signal);
  const body = JSON.parse(request.mock.calls[0][1].body);
  const sources = JSON.parse(body.messages[0].content);
  expect(sources).toEqual(scanCatalog({cv,jd}));
  expect(body.system).toContain("untouched original text");
  expect(body.system).toContain("not_found");
  expect(JSON.stringify(scanSchema)).toContain('"enum":[""]');
  expect(JSON.stringify(scanSchema)).toContain('"anyOf"');
  const branches = (selectionSchema(scanCatalog({cv,jd})) as { properties: { findings: { items: { anyOf: Array<{ properties: Record<string, { enum?: string[] }>; required: string[] }> } } } }).properties.findings.items.anyOf;
  const missing = branches.find(branch => branch.properties.group.enum?.includes("not_found"))!;
  expect(missing.properties).not.toHaveProperty("excerpt");
  expect(missing.properties.excerptSourceId.enum).toEqual([""]);
  expect(missing.required).toEqual(expect.arrayContaining(["requirementSourceId", "excerptSourceId"]));
  expect(request).toHaveBeenCalledOnce();
});

it("preserves CRLF, tabs, repeated spaces and decomposed Unicode without fuzzy repair", async () => {
  const raw = "  Cafe\u0301\t sales  support.\r";
  const source = { cv: `Linh Nguyen\r\nExperience\r\n${raw}\nEmail: sales@example.test`, jd: "Sales\r\nSupport\tpreferred." };
  const exact = { ...finding, requirement: source.jd, excerpt: raw, excerptSourceId: "cv:b3", group: "supported" };
  await expect(run(scan(exact), source)).resolves.toEqual(scan(exact));
  for (const excerpt of [raw.normalize("NFC"), raw.replace("\t", " "), raw.replace("  support", " support")]) {
    await expect(run(scan({ ...exact, excerpt }), source)).rejects.toMatchObject({ rule: "cv_quote" });
  }
  await expect(run(scan({ ...exact, requirement: source.jd.replace("\r", "") }), source)).rejects.toMatchObject({ rule: "jd_quote" });
});

it("keeps legacy saved/client Scan parsing compatible", () => {
  const legacy = legacyFinding();
  expect(parseScan({ coverage: "Selected requirements only.", findings: [legacy] }, { cv, jd }).findings[0]).toEqual(legacy);
});

it("checks the identified protected context even when the same words occur in an unprotected block", async () => {
  const source = { cv: "Experience\nI helped customers.\nMy manager helped customers, not me.", jd };
  await expect(run(scan({ ...finding, excerpt: "helped customers", excerptSourceId: "cv:b3", group: "supported" }), source)).rejects.toMatchObject({ rule: "supported_context" });
  // Upper/lower case is also exact: there is no case-folding fallback.
  await expect(run(scan({ ...finding, excerpt: "HELPED customers", excerptSourceId: "cv:b2", group: "supported" }), source)).rejects.toMatchObject({ rule: "cv_quote" });
});

it("does not strip negation or reassign another person's work through an exact substring", async () => {
  const source = { cv: "Experience\nI did not approve payments.\nMy manager negotiated contracts.", jd: "Approve payments and negotiate contracts." };
  for (const [excerpt, excerptSourceId] of [["approve payments", "cv:b2"], ["negotiated contracts", "cv:b3"]]) {
    await expect(run(scan({ ...finding, requirement: source.jd, excerpt, excerptSourceId, group: "supported" }), source)).rejects.toMatchObject({ rule: "supported_context" });
  }
});
