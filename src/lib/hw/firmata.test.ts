import { describe, expect, it } from "vitest";
import { encode, FirmataParser, fromSevenBit, PinMode, toSevenBit, type FirmataMessage } from "./firmata";
import { firmwareReport, unoAnalogMapping, unoCapabilities } from "./testing";

const hex = (data: Uint8Array) => [...data].map((b) => b.toString(16).padStart(2, "0")).join(" ");

function parse(...chunks: number[][]): FirmataMessage[] {
  const out: FirmataMessage[] = [];
  const parser = new FirmataParser((m) => out.push(m));
  for (const c of chunks) parser.push(c);
  return out;
}

describe("encode", () => {
  it("queries", () => {
    expect(hex(encode.queryVersion())).toBe("f9");
    expect(hex(encode.queryFirmware())).toBe("f0 79 f7");
    expect(hex(encode.queryCapabilities())).toBe("f0 6b f7");
    expect(hex(encode.queryAnalogMapping())).toBe("f0 69 f7");
    expect(hex(encode.queryPinState(13))).toBe("f0 6d 0d f7");
    expect(hex(encode.systemReset())).toBe("ff");
  });

  it("set pin mode", () => {
    expect(hex(encode.setPinMode(13, PinMode.OUTPUT))).toBe("f4 0d 01");
    // protocol.md: analog reporting on A1 starts with SET_PIN_MODE 14... here A0 = pin 14, ANALOG = 2.
    expect(hex(encode.setPinMode(14, PinMode.ANALOG))).toBe("f4 0e 02");
    expect(hex(encode.setPinMode(2, PinMode.PULLUP))).toBe("f4 02 0b");
    expect(hex(encode.setPinMode(9, PinMode.SERVO))).toBe("f4 09 04");
    expect(() => encode.setPinMode(128, PinMode.INPUT)).toThrow(RangeError);
    expect(() => encode.setPinMode(-1, PinMode.INPUT)).toThrow(RangeError);
  });

  it("digital port writes split bit 7 into the second byte", () => {
    expect(hex(encode.digitalPort(1, 0b0010_0000))).toBe("91 20 00"); // pin 13 high
    expect(hex(encode.digitalPort(0, 0xff))).toBe("90 7f 01");
    expect(hex(encode.digitalPort(2, 0b1000_0001))).toBe("92 01 01");
    expect(() => encode.digitalPort(16, 0)).toThrow(RangeError);
  });

  it("single digital pin value", () => {
    expect(hex(encode.digitalPin(13, 1))).toBe("f5 0d 01");
    expect(hex(encode.digitalPin(13, 0))).toBe("f5 0d 00");
  });

  it("analog write: 14-bit message up to pin 15, extended above", () => {
    expect(hex(encode.analogWrite(9, 128))).toBe("e9 00 01");
    expect(hex(encode.analogWrite(3, 255))).toBe("e3 7f 01");
    expect(hex(encode.analogWrite(5, 0))).toBe("e5 00 00");
    expect(hex(encode.analogWrite(9, 1500))).toBe("e9 5c 0b"); // servo pulse in µs
    expect(hex(encode.analogWrite(16, 100))).toBe("f0 6f 10 64 00 f7");
    expect(hex(encode.analogWrite(3, 1 << 14))).toBe("f0 6f 03 00 00 01 f7");
    expect(hex(encode.analogWrite(3, -5))).toBe("e3 00 00");
  });

  it("servo config carries 14-bit pulse limits", () => {
    expect(hex(encode.servoConfig(9, 544, 2400))).toBe("f0 70 09 20 04 60 12 f7");
  });

  it("reporting toggles", () => {
    expect(hex(encode.reportAnalog(0, true))).toBe("c0 01");
    expect(hex(encode.reportAnalog(5, false))).toBe("c5 00");
    expect(hex(encode.reportDigital(0, true))).toBe("d0 01");
    expect(hex(encode.reportDigital(1, false))).toBe("d1 00");
    expect(() => encode.reportAnalog(16, true)).toThrow(RangeError);
  });

  it("sampling interval clamps to 1..16383 ms", () => {
    expect(hex(encode.samplingInterval(19))).toBe("f0 7a 13 00 f7");
    expect(hex(encode.samplingInterval(200))).toBe("f0 7a 48 01 f7");
    expect(hex(encode.samplingInterval(0))).toBe("f0 7a 01 00 f7");
  });

  it("seven-bit groups round-trip", () => {
    expect(toSevenBit(0)).toEqual([0, 0]);
    expect(toSevenBit(1023)).toEqual([0x7f, 0x07]);
    expect(toSevenBit(1 << 21, 2)).toEqual([0, 0, 0, 1]);
    for (const v of [0, 1, 127, 128, 1023, 16383, 16384, 2 ** 28 + 5]) expect(fromSevenBit(toSevenBit(v))).toBe(v);
    expect(() => toSevenBit(1.5)).toThrow(RangeError);
  });
});

