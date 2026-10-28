// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const layers = ["tokens", "type", "motion", "layout"] as const;
const sources = Object.fromEntries(layers.map((name) => [name, read(`src/styles/${name}.css`)]));

describe("stylesheet layers", () => {
  it("globals.css imports tailwind, then the four layer files in order", () => {
    const imports = read("src/app/globals.css")
      .split("\n")
      .filter(Boolean);
    expect(imports).toEqual([
      '@import "tailwindcss";',
      ...layers.map((name) => `@import "../styles/${name}.css";`),
    ]);
  });

  it("no custom property is declared under the same selector in two files", () => {
    const seen = new Map<string, string>();
    for (const name of layers) {
      const blocks = sources[name].matchAll(/^([^\s@/*][^{]*|@theme[^{]*)\{([^{}]*)\}/gm);
      for (const [, selector, body] of blocks) {
        for (const [, prop] of body.matchAll(/^\s*(--[\w-]+):/gm)) {
          const key = `${selector.trim()} ${prop}`;
          expect(seen.get(key), key).toBeUndefined();
          seen.set(key, name);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(100);
  });

  it("the dark colours exist for both the media query and the attribute", () => {
    const tokens = sources.tokens;
    expect(tokens.match(/:root:not\(\[data-theme="light"\]\) \{/g)).toHaveLength(1);
    expect(tokens.match(/:root\[data-theme="dark"\] \{/g)).toHaveLength(1);
    expect(tokens).toContain("@media (prefers-color-scheme: dark)");
  });
});
