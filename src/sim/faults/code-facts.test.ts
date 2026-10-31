// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractCodeFacts } from "./code-facts.ts";

const uno = { variant: "uno-r3" };
const facts = (src: string, board = uno) => extractCodeFacts({ "main.ino": src }, ["main.ino"], board);

const ENV_MONITOR = `#include <Wire.h>
#include <Adafruit_BME280.h>
#include "display.h"
Adafruit_BME280 bme;
void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!bme.begin(0x76)) { while (true) delay(1000); }
  displayBegin();
}
void loop() {}
`;

describe("extractCodeFacts", () => {
  it("reads the bus, address and baud of the environment monitor", () => {
    const f = extractCodeFacts(
      { "monitor.ino": ENV_MONITOR, "display.h": "static Adafruit_SSD1306 oled(128, 64, &Wire, -1);\ninline void displayBegin() { oled.begin(SSD1306_SWITCHCAPVCC, 0x3C); }\n" },
      ["monitor.ino"],
      { variant: "esp32-devkitc" },
    );
    expect(f.language).toBe("arduino-cpp");
    expect(f.wireBegin?.value).toEqual({ sda: "21", scl: "22" });
    expect(f.serialBegin?.value).toEqual({ baud: 115200 });
    expect(f.i2cAddresses.map((a) => [a.file, a.value.addr])).toEqual([["monitor.ino", 0x76], ["display.h", 0x3c]]);
    expect(f.unresolved).toBe(0);
  });

  it("resolves constants, defines and board pin names", () => {
    const f = facts(`const int led = 13;
#define BTN 2
int spare = 7;
void setup() { pinMode(led, OUTPUT); pinMode(BTN, INPUT_PULLUP); pinMode(LED_BUILTIN, OUTPUT); pinMode(A0, INPUT); pinMode(spare, OUTPUT); }
void loop() { digitalWrite(led, HIGH); digitalRead(BTN); analogRead(A0); }`);
    expect(f.pinModes.map((m) => [m.value.pin, m.value.mode])).toEqual([["13", "OUTPUT"], ["2", "INPUT_PULLUP"], ["13", "OUTPUT"], ["A0", "INPUT"], ["7", "OUTPUT"]]);
    expect(f.pinWrites.map((w) => w.value)).toEqual([{ pin: "13", fn: "digitalWrite" }]);
    expect(f.pinReads.map((r) => r.value.fn)).toEqual(["digitalRead", "analogRead"]);
    expect(f.unresolved).toBe(0);
  });

  it("leaves a pin passed through a parameter or assigned later unresolved", () => {
    const f = facts(`int p = 4;
void blink(int pin) { digitalWrite(pin, HIGH); }
void setup() { p++; pinMode(p, OUTPUT); blink(3); }
void loop() {}`);
    expect(f.pinWrites).toEqual([]);
    expect(f.pinModes).toEqual([]);
    expect(f.unresolved).toBe(2);
  });

  it("ignores comments and strings", () => {
    const f = facts(`// digitalWrite(5, HIGH);
/* pinMode(6, OUTPUT); */
void setup() { Serial.println("digitalWrite(7, HIGH)"); }
void loop() {}`);
    expect(f.pinWrites).toEqual([]);
    expect(f.pinModes).toEqual([]);
    expect(f.unresolved).toBe(0);
  });

  it("keeps the first Wire.begin and records where the pin literal sits", () => {
    const src = "void setup() {\n  Wire.begin(4, 5);\n  Wire.begin(6, 7);\n  digitalWrite(13, HIGH);\n}\nvoid loop() {}\n";
    const f = facts(src);
    expect(f.wireBegin?.value).toEqual({ sda: "4", scl: "5" });
    const span = f.pinWrites[0]?.span;
    expect(src.slice(span?.pos, (span?.pos ?? 0) + (span?.len ?? 0))).toBe("13");
  });

  it("finds the literal behind a define", () => {
    const src = "#define LED 13\nvoid setup() { pinMode(LED, OUTPUT); }\nvoid loop() {}\n";
    const span = facts(src).pinModes[0]?.span;
    expect(src.slice(span?.pos, (span?.pos ?? 0) + (span?.len ?? 0))).toBe("13");
  });

  it("gives empty facts for a sketch that does not parse and no support for Python", () => {
    expect(facts("void setup( {")).toMatchObject({ language: "arduino-cpp", pinModes: [], unresolved: 0 });
    expect(extractCodeFacts({ "main.py": "Pin(2)" }, ["main.py"], uno).language).toBe("unsupported");
  });
});
