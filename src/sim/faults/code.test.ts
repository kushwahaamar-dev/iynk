// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CODE_RULES } from "./code.ts";
import { extractCodeFacts } from "./code-facts.ts";
import { viewOf, type PartSpec } from "./circuit.fixture.ts";
import { runRules } from "./rules.ts";
import type { CodeFacts, Finding } from "./types.ts";
import type { Instrument } from "../../project/generated/types.ts";

const sketch = (src: string): CodeFacts => extractCodeFacts({ "main.ino": src }, ["main.ino"], { variant: "uno-r3" });
const uno = (wires: Record<string, string>): PartSpec => ({ id: "uno", ref: "uno-r3", wires });
const led = (wires: Record<string, string>): PartSpec => ({ id: "d1", ref: "led-5mm", wires });
const resistor = (id: string, p1: string, p2: string): PartSpec => ({ id, ref: "resistor", wires: { P1: p1, P2: p2 } });
const oled = (wires: Record<string, string>): PartSpec => ({ id: "oled", ref: "ssd1306", wires });

const ledOn = (pin: string): PartSpec[] => [uno({ [pin]: "n_d", GND: "gnd" }), resistor("r1", "n_d", "n_led"), led({ A: "n_led", K: "gnd" })];

const check = (id: string, specs: PartSpec[], code: CodeFacts, instruments?: Instrument[]): Finding[] =>
  runRules(CODE_RULES.filter((r) => r.id === id), { view: viewOf(specs), code, instruments }).findings;

const apply = (src: string, ops: { pos: number; del: number; ins: string }[]) =>
  ops.reduce((text, o) => text.slice(0, o.pos) + o.ins + text.slice(o.pos + o.del), src);

describe("code:pin-mismatch@1", () => {
  const id = "code:pin-mismatch@1";
  const src = "const int ledPin = 13;\nvoid setup() { pinMode(ledPin, OUTPUT); }\nvoid loop() { digitalWrite(ledPin, HIGH); }\n";

  it("names both pins and offers a code fix and a wiring fix", () => {
    const [f, ...rest] = check(id, ledOn("D12"), sketch(src));
    expect(rest).toEqual([]);
    expect(f).toMatchObject({ causeId: "wrong-pin-in-code", symptomId: "code-no-effect", args: { codePin: "13", wiredPin: "D12" } });
    expect(f?.fixes?.map((x) => x.kind)).toEqual(["code", "wiring"]);
    const ops = f?.fixes?.[0]?.ops ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ k: "source.edit", id: "main.ino" });
    const edits = ops.flatMap((o) => (o.k === "source.edit" ? [o] : []));
    expect(apply(src, edits)).toBe(src.replace("13", "12"));
  });

  it("is quiet when the code writes the wired pin or the pin is not literal", () => {
    expect(check(id, ledOn("D13"), sketch(src))).toEqual([]);
    expect(check(id, ledOn("D12"), sketch("void f(int p){ digitalWrite(p, HIGH); }\nvoid loop() { digitalWrite(13, HIGH); f(1); }"))).toEqual([]);
  });
});

describe("code:wire-begin-pins@1", () => {
  const id = "code:wire-begin-pins@1";
  const board = (sda: string, scl: string) => uno({ P5V: "n_5v", GND: "gnd", D4: sda, D5: scl });
  const display = oled({ VCC: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" });
  const code = sketch("void setup() { Wire.begin(4, 5); }\nvoid loop() {}");

  it("finds the lines crossed between the pins and the device", () => {
    const [f] = check(id, [board("n_scl", "n_sda"), display], code);
    expect(f).toMatchObject({ causeId: "swapped-pins", symptomId: "i2c-no-ack" });
    expect(f?.evidence.map((e) => [e.kind, e.ref])).toEqual([["pin-level", "D4 -> n_scl"], ["pin-level", "D5 -> n_sda"]]);
  });

  it("is quiet when the wiring matches Wire.begin", () => {
    expect(check(id, [board("n_sda", "n_scl"), display], code)).toEqual([]);
  });
});

describe("code:i2c-address@1", () => {
  const id = "code:i2c-address@1";
  const specs = [uno({ GND: "gnd", P5V: "n_5v", D4: "n_sda", D5: "n_scl" }), oled({ VCC: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" })];

  it("flags an address no wired device answers to", () => {
    expect(check(id, specs, sketch("void setup() { Wire.beginTransmission(0x40); }"))[0]).toMatchObject({ args: { addr: "0x40" } });
  });

  it("accepts the device address", () => {
    expect(check(id, specs, sketch("void setup() { Wire.beginTransmission(0x3C); }"))).toEqual([]);
  });
});

describe("code:serial-baud@1", () => {
  const id = "code:serial-baud@1";
  const monitor = (baud: number): Instrument[] => [{ id: "ins", kind: "serial-monitor", settings: { baud } }];
  const code = sketch("void setup() { Serial.begin(9600); }");

  it("compares with the serial monitor", () => {
    expect(check(id, [], code, monitor(115200))).toHaveLength(1);
    expect(check(id, [], code, monitor(9600))).toEqual([]);
  });
});

describe("code:pin-mode@1", () => {
  const id = "code:pin-mode@1";

  it("flags digitalRead on an output and digitalWrite on a pin never set OUTPUT", () => {
    const keys = check(id, [], sketch("void setup() { pinMode(3, OUTPUT); }\nvoid loop() { digitalRead(3); digitalWrite(4, HIGH); }")).map((f) => f.messageKey);
    expect(keys).toEqual(["check.pin-mode-read-output", "check.pin-mode-write-input"]);
  });

  it("leaves analogWrite and a correct sketch alone", () => {
    expect(check(id, [], sketch("void setup() { pinMode(3, OUTPUT); }\nvoid loop() { digitalWrite(3, HIGH); analogWrite(5, 10); }"))).toEqual([]);
  });
});
