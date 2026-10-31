import { createServer } from "node:http";
import { createApp } from "../../src/app.ts";
import { loadCollabLimits } from "../../src/collab-config.ts";
import { loadConfig } from "../../src/config.ts";
import { realDeps } from "../../src/deps.ts";

// Test-only entry for server/scripts/kill-loop.mjs: main.ts plus a SIGKILL on the n-th commit, after COMMIT and before any frame goes out.
const killOnCommit = Number(process.env["KILL_ON_COMMIT"] ?? 0);

const config = loadConfig(process.env);
const collab = { ...loadCollabLimits(process.env), submitPerSec: 10_000, submitBurst: 10_000, pendingPerSocket: 256, framesPerSec: 10_000 };

let commits = 0;
const hooks = {
  afterCommit: () => {
    commits += 1;
    if (killOnCommit > 0 && commits === killOnCommit) process.kill(process.pid, "SIGKILL");
  },
};

const app = createApp(config, realDeps(), { collab, hooks });
const server = createServer(app.handler);
server.on("upgrade", app.onUpgrade);
server.listen(config.port, config.host, () => process.stdout.write("listening\n"));

process.on("SIGTERM", () => {
  app.drain();
  server.closeAllConnections();
  server.close(() => {
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
});
