import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Deps } from "../src/deps.ts";
import type { ServerStore } from "../src/store/port.ts";
import { openStore } from "../src/store/sqlite.ts";

export const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

const START = 1_700_000_000_000;
const SKIPPED_PORTS = new Set([3000, 43117]);

export type FakeDeps = Deps & { advance(ms: number): void };

export function fakeDeps(start = START): FakeDeps {
  let now = start;
  let state = 0x9e3779b9;
  return {
    clock: { now: () => now },
    ids: {
      random(bytes) {
        const out = new Uint8Array(bytes);
        for (let i = 0; i < bytes; i += 1) {
          state ^= state << 13;
          state ^= state >>> 17;
          state ^= state << 5;
          out[i] = state & 0xff;
        }
        return out;
      },
    },
    sleep: async (ms) => {
      now += ms;
    },
    advance(ms) {
      now += ms;
    },
  };
}

export function tempDir(): { dir: string; remove(): void } {
  const dir = mkdtempSync(join(tmpdir(), "iynk-server-"));
  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
}

export function memoryStore(deps: Deps = fakeDeps()): ServerStore {
  const scratch = tempDir();
  return openStore(
    { path: ":memory:", sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" },
    deps,
  );
}

export async function freePort(): Promise<number> {
  for (;;) {
    const port = 40000 + Math.floor(Math.random() * 10000);
    if (SKIPPED_PORTS.has(port)) continue;
    const free = await new Promise<boolean>((resolve) => {
      const probe = createServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
    if (free) return port;
  }
}
