// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Project, Track } from "../../project/generated/types.ts";
import { runChecks, runMetrics, topSpeed, type CheckInput } from "./checker.ts";
import type { ComponentDescriptor } from "./ports.ts";

const FIXTURE = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json";
const load = (): Project => JSON.parse(readFileSync(FIXTURE, "utf8")) as Project;

const motor = { r_ohm: 2.5, ke_vs_per_rad: 0.012, gear: { ratio: 30, efficiency: 0.7 } };
const parts: Record<string, unknown> = {
  "core.dc-gear-motor": { mechanics: { motor } },
  "core.l298n-module": { mechanics: { driver: { kind: "h-bridge", vdrop_v: 0, i_max_a: 4 } } },
  "core.battery-lipo-2s": { mechanics: { battery: { cells: 2, capacity_mah: 1000, c_continuous: 10, r_cell_ohm: 0.03, chemistry: "lipo" } } },
  "core.qtr-8rc": { mechanics: { sensor: { query: "surface-sample", range_max_mm: 9.5, footprint_mm: 8 } } },
  "core.encoder": { mechanics: { encoder: { counts_per_rev: 12 } } },
};

function input(edit: (doc: Project, p: Record<string, unknown>) => void = () => {}, extra: Partial<CheckInput> = {}): CheckInput {
  const doc = load();
  const p = structuredClone(parts);
  doc.mechanical!.bodies.find((b) => b.id === "bdy_chassis")!.mass_g = 642;
  for (const w of Object.values(doc.domains!.robotics!.data.wheels)) Object.assign(w!, { radius_mm: 30, crr: 0.02 });
  edit(doc, p);
  return { doc, describe: (ref) => p[ref] as ComponentDescriptor | undefined, slopeDeg: 10, supplyV: 6, ...extra };
}

const byId = (checks: ReturnType<typeof runChecks>, id: string) => checks.find((c) => c.id === id)!;

describe("ROBOTICS 6.3 worked example", () => {
  const checks = runChecks(input());

  it("returns the ten checks in order", () => {
    expect(checks.map((c) => c.id)).toEqual(Array.from({ length: 10 }, (_, k) => `RB-C-${String(k + 1).padStart(2, "0")}`));
  });

  it("reproduces the margin of 30", () => {
    const c = byId(checks, "RB-C-01");
    expect(c.result).toBe("ok");
    expect(c.value).toBeCloseTo(30.4, 0);
    expect(c.limit).toBe(1.5);
  });

  it("gives the stall torque at the wheel and the per-wheel need", () => {
    const w = 0.012 * (6 / 2.5) * 30 * 0.7;
    const need = (0.7 * 9.81 * (Math.sin((10 * Math.PI) / 180) + 0.02 * Math.cos((10 * Math.PI) / 180)) * 0.03) / 2;
    expect(w).toBeCloseTo(0.605, 3);
    expect(need).toBeCloseTo(0.0199, 4);
    expect(byId(checks, "RB-C-01").value).toBeCloseTo(w / need, 9);
  });
});

describe("failing variants", () => {
  it("RB-C-01 fails on a heavy payload and names a motor", () => {
    const c = byId(runChecks(input((d) => (d.mechanical!.bodies.find((b) => b.id === "bdy_chassis")!.mass_g = 20000))), "RB-C-01");
    expect(c).toMatchObject({ result: "fail", causeId: "motor-stall" });
    expect(c.limitingPart).toMatch(/^cmp_motor_/);
  });

  it("RB-C-01 fails with no limiting part when nothing is driven", () => {
    const c = byId(runChecks(input((d) => d.mechanical!.joints.forEach((j) => delete j.drive))), "RB-C-01");
    expect(c).toMatchObject({ result: "fail", limitingPart: null });
  });

  it("RB-C-04 sums the stall against the pack and checks one channel against the driver", () => {
    const ok = byId(runChecks(input()), "RB-C-04");
    expect(ok).toMatchObject({ result: "ok", value: 2.4, limit: 4 });
    const driver = byId(runChecks(input((_, p) => (p["core.l298n-module"] = { mechanics: { driver: { kind: "h-bridge", i_max_a: 1.2 } } }))), "RB-C-04");
    expect(driver).toMatchObject({ result: "fail", limitingPart: "cmp_drv", causeId: "driver-undersized", value: 2.4, limit: 1.2 });
    const pack = byId(runChecks(input((_, p) => ((p["core.battery-lipo-2s"] as never as { mechanics: { battery: { c_continuous: number } } }).mechanics.battery.c_continuous = 1))), "RB-C-04");
    expect(pack).toMatchObject({ result: "fail", limitingPart: "cmp_bat" });
  });

  it("RB-C-05 needs a run, then reads a solved result", () => {
    expect(byId(runChecks(input()), "RB-C-05")).toMatchObject({ result: "warn", assumptions: ["needs a run"] });
    const solved = { minV: 3.1, thresholdV: 4.5, limitingPart: "brd_uno" };
    expect(byId(runChecks(input(() => {}, { solvedRail: solved })), "RB-C-05")).toMatchObject({ result: "fail", causeId: "battery-sag-reset" });
  });

  it("RB-C-06 gives a runtime and warns on a small pack", () => {
    expect(byId(runChecks(input()), "RB-C-06").result).toBe("ok");
    const small = byId(runChecks(input((_, p) => ((p["core.battery-lipo-2s"] as never as { mechanics: { battery: { capacity_mah: number } } }).mechanics.battery.capacity_mah = 50))), "RB-C-06");
    expect(small.result).toBe("warn");
    expect(small.assumptions[0]).toMatch(/^runtime .* to .* min$/);
  });

  it("RB-C-07 fails when the centre of gravity is too high for the slope", () => {
    const c = byId(runChecks(input((d) => Object.assign(d.mechanical!.bodies.find((b) => b.id === "bdy_chassis")!, { mass_g: 5000, com_mm: [0, 0, 600] }), { slopeDeg: 10 })), "RB-C-07");
    expect(c).toMatchObject({ result: "fail", causeId: "tip-over", limitingPart: "bdy_chassis" });
  });

  it("RB-C-09 warns when one count is too coarse for the target speed", () => {
    expect(byId(runChecks(input((d) => d.components.push({ id: "cmp_enc", definition: { ref: "core.encoder", version: "1.0.0", origin: "builtin" } as never, refdes: "E1" }))), "RB-C-09").result).toBe("warn");
    const fine = input((d, p) => {
      p["core.encoder"] = { mechanics: { encoder: { counts_per_rev: 1200 } } };
      d.components.push({ id: "cmp_enc", definition: { ref: "core.encoder", version: "1.0.0", origin: "builtin" } as never, refdes: "E1" });
    });
    expect(byId(runChecks(fine), "RB-C-09").result).toBe("ok");
  });

  it("RB-C-10 fails a sensor mounted too high", () => {
    expect(byId(runChecks(input()), "RB-C-10").result).toBe("ok");
    const c = byId(runChecks(input((d) => (d.mechanical!.mounts.find((m) => m.id === "mnt_qtr")!.pose.position_mm[2] = 10))), "RB-C-10");
    expect(c).toMatchObject({ result: "fail", causeId: "sensor-too-high", limitingPart: "cmp_qtr" });
  });

  it("RB-C-08 holds when no arm is driven", () => {
    expect(byId(runChecks(input()), "RB-C-08").result).toBe("ok");
  });
});

