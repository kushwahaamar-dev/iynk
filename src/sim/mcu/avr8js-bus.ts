import type { TWIEventHandler } from "avr8js";
import { nsToCycles } from "../core/clock.ts";
import type { BusEvent, BusId, BusOp, BusPort, BusResult, NetId, NotModelled, StubPolicy } from "../bus/index.ts";
import type { AvrAdapter, AvrContext } from "./avr8js.ts";

export interface BusAdapterOptions {
  port: BusPort;
  i2cBus: BusId;
  /** The speed the I2C bus model was built with. Byte times scale from it to the rate `TWBR` and `TWSR` select. */
  i2cHz: number;
  spiBus?: BusId;
  /** Chip select the sketch's SPI traffic is addressed to. Without it the SPI peripheral keeps avr8js' loopback. */
  cs?: NetId;
  /** `fail` stops the batch on a transfer nobody models and reports it through `onUnmodelled`. */
  stubPolicy?: StubPolicy;
  onUnmodelled?: (n: NotModelled, pc: number) => void;
  onEvent?: (e: BusEvent) => void;
}

const isUnmodelled = (r: BusResult | NotModelled): r is NotModelled => "notModelled" in r;

export function createBusAdapter(o: BusAdapterOptions): AvrAdapter {
  return {
    id: "bus",
    attach(ctx) {
      installTwi(ctx, o);
      if (o.spiBus !== undefined && o.cs !== undefined) installSpi(ctx, o, o.spiBus, o.cs);
    },
  };
}

function notModelled(ctx: AvrContext, o: BusAdapterOptions, bus: BusId, n: NotModelled): void {
  o.onEvent?.({ atNs: ctx.cyclesToNs(ctx.cpu.cycles), bus, kind: "not-modelled", detail: n.reason });
  if (o.stubPolicy === "warn") return;
  ctx.requestStop("bus");
  o.onUnmodelled?.(n, ctx.cpu.pc);
}

function installTwi(ctx: AvrContext, o: BusAdapterOptions): void {
  const { twi, cpu } = ctx;
  let disabled = false;
  let ack = false;
  let byte = 0;

  const doneStart = (): void => twi.completeStart();
  const doneStop = (): void => twi.completeStop();
  const doneConnect = (): void => twi.completeConnect(ack);
  const doneWrite = (): void => twi.completeWrite(ack);
  const doneRead = (): void => twi.completeRead(byte);

  const transact = (op: BusOp, done: () => void): void => {
    ack = false;
    byte = 0xff;
    let costNs = 0;
    if (!disabled) {
      const r = o.port.transact(o.i2cBus, op);
      if (isUnmodelled(r)) {
        disabled = true;
        notModelled(ctx, o, o.i2cBus, r);
      } else {
        ack = r.ack ?? false;
        byte = r.byte ?? 0xff;
        costNs = Math.round((r.costNs * o.i2cHz) / twi.sclFrequency);
      }
    }
    cpu.addClockEvent(done, nsToCycles(costNs, ctx.clock));
  };

  const handler: TWIEventHandler = {
    start: () => {
      cpu.addClockEvent(doneStart, 1);
    },
    connectToSlave: (addr, write) => transact({ kind: "i2c-start", addr7: addr, read: !write }, doneConnect),
    writeByte: (value) => transact({ kind: "i2c-write", byte: value }, doneWrite),
    readByte: (withAck) => transact({ kind: "i2c-read", last: !withAck }, doneRead),
    stop: () => transact({ kind: "i2c-stop" }, doneStop),
  };
  twi.eventHandler = handler;
}

function installSpi(ctx: AvrContext, o: BusAdapterOptions, bus: BusId, cs: NetId): void {
  const { spi, cpu } = ctx;
  let received = 0xff;
  const done = (): void => spi.completeTransfer(received);

  spi.onByte = (value) => {
    received = 0xff;
    let costNs = 0;
    const r = o.port.transact(bus, { kind: "spi-transfer", cs, byte: value });
    if (isUnmodelled(r)) notModelled(ctx, o, bus, r);
    else {
      received = r.byte ?? 0xff;
      costNs = r.costNs;
    }
    cpu.addClockEvent(done, nsToCycles(costNs, ctx.clock));
  };
}
