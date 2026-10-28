// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newId } from "../../core/ids.ts";
import type { RandomSource } from "../../core/ids.ts";
import type { Op, PinRef, Project } from "../../project/generated/types.ts";
import { stateHash } from "../../project/hash.ts";
import { netlist } from "../../project/netlist.ts";
import { checkAll } from "../../project/semantic.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import { stubArt } from "../engine/testing/mini-scene.ts";
import type { Hit, ResolvedPartShape, Viewport } from "../engine/types.ts";
import { cutAnalysis, wireRecipe } from "../rules/connect.ts";
import type { WireEndRef } from "../rules/connect.ts";
import { createSessionStore } from "../stores/session.ts";
import type { Selectable } from "../stores/session.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import type { IdSource } from "../views/breadboard.ts";
import { createToolHost } from "./host.ts";
import { deleteBatch, selectInRect } from "./select.ts";
import { createSelectTool } from "./select.ts";
import type { ToolCtx, ToolKeyEvent, ToolPointerEvent } from "./types.ts";

const VIEW = "vw_bb";
const viewport: Viewport = { cx_mm: 0, cy_mm: 0, k: 8, w: 800, h: 600, dpr: 1 };
let counter = 99;
/** Ids the circuit's own seeded source never makes, or a paste would meet its own breadboard. */
const idRandom: RandomSource = { bytes: (n) => Uint8Array.from({ length: n }, () => (counter = (counter * 37 + 11) % 253)) };
const ids: IdSource = (prefix) => newId(prefix, idRandom);
const part = (id: string): Selectable => ({ kind: "part", view: VIEW, id });
const wire = (id: string): Selectable => ({ kind: "wire", view: VIEW, id });
const kinds = (batch: Op[]) => batch.map((op) => op.k);

function resolveShape(defRef: string): ResolvedPartShape {
  const d = registry.latest(defRef)!;
  const h = d.dimensions?.body?.h ?? 1;
  return {
    widthMm: d.dimensions?.body?.w ?? 1,
    heightMm: h,
    known: true,
    pins: d.pins.map((p) => ({ id: p.id, xMm: p.position?.x ?? 0, yMm: h - (p.position?.y ?? 0), mechanical: p.type === "mechanical" })),
  };
}

function setup(project?: Project) {
  const circuit = blinkCircuit();
  const doc = createRecordingDoc(createSession({ state: project ?? circuit.project, clock: steppingClock(), rnd: seededRandom() }));
  const session = createSessionStore(VIEW);
  const host = createToolHost({ doc, session });
  const focus: (string | null)[] = [];
  const tool = createSelectTool({
    setSelection: session.setSelection,
    setFocusNet: (net) => {
      focus.push(net);
      session.setFocusNet(net);
    },
    setStatus: session.setStatus,
    ids,
  });
  host.register(tool);

  const spots = new Map<number, Hit | null>();
  const ctx = (): ToolCtx => {
    const state = doc.getState();
    const scene = buildDrawList({ state: state.state, viewId: VIEW, viewport, art: stubArt, resolve: resolveShape, index: null, prev: null, mode: "illustrated", overlays: [] }).scene;
    return {
      doc: state,
      view: state.state.views.find((v) => v.id === VIEW)!,
      viewport,
      scene,
      selection: session.getState().selection,
      snapMm: 1,
      hit: (ev) => spots.get(ev.xPx) ?? null,
      resolve: resolveShape,
    };
  };
  const event = (type: ToolPointerEvent["type"], xPx: number, extra: Partial<ToolPointerEvent> = {}): ToolPointerEvent => ({
    type, xPx, yPx: 0, xMm: xPx, yMm: 0, button: 0, shift: false, alt: false, ctrl: false, pointerType: "mouse", pointerId: 1, ...extra,
  });
  const send = (type: ToolPointerEvent["type"], xPx: number, extra: Partial<ToolPointerEvent> = {}) => host.pointer(event(type, xPx, extra), ctx());
  const key = (k: string, extra: Partial<ToolKeyEvent> = {}) => host.key({ key: k, shift: false, alt: false, ctrl: false, ...extra }, ctx());
  const selected = () => session.getState().selection;
  return { circuit, doc, session, host, tool, spots, ctx, send, key, selected, focus };
}

