// A Firmata board over one serial link: the connect handshake (version and
// firmware report, capability and analog-mapping queries), pin state as the
// board reports it, and the writes the twin needs.

import { encode, FirmataParser, PinMode, type FirmataMessage, type PinCapabilities, type PinModeCode } from "./firmata";
import { SerialTransport, type CloseReason, type SerialPortInfo, type SerialPortLike } from "./serial";

export type HwErrorCode = "no-firmata" | "busy" | "disconnected" | "failed";

export class HwError extends Error {
  constructor(
    readonly code: HwErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "HwError";
  }
}

export type BoardPin = {
  readonly pin: number;
  /** Mode → resolution, from the capability response. */
  readonly modes: PinCapabilities;
  readonly analogChannel: number | null;
  /** The mode this client last set, or null while the firmware default is in force. */
  readonly mode: number | null;
  /** Last value written (outputs) or reported (inputs); null for an input the board hasn't reported yet. */
  readonly value: number | null;
};

export type BoardSnapshot = {
  readonly status: "ready" | CloseReason;
  readonly firmware: { readonly name: string; readonly major: number; readonly minor: number } | null;
  readonly protocol: { readonly major: number; readonly minor: number } | null;
  readonly usb: SerialPortInfo;
  readonly pins: readonly BoardPin[];
  /** The last STRING_DATA message from the firmware (its error and debug channel). */
  readonly note: string | null;
};

export type InputListener = (pin: number, value: number) => void;

