// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const BANNED: Record<string, string> = {
  "Date.now": "export const a = Date.now();\n",
  "performance.now": "export const a = performance.now();\n",
  "Math.random": "export const a = Math.random();\n",
  "crypto.getRandomValues": "export const a = crypto.getRandomValues(new Uint8Array(1));\n",
  "new Date": "export const a = new Date();\n",
  eval: "export const a = eval('1');\n",
  "new Function": "export const a = new Function('return 1');\n",
  "dynamic import": "export const a = import('./b.ts');\n",
};

const eslint = new ESLint({ cwd: process.cwd() });

async function errors(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId ?? "parse");
}

describe("SA-11 lint ban", () => {
  it.each(Object.entries(BANNED))("fails %s in src/sim", async (_name, code) => {
    const rules = await errors(code, "src/sim/core/x.ts");
    expect(rules.some((r) => r === "no-restricted-properties" || r === "no-restricted-syntax")).toBe(true);
  });

  it.each(Object.entries(BANNED))("allows %s outside src/sim", async (_name, code) => {
    expect(await errors(code, "src/lib/x.ts")).toEqual([]);
  });

  it.each(Object.entries(BANNED))("allows %s in a src/sim test file", async (_name, code) => {
    expect(await errors(code, "src/sim/core/x.test.ts")).toEqual([]);
  });
});
