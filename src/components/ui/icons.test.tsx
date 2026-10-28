import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, snapIconSize, type IconName } from "./icons";

const SOURCE = join(process.cwd(), "src/components/ui/icons.tsx");

const MAPPING: [IconName, string][] = [
  ["close", "X"],
  ["menu", "List"],
  ["check", "Check"],
  ["copy", "Copy"],
  ["chevron-right", "CaretRight"],
  ["chevron-left", "CaretLeft"],
  ["chevron-down", "CaretDown"],
  ["info", "Info"],
  ["tip", "Lightbulb"],
  ["warn", "Warning"],
  ["danger", "WarningOctagon"],
  ["globe", "Globe"],
  ["board", "Cpu"],
  ["robot", "Robot"],
  ["drone", "Fan"],
  ["play", "Play"],
  ["external", "ArrowUpRight"],
  ["keyboard", "Keyboard"],
  ["settings", "GearSix"],
  ["tools", "Wrench"],
  ["sound-on", "SpeakerHigh"],
  ["sound-off", "SpeakerSlash"],
  ["rotate-left", "ArrowCounterClockwise"],
  ["rotate-right", "ArrowClockwise"],
  ["target", "Crosshair"],
  ["reset", "ArrowsCounterClockwise"],
  ["expand", "ArrowsOut"],
  ["lock", "Lock"],
  ["undo", "ArrowUUpLeft"],
  ["panel-right", "SidebarSimple"],
  ["spark", "Sparkle"],
  ["people", "UsersThree"],
  ["share", "ShareNetwork"],
  ["mic", "Microphone"],
  ["link", "LinkSimple"],
  ["download", "DownloadSimple"],
  ["book", "BookOpen"],
  ["refresh", "ArrowsClockwise"],
  ["send", "PaperPlaneRight"],
  ["stop", "Stop"],
  ["chat", "ChatCircle"],
  ["key", "Key"],
  ["search", "MagnifyingGlass"],
  ["command", "Command"],
  ["arrow-right", "ArrowRight"],
  ["github", "GithubLogo"],
  ["warn-circle", "WarningCircle"],
  ["check-circle", "CheckCircle"],
  ["empty", "Tray"],
  ["eye", "Eye"],
  ["code", "Code"],
  ["bolt", "Lightning"],
  ["fly", "AirplaneTilt"],
  ["house", "House"],
  ["sliders", "SlidersHorizontal"],
];

describe("Icon", () => {
  it.each(MAPPING)("%s renders one hidden svg", (name) => {
    const { container } = render(<Icon name={name} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute("aria-hidden")).toBe("true");
  });

  it.each(MAPPING)("%s resolves to the Phosphor module %s", async (_name, glyph) => {
    const mod = await import(`@phosphor-icons/react/dist/ssr/${glyph}`);
    expect(mod[glyph]).toBeDefined();
  });

  it("covers exactly the mapped names", () => {
    const source = readFileSync(SOURCE, "utf8");
    const imported = [...source.matchAll(/from "@phosphor-icons\/react\/dist\/ssr\/(\w+)"/g)].map((m) => m[1]);
    expect(imported.sort()).toEqual([...new Set(MAPPING.map(([, glyph]) => glyph))].sort());
  });

  it("draws at 20 by default", () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("20");
  });

  it.each([
    [12, 16],
    [14, 16],
    [16, 16],
    [18, 20],
    [20, 20],
    [22, 24],
    [24, 24],
    [28, 32],
    [32, 32],
    [40, 32],
  ])("snaps size %i to %i", (size, step) => {
    expect(snapIconSize(size)).toBe(step);
    const { container } = render(<Icon name="check" size={size} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe(String(step));
  });

  it("passes extra svg props through", () => {
    const { container } = render(<Icon name="check" className="mark" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("mark");
  });

  it("imports Phosphor only from the ssr path", () => {
    const source = readFileSync(SOURCE, "utf8");
    const specs = [...source.matchAll(/from "(@phosphor-icons[^"]*)"/g)].map((m) => m[1]);
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) expect(spec.startsWith("@phosphor-icons/react/dist/ssr/")).toBe(true);
  });
});
