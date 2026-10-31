// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newId } from "../../core/ids.ts";
import type { RandomSource } from "../../core/ids.ts";
import type { Op, Project } from "../../project/generated/types.ts";
import { stateHash } from "../../project/hash.ts";
import { netlist } from "../../project/netlist.ts";
import { checkAll } from "../../project/semantic.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { canConnect, wireRecipe } from "../rules/connect.ts";
import type { WireEndRef } from "../rules/connect.ts";
import type { Selectable } from "../stores/session.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import type { IdSource } from "../views/breadboard.ts";
import { copySelection, createClipboard, MAX_CLIPBOARD_BYTES, parseClipboard, pasteBatch, pasteOffsetMm } from "./clipboard.ts";
import type { ClipboardPayload } from "./clipboard.ts";

const VIEW = "vw_bb";
let seed = 0x9e3779b9;
/** A long-period source: the circuit helpers' own seeded one repeats within a few dozen ids. */
const random: RandomSource = {
  bytes: (n) =>
    Uint8Array.from({ length: n }, () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (t ^ (t >>> 14)) & 0xff;
    }),
};
const ids: IdSource = (prefix) => newId(prefix, random);
const part = (id: string): Selectable => ({ kind: "part", view: VIEW, id });
const pin = (c: string, p: string): WireEndRef => ({ kind: "pin", c, p });

function circuitWithPinWires() {
  const circuit = blinkCircuit();
  const doc = createRecordingDoc(createSession({ state: circuit.project, clock: steppingClock(), rnd: seededRandom() }));
  const wires: [WireEndRef, WireEndRef][] = [
    [pin(circuit.r1, "P2"), pin(circuit.led, "A")],
    [pin(circuit.led, "K"), pin(circuit.button, "P1")],
    [pin(circuit.r1, "P1"), pin("brd_uno", "D8")],
  ];
  for (const [a, b] of wires) {
    const state = doc.getState().state;
    expect(canConnect(state, VIEW, a, b)).toEqual({ ok: true });
    const recipe = wireRecipe(state, VIEW, a, b, ids);
    expect(doc.commit(recipe.batch, { label: recipe.label })).toMatchObject({ ok: true });
  }
  return { circuit, doc };
}

const view = (state: Project) => state.views.find((v) => v.id === VIEW)!;