describe("select tool: clicking", () => {
  it("selects the part under a click, adds with Shift and removes with Shift again", () => {
    const { circuit, spots, send, selected } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    spots.set(2, { kind: "part", c: circuit.led });
    send("down", 1);
    send("up", 1);
    expect(selected()).toEqual([part(circuit.r1)]);
    send("down", 2, { shift: true });
    send("up", 2, { shift: true });
    expect(selected()).toEqual([part(circuit.r1), part(circuit.led)]);
    send("down", 2, { ctrl: true });
    send("up", 2, { ctrl: true });
    expect(selected()).toEqual([part(circuit.r1)]);
  });

  it("selects the part that owns a pin, and clears on a click in empty canvas", () => {
    const { circuit, spots, send, selected } = setup();
    spots.set(1, { kind: "pin", c: circuit.r1, p: "P1" });
    send("down", 1);
    send("up", 1);
    expect(selected()).toEqual([part(circuit.r1)]);
    send("down", 50);
    send("up", 50);
    expect(selected()).toEqual([]);
  });

  it("collapses a multi-selection to the part that was clicked without a drag", () => {
    const { circuit, spots, send, selected, session } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    session.setSelection([part(circuit.r1), part(circuit.led)]);
    send("down", 1);
    send("up", 1);
    expect(selected()).toEqual([part(circuit.r1)]);
  });

  it("selects a wire, and Alt on a pin or a wire sets the focus net and writes nothing", () => {
    const { circuit, doc, spots, send, selected, focus } = setup();
    const w = circuit.wires[0]!;
    spots.set(1, { kind: "wire", id: w, segment: 0 });
    spots.set(2, { kind: "pin", c: "brd_uno", p: "D13" });
    send("down", 1);
    send("up", 1);
    expect(selected()).toEqual([wire(w)]);
    const net = circuit.project.views[0]!.wires.find((x) => x.id === w)!.net;
    send("down", 1, { alt: true });
    send("down", 2, { alt: true });
    expect(focus).toEqual([net, circuit.project.nets.find((n) => n.connections.some((p) => p.c === "brd_uno" && p.p === "D13"))!.id]);
    expect(doc.commits).toHaveLength(0);
  });
});

describe("select tool: moving", () => {
  it("moves a part with one view.place on release, snapped, and leaves every net alone (STU-11)", () => {
    const { circuit, doc, spots, send, tool, session } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    const before = doc.getState().state;
    const at = before.views[0]!.placements.find((p) => p.c === circuit.r1)!;
    send("down", 1, { xMm: 0 });
    send("move", 10, { xMm: 10.4, yMm: 3.6 });
    expect(tool.state()).toBe("dragging");
    expect(session.getState().preview).toHaveLength(1);
    expect(doc.commits).toHaveLength(0);
    send("up", 10, { xMm: 10.4, yMm: 3.6 });
    expect(doc.commits).toHaveLength(1);
    expect(kinds(doc.commits[0]!.batch)).toEqual(["view.place"]);
    const after = doc.getState().state;
    const moved = after.views[0]!.placements.find((p) => p.c === circuit.r1)!;
    expect(moved).toMatchObject({ legs: at.legs });
    expect(moved.x_mm).toBeCloseTo(at.x_mm + 10, 5);
    expect(moved.y_mm).toBeCloseTo(at.y_mm + 4, 5);
    expect(after.nets).toEqual(before.nets);
    expect(session.getState().preview).toEqual([]);
  });

  it("moves every selected part in one batch of view.place ops only", () => {
    const { circuit, doc, spots, send, session } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    session.setSelection([part(circuit.r1), part(circuit.led), part(circuit.button)]);
    send("down", 1);
    send("move", 21, { xMm: 21 });
    send("up", 21, { xMm: 21 });
    expect(doc.commits).toHaveLength(1);
    expect(kinds(doc.commits[0]!.batch)).toEqual(["view.place", "view.place", "view.place"]);
    expect(doc.commits[0]!.label).toBe("Move 3 parts");
  });

  it("writes nothing for a drag that ends where it began, and for a drag Escape cancelled", () => {
    const { circuit, doc, host, spots, send, ctx } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    send("down", 1, { xMm: 0 });
    send("move", 10, { xMm: 0.2 });
    send("up", 10, { xMm: 0.2 });
    send("down", 1, { xMm: 0 });
    send("move", 30, { xMm: 30 });
    expect(host.key({ key: "Escape", shift: false, alt: false, ctrl: false }, ctx())).toBe(true);
    expect(doc.commits).toHaveLength(0);
    expect(host.preview()).toEqual([]);
  });

  it("does not move a part that was not selected when a finger touched it, but does once it is", () => {
    const { circuit, doc, spots, send, tool, selected } = setup();
    spots.set(1, { kind: "part", c: circuit.r1 });
    send("down", 1, { pointerType: "touch" });
    send("move", 30, { pointerType: "touch", xMm: 30 });
    expect(tool.state()).toBe("pressed");
    send("up", 30, { pointerType: "touch", xMm: 30 });
    expect(doc.commits).toHaveLength(0);
    expect(selected()).toEqual([]);

    send("down", 1, { pointerType: "touch" });
    send("up", 1, { pointerType: "touch" });
    expect(selected()).toEqual([part(circuit.r1)]);
    send("down", 1, { pointerType: "touch" });
    send("move", 30, { pointerType: "touch", xMm: 30 });
    expect(tool.state()).toBe("dragging");
    send("up", 30, { pointerType: "touch", xMm: 30 });
    expect(doc.commits).toHaveLength(1);
  });

  it("refuses a move on a read-only document", () => {
    const { circuit, doc, spots, send, tool } = setup();
    doc.setSaveChip("read-only");
    spots.set(1, { kind: "part", c: circuit.r1 });
    send("down", 1);
    send("move", 30, { xMm: 30 });
    send("up", 30, { xMm: 30 });
    expect(tool.state()).toBe("idle");
    expect(doc.commits).toHaveLength(0);
  });
});