describe("missing inputs", () => {
  it("warns instead of inventing a number when the motor has no mechanics", () => {
    const checks = runChecks(input((_, p) => delete p["core.dc-gear-motor"]));
    for (const id of ["RB-C-01", "RB-C-02", "RB-C-03", "RB-C-04"]) {
      expect(byId(checks, id)).toMatchObject({ result: "warn", value: null, assumptions: ["no mechanics.motor"] });
    }
  });
});

describe("topSpeed", () => {
  it("falls with the slope and names a motor", () => {
    const flat = topSpeed(input(() => {}, { slopeDeg: 0 }));
    const hill = topSpeed(input(() => {}, { slopeDeg: 10 }));
    expect(flat.vMps).toBeGreaterThan(hill.vMps);
    expect(hill.vMps).toBeGreaterThan(0);
    expect(hill.limitingPart).toMatch(/^cmp_motor_/);
  });

  it("matches the no-load speed with nothing to carry", () => {
    const i = input((d) => (d.mechanical!.bodies.find((b) => b.id === "bdy_chassis")!.mass_g = 0.001), { slopeDeg: 0 });
    i.doc.domains!.robotics!.data.wheels.jnt_wheel_l!.crr = 0;
    i.doc.domains!.robotics!.data.wheels.jnt_wheel_r!.crr = 0;
    expect(topSpeed(i).vMps).toBeCloseTo((0.03 * (6 / 0.012)) / 30, 2);
  });
});

describe("runMetrics", () => {
  const circle = (r: number, n: number) => Array.from({ length: n }, (_, k) => [r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)] as [number, number]);
  const track = (r: number): Track => ({ id: "t", points_mm: circle(r, 72) as unknown as Track["points_mm"], width_mm: 19, reflectance: 0.05, closed: true });
  const path = (r: number, n: number) => Array.from({ length: n + 1 }, (_, k) => ({ atNs: k, x: r * Math.cos((2 * Math.PI * k) / n), y: r * Math.sin((2 * Math.PI * k) / n) }));

  it("counts one lap on the line", () => {
    const m = runMetrics(path(400, 72), track(400), 19);
    expect(m.laps).toBe(1);
    expect(m.maxCrossTrackMm).toBeCloseTo(0, 6);
    expect(m.onLineFraction).toBe(1);
    expect(m.text).toHaveLength(3);
  });

  it("reports a 30 mm offset", () => {
    const m = runMetrics(path(430, 72), track(400), 19);
    expect(m.maxCrossTrackMm).toBeGreaterThan(29);
    expect(m.maxCrossTrackMm).toBeCloseTo(30, -1);
    expect(m.onLineFraction).toBe(0);
  });

  it("goes negative when driving the wrong way", () => {
    const back = path(400, 72).reverse();
    expect(runMetrics(back, track(400), 19).laps).toBe(0);
    expect(runMetrics(back, track(400), 19).progressMm).toBeLessThan(0);
  });

  it("returns empty metrics for no track length", () => {
    const flat: Track = { id: "t", points_mm: [[0, 0], [0, 0]], width_mm: 19, reflectance: 0.05, closed: false };
    expect(runMetrics(path(10, 4), flat, 19)).toMatchObject({ laps: 0, progressMm: 0, maxCrossTrackMm: 0 });
  });
});
