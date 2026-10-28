// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function declarations(body: string): Record<string, string> {
  return Object.fromEntries([...body.matchAll(/^\s*(--[\w-]+):\s*(.+?);\s*$/gm)].map(([, name, value]) => [name, value]));
}

function blockBody(selector: string): string {
  const open = css.indexOf(`${selector} {`) + selector.length + 2;
  expect(open, selector).toBeGreaterThan(selector.length + 1);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

const light = declarations(blockBody(":root,\n.plate"));
const root = declarations(blockBody(":root"));
const dark = { ...light, ...declarations(blockBody(':root[data-theme="dark"]')) };
const darkMedia = { ...light, ...declarations(blockBody(':root:not([data-theme="light"])')) };
const darkOwn = declarations(blockBody(':root[data-theme="dark"]'));
const themes = { light: { ...root, ...light }, dark: { ...root, ...dark } };

function channel(hex: string, at: number): number {
  const v = parseInt(hex.slice(at, at + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function saturation(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
}

const ALLOWED_DARK = ["#000000", "#181818", "#1f1f1f", "#272727", "#313131", "#131209"];
const OUTLINED = ["--accent"];

describe("dark surfaces", () => {
  it("use only the allowed list", () => {
    for (const name of ["--paper", "--alt", "--surface", "--raised", "--hover", "--sunken", "--code-bg"]) {
      expect(ALLOWED_DARK, name).toContain(dark[name].toLowerCase());
      expect(ALLOWED_DARK, `${name} (media)`).toContain(darkMedia[name].toLowerCase());
    }
    for (const name of ["--console-bg", "--console-well"]) expect(ALLOWED_DARK, name).toContain(root[name].toLowerCase());
  });

  it("the media query block and the attribute block carry the same overrides", () => {
    expect(darkMedia).toEqual(dark);
  });

  it("have no grain and heavier shadows", () => {
    expect(light["--grain"]).toContain("url(");
    expect(darkOwn["--grain"]).toBe("none");
    expect([light["--shadow-a1"], light["--shadow-a2"], light["--shadow-a3"]]).toEqual(["0.08", "0.12", "0.18"]);
    expect([darkOwn["--shadow-a1"], darkOwn["--shadow-a2"], darkOwn["--shadow-a3"]]).toEqual(["0.5", "0.6", "0.7"]);
  });
});

describe.each(["light", "dark"] as const)("contrast in %s", (name) => {
  const t = themes[name];

  it("body and muted text reach 4.5 to 1 on the page and panels", () => {
    for (const fill of ["--paper", "--surface", "--sunken"]) {
      expect(contrast(t["--ink"], t[fill]), `ink on ${fill}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--muted"], t[fill]), `muted on ${fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("text on the accent reaches 4.5 to 1, also on its hover fill", () => {
    expect(contrast(t["--on-accent"], t["--accent"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["--on-accent"], t["--accent-hover"])).toBeGreaterThanOrEqual(4.5);
  });

  it("the focus ring reaches 3 to 1 on the page and panels", () => {
    expect(contrast(t["--focus"], t["--paper"])).toBeGreaterThanOrEqual(3);
    expect(contrast(t["--focus"], t["--surface"])).toBeGreaterThanOrEqual(3);
  });

  it("accent text reaches 4.5 to 1 on the page", () => {
    expect(contrast(t["--accent-ink"], t["--paper"])).toBeGreaterThanOrEqual(4.5);
  });

  it("state colours reach 4.5 to 1 on the page", () => {
    for (const state of ["--good", "--bad", "--warn", "--info"]) {
      expect(contrast(t[state], t["--paper"]), state).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("a control fill under 3 to 1 on a panel is listed as outlined", () => {
    const weak = ["--accent"].filter(
      (fill) => contrast(t[fill], t["--surface"]) < 3 || contrast(t[fill], t["--sunken"]) < 3,
    );
    for (const fill of weak) expect(OUTLINED).toContain(fill);
  });
});

describe("accent and console", () => {
  it("the accent is under 80 percent saturation", () => {
    expect(saturation(light["--accent"])).toBeLessThan(0.8);
  });

  it("console text reaches 4.5 to 1 on the console and its well", () => {
    for (const text of ["--console-ink", "--console-muted", "--console-accent", "--console-warn", "--console-err"]) {
      expect(contrast(root[text], root["--console-bg"]), text).toBeGreaterThanOrEqual(4.5);
      expect(contrast(root[text], root["--console-well"]), text).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("shadows", () => {
  const theme = css.slice(css.indexOf("@theme inline"));

  it("read the alpha variables", () => {
    for (const [name, alpha] of [["sm", 1], ["md", 2], ["lg", 3]]) {
      expect(theme).toMatch(new RegExp(`--shadow-${name}: [^;]*rgb\\(var\\(--shadow-rgb\\) / var\\(--shadow-a${alpha}\\)\\)`));
    }
  });
});

describe("z scale", () => {
  const scale = Object.entries(root).filter(([name]) => name.startsWith("--z-"));

  it("is unique and ascending", () => {
    const values = scale.map(([, value]) => Number(value));
    expect(scale.map(([name]) => name)).toEqual(
      ["sticky", "header", "dock", "overlay", "popover", "tooltip", "skip"].map((n) => `--z-${n}`),
    );
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it("has a utility for each step", () => {
    for (const [name] of scale) {
      const step = name.slice(4);
      expect(css).toContain(`@utility z-${step} { z-index: var(${name}); }`);
    }
  });
});

describe("tailwind colour aliases", () => {
  const theme = css.slice(css.indexOf("@theme inline"), css.indexOf("@utility"));
  const semantic = [
    "paper", "alt", "surface", "raised", "hover", "sunken", "ink", "muted", "rule", "accent", "accent-hover",
    "accent-ink", "on-accent", "focus", "good", "bad", "warn", "info", "good-bg", "bad-bg", "warn-bg", "info-bg",
    "console-well", "console-ink", "console-muted", "console-accent", "console-warn", "console-err",
  ];

  it("every semantic name points at its own variable", () => {
    for (const name of semantic) expect(theme, name).toContain(`--color-${name}: var(--${name});`);
    expect(theme).toContain("--color-console: var(--console-bg);");
  });

  it("keeps the on-color alias", () => {
    expect(theme).toContain("--color-on-color: var(--on-color);");
  });
});