describe("select tool: marquee", () => {
  it("takes what the rectangle holds when dragged to the right and what it touches when dragged to the left", () => {
    const { circuit, send, ctx, selected, tool, session } = setup();
    const scene = ctx().scene;
    const box = scene.targets.find((t) => t.hit.kind === "part" && t.hit.c === circuit.r1)!.bbox;
    const pad = 0.5;
    send("down", 1, { xMm: box.x0 - pad, yMm: box.y0 - pad, yPx: 1 });
    send("move", 20, { xMm: box.x1 + pad, yMm: box.y1 + pad, yPx: 40 });
    expect(tool.state()).toBe("marquee");
    expect(session.getState().preview).toHaveLength(1);
    send("up", 20, { xMm: box.x1 + pad, yMm: box.y1 + pad, yPx: 40 });
    expect(selected()).toContainEqual(part(circuit.r1));
    expect(selected().every((s) => s.id !== circuit.breadboard)).toBe(true);

    send("down", 1, { xMm: box.x0 + 0.5, yMm: box.y0 + 0.5, yPx: 1 });
    send("move", 20, { xMm: box.x0 + 0.1, yMm: box.y0 + 0.1, yPx: 40 });
    send("up", 20, { xMm: box.x0 + 0.1, yMm: box.y0 + 0.1, yPx: 40 });
    expect(selected()).toContainEqual(part(circuit.r1));
  });

  it("selectInRect keeps the surface out and joins the segments of a wire", () => {
    const { circuit, ctx } = setup();
    const { scene, view } = ctx();
    const everything = { x0: -1e4, y0: -1e4, x1: 1e4, y1: 1e4 };
    const found = selectInRect(scene, everything, "inside", view);
    expect(found.some((s) => s.id === circuit.breadboard)).toBe(false);
    const drawn = new Set(scene.targets.flatMap((t) => (t.hit.kind === "wire" ? [t.hit.id] : [])));
    expect(drawn.size).toBeGreaterThan(0);
    expect(found.filter((s) => s.kind === "wire").map((s) => s.id).sort()).toEqual([...drawn].sort());
    const shown = new Set(scene.targets.flatMap((t) => (t.hit.kind === "part" && t.hit.c !== circuit.breadboard ? [t.hit.c] : [])));
    expect(shown.size).toBeGreaterThanOrEqual(3);
    expect(found.filter((s) => s.kind === "part").map((s) => s.id).sort()).toEqual([...shown].sort());
  });
});

