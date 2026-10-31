import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const probe = `
import { offersInput } from "./src/lib/search/schema.ts";
import { lineCost } from "./src/lib/search/cost.ts";
import "./src/lib/search/types.ts";
const part = (key) => ({ key, query: "motor", qty: 1 });
const ok = offersInput.safeParse({ parts: [part("a")] });
const tooMany = offersInput.safeParse({ parts: Array.from({ length: 26 }, (_, i) => part("p" + i)) });
console.log(JSON.stringify({ ok: ok.success, tooMany: tooMany.success, cost: lineCost({ price: 2 }, 3) }));
`;

test("plain node imports the shared search files and parses bodies", () => {
  const run = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", probe], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(run.stderr, "");
  assert.deepEqual(JSON.parse(run.stdout), { ok: true, tooMany: false, cost: 6 });
});

test("no server file builds a zod schema out of a shared one", () => {
  const root = new URL("../src/", import.meta.url);
  for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    if (!entry.endsWith(".ts")) continue;
    const source = readFileSync(new URL(entry, root), "utf8");
    const mixes = /from "zod"/.test(source) && /lib\/search\/schema\.ts"/.test(source);
    assert.equal(mixes, false, `${entry} imports zod next to a shared schema`);
  }
});
