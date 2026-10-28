import { createServer } from "node:http";
import { ConfigError, loadConfig } from "./config.ts";
import { realDeps } from "./deps.ts";
import { createApp } from "./app.ts";

const DRAIN_LIMIT_MS = 15_000;
const EXIT_CONFIG = 2;

function startConfig() {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    for (const problem of error.problems) console.error(problem);
    process.exit(EXIT_CONFIG);
  }
}

const config = startConfig();
const app = createApp(config, realDeps());
const server = createServer(app.handler);

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${config.port} is already in use.` : `The server could not start: ${error.message}`);
  process.exit(1);
});

let stopping = false;

function stop(): void {
  if (stopping) process.exit(1);
  stopping = true;
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
});
