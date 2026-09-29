// Attribute minified bytes in a bundle to source paths using its source map.
// Usage: node apps/browser/perf/bundle-breakdown.mjs apps/browser/build/popup/main.js [depth=3] [top=40]
import { readFileSync } from "node:fs";
import { SourceMapConsumer } from "source-map";
const file = process.argv[2];
const depth = Number(process.argv[3] ?? 3);
const top = Number(process.argv[4] ?? 40);
const code = readFileSync(file, "utf8");
const map = JSON.parse(readFileSync(file + ".map", "utf8"));
const consumer = await new SourceMapConsumer(map);
const lines = code.split("\n");
const bySrc = new Map();
const mappings = [];
consumer.eachMapping((m) => mappings.push(m), null, SourceMapConsumer.GENERATED_ORDER);
for (let i = 0; i < mappings.length; i++) {
  const m = mappings[i];
  const next = mappings[i + 1];
  let len;
  if (next && next.generatedLine === m.generatedLine)
    len = next.generatedColumn - m.generatedColumn;
  else len = (lines[m.generatedLine - 1]?.length ?? 0) - m.generatedColumn;
  const src = m.source ?? "(unmapped)";
  bySrc.set(src, (bySrc.get(src) ?? 0) + Math.max(0, len));
}
const groups = new Map();
for (const [src, n] of bySrc) {
  let s = src.replace(/^webpack:\/\/\//, "").replace(/^\.\.\/\.\.\//, "");
  let key;
  const nm = s.match(/node_modules\/((@[^/]+\/)?[^/]+)/);
  if (nm) key = "node_modules/" + nm[1];
  else key = s.split("/").slice(0, depth).join("/");
  groups.set(key, (groups.get(key) ?? 0) + n);
}
const total = [...groups.values()].reduce((a, b) => a + b, 0);
console.log(
  `${file}: ${(code.length / 1024).toFixed(0)} KB on disk, ${(total / 1024).toFixed(0)} KB mapped`,
);
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, top))
  console.log(
    `${(n / 1024).toFixed(1).padStart(8)} KB  ${((100 * n) / total).toFixed(1).padStart(5)}%  ${k}`,
  );
