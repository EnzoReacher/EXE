import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { assignedLayout, proposeStructure, type Assignment } from "../src/lib/cv-templates/assignments";
import { documentText } from "../src/lib/cv-templates";
const origin = "http://127.0.0.1:4396", dir = ".local-demo/evidence/structure-correction";
const synthetic = "CONTACT\nSKILLS\nLANGUAGES\nperson@example.test\nRecord keeping\nVietnamese\nNGUYỄN AN\nCOMMUNITY ASSISTANT\nABOUT ME\nVisitor support activity\nMaintained accurate\nvisitor records.\nI enjoy community work.\nMarch 16, 2025";
const syntheticRows = [
  { line: 3, kind: "contact", section: "", entry: null }, { line: 4, kind: "text", section: "Skills", entry: null }, { line: 5, kind: "text", section: "Languages", entry: null }, { line: 6, kind: "name", section: "", entry: null }, { line: 7, kind: "role", section: "", entry: null }, { line: 9, kind: "entry", section: "Experience / Activities", entry: null }, { line: 10, kind: "bullet", section: "Experience / Activities", entry: 9 }, { line: 11, kind: "continuation", section: "Experience / Activities", entry: 10 }, { line: 12, kind: "text", section: "Summary", entry: null }, { line: 13, kind: "date", section: "Experience / Activities", entry: 9 },
] as Assignment[];
for (const name of ["sanitized", ...(process.env.OWNPATH_STRUCTURE_OWNER_EXPORT ? ["owner-local-export"] : [])]) test(`${name}: assign → confirm → save → reopen → PDF/TXT/clipboard without Scan or Rewrite`, async ({ page, context, request }) => {
  await fs.mkdir(dir, { recursive: true }); await page.emulateMedia({ reducedMotion: "reduce" });
  const text = name === "sanitized" ? synthetic : (await fs.readFile(process.env.OWNPATH_STRUCTURE_OWNER_EXPORT!, "utf8")).replace(/\r\n/g, "\n").trimEnd();
  // Private owner mappings are source-reviewed test actions, never production
  // applicant rules. No personal data is embedded in repository fixtures.
  const rows: Assignment[] = name === "sanitized" ? syntheticRows : JSON.parse(await fs.readFile(process.env.OWNPATH_STRUCTURE_OWNER_ASSIGNMENTS!, "utf8"));
  await request.post("http://127.0.0.1:4397/__fixture/reset");
  const blocked: string[] = [];
  await page.route("**/*", route => { const url = new URL(route.request().url()); if (![origin, "http://127.0.0.1:4397"].includes(url.origin) || /\/api\/cv-review\/(?:scan|rewrite|organize)(?:\?|$)/u.test(url.pathname)) { blocked.push(url.pathname); return route.abort(); } return route.continue(); });
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Private loopback fixture only"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
  const id = crypto.randomUUID(), payload = { schemaVersion: 2, cv: text, jd: "Records.", scan: { findings: [], coverage: "Local fixture; not the live saved Scan." }, document: text, instructions: "Keep accepted wording.", language: "English", changes: [], notes: [], title: "Controlled structure verification" };
  expect((await context.request.post("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload } })).status()).toBe(200);
  await page.goto(`/app/cvs/${id}`); await page.getByRole("button", { name: "Open saved CV editor" }).click(); await page.getByText("Legacy CV structure correction (optional)", { exact: true }).click(); await page.getByRole("button", { name: "Correct structure without AI", exact: true }).click();
  const editor = page.getByRole("region", { name: "Correct CV structure", exact: true });
  const state = proposeStructure(text);
  for (const row of rows) {
    await editor.getByRole("combobox", { name: `Role for line ${row.line + 1}`, exact: true }).selectOption(row.kind);
    if (!["name", "role", "contact"].includes(row.kind)) await editor.getByRole("combobox", { name: `Section for line ${row.line + 1}`, exact: true }).selectOption(row.section);
    Object.assign(state.rows.find(r => r.line === row.line)!, row);
  }
  for (const row of rows.filter(r => r.entry !== null)) await editor.getByRole("combobox", { name: `${row.kind === "continuation" ? "Continue text" : "Activity"} for line ${row.line + 1}`, exact: true }).selectOption(String(row.entry));
  await editor.getByText("Arrange sections / add a source-supported section", { exact: true }).click();
  for (const section of ["Languages", "Experience / Activities", "Skills", "Summary"]) { const up = editor.getByRole("button", { name: `Move section ${section} up`, exact: true }); while (await up.isEnabled()) await up.click(); }
  state.sections = ["Summary", "Skills", "Experience / Activities", "Languages", ...state.sections.filter(s => !["Summary", "Skills", "Experience / Activities", "Languages"].includes(s))];
  await editor.getByRole("button", { name: "Preview correction", exact: true }).click();
  await expect(editor.getByRole("heading", { name: "Corrected preview — not saved" })).toBeVisible();
  const expected = documentText(text, undefined, state);
  expect((await editor.getByLabel("Formatted CV").locator(":scope > *").allTextContents()).join("\n")).toBe(expected);
  expect((await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version.revision).toBe(1);
  await editor.getByRole("checkbox").check(); await editor.getByRole("button", { name: "Apply correction to draft", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole("button", { name: "Save this CV (optional)", exact: true }).click(); await page.getByRole("button", { name: "Save CV", exact: true }).click(); await expect(page.getByText("CV saved.", { exact: true })).toBeVisible();
  const saved = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  expect(saved.revision).toBe(2); expect(saved.payload.document).toBe(text); expect(saved.payload.scan).toEqual(payload.scan); expect(saved.payload.structure.rows).toHaveLength(text.split("\n").filter(s => s.trim()).length); expect(saved.payload.finalDocument).toBe(expected);
  await page.goto(`/app/cvs/${id}`); const preview = page.getByLabel("Formatted CV"); await expect(preview.locator("h1")).toHaveText(text.split("\n")[rows.find(r => r.kind === "name")!.line]);
  expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(expected);
  await page.getByRole("button", { name: "Copy text", exact: true }).click(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT", exact: true }).click(); expect(await fs.readFile((await (await download).path())!, "utf8")).toBe(expected);
  await page.screenshot({ path: `${dir}/${name}-reopened.png`, fullPage: true });
  const print = await context.newPage(); await print.setContent((await page.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await print.evaluate(() => document.fonts.ready); expect((await print.locator("main > *").allTextContents()).join("\n")).toBe(expected);
  await print.pdf({ path: `${dir}/${name}.pdf`, preferCSSPageSize: true }); await fs.writeFile(`${dir}/${name}.txt`, expected); await fs.writeFile(`${dir}/${name}-lines.json`, JSON.stringify(assignedLayout(text, state), null, 2)); await print.close();
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${dir}/${name}-mobile.png`, fullPage: true });
  expect(blocked).toEqual([]);
});
