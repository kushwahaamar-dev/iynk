import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("the server runs a shared src/core file under plain node with no warning", () => {
  const probe = fileURLToPath(new URL("./fixtures/import-core.ts", import.meta.url));
  const run = spawnSync(process.execPath, [probe], { encoding: "utf8" });
  assert.equal(run.stderr, "");
  assert.equal(run.status, 0);
  assert.equal(run.stdout.trim(), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
