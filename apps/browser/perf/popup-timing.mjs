// Popup startup timing harness (prototype tooling, not for merge).
// Usage: from repo root, after building the extension:
//   cd apps/browser && NODE_ENV=production BROWSER=chrome MANIFEST_VERSION=3 NODE_OPTIONS=--max-old-space-size=8192 npx webpack
//   npx playwright install chromium   (once)
//   node apps/browser/perf/popup-timing.mjs [label] [runs]
// Opens chrome-extension://<id>/popup/index.html in a fresh persistent profile and reports, per open:
//   DCL (all defer scripts executed), spinnerGone (#loading removed), meaningfulUi (>20 chars of text), plus SDK/migration console logs.
// Open A = cold browser + cold background service worker; B..N = warm. Prints JSON lines and a summary.
import { chromium } from "playwright-core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const label = process.argv[2] ?? "run";
const runs = Number(process.argv[3] ?? 5);
const ext = resolve(import.meta.dirname, "../build");
const profile = mkdtempSync(join(tmpdir(), "bw-popup-perf-"));
const ctx = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  viewport: { width: 380, height: 600 },
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 30000 }));
const id = new URL(sw.url()).host;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function open(i) {
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/WASM|SDK|migration|perf:/i.test(t)) logs.push(t.slice(0, 90));
  });
  await page.addInitScript(() => {
    window.__bw = { spinnerGone: null, meaningful: null };
    const obs = new MutationObserver(() => {
      if (window.__bw.spinnerGone == null && !document.getElementById("loading")) window.__bw.spinnerGone = performance.now();
      if (window.__bw.meaningful == null && document.body && document.body.innerText.trim().length > 20) {
        window.__bw.meaningful = performance.now();
        obs.disconnect();
      }
    });
    document.addEventListener("DOMContentLoaded", () =>
      obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true }),
    );
  });
  await page.goto(`chrome-extension://${id}/popup/index.html`);
  await page.waitForFunction(() => window.__bw.meaningful != null, null, { timeout: 60000 });
  await sleep(300);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const marks = Object.fromEntries(performance.getEntriesByType("mark").map((e) => [e.name, Math.round(e.startTime)]));
    return {
      dcl: Math.round(nav.domContentLoadedEventEnd),
      spinnerGone: Math.round(window.__bw.spinnerGone),
      meaningfulUi: Math.round(window.__bw.meaningful),
      marks,
      text: document.body.innerText.trim().slice(0, 50).replace(/\s+/g, " "),
    };
  });
  const row = { label, open: i === 0 ? "A-cold" : `warm-${i}`, ...m, logs };
  results.push(row);
  console.log(JSON.stringify(row));
  if (i === 0) await page.screenshot({ path: resolve(import.meta.dirname, `popup-${label}-cold.png`) });
  await page.close();
}

for (let i = 0; i < runs; i++) await open(i);
const warm = results.slice(1).map((r) => r.meaningfulUi).sort((a, b) => a - b);
console.log(
  `SUMMARY ${label}: cold meaningfulUi=${results[0].meaningfulUi}ms (dcl ${results[0].dcl}ms); warm median=${warm[Math.floor(warm.length / 2)] ?? "n/a"}ms over ${warm.length} opens`,
);
await ctx.close();
