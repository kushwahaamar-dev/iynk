// Web Serial transport (WICG Web Serial API; MDN "Web Serial API" and
// "SerialPort.close()"). TypeScript's DOM library has no Web Serial types yet,
// so the few members the twin uses are declared here.

export type SerialPortInfo = { usbVendorId?: number; usbProductId?: number };

export interface SerialPortLike extends EventTarget {
  /** False while a granted port's device is unplugged (newer Chromium; absent in older versions). */
  readonly connected?: boolean;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number; bufferSize?: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
}

export interface SerialLike extends EventTarget {
  requestPort(options?: { filters?: SerialPortInfo[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

/** Firmata's default speed (StandardFirmata calls Firmata.begin(57600)). */
export const FIRMATA_BAUD = 57600;

export type SerialSupport = "supported" | "insecure" | "unsupported";

/** Web Serial needs a Chromium desktop browser and a secure context (https or localhost). */
export function serialSupport(scope: { navigator?: unknown; isSecureContext?: boolean } = globalThis): SerialSupport {
  const nav = scope.navigator as { serial?: unknown } | undefined;
  if (nav && typeof nav.serial === "object" && nav.serial !== null) return "supported";
  // Chromium hides navigator.serial outside secure contexts, so tell that case apart.
  if (scope.isSecureContext === false) return "insecure";
  return "unsupported";
}

export function getSerial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  return ((navigator as { serial?: SerialLike }).serial ?? null) as SerialLike | null;
}

export type CloseReason = "closed" | "disconnected" | "error";

export type TransportHandlers = {
  onData(chunk: Uint8Array): void;
  /** Called exactly once when the link ends: close() ("closed"), unplugged ("disconnected") or a line failure ("error"). */
  onClose(reason: CloseReason, error?: unknown): void;
};

/** Errors after which Chromium hands out a fresh `port.readable` (WICG spec, "read" steps). */
const RECOVERABLE_READ_ERRORS = new Set(["BufferOverrunError", "BreakError", "FramingError", "ParityError"]);

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

/**
 * One open serial link: a read loop that survives recoverable line errors,
 * ordered writes, and exactly one onClose, whether the board was unplugged,
 * the line failed or the owner called close().
 */
export class SerialTransport {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closing = false;
  private ended = false;
  private loop: Promise<void> = Promise.resolve();
  private released: Promise<void> | null = null;
  private lastWrite: Promise<void> = Promise.resolve();
  private readonly onDisconnect = () => this.finish("disconnected");

  private constructor(
    readonly port: SerialPortLike,
    private readonly handlers: TransportHandlers,
  ) {}

  static async open(port: SerialPortLike, handlers: TransportHandlers, baudRate = FIRMATA_BAUD): Promise<SerialTransport> {
    await port.open({ baudRate });
    if (!port.writable) {
      await port.close().catch(() => undefined);
      throw new DOMException("The serial port has no writable stream", "NetworkError");
    }
    const transport = new SerialTransport(port, handlers);
    transport.writer = port.writable.getWriter();
    port.addEventListener("disconnect", transport.onDisconnect);
    transport.loop = transport.readLoop();
    return transport;
  }

  get info(): SerialPortInfo {
    return this.port.getInfo();
  }

  get isOpen(): boolean {
    return !this.ended;
  }

  /** Queue bytes for the board; the stream keeps them in order. Rejects once the link has ended. */
  write(data: Uint8Array): Promise<void> {
    if (this.ended || this.closing || !this.writer) {
      return Promise.reject(new DOMException("The serial port is closed", "InvalidStateError"));
    }
    const pending = this.writer.write(data);
    this.lastWrite = pending.catch((error: unknown) => {
      if (!this.closing) this.finish("error", error);
    });
    return pending;
  }

  /** Flush pending writes (up to half a second), stop reading, release both locks and close the port. */
  async close(): Promise<void> {
    if (this.ended || this.closing) return this.released ?? undefined;
    this.closing = true;
    await Promise.race([this.lastWrite, new Promise((resolve) => setTimeout(resolve, 500))]);
    await this.release();
    this.finish("closed");
  }

  private async readLoop(): Promise<void> {
    let failure: unknown = null;
    while (this.port.readable && !this.closing && !this.ended) {
      const reader = this.port.readable.getReader();
      this.reader = reader;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value?.length) this.handlers.onData(value);
        }
      } catch (error) {
        if (!RECOVERABLE_READ_ERRORS.has(errorName(error))) failure = error;
      } finally {
        reader.releaseLock();
        this.reader = null;
      }
      if (failure) break;
    }
    if (this.closing || this.ended) return;
    // The readable stream ended or failed for good: on a USB serial port that means the board went away.
    this.finish(failure && errorName(failure) !== "NetworkError" ? "error" : "disconnected", failure ?? undefined);
  }

  /** Cancel the reader, wait for the loop, unlock the writer and close the port; errors mean it is already gone. */
  private release(): Promise<void> {
    this.released ??= (async () => {
      try {
        await this.reader?.cancel();
      } catch {
        // Already errored.
      }
      await this.loop;
      try {
        this.writer?.releaseLock();
      } catch {
        // Already released.
      }
      this.writer = null;
      try {
        await this.port.close();
      } catch {
        // An unplugged port rejects close(); there is nothing left to close.
      }
    })();
    return this.released;
  }

  private finish(reason: CloseReason, error?: unknown): void {
    if (this.ended) return;
    this.ended = true;
    this.port.removeEventListener("disconnect", this.onDisconnect);
    if (reason !== "closed") void this.release();
    this.handlers.onClose(reason, error);
  }
}
