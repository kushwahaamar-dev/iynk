import { describe, expect, it } from "vitest";
import en from "../i18n/messages/en/droneopt.json";
import drone from "../i18n/messages/en/drone.json";
import { assemble } from "../sim/flight/mass";
import { isOutOfRange } from "../sim/flight/guards";
import { bannedHits } from "../sim/flight/notices";
import type { Build, BuildSlot } from "../sim/flight/build";
import { droneBom, toCsv, type PartInfo } from "./bom-drone";

const SN8 = drone.notice["SN-8"];
const MADE = "2026-10-31T09:00:00.000Z";

const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const;

const slots: BuildSlot[] = corners.map(([x, y], i) => ({
  id: `m${i + 1}`,
  motor: { kv_rpm_per_v: 1750, ke_vs_per_rad: 0.005, r_ohm: 0.05, i0_a: 1, mass_g: 32 },
  prop: { d_m: 0.127, pitch_m: 0.11, blades: 3, ct0: 0.1, cp0: 0.05, mass_g: 4, hasAdvanceTables: false },
  esc: { i_cont_a: 50, channels: 4, efficiency: 0.95, mass_g: 15 },
  spin: i % 2 ? "cw" : "ccw",
  prop_spin: i % 2 ? "cw" : "ccw",
  axis_mm: [x * 50, y * 50],
  z_mm: 0,
  thrust_axis: [0, 0, 1],
  motorRef: "motor-2306",
  propRef: "prop-5x4",
  escRef: "esc-4in1",
}));

const bodies = [
  { id: "frame", mass_g: 110 },
  { id: "fc", mass_g: 8 },
  { id: "esc", mass_g: 15 },
  { id: "pack", mass_g: 190 },
  { id: "motors", mass_g: 128 },
  { id: "props", mass_g: 16 },
].map((b) => ({ ...b, shape: { kind: "mesh" as const }, inertia_g_mm2: [1, 1, 1] as const, position_mm: [0, 0, 0] as const, rpy_deg: [0, 0, 0] as const }));

const build: Build = {
  projectId: "p",
  kind: "multirotor",
  slots,
  pack: { chem: "lipo", cells: 4, parallel: 1, capacity_mah: 1300, r_cell_ohm: 0.01, mass_g: 190 },
  packRef: "pack-4s",
  frame: { mass_g: 110 },
  frameRef: "frame-5in",
  fc: { gyro: "icm42688", loop_hz_max: 8000, mass_g: 8 },
  fcRef: "fc-f4",
  bodies,
  flight: { model: "multirotor-rigid@1", step_hz: 1000, pid_hz: 1000 },
  fits: new Map(),
  makerRated: new Set(),
  assumed: [],
  missing: [],
};

const info: Record<string, PartInfo> = {
  "frame-5in": { name: "5 inch frame", basis: "maker" },
  "fc-f4": { name: "F4 controller", mpn: "FC-F405", basis: "maker" },
  "esc-4in1": { name: "=SUM(1,2) 4-in-1", basis: "assumption" },
  "pack-4s": { name: '4S 1300 mAh "race" pack', mpn: "P-1300", basis: "measured", priceTag: { amount: 24.5, currency: "USD", asOf: "2026-10-01", estimate: true } },
  "motor-2306": { name: "2306, 1750 kv", basis: "maker" },
  "prop-5x4": { name: "5x4x3 prop", basis: "maker" },
};
const describe_ = (ref: string): PartInfo => info[ref];
const columns = en.columns;

describe("droneBom", () => {
  const lines = droneBom(build, describe_);

  it("lists the 5-inch build part by part", () => {
    expect(lines.map((l) => [l.ref, l.qty])).toEqual([
      ["frame-5in", 1],
      ["fc-f4", 1],
      ["esc-4in1", 1],
      ["pack-4s", 1],
      ["motor-2306", 4],
      ["prop-5x4", 4],
    ]);
  });

  it("sums to the all-up weight", () => {
    const auw = assemble(build.bodies);
    if (isOutOfRange(auw)) throw new Error("out of range");
    expect(lines.reduce((s, l) => s + l.mass_g, 0)).toBeCloseTo(auw.mass_g, 9);
  });

  it("leaves the part number empty when the library has none", () => {
    expect(lines[0].mpn).toBeNull();
    expect(lines[1].mpn).toBe("FC-F405");
  });
});

describe("toCsv", () => {
  const csv = toCsv(droneBom(build, describe_), { sn8: SN8, made: MADE, columns });
  const rows = csv.split("\r\n");

  it("opens with the SN-8 text and the date", () => {
    expect(rows[0]).toBe(`# ${SN8}`);
    expect(rows[1]).toBe(`# made ${MADE}`);
  });

  it("neutralises a name that starts like a formula", () => {
    expect(csv).toContain("'=SUM(1,2) 4-in-1");
    expect(csv).not.toMatch(/,=SUM/);
  });

  it("quotes commas and doubles quotes", () => {
    expect(csv).toContain('"\'=SUM(1,2) 4-in-1"');
    expect(csv).toContain('"4S 1300 mAh ""race"" pack"');
  });

  it("shows the price with its date and that it is an estimate", () => {
    expect(rows.find((r) => r.startsWith("1,pack-4s"))).toMatch(/,24\.5,USD,2026-10-01,estimate$/);
  });

  it("uses no over-claiming word", () => {
    expect(bannedHits(csv)).toEqual([]);
  });
});
