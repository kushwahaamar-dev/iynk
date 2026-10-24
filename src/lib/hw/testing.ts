// Test doubles for the hardware twin: a SerialPort made of a ReadableStream /
// WritableStream pair, and a tiny StandardFirmata stand-in that answers like an
// Arduino Uno. Only the tests import this file.

import {
  ANALOG_MAPPING_QUERY,
  ANALOG_MAPPING_RESPONSE,
  CAPABILITY_QUERY,
  CAPABILITY_RESPONSE,
  END_SYSEX,
  PinMode,
  REPORT_FIRMWARE,
  REPORT_VERSION,
  START_SYSEX,
} from "./firmata";
import type { SerialPortInfo, SerialPortLike } from "./serial";

export class FakeSerialPort extends EventTarget implements SerialPortLike {
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  connected = true;
  baudRate: number | null = null;
  /** Every byte the host wrote, in order. */
  readonly written: number[] = [];
  /** Called with each chunk the host writes (the device side). */
  onHostWrite: ((chunk: Uint8Array) => void) | null = null;
  openError: DOMException | null = null;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private opened = false;

  constructor(private readonly info: SerialPortInfo = { usbVendorId: 0x2341, usbProductId: 0x0043 }) {
    super();
  }

  getInfo(): SerialPortInfo {
    return this.info;
  }

  get isOpen(): boolean {
    return this.opened;
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (this.openError) throw this.openError;
    if (this.opened) throw new DOMException("The port is already open.", "InvalidStateError");
    this.opened = true;
    this.baudRate = options.baudRate;
    this.newReadable();
    this.writable = new WritableStream<Uint8Array>({
      write: (chunk) => {
        this.written.push(...chunk);
        this.onHostWrite?.(chunk);
      },
    });
  }

  async close(): Promise<void> {
    if (!this.opened) throw new DOMException("The port is already closed.", "InvalidStateError");
    if (this.readable?.locked || this.writable?.locked) throw new DOMException("The port has locked streams.", "InvalidStateError");
    this.opened = false;
    this.readable = null;
    this.writable = null;
  }

  /** Bytes from the board to the host. */
  deviceSend(data: ArrayLike<number>): void {
    this.controller?.enqueue(Uint8Array.from(data));
  }

  /** A recoverable line error (framing, parity...): the stream errors and a fresh one replaces it. */
  lineError(name = "FramingError"): void {
    const old = this.controller;
    this.newReadable();
    old?.error(new DOMException("Line error", name));
  }

  /** Pull the USB cable. */
  unplug(): void {
    this.connected = false;
    const controller = this.controller;
    this.controller = null;
    this.readable = null;
    controller?.error(new DOMException("The device has been lost.", "NetworkError"));
    this.dispatchEvent(new Event("disconnect"));
  }

  takeWritten(): number[] {
    return this.written.splice(0, this.written.length);
  }

  private newReadable(): void {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
    });
  }
}

const UNO_PINS = 20;
const UNO_PWM = new Set([3, 5, 6, 9, 10, 11]);

/** The capability response body StandardFirmata 2.5 sends for an Uno (20 pins, A0-A5 = 14-19). */
export function unoCapabilities(): number[] {
  const out: number[] = [];
  for (let pin = 0; pin < UNO_PINS; pin++) {
    out.push(PinMode.INPUT, 1, PinMode.PULLUP, 1, PinMode.OUTPUT, 1);
    if (pin >= 14) out.push(PinMode.ANALOG, 10);
    if (UNO_PWM.has(pin)) out.push(PinMode.PWM, 8);
    out.push(PinMode.SERVO, 14);
    if (pin === 18 || pin === 19) out.push(PinMode.I2C, 1);
    out.push(0x7f);
  }
  return out;
}

export function unoAnalogMapping(): number[] {
  return Array.from({ length: UNO_PINS }, (_, pin) => (pin >= 14 ? pin - 14 : 0x7f));
}

export function firmwareReport(name = "StandardFirmata.ino", major = 2, minor = 5): number[] {
  const chars = [...name].flatMap((c) => [c.charCodeAt(0) & 0x7f, (c.charCodeAt(0) >> 7) & 0x7f]);
  return [START_SYSEX, REPORT_FIRMWARE, major, minor, ...chars, END_SYSEX];
}

/**
 * Answers the handshake queries like StandardFirmata on an Uno. With
 * `bootReport`, it also sends the version and firmware reports on its own,
 * the way a freshly reset board does.
 */
export function attachFakeUno(port: FakeSerialPort, { bootReport = true }: { bootReport?: boolean } = {}): void {
  const reply = (data: number[]) => queueMicrotask(() => port.deviceSend(data));
  const boot = () => {
    if (!bootReport) return;
    reply([REPORT_VERSION, 2, 5]);
    reply(firmwareReport());
  };
  const opened = port.open.bind(port);
  port.open = async (options) => {
    await opened(options);
    boot();
  };
  port.onHostWrite = (chunk) => {
    const b = [...chunk];
    for (let i = 0; i < b.length; i++) {
      if (b[i] === REPORT_VERSION) reply([REPORT_VERSION, 2, 5]);
      if (b[i] !== START_SYSEX) continue;
      const command = b[i + 1];
      if (command === REPORT_FIRMWARE) reply(firmwareReport());
      if (command === CAPABILITY_QUERY) reply([START_SYSEX, CAPABILITY_RESPONSE, ...unoCapabilities(), END_SYSEX]);
      if (command === ANALOG_MAPPING_QUERY) reply([START_SYSEX, ANALOG_MAPPING_RESPONSE, ...unoAnalogMapping(), END_SYSEX]);
    }
  };
}
