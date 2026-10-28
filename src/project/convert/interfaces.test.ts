// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PIN_ID_PATTERN } from "../../core/ids.ts";
import { extractBoardHeaders, extractPartLegs } from "../../../scripts/figure-extract.mjs";
import { listItems, loadItem } from "../../../scripts/convert-io.mjs";
import type { Project } from "../generated/types.ts";
import { PART_GROUPS, PART_REFS, boardInterface, partInterface, partRef, surfaceInterface } from "./interfaces.ts";
import type { CatalogueItem, FigureHeader } from "./types.ts";

type BoardItem = CatalogueItem & { lab: "board" };

const example = JSON.parse(
  readFileSync(new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json", import.meta.url), "utf8"),
) as Project;

const boards = listItems()
  .filter((i: { lab: string }) => i.lab === "board")
  .map((i: { id: string }) => loadItem("board", i.id) as BoardItem);
const uno = boards.find((b) => b.id === "uno-r3")!;
const unoHeaders = (await extractBoardHeaders("uno-r3")) as FigureHeader[];

const partFiles = readdirSync(new URL("../../../figures/parts/", import.meta.url)).filter((f) => f.endsWith(".js"));
const withLegs = (
  await Promise.all(
    partFiles.map(async (f) => ({ part: f.replace(/\.js$/, ""), legs: (await extractPartLegs(`figures/parts/${f}`)) as string[] })),
  )
).filter((p) => p.legs.length > 0);

describe("boardInterface of the Uno R3", () => {
  const { snapshot } = boardInterface(uno, unoHeaders);
  const golden = example.dependencies.components.find((c) => c.ref === "core.uno-r3")!.interface;

  it("has 44 pins and the 6 internal-short groups of the lesson example", () => {
    expect(snapshot.role).toBe("board");
    expect(snapshot.pins).toHaveLength(44);
    expect(snapshot.groups).toEqual(golden.groups);
  });

  it("matches the example on id, designator, header, net and type", () => {
    const pick = (pins: typeof golden.pins) => pins.map(({ id, designator, header, net, type }) => ({ id, designator, header, net, type }));
    const expected = pick(golden.pins).map((p) => (p.id === "IOREF" ? { ...p, type: "power_io" } : p));
    expect(pick(snapshot.pins)).toEqual(expected);
  });

  it("gives every pin a class that goes with its type", () => {
    const classes = new Map(snapshot.pins.map((p) => [p.id, p.class]));
    expect(classes.get("GND")).toBe("ground");
    expect(classes.get("P5V")).toBe("power");
    expect(classes.get("A0")).toBe("digital");
    expect(classes.get("AREF")).toBe("analog");
    expect(classes.get("NC")).toBe("nc");
  });
});

describe("boardInterface of all 12 boards", () => {
  it("reads 12 boards", () => {
    expect(boards).toHaveLength(12);
  });

  it.each(boards.map((b) => [b.id, b] as const))("%s has valid, unique pin ids", (_, board) => {
    const { snapshot, ids } = boardInterface(board);
    expect(ids).toHaveLength(board.data.pinout.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(PIN_ID_PATTERN);
    expect(snapshot.pins.length).toBeLessThanOrEqual(1024);
    for (const group of snapshot.groups ?? []) expect(group.pins.every((p) => ids.includes(p))).toBe(true);
  });
});

describe("refToPin", () => {
  const { refToPin } = boardInterface(uno, unoHeaders);

  it.each([
    ["IOH.5", "D13"],
    ["IOH.4", "GND"],
    ["IOH.7", "D11"],
    ["POWER.5", "P5V"],
    ["POWER.4", "P3V3"],
    ["POWER.6", "GND"],
    ["POWER.1", "NC"],
    ["D2", "D2"],
    ["A0", "A0"],
    ["5V", "P5V"],
  ])("%s is the pin %s", (ref, pin) => {
    expect(refToPin(ref)).toBe(pin);
  });

  it.each(["IOH.99", "IOH.0", "NOPE", "XYZ.3", ""])("%j is nothing", (ref) => {
    expect(refToPin(ref)).toBeNull();
  });

  it("reads a header reference as the catalogue row when the figure header is not given", () => {
    expect(boardInterface(uno).refToPin("POWER.5")).toBe("P5V");
    expect(boardInterface(uno).refToPin("D13")).toBe("D13");
  });
});

describe("partInterface", () => {
  it("covers the 28 figure parts that have legs", () => {
    expect(partFiles).toHaveLength(29);
    expect(withLegs).toHaveLength(28);
  });

  it.each(withLegs.map((p) => [p.part, p.legs] as const))("%s has valid, unique passive pins", (part, legs) => {
    const { role, pins } = partInterface(part, legs);
    expect(role).toBe("part");
    expect(pins.map((p) => p.designator)).toEqual(legs);
    expect(new Set(pins.map((p) => p.id)).size).toBe(legs.length);
    for (const pin of pins) {
      expect(pin.id).toMatch(PIN_ID_PATTERN);
      expect([pin.type, pin.class]).toEqual(["passive", "passive"]);
    }
  });

  it("matches the lesson example on pins and groups for the LED, the resistor and the push button", () => {
    const golden = (ref: string) => example.dependencies.components.find((c) => c.ref === ref)!.interface;
    const shape = ({ pins, groups }: ReturnType<typeof partInterface>) => ({
      pins: pins.map(({ id, designator, type }) => ({ id, designator, type })),
      groups,
    });
    expect(shape(partInterface("led", ["A", "K"]))).toEqual({ ...shape(golden("core.led-5mm")), groups: undefined });
    expect(shape(partInterface("resistor", ["1", "2"]))).toEqual({ ...shape(golden("core.resistor")), groups: undefined });
    expect(shape(partInterface("push-button", ["1", "2", "3", "4"]))).toEqual(shape(golden("core.push-button-6mm")));
  });

  it("joins the push button legs in two pairs and no other part", () => {
    expect(Object.keys(PART_GROUPS)).toEqual(["push-button"]);
    expect(partInterface("led", ["A", "K"]).groups).toBeUndefined();
  });
});

describe("PART_REFS and partRef", () => {
  it("names the six part descriptors", () => {
    expect(Object.entries(PART_REFS).map(([part, { ref }]) => [part, ref])).toEqual([
      ["led", "core.led-5mm"],
      ["resistor", "core.resistor"],
      ["push-button", "core.push-button-6mm"],
      ["potentiometer", "core.potentiometer-10k"],
      ["piezo-buzzer", "core.buzzer-piezo"],
      ["ssd1306", "core.ssd1306"],
    ]);
  });

  it("maps every other part to core.<id> without a descriptor", () => {
    expect(partRef("led")).toEqual({ ref: "core.led-5mm", version: "1.0.0", descriptor: true });
    expect(partRef("hc-sr04")).toEqual({ ref: "core.hc-sr04", version: "1.0.0", descriptor: false });
  });
});

describe("surfaceInterface", () => {
  it("is the one from holes.ts", () => {
    expect(surfaceInterface("half").role).toBe("surface");
  });
});