export type ConnectOptions = {
  /** How long to wait for the reports StandardFirmata sends after the auto-reset before asking for them. */
  quietMs?: number;
  /** Total time allowed for the firmware to identify itself. */
  identifyMs?: number;
  /** Time allowed for each capability or mapping reply. */
  replyMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Waiter = { match: (m: FirmataMessage) => boolean; resolve: (m: FirmataMessage) => void; reject: (e: Error) => void };

/** True if the pin supports `mode` according to the capability response. */
export function supports(pin: BoardPin | undefined, mode: PinModeCode): boolean {
  return !!pin && pin.modes.has(mode);
}

export class FirmataBoard {
  private transport: SerialTransport | null = null;
  private readonly parser = new FirmataParser((m) => this.receive(m));
  private waiters: Waiter[] = [];
  private pins: BoardPin[] = [];
  private channelPins = new Map<number, number>();
  private portsWritten = new Map<number, number>();
  private readonly listeners = new Set<() => void>();
  private readonly inputListeners = new Set<InputListener>();
  private readonly resetListeners = new Set<() => void>();
  private snap: BoardSnapshot;

  private constructor(usb: SerialPortInfo) {
    this.snap = { status: "ready", firmware: null, protocol: null, usb, pins: [], note: null };
  }

  /**
   * Open the port at 57600 baud and identify the firmware. Opening resets an
   * Uno (DTR), and StandardFirmata then reports itself after its boot blink, so
   * we listen first and only ask when the board stays quiet.
   */
  static async connect(port: SerialPortLike, options: ConnectOptions = {}): Promise<FirmataBoard> {
    const { quietMs = 3000, identifyMs = 8000, replyMs = 3000 } = options;
    const board = new FirmataBoard(port.getInfo());
    // Listen before opening: the boot reports can arrive before open() resolves.
    const identified = board.waitFor((m) => m.type === "firmware", identifyMs);
    identified.catch(() => undefined);
    try {
      board.transport = await SerialTransport.open(port, {
        onData: (chunk) => board.parser.push(chunk),
        onClose: (reason, error) => board.ended(reason, error),
      });
    } catch (error) {
      board.ended("error", error);
      const name = error instanceof DOMException ? error.name : "";
      throw new HwError(name === "InvalidStateError" || name === "NetworkError" ? "busy" : "failed", "Could not open the serial port", {
        cause: error,
      });
    }

    try {
      const early = await Promise.race([identified.then(() => true), sleep(quietMs).then(() => false)]);
      if (!early) {
        // No auto-reset (or the board was already running): ask instead.
        await board.send(encode.queryVersion());
        await board.send(encode.queryFirmware());
      }
      await identified;
      const [, caps] = await Promise.all([
        board.send(encode.queryCapabilities()),
        board.waitFor((m) => m.type === "capabilities", replyMs),
      ]);
      const [, mapping] = await Promise.all([
        board.send(encode.queryAnalogMapping()),
        board.waitFor((m) => m.type === "analog-mapping", replyMs),
      ]);
      if (caps.type === "capabilities" && mapping.type === "analog-mapping") board.setLayout(caps.pins, mapping.channels);
      return board;
    } catch (error) {
      await board.close();
      throw error;
    }
  }

  getSnapshot = (): BoardSnapshot => this.snap;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reported input changes: digital pins as 0/1, analog pins as raw ADC counts. */
  onInput(listener: InputListener): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  /**
   * The board restarted on its own (its RESET button, a brown-out): StandardFirmata
   * re-sent its firmware report and every pin is back to the firmware default.
   */
  onReset(listener: () => void): () => void {
    this.resetListeners.add(listener);
    return () => this.resetListeners.delete(listener);
  }

  get ready(): boolean {
    return this.snap.status === "ready";
  }

  pin(n: number): BoardPin | undefined {
    return this.pins[n];
  }

  setMode(n: number, mode: PinModeCode): void {
    const pin = this.pins[n];
    if (!pin || pin.mode === mode) return;
    const input = mode === PinMode.INPUT || mode === PinMode.PULLUP || mode === PinMode.ANALOG;
    this.modeChanged(n, mode, input ? null : 0);
    this.send(encode.setPinMode(n, mode));
  }

  /** Writes the pin's whole port; only OUTPUT pins carry a 1, so INPUT pins never get their pull-up switched on. */
  digitalWrite(n: number, level: 0 | 1): void {
    const pin = this.pins[n];
    if (!pin || pin.mode !== PinMode.OUTPUT) return;
    if (pin.value !== level) this.update(n, { value: level });
    const port = n >> 3;
    let value = 0;
    for (let bit = 0; bit < 8; bit++) {
      const p = this.pins[port * 8 + bit];
      if (p?.mode === PinMode.OUTPUT && p.value) value |= 1 << bit;
    }
    if (this.portsWritten.get(port) === value) return;
    this.portsWritten.set(port, value);
    this.send(encode.digitalPort(port, value));
  }

  /** PWM duty (0..2^resolution-1) on a PWM pin, or a pulse width in µs on a servo pin. */
  analogWrite(n: number, value: number): void {
    const pin = this.pins[n];
    if (!pin || (pin.mode !== PinMode.PWM && pin.mode !== PinMode.SERVO)) return;
    const v = Math.max(0, Math.round(value));
    if (pin.value === v) return;
    this.update(n, { value: v });
    this.send(encode.analogWrite(n, v));
  }

  /** Attach a servo (SERVO_CONFIG also puts the pin in SERVO mode). */
  servoAttach(n: number, minUs = 544, maxUs = 2400): void {
    const pin = this.pins[n];
    if (!pin || pin.mode === PinMode.SERVO) return;
    this.modeChanged(n, PinMode.SERVO, 0);
    this.send(encode.servoConfig(n, minUs, maxUs));
  }

  reportAnalog(n: number, on: boolean): void {
    const channel = this.pins[n]?.analogChannel;
    if (channel === null || channel === undefined || channel > 15) return;
    this.send(encode.reportAnalog(channel, on));
  }

  reportDigitalPort(port: number, on: boolean): void {
    this.send(encode.reportDigital(port, on));
  }

  setSamplingInterval(ms: number): void {
    this.send(encode.samplingInterval(ms));
  }

  close(): Promise<void> {
    return this.transport?.close() ?? Promise.resolve();
  }

  private send(data: Uint8Array): Promise<void> {
    if (!this.transport?.isOpen) return Promise.resolve();
    // A failed write ends the link, and the snapshot says so; callers don't need the rejection.
    return this.transport.write(data).catch(() => undefined);
  }

  private waitFor(match: (m: FirmataMessage) => boolean, ms: number): Promise<FirmataMessage> {
    if (!this.ready) return Promise.reject(new HwError("disconnected", "The board is not connected"));
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        match,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new HwError("no-firmata", "The board did not answer in Firmata"));
      }, ms);
      this.waiters.push(waiter);
    });
  }

  private setLayout(caps: readonly PinCapabilities[], channels: readonly (number | null)[]): void {
    this.pins = caps.map((modes, pin) => ({ pin, modes, analogChannel: channels[pin] ?? null, mode: null, value: 0 }));
    this.channelPins = new Map();
    this.pins.forEach((p) => {
      if (p.analogChannel !== null) this.channelPins.set(p.analogChannel, p.pin);
    });
    this.commit({ pins: this.pins.slice() });
  }

  private receive(m: FirmataMessage): void {
    for (const w of this.waiters) {
      if (w.match(m)) {
        this.waiters = this.waiters.filter((x) => x !== w);
        w.resolve(m);
        break;
      }
    }
    switch (m.type) {
      case "version":
        this.commit({ protocol: { major: m.major, minor: m.minor } });
        break;
      case "firmware":
        this.commit({ firmware: { name: m.name.replace(/\.ino$/i, ""), major: m.major, minor: m.minor } });
        if (this.pins.length) this.restarted();
        break;
      case "string":
        this.commit({ note: m.text });
        break;
      case "digital":
        for (let bit = 0; bit < 8; bit++) {
          const n = m.port * 8 + bit;
          const pin = this.pins[n];
          if (!pin || (pin.mode !== PinMode.INPUT && pin.mode !== PinMode.PULLUP)) continue;
          const level = (m.value >> bit) & 1;
          if (pin.value !== level) this.input(n, level);
        }
        break;
      case "analog": {
        const n = this.channelPins.get(m.channel);
        if (n !== undefined && this.pins[n]?.mode === PinMode.ANALOG && this.pins[n].value !== m.value) this.input(n, m.value);
        break;
      }
    }
  }

  /** A mode change resets the pin on the board, so the next port write must go out whatever we sent before. */
  private modeChanged(n: number, mode: number, value: number | null): void {
    this.portsWritten.delete(n >> 3);
    this.update(n, { mode, value });
  }

  private restarted(): void {
    this.portsWritten.clear();
    this.pins = this.pins.map((p) => ({ ...p, mode: null, value: 0 }));
    this.commit({ pins: this.pins });
    for (const l of this.resetListeners) l();
  }

  private input(n: number, value: number): void {
    this.update(n, { value });
    for (const l of this.inputListeners) l(n, value);
  }

  private update(n: number, patch: Partial<Pick<BoardPin, "mode" | "value">>): void {
    const pins = this.pins.slice();
    pins[n] = { ...pins[n], ...patch };
    this.pins = pins;
    this.commit({ pins });
  }

  private commit(patch: Partial<BoardSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const l of this.listeners) l();
  }

  private ended(reason: CloseReason, error?: unknown): void {
    const failure = new HwError("disconnected", "The board was disconnected", { cause: error });
    for (const w of this.waiters) w.reject(failure);
    this.waiters = [];
    this.commit({ status: reason });
  }
}
