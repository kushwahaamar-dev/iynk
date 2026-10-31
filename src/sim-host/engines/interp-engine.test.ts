// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardContent } from "@/content/schema";
import { boardLoaders } from "@/content/index.generated";
import { defaultParams, renderTemplate, resolveText } from "@/lib/boardlab/template";
import { INTERP_LANGUAGE, lessonJob, runHeadless, runOptionsFor, pinNet, BOARD_IDS, PROFILES, getProfile, type CheckJob } from "@/lib/interp";
import { RANK, type EventSink, type SourceProgram, type SimEvent, type SliceBudget } from "@/sim/engine";
import { createInterpEngine, opNsOf, toSimLanguage, type InterpEngine, type InterpEngineOptions } from "./interp-engine";

const BLINK = `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  digitalWrite(13, HIGH);
  Serial.println("on");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("off");
  delay(500);
}
`;

const PICO_BLINK = `from machine import Pin
import time
led = Pin(25, Pin.OUT)
while True:
    led.toggle()
    time.sleep(0.5)
`;

const COUNTER = `module top(input clk, output [7:0] led);
  reg [7:0] n = 0;
  always @(posedge clk) n <= n + 1;
  assign led = n;
endmodule
`;

const MS = 1_000_000;

const BUDGET: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };

const image = (language: SourceProgram["language"], text: string): SourceProgram => ({
  kind: "source",
  language,
  files: [{ path: "main", text }],
  entry: "main",
});

interface Collected {
  engine: InterpEngine;
  events: Omit<SimEvent, "seq">[];
}

function boot(o: Partial<InterpEngineOptions>, text: string, language: SourceProgram["language"] = "arduino-cpp"): Collected {
  const engine = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: 1, ...o });
  const events: Omit<SimEvent, "seq">[] = [];
  const sink: EventSink = { emit: (e) => events.push(e) };
  engine.attach(sink);
  expect(engine.load(image(language, text)).ok).toBe(true);
  return { engine, events };
}

const reached = new WeakMap<InterpEngine, number>();

/** Runs the engine in the orchestrator's 1 ms slices up to `ms` of virtual time. */
const runTo = (engine: InterpEngine, ms: number) => {
  for (let t = (reached.get(engine) ?? 0) + 1; t <= ms; t++) engine.advanceTo(t * MS, BUDGET);
  reached.set(engine, ms);
};

