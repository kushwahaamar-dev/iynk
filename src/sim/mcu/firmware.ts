import { parseLines, type SourceMap } from "../../export/dwarf-lines.ts";
import { parseElf, type ElfImage } from "../../export/elf.ts";
import { parseHex, type ParseError } from "../../export/hex.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { BusId, BusOptions, BusPort } from "../bus/index.ts";
import { createI2cBus } from "../bus/i2c.ts";
import type { SimNetlist, SimPart } from "../engine.ts";
import { bindI2c, instantiateNetlistDevices, netlistContext } from "./i2c-bind.ts";
import { createAvrEngine, type Avr8js, type AvrEngine } from "./avr8js.ts";
import { createBusAdapter } from "./avr8js-bus.ts";
import { createPinAdapter, UNO_PIN_MAP, type PinSink, type PinSource } from "./avr8js-pins.ts";

export interface FirmwareOptions {
  board: "uno-r3" | "nano";
  hex: string;
  elf?: Uint8Array;
  wiring: { pins: PinSink & PinSource; bus: BusPort; busId: BusId; vref: number };
}

export type FirmwareResult =
  | { ok: true; engine: AvrEngine; image: { bytes: number; sourceMap?: SourceMap } }
  | { ok: false; error: ParseError | { kind: "unsupported-board" } };

const FLASH_BYTES = 32768;
const I2C_HZ = 100_000;
export const I2C_BUS: BusId = "i2c0";
const UNO_I2C_PINS = { sda: "A4", scl: "A5" };
const BOARDS: readonly string[] = ["uno-r3", "nano"];

/** Source lines are a convenience: a damaged line table leaves the map out and the image still runs. */
export function sourceMapOf(elf: Uint8Array, image: ElfImage): SourceMap | undefined {
  const section = image.sections.find((s) => s.name === ".debug_line");
  if (!section) return undefined;
  const lines = parseLines(elf.subarray(section.offset, section.offset + section.size), {});
  return lines.ok ? lines.value : undefined;
}

/** Checks an imported hex, and the ELF beside it if there is one, against the flash of the board. */
export function parseFirmware(hex: string, elf?: Uint8Array): { ok: true; bytes: number; elf?: ElfImage } | { ok: false; error: ParseError } {
  const parsed = parseHex(hex, { flashBytes: FLASH_BYTES });
  if (!parsed.ok) return parsed;
  const symbols = elf ? parseElf(elf, { flashBytes: FLASH_BYTES }) : undefined;
  if (symbols && !symbols.ok) return symbols;
  return { ok: true, bytes: parsed.value.bytes, ...(symbols ? { elf: symbols.value } : {}) };
}

/**
 * The I2C bus the Uno's A4 and A5 sit on, with the devices the netlist wires to them. Pins nothing is wired to give a
 * bus with no devices, which nacks every address.
 */
export function netlistBus(
  net: SimNetlist,
  board: string,
  supplyV: number,
  descriptorOf: (part: SimPart) => Descriptor | undefined,
  nowNs: () => number,
  options: BusOptions = {},
): BusPort {
  const onEvent = options.onEvent ?? (() => undefined);
  const bound = bindI2c(net, board, UNO_I2C_PINS, descriptorOf);
  const binding = bound.ok ? bound.binding : { sdaNet: "sda", sclNet: "scl", speedHz: I2C_HZ, pullup: { kind: "assumed" } as const };
  const pullupOhms = "ohms" in binding.pullup ? binding.pullup.ohms : undefined;
  const made = createI2cBus(
    { id: I2C_BUS, sda: binding.sdaNet, scl: binding.sclNet, speedHz: binding.speedHz, pullupOhms },
    { ...options, pullup: binding.pullup.kind === "none" ? "none" : "assumed" },
  );
  if (!made.ok) throw new Error(`i2c bus refused ${binding.speedHz} Hz: ${made.error}`);
  if (bound.ok) {
    const { devices, events } = instantiateNetlistDevices(net, binding, descriptorOf, netlistContext(net, supplyV, nowNs, onEvent));
    events.forEach(onEvent);
    for (const device of devices) made.bus.attach(device);
  }
  return { transact: (_bus, op) => made.bus.transact(op, nowNs()) };
}

export function createFirmwareEngine(avr: Avr8js, o: FirmwareOptions): FirmwareResult {
  if (!BOARDS.includes(o.board)) return { ok: false, error: { kind: "unsupported-board" } };
  const parsed = parseFirmware(o.hex, o.elf);
  if (!parsed.ok) return parsed;
  const engine = createAvrEngine(avr, { board: o.board });
  engine.addAdapter(createPinAdapter({ map: UNO_PIN_MAP, sink: o.wiring.pins, source: o.wiring.pins, vref: o.wiring.vref, onSnapshot: () => undefined }));
  engine.addAdapter(createBusAdapter({ port: o.wiring.bus, i2cBus: o.wiring.busId, i2cHz: I2C_HZ }));
  const sourceMap = o.elf && parsed.elf ? sourceMapOf(o.elf, parsed.elf) : undefined;
  const loaded = engine.load({ kind: "hex", hex: o.hex, elf: o.elf, sourceMap });
  if (!loaded.ok) return { ok: false, error: { kind: loaded.diagnostics[0]?.id ?? "load-failed", message: String(loaded.diagnostics[0]?.args?.message ?? "the engine refused the image") } };
  return { ok: true, engine, image: { bytes: parsed.bytes, ...(sourceMap ? { sourceMap } : {}) } };
}
