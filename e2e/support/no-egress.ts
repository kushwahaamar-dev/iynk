// Every spec imports `test` and `expect` from here. An automatic fixture aborts
// any request or WebSocket that leaves localhost and fails the test afterwards,
// naming each origin (never the path or query). Fix the page that calls out;
// do not allow-list the host.
import { test as base, expect } from "@playwright/test";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const isLoopback = (hostname: string) => LOOPBACK.has(hostname);

export const test = base.extend<{ noEgress: void }>({
  noEgress: [
    async ({ context }, use) => {
      const blocked: string[] = [];

      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (!/^(https?|wss?):$/.test(url.protocol) || isLoopback(url.hostname)) return route.fallback();
        blocked.push(`${route.request().method()} ${url.origin}`);
        return route.abort("blockedbyclient");
      });
      await context.routeWebSocket(
        (url) => !isLoopback(url.hostname),
        (ws) => {
          blocked.push(`WS ${new URL(ws.url()).origin}`);
          void ws.close();
        },
      );

      await use();
      expect(blocked, "requests that left localhost").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
