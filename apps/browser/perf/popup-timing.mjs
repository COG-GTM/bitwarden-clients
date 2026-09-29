// Popup startup timing harness (prototype tooling, not for merge).
// Usage: from repo root, after building the extension:
//   cd apps/browser && NODE_ENV=production BROWSER=chrome MANIFEST_VERSION=3 NODE_OPTIONS=--max-old-space-size=8192 npx webpack
//   npx playwright install chromium   (once)
//   node apps/browser/perf/popup-timing.mjs [label] [runs]
// Opens chrome-extension://<id>/popup/index.html in a fresh persistent profile and reports, per open:
//   DCL (all defer scripts executed), spinnerGone (#loading removed), meaningfulUi (>20 chars of text), plus SDK/migration console logs.
// Open A = cold browser + cold background service worker; B..N = warm. Prints JSON lines and a summary.
import { chromium } from "playwright-core";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const label = process.argv[2] ?? "run";
const runs = Number(process.argv[3] ?? 5);
const ext = resolve(import.meta.dirname, "../build");
mkdirSync(resolve(import.meta.dirname, "shots"), { recursive: true });
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
    window.__bw = { spinnerGone: null, meaningful: null, shellGone: null, cls: 0, shifts: [] };
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (!e.hadRecentInput) {
            window.__bw.cls += e.value;
            window.__bw.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4) });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    const obs = new MutationObserver(() => {
      if (window.__bw.spinnerGone == null && !document.getElementById("loading")) window.__bw.spinnerGone = performance.now();
      if (window.__bw.shellGone == null && document.body && !document.getElementById("bw-shell")) window.__bw.shellGone = performance.now();
      if (window.__bw.meaningful == null && document.body && document.body.innerText.trim().length > 20) {
        window.__bw.meaningful = performance.now();
        obs.disconnect();
      }
    });
    document.addEventListener("DOMContentLoaded", () =>
      obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true }),
    );
  });
  const shots = [];
  const t0 = Date.now();
  await page.goto(`chrome-extension://${id}/popup/index.html`);
  if (i <= 1 && process.env.SHOTS) {
    // screenshot loop during the static-shell -> Angular handoff (open 0 cold, open 1 warm)
    const tag = i === 0 ? "cold" : "warm";
    for (let n = 0; n < 40; n++) {
      const done = await page.evaluate(() => window.__bw.meaningful != null);
      const el = Date.now() - t0;
      await page.screenshot({ path: resolve(import.meta.dirname, `shots/${label}-${tag}-${String(n).padStart(2, "0")}-${el}ms.png`) });
      shots.push(el);
      if (done) break;
      await sleep(i === 0 ? 150 : 40);
    }
  }
  await page.waitForFunction(() => window.__bw.meaningful != null, null, { timeout: 60000 });
  await sleep(300);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const marks = Object.fromEntries(performance.getEntriesByType("mark").map((e) => [e.name, Math.round(e.startTime)]));
    const paint = Object.fromEntries(performance.getEntriesByType("paint").map((e) => [e.name, Math.round(e.startTime)]));
    return {
      dcl: Math.round(nav.domContentLoadedEventEnd),
      firstPaint: paint["first-paint"] ?? null,
      fcp: paint["first-contentful-paint"] ?? null,
      shellGone: window.__bw.shellGone == null ? null : Math.round(window.__bw.shellGone),
      spinnerGone: Math.round(window.__bw.spinnerGone),
      meaningfulUi: Math.round(window.__bw.meaningful),
      marks,
      cls: +window.__bw.cls.toFixed(4),
      shifts: window.__bw.shifts,
      htmlClass: document.documentElement.className,
      text: document.body.innerText.trim().slice(0, 50).replace(/\s+/g, " "),
    };
  });
  const row = { label, open: i === 0 ? "A-cold" : `warm-${i}`, ...m, logs, shots: shots.length ? shots : undefined };
  results.push(row);
  console.log(JSON.stringify(row));
  if (i === 0) await page.screenshot({ path: resolve(import.meta.dirname, `popup-${label}-cold.png`) });
  await page.close();
}

for (let i = 0; i < runs; i++) await open(i);
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : "n/a"; };
const warm = results.slice(1).map((r) => r.meaningfulUi).sort((a, b) => a - b);
console.log(
  `SUMMARY ${label}: cold meaningfulUi=${results[0].meaningfulUi}ms (dcl ${results[0].dcl}ms, firstPaint ${results[0].firstPaint}ms, routeRendered ${results[0].marks["bw:first-route-rendered"] ?? "n/a"}ms, cls ${results[0].cls}); warm median=${warm[Math.floor(warm.length / 2)] ?? "n/a"}ms over ${warm.length} opens (warm median firstPaint ${median(results.slice(1).map((r) => r.firstPaint))}ms, routeRendered ${median(results.slice(1).map((r) => r.marks["bw:first-route-rendered"]))}ms)`,
);
await ctx.close();
