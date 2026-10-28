import { defineConfig, devices } from "@playwright/test";

// One random port per run, shared with the workers through the environment
// (they load this file again). Many agents test on this machine at once.
const RESERVED_PORTS = [3000, 43117];

function pickPort() {
  let port: number;
  do port = 40000 + Math.floor(Math.random() * 10000);
  while (RESERVED_PORTS.includes(port));
  return port;
}

process.env.E2E_PORT ??= String(pickPort());
const port = Number(process.env.E2E_PORT);
if (RESERVED_PORTS.includes(port)) throw new Error(`Refusing to run Playwright on a reserved port (${port})`);

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
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: [/.*\.phone\.spec\.ts/, /r048-compare\.spec\.ts/] },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: /core\.spec\.ts/ },
    { name: "r048", testMatch: /r048-compare\.spec\.ts/, dependencies: ["chromium", "webkit"] },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /.*\.phone\.spec\.ts/ },
  ],
  // Test the production build: dev mode compiles on demand and behaves differently.
  webServer: {
    command,
    // "/" always answers with the language redirect (a 3xx counts as ready),
    // whichever pages exist yet.
    url: `http://localhost:${port}/`,
    env: { NEXT_DIST_DIR: distDir, ...Object.fromEntries(BLANK.map((name) => [name, ""])) },
    reuseExistingServer: false,
    timeout: 600_000,
  },
});
