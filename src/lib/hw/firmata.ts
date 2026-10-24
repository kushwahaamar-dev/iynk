// Firmata 2.x codec: the byte encoders for every command the twin sends and a
// streaming parser for what the board sends back. Spec: github.com/firmata/protocol
// (protocol.md, servos.md); behaviour checked against StandardFirmata.ino 2.5.

export const DIGITAL_MESSAGE = 0x90;
export const ANALOG_MESSAGE = 0xe0;
export const REPORT_ANALOG = 0xc0;
export const REPORT_DIGITAL = 0xd0;
export const START_SYSEX = 0xf0;
export const SET_PIN_MODE = 0xf4;
export const SET_DIGITAL_PIN_VALUE = 0xf5;
export const END_SYSEX = 0xf7;
export const REPORT_VERSION = 0xf9;
export const SYSTEM_RESET = 0xff;

export const ANALOG_MAPPING_QUERY = 0x69;
export const ANALOG_MAPPING_RESPONSE = 0x6a;
export const CAPABILITY_QUERY = 0x6b;
export const CAPABILITY_RESPONSE = 0x6c;
export const PIN_STATE_QUERY = 0x6d;
export const PIN_STATE_RESPONSE = 0x6e;
export const EXTENDED_ANALOG = 0x6f;
export const SERVO_CONFIG = 0x70;
export const STRING_DATA = 0x71;
export const REPORT_FIRMWARE = 0x79;
export const SAMPLING_INTERVAL = 0x7a;
export const SAMPLING_INTERVAL_QUERY = 0x7c;

/** Pin modes, as SET_PIN_MODE and the capability response number them. */
export const PinMode = {
  INPUT: 0x00,
  OUTPUT: 0x01,
  ANALOG: 0x02,
  PWM: 0x03,
  SERVO: 0x04,
  SHIFT: 0x05,
  I2C: 0x06,
  ONEWIRE: 0x07,
  STEPPER: 0x08,
  ENCODER: 0x09,
  SERIAL: 0x0a,
  PULLUP: 0x0b,
  SPI: 0x0c,
  SONAR: 0x0d,
  TONE: 0x0e,
  DHT: 0x0f,
  IGNORE: 0x7f,
} as const;

export type PinModeCode = (typeof PinMode)[keyof typeof PinMode];

/** Analog-mapping value for a pin with no analog channel. */
export const NO_ANALOG_CHANNEL = 0x7f;

/** Mode → resolution in bits (1 for binary modes) for one pin. */
export type PinCapabilities = ReadonlyMap<number, number>;

export type FirmataMessage =
  | { type: "version"; major: number; minor: number }
  | { type: "firmware"; major: number; minor: number; name: string }
  | { type: "digital"; port: number; value: number }
  | { type: "analog"; channel: number; value: number }
  | { type: "capabilities"; pins: PinCapabilities[] }
  | { type: "analog-mapping"; channels: (number | null)[] }
  | { type: "pin-state"; pin: number; mode: number; state: number }
  | { type: "extended-analog"; pin: number; value: number }
  | { type: "sampling-interval"; ms: number }
  | { type: "string"; text: string }
  | { type: "sysex"; command: number; data: number[] };

const bytes = (...values: number[]) => Uint8Array.from(values);

function checkPin(pin: number): void {
  if (!Number.isInteger(pin) || pin < 0 || pin > 127) throw new RangeError(`Firmata pin ${pin} is outside 0-127`);
}

/** A non-negative integer as 7-bit groups, least significant first (at least `min` groups). */
export function toSevenBit(value: number, min = 2): number[] {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`Firmata value ${value} must be a non-negative integer`);
  const out: number[] = [];
  let v = value;
  do {
    out.push(v & 0x7f);
    v = Math.floor(v / 128);
  } while (v > 0 || out.length < min);
  return out;
}

/** Inverse of toSevenBit. */
export function fromSevenBit(groups: ArrayLike<number>): number {
  let value = 0;
  for (let i = groups.length - 1; i >= 0; i--) value = value * 128 + (groups[i] & 0x7f);
  return value;
}

