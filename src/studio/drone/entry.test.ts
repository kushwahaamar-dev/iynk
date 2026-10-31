import { describe, expect, it } from "vitest";
import { readBattery, readEsc, readMotor, readProp } from "@/parts/mechanics";
import type { MotorSI, PropSI } from "@/parts/mechanics";
import type { FitRow } from "@/sim/flight/fit";
import { isOutOfRange } from "@/sim/flight/guards";
import { rotorOf, SEA_LEVEL_AIR, solveRotor } from "@/sim/flight/propulsion";
import { entryToDescriptors, parseRows, slugOf } from "./entry";
import type { PartEntry } from "./entry";

const KV = 2300;
const ESC_EFF = 0.95;
const MM_PER_IN = 25.4;
const G_PER_N = 1 / 9.80665e-3;
const TRUTH = { ct0: 0.11, cp0: 0.055 };
const DIAMETER_IN = 5;

const motorSi: MotorSI = { kv_rpm_per_v: KV, ke_vs_per_rad: 60 / (2 * Math.PI * KV), r_ohm: 0.045, i0_a: 1.2, mass_g: 30 };
const propSi: PropSI = { d_m: (DIAMETER_IN * MM_PER_IN) / 1000, pitch_m: 0.1, blades: 3, ...TRUTH, mass_g: 5, hasAdvanceTables: false };
const rotor = rotorOf(motorSi, propSi, SEA_LEVEL_AIR);
if (isOutOfRange(rotor)) throw new Error(rotor.field);

const rows: FitRow[] = [11.1, 14.8].flatMap((v_pack) =>
  [0.25, 0.4, 0.55, 0.7, 0.85, 1].map((throttle) => {
    const p = solveRotor(rotor, throttle * v_pack * ESC_EFF);
    return { v_pack, throttle, thrust_g: p.thrust_n * G_PER_N, current_a: throttle * p.current_a };
  }),
);

const source = { title: "Maker datasheet, table 2", kind: "manufacturer-datasheet" as const };
const DATE = "2026-10-31";

const full: PartEntry = {
  motor: { name: "Test 2306", kv_rpm_per_v: KV, r_ohm: 0.045, i_noload_a: 1.2, mass_g: 30 },
  prop: { name: "Test 5in", diameter_in: DIAMETER_IN, pitch_in: 4, blades: 3, mass_g: 5 },
  source,
  rows,
  date: DATE,
};

const errors = (r: ReturnType<typeof entryToDescriptors>) => r.issues.filter((i) => i.severity === "error");

describe("parseRows", () => {
  it("reads comma separated rows with dot decimals", () => {
    const r = parseRows("11.1,0.5,420,6.5\n14.8,1,1100,31");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      { v_pack: 11.1, throttle: 0.5, thrust_g: 420, current_a: 6.5 },
      { v_pack: 14.8, throttle: 1, thrust_g: 1100, current_a: 31 },
    ]);
  });

  it("reads tab separated rows and skips a header line", () => {
    const r = parseRows("V\tthrottle\tthrust g\tA\n11.1\t0.5\t420\t6.5\n");
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });

  it("reads comma decimals in semicolon and tab tables", () => {
    expect(parseRows("11,1;0,5;420;6,5").rows[0]).toEqual({ v_pack: 11.1, throttle: 0.5, thrust_g: 420, current_a: 6.5 });
    expect(parseRows("11,1\t0,5\t420\t6,5").rows[0]).toEqual({ v_pack: 11.1, throttle: 0.5, thrust_g: 420, current_a: 6.5 });
  });

  it("names the line of a row with a non-number or too few columns", () => {
    const r = parseRows("11.1,0.5,420,6.5\n11.1,half,420,6.5\n11.1,0.5,420");
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toEqual([{ kind: "notNumber", line: 2 }, { kind: "columns", line: 3 }]);
  });

  it("refuses more than 32 rows and says how many", () => {
    const text = Array.from({ length: 33 }, () => "11.1,0.5,420,6.5").join("\n");
    expect(parseRows(text)).toEqual({ rows: [], errors: [{ kind: "tooMany", count: 33 }] });
    expect(parseRows(text.split("\n").slice(0, 32).join("\n")).rows).toHaveLength(32);
  });
});

