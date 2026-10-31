import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Wall-clock budgets under 1 s. They run one file at a time on a quiet CPU:
// a budget measured beside other test workers says nothing about the code.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.perf.test.{ts,tsx}"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
  },
});