/** Strings in sysex: two 7-bit bytes (LSB, MSB) per character. */
function decodeTwoByteString(data: ArrayLike<number>, from: number): string {
  let text = "";
  for (let i = from; i + 1 < data.length; i += 2) text += String.fromCharCode((data[i] & 0x7f) | ((data[i + 1] & 0x7f) << 7));
  return text;
}

function sysex(command: number, ...data: number[]): Uint8Array {
  return bytes(START_SYSEX, command, ...data, END_SYSEX);
}

export const encode = {
  queryVersion: () => bytes(REPORT_VERSION),
  queryFirmware: () => sysex(REPORT_FIRMWARE),
  queryCapabilities: () => sysex(CAPABILITY_QUERY),
  queryAnalogMapping: () => sysex(ANALOG_MAPPING_QUERY),
  queryPinState(pin: number) {
    checkPin(pin);
    return sysex(PIN_STATE_QUERY, pin);
  },
  setPinMode(pin: number, mode: PinModeCode) {
    checkPin(pin);
    return bytes(SET_PIN_MODE, pin, mode);
  },
  /** All eight pins of a port at once; StandardFirmata applies the bits to OUTPUT pins (and pull-ups to INPUT pins). */
  digitalPort(port: number, value: number) {
    if (!Number.isInteger(port) || port < 0 || port > 15) throw new RangeError(`Firmata port ${port} is outside 0-15`);
    return bytes(DIGITAL_MESSAGE | port, value & 0x7f, (value >> 7) & 0x01);
  },
  /** One OUTPUT pin (protocol 2.5+). */
  digitalPin(pin: number, level: 0 | 1) {
    checkPin(pin);
    return bytes(SET_DIGITAL_PIN_VALUE, pin, level ? 1 : 0);
  },
  /** PWM duty or servo position. Pins above 15 and values above 14 bits use EXTENDED_ANALOG. */
  analogWrite(pin: number, value: number) {
    checkPin(pin);
    const v = Math.max(0, Math.round(value));
    if (pin <= 15 && v < 1 << 14) return bytes(ANALOG_MESSAGE | pin, v & 0x7f, (v >> 7) & 0x7f);
    return sysex(EXTENDED_ANALOG, pin, ...toSevenBit(v));
  },
  /** Attaches a servo with these pulse limits in µs; StandardFirmata also switches the pin to SERVO mode. */
  servoConfig(pin: number, minPulse: number, maxPulse: number) {
    checkPin(pin);
    const lo = Math.min(0x3fff, Math.max(0, Math.round(minPulse)));
    const hi = Math.min(0x3fff, Math.max(0, Math.round(maxPulse)));
    return sysex(SERVO_CONFIG, pin, lo & 0x7f, lo >> 7, hi & 0x7f, hi >> 7);
  },
  reportAnalog(channel: number, on: boolean) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 15) throw new RangeError(`Firmata analog channel ${channel} is outside 0-15`);
    return bytes(REPORT_ANALOG | channel, on ? 1 : 0);
  },
  reportDigital(port: number, on: boolean) {
    if (!Number.isInteger(port) || port < 0 || port > 15) throw new RangeError(`Firmata port ${port} is outside 0-15`);
    return bytes(REPORT_DIGITAL | port, on ? 1 : 0);
  },
  samplingInterval(ms: number) {
    const v = Math.min(0x3fff, Math.max(1, Math.round(ms)));
    return sysex(SAMPLING_INTERVAL, v & 0x7f, (v >> 7) & 0x7f);
  },
  systemReset: () => bytes(SYSTEM_RESET),
};