describe("copy and paste", () => {
  it("pastes three parts with their two internal wires and nets, leaves the outside wire, and one undo removes it all (STU-12)", () => {
    const { circuit, doc } = circuitWithPinWires();
    const before = doc.getState().state;
    const hash = stateHash(before);
    const sel = [circuit.r1, circuit.led, circuit.button].map(part);
    const payload = copySelection(before, view(before), sel);
    expect(payload.components).toHaveLength(3);
    expect(payload.wires).toHaveLength(2);
    expect(payload.nets).toHaveLength(2);
    expect(payload.placements.every((p) => p.legs === undefined)).toBe(true);

    const pasted = pasteBatch(before, view(before), payload, { x: payload.bbox.x0 + 2, y: payload.bbox.y0 + 2 }, ids);
    expect(doc.commit(pasted.batch, { label: pasted.label })).toMatchObject({ ok: true });
    const after = doc.getState().state;
    const fresh = after.components.filter((c) => !before.components.some((o) => o.id === c.id));
    expect(fresh).toHaveLength(3);
    expect(fresh.map((c) => c.refdes).sort()).toEqual(["D2", "R2", "SW2"]);
    const freshIds = new Set(fresh.map((c) => c.id));
    expect([...freshIds].some((id) => sel.some((s) => s.id === id))).toBe(false);

    const newWires = view(after).wires.filter((w) => !view(before).wires.some((o) => o.id === w.id));
    expect(newWires).toHaveLength(2);
    for (const w of newWires) {
      expect(w.from.kind === "pin" && freshIds.has(w.from.c)).toBe(true);
      expect(w.to.kind === "pin" && freshIds.has(w.to.c)).toBe(true);
    }
    expect(view(after).wires.some((w) => [w.from, w.to].some((e) => e.kind === "pin" && freshIds.has(e.c) && [w.from, w.to].some((o) => o.kind === "pin" && o.c === "brd_uno")))).toBe(false);
    const nodes = netlist(after).nodes.filter((n) => n.pins.some((p) => freshIds.has(p.c)));
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(checkAll(after).filter((d) => d.severity === "error")).toEqual([]);
    expect(pasted.selection).toHaveLength(5);

    expect(doc.undo()).toMatchObject({ ok: true });
    expect(stateHash(doc.getState().state)).toBe(hash);
  });

  it("makes one net for each bunch of copied wires that touch, with only the pins those wires end on", () => {
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    const payload = copySelection(state, view(state), [circuit.r1, circuit.led, circuit.button].map(part));
    const pinsOf = payload.nets.map((n) => n.connections.map((c) => `${c.c}/${c.p}`).sort().join(" ")).sort();
    expect(pinsOf).toEqual([[`${circuit.led}/A`, `${circuit.r1}/P2`].sort().join(" "), [`${circuit.button}/P1`, `${circuit.led}/K`].sort().join(" ")].sort());
    expect(new Set(payload.wires.map((w) => w.net))).toEqual(new Set(payload.nets.map((n) => n.id)));
  });

  it("adds the dependency first when the project does not pin the part, and places the part where asked", () => {
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    const payload = copySelection(state, view(state), [part(circuit.led)]);
    const fresh: Project = { ...state, dependencies: { ...state.dependencies, components: state.dependencies.components.filter((d) => d.ref !== "core.led-5mm") } };
    const target = { ...fresh, components: fresh.components.filter((c) => c.id !== circuit.led) };
    const { batch } = pasteBatch(target, view(target), payload, { x: 40, y: 50 }, ids);
    expect(batch[0]).toMatchObject({ k: "dep.set", dependency: { ref: "core.led-5mm" } });
    const place = batch.find((op): op is Extract<Op, { k: "view.place" }> => op.k === "view.place")!;
    expect(place.placement).toMatchObject({ x_mm: 40, y_mm: 50 });
    expect(batch.map((op) => op.k)).toEqual(["dep.set", "component.add", "view.place"]);
  });

  it("pastes 200 parts in one batch", () => {
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    const one = copySelection(state, view(state), [part(circuit.r1)]);
    const payload: ClipboardPayload = {
      ...one,
      components: Array.from({ length: 200 }, (_, i) => ({ ...one.components[0]!, id: `cmp_many${i}`, refdes: `R${i + 10}` })),
      placements: Array.from({ length: 200 }, (_, i) => ({ c: `cmp_many${i}`, x_mm: (i % 20) * 10, y_mm: Math.floor(i / 20) * 10 })),
      nets: [],
      wires: [],
      bbox: { x0: 0, y0: 0, x1: 190, y1: 90 },
    };
    const pasted = pasteBatch(state, view(state), payload, { x: 0, y: 200 }, ids);
    expect(pasted.batch).toHaveLength(400);
    expect(doc.commits).toHaveLength(3);
    expect(doc.commit(pasted.batch, { label: pasted.label })).toMatchObject({ ok: true });
    expect(doc.commits).toHaveLength(4);
    expect(doc.getState().state.components).toHaveLength(state.components.length + 200);
    expect(new Set(doc.getState().state.components.map((c) => c.refdes)).size).toBe(doc.getState().state.components.length);
  });

  it("never copies a board or a part that is not on the view", () => {
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    const payload = copySelection(state, view(state), [part("brd_uno"), part("cmp_gone"), { kind: "wire", view: VIEW, id: circuit.wires[0]! }]);
    expect(payload.components).toEqual([]);
  });

  it("offsets repeated pastes by two grid steps each", () => {
    expect(pasteOffsetMm(1, 2.54)).toBeCloseTo(5.08);
    expect(pasteOffsetMm(3, 1)).toBe(6);
    const clip = createClipboard();
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    clip.copy(copySelection(state, view(state), [part(circuit.r1)]));
    expect([clip.claim(), clip.claim()]).toEqual([1, 2]);
    clip.copy(copySelection(state, view(state), [part(circuit.led)]));
    expect(clip.claim()).toBe(1);
  });
});

