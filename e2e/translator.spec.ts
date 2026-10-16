import { expect, test as base, type Page, type Locator } from "@playwright/test";
import { goldenAnswers } from "../src/lib/experience-translator/fixtures";
import { readFile } from "node:fs/promises";

const test = base.extend<{ inputGuard: { sentinel: string } }>({
  inputGuard: [async ({ page, context }, use, testInfo) => {
    const origin = new URL(testInfo.project.use.baseURL as string).origin;
    const unexpected: string[] = []; let pageErrors = 0;
    const sentinel = "OWNPATH_PRIVATE_FIXTURE_SENTINEL";
    page.on("pageerror", () => { pageErrors++; });
    await context.route("**/*", (route) => {
      const request = route.request(); const target = new URL(request.url());
      const appPath = ["/", "/experience-translator", "/icon.svg", "/favicon.ico"].includes(target.pathname) || target.pathname.startsWith("/_next/static/");
      let decoded = request.url(); try { decoded = decodeURIComponent(decoded); } catch { /* Treat original URL as untrusted. */ }
      if (target.origin !== origin || request.method() !== "GET" || !appPath || decoded.includes(sentinel) || (request.postData() ?? "").includes(sentinel)) {
        unexpected.push("UNEXPECTED_OR_INPUT_TRANSFER_REQUEST"); return route.abort();
      }
      return route.continue();
    });
    await context.routeWebSocket("**/*", (socket) => { unexpected.push("UNEXPECTED_SOCKET_REQUEST"); socket.close(); });
    await use({ sentinel });
    expect(unexpected).toEqual([]); expect(pageErrors).toBe(0);
  }, { auto: true }],
});
async function tabTo(page: Page, target: Locator) {
  await target.waitFor({ state: "visible" });
  for (let attempt=0; attempt<60; attempt++) {
    if (await target.evaluate((element) => document.activeElement === element)) {
      await expect(target).toBeFocused();
      expect(await target.evaluate((element) => { const style=getComputedStyle(element); return element.matches(":focus-visible") && style.outlineStyle!=="none" && parseFloat(style.outlineWidth)>0 && !["transparent","rgba(0, 0, 0, 0)"].includes(style.outlineColor); })).toBe(true);
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("KEYBOARD_TARGET_UNREACHABLE");
}
async function createGoldenWithMouse(page: Page, sentinel: string) {
  await page.goto("/experience-translator");
  await page.getByRole("button", { name: "Load fictional example" }).click();
  const project=page.getByLabel("Your project or experience"); await project.fill((await project.inputValue())+"\n"+sentinel);
  await page.getByRole("button",{name:"Continue to details"}).click();
  await page.getByLabel("What did you personally implement?", { exact: true }).fill(goldenAnswers.contribution);
  await page.getByLabel("Which technologies did you directly use?", { exact: true }).fill(goldenAnswers.technology);
  await page.getByRole("button",{name:"Review source facts"}).click();
  const facts=page.getByRole("group",{name:"Confirm facts about your own work"}).getByRole("checkbox");
  await expect(facts.first()).toBeVisible();
  for (const checkbox of await facts.all()) await checkbox.check();
  await page.getByRole("button",{name:"Create CV bullets"}).click();
  await expect(page.getByLabel("English CV wording 1")).toHaveValue("Implemented product listing and search using React and JavaScript.");
}

for (const width of [320, 375, 768, 1440]) {
  test(`fictional Translator journey and keyboard/layout at ${width}px`, async ({ page, inputGuard }) => {
    await page.setViewportSize({ width, height: 900 });
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await test.step(`INTAKE_${width}`, async () => {
      const response = await page.goto("/experience-translator"); expect(response?.ok()).toBe(true);
      expect(response?.headers()["cache-control"]).toContain("no-store");
      await page.getByRole("button", { name: "Load fictional example" }).click();
      const project = page.getByLabel("Your project or experience"); await project.fill((await project.inputValue()) + "\n" + inputGuard.sentinel);
      await fits(); await page.getByRole("button", { name: "Continue to details" }).click();
    });
    await test.step(`INTERVIEW_${width}`, async () => {
      await page.getByLabel("What did you personally implement?", { exact: true }).fill("Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.");
      await page.getByLabel("Which technologies did you directly use?", { exact: true }).fill("React và JavaScript");
      await page.getByRole("button", { name: "Review source facts" }).click();
      const facts = page.getByRole("group", { name: "Confirm facts about your own work" }).getByRole("checkbox");
      for (const checkbox of await facts.all()) await checkbox.check();
      await fits(); await page.getByRole("button", { name: "Create CV bullets" }).click();
    });
    await test.step(`GENERATED_EDIT_REGENERATE_${width}`, async () => {
      await expect(page.getByRole("heading", { name: "Check every suggested bullet" })).toBeFocused();
      await expect(page.getByLabel("English CV wording 1")).toHaveValue("Implemented product listing and search using React and JavaScript.");
      await expect(page.getByRole("button", { name: "Review accepted bullets" })).toBeDisabled();
      const approve = page.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" });
      await approve.focus(); await page.keyboard.press("Space"); await expect(approve).toBeChecked();
      await page.getByLabel("English CV wording 1").fill("Implemented product listing and search using React and JavaScript for my project.");
      await expect(approve).not.toBeChecked(); await approve.check();
      await page.getByRole("button", { name: "Regenerate; keep my edits" }).click();
      await expect(page.getByLabel("English CV wording 1")).toHaveValue(/for my project\./);
      await expect(approve).not.toBeChecked(); await approve.check();
      await fits(); await page.getByRole("button", { name: "Review accepted bullets" }).click();
    });
    await test.step(`ACCEPTED_TXT_${width}`, async () => {
      await expect(page.getByRole("heading", { name: "Your accepted wording" })).toBeFocused();
      const text = await page.getByLabel("Accepted English bullets").inputValue();
      expect(text).toContain("for my project."); expect(text).not.toContain("REST API");
      const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download accepted TXT" }).click();
      const file = await download; expect(file.suggestedFilename()).toBe("ownpath-accepted-bullets.txt");
      const filename = await file.path(); expect(filename).toBeTruthy(); expect(await readFile(filename!, "utf8")).toBe(text);
      await fits();
    });
    await test.step(`CLEAR_RELOAD_ISOLATION_${width}`, async () => {
      await page.getByRole("button", { name: "Forget this session" }).click();
      await expect(page.getByLabel("Your project or experience")).toHaveValue("");
      await page.reload(); await expect(page.getByLabel("Frontend Intern job description")).toHaveValue("");
    });
  });
}


test("keyboard-only fictional intake, targeted skip, approval and rejection", async ({page, inputGuard}) => {
  await page.setViewportSize({width:375,height:900});
  await test.step("KEYBOARD_INTAKE", async () => {
    await page.goto("/experience-translator");
    await tabTo(page,page.getByRole("button",{name:"Continue to details"})); await page.keyboard.press("Enter");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Project");
    await tabTo(page,page.getByRole("button",{name:"Load fictional example"})); await page.keyboard.press("Enter");
    const project=page.getByLabel("Your project or experience"); await expect(project).toHaveValue(/React/);
    await tabTo(page,project); await page.keyboard.press("ControlOrMeta+End"); await page.keyboard.insertText("\n"+inputGuard.sentinel);
    await tabTo(page,page.getByRole("button",{name:"Continue to details"})); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading",{name:"Make your contribution clear"})).toBeFocused();
  });
  await test.step("KEYBOARD_INTERVIEW_SKIP", async () => {
    await tabTo(page,page.getByLabel("What did you personally implement?", { exact: true })); await page.keyboard.insertText(goldenAnswers.contribution);
    const technology=page.getByLabel("Which technologies did you directly use?", { exact: true }); await tabTo(page,technology); await page.keyboard.insertText(goldenAnswers.technology);
    const reference=page.getByLabel("Is there a repo or demo you can refer to?", { exact: true }); await tabTo(page,reference); await page.keyboard.insertText("https://example.invalid/fictional-reference");
    await tabTo(page,page.getByRole("button",{name:"Skip this question: Is there a repo or demo you can refer to?"})); await page.keyboard.press("Enter");
    await expect(reference).toHaveValue(""); await expect(technology).toHaveValue(goldenAnswers.technology);
    await page.keyboard.press("Shift+Tab"); await expect(reference).toBeFocused();
    await tabTo(page,page.getByRole("button",{name:"Review source facts"})); await page.keyboard.press("Enter");
  });
  await test.step("KEYBOARD_FACTS", async () => {
    const facts=page.getByRole("group",{name:"Confirm facts about your own work"}).getByRole("checkbox");
    await expect(facts.first()).toBeVisible();
    for (const checkbox of await facts.all()) { await tabTo(page,checkbox); await page.keyboard.press("Space"); await expect(checkbox).toBeChecked(); }
    await tabTo(page,page.getByRole("button",{name:"Create CV bullets"})); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading",{name:"Check every suggested bullet"})).toBeFocused();
    await expect(page.getByLabel("English CV wording 1")).toHaveValue("Implemented product listing and search using React and JavaScript.");
  });
  await test.step("KEYBOARD_REVIEW_REJECT_CLEAR", async () => {
    const approval=page.getByRole("checkbox",{name:"I confirm bullet 1 accurately describes my work"});
    await tabTo(page,approval); await page.keyboard.press("Space"); await expect(approval).toBeChecked();
    await tabTo(page,page.getByRole("button",{name:"Reject bullet 1",exact:true})); await page.keyboard.press("Enter");
    await expect(approval).not.toBeChecked(); await expect(page.getByRole("button",{name:"Review accepted bullets"})).toBeDisabled();
    await tabTo(page,page.getByRole("button",{name:"Restore bullet 1",exact:true})); await page.keyboard.press("Enter");
    await tabTo(page,approval); await page.keyboard.press("Space");
    await tabTo(page,page.getByRole("button",{name:"Review accepted bullets"})); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading",{name:"Your accepted wording"})).toBeFocused();
    await expect(page.getByLabel("Accepted English bullets")).toHaveValue("• Implemented product listing and search using React and JavaScript.");
    await tabTo(page,page.getByRole("button",{name:"Forget this session"})); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading",{name:"Start with one project"})).toBeFocused();
    await expect(page.getByLabel("Your project or experience")).toHaveValue("");
  });
});

test("injected clipboard rejection preserves accepted manual-copy fallback", async ({page,inputGuard}) => {
  await page.addInitScript(() => {
    const state=window as typeof window & {ownpathClipboardAttempts:number}; state.ownpathClipboardAttempts=0;
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async () => { state.ownpathClipboardAttempts++; throw new DOMException("Fictional clipboard denial","NotAllowedError"); }}});
  });
  await test.step("CLIPBOARD_DENIAL_PREPARE", async () => {
    await createGoldenWithMouse(page,inputGuard.sentinel);
    await page.getByRole("checkbox",{name:"I confirm bullet 1 accurately describes my work"}).check();
    await page.getByRole("button",{name:"Review accepted bullets"}).click();
  });
  await test.step("CLIPBOARD_DENIAL_FALLBACK", async () => {
    const accepted=page.getByLabel("Accepted English bullets"); const original=await accepted.inputValue();
    await page.getByRole("button",{name:"Copy accepted bullets"}).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("copy it manually"); await expect(accepted).toHaveValue(original);
    expect(await page.evaluate(() => (window as typeof window & {ownpathClipboardAttempts:number}).ownpathClipboardAttempts)).toBe(1);
    await accepted.click(); await page.keyboard.press("ControlOrMeta+A");
    expect(await accepted.evaluate((element) => { const area=element as HTMLTextAreaElement; return area.selectionStart===0 && area.selectionEnd===area.value.length; })).toBe(true);
  });
  await test.step("CLIPBOARD_DENIAL_CLEAR", async () => {
    await page.getByRole("button",{name:"Forget this session"}).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0); await expect(page.getByLabel("Your project or experience")).toHaveValue("");
  });
});

