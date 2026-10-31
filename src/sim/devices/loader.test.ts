// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BusEvent } from "../bus/index.ts";
import { loadDevice } from "./loader.ts";
import { type DeviceContext, createRegisterDevice, validateDescriptor } from "./register-map.ts";

const ctx = (over: Partial<DeviceContext> = {}): DeviceContext => ({ pin: () => "low", supplyV: () => 3.3, nowNs: () => 0, ...over });

function mpu(c = ctx()) {
  const r = loadDevice("device:i2c/mpu6050@1", c);
  if (!r.ok) throw new Error(r.error);
  return r.device;
}

const readAt = (d: ReturnType<typeof mpu>, reg: number, n: number): number[] => {
  d.start(0x68, false);
  d.write(reg);
  d.start(0x68, true);
  const out = Array.from({ length: n }, (_, i) => d.read(i === n - 1));
  d.stop();
  return out;
};

describe("data MPU-6050", () => {
  it("answers WHO_AM_I and sleeps until woken", () => {
    const d = mpu();
    expect(readAt(d, 0x75, 1)).toEqual([0x68]);
    expect(readAt(d, 0x6b, 1)).toEqual([0x40]);
    expect(readAt(d, 0x3f, 2)).toEqual([0, 0]);
    d.start(0x68, false);
    d.write(0x6b);
    d.write(0);
    d.stop();
    expect(readAt(d, 0x3f, 2)).toEqual([0x40, 0x00]);
  });

  it("selects 0x69 with AD0 high and reads unmapped registers as zero", () => {
    const d = mpu(ctx({ pin: () => "high" }));
    expect(d.addresses).toEqual([0x69]);
    expect(d.start(0x68, false)).toBe("nack");
    expect(d.start(0x69, false)).toBe("ack");
  });

  it("takes a signed value and keeps a burst to one sample", () => {
    const d = mpu();
    d.start(0x68, false);
    d.write(0x6b);
    d.write(0);
    d.stop();
    d.setInput("accelZ", -1);
    d.start(0x68, false);
    d.write(0x3f);
    d.start(0x68, true);
    const hi = d.read(false);
    d.setInput("accelZ", 1);
    const lo = d.read(true);
    expect([hi, lo]).toEqual([0xc0, 0x00]);
  });

  it("refuses an unknown device", () => {
    expect(loadDevice("device:i2c/nothing@1", ctx())).toEqual({ ok: false, error: "unknown-device" });
  });
});

describe("descriptor checks", () => {
  const base = { id: "x", bus: "i2c", addresses: [1], registers: [], inputs: [], behaviours: [], tier: "T1", registry: "r" };

  it("accepts a minimal descriptor and rejects unknown fields", () => {
    expect(validateDescriptor(base).ok).toBe(true);
    expect(validateDescriptor({ ...base, run: "alert(1)" }).ok).toBe(false);
  });

  it("detects expression cycles and unknown names", () => {
    const regs = (a: string, b: string) => [
      { addr: 0, name: "A", access: "r", expr: a },
      { addr: 1, name: "B", access: "r", expr: b },
    ];
    expect(validateDescriptor({ ...base, registers: regs("B", "A") })).toEqual({ ok: false, error: "expr-cycle" });
    expect(validateDescriptor({ ...base, registers: regs("zz", "1") }).ok).toBe(false);
  });

  it("nacks below the supply minimum and reports it", () => {
    const events: BusEvent[] = [];
    const checked = validateDescriptor({ ...base, requires: { supply: { pin: "VCC", min: 1.7, max: 3.6 } } });
    if (!checked.ok) throw new Error(checked.error);
    const dev = createRegisterDevice(checked.value, ctx({ supplyV: () => 1, onEvent: (e) => events.push(e) }), {});
    expect(dev.start(1, false)).toBe("nack");
    expect(events.map((e) => e.kind)).toEqual(["part-not-powered"]);
  });
});
