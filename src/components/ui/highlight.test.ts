import { describe, expect, it } from "vitest";
import { tokenLines, tokenize, type CodeLang } from "./highlight";

const kinds = (code: string, lang: CodeLang) => tokenize(code, lang).filter((t) => t.kind !== "plain").map((t) => `${t.kind}:${t.text}`);

describe("highlight", () => {
  it("round-trips the source exactly", () => {
    const samples: [string, CodeLang][] = [
      ["void setup() { pinMode(LED_BUILTIN, OUTPUT); } // blink\n/* multi\nline */", "cpp"],
      ["from machine import Pin\nled = Pin(25, Pin.OUT)  # onboard\nprint('hi')", "python"],
      ["module top(input [15:0] sw, output [15:0] led);\n  assign led = sw; // map\nendmodule", "verilog"],
      ["# motors\nset motor_pwm_protocol = DSHOT600\nsave", "cli"],
      ["FRAME_CLASS,1\nparam set ARMING_CHECK 1", "params"],
    ];
    for (const [code, lang] of samples) expect(tokenize(code, lang).map((t) => t.text).join("")).toBe(code);
  });

  it("marks Arduino keywords, types, constants, calls and comments", () => {
    expect(kinds("void setup() { pinMode(LED_BUILTIN, OUTPUT); delay(1000); } // x", "cpp")).toEqual([
      "ty:void",
      "fn:setup",
      "fn:pinMode",
      "con:LED_BUILTIN",
      "con:OUTPUT",
      "fn:delay",
      "num:1000",
      "cm:// x",
    ]);
    expect(kinds('#include <Servo.h>\nconst char* s = "hi";', "cpp")).toEqual(["pp:#include <Servo.h>", "kw:const", "ty:char", 'str:"hi"']);
  });

  it("reads Verilog sized literals and Betaflight commands", () => {
    expect(kinds("assign led = 8'b1010_0101;", "verilog")).toEqual(["kw:assign", "num:8'b1010_0101"]);
    expect(kinds("set gyro_lpf1_static_hz = 250\nfeature -AIRMODE", "cli")).toEqual(["kw:set", "num:250", "kw:feature", "con:AIRMODE"]);
  });

  it("splits tokens into lines, multi-line comments included", () => {
    const lines = tokenLines("a /* one\ntwo */ b", "cpp");
    expect(lines).toHaveLength(2);
    expect(lines[0].map((t) => t.text).join("")).toBe("a /* one");
    expect(lines[1][0]).toEqual({ kind: "cm", text: "two */" });
  });
});
