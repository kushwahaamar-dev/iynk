#!/usr/bin/env node
// iynk room relay. `node server.js --port 43117` (or PORT=43117); see docs/hacktx/REALTIME.md.
import { parseArgs } from "node:util";
import { loadConfig } from "./src/config.js";
import { createLogger } from "./src/log.js";
import { createRelay } from "./src/relay.js";

const { values } = parseArgs({ options: { port: { type: "string", short: "p" }, host: { type: "string" } } });

/** @type {import('./src/config.js').RelayOptions} */
let options;
try {
  options = loadConfig(process.env, values);
} catch (error) {
  createLogger("error").error("bad_config", { error: error instanceof Error ? error.message : String(error) });
  process.exit(2);
}

const relay = createRelay(options);
const { log } = relay;

process.on("uncaughtException", (error) => {
  log.error("crash", { error: error.message, stack: error.stack });
  process.exit(1);
});

let stopping = false;
for (const signal of /** @type {const} */ (["SIGTERM", "SIGINT"])) {
  process.on(signal, () => {
    if (stopping) process.exit(1);
    stopping = true;
    log.info("signal", { signal });
    relay.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

try {
  const port = await relay.listen();
  log.info("listening", { port, host: options.host, path: "/ws", node: process.version });
} catch (error) {
  log.error("listen_failed", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}
