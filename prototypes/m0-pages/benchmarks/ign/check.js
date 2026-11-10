import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { chromium } from "playwright-core";

const live = process.argv.includes("--live");
const screenshots = process.env.M0_IGN_SCREENSHOTS;
const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/map.js", ["map.js", "text/javascript"]],
  ["/map.css", ["map.css", "text/css"]],
]);
const server = createServer(async (request, response) => {
  const asset = files.get(request.url);
  if (!asset) return response.writeHead(404).end();
  const [filename, type] = asset;
  response.writeHead(200, { "Content-Type": type });
  response.end(await readFile(new URL("./" + filename, import.meta.url)));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const base = "http://127.0.0.1:" + server.address().port;
const fixture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ0AAAAASUVORK5CYII=", "base64");
let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
  if (screenshots) await mkdir(screenshots, { recursive: true });

  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 760 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let blockTiles = false;
    let requests = 0;
    await context.route("https://data.geopf.fr/wmts?*", async (route) => {
      requests++;
      if (blockTiles) return route.abort();
      if (live) return route.continue();
      return route.fulfill({ contentType: "image/png", body: fixture });
    });

    await page.goto(base);
    const waitStatus = (status) => page.getByRole("status").filter({ hasText: status })
      .waitFor({ timeout: 8_000 });
    await waitStatus("Schéma affiché.");
    assert.equal(requests, 0);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "ortho");
    const first = await page.locator("#line").getAttribute("points");
    assert.ok(first);
    blockTiles = true;
    await page.keyboard.press("Enter");
    await waitStatus("Photos aériennes indisponibles. Le schéma reste affiché.");
    assert.equal(await page.locator("#line").getAttribute("points"), first);
    assert.equal(await page.locator("#tiles img").count(), 0);
    assert.ok(await page.getByText("Tracé d’essai autour de Cargèse.", { exact: false }).isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (screenshots && viewport.width === 375) {
      await page.screenshot({ path: join(screenshots, "ign-repli-375.png") });
    }

    blockTiles = false;
    await page.keyboard.press("Enter");
    await waitStatus("Photos aériennes IGN affichées.");
    assert.ok(await page.getByRole("link", { name: /source et licence/i }).isVisible());
    assert.ok(await page.getByRole("link", { name: /dates de prise/i }).isVisible());

    const tilesAt = async (zoom, expectedCoordinate) => {
      const urls = await page.locator("#tiles img").evaluateAll((images) =>
        images.map((image) => ({ src: image.src, width: image.naturalWidth, height: image.naturalHeight }))
      );
      assert.ok(urls.length >= 4 && urls.length <= 9);
      const queried = urls.map(({ src, width, height }) => {
        assert.equal(width, live ? 256 : 1);
        assert.equal(height, live ? 256 : 1);
        const query = new URL(src).searchParams;
        assert.equal(query.get("TILEMATRIXSET"), "PM_0_19");
        assert.equal(query.get("TILEMATRIX"), zoom);
        return query.get("TILECOL") + "/" + query.get("TILEROW");
      });
      assert.ok(queried.includes(expectedCoordinate));
      console.log(viewport.width + " px, zoom " + zoom + " : " + urls.length + " tuiles décodées.");
    };
    await tilesAt("15", "17166/12147");

    await page.getByLabel("Zoom").selectOption("17");
    await waitStatus("Photos aériennes IGN affichées.");
    await tilesAt("17", "68665/48589");
    assert.notEqual(await page.locator("#line").getAttribute("points"), first);
    if (screenshots) await page.screenshot({ path: join(screenshots, "ign-" + viewport.width + ".png") });


    await context.close();
  }
  console.log(live ? "IGN réel et repli vérifiés dans Edge." : "Tuiles simulées et repli vérifiés dans Edge.");
} finally {
  await browser?.close();
  server.close();
}
