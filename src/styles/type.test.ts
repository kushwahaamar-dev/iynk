// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const typeCss = read("src/styles/type.css");

describe("type tokens", () => {
  it("type.css has no italic, Instrument Serif or accent face", () => {
    expect(typeCss).not.toMatch(/italic/);
    expect(typeCss).not.toMatch(/Instrument/);
    expect(typeCss).not.toMatch(/font-accent|accent-serif/);
  });

  it("the layout loads Geist, Geist Mono and Noto Sans Devanagari only", () => {
    const layout = read("src/app/[lang]/layout.tsx");
    const imported = layout.match(/import \{([^}]*)\} from "next\/font\/google"/)?.[1].split(",").map((name) => name.trim());
    expect(imported).toEqual(["Geist", "Geist_Mono", "Noto_Sans_Devanagari"]);
    expect(layout).not.toContain("Instrument_Serif");
    expect(layout).not.toContain("--font-display");
    expect(layout.match(/display: "swap"/g)).toHaveLength(3);
  });

  it("the code editor draws comments upright at the small step", () => {
    const editor = read("src/components/boardlab/CodeEditor.tsx");
    expect(editor).not.toMatch(/italic/);
    expect(editor).toContain('fontSize: "var(--text-sm)"');
  });

  it("defines the kicker, field label and Hindi and Han line height utilities", () => {
    expect(typeCss).toMatch(/\.kicker,/);
    expect(typeCss).toMatch(/\.field-label,/);
    expect(typeCss).toMatch(/\.lang-air:is\(:lang\(hi\), :lang\(zh-Hans\)\)[\s\S]*?line-height: 1\.3;/);
  });
});
