import { expect, test } from "@playwright/test";

for (const width of [320, 375, 768, 1440]) {
  test(`fictional Translator journey and keyboard/layout at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    const sentInputs: string[] = [];
    await context.route("**/*", (route) => {
      const target = new URL(route.request().url());
      if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) return route.abort();
      if (["POST", "PUT", "PATCH"].includes(route.request().method())) sentInputs.push(route.request().url());
      return route.continue();
    });
    await page.goto("/experience-translator");
    await page.getByRole("button", { name: "Load fictional example" }).click();
    await page.getByRole("button", { name: "Continue to details" }).click();
    await page.getByLabel("What did you personally implement?").fill("Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.");
    await page.getByLabel("Which technologies did you directly use?").fill("React và JavaScript");
    await page.getByRole("button", { name: "Review source facts" }).click();
    const facts = page.getByRole("group", { name: "Confirm facts about your own work" }).getByRole("checkbox");
    for (const checkbox of await facts.all()) await checkbox.check();
    await page.getByRole("button", { name: "Create CV bullets" }).click();
    await expect(page.getByLabel("English CV wording 1")).toHaveValue("Implemented product listing and search using React and JavaScript.");
    await expect(page.getByRole("button", { name: "Review accepted bullets" })).toBeDisabled();
    const approve = page.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" });
    await approve.focus(); await page.keyboard.press("Space"); await expect(approve).toBeChecked();
    await page.getByLabel("English CV wording 1").fill("Implemented product listing and search using React and JavaScript for my project.");
    await expect(approve).not.toBeChecked(); await approve.check();
    await page.getByRole("button", { name: "Regenerate; keep my edits" }).click();
    await expect(page.getByLabel("English CV wording 1")).toHaveValue(/for my project\./);
    await expect(approve).not.toBeChecked(); await approve.check();
    await page.getByRole("button", { name: "Review accepted bullets" }).click();
    await expect(page.getByRole("heading", { name: "Your accepted wording" })).toBeFocused();
    const text = await page.getByLabel("Accepted English bullets").inputValue();
    expect(text).toContain("for my project."); expect(text).not.toContain("REST API");
    const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download accepted TXT" }).click();
    expect((await download).suggestedFilename()).toBe("ownpath-accepted-bullets.txt");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(sentInputs).toEqual([]);
    await page.getByRole("button", { name: "Forget this session" }).click();
    await expect(page.getByLabel("Your project or experience")).toHaveValue("");
    await page.reload(); await expect(page.getByLabel("Frontend Intern job description")).toHaveValue("");
  });
}
