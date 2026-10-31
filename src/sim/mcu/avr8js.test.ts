// @vitest-environment node
import * as avr from "avr8js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clockRate, cyclesToNs } from "../core/clock.ts";
import type { EventSink, SimEvent, SliceBudget } from "../engine.ts";
import { createAvrEngine, type AvrContext, type AvrEngine, type HexImage } from "./avr8js.ts";

const RATE = clockRate(125, 2);
const budget: SliceBudget = { shouldYield: () => false, work: { statements: 0, events: 0, outputBytes: 0 } };

function hexOf(words: number[]): HexImage {
  const bytes = words.flatMap((w) => [w & 0xff, w >> 8]);
  const record = (addr: number, type: number, data: number[]) => {
    const body = [data.length, addr >> 8, addr & 0xff, type, ...data];
    const sum = (256 - (body.reduce((a, b) => a + b, 0) % 256)) % 256;
    return ":" + [...body, sum].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  return { kind: "hex", hex: [record(0, 0, bytes), record(0, 1, [])].join("\n") };
}

/** Sets DDRB.5, then toggles PINB.5 every 8 cycles: the toggle is 1 cycle, five NOPs are 5, RJMP is 2. */
const TOGGLE = [
  0xe200, // ldi r16, 0x20
  0xb904, // out DDRB, r16
  0xb903, // loop: out PINB, r16 (toggles PORTB.5)
  0x0000, // nop
  0x0000, // nop
  0x0000, // nop
  0x0000, // nop
  0x0000, // nop
  0xcff9, // rjmp loop
];

/** Enables the transmitter and writes 'A' to UDR0. */
const SEND_A = [
  0xe008, // ldi r16, 0x08 (TXEN0)
  0x9300, // sts UCSR0B, r16
  0x00c1,
  0xe411, // ldi r17, 'A'
  0x9310, // sts UDR0, r17
  0x00c6,
  0xcfff, // rjmp .
];

function setup(words: number[], o: { baud?: number } = {}) {
  const engine = createAvrEngine(avr, { board: "uno-r3", ...o });
  const events: SimEvent[] = [];
  const sink: EventSink = { emit: (e) => events.push({ ...e, seq: events.length }) };
  engine.attach(sink);
  const contexts: AvrContext[] = [];
  engine.addAdapter({ id: "probe", attach: (ctx) => contexts.push(ctx) });
  expect(engine.load(hexOf(words)).ok).toBe(true);
  return { engine, events, contexts };
}

const runOnce = (engine: AvrEngine, cycles: number) => engine.advanceTo(cyclesToNs(cycles, RATE), budget);

function run(engine: AvrEngine, cycles: number): void {
  while (runOnce(engine, cycles).stoppedEarly && engine.stoppedEarlyBy !== "break");
}

describe("avr8js engine", () => {
  it("toggles PORTB.5 every 8 cycles", () => {
    const { engine, events } = setup(TOGGLE);
    run(engine, 800);
    const [driven, ...edges] = events.filter((e) => (e.payload as { pin: string }).pin === "D13");
    expect(driven.at).toBe(cyclesToNs(1, RATE));
    expect(edges).toHaveLength(100);
    edges.forEach((e, k) => expect(e.at).toBe(cyclesToNs(2 + 8 * k, RATE)));
  });

  it("stops a batch right after the pin becomes an output", () => {
    const { engine } = setup(TOGGLE);
    const r = runOnce(engine, 800);
    expect(r.stoppedEarly).toBe(true);
    expect(engine.stoppedEarlyBy).toBe("pin");
    expect(engine.cycles).toBe(2);
  });

  it("stamps a serial byte when its frame ends", () => {
    const { engine } = setup(SEND_A, { baud: 9600 });
    const bytes: [number, number][] = [];
    engine.serial.onByte((b, at) => bytes.push([b, at]));
    run(engine, 100);
    expect(bytes).toHaveLength(1);
    expect(bytes[0][0]).toBe(0x41);
    expect(bytes[0][1]).toBeGreaterThan(1_000_000);
    expect(bytes[0][1]).toBeLessThan(1_100_000);
  });

  it("clears SRAM on a power reset", () => {
    const { engine, contexts } = setup(TOGGLE);
    contexts[0].cpu.data[0x200] = 7;
    engine.reset("power");
    expect(contexts).toHaveLength(2);
    expect(contexts[1].cpu.data[0x200]).toBe(0);
    expect(engine.cycles).toBe(0);
  });

  it("refuses other boards", () => {
    const engine = createAvrEngine(avr, { board: "esp32-devkitc" as "uno-r3" });
    const r = engine.load(hexOf(TOGGLE));
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0].id).toBe("unsupported-board");
  });

  it("refuses an image over 32,768 bytes", () => {
    const engine = createAvrEngine(avr, { board: "nano" });
    const r = engine.load({ kind: "hex", hex: ":02FFFF00000000\n:00000001FF" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0].id).toBe("image-too-large");
  });

  it("refuses a record with a bad checksum", () => {
    const engine = createAvrEngine(avr, { board: "nano" });
    expect(engine.load({ kind: "hex", hex: ":0100000000FE\n:00000001FF" }).diagnostics[0].id).toBe("invalid-hex");
  });

  it("pauses at a break address and reports it", () => {
    const { engine } = setup(TOGGLE);
    const bitmap = new Uint8Array(4096);
    bitmap[0] |= 1 << 5;
    engine.breakBitmap = bitmap;
    const hits: number[] = [];
    engine.onBreak = (pc) => hits.push(pc);
    run(engine, 100);
    expect(hits).toEqual([5]);
    expect(engine.state).toBe("paused");
    expect(engine.stoppedEarlyBy).toBe("break");
  });

  it("gives the same state hash for the same image", () => {
    const a = setup(TOGGLE).engine;
    const b = setup(TOGGLE).engine;
    run(a, 500);
    run(b, 500);
    expect(a.stateHash()).toBe(b.stateHash());
    run(a, 900);
    expect(a.stateHash()).not.toBe(b.stateHash());
  });

  it("halts on an illegal opcode with a diagnostic", () => {
    const { engine } = setup([0x0000, 0x0000, 0xffff]);
    run(engine, 100);
    expect(engine.state).toBe("error");
    expect(engine.diagnostics[0]).toMatchObject({ id: "avr-illegal-opcode", args: { pc: 2 } });
  });
});

describe("build-engines.mjs", () => {
  const script = join(process.cwd(), "scripts/build-engines.mjs");

  it("--check exits 0 against node_modules", () => {
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("--if-present skips an engine whose package is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "engines-"));
    try {
      cpSync(join(process.cwd(), "src/sim-host/engines"), join(root, "src/sim-host/engines"), { recursive: true, filter: (p) => !p.endsWith(".ts") });
      mkdirSync(join(root, "node_modules"));
      expect(readdirSync(join(root, "node_modules"))).toEqual([]);
      const out = execFileSync(process.execPath, [script, "--if-present"], { env: { ...process.env, IYNK_ENGINES_ROOT: root, VERCEL: "" }, encoding: "utf8" });
      expect(out).toContain("SKIPPED avr8js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
