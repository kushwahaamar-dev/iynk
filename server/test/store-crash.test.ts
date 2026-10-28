import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/bench-store.mjs", import.meta.url));

test("no acknowledged write is lost across 10 kill -9 cycles", { timeout: 60_000 }, () => {
  const run = spawnSync(process.execPath, [SCRIPT, "--cycles", "10", "--duration", "1", "--sync", "full"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /lost acknowledged writes: 0\n/);
  assert.match(run.stdout, /torn rows: 0\n/);
  assert.match(run.stdout, /integrity failures: 0\n/);
  const acked = Number(/acknowledged writes: (\d+)/.exec(run.stdout)?.[1]);
  assert.ok(acked > 0, "the child acknowledged nothing, so the test proved nothing");
});
