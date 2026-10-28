// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/styles/motion.css"), "utf8");
const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion"));

describe("motion.css", () => {
  it("has one cubic-bezier and it is the base curve", () => {
    expect(css.match(/cubic-bezier\(/g)).toHaveLength(1);
    expect(css).toContain("--ease-iynk: cubic-bezier(0.22, 1, 0.36, 1);");
  });

  it("never runs a duration under 200 ms", () => {
    const durations = [...css.replace(/^.*delay.*$/gm, "").matchAll(/\b(\d*\.?\d+)(ms|s)\b/g)].map(([, n, unit]) =>
      unit === "s" ? Number(n) * 1000 : Number(n),
    );
    expect(durations.length).toBeGreaterThan(5);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(200);
  });

  it("sets a bare transition to 300 ms on the base curve", () => {
    expect(css).toContain("--default-transition-duration: 300ms;");
    expect(css).toContain("--default-transition-timing-function: var(--ease-iynk);");
  });

  it("swaps movement for a fade when motion is reduced", () => {
    expect(reduced).toContain("--travel: 0px;");
    expect(reduced).toContain("--slide-travel: 0px;");
    expect(css).toContain(':root[data-reduce-motion="true"] {');
    expect(reduced).not.toMatch(/animation-duration|transition-duration/);
  });

  it("uses no !important", () => {
    expect(css).not.toContain("!important");
  });

  it("keeps the legacy animation names pointing at the new ones", () => {
    for (const [old, next] of [
      ["pop", "scale-in"],
      ["fade", "fade-in"],
      ["rise", "rise-in"],
      ["from-start", "slide-in-start"],
      ["from-end", "slide-in-end"],
    ]) {
      expect(css).toContain(`--animate-ink-${old}: var(--animate-${next});`);
    }
  });
});

describe("motion in src", () => {
  const banned = /(?<![\w-])(transition-all|ease-in|ease-out|ease-linear)(?![\w-])|\b(?:transition|animation)(?:-timing-function)?\s*:[^;{}]*\b(?:linear|ease-in|ease-out)\b/;

  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sources(path);
      return /\.(tsx?|css)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
    });
  }

  it("has no transition-all and no ease-in, ease-out or linear timing", () => {
    const hits = sources(join(process.cwd(), "src")).filter((file) => banned.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });
});
