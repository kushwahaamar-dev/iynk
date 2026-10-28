import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { collectDiagnostics, writeTarball } from "../src/cli/diagnostics.ts";
import { loadConfig } from "../src/config.ts";
import { createLogger } from "../src/ops/log.ts";
import { memoryStore, tempDir } from "./helpers.ts";

const CANARY = "canary-7f3a9c";

function config() {
  const scratch = tempDir();
  return {
    scratch,
    config: loadConfig({
      IYNK_DATA_DIR: join(scratch.dir, "data"),
      IYNK_PUBLIC_URL: "http://localhost:8787",
      IYNK_ALLOWED_ORIGINS: "http://localhost:3001",
      IYNK_SERVER_KEY_X: CANARY,
    }),
  };
}

function readTar(path: string): Record<string, string> {
  const data = readFileSync(path);
  const files: Record<string, string> = {};
  for (let at = 0; at + 512 <= data.length && data[at] !== 0; ) {
    const name = data.subarray(at, at + 100).toString("utf8").replace(/\0.*$/, "");
    const size = parseInt(data.subarray(at + 124, at + 135).toString("ascii"), 8);
    files[name] = data.subarray(at + 512, at + 512 + size).toString("utf8");
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

describe("diagnostics", () => {
  test("the bundle has the six files", () => {
    const { scratch, config: cfg } = config();
    const { files } = collectDiagnostics(cfg, memoryStore(), createLogger({ level: "silent" }));
    scratch.remove();
    assert.deepEqual(Object.keys(files).sort(), ["config.txt", "integrity.txt", "log.txt", "migrations.txt", "tables.txt", "versions.txt"]);
    assert.match(files["versions.txt"] ?? "", /node = v24/);
    assert.equal(files["integrity.txt"], "ok\n");
    assert.match(files["migrations.txt"] ?? "", /^1 identity /);
    assert.match(files["tables.txt"] ?? "", /devices = 0/);
    assert.equal(files["log.txt"], "no log file; stdout is captured by the container runtime\n");
  });

  test("a canary in a key variable and in an Authorization log field appears nowhere", () => {
    const { scratch, config: cfg } = config();
    const log = createLogger({ level: "info", write: () => {} });
    log.info("request", { authorization: `Bearer ${CANARY}`, token: CANARY });
    const { files } = collectDiagnostics(cfg, memoryStore(), log);
    const target = join(mkdtempSync(join(tmpdir(), "iynk-tar-")), "d.tar");
    writeTarball(files, target);
    scratch.remove();
    assert.ok(!readFileSync(target).includes(CANARY));
    assert.match(files["log.txt"] ?? "", /"msg":"request"/);
  });

  test("the tarball round trips and is a valid ustar archive", () => {
    const target = join(mkdtempSync(join(tmpdir(), "iynk-tar-")), "d.tar");
    writeTarball({ "a.txt": "hello\n", "b.txt": "x".repeat(600) }, target, 5000);
    assert.equal(readFileSync(target).length % 512, 0);
    assert.deepEqual(readTar(target), { "a.txt": "hello\n", "b.txt": "x".repeat(600) });
  });
});
