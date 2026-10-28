import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GLYPHS } from "../../../scripts/gen-icons.mjs";
import { ICON_PATHS } from "./icon-paths.generated";
import { Icon, type IconName } from "./icons";

const names = Object.keys(ICON_PATHS) as IconName[];

describe("Icon", () => {
  it.each(names)("%s renders one hidden svg with paths", (name) => {
    const { container } = render(<Icon name={name} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute("aria-hidden")).toBe("true");
    expect(svgs[0].getAttribute("viewBox")).toBe("0 0 256 256");
    expect(svgs[0].querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("has a glyph for every name and a path set for every glyph", () => {
    expect(names.sort()).toEqual(Object.keys(GLYPHS).sort());
  });

  it("keeps the generated file current", () => {
    const dir = mkdtempSync(join(tmpdir(), "icons-"));
    try {
      const out = join(dir, "icon-paths.generated.ts");
      execFileSync(process.execPath, ["scripts/gen-icons.mjs", "--out", out], { cwd: process.cwd() });
      expect(readFileSync(out, "utf8")).toBe(readFileSync(join(process.cwd(), "src/components/ui/icon-paths.generated.ts"), "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(Object.entries(GLYPHS))("%s maps to an installed Phosphor glyph, %s", (_name, glyph) => {
    const file = join(process.cwd(), "node_modules/@phosphor-icons/react/dist/defs", `${glyph}.es.js`);
    expect(existsSync(file)).toBe(true);
  });

  it("draws at 20 by default", () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("20");
  });

  it.each([16, 20, 32] as const)("draws at size %i", (size) => {
    const { container } = render(<Icon name="check" size={size} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe(String(size));
  });

  it("rejects a size off the scale", () => {
    // @ts-expect-error 18 is not one of 16, 20, 32
    render(<Icon name="check" size={18} />);
  });

  it("passes extra svg props through", () => {
    const { container } = render(<Icon name="check" className="mark" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("mark");
  });
});
