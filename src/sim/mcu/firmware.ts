import { parseLines, type SourceMap } from "../../export/dwarf-lines.ts";
import { parseElf, type ElfImage } from "../../export/elf.ts";
import { parseHex, type ParseError } from "../../export/hex.ts";
import type { BusId, BusPort } from "../bus/index.ts";
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
const BOARDS: readonly string[] = ["uno-r3", "nano"];

/** Source lines are a convenience: a damaged line table leaves the map out and the image still runs. */
export function sourceMapOf(elf: Uint8Array, image: ElfImage): SourceMap | undefined {
  const section = image.sections.find((s) => s.name === ".debug_line");
  if (!section) return undefined;
  const lines = parseLines(elf.subarray(section.offset, section.offset + section.size), {});
  return lines.ok ? lines.value : undefined;
}

export function createFirmwareEngine(avr: Avr8js, o: FirmwareOptions): FirmwareResult {
  if (!BOARDS.includes(o.board)) return { ok: false, error: { kind: "unsupported-board" } };
  const parsed = parseHex(o.hex, { flashBytes: FLASH_BYTES });
  if (!parsed.ok) return parsed;
  const elf = o.elf ? parseElf(o.elf, { flashBytes: FLASH_BYTES }) : undefined;
  if (elf && !elf.ok) return elf;
  const engine = createAvrEngine(avr, { board: o.board });
  engine.addAdapter(createPinAdapter({ map: UNO_PIN_MAP, sink: o.wiring.pins, source: o.wiring.pins, vref: o.wiring.vref, onSnapshot: () => undefined }));
  engine.addAdapter(createBusAdapter({ port: o.wiring.bus, i2cBus: o.wiring.busId, i2cHz: I2C_HZ }));
  const sourceMap = o.elf && elf?.ok ? sourceMapOf(o.elf, elf.value) : undefined;
  const loaded = engine.load({ kind: "hex", hex: o.hex, elf: o.elf, sourceMap });
  if (!loaded.ok) return { ok: false, error: { kind: loaded.diagnostics[0]?.id ?? "load-failed", message: String(loaded.diagnostics[0]?.args?.message ?? "the engine refused the image") } };
  return { ok: true, engine, image: { bytes: parsed.value.bytes, ...(sourceMap ? { sourceMap } : {}) } };
}
