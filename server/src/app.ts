import { readFileSync } from "node:fs";
import type { RequestListener } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BuddyRemovalHook } from "./buddies/visibility.ts";
import type { ServerConfig } from "./config.ts";
import type { Deps } from "./deps.ts";
import { authRoutes } from "./http/auth.ts";
import { buddyRoutes } from "./http/buddies.ts";
import type { Authed, RouteDef } from "./http/classes.ts";
import { deletionRoutes } from "./http/deletion.ts";
import { healthRoutes } from "./http/health.ts";
import { identityRoutes } from "./http/identities.ts";
import { createLimiter, type Limiter } from "./http/limits.ts";
import { createRouter } from "./http/router.ts";
import { serverInfoRoutes } from "./http/server-info.ts";
import { createChallengeStore, type ChallengeStore } from "./identity/challenge.ts";
import { touchSession, verifyToken } from "./identity/tokens.ts";
import { createLogger, type Logger } from "./ops/log.ts";
import type { ServerStore } from "./store/port.ts";
import { openStore } from "./store/sqlite.ts";

export type RouteDeps = {
  config: ServerConfig;
  store: ServerStore;
  deps: Deps;
  log: Logger;
  limiter: Limiter;
  app: { draining(): boolean };
  buddyRemoval?: BuddyRemovalHook;
};

export type App = {
  handler: RequestListener;
  routes: RouteDef[];
  store: ServerStore;
  log: Logger;
  draining(): boolean;
  drain(): void;
  close(): Promise<void>;
};

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

function serverVersion(): string {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return manifest.version;
}

export function allRoutes(ctx: RouteDeps & { challenges: ChallengeStore }): RouteDef[] {
  return [...serverInfoRoutes(ctx), ...healthRoutes(ctx), ...authRoutes(ctx), ...identityRoutes(ctx), ...deletionRoutes(ctx), ...buddyRoutes(ctx)];
}

export function createApp(config: ServerConfig, deps: Deps, opts: { store?: ServerStore; log?: Logger } = {}): App {
  const log = opts.log ?? createLogger({ level: config.logLevel });
  const store =
    opts.store ??
    openStore(
      {
        path: join(config.dataDir, "iynk.db"),
        sync: config.storeSync,
        migrationsDir: MIGRATIONS_DIR,
        backupsDir: join(config.dataDir, "backups"),
        serverVersion: serverVersion(),
      },
      deps,
    );
  const limiter = createLimiter(deps);
  let draining = false;
  let closed = false;

  const challenges = createChallengeStore(deps, config.audience);

  const authenticate = (token: string): Authed | null => {
    const { authed, touch } = store.read((tx) => verifyToken(tx, deps, token));
    if (authed && touch) {
      try {
        store.transaction((tx) => touchSession(tx, deps, authed.sessionId));
      } catch {
        // a busy store never fails the request
      }
    }
    return authed;
  };

  const routes = allRoutes({ config, store, deps, log, limiter, challenges, app: { draining: () => draining } });
  const handler = createRouter({ routes, config, deps, log, limiter, authenticate });

  return {
    handler,
    routes,
    store,
    log,
    draining: () => draining,
    drain() {
      if (draining) return;
      draining = true;
      log.info("draining");
    },
    async close() {
      if (closed) return;
      closed = true;
      store.close();
      log.info("stopped");
    },
  };
}
