import { describe, expect, it } from "vitest";
import type { DroneContent } from "@/content/schema";
import { buildSolids, collide } from "@/lib/flight";
import { flightOf } from "@/lib/flight/registry";
import { pointHit, sweptHit, type SweptSolid, type Vec3 } from "./collide";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const box = (over: Partial<SweptSolid> = {}): SweptSolid => ({ k: "box", x: 0, y: 0, z0: 0, z1: 2, c: 1, s: 0, hw: 1, hd: 0.5, ...over });
const pole = (r = 0.08, over: Partial<SweptSolid> = {}): SweptSolid => ({ k: "cyl", x: 0, y: 0, z0: 0, z1: 3, c: 1, s: 0, r0: r, r1: r, diamond: false, ...over });

describe("sweptHit", () => {
  it("meets a box head on at the exact fraction", () => {
    const hit = sweptHit([box()], [-5, 0, 1], [5, 0, 1], 0.1)!;
    expect(hit.t).toBeCloseTo(3.9 / 10, 9);
    expect(hit.point[0]).toBeCloseTo(-1.1, 9);
    expect(hit.point[2]).toBeCloseTo(1, 9);
  });

  it("hits a box edge by a hair and misses it by 1e-6", () => {
    const edge = 0.5 + 0.1;
    expect(sweptHit([box()], [-5, edge - 1e-9, 1], [5, edge - 1e-9, 1], 0.1)).not.toBeNull();
    expect(sweptHit([box()], [-5, edge + 1e-6, 1], [5, edge + 1e-6, 1], 0.1)).toBeNull();
  });

  it("treats the z faces as closed", () => {
    expect(sweptHit([box()], [-5, 0, -0.1], [5, 0, -0.1], 0.1)).not.toBeNull();
    expect(sweptHit([box()], [-5, 0, -0.1 - 1e-9], [5, 0, -0.1 - 1e-9], 0.1)).toBeNull();
  });

  it("starts inside at t = 0", () => {
    const hit = sweptHit([box()], [0.2, 0.1, 1], [9, 9, 1], 0)!;
    expect(hit.t).toBe(0);
    expect(hit.point).toEqual([0.2, 0.1, 1]);
  });

  it("follows a rotated box", () => {
    const o = box({ c: Math.SQRT1_2, s: Math.SQRT1_2 });
    expect(sweptHit([o], [-5, 5, 1], [5, -5, 1], 0)!.t).toBeGreaterThan(0.4);
    expect(sweptHit([o], [-5, 5, 1], [5, 5, 1], 0)).toBeNull();
  });

  it("equals pointHit for a zero-length segment", () => {
    const rand = rng(1);
    const solids = [box({ x: 1, y: -1, c: Math.cos(0.7), s: Math.sin(0.7) }), pole(0.4, { x: -1 }), pole(0.6, { r1: 0.1, y: 2 }), pole(0.6, { diamond: true, y: -2 })];
    for (let i = 0; i < 1000; i++) {
      const p: Vec3 = [rand() * 8 - 4, rand() * 8 - 4, rand() * 4 - 0.5];
      const m = rand() * 0.3;
      const expected = solids.find((o) => pointHit(o, p[0], p[1], p[2], m)) ?? null;
      expect(sweptHit(solids, p, p, m)?.solid ?? null).toBe(expected);
    }
  });

  it("catches a thin pole at every phase of a 0.2 m step", () => {
    const o = pole(0.08);
    for (let phase = 0; phase < 200; phase++) {
      const x0 = -1 + (phase / 200) * 0.2;
      for (let k = 0; k < 10; k++) {
        const a: Vec3 = [x0 + k * 0.2, 0.09, 1];
        const b: Vec3 = [a[0] + 0.2, 0.09, 1];
        const crosses = a[0] <= 0 && b[0] >= 0;
        const through = crosses || Math.hypot(a[0], 0.09) <= 0.11 || Math.hypot(b[0], 0.09) <= 0.11;
        expect(sweptHit([o], a, b, 0.03) !== null, `phase ${phase} step ${k}`).toBe(through);
      }
    }
  });

  it("misses a pole just outside the disc and hits just inside", () => {
    expect(sweptHit([pole()], [-1, 0.11 + 1e-6, 1], [1, 0.11 + 1e-6, 1], 0.03)).toBeNull();
    expect(sweptHit([pole()], [-1, 0.11 - 1e-6, 1], [1, 0.11 - 1e-6, 1], 0.03)).not.toBeNull();
  });

  it("clips a pole to its height", () => {
    expect(sweptHit([pole()], [-1, 0, 3.2], [1, 0, 3.2], 0.1)).toBeNull();
    expect(sweptHit([pole()], [-0.1, 0, 5], [0.1, 0, 2], 0.1)!.t).toBeGreaterThan(0.5);
  });

  it("finds a cone by sampling", () => {
    const cone = pole(2, { r1: 0.2 });
    expect(sweptHit([cone], [-5, 0, 0.1], [5, 0, 0.1], 0)).not.toBeNull();
    expect(sweptHit([cone], [-5, 3, 0.1], [5, 3, 0.1], 0)).toBeNull();
  });

  it("ignores a pass solid", () => {
    expect(sweptHit([box({ pass: true })], [-5, 0, 1], [5, 0, 1], 0.1)).toBeNull();
  });

  it("returns the earlier of two solids along the segment, and the first listed on a tie", () => {
    const near = box({ x: -3 }), far = box({ x: 3 });
    expect(sweptHit([far, near], [-9, 0, 1], [9, 0, 1], 0)!.solid).toBe(near);
    const twin = box();
    expect(sweptHit([box(), twin], [-9, 0, 1], [9, 0, 1], 0)!.solid).not.toBe(twin);
  });

  it("never throws on bad input", () => {
    expect(sweptHit([box()], [NaN, 0, 1], [1, 0, 1], 0)).toBeNull();
    expect(sweptHit([box()], [0, 0, 1], [1, Infinity, 1], 0)).toBeNull();
    expect(sweptHit([box()], [0, 0, 1], [1, 0, 1], NaN)).toBeNull();
  });

  it("never lets through what the point test catches at either end", () => {
    const rand = rng(7);
    const solids: SweptSolid[] = [];
    for (let i = 0; i < 12; i++) {
      const yaw = rand() * 6.28;
      const base = { x: rand() * 20 - 10, y: rand() * 20 - 10, z0: 0, z1: 1 + rand() * 3, c: Math.cos(yaw), s: Math.sin(yaw) };
      const kind = i % 4;
      if (kind === 0) solids.push({ ...base, k: "box", hw: 0.2 + rand(), hd: 0.1 + rand() });
      else if (kind === 1) solids.push({ ...base, k: "cyl", r0: 0.1 + rand() * 0.5, r1: 0.1 + rand() * 0.5, diamond: false });
      else if (kind === 2) solids.push({ ...base, k: "cyl", r0: 0.3, r1: 0.3, diamond: false });
      else solids.push({ ...base, k: "cyl", r0: 1, r1: 0.2, diamond: true });
    }
    let hits = 0;
    for (let i = 0; i < 10000; i++) {
      const a: Vec3 = [rand() * 24 - 12, rand() * 24 - 12, rand() * 5 - 0.5];
      const b: Vec3 = [a[0] + rand() * 4 - 2, a[1] + rand() * 4 - 2, a[2] + rand() * 2 - 1];
      const m = rand() * 0.2;
      const old = solids.some((o) => pointHit(o, a[0], a[1], a[2], m) || pointHit(o, b[0], b[1], b[2], m));
      const swept = sweptHit(solids, a, b, m);
      if (old) expect(swept, `segment ${i}`).not.toBeNull();
      if (swept) hits++;
    }
    expect(hits).toBeGreaterThan(200);
  });

  it("is fast enough for 200 solids and 1,000 segments", () => {
    const rand = rng(3);
    const solids: SweptSolid[] = Array.from({ length: 200 }, () => box({ x: rand() * 100, y: rand() * 100, hw: 0.5, hd: 0.5 }));
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const a: Vec3 = [rand() * 100, rand() * 100, 1];
      sweptHit(solids, a, [a[0] + 0.2, a[1], 1], 0.03);
    }
    const ms = performance.now() - t0;
    console.log(`sweptHit 200 solids x 1000 segments: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(200);
  });
});

describe("pointHit on the real courses", () => {
  const modules = import.meta.glob<{ default: DroneContent }>(["../../content/drones/*.ts", "!../../content/drones/*.test.ts", "!../../content/drones/_*.ts"], { eager: true });
  const courses = Object.values(modules).flatMap((m) => flightOf(m.default)?.courses ?? []);

  it("agrees with collide on 10,000 random points", () => {
    expect(courses.length).toBeGreaterThanOrEqual(22);
    const rand = rng(11);
    let agree = 0, hit = 0;
    for (let i = 0; i < 10000; i++) {
      const course = courses[i % courses.length];
      const solids = buildSolids(course);
      if (!solids.length) continue;
      const o = solids[Math.floor(rand() * solids.length)];
      const x = o.x + (rand() * 2 - 1) * 4, y = o.y + (rand() * 2 - 1) * 4, z = rand() * (o.z1 + 1) - 0.3, m = rand() * 0.2;
      const old = collide(solids, x, y, z, m);
      expect(solids.find((s) => pointHit(s, x, y, z, m)) ?? null).toBe(old);
      agree++;
      if (old) hit++;
    }
    expect(agree).toBeGreaterThan(5000);
    expect(hit).toBeGreaterThan(100);
  });
});
