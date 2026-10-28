// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkAll } from "../../project/semantic.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { addResistor, projectWithBreadboard, registry } from "../testing/breadboard-fixture.ts";
import type { Viewport } from "../engine/types.ts";
import { holeAt, holesOf, legsFit, stripOf, stripPeers, surfaceDrawItems, surfaceGeom } from "./breadboard.ts";

const desc = registry.latest("core.breadboard-half") as Descriptor;
const surface = surfaceGeom(desc);
const at = (hole: string) => surface.byName.get(hole)!;
const PITCH = 2.54;

describe("holesOf", () => {
  it("lists every hole once with its strip, in the y-down frame", () => {
    const holes = holesOf(desc);
    expect(holes).toHaveLength(400);
    expect(holes.find((h) => h.hole === "a1")).toEqual({ hole: "a1", xMm: 4.42, yMm: 14.06, strip: "S1u" });
    expect(holes.find((h) => h.hole === "RAIL_TP2")).toMatchObject({ yMm: 5.94, strip: "RAIL_TP" });
  });
});

describe("holeAt", () => {
  it("finds a hole at its centre and near its edge", () => {
    const h = at("c12");
    expect(holeAt(surface, { x: h.xMm, y: h.yMm }, 1)).toBe("c12");
    expect(holeAt(surface, { x: h.xMm + 0.9, y: h.yMm - 0.9 }, 1.5)).toBe("c12");
  });

  it("returns null in the gap between the halves and off the board", () => {
    const e = at("e5");
    const f = at("f5");
    expect(holeAt(surface, { x: e.xMm, y: (e.yMm + f.yMm) / 2 }, 1.27)).toBeNull();
    expect(holeAt(surface, { x: -20, y: -20 }, 1.27)).toBeNull();
  });

  it("picks the nearer of two holes", () => {
    const a = at("a5");
    expect(holeAt(surface, { x: a.xMm + 1.5, y: a.yMm }, 2)).toBe("a6");
  });
});

describe("strips", () => {
  it("answers the strip of a hole", () => {
    expect(stripOf(surface, "b12")).toBe("S12u");
    expect(stripOf(surface, "g12")).toBe("S12l");
    expect(stripOf(surface, "RAIL_TN12")).toBe("RAIL_TN");
    expect(() => stripOf(surface, "z99")).toThrow(RangeError);
  });

  it("lists the peers of a column hole and a rail hole", () => {
    expect(stripPeers(surface, "c12")).toEqual(["a12", "b12", "d12", "e12"]);
    expect(stripPeers(surface, "RAIL_TP8")).toHaveLength(24);
    expect(stripPeers(surface, "z99")).toEqual([]);
  });
});

describe("legsFit", () => {
  const origin = { x: at("a10").xMm, y: at("a10").yMm };
  const span = 3 * PITCH;

  it("seats a 2-leg resistor at 7.62 mm in four rotations", () => {
    const legs = { P1: { x: 0, y: 0 }, P2: { x: span, y: 0 } };
    expect(legsFit(surface, legs, origin, 0)).toEqual({ P1: "a10", P2: "a13" });
    expect(legsFit(surface, legs, { x: at("a20").xMm, y: at("a20").yMm }, 180)).toEqual({ P1: "a20", P2: "a17" });
    expect(legsFit(surface, legs, { x: at("a10").xMm, y: at("d10").yMm }, 90)).toEqual({ P1: "d10", P2: "a10" });
    expect(legsFit(surface, legs, origin, 270)).toEqual({ P1: "a10", P2: "d10" });
    expect(legsFit(surface, legs, { x: at("a1").xMm, y: at("a1").yMm }, 180)).toBeNull();
  });

  it("seats a vertical LED across rows of one column", () => {
    const led = { A: { x: 0, y: 0 }, K: { x: 0, y: PITCH } };
    expect(legsFit(surface, led, { x: at("a7").xMm, y: at("a7").yMm }, 0)).toEqual({ A: "a7", K: "b7" });
  });

  it("snaps a leg that is within half a pitch", () => {
    const legs = { P1: { x: 0, y: 0 }, P2: { x: PITCH, y: 0 } };
    expect(legsFit(surface, legs, { x: origin.x + 0.8, y: origin.y - 0.6 }, 0)).toEqual({ P1: "a10", P2: "a11" });
  });

  it("returns null off the board and when two legs share a hole", () => {
    expect(legsFit(surface, { P1: { x: 0, y: 0 }, P2: { x: span, y: 0 } }, { x: 200, y: 200 }, 0)).toBeNull();
    expect(legsFit(surface, { P1: { x: 0, y: 0 }, P2: { x: 0.5, y: 0 } }, origin, 0)).toBeNull();
  });
});

