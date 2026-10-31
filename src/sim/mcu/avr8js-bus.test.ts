// @vitest-environment node
import * as avr from "avr8js";
import { describe, expect, it } from "vitest";
import { clockRate, nsToCycles, cyclesToNs } from "../core/clock.ts";
import { createI2cBus, type I2cBusModel, type I2cDevice } from "../bus/i2c.ts";
import { createSpiBus } from "../bus/spi.ts";
import type { BusEvent, BusId, BusOp, BusPort, BusResult, NotModelled } from "../bus/index.ts";
import type { EventSink, SliceBudget } from "../engine.ts";
import { createAvrEngine, type AvrContext, type AvrEngine } from "./avr8js.ts";
import { createBusAdapter } from "./avr8js-bus.ts";

const RATE = clockRate(125, 2);
const budget: SliceBudget = { shouldYield: () => false, work: { statements: 0, events: 0, outputBytes: 0 } };
const sink: EventSink = { emit: () => undefined };

const TWINT = 0x80;
const TWSTA = 0x20;
const TWSTO = 0x10;
const TWEA = 0x40;
const TWEN = 0x04;
const { TWBR, TWSR, TWDR, TWCR } = avr.twiConfig;

const SPIF = 0x80;
const SPE = 0x40;
const MSTR = 0x10;
const { SPCR, SPSR, SPDR } = avr.spiConfig;

function hexOfSpin(): { kind: "hex"; hex: string } {
  return { kind: "hex", hex: ":02000000FFCF30\n:00000001FF" };
}

class Sensor implements I2cDevice {
  readonly addresses = [0x76];
  readonly written: number[] = [];
  start(): "ack" {
    return "ack";
  }
  write(byte: number): "ack" {
    this.written.push(byte);
    return "ack";
  }
  read(): number {
    return 0x60;
  }
  stop(): void {}
}

function rig(o: { spi?: boolean; stubPolicy?: "fail" | "warn" } = {}) {
  const events: BusEvent[] = [];
  const calls: { bus: BusId; op: BusOp; result: BusResult | NotModelled }[] = [];
  const onEvent = (e: BusEvent): void => void events.push(e);
  const sensor = new Sensor();
  const i2c = createI2cBus({ id: "i2c0", sda: "A4", scl: "A5", speedHz: 100_000 }, { onEvent });
  const spi = createSpiBus({ id: "spi0", sck: "D13", mosi: "D11", miso: "D12", mode: 0, hz: 1_000_000, bitOrder: "msb" }, { onEvent, stubPolicy: o.stubPolicy });
  if (!i2c.ok || !spi.ok) throw new Error("bus setup");
  const i2cBus: I2cBusModel = i2c.bus;
  i2cBus.attach(sensor);
  const port: BusPort = {
    transact(bus, op) {
      const result = bus === "i2c0" ? i2cBus.transact(op, 0) : bus === "spi0" ? spi.bus.transact(op, 0) : { notModelled: true as const, reason: `unknown bus ${bus}`, causeId: "bus-device-not-modelled" as const };
      calls.push({ bus, op, result });
      return result;
    },
  };
  const unmodelled: string[] = [];
  const engine: AvrEngine = createAvrEngine(avr, { board: "uno-r3" });
  engine.attach(sink);
  let ctx!: AvrContext;
  engine.addAdapter({ id: "probe", attach: (c) => (ctx = c) });
  engine.addAdapter(
    createBusAdapter({
      port,
      i2cBus: "i2c0",
      i2cHz: 100_000,
      ...(o.spi ? { spiBus: "spi0", cs: "D10" } : {}),
      stubPolicy: o.stubPolicy,
      onUnmodelled: (n) => unmodelled.push(n.reason),
      onEvent,
    }),
  );
  expect(engine.load(hexOfSpin()).ok).toBe(true);
  return { engine, ctx, events, calls, sensor, unmodelled };
}

/** Writes `reg`, then runs until `flag` is set and returns the cycles that took. */
function waitFor(engine: AvrEngine, ctx: AvrContext, flagReg: number, flag: number): number {
  const start = ctx.cpu.cycles;
  while (!(ctx.cpu.data[flagReg] & flag)) {
    engine.advanceTo(cyclesToNs(ctx.cpu.cycles + 1, RATE), budget);
    if (ctx.cpu.cycles - start > 1_000_000) throw new Error("never completed");
  }
  return ctx.cpu.cycles - start;
}

function twi(engine: AvrEngine, ctx: AvrContext, control: number): number {
  ctx.cpu.writeData(TWCR, TWINT | TWEN | control);
  return waitFor(engine, ctx, TWCR, TWINT);
}

const status = (ctx: AvrContext): number => ctx.cpu.data[TWSR] & 0xf8;
const cost = (ns: number): number => nsToCycles(ns, RATE);

