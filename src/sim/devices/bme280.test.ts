// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Bme280Cal } from "./bme280.ts";
import { compensateH, compensateP, compensateT, parseCalibration } from "./bme280.ts";
import { loadDevice } from "./loader.ts";
import type { DeviceContext } from "./register-map.ts";

const ADDRESS = 0x76;
let now = 0;
const ctx: DeviceContext = { pin: (name) => (name === "CSB" ? "high" : "low"), supplyV: () => 3.3, nowNs: () => now };

function bme() {
  const r = loadDevice("device:i2c/bme280@1", ctx);
  if (!r.ok) throw new Error(r.error);
  return r.device;
}

const read = (d: ReturnType<typeof bme>, reg: number, n: number): number[] => {
  d.start(ADDRESS, false);
  d.write(reg);
  d.start(ADDRESS, true);
  const out = Array.from({ length: n }, (_, i) => d.read(i === n - 1));
  d.stop();
  return out;
};

const write = (d: ReturnType<typeof bme>, reg: number, value: number): void => {
  d.start(ADDRESS, false);
  d.write(reg);
  d.write(value);
  d.stop();
};

const word = (bytes: number[], shift: number): number => bytes.reduce((acc, b) => (acc << 8) | b, 0) >> shift;

describe("data BME280", () => {
  it("reads chip id 0x60", () => {
    now = 0;
    expect(read(bme(), 0xd0, 1)).toEqual([0x60]);
  });

  it("returns raw words that the datasheet compensation turns back into the inputs", () => {
    now = 0;
    const d = bme();
    const cal: Bme280Cal = parseCalibration(Uint8Array.from([...read(d, 0x88, 26), ...read(d, 0xe1, 7)]));
    write(d, 0xf2, 1);
    write(d, 0xf4, (1 << 5) | (1 << 2) | 1);
    now = 50_000_000;
    const raw = read(d, 0xf7, 8);
    const { t100, tFine } = compensateT(cal, word(raw.slice(3, 6), 4));
    expect(t100 / 100).toBeCloseTo(22, 1);
    expect(compensateP(cal, word(raw.slice(0, 3), 4), tFine) / 256).toBeCloseTo(101325, -1);
    expect(compensateH(cal, word(raw.slice(6, 8), 0), tFine) / 1024).toBeCloseTo(45, 0);
  });
});
