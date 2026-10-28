import { expect, type Page } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";
// Controlled browser tests have no external provider. Not imported by the app.
export async function simulatedDisclosure(page: Page) {
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Browser test fixture", purpose: "retained-browser-v1", external: false } }));
}
export async function editSource(page: Page, text: string) {
  if (!await page.locator("#scan-cv").count()) {
    const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Synthetic editable fixture.")] }] }));
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
    await expect(page.getByText("Extraction complete.", { exact: true })).toBeVisible();
  }
  const review = page.locator(".op-extracted-review"); if (!await review.getAttribute("open").then(value => value !== null)) await review.locator("summary").click();
  await page.locator("#scan-cv").fill(text);
}