describe("FirmataParser", () => {
  it("version report", () => {
    expect(parse([0xf9, 2, 5])).toEqual([{ type: "version", major: 2, minor: 5 }]);
  });

  it("firmware name and version", () => {
    expect(parse(firmwareReport("StandardFirmata.ino", 2, 5))).toEqual([
      { type: "firmware", major: 2, minor: 5, name: "StandardFirmata.ino" },
    ]);
  });

  it("messages split across chunks", () => {
    const bytes = [0xf9, 2, 5, ...firmwareReport("SF", 2, 6), 0xe0, 0x7f, 0x07];
    const chunks = bytes.map((b) => [b]);
    expect(parse(...chunks)).toEqual([
      { type: "version", major: 2, minor: 5 },
      { type: "firmware", major: 2, minor: 6, name: "SF" },
      { type: "analog", channel: 0, value: 1023 },
    ]);
  });

  it("analog and digital reports", () => {
    expect(parse([0xe0, 0x00, 0x04, 0xe5, 0x01, 0x00])).toEqual([
      { type: "analog", channel: 0, value: 512 },
      { type: "analog", channel: 5, value: 1 },
    ]);
    expect(parse([0x90, 0x04, 0x00, 0x91, 0x20, 0x00, 0x90, 0x00, 0x01])).toEqual([
      { type: "digital", port: 0, value: 0b100 },
      { type: "digital", port: 1, value: 0b10_0000 },
      { type: "digital", port: 0, value: 0x80 },
    ]);
  });

  it("capability response: one mode map per pin, 0x7f separated", () => {
    const [m] = parse([0xf0, 0x6c, ...unoCapabilities(), 0xf7]);
    if (m.type !== "capabilities") throw new Error(m.type);
    expect(m.pins).toHaveLength(20);
    expect([...m.pins[13].entries()]).toEqual([
      [PinMode.INPUT, 1],
      [PinMode.PULLUP, 1],
      [PinMode.OUTPUT, 1],
      [PinMode.SERVO, 14],
    ]);
    expect(m.pins[9].get(PinMode.PWM)).toBe(8);
    expect(m.pins[14].get(PinMode.ANALOG)).toBe(10);
    expect(m.pins[18].has(PinMode.I2C)).toBe(true);
  });

  it("an unsupported pin reports only the separator", () => {
    const [m] = parse([0xf0, 0x6c, 0x00, 0x01, 0x7f, 0x7f, 0x01, 0x01, 0x7f, 0xf7]);
    if (m.type !== "capabilities") throw new Error(m.type);
    expect(m.pins.map((p) => p.size)).toEqual([1, 0, 1]);
  });

  it("analog mapping: 127 means no channel", () => {
    const [m] = parse([0xf0, 0x6a, ...unoAnalogMapping(), 0xf7]);
    if (m.type !== "analog-mapping") throw new Error(m.type);
    expect(m.channels.slice(12)).toEqual([null, null, 0, 1, 2, 3, 4, 5]);
  });

  it("pin state, extended analog, sampling interval and strings", () => {
    expect(parse([0xf0, 0x6e, 13, 1, 1, 0xf7])).toEqual([{ type: "pin-state", pin: 13, mode: 1, state: 1 }]);
    expect(parse([0xf0, 0x6e, 9, 3, 0x7f, 0x01, 0xf7])).toEqual([{ type: "pin-state", pin: 9, mode: 3, state: 255 }]);
    expect(parse([0xf0, 0x6f, 16, 0x00, 0x04, 0xf7])).toEqual([{ type: "extended-analog", pin: 16, value: 512 }]);
    expect(parse([0xf0, 0x7a, 0x13, 0x00, 0xf7])).toEqual([{ type: "sampling-interval", ms: 19 }]);
    expect(parse([0xf0, 0x71, 0x4f, 0x00, 0x4b, 0x00, 0xf7])).toEqual([{ type: "string", text: "OK" }]);
  });

  it("unknown sysex is passed through", () => {
    expect(parse([0xf0, 0x77, 1, 2, 3, 0xf7])).toEqual([{ type: "sysex", command: 0x77, data: [1, 2, 3] }]);
  });

  it("skips noise and recovers from truncated messages", () => {
    expect(
      parse([0x00, 0x13, 0x7e], [0xe0, 0x05], [0xf9, 2, 5], [0xf0, 0x79, 2, 0xe1, 0x10, 0x00], [0x10, 0x20, 0xf7]),
    ).toEqual([
      { type: "version", major: 2, minor: 5 },
      { type: "analog", channel: 1, value: 16 },
    ]);
  });

  it("does not treat stray data bytes as running status", () => {
    expect(parse([0xe0, 0x01, 0x00, 0x02, 0x00])).toEqual([{ type: "analog", channel: 0, value: 1 }]);
  });

  it("an empty sysex is ignored", () => {
    expect(parse([0xf0, 0xf7, 0xf9, 1, 2])).toEqual([{ type: "version", major: 1, minor: 2 }]);
  });
});
