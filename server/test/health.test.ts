import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { ServerStore } from "../src/store/port.ts";
import { freePort, memoryStore, tempDir } from "./helpers.ts";
import { startApp, TEST_ORIGIN } from "./http-helpers.ts";

const PATHS = ["/v1/healthz", "/healthz", "/v1/readyz", "/readyz"];
const MAIN = fileURLToPath(new URL("../src/main.ts", import.meta.url));

async function read(response: Response) {
  return { status: response.status, body: (await response.json()) as unknown };
}

test("a healthy server answers 200 on every alias", async () => {
  const running = await startApp();
  try {
    for (const path of PATHS) {
      assert.deepEqual(await read(await running.get(path)), { status: 200, body: { ok: true, draining: false, store: "ok" } }, path);
    }
  } finally {
    await running.stop();
  }
});

test("a failing store gives 503 with store error", async () => {
  const real = memoryStore();
  const broken: ServerStore = { ...real, ping: () => false };
  const running = await startApp({ store: broken });
  try {
    for (const path of PATHS) {
      assert.deepEqual(await read(await running.get(path)), { status: 503, body: { ok: false, draining: false, store: "error" } }, path);
    }
  } finally {
    await running.stop();
  }
});

test("a store that throws is also an error", async () => {
  const real = memoryStore();
  const broken: ServerStore = {
    ...real,
    ping: () => {
      throw new Error("gone");
    },
  };
  const running = await startApp({ store: broken });
  try {
    assert.equal((await running.get("/healthz")).status, 503);
  } finally {
    await running.stop();
  }
});

test("readiness fails while migrations are behind, health does not", async () => {
  const real = memoryStore();
  const behind: ServerStore = { ...real, schemaVersion: () => 0 };
  const running = await startApp({ store: behind });
  try {
    assert.equal((await running.get("/healthz")).status, 200);
    assert.deepEqual(await read(await running.get("/readyz")), { status: 503, body: { ok: false, draining: false, store: "error" } });
  } finally {
    await running.stop();
  }
});

test("draining gives 503 and a second drain changes nothing", async () => {
  const running = await startApp();
  try {
    running.app.drain();
    running.app.drain();
    assert.equal(running.app.draining(), true);
    assert.equal(running.app.log.lines().filter((line) => line.includes('"draining"')).length, 1);
    for (const path of PATHS) {
      assert.deepEqual(await read(await running.get(path)), { status: 503, body: { ok: false, draining: true, store: "ok" } }, path);
    }
  } finally {
    await running.stop();
  }
});

test("probes work for a browser origin and never need a token", async () => {
  const running = await startApp();
  try {
    const response = await running.get("/v1/healthz", { origin: TEST_ORIGIN });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), TEST_ORIGIN);
  } finally {
    await running.stop();
  }
});

test("main.ts serves readiness and exits 0 on SIGTERM", async () => {
  const scratch = tempDir();
  const port = await freePort();
  const child = spawn(process.execPath, [MAIN], {
    env: {
      PATH: process.env["PATH"],
      IYNK_DATA_DIR: scratch.dir,
      IYNK_PORT: String(port),
      IYNK_PUBLIC_URL: TEST_ORIGIN,
      IYNK_ALLOWED_ORIGINS: TEST_ORIGIN,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    const exited = once(child, "exit");
    let ready = false;
    for (let attempt = 0; attempt < 40 && !ready; attempt++) {
      ready = await fetch(`http://127.0.0.1:${port}/readyz`).then((response) => response.status === 200, () => false);
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(ready, `server did not become ready: ${output}`);
    child.kill("SIGTERM");
    const [code] = (await exited) as [number | null];
    assert.equal(code, 0);
    assert.match(output, /"msg":"listening"/);
    assert.match(output, /"msg":"draining"/);
    assert.match(output, /"msg":"stopped"/);
  } finally {
    child.kill("SIGKILL");
    scratch.remove();
  }
});

test("main.ts exits 2 and lists every config problem", async () => {
  const child = spawn(process.execPath, [MAIN], { env: { PATH: process.env["PATH"] }, stdio: ["ignore", "pipe", "pipe"] });
  let errors = "";
  child.stderr.on("data", (chunk: Buffer) => (errors += chunk.toString()));
  const [code] = (await once(child, "exit")) as [number | null];
  assert.equal(code, 2);
  assert.match(errors, /IYNK_PUBLIC_URL/);
  assert.match(errors, /IYNK_ALLOWED_ORIGINS/);
});
