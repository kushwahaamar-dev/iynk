import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { connectOrigins, serverEnv } from "./e2e/server-harness";

// Random ports per run, shared with the workers through the environment
// (they load this file again). Many agents test on this machine at once.
const RESERVED_PORTS = [3000, 43117];

function pickPort() {
  let port: number;
  do port = 40000 + Math.floor(Math.random() * 10000);
  while (RESERVED_PORTS.includes(port) || chosen.has(port));
  chosen.add(port);
  return port;
}

const chosen = new Set<number>();

for (const name of ["E2E_PORT", "E2E_SERVER_PORT", "E2E_DEAD_PORT"]) {
  process.env[name] ??= String(pickPort());
  const value = Number(process.env[name]);
  if (RESERVED_PORTS.includes(value)) throw new Error(`Refusing to run Playwright on a reserved port (${value})`);
  chosen.add(value);
}
const port = Number(process.env.E2E_PORT);
const serverPort = Number(process.env.E2E_SERVER_PORT);

// The server's data lives in a throwaway directory; only the process that
// made it removes it.
if (!process.env.E2E_SERVER_DATA) {
  const dir = mkdtempSync(join(tmpdir(), "iynk-e2e-"));
  process.env.E2E_SERVER_DATA = dir;
  process.once("exit", () => rmSync(dir, { recursive: true, force: true }));
}

// Blanked for the web server so a developer's .env.local cannot reach a real
// service: an empty value overrides the file.
const BLANK = [
  "NEXT_PUBLIC_REALTIME_URL",
  "IYNK_SERVER_TOKEN",
  "IYNK_AI_ENABLE",
  "IYNK_SEARCH_ENABLE",
  "IYNK_AI_PROVIDER",
  "IYNK_AI_DAILY_TOKENS",
  "IYNK_SEARCH_MONTHLY",
  "IYNK_DATA_DIR",
  "IYNK_CONNECT_ORIGINS",
  "IYNK_SERVER_URL",
];

// Its own build folder, so a test run never clobbers someone else's .next.
const distDir = process.env.NEXT_DIST_DIR ?? ".next-e2e";

// E2E_SKIP_BUILD=1 serves a build that already exists in distDir.
const command = process.env.E2E_SKIP_BUILD
  ? `npx next start --port ${port}`
  : `npm run build && npx next start --port ${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}",
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: [/.*\.phone\.spec\.ts/, /r048-compare\.spec\.ts/, /visual\.spec\.ts/, /save-perf\.spec\.ts/, /studio-perf\.spec\.ts/, /buddies\.spec\.ts/] },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: /core\.spec\.ts/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testMatch: /(dmath|bme280-hash)\.spec\.ts/ },
    { name: "r048", testMatch: /r048-compare\.spec\.ts/, dependencies: ["chromium", "webkit"] },
    { name: "visual", use: { ...devices["Desktop Chrome"] }, testMatch: /visual\.spec\.ts/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /.*\.phone\.spec\.ts/ },
    // Its last test kills the one e2e server, so it runs after everything else but the perf project.
    {
      name: "server-stop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /buddies\.spec\.ts/,
      dependencies: ["chromium", "webkit", "r048", "visual", "phone"],
    },
    // The save and Studio frame budgets are wall-clock figures, so they run alone and last, on a quiet machine.
    {
      name: "perf",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(save|studio)-perf\.spec\.ts/,
      fullyParallel: false,
      dependencies: ["chromium", "webkit", "r048", "visual", "phone", "server-stop"],
    },
  ],
  // Test the production build: dev mode compiles on demand and behaves differently.
  webServer: [
    {
      command: "node e2e/server-run.mjs",
      url: `http://127.0.0.1:${serverPort}/healthz`,
      env: serverEnv(),
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command,
      // "/" always answers with the language redirect (a 3xx counts as ready),
      // whichever pages exist yet.
      url: `http://localhost:${port}/`,
      env: {
        NEXT_DIST_DIR: distDir,
        // Serves /studio/perf; a build without it answers 404 there.
        NEXT_PUBLIC_STUDIO_TEST: "1",
        ...Object.fromEntries(BLANK.map((name) => [name, ""])),
        IYNK_SERVER_URL: `http://localhost:${serverPort}`,
        IYNK_CONNECT_ORIGINS: connectOrigins().join(","),
      },
      reuseExistingServer: false,
      timeout: 600_000,
    },
  ],
});
