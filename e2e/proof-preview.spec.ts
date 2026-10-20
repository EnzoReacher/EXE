import { test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { proofPreviewResponse } from "../src/lib/credential-versions/proof-preview";

function check(ok: unknown, code: string): asserts ok { if (!ok) throw new Error(code); }
let server: Server;
let origin: string;
const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lJ8AAAAASUVORK5CYII=", "base64")).buffer;
const rasters = new Map<string, { bytes: ArrayBuffer; mime: string }>([["/image", { bytes: png, mime: "image/png" }]]);
test.beforeAll(async () => {
  server = createServer(async (request, outgoing) => {
    // Only fixed fictional fixtures, using the production HTML/headers helper.
    const raster = rasters.get(request.url ?? "");
    const response = request.url === "/pdf"
      ? proofPreviewResponse(new TextEncoder().encode("%PDF-fictional").buffer, "application/pdf")
      : raster ? proofPreviewResponse(raster.bytes, raster.mime) : new Response("Unavailable", { status: 404 });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); check(address && typeof address !== "string", "LOOPBACK_SERVER_REQUIRED");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections(); });
});
test("PROTECTED_PROOF_RENDERING", async ({ page, context }) => {
  let errors = 0; let external = 0; let errorCode = "UNKNOWN";
  page.on("pageerror", (error) => {
    errors++;
    const name = ["SecurityError", "TypeError", "ReferenceError", "Error"].includes(error.name) ? error.name.toUpperCase() : "OTHER";
    const categories = ["localstorage", "sessionstorage", "sandbox", "origin", "frame", "document"].filter((word) => error.message.toLowerCase().includes(word)).map((word) => word.toUpperCase()).join("_");
    errorCode = `${name}_${categories || "UNCLASSIFIED"}`;
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    external++; return route.abort();
  });
  await test.step("IMAGE_DISPLAYS_WITHOUT_NATIVE_VIEWER_ERROR", async () => {
    const response = await page.goto(`${origin}/image`);
    check(errors === 0, `PROOF_NAVIGATION_ERROR_${errorCode}`);
    check(response?.headers()["content-security-policy"]?.startsWith("sandbox;"), "SANDBOX_REQUIRED");
    await page.getByRole("heading", { name: "Private proof view", exact: true }).waitFor();
    check(errors === 0, `PROOF_LOCATOR_ERROR_${errorCode}`);
    await page.waitForFunction(() => { const image = document.querySelector("img"); return image?.complete && image.naturalWidth > 0; });
    check(errors === 0, `PROOF_WAIT_ERROR_${errorCode}`);
    const dimensions = await page.locator("img").evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }));
    check(dimensions.width === 1 && dimensions.height === 1, "RASTER_IMAGE_MUST_DECODE");
    const storageDenied = await page.evaluate(() => { try { void localStorage.length; return false; } catch (error) { return error instanceof DOMException && error.name === "SecurityError"; } });
    check(storageDenied, "SANDBOX_MUST_KEEP_OPAQUE_ORIGIN");
    check(await page.locator("script, iframe, object, embed").count() === 0, "NO_ACTIVE_DOCUMENT_VIEWER");
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "PROOF_OVERFLOW");
    }
  });
  await test.step("LARGE_PNG_AND_JPEG_SCALE_AT_FIVE_WIDTHS", async () => {
    const fixturePage = await context.newPage();
    const fixtures = await fixturePage.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 1800;
      const draw = canvas.getContext("2d")!; draw.fillStyle = "#e9eff5"; draw.fillRect(0, 0, canvas.width, canvas.height);
      draw.fillStyle = "#17314a"; draw.fillRect(100, 100, 1080, 1600);
      return [canvas.toDataURL("image/png"), canvas.toDataURL("image/jpeg")];
    });
    await fixturePage.close();
    for (const [i, mime] of ["image/png", "image/jpeg"].entries()) {
      const pathname = `/raster-${i}`;
      rasters.set(pathname, { bytes: Uint8Array.from(Buffer.from(fixtures[i].split(",")[1], "base64")).buffer, mime });
      await page.goto(`${origin}${pathname}`);
      await page.waitForFunction(() => { const image = document.querySelector("img"); return image?.complete && image.naturalWidth > 0; });
      check(await page.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth === 1280 && image.naturalHeight === 1800), "LARGE_RASTER_MUST_DECODE");
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector("img")!.getBoundingClientRect().right <= innerWidth), "LARGE_PROOF_OVERFLOW");
      }
    }
  });
  await test.step("PDF_USES_CLEAR_PRIVATE_DOWNLOAD_GUIDANCE", async () => {
    await page.goto(`${origin}/pdf`);
    await page.getByRole("heading", { name: "Review this PDF using the private download" }).waitFor();
    check(await page.locator("img, script, iframe, object, embed").count() === 0, "PDF_MUST_NOT_EMBED_NATIVE_VIEWER");
    check(errors === 0, `PROOF_UNCAUGHT_PAGE_ERROR_${errorCode}`); check(external === 0, "PROOF_EXTERNAL_REQUEST");
  });
});