describe("clipboard text", () => {
  function payload(): ClipboardPayload {
    const { circuit, doc } = circuitWithPinWires();
    const state = doc.getState().state;
    return copySelection(state, view(state), [circuit.r1, circuit.led, circuit.button].map(part));
  }

  it("round trips through JSON with the marker", () => {
    const p = payload();
    const text = JSON.stringify({ iynk: "clip", ...p });
    expect(parseClipboard(text)).toEqual(p);
    const clip = createClipboard();
    expect(clip.ingest(text)).toBe(true);
    expect(clip.payload()).toEqual(p);
    expect(clip.claim()).toBe(1);
  });

  it.each([
    ["not JSON", "{nope"],
    ["an array", "[]"],
    ["a string", '"clip"'],
    ["null", "null"],
    ["no marker", JSON.stringify({ v: 1 })],
    ["another version", JSON.stringify({ iynk: "clip", v: 2 })],
  ])("refuses %s", (_name, text) => {
    expect(parseClipboard(text)).toBeNull();
    expect(createClipboard().ingest(text)).toBe(false);
  });

  it("refuses a payload that is too big, wrongly typed or points at nothing, without throwing", () => {
    const p = payload();
    const wrap = (changes: Record<string, unknown>) => JSON.stringify({ iynk: "clip", ...p, ...changes });
    const hostile: [string, string][] = [
      ["huge text", " ".repeat(MAX_CLIPBOARD_BYTES + 1)],
      ["too many components", wrap({ components: Array.from({ length: 2001 }, () => p.components[0]) })],
      ["components not a list", wrap({ components: { length: 3 } })],
      ["a component of the wrong type", wrap({ components: [42] })],
      ["a bad definition ref", wrap({ components: [{ ...p.components[0], definition: { ref: "../../etc", version: "1.0.0" } }] })],
      ["a bad refdes", wrap({ components: [{ ...p.components[0], refdes: "R 1" }] })],
      ["params with an object", wrap({ components: [{ ...p.components[0], params: { ohms: { evil: true } } }] })],
      ["a position that is text", wrap({ placements: [{ ...p.placements[0], x_mm: "3" }] })],
      ["a position out of range", wrap({ placements: [{ ...p.placements[0], y_mm: 1e12 }] })],
      ["a placement for nothing", wrap({ placements: [...p.placements, { c: "cmp_ghost", x_mm: 0, y_mm: 0 }] })],
      ["a part with no placement", wrap({ placements: p.placements.slice(1) })],
      ["a wire on an unknown net", wrap({ wires: p.wires.map((w) => ({ ...w, net: "nope" })) })],
      ["a wire to a hole", wrap({ wires: p.wires.map((w) => ({ ...w, to: { kind: "hole", surface: "cmp_x", hole: "a1" } })) })],
      ["a wire to a part that is not copied", wrap({ wires: p.wires.map((w) => ({ ...w, to: { kind: "pin", c: "brd_uno", p: "D8" } })) })],
      ["a bad wire colour", wrap({ wires: p.wires.map((w) => ({ ...w, color: "plaid" })) })],
      ["a net with no pins", wrap({ nets: [{ id: "n1", connections: [] }] })],
      ["a pin id with a slash", wrap({ nets: [{ id: "n1", connections: [{ c: p.components[0]!.id, p: "a/b" }] }] })],
      ["a dependency that is not one", wrap({ deps: [{ ref: "core.x" }] })],
      ["a bbox of text", wrap({ bbox: { x0: "a", y0: 0, x1: 1, y1: 1 } })],
      ["a repeated component id", wrap({ components: [p.components[0], p.components[0]] })],
    ];
    for (const [name, text] of hostile) {
      expect(() => parseClipboard(text), name).not.toThrow();
      expect(parseClipboard(text), name).toBeNull();
    }
  });

  it("keeps only the fields it knows from a component", () => {
    const p = payload();
    const text = JSON.stringify({ iynk: "clip", ...p, components: p.components.map((c) => ({ ...c, ext: { x: 1 }, __proto__: { polluted: true } })) });
    const parsed = parseClipboard(text)!;
    expect(parsed.components.every((c) => !("ext" in c))).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("pins the interface of every dependency it carries", () => {
    const p = payload();
    expect(p.deps.map((d) => d.ref).sort()).toEqual(["core.led-5mm", "core.push-button-6mm", "core.resistor"]);
    expect(p.deps.find((d) => d.ref === "core.led-5mm")!.interface).toEqual(interfaceOf(registry.latest("core.led-5mm")!));
  });
});