describe("avr8js bus adapter: TWI", () => {
  it("writes one byte to 0x76 in the cycles the bus model charges", () => {
    const { engine, ctx, sensor } = rig();
    ctx.cpu.writeData(TWBR, 72);
    const total = [
      twi(engine, ctx, TWSTA),
      (ctx.cpu.writeData(TWDR, 0x76 << 1), twi(engine, ctx, 0)),
      (ctx.cpu.writeData(TWDR, 0xf4), twi(engine, ctx, 0)),
      twi(engine, ctx, TWSTO),
    ];
    expect(status(ctx)).toBe(0xf8);
    expect(sensor.written).toEqual([0xf4]);
    const bitNs = 1e9 / 100_000;
    const model = [cost(Math.round(10 * bitNs)), cost(Math.round(9 * bitNs)), cost(Math.round(bitNs))];
    // two cycles of fixed latency per call: the TWCR write takes effect one cycle later, and the loop reads the flag one cycle after the completion
    expect(total.slice(1)).toEqual(model.map((c) => c + 2));
  });

  it("sets status 0x20 when the address is not acknowledged", () => {
    const { engine, ctx, events } = rig();
    ctx.cpu.writeData(TWBR, 72);
    twi(engine, ctx, TWSTA);
    ctx.cpu.writeData(TWDR, 0x50 << 1);
    twi(engine, ctx, 0);
    expect(status(ctx)).toBe(0x20);
    expect(events.some((e) => e.kind === "nack")).toBe(true);
  });

  it("sets status 0x48 when a read address is not acknowledged", () => {
    const { engine, ctx } = rig();
    twi(engine, ctx, TWSTA);
    ctx.cpu.writeData(TWDR, (0x50 << 1) | 1);
    twi(engine, ctx, 0);
    expect(status(ctx)).toBe(0x48);
  });

  it("reads two bytes and ends with a NACK", () => {
    const { engine, ctx, calls } = rig();
    twi(engine, ctx, TWSTA);
    ctx.cpu.writeData(TWDR, (0x76 << 1) | 1);
    twi(engine, ctx, 0);
    expect(status(ctx)).toBe(0x40);
    twi(engine, ctx, TWEA);
    expect(status(ctx)).toBe(0x50);
    expect(ctx.cpu.data[TWDR]).toBe(0x60);
    twi(engine, ctx, 0);
    expect(status(ctx)).toBe(0x58);
    expect(calls.filter((c) => c.op.kind === "i2c-read").map((c) => (c.op as { last: boolean }).last)).toEqual([false, true]);
  });

  it("charges more cycles at a slower TWBR", () => {
    const fast = rig();
    fast.ctx.cpu.writeData(TWBR, 72);
    const slow = rig();
    slow.ctx.cpu.writeData(TWBR, 144);
    const a = twi(fast.engine, fast.ctx, TWSTA) + (fast.ctx.cpu.writeData(TWDR, 0x76 << 1), twi(fast.engine, fast.ctx, 0));
    const b = twi(slow.engine, slow.ctx, TWSTA) + (slow.ctx.cpu.writeData(TWDR, 0x76 << 1), twi(slow.engine, slow.ctx, 0));
    const ratio = (b - 2) / (a - 2);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.1);
  });

  it("disables itself with one event when the bus id is unknown", () => {
    const events: BusEvent[] = [];
    const engine = createAvrEngine(avr, { board: "uno-r3" });
    engine.attach(sink);
    let ctx!: AvrContext;
    engine.addAdapter({ id: "probe", attach: (c) => (ctx = c) });
    const port: BusPort = { transact: () => ({ notModelled: true, reason: "unknown bus", causeId: "bus-device-not-modelled" }) };
    engine.addAdapter(createBusAdapter({ port, i2cBus: "nope", i2cHz: 100_000, stubPolicy: "warn", onEvent: (e) => events.push(e) }));
    engine.load(hexOfSpin());
    twi(engine, ctx, TWSTA);
    ctx.cpu.writeData(TWDR, 0x76 << 1);
    twi(engine, ctx, 0);
    expect(status(ctx)).toBe(0x20);
    expect(events).toHaveLength(1);
  });
});

describe("avr8js bus adapter: SPI", () => {
  it("returns 0xFF and the event when no device sits on the chip select", () => {
    const { engine, ctx, events, unmodelled } = rig({ spi: true, stubPolicy: "warn" });
    ctx.cpu.writeData(SPCR, SPE | MSTR);
    ctx.cpu.writeData(SPDR, 0x9f);
    waitFor(engine, ctx, SPSR, SPIF);
    expect(ctx.cpu.data[SPDR]).toBe(0xff);
    expect(events.filter((e) => e.kind === "not-modelled")).toHaveLength(1);
    expect(unmodelled).toEqual([]);
  });

  it("stops the batch and reports the cause under the fail policy", () => {
    const { engine, ctx, unmodelled } = rig({ spi: true, stubPolicy: "fail" });
    const stops: string[] = [];
    ctx.requestStop = (reason) => stops.push(reason);
    ctx.cpu.writeData(SPCR, SPE | MSTR);
    ctx.cpu.writeData(SPDR, 0x9f);
    expect(unmodelled).toEqual(["no device on chip select D10"]);
    expect(stops).toEqual(["bus"]);
    waitFor(engine, ctx, SPSR, SPIF);
    expect(ctx.cpu.data[SPDR]).toBe(0xff);
  });
});