function parseSysex(command: number, data: number[]): FirmataMessage {
  switch (command) {
    case REPORT_FIRMWARE:
      if (data.length >= 2) return { type: "firmware", major: data[0], minor: data[1], name: decodeTwoByteString(data, 2) };
      break;
    case CAPABILITY_RESPONSE: {
      const pins: PinCapabilities[] = [];
      let modes = new Map<number, number>();
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0x7f) {
          pins.push(modes);
          modes = new Map();
        } else if (i + 1 < data.length) {
          modes.set(data[i], data[i + 1]);
          i++;
        }
      }
      return { type: "capabilities", pins };
    }
    case ANALOG_MAPPING_RESPONSE:
      return { type: "analog-mapping", channels: data.map((c) => (c === NO_ANALOG_CHANNEL ? null : c)) };
    case PIN_STATE_RESPONSE:
      if (data.length >= 2) return { type: "pin-state", pin: data[0], mode: data[1], state: fromSevenBit(data.slice(2)) };
      break;
    case EXTENDED_ANALOG:
      if (data.length >= 2) return { type: "extended-analog", pin: data[0], value: fromSevenBit(data.slice(1)) };
      break;
    case SAMPLING_INTERVAL:
      if (data.length >= 2) return { type: "sampling-interval", ms: fromSevenBit(data.slice(0, 2)) };
      break;
    case STRING_DATA:
      return { type: "string", text: decodeTwoByteString(data, 0) };
  }
  return { type: "sysex", command, data };
}

/** Data bytes that follow each channel-style command. */
function dataLength(status: number): number {
  const high = status & 0xf0;
  if (high === DIGITAL_MESSAGE || high === ANALOG_MESSAGE) return 2;
  if (high === REPORT_ANALOG || high === REPORT_DIGITAL) return 1;
  if (status === REPORT_VERSION || status === SET_PIN_MODE || status === SET_DIGITAL_PIN_VALUE) return 2;
  return 0;
}

/**
 * Streaming parser: feed it chunks exactly as the serial port delivers them
 * (messages split across chunks are fine). Bytes outside a message, such as
 * boot-loader noise, are skipped; a status byte inside an unfinished message
 * abandons it, as MIDI does.
 */
export class FirmataParser {
  private status = 0;
  private need = 0;
  private data: number[] = [];
  private inSysex = false;
  /** Upper bound for one sysex message; StandardFirmata's longest reply is a few hundred bytes. */
  private static readonly MAX_SYSEX = 4096;

  constructor(private readonly emit: (message: FirmataMessage) => void) {}

  push(chunk: ArrayLike<number>): void {
    for (let i = 0; i < chunk.length; i++) this.byte(chunk[i] & 0xff);
  }

  private byte(b: number): void {
    if (this.inSysex) {
      if (b === END_SYSEX) {
        this.inSysex = false;
        const [command, ...data] = this.data;
        this.data = [];
        if (command !== undefined) this.emit(parseSysex(command, data));
        return;
      }
      if (b < 0x80) {
        if (this.data.length < FirmataParser.MAX_SYSEX) this.data.push(b);
        else this.inSysex = false;
        return;
      }
      this.inSysex = false;
      this.data = [];
    }

    if (b >= 0x80) {
      this.data = [];
      if (b === START_SYSEX) {
        this.inSysex = true;
        this.status = 0;
        this.need = 0;
        return;
      }
      this.status = b;
      this.need = dataLength(b);
      if (this.need === 0) this.status = 0;
      return;
    }

    if (!this.status) return;
    this.data.push(b);
    if (this.data.length < this.need) return;
    const [lsb, msb = 0] = this.data;
    const status = this.status;
    // Firmata boards never use MIDI running status, so stray data bytes after a message are dropped.
    this.data = [];
    this.status = 0;
    const high = status & 0xf0;
    if (high === DIGITAL_MESSAGE) this.emit({ type: "digital", port: status & 0x0f, value: (lsb | (msb << 7)) & 0xff });
    else if (high === ANALOG_MESSAGE) this.emit({ type: "analog", channel: status & 0x0f, value: lsb | (msb << 7) });
    else if (status === REPORT_VERSION) this.emit({ type: "version", major: lsb, minor: msb });
  }
}
