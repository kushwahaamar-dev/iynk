// Tests listen on 40000 to 49999. 43117 belongs to the user's own server and is never drawn.
// server/legacy/test/helpers.js keeps a copy of this function; ports.test.ts compares the lists.
export const RESERVED_PORTS: ReadonlySet<number> = new Set([43117]);

export function randomTestPort(random: () => number = Math.random): number {
  for (;;) {
    const port = 40_000 + Math.floor(random() * 10_000);
    if (!RESERVED_PORTS.has(port)) return port;
  }
}
