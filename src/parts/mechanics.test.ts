// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Descriptor } from "./descriptor.ts";
import { keKvRatio, readBattery, readEsc, readFc, readFrame, readMotor, readProp, roleOf } from "./mechanics.ts";

const EXAMPLES = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/", import.meta.url);

const part = (category: string, mechanics: object, extra: object = {}): Descriptor =>
  ({ identity: { category }, mechanics, ...extra }) as unknown as Descriptor;

const motor = { r_ohm: 0.08, kv_rpm_per_v: 2300, i_noload_a: 1.2, mass_g: 32 };
const prop = { diameter_mm: 127, pitch_mm: 114, ct0: 0.11, cp0: 0.05, mass_g: 4 };
const esc = { i_cont_a: 30, mass_g: 8 };
const battery = { cells: 4, capacity_mah: 1500, r_cell_ohm: 0.006, mass_g: 180 };
const frame = { mass_g: 90 };
const fc = { gyro: "icm42688", loop_hz_max: 8000, mass_g: 6 };

describe("mechanics readers", () => {
  it("assigns a role to every example and none to the gear motor", () => {
    for (const file of readdirSync(EXAMPLES)) {
      const d = JSON.parse(readFileSync(new URL(file, EXAMPLES), "utf8")) as Descriptor;
      if (file.startsWith("dc-gear-motor")) expect(roleOf(d)).toBeNull();
      else expect(() => roleOf(d)).not.toThrow();
    }
  });

  it("reads a drone motor and converts kv and ke both ways", () => {
    const read = readMotor(part("drone", { motor }));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(keKvRatio(read.value)).toBeCloseTo(1, 12);
    expect(roleOf(part("drone", { motor }))).toBe("motor");
    const fromKe = readMotor(part("drone", { motor: { ...motor, kv_rpm_per_v: undefined, ke_vs_per_rad: read.value.ke_vs_per_rad } }));
    if (fromKe.ok) expect(fromKe.value.kv_rpm_per_v).toBeCloseTo(2300, 9);
    else expect.unreachable();
  });

  it("names the exact path of each missing field", () => {
    const cases: [string, (d: Descriptor) => unknown, object, string[]][] = [
      ["motor", readMotor, motor, ["r_ohm", "i_noload_a", "mass_g", "kv_rpm_per_v"]],
      ["prop", readProp, prop, ["diameter_mm", "pitch_mm", "ct0", "cp0", "mass_g"]],
      ["esc", readEsc, esc, ["i_cont_a", "mass_g"]],
      ["battery", readBattery, battery, ["cells", "capacity_mah", "r_cell_ohm", "mass_g"]],
      ["frame", readFrame, frame, ["mass_g"]],
      ["fc", readFc, fc, ["gyro", "loop_hz_max", "mass_g"]],
    ];
    for (const [role, reader, block, fields] of cases) {
      for (const field of fields) {
        const { [field]: _gone, ...rest } = block as Record<string, unknown>;
        const result = reader(part("drone", { [role]: rest })) as { ok: boolean; missing: { path: string }[] };
        expect(result.ok).toBe(false);
        expect(result.missing.map((n) => n.path)).toEqual([`mechanics.${role}.${field}`]);
      }
    }
  });

  it("reports the no-load current when it is the only gap", () => {
    const { i_noload_a: _, ...rest } = motor;
    const result = readMotor(part("drone", { motor: rest }));
    expect(result).toMatchObject({ ok: false, missing: [{ path: "mechanics.motor.i_noload_a" }] });
  });

  it("refuses zero and takes the mass from the dimensions", () => {
    expect(readFrame(part("drone", { frame: { mass_g: 0 } }))).toMatchObject({
      ok: false,
      missing: [{ path: "mechanics.frame.mass_g", why: "must be positive" }],
    });
    const viaDimensions = readFrame(part("drone", { frame: {} }, { dimensions: { mass: { unit: "g", typ: 90 } } }));
    expect(viaDimensions).toMatchObject({ ok: true, value: { mass_g: 90 } });
  });

  it("lists the defaulted fields", () => {
    expect(readProp(part("drone", { prop }))).toMatchObject({ ok: true, assumed: ["mechanics.prop.blades"], value: { blades: 2 } });
    expect(readEsc(part("drone", { esc }))).toMatchObject({
      ok: true,
      assumed: ["mechanics.esc.channels", "mechanics.esc.efficiency"],
      value: { channels: 1, efficiency: 0.95 },
    });
    expect(readBattery(part("drone", { battery }))).toMatchObject({
      ok: true,
      assumed: ["mechanics.battery.parallel", "mechanics.battery.chemistry"],
      value: { parallel: 1, chemistry: "lipo" },
    });
  });

  it("flags advance tables and reports an absent block", () => {
    const tables = [{ j: 0, ct: 0.1 }];
    const read = readProp(part("drone", { prop: { ...prop, ct_vs_j: tables, cp_vs_j: tables } }));
    expect(read).toMatchObject({ ok: true, value: { hasAdvanceTables: true } });
    expect(readFc(part("drone", {}))).toMatchObject({ ok: false, missing: [{ path: "mechanics.fc" }] });
  });
});
