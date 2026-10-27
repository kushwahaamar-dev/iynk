import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Per-agent build folders (NEXT_DIST_DIR=.next-<label>).
    ".next-*/**",
    // Built figure pages and the vendored Colorfigures core are not app source.
    "public/figures/**",
    "figures/vendor/**",
    // Test output.
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    "coverage/**",
    // Spike and schema-check scripts in the master plan are throwaway, not app source.
    "docs/MASTER_PLAN/**",
  ]),
]);

export default eslintConfig;
