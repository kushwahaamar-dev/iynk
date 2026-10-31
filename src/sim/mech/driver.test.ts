import { describe, expect, it } from "vitest";
import { driverDrive, overCurrent, paramsFromDescriptor, type DriverParams, type PinSample } from "./driver.ts";

const tb: DriverParams = { kind: "h-bridge", decay: "slow", vdropV: 0.5, iMaxA: 1.2, pwmMaxHz: 100000, truth: "tb6612" };
const l298: DriverParams = { kind: "h-bridge", decay: "fast", vdropV: 2.55, iMaxA: 2, pwmMaxHz: 25000, truth: "l298n" };
const V = 7.4;
const high = { level: 1 } as const;
const low = { level: 0 } as const;

function tbPins(in1: 0 | 1, in2: 0 | 1, pwm: PinSample["pwm"], stby: 0 | 1 = 1): PinSample {
  return { in1, in2, pwm, stby };
}

describe("TB6612FNG truth table", () => {
  it("runs forward and reverse on PWM high", () => {
    const fwd = driverDrive(tb, tbPins(1, 0, high), V);
    expect([fwd.state, fwd.direction, fwd.drive.vTerminal, fwd.drive.duty]).toEqual(["run", 1, V - 0.5, 1]);
    const rev = driverDrive(tb, tbPins(0, 1, high), V);
    expect([rev.state, rev.direction, rev.drive.vTerminal]).toEqual(["run", -1, -(V - 0.5)]);
  });

  it("chops with the PWM duty and the descriptor decay", () => {
    const out = driverDrive(tb, tbPins(1, 0, { duty: 0.5, hz: 490 }), V);
    expect(out.state).toBe("run");
    expect(out.direction).toBe(1);
    expect(out.drive).toMatchObject({ duty: 0.5, hz: 490, decay: "slow" });
    expect(out.approximation).toBe(false);
  });

  it("short brakes when PWM is low with one input high", () => {
    for (const pins of [tbPins(1, 0, low), tbPins(0, 1, low), tbPins(1, 0, { duty: 0, hz: 490 })]) {
      const out = driverDrive(tb, pins, V);
      expect([out.state, out.direction, out.drive.vTerminal, out.drive.duty]).toEqual(["brake", 0, 0, 1]);
    }
  });

  it("short brakes with both inputs high whatever the PWM", () => {
    for (const pwm of [high, low]) expect(driverDrive(tb, tbPins(1, 1, pwm), V).state).toBe("brake");
  });

  it("coasts with both inputs low", () => {
    const out = driverDrive(tb, tbPins(0, 0, high), V);
    expect([out.state, out.direction, out.drive.duty]).toEqual(["coast", 0, 0]);
    expect(driverDrive(tb, tbPins(0, 0, low), V).state).toBe("coast");
  });

  it("is in standby with STBY low or floating", () => {
    for (const stby of [0, undefined] as const) {
      const out = driverDrive(tb, { in1: 1, in2: 0, pwm: high, ...(stby === 0 && { stby }) }, V);
      expect([out.state, out.direction, out.drive.vTerminal, out.drive.duty]).toEqual(["standby", 0, 0, 0]);
    }
  });

  it("flags a PWM faster than the module can switch", () => {
    expect(driverDrive(tb, tbPins(1, 0, { duty: 0.5, hz: 200000 }), V).approximation).toBe(true);
  });
});

describe("L298N truth table", () => {
  const pins = (in1: 0 | 1, in2: 0 | 1, pwm: PinSample["pwm"]): PinSample => ({ in1, in2, pwm });

  it("runs forward and reverse with EN high", () => {
    expect(driverDrive(l298, pins(1, 0, high), V)).toMatchObject({ state: "run", direction: 1 });
    expect(driverDrive(l298, pins(0, 1, high), V)).toMatchObject({ state: "run", direction: -1 });
  });

  it("brakes with EN high and both inputs equal", () => {
    expect(driverDrive(l298, pins(1, 1, high), V).state).toBe("brake");
    expect(driverDrive(l298, pins(0, 0, high), V).state).toBe("brake");
  });

  it("coasts with EN low whatever the inputs", () => {
    for (const [a, b] of [[1, 0], [0, 1], [1, 1], [0, 0]] as const) {
      expect(driverDrive(l298, pins(a, b, low), V).state).toBe("coast");
    }
  });

  it("chops on EN and decays fast", () => {
    const out = driverDrive(l298, pins(1, 0, { duty: 0.3, hz: 490 }), V);
    expect(out.drive).toMatchObject({ duty: 0.3, hz: 490, decay: "fast" });
  });

  it("drops far more than the TB6612", () => {
    const a = driverDrive(tb, tbPins(1, 0, high), V).drive.vTerminal;
    const b = driverDrive(l298, pins(1, 0, high), V).drive.vTerminal;
    expect(a - b).toBeCloseTo(2.05, 9);
  });
});

describe("supply and limits", () => {
  it("never gives a negative terminal voltage when the supply is below the drop", () => {
    expect(driverDrive(l298, { in1: 1, in2: 0, pwm: high }, 2).drive.vTerminal).toBe(0);
  });

  it("reports over-current in either direction above i_max only", () => {
    expect(overCurrent(tb, 1.2)).toBe(false);
    expect(overCurrent(tb, 1.21)).toBe(true);
    expect(overCurrent(tb, -1.21)).toBe(true);
  });
});

describe("paramsFromDescriptor", () => {
  it("picks the table from the part id", () => {
    const r = paramsFromDescriptor("core.l298n-module", { kind: "h-bridge", decay: "fast", vdrop_v: 2.55, i_max_a: 2, pwm_max_hz: 25000 });
    expect(r.ok && r.value).toEqual(l298);
  });

  it("refuses an unknown part and a driver that is not an h-bridge", () => {
    const a = paramsFromDescriptor("core.mystery", { kind: "h-bridge" });
    expect(!a.ok && a.error.code).toBe("RB-E-DRIVE");
    const b = paramsFromDescriptor("core.tb6612fng-module", { kind: "step-dir" });
    expect(!b.ok && b.error.code).toBe("RB-E-DRIVE");
  });
});