describe("deleteBatch", () => {
  it("deletes a part in one op and one undo restores part, wires and nets with the same state hash (STU-04, R-057)", () => {
    const { circuit, doc } = setup();
    const before = doc.getState().state;
    const hashBefore = stateHash(before);
    const result = deleteBatch(before, [part(circuit.led)], "cut-connection");
    expect(result).toEqual({ batch: [{ k: "component.remove", id: circuit.led }], label: "Delete D1" });
    expect(doc.commit((result as { batch: Op[] }).batch, { label: "x" })).toMatchObject({ ok: true });
    expect(doc.getState().state.components.some((c) => c.id === circuit.led)).toBe(false);
    expect(doc.undo()).toMatchObject({ ok: true });
    expect(stateHash(doc.getState().state)).toBe(hashBefore);
  });

  it("cuts a net in two when the wire was the only link, and a second Shift+Delete only removes the drawing (STU-09)", () => {
    const { circuit, doc } = setup();
    const start = doc.getState().state;
    const cutting = circuit.wires.filter((w) => cutAnalysis(start, VIEW, w).splits);
    expect(cutting.length).toBeGreaterThan(0);
    for (const w of cutting) {
      const cut = deleteBatch(start, [wire(w)], "cut-connection") as { batch: Op[] };
      expect(cut.batch[0]).toEqual({ k: "wire.remove", view: VIEW, id: w });
      expect(cut.batch.length).toBeGreaterThan(1);
      expect(cut.batch.slice(1).every((op) => op.k === "net.split" || op.k === "net.disconnect")).toBe(true);

      const drawn = deleteBatch(start, [wire(w)], "drawing-only") as { batch: Op[] };
      expect(drawn.batch).toEqual([{ k: "wire.remove", view: VIEW, id: w }]);
    }

    for (const w of cutting) {
      const cutDoc = createRecordingDoc(createSession({ state: start, clock: steppingClock(), rnd: seededRandom() }));
      const cut = deleteBatch(start, [wire(w)], "cut-connection") as { batch: Op[]; label: string };
      expect(cutDoc.commit(cut.batch, { label: cut.label })).toMatchObject({ ok: true });
      const { pinNode } = netlist(cutDoc.getState().state);
      const [keep, ...apart] = cutAnalysis(start, VIEW, w).groups;
      const nodeOf = (pin: PinRef) => pinNode[`${pin.c}\u0000${pin.p}`];
      expect(new Set(keep!.map(nodeOf)).size).toBe(1);
      for (const group of apart) for (const pin of group) expect(nodeOf(pin) === undefined || nodeOf(pin) !== nodeOf(keep![0]!)).toBe(true);
    }

    const w = cutting[0]!;
    const airDoc = createRecordingDoc(createSession({ state: start, clock: steppingClock(), rnd: seededRandom() }));
    const air = deleteBatch(start, [wire(w)], "drawing-only") as { batch: Op[]; label: string };
    expect(airDoc.commit(air.batch, { label: air.label })).toMatchObject({ ok: true });
    expect(airDoc.getState().state.nets).toEqual(start.nets);
    expect(airDoc.getState().state.views[0]!.wires.some((x) => x.id === w)).toBe(false);
  });

  it("leaves a wire to the cascade when its part is going too", () => {
    const { circuit, doc } = setup();
    const state = doc.getState().state;
    const onUno = state.views[0]!.wires.find((w) => w.from.kind === "pin" && w.from.c === circuit.uno)!;
    const result = deleteBatch(state, [wire(onUno.id), part(circuit.uno)], "cut-connection");
    expect("batch" in result && result.batch.some((op) => op.k === "wire.remove")).toBe(false);
  });

  it("refuses to delete the only board and a delete on a read-only document", () => {
    const { circuit, doc } = setup();
    const state = doc.getState().state;
    expect(deleteBatch(state, [part(circuit.uno)], "cut-connection")).toEqual({ refused: "last-board" });
    expect(deleteBatch(state, [part(circuit.led)], "cut-connection", true)).toEqual({ refused: "read-only" });
  });

  it("drops a selected id that is gone without a word", () => {
    const { doc } = setup();
    expect(deleteBatch(doc.getState().state, [part("cmp_gone")], "cut-connection")).toEqual({ batch: [], label: "Delete 0 items" });
  });
});

