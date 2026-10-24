import { defineConfig, devices } from "@playwright/test";

// One random port per run, shared with the workers through the environment
// (they load this file again). Many agents test on this machine at once.
process.env.E2E_PORT ??= String(40000 + Math.floor(Math.random() * 10000));
const port = Number(process.env.E2E_PORT);

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
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /.*\.phone\.spec\.ts/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /.*\.phone\.spec\.ts/ },
  ],
  // Test the production build: dev mode compiles on demand and behaves differently.
  webServer: {
    command,
    // "/" always answers with the language redirect (a 3xx counts as ready),
    // whichever pages exist yet.
    url: `http://localhost:${port}/`,
    env: { NEXT_DIST_DIR: distDir },
    reuseExistingServer: false,
    timeout: 600_000,
  },
});