describe("surfaceDrawItems", () => {
  const home = { id: "cmp_bb", xMm: 10, yMm: 20 };
  const view = (k: number): Viewport => ({ cx_mm: 51, cy_mm: 47, k, w: 800, h: 400, dpr: 1 });

  it("draws nothing at level 0 or when the holes are 8 px apart or less", () => {
    expect(surfaceDrawItems(surface, view(10), 0, home)).toEqual([]);
    expect(surfaceDrawItems(surface, view(3), 2, home)).toEqual([]);
  });

  it("draws one item per strip with a dot for every hole", () => {
    const items = surfaceDrawItems(surface, view(8), 1, home);
    expect(items).toHaveLength(64);
    expect(items.reduce((n, i) => n + i.elements.length, 0)).toBe(400);
    expect(items[0]).toMatchObject({ id: "cmp_bb/S1u", kind: "hole", xMm: 10, yMm: 20, title: "strip S1u" });
  });

  it("leaves out strips outside the viewport", () => {
    const left = surfaceDrawItems(surface, { ...view(40), cx_mm: 16, cy_mm: 40, w: 100, h: 100 }, 2, home);
    expect(left.length).toBeGreaterThan(0);
    expect(left.length).toBeLessThan(64);
  });
});

describe("breadboardBatch", () => {
  it("gives a valid project with the breadboard as the surface of vw_bb", () => {
    const { project, bb } = projectWithBreadboard();
    expect(checkAll(project)).toEqual([]);
    expect(project.views.find((v) => v.id === "vw_bb")).toMatchObject({ surface: bb, placements: [{ c: bb, x_mm: 10, y_mm: 20 }] });
    expect(project.components).toEqual([{ id: bb, definition: { ref: "core.breadboard-half", version: "1.0.0" }, refdes: "BB1" }]);
    const dep = project.dependencies.components.find((d) => d.ref === "core.breadboard-half");
    expect(dep).toMatchObject({ origin: "builtin", interface: { role: "surface" } });
  });

  it("accepts a leg in a top rail hole and a wire end at RAIL_TN12", () => {
    const { project } = projectWithBreadboard((bb) => [
      ...addResistor(),
      { k: "net.create", net: { id: "net_vcc", connections: [{ c: "cmp_r1", p: "P1" }, { c: bb, p: "RAIL_TP8" }] } },
      { k: "net.create", net: { id: "net_gnd", connections: [{ c: bb, p: "RAIL_TN12" }, { c: "brd_uno", p: "GND" }] } },
      { k: "view.place", view: "vw_bb", placement: { c: "cmp_r1", x_mm: 20, y_mm: 20, legs: { P1: "RAIL_TP8", P2: "a12" } } },
      {
        k: "wire.add",
        view: "vw_bb",
        wire: { id: "wir_g", net: "net_gnd", from: { kind: "pin", c: "brd_uno", p: "GND" }, to: { kind: "hole", surface: bb, hole: "RAIL_TN12" } },
      },
    ]);
    expect(checkAll(project).filter((d) => d.code.startsWith("V3-HOLE"))).toEqual([]);
  });

  it("throws when the registry lacks the breadboard", async () => {
    const { createRegistry } = await import("../../parts/registry.ts");
    const { breadboardBatch } = await import("./breadboard.ts");
    expect(() => breadboardBatch(createRegistry(), () => "cmp_x" as never, { x: 0, y: 0 })).toThrow(/core.breadboard-half/);
  });
});