describe("select tool: keys", () => {
  it("Delete removes the selection as one commit and clears it; Shift+Delete on a wire keeps the nets", () => {
    const { circuit, doc, key, session, selected } = setup();
    session.setSelection([part(circuit.led)]);
    expect(key("Delete")).toBe(true);
    expect(doc.commits).toHaveLength(1);
    expect(kinds(doc.commits[0]!.batch)).toEqual(["component.remove"]);
    expect(selected()).toEqual([]);

    const nets = doc.getState().state.nets;
    session.setSelection([wire(circuit.wires[4]!)]);
    key("Delete", { shift: true });
    expect(doc.getState().state.nets).toEqual(nets);
  });

  it("says why the only board stays", () => {
    const { circuit, doc, key, session } = setup();
    session.setSelection([part(circuit.uno)]);
    key("Delete");
    expect(doc.commits).toHaveLength(0);
    expect(session.getState().status).toEqual({ key: "select.refuse.last-board" });
  });

  it("Ctrl+A selects the parts and wires but not the breadboard; Escape clears", () => {
    const { circuit, key, selected } = setup();
    key("a", { ctrl: true });
    expect(selected().some((s) => s.id === circuit.breadboard)).toBe(false);
    expect(selected()).toHaveLength(4 + circuit.wires.length);
    key("Escape");
    expect(selected()).toEqual([]);
  });

  it("copies, pastes, duplicates and cuts", () => {
    const { circuit, doc, key, session, selected } = setup();
    session.setSelection([part(circuit.r1)]);
    key("c", { ctrl: true });
    expect(session.getState().status).toEqual({ key: "select.copied", params: { count: 1 } });
    const at = (id: string) => doc.getState().state.views[0]!.placements.find((p) => p.c === id)!;
    key("v", { ctrl: true });
    const parts = doc.getState().state.components.length;
    expect(selected()).toHaveLength(1);
    const first = at(selected()[0]!.id);
    key("v", { ctrl: true });
    const second = at(selected()[0]!.id);
    expect(second.x_mm - first.x_mm).toBeCloseTo(2);
    expect(second.y_mm - first.y_mm).toBeCloseTo(2);
    expect(second.legs).toBeUndefined();

    session.setSelection([part(circuit.led)]);
    key("d", { ctrl: true });
    expect(doc.getState().state.components).toHaveLength(parts + 2);
    session.setSelection([part(circuit.button)]);
    key("x", { ctrl: true });
    expect(doc.getState().state.components.some((c) => c.id === circuit.button)).toBe(false);
    key("v", { ctrl: true });
    expect(doc.getState().state.components.some((c) => c.definition.ref === "core.push-button-6mm")).toBe(true);
  });

  it("says so when there is nothing to copy or paste", () => {
    const { key, session } = setup();
    key("c", { ctrl: true });
    expect(session.getState().status).toEqual({ key: "select.copy.nothing" });
    key("v", { ctrl: true });
    expect(session.getState().status).toEqual({ key: "select.paste.nothing" });
  });

  it("refuses cut, paste and delete on a read-only document", () => {
    const { circuit, doc, key, session } = setup();
    session.setSelection([part(circuit.r1)]);
    key("c", { ctrl: true });
    doc.setSaveChip("read-only");
    key("v", { ctrl: true });
    key("x", { ctrl: true });
    key("Delete");
    expect(session.getState().status).toEqual({ key: "select.refuse.read-only" });
    expect(doc.commits).toHaveLength(0);
  });
});

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The partition of the netlist's pins by an independent union-find over wires, legs, strips and shorts inside parts. */
function oracle(state: Project): string[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const up = parent.get(k) ?? k;
    if (up === k) return k;
    const root = find(up);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => void parent.set(find(a), find(b));
  const view = state.views.find((v) => v.id === VIEW)!;
  const bb = state.dependencies.components.find((d) => d.interface.role === "surface")!.interface;
  const stripOf = new Map(bb.groups!.flatMap((g) => g.pins.map((p) => [p, `strip:${g.id}`] as const)));
  const end = (e: Project["views"][number]["wires"][number]["from"]) => (e.kind === "pin" ? `${e.c}/${e.p}` : e.kind === "hole" ? stripOf.get(e.hole)! : e.id);
  for (const w of view.wires) union(end(w.from), end(w.to));
  for (const pl of view.placements) for (const [leg, h] of Object.entries(pl.legs ?? {})) union(`${pl.c}/${leg}`, stripOf.get(h!)!);
  for (const inst of [...state.boards, ...state.components]) {
    const iface = state.dependencies.components.find((d) => d.ref === inst.definition.ref && d.version === inst.definition.version)!.interface;
    for (const g of iface.groups ?? []) if (g.kind !== "strip") for (const p of g.pins) union(`${inst.id}/${g.pins[0]}`, `${inst.id}/${p}`);
  }
  const netted = Object.keys(netlist(state).pinNode).map((k) => k.replace("\u0000", "/"));
  const classes = new Map<string, string[]>();
  for (const k of netted) classes.set(find(k), [...(classes.get(find(k)) ?? []), k]);
  return [...classes.values()].map((c) => c.sort().join(",")).sort();
}

