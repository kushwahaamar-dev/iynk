import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Portable code runs in the browser, in Workers and on the server (ADR-0014).
    files: ["src/core/**", "src/protocol/**", "src/project/**", "src/parts/**", "src/sim/**", "src/export/**"],
    ignores: ["**/*.test.ts", "**/*.testing.ts", "src/parts/browser/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/*"], message: "Portable code cannot import from the app tree. See ADR-0014" },
            { group: ["react", "react-dom"], message: "Portable code cannot use React. See ADR-0014" },
            { group: ["next", "next/*"], message: "Portable code cannot use Next. See ADR-0014" },
            { group: ["node:*"], message: "Portable code cannot use Node built-ins. See ADR-0014" },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Portable code cannot read the clock. Inject a Clock. See ADR-0014" },
        { object: "Math", property: "random", message: "Portable code cannot use Math.random. Inject a RandomSource. See ADR-0014" },
      ],
      "no-restricted-globals": [
        "error",
        ...["window", "document", "localStorage", "indexedDB", "navigator"].map((name) => ({
          name,
          message: `Portable code cannot use ${name}. See ADR-0014`,
        })),
      ],
    },
  },
  {
    // The simulation must replay bit for bit: no wall time, no randomness, no dynamic code (SA-11).
    // This block restates the properties of the portable block, because a later block replaces the options of the same rule.
    files: ["src/sim/**/*.ts"],
    ignores: ["src/sim/**/*.test.ts", "src/sim/**/*.testing.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Simulation code cannot read the clock. Use SimTime. See SA-11" },
        { object: "Math", property: "random", message: "Simulation code cannot use Math.random. Use rng(seed, stream). See SA-11" },
        { object: "performance", property: "now", message: "Simulation code cannot read the clock. Use SimTime. See SA-11" },
        { object: "crypto", property: "getRandomValues", message: "Simulation code cannot draw random bytes. Use rng(seed, stream). See SA-11" },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "Simulation code cannot read the clock. See SA-11" },
        { selector: "NewExpression[callee.name='Function']", message: "Simulation code cannot build code at run time. See SA-11" },
        { selector: "CallExpression[callee.name='eval']", message: "Simulation code cannot use eval. See SA-11" },
        { selector: "ImportExpression", message: "Simulation code cannot import dynamically. See SA-11" },
      ],
    },
  },
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
    // Engine files copied or bundled by scripts/build-engines.mjs.
    "public/engines/**",
    "figures/vendor/**",
    // Test output.
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    "coverage/**",
    // Spike and schema-check scripts in the master plan are throwaway, not app source.
    "docs/MASTER_PLAN/**",
    // Written by scripts/schema-gen.mjs.
    "src/**/generated/**",
  ]),
]);

export default eslintConfig;
