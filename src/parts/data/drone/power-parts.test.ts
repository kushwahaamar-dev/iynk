// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOutOfRange } from "../../../sim/flight/guards.ts";
import { checkPack, packOpen, packResistance, type FlyChem, type PackSI } from "../../../sim/flight/battery.ts";
import { checkDescriptor } from "../../../sim/flight/content-rule.ts";
import { rotorOf, SEA_LEVEL_AIR, solveStatic, type PackModel } from "../../../sim/flight/propulsion.ts";
import { validateDescriptor, type Descriptor } from "../../descriptor.ts";
import { readBattery, readEsc, type MotorSI, type PropSI } from "../../mechanics.ts";

const dir = new URL("./", import.meta.url);
const load = (prefix: string): Descriptor[] =>
  readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".component.json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Descriptor);

const batteries = load("batt-");
const escs = load("esc-");

const packOf = (d: Descriptor): PackSI => {
  const r = readBattery(d);
  if (!r.ok) throw new Error(`${d.id} does not read`);
  const { chemistry, ...rest } = r.value;
  return { ...rest, chem: chemistry as FlyChem };
};

const FULL_CELL_LIPO_V = 4.2;
const SAG_AMPS = 60;

describe("generic drone power parts", () => {
  it("has six batteries and two ESCs", () => {
    expect(batteries).toHaveLength(6);
    expect(escs).toHaveLength(2);
  });

  it.each([...batteries, ...escs].map((d) => [d.id, d] as const))("%s validates and passes the content rule", (_id, d) => {
    expect(validateDescriptor(d, { origin: "core" })).toEqual({ ok: true, diagnostics: [] });
    expect(checkDescriptor(d)).toEqual([]);
    expect(d.x_price).toMatchObject({ as_of: "2026-10-27", estimate: true });
  });

  it("keeps ids unique", () => {
    const ids = [...batteries, ...escs].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("batteries", () => {
  it.each(batteries.map((d) => [d.id, d] as const))("%s reads ok and is a valid pack", (_id, d) => {
    const r = readBattery(d);
    expect(r.ok).toBe(true);
    expect(checkPack(packOf(d))).toBeNull();
    if (r.ok) expect(r.assumed).toEqual([]);
  });

  it.each(batteries.map((d) => [d.id, d] as const))("%s: full-charge open-circuit voltage", (_id, d) => {
    const pack = packOf(d);
    if (pack.chem === "lipo") expect(Math.abs(packOpen(pack, 1) - pack.cells * FULL_CELL_LIPO_V)).toBeLessThan(0.01);
    else expect(packOpen(pack, 1)).toBeGreaterThan(pack.cells * 4);
  });

  it("sags the 1300 mAh 4S pack about 0.5 to 1 V at 60 A", () => {
    const pack = packOf(batteries.find((d) => d.id === "core.batt-4s-1300-lipo")!);
    const sag = SAG_AMPS * packResistance(pack);
    console.log(`4S 1300 mAh sag at ${SAG_AMPS} A: ${sag.toFixed(3)} V`);
    expect(sag).toBeGreaterThanOrEqual(0.5);
    expect(sag).toBeLessThanOrEqual(1);
  });

  it.each(batteries.map((d) => [d.id, d] as const))("%s: continuous current limit is positive", (_id, d) => {
    const { c_continuous, c_burst, capacity_mah } = packOf(d);
    expect((c_continuous! * capacity_mah) / 1000).toBeGreaterThan(0);
    expect(c_burst!).toBeGreaterThanOrEqual(c_continuous!);
  });
});

describe("ESCs", () => {
  const motor = (kv: number, r_ohm: number, i0_a: number): MotorSI => ({
    kv_rpm_per_v: kv,
    ke_vs_per_rad: 30 / (Math.PI * kv),
    r_ohm,
    i0_a,
    mass_g: 30,
  });
  const prop = (d_m: number, ct0: number, cp0: number): PropSI => ({
    d_m, pitch_m: 0.1, blades: 3, ct0, cp0, mass_g: 4, hasAdvanceTables: false,
  });
  const pairs = [
    { esc: "core.esc-4in1-25a", pack: "core.batt-4s-1300-lipo", motor: motor(3000, 0.09, 0.8), prop: prop(0.0762, 0.11, 0.055) },
    { esc: "core.esc-4in1-55a", pack: "core.batt-6s-1300-lipo", motor: motor(1300, 0.05, 1), prop: prop(0.1778, 0.11, 0.055) },
  ];

  it.each(escs.map((d) => [d.id, d] as const))("%s reads ok", (_id, d) => {
    const r = readEsc(d);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.channels).toBe(4);
  });

  it.each(pairs.map((p) => [p.esc, p] as const))("%s covers its pack and runs full throttle under i_cont_a", (id, pair) => {
    const esc = readEsc(escs.find((d) => d.id === id)!);
    const pack = packOf(batteries.find((d) => d.id === pair.pack)!);
    if (!esc.ok) throw new Error("esc does not read");
    expect(esc.value.v_max!).toBeGreaterThanOrEqual(packOpen(pack, 1));
    const rotor = rotorOf(pair.motor, pair.prop, SEA_LEVEL_AIR);
    if (isOutOfRange(rotor)) throw new Error(rotor.field);
    const model: PackModel = { open_v: (soc) => packOpen(pack, soc), r_ohm: packResistance(pack), idle_a: 0 };
    const at = solveStatic([{ rotor, escEff: esc.value.efficiency }], 1, 1, model);
    if (isOutOfRange(at)) throw new Error(at.field);
    const current = at.motors[0]!.current_a;
    console.log(`${id} full-throttle motor current ${current.toFixed(1)} A of ${esc.value.i_cont_a} A`);
    expect(current).toBeLessThan(esc.value.i_cont_a);
    expect(current).toBeGreaterThan(0);
  });
});
