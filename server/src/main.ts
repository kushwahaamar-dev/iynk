import { createServer } from "node:http";
import { loadCollabLimits } from "./collab-config.ts";
import { ConfigError, loadConfig } from "./config.ts";
import { realDeps } from "./deps.ts";
import { createApp } from "./app.ts";
import { startSweep } from "./ops/sweep.ts";

const DRAIN_LIMIT_MS = 15_000;
const EXIT_CONFIG = 2;

function startConfig() {
  try {
    return { config: loadConfig(process.env), collab: loadCollabLimits(process.env) };
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    for (const problem of error.problems) console.error(problem);
    process.exit(EXIT_CONFIG);
  }
}

const { config, collab } = startConfig();
const deps = realDeps();
const app = createApp(config, deps, { collab });

const server = createServer(app.handler);

server.on("upgrade", app.onUpgrade);
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${config.port} is already in use.` : `The server could not start: ${error.message}`);
  process.exit(1);
});

let stopping = false;
let sweep: { stop(): void } | undefined;

function stop(): void {
  if (stopping) process.exit(1);
  stopping = true;
  sweep?.stop();
  app.drain();
  const force = setTimeout(() => server.closeAllConnections(), DRAIN_LIMIT_MS - 1000);
  force.unref();
  server.close(() => {
    clearTimeout(force);
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
  server.closeIdleConnections();
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);

server.listen(config.port, config.host, () => {
  app.log.info("listening", { port: config.port });
  sweep = startSweep(app.store, deps, app.log);
});
