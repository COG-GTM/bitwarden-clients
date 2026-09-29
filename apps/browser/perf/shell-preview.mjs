// Screenshot the static shell variants by pre-seeding preboot's localStorage cache (theme / shell kind).
import { chromium } from "playwright-core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const ext = resolve(import.meta.dirname, "../build");
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "bw-shell-")), {
  headless: false, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`], viewport: { width: 380, height: 600 },
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 30000 }));
const id = new URL(sw.url()).host;
for (const [kind, theme] of [["vault", "light"], ["vault", "dark"], ["anon", "dark"]]) {
  const page = await ctx.newPage();
  await page.addInitScript(([k, t]) => { localStorage.setItem("bw-shell-kind", k); localStorage.setItem("bw-theme", t); localStorage.setItem("bw-height-class:", "body-full");
    // freeze the shell: block Angular from removing it so we can screenshot the pure static state
    document.addEventListener("DOMContentLoaded", () => { const s = document.getElementById("bw-shell"); s.remove = () => {}; }); }, [kind, theme]);
  await page.goto(`chrome-extension://${id}/popup/index.html`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(import.meta.dirname, `shell-${kind}-${theme}.png`) });
  await page.close();
}
await ctx.close();
