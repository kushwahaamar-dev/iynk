import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resolves the tsconfig "@/*" paths itself.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Playwright owns e2e/; Vitest runs the unit tests next to the code.
    include: ["src/**/*.test.{ts,tsx}", "figures/**/*.test.{js,mjs,ts}", "scripts/**/*.test.{js,mjs,ts}"],
    // Content tests run whole lessons in the interpreter (under 3 s alone) and step figures in simulated time, but
    // slow down while every other suite, or a build, shares the CPU. Vitest cannot interrupt a synchronous body, so
    // long sweeps are split into chunks that each finish well inside this one limit.
    testTimeout: 60_000,
  },
});