describe("random gestures", () => {
  it("keep the document valid and the nets equal to the union-find oracle (STU-10)", () => {
    const random = mulberry(0x5eed0008);
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
    const { circuit, doc, spots, send, key, session, host } = setup();
    const ends = (): WireEndRef[] => {
      const holes = ["a3", "b3", "c4", "d5", "e6", "RAIL_BN2", "RAIL_BP2"].map((hole): WireEndRef => ({ kind: "hole", surface: circuit.breadboard, hole }));
      const pins = ["D2", "D8", "D12", "GND"].map((p): WireEndRef => ({ kind: "pin", c: "brd_uno", p }));
      return [...holes, ...pins];
    };

    const done = { move: 0, cut: 0, delPart: 0, wire: 0, paste: 0, undo: 0 };
    for (let i = 0; i < 200; i++) {
      const state = doc.getState().state;
      const view = state.views.find((v) => v.id === VIEW)!;
      const movable = view.placements.filter((p) => p.c !== circuit.breadboard && p.c !== circuit.uno).map((p) => p.c);
      const roll = random();
      if (roll < 0.25 && movable.length > 0) {
        const c = pick(movable);
        spots.set(1, { kind: "part", c });
        session.setSelection([]);
        send("down", 1);
        send("move", 30, { xMm: Math.round(random() * 40 - 20), yMm: Math.round(random() * 40 - 20), xPx: 30 });
        send("up", 30, { xMm: Math.round(random() * 40 - 20), yMm: 1, xPx: 30 });
        if (doc.getState().state.revision > state.revision) done.move++;
      } else if (roll < 0.45 && view.wires.length > 0) {
        session.setSelection([wire(pick(view.wires).id)]);
        key("Delete");
        if (doc.getState().state.revision > state.revision) done.cut++;
      } else if (roll < 0.52 && movable.length > 2) {
        session.setSelection([part(pick(movable))]);
        key("Delete");
        if (doc.getState().state.revision > state.revision) done.delPart++;
      } else if (roll < 0.8) {
        const a = pick(ends());
        const b = pick(ends());
        const placedPins = (e: WireEndRef) => e.kind === "hole" || view.placements.some((p) => p.c === e.c);
        if (placedPins(a) && placedPins(b) && JSON.stringify(a) !== JSON.stringify(b)) {
          try {
            const recipe = wireRecipe(state, VIEW, a, b, ids);
            if (doc.commit(recipe.batch, { label: recipe.label }).ok) done.wire++;
          } catch {
            // a wire between two ends the rules refuse is not a gesture
          }
        }
      } else if (roll < 0.92 && movable.length > 0) {
        session.setSelection([part(pick(movable)), ...(view.wires.length > 0 ? [wire(pick(view.wires).id)] : [])]);
        key("d", { ctrl: true });
        if (doc.getState().state.revision > state.revision) done.paste++;
      } else if (doc.getState().canUndo) {
        host.cancel();
        doc.undo();
        done.undo++;
      }
      if (process.env.DBG) console.log(i, JSON.stringify(done), doc.commits.at(-1)?.label, doc.commits.at(-1)?.batch.map((o) => o.k).join(','));

      const after = doc.getState().state;
      expect(checkAll(after).filter((d) => d.severity === "error"), `V3 after gesture ${i}`).toEqual([]);
      expect(oracle(after), `nets after gesture ${i}`).toEqual(
        netlist(after)
          .nodes.map((n) => n.pins.map((p: PinRef) => `${p.c}/${p.p}`).sort().join(","))
          .sort(),
      );
    }
    expect(done.move).toBeGreaterThan(10);
    expect(done.cut).toBeGreaterThan(10);
    expect(done.wire).toBeGreaterThan(10);
    expect(done.paste).toBeGreaterThan(3);
  });
});
