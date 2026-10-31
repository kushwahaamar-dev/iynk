import { describe, expect, it } from "vitest";
import { createEncoder, type Edge, type EncoderSpec } from "./encoder.ts";

const spec: EncoderSpec = { countsPerRev: 1000, channels: "ab", index: false, onMotorShaft: false, gearRatio: 1 };
const H_NS = 1e9 / 240;
const TWO_PI = 2 * Math.PI;

function drive(enc: ReturnType<typeof createEncoder>, angleAt: (tS: number) => number, steps: number) {
  const all: Edge[] = [];
  for (let i = 0; i < steps; i++) {
    const t = Math.round(i * H_NS);
    const next = Math.round((i + 1) * H_NS);
    const edges = enc.edgesInStep(angleAt(t / 1e9), angleAt(next / 1e9), t, next - t);
    for (const e of edges) {
      expect(e.atNs).toBeGreaterThan(t);
      expect(e.atNs).toBeLessThanOrEqual(next);
    }
    all.push(...edges);
  }
  return all;
}

describe("encoder", () => {
  it("counts the closed form at constant speed", () => {
    const enc = createEncoder(spec);
    const edges = drive(enc, (t) => 10 * t, 2400);
    expect(edges.length).toBe(Math.floor((1000 * 100) / TWO_PI));
    expect(enc.state().count).toBe(edges.length);
    for (let i = 1; i < edges.length; i++) expect(edges[i]!.atNs).toBeGreaterThanOrEqual(edges[i - 1]!.atNs);
  });

  it("rotates A rise, B rise, A fall, B fall and reverses the order", () => {
    const enc = createEncoder(spec);
    const fwd = enc.edgesInStep(0, (4.5 * TWO_PI) / 1000, 0, 1000);
    expect(fwd.map((e) => `${e.channel}${e.level}`)).toEqual(["a1", "b1", "a0", "b0"]);
    const back = enc.edgesInStep((4.5 * TWO_PI) / 1000, 0, 1000, 1000);
    expect(back.map((e) => `${e.channel}${e.level}`)).toEqual(["b1", "a1", "b0", "a0"]);
    expect(back.map((e) => e.count)).toEqual([3, 2, 1, 0]);
  });

  it("counts an edge on a step boundary once", () => {
    const enc = createEncoder(spec);
    const edge = TWO_PI / 1000;
    const first = enc.edgesInStep(0, edge, 0, 100);
    const second = enc.edgesInStep(edge, 2 * edge, 100, 100);
    expect(first).toHaveLength(1);
    expect(first[0]!.atNs).toBe(100);
    expect(second).toHaveLength(1);
    expect(second[0]!.count).toBe(2);
  });

  it("emits the index once per revolution", () => {
    const enc = createEncoder({ ...spec, index: true });
    const edges = enc.edgesInStep(0, 3.5 * TWO_PI, 0, 1_000_000);
    expect(edges.filter((e) => e.channel === "index")).toHaveLength(3);
  });

  it("times edges within 5 percent of the spacing against an h/16 reference", () => {
    const angle = (t: number) => 40 * t * t;
    const coarse = drive(createEncoder(spec), angle, 240);
    const fineH = H_NS / 16;
    const fine: Edge[] = [];
    const ref = createEncoder(spec);
    for (let i = 0; i < 240 * 16; i++) {
      const t = Math.round(i * fineH);
      const next = Math.round((i + 1) * fineH);
      fine.push(...ref.edgesInStep(angle(t / 1e9), angle(next / 1e9), t, next - t));
    }
    expect(coarse.length).toBe(fine.length);
    for (let i = 0; i < coarse.length; i++) {
      const speedRadPerNs = (80 * coarse[i]!.atNs) / 1e18;
      const errorRad = Math.abs(coarse[i]!.atNs - fine[i]!.atNs) * speedRadPerNs;
      expect(errorRad).toBeLessThan((0.05 * TWO_PI) / 1000);
    }
  });

  it("swaps the channels", () => {
    const enc = createEncoder(spec);
    enc.swapChannels(true);
    const edges = enc.edgesInStep(0, (2.5 * TWO_PI) / 1000, 0, 1000);
    expect(edges.map((e) => `${e.channel}${e.level}`)).toEqual(["b1", "a1"]);
    expect(enc.state()).toMatchObject({ a: 1, b: 1 });
  });

  it("gives the exact count at any time", () => {
    const enc = createEncoder(spec);
    const edges = drive(enc, (t) => 10 * t, 240);
    for (const probe of [0, edges[10]!.atNs - 1, edges[10]!.atNs, edges[100]!.atNs + 1, 1e9]) {
      expect(enc.countAt(probe)).toBe(edges.filter((e) => e.atNs <= probe).length);
    }
  });

  it("rejects bad specs and scales by the gear ratio on the motor shaft", () => {
    expect(() => createEncoder({ ...spec, countsPerRev: 0 })).toThrow(RangeError);
    expect(() => createEncoder({ ...spec, countsPerRev: 1.5 })).toThrow(RangeError);
    const geared = createEncoder({ ...spec, onMotorShaft: true, gearRatio: 48 });
    expect(geared.edgesInStep(0, (1.01 * TWO_PI) / 48 / 1000, 0, 10)).toHaveLength(1);
  });
});
