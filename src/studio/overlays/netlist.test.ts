// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project } from "../../project/generated/types.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import type { ArtProvider, ResolvedPartShape, Scene, Viewport } from "../engine/types.ts";
import { addResistor, projectWithBreadboard, registry } from "../testing/breadboard-fixture.ts";
import { focusNetOverlay } from "./netlist.ts";

const viewport: Viewport = { cx_mm: 50, cy_mm: 40, k: 8, w: 1000, h: 600, dpr: 1 };
const art: ArtProvider = { get: () => [] };

function resolve(defRef: string): ResolvedPartShape {
  const d = registry.latest(defRef)!;
  const h = d.dimensions?.body?.h ?? 1;
  return {
    widthMm: d.dimensions?.body?.w ?? 1,
    heightMm: h,
    known: true,
    pins: d.pins.map((p) => ({ id: p.id, xMm: p.position?.x ?? 0, yMm: h - (p.position?.y ?? 0), mechanical: p.type === "mechanical" })),
  };
}

const sceneOf = (state: Project): Scene =>
  buildDrawList({ state, viewId: "vw_bb", viewport, art, resolve, index: null, prev: null, mode: "illustrated", overlays: [] }).scene;

function circuit() {
  return projectWithBreadboard((bb) => [
    ...addResistor(),
    { k: "net.create", net: { id: "net_n1", connections: [{ c: "cmp_r1", p: "P1" }, { c: bb, p: "a5" }, { c: bb, p: "RAIL_TP8" }] } },
    { k: "net.create", net: { id: "net_other", connections: [{ c: "cmp_r1", p: "P2" }, { c: bb, p: "a9" }] } },
    { k: "view.place", view: "vw_bb", placement: { c: "cmp_r1", x_mm: 30, y_mm: 70 } },
    {
      k: "wire.add",
      view: "vw_bb",
      wire: { id: "wir_1", net: "net_n1", from: { kind: "hole", surface: bb, hole: "a5" }, to: { kind: "pin", c: "cmp_r1", p: "P1" } },
    },
    {
      k: "wire.add",
      view: "vw_bb",
      wire: { id: "wir_2", net: "net_other", from: { kind: "hole", surface: bb, hole: "a9" }, to: { kind: "pin", c: "cmp_r1", p: "P2" } },
    },
  ]);
}

describe("focusNetOverlay", () => {
  it("rings every member pin and outlines every wire of the net, and nothing else", () => {
    const { project } = circuit();
    const overlays = focusNetOverlay(project, "vw_bb", "net_n1", sceneOf(project));
    expect(overlays).toHaveLength(3 + 1);
    expect(overlays.map((o) => o.id).sort()).toEqual(
      [`focus:${project.components[0]!.id}/RAIL_TP8`, `focus:${project.components[0]!.id}/a5`, "focus:cmp_r1/P1", "focus:wir_1"].sort(),
    );
    expect(overlays.some((o) => o.id === "focus:wir_2")).toBe(false);
  });

  it("tags the net with its name and size as text", () => {
    const { project } = circuit();
    const text = focusNetOverlay(project, "vw_bb", "net_n1", sceneOf(project)).flatMap((o) => o.elements).filter((e) => e.t === "text");
    expect(text).toHaveLength(1);
    expect(text[0]).toMatchObject({ s: "net net_n1 (3 pins)" });
  });

  it("outlines with a stroke, so the cue is not colour alone", () => {
    const { project } = circuit();
    for (const o of focusNetOverlay(project, "vw_bb", "net_n1", sceneOf(project))) {
      expect(o.elements.some((e) => e.t !== "text" && e.stroke !== undefined && e.fill === "none")).toBe(true);
    }
  });

  it("returns nothing for no net, an unknown net or an unknown view", () => {
    const { project } = circuit();
    const scene = sceneOf(project);
    expect(focusNetOverlay(project, "vw_bb", null, scene)).toEqual([]);
    expect(focusNetOverlay(project, "vw_bb", "net_missing", scene)).toEqual([]);
    expect(focusNetOverlay(project, "vw_none", "net_n1", scene)).toEqual([]);
  });
});
