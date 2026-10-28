import { createServer, type Server } from "node:http";
import { createApp, type App } from "../src/app.ts";
import { loadConfig, type ServerConfig } from "../src/config.ts";
import { createLogger } from "../src/ops/log.ts";
import type { ServerStore } from "../src/store/port.ts";
import { fakeDeps, freePort, memoryStore, type FakeDeps } from "./helpers.ts";

export const TEST_ORIGIN = "https://iynk.test";

const probe = { statMode: () => null, isWritable: () => true, uid: () => 1000 };

export function testConfig(env: Record<string, string> = {}): ServerConfig {
  return loadConfig({ IYNK_PUBLIC_URL: TEST_ORIGIN, IYNK_ALLOWED_ORIGINS: TEST_ORIGIN, ...env }, probe);
}

export type Running = {
  app: App;
  deps: FakeDeps;
  base: string;
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  stop(): Promise<void>;
};

export async function startApp(opts: { env?: Record<string, string>; store?: ServerStore } = {}): Promise<Running> {
  const deps = fakeDeps();
  const config = testConfig(opts.env);
  const log = createLogger({ level: "info", write: () => {} });
  const app = createApp(config, deps, { store: opts.store ?? memoryStore(deps), log });
  const port = await freePort();
  const server: Server = createServer(app.handler);
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${port}`;
  return {
    app,
    deps,
    base,
    get: (path, headers) => fetch(`${base}${path}`, { headers }),
    async stop() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.close();
    },
  };
}
