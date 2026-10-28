// @vitest-environment node
import { describe, expect, it } from "vitest";
import { stateHash } from "../../project/hash.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { checkAll } from "../../project/semantic.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import { stubArt } from "../engine/testing/mini-scene.ts";
import type { PointMm, Viewport } from "../engine/types.ts";
import { resolvePart } from "../parts-view.ts";
import { createSessionStore } from "../stores/session.ts";
import { projectWithBreadboard, registry } from "../testing/breadboard-fixture.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { BREADBOARD_REF, surfaceGeom } from "../views/breadboard.ts";
import { createToolHost } from "./host.ts";
import { createPlaceTool, placeBatch } from "./place.ts";
import type { PlaceDeps } from "./place.ts";
import type { ToolCtx, ToolKeyEvent, ToolPointerEvent } from "./types.ts";

const VIEW = "vw_bb";
const SURFACE_AT = { x: 10, y: 20 };
const geom = surfaceGeom(registry.latest(BREADBOARD_REF)!);

/** Where a pointer lands to put a part's first pin in `hole`. */
function over(hole: string): PointMm {
  const h = geom.byName.get(hole)!;
  return { x: SURFACE_AT.x + h.xMm, y: SURFACE_AT.y + h.yMm };
}

function setup(extra: Parameters<typeof projectWithBreadboard>[0] = () => []) {
  const { project, bb } = projectWithBreadboard(extra);
  const doc = createRecordingDoc(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
  const session = createSessionStore(VIEW);
  const host = createToolHost({ doc, session });
  const deps: PlaceDeps = { registry, session };
  const tool = createPlaceTool(deps);
  host.register(tool);
  session.setTool("place");

  let viewport: Viewport = { cx_mm: 0, cy_mm: 0, k: 8, w: 800, h: 600, dpr: 1 };
  const ctx = (): ToolCtx => {
    const view = doc.getState();
    const state = view.state;
    return {
      doc: view,
      view: state.views.find((v) => v.id === VIEW)!,
      viewport,
      scene: buildDrawList({ state, viewId: VIEW, viewport, art: stubArt, resolve: (ref) => resolvePart(state, ref), index: null, prev: null, mode: "illustrated", overlays: [] }).scene,
      selection: [],
      snapMm: 2.54,
      hit: () => null,
      resolve: (ref) => resolvePart(state, ref),
    };
  };
  const pointer = (type: ToolPointerEvent["type"], at: PointMm): ToolPointerEvent => ({
    type, xPx: 0, yPx: 0, xMm: at.x, yMm: at.y, button: 0, shift: false, alt: false, ctrl: false, pointerType: "mouse", pointerId: 1,
  });
  const key = (k: string): ToolKeyEvent => ({ key: k, shift: false, alt: false, ctrl: false });
  return {
    bb, doc, session, host, tool, deps, ctx,
    send: (type: ToolPointerEvent["type"], at: PointMm) => host.pointer(pointer(type, at), ctx()),
    press: (k: string) => host.key(key(k), ctx()),
    centreOn: (at: PointMm) => void (viewport = { ...viewport, cx_mm: at.x, cy_mm: at.y }),
  };
}

const kinds = (batch: { k: string }[]) => batch.map((op) => op.k);

describe("placeBatch", () => {
  it("seats an LED in the holes under its legs and names it D1", () => {
    const { ctx, deps, bb } = setup();
    const placed = placeBatch(ctx(), deps, "core.led-5mm", over("b11"));
    if ("refused" in placed) throw new Error(placed.refused);
    expect(kinds(placed.batch)).toEqual(["dep.set", "component.add", "view.place"]);
    expect(placed.refdes).toBe("D1");
    expect(placed.label).toBe("Place D1");
    const place = placed.batch[2]!;
    if (place.k !== "view.place") throw new Error("no placement");
    expect(place.placement.legs).toEqual({ A: "b11", K: "b12" });
    expect(place.placement.c).toBe(placed.id);
    expect(bb).toBeTruthy();
  });

  it("puts the resistor's legs four columns apart and names it R1", () => {
    const { ctx, deps } = setup();
    const placed = placeBatch(ctx(), deps, "core.resistor", over("a5"));
    if ("refused" in placed) throw new Error(placed.refused);
    const place = placed.batch.find((op) => op.k === "view.place");
    expect(place?.k === "view.place" && place.placement.legs).toEqual({ P1: "a5", P2: "a9" });
    expect(placed.refdes).toBe("R1");
  });

  it("seats all four legs of the push button and names it SW1", () => {
    const { ctx, deps } = setup();
    const placed = placeBatch(ctx(), deps, "core.push-button-6mm", over("e14"));
    if ("refused" in placed) throw new Error(placed.refused);
    const place = placed.batch.find((op) => op.k === "view.place");
    expect(Object.keys(place?.k === "view.place" ? (place.placement.legs ?? {}) : {}).sort()).toEqual(["P1", "P2", "P3", "P4"]);
    expect(placed.refdes).toBe("SW1");
  });

  it("adds a second Uno as a board, free of the breadboard, and names it U2", () => {
    const { ctx, deps } = setup();
    const placed = placeBatch(ctx(), deps, "core.uno-r3", { x: -80, y: 60 });
    if ("refused" in placed) throw new Error(placed.refused);
    expect(kinds(placed.batch)).toEqual(["board.add", "view.place"]);
    expect(placed.refdes).toBe("U2");
    const place = placed.batch[1]!;
    expect(place.k === "view.place" && place.placement.legs).toBeUndefined();
  });

  it("gives the part the default parameters of its descriptor", () => {
    const { ctx, deps } = setup();
    const placed = placeBatch(ctx(), deps, "core.resistor", over("a5"));
    if ("refused" in placed) throw new Error(placed.refused);
    const add = placed.batch.find((op) => op.k === "component.add");
    expect(add?.k === "component.add" && add.component.params).toEqual({ ohms: 220 });
  });

  it("skips the dependency when the project already pins the part", () => {
    const { ctx, deps, doc } = setup();
    const first = placeBatch(ctx(), deps, "core.led-5mm", over("b11"));
    if ("refused" in first) throw new Error(first.refused);
    doc.commit(first.batch, { label: first.label });
    const second = placeBatch(ctx(), deps, "core.led-5mm", over("b20"));
    if ("refused" in second) throw new Error(second.refused);
    expect(kinds(second.batch)).toEqual(["component.add", "view.place"]);
    expect(second.refdes).toBe("D2");
  });

  it("takes the lowest refdes number nobody uses", () => {
    const { ctx, deps, doc } = setup();
    for (const [i, hole] of ["a5", "a15", "a25"].entries()) {
      const placed = placeBatch(ctx(), deps, "core.resistor", over(hole));
      if ("refused" in placed) throw new Error(placed.refused);
      doc.commit(placed.batch, { label: placed.label });
      expect(placed.refdes).toBe(`R${i + 1}`);
    }
    const r2 = doc.getState().state.components.find((c) => c.refdes === "R2")!;
    expect(doc.commit([{ k: "component.remove", id: r2.id }], { label: "Delete R2" }).ok).toBe(true);
    const next = placeBatch(ctx(), deps, "core.resistor", over("e5"));
    expect("refused" in next ? null : next.refdes).toBe("R2");
  });

  it("refuses a part that needs holes when the point is off the breadboard", () => {
    const { ctx, deps, doc } = setup();
    expect(placeBatch(ctx(), deps, "core.led-5mm", { x: -200, y: -200 })).toEqual({ refused: "off-board" });
    expect(doc.commits).toHaveLength(0);
  });

  it("never seats a leg in a hole that is taken", () => {
    const { ctx, deps, doc } = setup();
    const first = placeBatch(ctx(), deps, "core.led-5mm", over("b11"));
    if ("refused" in first) throw new Error(first.refused);
    doc.commit(first.batch, { label: first.label });
    const second = placeBatch(ctx(), deps, "core.led-5mm", over("b12"));
    if ("refused" in second) throw new Error(second.refused);
    const place = second.batch.find((op) => op.k === "view.place");
    const holes = Object.values(place?.k === "view.place" ? (place.placement.legs ?? {}) : {});
    expect(holes).toHaveLength(2);
    expect(holes).not.toContain("b11");
    expect(holes).not.toContain("b12");
  });

  it("refuses a ref the registry does not hold", () => {
    const { ctx, deps } = setup();
    expect(placeBatch(ctx(), deps, "pack.mystery", { x: 0, y: 0 })).toEqual({ refused: "unknown-definition" });
  });

  it("refuses at the component quota", () => {
    const { ctx, deps } = setup();
    const full = ctx();
    const filler = { id: "cmp_x", definition: { ref: "core.resistor", version: "1.0.0" }, refdes: "R1" };
    const crowded = { ...full, doc: { ...full.doc, state: { ...full.doc.state, components: Array.from({ length: 2000 }, () => filler) } } };
    expect(placeBatch(crowded, deps, "core.led-5mm", over("b11"))).toEqual({ refused: "quota" });
  });

  it("undoes in one step and restores the document", () => {
    const { ctx, deps, doc } = setup();
    const start = stateHash(doc.session.state);
    const placed = placeBatch(ctx(), deps, "core.led-5mm", over("b11"));
    if ("refused" in placed) throw new Error(placed.refused);
    expect(doc.commit(placed.batch, { label: placed.label }).ok).toBe(true);
    expect(stateHash(doc.session.state)).not.toBe(start);
    expect(doc.undo()?.ok).toBe(true);
    expect(stateHash(doc.session.state)).toBe(start);
  });

  it("joins the net of a strip that already holds a part", () => {
    const { ctx, deps, doc } = setup();
    const r = placeBatch(ctx(), deps, "core.resistor", over("a5"));
    if ("refused" in r) throw new Error(r.refused);
    doc.commit(r.batch, { label: r.label });
    const led = placeBatch(ctx(), deps, "core.led-5mm", over("b9"));
    if ("refused" in led) throw new Error(led.refused);
    expect(kinds(led.batch)).toContain("net.create");
    expect(doc.commit(led.batch, { label: led.label }).ok).toBe(true);
    const nets = doc.getState().state.nets;
    expect(nets.some((n) => n.connections.length === 2)).toBe(true);
  });

  it("keeps the document valid through 100 placements", () => {
    const { ctx, deps, doc } = setup();
    const rows = "abcdefghij";
    for (let i = 0; i < 100; i++) {
      const hole = `${rows[i % 10]}${1 + 2 * Math.floor(i / 10)}`;
      const placed = placeBatch(ctx(), deps, "core.led-5mm", over(hole));
      if ("refused" in placed) throw new Error(`${i} ${hole}: ${placed.refused}`);
      const done = doc.commit(placed.batch, { label: placed.label });
      if (!done.ok) throw new Error(`${i} ${hole}: ${done.reject}: ${done.message}`);
    }
    expect(doc.getState().state.components.filter((c) => c.refdes.startsWith("D"))).toHaveLength(100);
    expect(checkAll(doc.getState().state).filter((d) => d.severity === "error")).toEqual([]);
  });
});

describe("place tool", () => {
  it("places on a click, puts the part away and selects the new part", () => {
    const { send, doc, tool, session } = setup();
    tool.armPart("core.led-5mm");
    send("move", over("b11"));
    send("down", over("b11"));
    send("up", over("b11"));
    expect(doc.commits).toHaveLength(1);
    expect(doc.commits[0]!.label).toBe("Place D1");
    const s = session.getState();
    expect(s.armedPart).toBeNull();
    expect(s.tool).toBe("select");
    expect(s.selection).toHaveLength(1);
    expect(s.selection[0]!.id).toBe(doc.getState().state.components.find((c) => c.refdes === "D1")!.id);
    expect(s.status).toEqual({ key: "edit.place.placed", params: { refdes: "D1" } });
    expect(s.preview).toEqual([]);
  });

  it("places one part for a rapid double click", () => {
    const { send, doc, tool, session } = setup();
    tool.armPart("core.led-5mm");
    for (let i = 0; i < 2; i++) {
      send("down", over("b11"));
      send("up", over("b11"));
      session.setTool("place");
    }
    expect(doc.commits).toHaveLength(1);
  });

  it("shows a ghost that follows the pointer and turns invalid off the board", () => {
    const { send, session, tool } = setup();
    tool.armPart("core.resistor");
    send("move", over("a5"));
    const valid = session.getState().preview;
    expect(valid).toHaveLength(1);
    expect(valid[0]!.elements.some((e) => e.t === "path")).toBe(false);
    send("move", { x: -200, y: -200 });
    const invalid = session.getState().preview[0]!;
    expect(invalid.elements.some((e) => e.t === "path")).toBe(true);
    expect(invalid.elements.every((e) => e.t !== "circle" || e.stroke === "var(--studio-warn)")).toBe(true);
  });

  it("says so and writes nothing when a drop misses the breadboard", () => {
    const { send, doc, tool, session } = setup();
    tool.armPart("core.led-5mm");
    send("down", { x: -200, y: -200 });
    send("up", { x: -200, y: -200 });
    expect(doc.commits).toHaveLength(0);
    expect(session.getState().status).toEqual({ key: "edit.place.offBoard" });
    expect(session.getState().armedPart).toBe("core.led-5mm");
  });

  it("leaves no ops when Esc ends a drag, and Esc again puts the part away", () => {
    const { send, press, doc, tool, session } = setup();
    tool.armPart("core.led-5mm");
    send("down", over("b11"));
    send("move", over("b12"));
    expect(press("Escape")).toBe(true);
    expect(doc.commits).toHaveLength(0);
    expect(session.getState().preview).toEqual([]);
    expect(session.getState().armedPart).toBe("core.led-5mm");
    press("Escape");
    expect(session.getState().armedPart).toBeNull();
    expect(session.getState().tool).toBe("select");
  });

  it("places at the middle of the view on Enter", () => {
    const { press, centreOn, doc, tool } = setup();
    centreOn(over("c20"));
    tool.armPart("core.led-5mm");
    expect(press("Enter")).toBe(true);
    expect(doc.commits).toHaveLength(1);
    const place = doc.commits[0]!.batch.find((op) => op.k === "view.place");
    expect(place?.k === "view.place" && place.placement.legs).toEqual({ A: "c20", K: "c21" });
  });

  it("does nothing when no part is armed", () => {
    const { send, press, doc } = setup();
    send("down", over("b11"));
    send("up", over("b11"));
    expect(press("Enter")).toBe(false);
    expect(doc.commits).toHaveLength(0);
  });

  it("refuses in a read only project", () => {
    const { send, doc, tool, session } = setup();
    doc.setSaveChip("read-only");
    tool.armPart("core.led-5mm");
    send("up", over("b11"));
    expect(doc.commits).toHaveLength(0);
    expect(session.getState().status).toEqual({ key: "edit.place.readOnly" });
  });

  it("ignores a right button release", () => {
    const { host, ctx, doc, tool } = setup();
    tool.armPart("core.led-5mm");
    host.pointer({ type: "up", xPx: 0, yPx: 0, xMm: over("b11").x, yMm: over("b11").y, button: 2, shift: false, alt: false, ctrl: false, pointerType: "mouse", pointerId: 1 }, ctx());
    expect(doc.commits).toHaveLength(0);
  });
});
