// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import en from "../../i18n/messages/en/studioRun.json" with { type: "json" };
import { builtinRegistry } from "../../parts/builtin.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import { derivePartStates, pinLevels } from "../engine/part-state.ts";
import type { PartVisualState } from "../engine/part-state.ts";
import type { ArtProvider, Overlay, ResolvedPartShape, Scene } from "../engine/types.ts";
import type { PartStateFrame } from "../stores/run.ts";
import { netlist } from "../../project/netlist.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import type { BlinkCircuit } from "../testing/blink-circuit.ts";
import { stateOverlays } from "./state.ts";

const registry = builtinRegistry();
const art: ArtProvider = { get: () => [] };
const labels = en.overlay;

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

let circuit: BlinkCircuit;
let scene: Scene;
let d13: string;

beforeAll(() => {
  circuit = blinkCircuit();
  d13 = netlist(circuit.project).pinNode["brd_uno/D13"]!;
  scene = buildDrawList({
    state: circuit.project,
    viewId: "vw_bb",
    viewport: { cx_mm: 0, cy_mm: 20, k: 6, w: 1400, h: 800, dpr: 1 },
    art,
    resolve,
    index: null,
    prev: null,
    mode: "illustrated",
    overlays: [],
  }).scene;
});

function run(frame: PartStateFrame, reduceMotion = false): Overlay[] {
  return stateOverlays(scene, derivePartStates(circuit.project, frame), pinLevels(circuit.project, frame), { reduceMotion, labels });
}

const texts = (o: Overlay): string[] => o.elements.flatMap((e) => (e.t === "text" ? [e.s] : []));
const frameOf = (level: 0 | 1): PartStateFrame => ({ tNs: 1, pins: { [d13]: level }, parts: [] });

describe("stateOverlays", () => {
  it("glows a lit LED and tags it on, and tags it off when the pin is low", () => {
    const lit = run(frameOf(1)).find((o) => o.id === `state:${circuit.led}`)!;
    expect(texts(lit)).toEqual(["on"]);
    expect(lit.elements.some((e) => e.t === "circle")).toBe(true);
    const dark = run(frameOf(0)).find((o) => o.id === `state:${circuit.led}`)!;
    expect(texts(dark)).toEqual(["off"]);
    expect(dark.elements.some((e) => e.t === "circle")).toBe(false);
  });

  it("tags PWM duty as a percentage", () => {
    const frame: PartStateFrame = { tNs: 1, pins: {}, parts: [{ part: circuit.led, kind: "led", lit: true, brightness: 0.4 }] };
    expect(texts(run(frame).find((o) => o.id === `state:${circuit.led}`)!)).toEqual(["duty 40%"]);
  });

  it("tags a pressed button", () => {
    const frame: PartStateFrame = { tNs: 1, pins: {}, parts: [{ part: circuit.button, kind: "button", pressed: true }] };
    expect(texts(run(frame).find((o) => o.id === `state:${circuit.button}`)!)).toEqual(["pressed"]);
  });

  it("puts the not modelled yet mark on a part with no model", () => {
    const states = new Map<string, PartVisualState>([[circuit.led, { kind: "none", reason: "not-modelled-yet" }]]);
    const [mark] = stateOverlays(scene, states, new Map(), { reduceMotion: false, labels }).filter((o) => o.id.startsWith("state:"));
    expect(texts(mark!)).toEqual(["not modelled yet"]);
    expect(mark!.elements.some((e) => e.t === "rect")).toBe(true);
  });

  it("badges driven pins with their level and skips pins without one", () => {
    const badges = run(frameOf(1)).filter((o) => o.id.startsWith("level:"));
    const ids = badges.map((o) => o.id);
    expect(ids).toEqual([`level:${circuit.r1}/P1`]);
    expect(texts(badges[0]!)).toEqual(["1"]);
  });

  it("gives every item a text tag", () => {
    for (const level of [0, 1] as const) {
      const overlays = run(frameOf(level));
      expect(overlays.length).toBeGreaterThan(0);
      for (const o of overlays) expect(texts(o).length, o.id).toBeGreaterThan(0);
    }
  });

  it("drops the glow halo under reduced motion and keeps the tag", () => {
    const find = (o: Overlay[]) => o.find((x) => x.id === `state:${circuit.led}`)!;
    const calm = find(run(frameOf(1), true));
    const lively = find(run(frameOf(1), false));
    expect(calm.elements.filter((e) => e.t === "circle")).toHaveLength(1);
    expect(lively.elements.filter((e) => e.t === "circle")).toHaveLength(2);
    expect(texts(calm)).toEqual(["on"]);
  });

  it("draws nothing for a part that is not in the scene", () => {
    const states = new Map<string, PartVisualState>([["cmp_gone", { kind: "button", pressed: true }]]);
    expect(stateOverlays(scene, states, new Map(), { reduceMotion: false, labels })).toEqual([]);
  });
});
