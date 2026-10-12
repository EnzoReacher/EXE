import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const width of [320, 375, 768, 1440]) {
  test(`fictional Translator journey and keyboard/layout at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    const origin = new URL(test.info().project.use.baseURL as string).origin;
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
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await test.step(`INTAKE_${width}`, async () => {
      const response = await page.goto("/experience-translator"); expect(response?.ok()).toBe(true);
      expect(response?.headers()["cache-control"]).toContain("no-store");
      await page.getByRole("button", { name: "Load fictional example" }).click();
      const project = page.getByLabel("Your project or experience"); await project.fill((await project.inputValue()) + "\n" + sentinel);
      await fits(); await page.getByRole("button", { name: "Continue to details" }).click();
    });
    await test.step(`INTERVIEW_${width}`, async () => {
      await page.getByLabel("What did you personally implement?").fill("Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.");
      await page.getByLabel("Which technologies did you directly use?").fill("React và JavaScript");
      await page.getByRole("button", { name: "Review source facts" }).click();
      const facts = page.getByRole("group", { name: "Confirm facts about your own work" }).getByRole("checkbox");
      for (const checkbox of await facts.all()) await checkbox.check();
      await fits(); await page.getByRole("button", { name: "Create CV bullets" }).click();
    });
    await test.step(`GENERATED_EDIT_REGENERATE_${width}`, async () => {
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
      expect(unexpected).toEqual([]); expect(pageErrors).toBe(0);
    });
  });
}