describe("entryToDescriptors", () => {
  it("builds a motor and a fitted propeller that validate as local parts", () => {
    const r = entryToDescriptors(full);
    expect(errors(r)).toEqual([]);
    expect(r.descriptors.map((d) => d.id)).toEqual(["local.test-2306", "local.test-5in"]);
    const [motor, prop] = r.descriptors;
    expect(motor!.provenance.origin).toBe("local-user");
    expect(motor!.simulation.tier).toBe("T1");
    expect(readMotor(motor!).ok).toBe(true);
    const read = readProp(prop!);
    expect(read.ok).toBe(true);
    if (read.ok) expect(Math.abs(read.value.ct0 / TRUTH.ct0 - 1)).toBeLessThan(0.02);
  });

  it("stores the band of the fit and the source", () => {
    const r = entryToDescriptors(full);
    const prop = r.descriptors[1]!;
    const record = (prop as unknown as { x_fit: { band: number; motor: string }[] }).x_fit[0]!;
    expect(r.fit?.band).not.toBeNull();
    expect(record.band).toBe(r.fit!.band);
    expect(record.motor).toBe("local.test-2306");
    expect(prop.sources[0]).toMatchObject({ kind: "datasheet", title: source.title });
  });

  it("builds an ESC alone that reads ok", () => {
    const r = entryToDescriptors({ esc: { name: "My ESC", i_cont_a: 40, channels: 4, protocol: "dshot600", mass_g: 12 }, source, date: DATE });
    expect(errors(r)).toEqual([]);
    expect(readEsc(r.descriptors[0]!).ok).toBe(true);
  });

  it("builds a pack and notes a cell resistance it set itself", () => {
    const r = entryToDescriptors({ pack: { name: "My 4S", cells: 4, capacity_mah: 1500, chemistry: "lipo", mass_g: 170 }, source, date: DATE });
    expect(errors(r)).toEqual([]);
    expect(readBattery(r.descriptors[0]!).ok).toBe(true);
    expect(r.descriptors[0]!.simulation.known_gaps?.[0]?.id).toBe("r_cell_assumed");
  });

  it("reports a negative kv by path and a blank source", () => {
    const r = entryToDescriptors({ ...full, motor: { ...full.motor!, kv_rpm_per_v: -5 }, source: { ...source, title: " " } });
    const paths = errors(r).map((i) => i.path);
    expect(paths).toContain("/mechanics/motor/kv_rpm_per_v");
    expect(paths).toContain("/sources/0/title");
  });

  it("asks for a number where a field is blank", () => {
    const r = entryToDescriptors({ ...full, motor: { ...full.motor!, r_ohm: NaN } });
    expect(errors(r).map((i) => i.path)).toContain("/mechanics/motor/r_ohm");
  });

  it("needs rows for a propeller", () => {
    const r = entryToDescriptors({ ...full, rows: [] });
    expect(errors(r).map((i) => i.path)).toContain("/mechanics/prop/ct0");
    expect(r.descriptors).toHaveLength(1);
  });

  it("uses the default licence unless one is given", () => {
    expect(entryToDescriptors(full).descriptors[0]!.provenance.license).toBe("LicenseRef-user-supplied");
    expect(entryToDescriptors({ ...full, license: "CC0-1.0" }).descriptors[0]!.provenance.license).toBe("CC0-1.0");
  });

  it("refuses two parts with the same name", () => {
    const r = entryToDescriptors({ ...full, prop: { ...full.prop!, name: "Test 2306" } });
    expect(errors(r)).toHaveLength(1);
    expect(r.descriptors).toHaveLength(1);
  });
});

describe("slugOf", () => {
  it("makes an id part that starts with a letter", () => {
    expect(slugOf("2306 Motor (1750 kv)")).toBe("part-2306-motor-1750-kv");
    expect(slugOf("---")).toBe("");
  });
});
