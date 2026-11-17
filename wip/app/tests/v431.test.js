// v4.3.1 iPhone fit: build + CSS integrity checks (layout itself is covered by tests/v431-iphone-fit.spec.js in WebKit).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (f) => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
test("v4.3.1 build: version, cache name, fit.js precached and imported", async () => {
  const { BUILD } = await import("../build-info.js");
  assert.equal(BUILD.version, "4.3.1");
  assert.match(BUILD.cache, /^capydoku-v4\.3\.1-[0-9a-f]{12}$/);
  const pre = JSON.parse(read("reports/precache.json"));
  assert.equal(pre.cache, BUILD.cache);
  assert.ok(pre.urls.includes("fit.js"));
  assert.match(read("sw.js"), new RegExp(BUILD.cache));
  assert.match(read("app.js"), /import \{ installFit \} from "\.\/fit\.js";/);
  assert.match(read("app.js"), /installFit\(root,/);
});
test("no stylesheet has an unterminated or swallowing comment (the rev b Show me regression)", () => {
  for (const f of fs.readdirSync(new URL("..", import.meta.url)).filter((f) => f.endsWith(".css"))) {
    const s = read(f);
    for (const m of s.matchAll(/\/\*[\s\S]*?(\*\/|$)/g)) {
      assert.ok(m[1] === "*/", `${f}: unterminated comment`);
      assert.ok(!/[{}]/.test(m[0]), `${f}: comment swallows rules: ${m[0].slice(0, 60)}`);
    }
  }
  assert.match(read("crates-v43.css"), /\.crate-showme\{/);
});
test("fit CSS: dvh with svh and vh fallbacks; compact/tight tiers exist for crate and logic screens", () => {
  const s = read("crates-v43.css");
  assert.match(s, /@supports not \(height:100svh\)\{[^@]*100vh/);
  assert.match(s, /@supports \(height:100dvh\)\{[^@]*100dvh/);
  for (const sel of [".crate-screen.fit-compact", ".crate-screen.fit-tight", ".screen.game.fit-compact", ".screen.game.fit-tight", ".screen.fit-measure"]) assert.ok(s.includes(sel), sel);
});