test("long fictional source and edited wording fit a narrow viewport", async ({page,inputGuard}) => {
  await page.setViewportSize({width:320,height:900});
  const fits=async () => expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await test.step("LONG_SOURCE_INTAKE", async () => {
    await page.goto("/experience-translator"); await page.getByRole("button",{name:"Load fictional example"}).click();
    const project=page.getByLabel("Your project or experience");
    await project.fill((await project.inputValue())+"\nI implemented product listing and search using React and JavaScript "+"X".repeat(700)+".\n"+inputGuard.sentinel);
    await fits(); await page.getByRole("button",{name:"Continue to details"}).click();
  });
  await test.step("LONG_SOURCE_FACTS", async () => {
    await page.getByRole("button",{name:"Review source facts"}).click();
    const facts=page.getByRole("group",{name:"Confirm facts about your own work"}).getByRole("checkbox"); await expect(facts.first()).toBeVisible();
    for (const checkbox of await facts.all()) await checkbox.check();
    await fits(); await page.getByRole("button",{name:"Create CV bullets"}).click();
    await page.getByText("Source facts and JD relevance",{exact:true}).first().click(); await fits();
  });
  await test.step("LONG_EDIT_REVIEW", async () => {
    const wording="Implemented product listing and search using React and JavaScript "+"Y".repeat(350)+".";
    await page.getByLabel("English CV wording 1").fill(wording); await fits();
    await page.getByRole("checkbox",{name:"I confirm bullet 1 accurately describes my work"}).check();
    await page.getByRole("button",{name:"Review accepted bullets"}).click();
    await expect(page.getByLabel("Accepted English bullets")).toHaveValue("• "+wording); await fits();
    await page.getByRole("button",{name:"Forget this session"}).click(); await expect(page.getByLabel("Your project or experience")).toHaveValue("");
  });
});
