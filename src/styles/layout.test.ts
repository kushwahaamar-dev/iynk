// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/styles/layout.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
};

describe("layout layer", () => {
  it("has no gradient", () => {
    expect(css).not.toContain("gradient");
  });

  it("uses no offset box-shadow", () => {
    expect(css).not.toMatch(/box-shadow:\s*-?\d+px\s+-?\d+px/);
  });

  it("has no elliptical border-radius", () => {
    expect(css).not.toMatch(/border-radius:[^;]*\//);
  });

  it("sets the header to 64px", () => {
    expect(block("html:root")).toContain("--header-h: 64px;");
  });

  it("draws the field without a background image", () => {
    expect(block(".ink-field")).not.toContain("background-image");
    expect(block("select.ink-field")).not.toContain("background-image");
  });

  it("rings focus with 2px and no halo", () => {
    const focus = block(":focus-visible");
    expect(focus).toContain("outline: 2px solid var(--focus);");
    expect(focus).toContain("outline-offset: 2px;");
    expect(focus).not.toContain("box-shadow");
    expect(css).not.toContain("--halo");
  });

  it("publishes the new names next to the old ones", () => {
    expect(css).toContain(".ink-plate,\n  .plate {");
    expect(css).toContain(".prose {");
  });
});
