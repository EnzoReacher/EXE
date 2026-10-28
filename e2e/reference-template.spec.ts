import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { referenceFixture, flattenedFixture } from "../src/lib/cv-templates/reference-fixtures";
import { documentText } from "../src/lib/cv-templates";
const dir = ".local-demo/evidence/reference-template";
const origin = "http://127.0.0.1:4396";
for (const [name, text] of Object.entries({ reference: referenceFixture, flattened: flattenedFixture })) test(`${name}: existing Rewrite → edit → save → reopen → copy/TXT/PDF, no AI`, async ({ page, context, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await request.post("http://127.0.0.1:4397/__fixture/reset");
  const forbidden: string[] = [];
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (![origin, "http://127.0.0.1:4397"].includes(url.origin) || /\/api\/cv-review\/(?:scan|rewrite|organize)(?:\?|$)/u.test(url.pathname)) { forbidden.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Synthetic fixture only"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
  const id = crypto.randomUUID();
  const payload = { schemaVersion: 2, cv: text, jd: "Community records.", scan: { findings: [], coverage: "Controlled completed Scan." }, instructions: "Retain all supplied facts.", language: "English", document: text, changes: ["NON-EXPORT-NOTE"], notes: [], title: `Synthetic ${name}` };
  expect((await context.request.post("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload } })).status()).toBe(200);
  await page.goto(`/app/cvs/${id}`);
  const preview = page.getByLabel("Formatted CV");
  await expect(preview).toBeVisible();
  expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(documentText(text));
  const before = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  expect(before.payload.document).toBe(text); expect(before.revision).toBe(1);
  if (name === "flattened") { await expect(page.getByLabel("CV structure review")).toBeVisible(); await expect(preview.locator("h1")).toHaveCount(0); }
  await page.getByRole("button", { name: "Open saved CV editor", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit complete CV", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit complete CV", exact: true }).click();
  // Controlled explicit correction using this fixture's known source, NOT a
  // production heuristic. Accepted bullet wording stays untouched.
  const edited = name === "flattened" ? "N G U Y Ễ N A N\nperson@example.test\nS K I L L S\nCustomer support\nE D U C A T I O N\nFictional River College | 2020 – 2024\nE X P E R I E N C E\nVolunteer, Fictional Grove\n• Maintained visitor records.\nManual edit retained — chỉnh sửa." : text + "\nManual edit retained — chỉnh sửa.";
  await page.getByLabel("Complete CV text", { exact: true }).fill(edited);
  await page.getByRole("button", { name: "Save this CV (optional)", exact: true }).click(); await page.getByRole("button", { name: "Save CV", exact: true }).click(); await expect(page.getByText("CV saved.", { exact: true })).toBeVisible();
  const saved = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  expect(saved.payload.document).toBe(edited); expect(saved.payload.scan).toEqual(payload.scan); expect(saved.payload.templateId).toBe("classic"); expect(saved.revision).toBe(2);
  await page.goto(`/app/cvs/${id}`); await expect(preview).toContainText("Manual edit retained");
  expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(documentText(edited));
  await page.setViewportSize({ width: 1440, height: 1100 });
  // Full-page capture avoids Chromium's oversized-element crop/scroll artifact;
  // the A4 paper can be taller than the browser viewport.
  await page.screenshot({ path: `${dir}/${name}-app-preview.png`, fullPage: true });
  expect(await preview.evaluate(el => getComputedStyle(el).color)).toBe("rgb(0, 0, 0)");
  expect(await preview.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(13.333, 1);
  expect(await preview.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(29.333, 1);
  expect(await preview.locator("h1").evaluate(el => getComputedStyle(el).textAlign)).toBe("center");
  await page.getByRole("button", { name: "Copy text", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(documentText(edited));
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT", exact: true }).click();
  expect(await fs.readFile((await (await download).path())!, "utf8")).toBe(documentText(edited));
  const print = await context.newPage(); await print.setContent((await page.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await print.evaluate(() => document.fonts.ready);
  expect((await print.locator("main > *").allTextContents()).join("\n")).toBe(documentText(edited));
  await expect(print.locator("body")).not.toContainText("NON-EXPORT-NOTE");
  await print.pdf({ path: `${dir}/${name}-app.pdf`, preferCSSPageSize: true }); await fs.writeFile(`${dir}/${name}-app.txt`, documentText(edited)); await print.close();
  for (const width of [390, 320]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await preview.screenshot({ path: `${dir}/${name}-app-${width}.png` }); }
  expect(forbidden).toEqual([]);
});