describe("createInterpEngine", () => {
  it("emits Blink edges on pin 13 every 500 ms as P2 events", () => {
    const { engine, events } = boot({}, BLINK);
    runTo(engine, 2000);
    const edges = events.filter((e) => (e.payload as { pin: string }).pin === "D13");
    // The first edge is pinMode settling the floating pin; the four after it are the blink.
    expect(edges.map((e) => Math.round(e.at / MS)).slice(1)).toEqual([0, 500, 1000, 1500]);
    expect(edges.every((e) => e.phase === 2 && e.rank === RANK.mcu && e.kind === "pin" && e.src === "mcu")).toBe(true);
    expect(engine.serialLog.slice(0, 3).map((s) => [Math.round(s.at / MS), s.text])).toEqual([
      [0, "on\r\n"],
      [500, "off\r\n"],
      [1000, "on\r\n"],
    ]);
    expect(engine.nextDue()).toBe(2001 * MS);
  });

  it("runs a Pico MicroPython blink", () => {
    const { engine, events } = boot({ id: "pico", board: "pico", language: "python" }, PICO_BLINK, "micropython");
    runTo(engine, 1600);
    const edges = events.filter((e) => (e.payload as { pin: string }).pin === "GP25");
    expect(edges.map((e) => Math.round(e.at / MS)).slice(1)).toEqual([0, 500, 1000, 1500]);
  });

  it("runs a Verilog counter whose time follows simulated cycles", () => {
    const { engine } = boot({ id: "fpga", board: "basys3", language: "verilog" }, COUNTER, "verilog");
    runTo(engine, 3);
    expect(engine.run.snapshot().ports?.led).toBeGreaterThan(0);
    expect(engine.costModel.kind).toBe("cycle");
    expect(engine.nextDue()).toBe(4 * MS);
  });

  it("returns a compile error with a line", () => {
    const engine = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: 1 });
    const result = engine.load(image("arduino-cpp", "void setup() {\n  digitalWrite(13, HIGH)\n}\nvoid loop() {}\n"));
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ id: "compile-error", severity: "error", text_key: "diag.compile-error", ref: { file: "main" } });
    expect(result.diagnostics[0].ref.line).toBeGreaterThan(0);
    expect(engine.nextDue()).toBeNull();
  });

  it("rejects an unknown board, a language the board does not run and a missing entry", () => {
    const unknown = createInterpEngine({ id: "x", board: "no-such" as never, language: "arduino", seed: 1 });
    expect(unknown.load(image("arduino-cpp", BLINK)).diagnostics[0].id).toBe("unknown-board");
    const wrong = createInterpEngine({ id: "x", board: "uno-r3", language: "python", seed: 1 });
    expect(wrong.load(image("python", "pass")).diagnostics[0].id).toBe("unsupported-language");
    const mismatch = createInterpEngine({ id: "x", board: "uno-r3", language: "arduino", seed: 1 });
    expect(mismatch.load(image("verilog", "")).diagnostics[0].id).toBe("language-mismatch");
    expect(mismatch.load({ ...image("arduino-cpp", BLINK), entry: "other" }).diagnostics[0].id).toBe("missing-entry");
  });

  it("reports a limit error as a halting diagnostic and stops being due", () => {
    const { engine } = boot({ id: "pico", board: "pico", language: "python" }, "x = [0] * 10**9\n", "micropython");
    runTo(engine, 2);
    expect(engine.diagnostics[0]).toMatchObject({ id: "limit-exceeded", severity: "error" });
    expect(engine.nextDue()).toBeNull();
    expect(engine.advanceTo(10 * MS, BUDGET).reached).toBe(10 * MS);
  });

  it("keeps time and edges going across a reset, which replaces the World", () => {
    const { engine, events } = boot({}, BLINK);
    runTo(engine, 700);
    const world = engine.run.world;
    engine.reset("button");
    expect(engine.run.world).not.toBe(world);
    expect(events.at(-1)).toMatchObject({ at: 700 * MS, payload: { pin: "D13", level: "Z" } });
    runTo(engine, 1300);
    const after = events.filter((e) => e.at >= 700 * MS && (e.payload as { level: unknown }).level !== "Z");
    expect(after.map((e) => Math.round(e.at / MS))).toEqual([700, 700, 1200]);
  });

  it("applies orchestrator inputs and serial text", () => {
    const echo = `void setup() { Serial.begin(9600); pinMode(2, INPUT); }
void loop() {
  if (Serial.available()) Serial.print((char)Serial.read());
  if (digitalRead(2)) Serial.println("hi");
  delay(1);
}
`;
    const { engine } = boot({}, echo);
    runTo(engine, 2);
    engine.onEvent({ at: 2 * MS, phase: 0, rank: 0, seq: 1, src: "host", kind: "pin", payload: { target: "D2", value: 1 } });
    engine.onEvent({ at: 2 * MS, phase: 0, rank: 0, seq: 2, src: "host", kind: "serial", payload: { target: "serial", value: "z" } });
    runTo(engine, 5);
    const text = engine.serialLog.map((s) => s.text).join("");
    expect(text).toContain("z");
    expect(text).toContain("hi");
  });

  it("hashes the same for the same run and differently once a pin changes", () => {
    const a = boot({}, BLINK).engine;
    const b = boot({}, BLINK).engine;
    runTo(a, 600);
    runTo(b, 600);
    expect(a.stateHash()).toBe(b.stateHash());
    runTo(b, 700);
    expect(a.stateHash()).not.toBe(b.stateHash());
  });
});

