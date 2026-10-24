import { describe, expect, test } from "vitest";
import { BENCH_MAX_BYTES, applyChange, benchFacts, describeBench, renderBench } from "./bench";
import { genericFacts, summarise } from "./bench/generic";
import { diffLines, foldDiff } from "./diff";
import { parseInline, parseMarkdown } from "./markdown";
import { suggestions } from "./suggest";

const blinkBench = {
  lessonId: "blink",
  code: "void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n}",
  lang: "arduino-cpp",
  parts: [{ id: "led1", type: "led", color: "red" }, { id: "r1", type: "resistor", ohms: 220 }],
  wires: [{ from: "uno.D13", to: "r1.a", color: "orange" }, { from: "r1.b", to: "led1.cathode" }],
  errors: [],
  serial: "boot\nready\n",
  faults: [{ id: "led-reversed", label: "LED is in backwards" }],
  tests: [{ id: "blinks", name: "LED blinks", pass: false, detail: "no light at t=1s" }],
  camera: { yaw: 30 },
};

describe("describeBench", () => {
  test("puts what is wrong first and every section after", () => {
    const text = describeBench("board", "uno-r3", blinkBench);
    const order = ["# board uno-r3", "lessonId: blink", "## Active faults", "## Checks", "## Code (arduino-cpp)", "## Wiring", "## Parts", "## Serial monitor", "## Other state"];
    const at = order.map((head) => text.indexOf(head));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toContain("led-reversed: LED is in backwards");
    expect(text).toContain("FAIL LED blinks: no light at t=1s");
    expect(text).toContain("uno.D13 - r1.a (orange)");
    expect(text).toContain('{"camera":{"yaw":30}}');
    expect(text).not.toContain("## Compile errors");
  });

  test("never exceeds 12 KB, cutting the least important lines first", () => {
    const huge = { ...blinkBench, code: Array.from({ length: 4000 }, (_, i) => `// line ${i} ${"é".repeat(10)}`).join("\n") };
    const text = describeBench("robotics", "line-follower", huge);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(BENCH_MAX_BYTES);
    expect(text).toContain("## Active faults");
    expect(text).toMatch(/… \d+ more lines$/);
    expect(text).not.toContain("## Wiring");
  });

  test("renders an empty or unknown state as just the title", () => {
    expect(describeBench("drone", "quad5", null)).toBe("# drone quad5");
    expect(renderBench(genericFacts({ calc: { thrustToWeight: 4.2371, flightMin: 6.1, name: "x" } }, "drone quad5"))).toBe(
      "# drone quad5\n## Numbers\nthrustToWeight: 4.237\nflightMin: 6.1\nname: x",
    );
  });

  test("summarise caps depth, list length and strings", () => {
    const text = summarise({ a: { b: { c: { d: 1 } } }, list: Array.from({ length: 20 }, (_, i) => i), s: "x".repeat(500) });
    expect(text).toContain('"c":"{…}"');
    expect(text).toContain('"…12 more"');
    expect(text).toContain(`${"x".repeat(119)}…`);
  });
});

describe("applyChange", () => {
  test("code: replaces the exact text once, or explains", () => {
    const change = { kind: "code" as const, reason: "r", find: "HIGH", replace: "LOW" };
    const ok = applyChange("board", blinkBench, change);
    expect(ok.ok && ok.change.after).toContain("digitalWrite(13, LOW)");
    const twice = applyChange("board", { code: "a\na" }, { ...change, find: "a" });
    expect(twice).toEqual({ ok: false, error: "propose_change: find text occurs more than once; quote more of it" });
    const whole = applyChange("board", blinkBench, { ...change, find: "", replace: "void setup() {}" });
    expect(whole.ok && whole.change.after).toBe("void setup() {}");
  });

  test("wire and part changes on a bench of unknown shape preview the new lists", () => {
    const wire = applyChange("robotics", blinkBench, {
      kind: "wire",
      reason: "r",
      connect: [{ from: "r1.b", to: "led1.anode" }],
      disconnect: [{ from: "r1.b", to: "led1.cathode" }],
    });
    expect(wire.ok && wire.change.after).toBe("uno.D13 - r1.a (orange)\nr1.b - led1.anode");
    const part = applyChange("robotics", blinkBench, { kind: "part", reason: "r", add: [], remove: ["r1"], set: [] });
    expect(part.ok && part.change.after).toBe("led1: led");
  });
});

describe("suggestions", () => {
  test("ask about what is wrong first", () => {
    const facts = benchFacts("board", "uno-r3", blinkBench);
    expect(suggestions("board", facts)).toEqual([
      { key: "fault", params: { fault: "led-reversed: LED is in backwards" } },
      { key: "failed", params: { test: "LED blinks" } },
      { key: "code" },
    ]);
    expect(suggestions("drone", benchFacts("drone", "quad5", {}), 2)).toEqual([{ key: "drone" }, { key: "start" }]);
  });
});

describe("diff", () => {
  test("aligns lines and folds long unchanged runs", () => {
    const before = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
    const after = ["a", "b", "c", "d", "E", "f", "g", "h", "i"].join("\n");
    expect(diffLines(before, after).filter((l) => l.op !== "same")).toEqual([
      { op: "del", text: "e" },
      { op: "add", text: "E" },
      { op: "add", text: "i" },
    ]);
    expect(foldDiff(diffLines(before, after), 1)).toEqual([
      { op: "skip", count: 3 },
      { op: "same", text: "d" },
      { op: "del", text: "e" },
      { op: "add", text: "E" },
      { op: "same", text: "f" },
      { op: "skip", count: 1 },
      { op: "same", text: "h" },
      { op: "add", text: "i" },
    ]);
    expect(diffLines("", "x")).toEqual([{ op: "add", text: "x" }]);
  });
});

describe("markdown subset", () => {
  test("parses inline marks and only http(s) links", () => {
    expect(parseInline("Use **pin `13`** and [the docs](https://docs.arduino.cc) not [this](javascript:x)")).toEqual([
      { t: "text", v: "Use " },
      { t: "bold", c: [{ t: "text", v: "pin " }, { t: "code", v: "13" }] },
      { t: "text", v: " and " },
      { t: "link", href: "https://docs.arduino.cc", c: [{ t: "text", v: "the docs" }] },
      { t: "text", v: " not [this](javascript:x)" },
    ]);
  });

  test("parses blocks, including a code fence still streaming in", () => {
    expect(parseMarkdown("## Check\n- one\n- two\n\n1. first\n2. second\n\n```cpp\nint x;")).toEqual([
      { t: "h", c: [{ t: "text", v: "Check" }] },
      { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "text", v: "two" }]] },
      { t: "ol", start: 1, items: [[{ t: "text", v: "first" }], [{ t: "text", v: "second" }]] },
      { t: "code", lang: "cpp", v: "int x;" },
    ]);
    expect(parseMarkdown("line one\nline two")).toEqual([{ t: "p", lines: [[{ t: "text", v: "line one" }], [{ t: "text", v: "line two" }]] }]);
  });
});
