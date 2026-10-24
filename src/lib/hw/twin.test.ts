import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeviceModel, WorldInput } from "@/content/schema";
import { FirmataBoard } from "./board";
import { PinMode } from "./firmata";
import { attachFakeUno, FakeSerialPort, firmwareReport } from "./testing";
import { inputValue, pinOfNet, TwinBridge, type SimFrame, type TwinSim } from "./twin";
import { getProfile } from "@/lib/interp/profiles";

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
const flush = async () => {
  // Each queued serial write settles over a few promise turns.
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

function worldInput(id: string, net: string, device: DeviceModel, min = 0, max = 1, step = 1): WorldInput {
  return { id, quantity: "level", device, pins: [net], part: id, min, max, step, default: min, gesture: "knob", label: `lessons.x.world.${id}` };
}

function fakeSim(initial: Partial<SimFrame> = {}) {
  let frame: SimFrame = { boardId: "uno-r3", running: true, pins: {}, inputs: [], inputsReady: true, ...initial };
  const listeners = new Set<() => void>();
  const setInput = vi.fn<(id: string, value: number) => void>();
  const sim: TwinSim = {
    getFrame: () => frame,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setInput,
  };
  return {
    sim,
    setInput,
    update(patch: Partial<SimFrame>) {
      frame = { ...frame, ...patch };
      for (const l of listeners) l();
    },
  };
}

async function setup(frame: Partial<SimFrame>, options = { drive: true, sense: true }) {
  const port = new FakeSerialPort();
  attachFakeUno(port);
  const board = await FirmataBoard.connect(port, { quietMs: 20, identifyMs: 200, replyMs: 100 });
  port.takeWritten();
  vi.useFakeTimers();
  const s = fakeSim(frame);
  const bridge = new TwinBridge(board, s.sim, options, () => Date.now());
  bridge.start();
  await flush();
  return { port, board, bridge, ...s };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("inputValue", () => {
  const vcc = 5;
  it("inverts the board lab's device models", () => {
    expect(inputValue(worldInput("p", "A0", { kind: "pot", ohms: 10_000 }, 0, 100, 1), { volts: 2.5 }, vcc)).toBe(50);
    expect(inputValue(worldInput("p", "A0", { kind: "pot", ohms: 10_000 }, 0, 270, 0.5), { volts: 5.2 }, vcc)).toBe(270);
    expect(inputValue(worldInput("l", "A0", { kind: "linear", voltsAtMin: 0.5, voltsAtMax: 4.5 }, 0, 100, 1), { volts: 2.5 }, vcc)).toBe(50);
    expect(inputValue(worldInput("t", "A0", { kind: "tmp36" }, -40, 125, 0.1), { volts: 0.75 }, vcc)).toBe(25);
    // An LDR over a 10 kΩ resistor to GND reads half the supply at 10 lux (the board lab's GL5528 model).
    expect(inputValue(worldInput("d", "A0", { kind: "divider", sensor: "ldr", fixedOhms: 10_000, sensorTo: "gnd" }, 0, 1000, 1), { volts: 2.5 }, vcc)).toBe(10);
    expect(inputValue(worldInput("u", "A0", { kind: "hc-sr04" }, 2, 400, 1), { volts: 2.5 }, vcc)).toBeNull();
  });

  it("reads buttons by their pull and switches by level", () => {
    const up = worldInput("b", "D2", { kind: "button", pull: "internal-up", bounceMs: 5 });
    const down = worldInput("b", "D2", { kind: "button", pull: "external-down", bounceMs: 5 });
    expect(inputValue(up, { level: 0 }, vcc)).toBe(1);
    expect(inputValue(up, { level: 1 }, vcc)).toBe(0);
    expect(inputValue(down, { level: 1 }, vcc)).toBe(1);
    expect(inputValue(worldInput("s", "D4", { kind: "switch" }), { level: 1 }, vcc)).toBe(1);
  });

  it("resolves net names to Uno pins", () => {
    const uno = getProfile("uno-r3");
    expect(pinOfNet(uno, "D13")).toBe(13);
    expect(pinOfNet(uno, "A0")).toBe(14);
    expect(pinOfNet(uno, "LED_BUILTIN")).toBe(13);
    expect(pinOfNet(uno, "5V")).toBeUndefined();
  });
});

describe("TwinBridge: sim drives the real board", () => {
  it("makes every free digital pin high-impedance first (StandardFirmata boots them as OUTPUT LOW)", async () => {
    const { port, bridge } = await setup({ running: false });
    const written = hex(port.takeWritten());
    for (let pin = 2; pin <= 13; pin++) expect(written).toContain(`f4 ${pin.toString(16).padStart(2, "0")} 00`);
    expect(written).not.toContain("f4 00 00");
    expect(written).not.toContain("f4 01 00");
    expect(written).toContain("f0 7a 28 00 f7"); // 40 ms analog sampling
    bridge.stop();
  });

  it("mirrors Blink on pin 13 and coalesces changes to 30 Hz", async () => {
    const { port, bridge, update } = await setup({ pins: { 13: { mode: "output", level: 1 } } });
    expect(hex(port.takeWritten())).toContain("f4 0d 01 91 20 00");
    update({ pins: { 13: { mode: "output", level: 0 } } });
    update({ pins: { 13: { mode: "output", level: 1 } } });
    update({ pins: { 13: { mode: "output", level: 0 } } });
    await flush();
    expect(port.takeWritten()).toEqual([]);
    await vi.advanceTimersByTimeAsync(40);
    expect(hex(port.takeWritten())).toBe("91 00 00");
    expect(bridge.getReport().pins.find((p) => p.pin === 13)?.role).toEqual({ kind: "out", mode: "digital", value: 0 });
    bridge.stop();
  });

  it("PWM duty becomes an 8-bit analog write and a servo gets SERVO_CONFIG", async () => {
    const { port, bridge } = await setup({
      pins: { 9: { mode: "output", level: 1, duty: 0.5, hz: undefined }, 10: { mode: "output", level: 0, servoUs: 1500 } },
    });
    const written = hex(port.takeWritten());
    expect(written).toContain("f4 09 03 e9 00 01");
    expect(written).toContain("f0 70 0a 20 04 60 12 f7 ea 5c 0b");
    bridge.stop();
  });

  it("refuses the serial pins, tone and pins the lesson wires as inputs", async () => {
    const button = worldInput("btn", "D2", { kind: "button", pull: "external-down", bounceMs: 5 });
    const { port, bridge, board } = await setup(
      {
        inputs: [button],
        pins: { 1: { mode: "output", level: 1 }, 2: { mode: "output", level: 1 }, 8: { mode: "output", level: 1, hz: 440 } },
      },
      { drive: true, sense: false },
    );
    const written = hex(port.takeWritten());
    expect(written).not.toMatch(/f4 0[128] 01/);
    expect(board.pin(2)?.mode).toBe(PinMode.INPUT);
    const roles = Object.fromEntries(bridge.getReport().pins.map((p) => [p.pin, p.role]));
    expect(roles[1]).toEqual({ kind: "blocked", reason: "serial" });
    expect(roles[2]).toEqual({ kind: "blocked", reason: "lesson-input" });
    expect(roles[8]).toEqual({ kind: "blocked", reason: "tone" });
    bridge.stop();
  });

  it("turning drive off, or stopping the run, leaves outputs LOW and high-impedance", async () => {
    const { port, bridge, update } = await setup({ pins: { 13: { mode: "output", level: 1 } } });
    port.takeWritten();
    bridge.set({ drive: false });
    await flush();
    expect(hex(port.takeWritten())).toBe("91 00 00 f4 0d 00");
    bridge.set({ drive: true });
    await flush();
    expect(hex(port.takeWritten())).toBe("f4 0d 01 91 20 00");
    update({ running: false, pins: {} });
    await vi.advanceTimersByTimeAsync(40);
    expect(hex(port.takeWritten())).toBe("91 00 00 f4 0d 00");
    bridge.stop();
  });

  it("drives nothing until the lesson's inputs are known", async () => {
    const { port, bridge, update } = await setup({ inputsReady: false, pins: { 13: { mode: "output", level: 1 } } });
    expect(hex(port.takeWritten())).not.toContain("f4 0d 01");
    update({ inputsReady: true });
    await vi.advanceTimersByTimeAsync(40);
    expect(hex(port.takeWritten())).toContain("f4 0d 01 91 20 00");
    bridge.stop();
  });

  it("re-applies the safe state and the sketch after the board resets itself", async () => {
    const { port, bridge } = await setup({ pins: { 13: { mode: "output", level: 1 } } });
    port.takeWritten();
    port.deviceSend(firmwareReport());
    await flush();
    const written = hex(port.takeWritten());
    expect(written).toContain("f4 02 00");
    expect(written).toContain("f4 0d 01 91 20 00");
    bridge.stop();
  });

  it("does nothing for a board that is not numbered like an Uno", async () => {
    const { port, bridge } = await setup({ boardId: "esp32-devkitc", pins: { 13: { mode: "output", level: 1 } } });
    expect(hex(port.takeWritten())).not.toContain("f4 0d 01");
    expect(bridge.getReport().compatible).toBe(false);
    bridge.stop();
  });
});

describe("TwinBridge: real inputs feed the sim", () => {
  const pot = worldInput("pot", "A0", { kind: "pot", ohms: 10_000 }, 0, 100, 1);

  it("reports A0 and maps readings onto the lesson's potentiometer at 10 Hz with a dead band", async () => {
    const { port, bridge, setInput } = await setup({ inputs: [pot], running: false });
    expect(hex(port.takeWritten())).toContain("f4 0e 02 c0 01");
    port.deviceSend([0xe0, 0x00, 0x04]); // 512
    await flush();
    expect(setInput).toHaveBeenLastCalledWith("pot", 50);
    port.deviceSend([0xe0, 0x58, 0x04]); // 600, too soon
    await flush();
    expect(setInput).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(setInput).toHaveBeenLastCalledWith("pot", 59);
    port.deviceSend([0xe0, 0x59, 0x04]); // 601: inside the dead band
    await flush();
    await vi.advanceTimersByTimeAsync(150);
    expect(setInput).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(400);
    expect(setInput).toHaveBeenCalledTimes(3);
    bridge.stop();
    await flush();
    expect(hex(port.takeWritten())).toContain("c0 00 f4 0e 00");
  });

  it("reads a pull-up button on D2 through digital port reports", async () => {
    const button = worldInput("btn", "D2", { kind: "button", pull: "internal-up", bounceMs: 5 });
    const { port, bridge, setInput } = await setup({ inputs: [button], running: false });
    expect(hex(port.takeWritten())).toContain("f4 02 0b d0 01");
    port.deviceSend([0x90, 0x00, 0x00]); // D2 low = pressed
    await flush();
    expect(setInput).toHaveBeenLastCalledWith("btn", 1);
    port.deviceSend([0x90, 0x04, 0x00]); // released 5 ms later
    await flush();
    await vi.advanceTimersByTimeAsync(25);
    expect(setInput).toHaveBeenLastCalledWith("btn", 0);
    bridge.stop();
  });

  it("stops feeding the sim when sensing is turned off", async () => {
    const { port, bridge, setInput } = await setup({ inputs: [pot], running: false });
    bridge.set({ sense: false });
    port.deviceSend([0xe0, 0x00, 0x04]);
    await flush();
    await vi.advanceTimersByTimeAsync(500);
    expect(setInput).not.toHaveBeenCalled();
    bridge.stop();
  });
});
