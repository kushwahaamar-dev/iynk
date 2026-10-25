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
    // Content tests run whole lessons in the interpreter: under 3 s alone, but past the 5 s default while every
    // other suite shares the CPU.
    testTimeout: 30_000,
  },
});