describe("opNsOf", () => {
  it("is the cost of one statement in ns for all 12 profiles", () => {
    const expected: Record<string, number> = {
      "uno-r3": 1000, nano: 1000, "uno-r4": 400, "esp32-devkitc": 100, "esp32-s3-devkitc-1": 100, nodemcu: 250,
      pico: 4000, "nucleo-f401re": 250, "microbit-v2": 6000, "pi4-pi5": 50, basys3: 0, "de10-lite": 0,
    };
    expect(BOARD_IDS).toHaveLength(12);
    for (const id of BOARD_IDS) expect(opNsOf(PROFILES[id]), id).toBe(expected[id]);
    expect(toSimLanguage("arduino")).toBe("arduino-cpp");
    expect(getProfile("pico").opUs).toBe(4);
  });
});

const root = process.cwd();

/** Jobs that write plain pin levels: the trace of PWM, tones and displays is sampled from snapshots, not from edges, and the first 2 ms of any trace are initial snapshot samples. */
const DIGITAL = /digitalWrite|\.(?:on|off|toggle|value)\(/;
const ANALOG = /analog|tone|Servo|Wire|matrix|PWM|NeoPixel|Adafruit/i;

function prose(id: string): (key: string) => string {
  const file = join(root, "src/i18n/content/en/boards", `${id}.json`);
  const json: unknown = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  return (key) => {
    const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), json);
    return typeof v === "string" ? v : key;
  };
}

async function referenceJobs(count: number): Promise<{ name: string; job: CheckJob }[]> {
  const jobs: { name: string; job: CheckJob }[] = [];
  for (const [id, load] of Object.entries(boardLoaders) as [string, () => Promise<{ default: BoardContent }>][]) {
    const board = (await load()).default;
    const text = prose(id);
    for (const lesson of board.lessons) {
      if (lesson.world.inputs.length > 0 || lesson.language === "verilog") continue;
      const source = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
      if (!DIGITAL.test(source) || ANALOG.test(source)) continue;
      jobs.push({ name: `${id} / ${lesson.id}`, job: lessonJob(board, lesson, source) });
    }
  }
  return jobs.slice(0, count);
}

describe("against runHeadless", async () => {
  const jobs = await referenceJobs(10);

  it.each(jobs.map((j) => [j.name, j.job] as const))("%s", (_name, job) => {
    const trace = runHeadless(job);
    const profile = getProfile(job.board as never, job.variant ?? undefined);
    const { devices, world } = runOptionsFor(job.world);
    const engine = createInterpEngine({
      id: "mcu",
      board: profile.id,
      variant: job.variant ?? undefined,
      language: INTERP_LANGUAGE[job.language],
      seed: 1,
      devices,
      world,
    });
    expect(engine.load(image(job.language, job.source)).ok).toBe(true);
    runTo(engine, trace.ms);

    const lines = engine.serialLog.map((s) => s.text).join("").split("\n").map((l) => l.replace(/\r$/, ""));
    if (lines.at(-1) === "") lines.pop();
    expect(lines).toEqual(trace.serial.map((l) => l.text));

    const nets = new Map<string, string[]>();
    for (const e of engine.edgeLog) {
      const net = pinNet(profile, e.pin, job.nets);
      nets.set(net, [...(nets.get(net) ?? []), `${e.at}:${e.level}`]);
    }
    for (const [net, samples] of Object.entries(trace.pins)) {
      const traced = samples.filter((p) => p.t >= 2 && (p.mode === "out" || p.mode === "in" || p.mode === "pullup")).map((p) => `${Math.round(p.t * MS)}:${p.v}`);
      expect(nets.get(net) ?? [], net).toEqual(expect.arrayContaining(traced));
    }
    expect(nets.size).toBeGreaterThan(0);
  });
});
