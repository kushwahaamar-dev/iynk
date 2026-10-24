// The one hardware-twin session of the tab. It outlives the panel, so switching
// LabDock tabs or lessons keeps the board connected; whichever lab panel is
// mounted attaches its sim, and with none attached the board idles safely.

import { track } from "@/lib/telemetry";
import { FirmataBoard, HwError, type HwErrorCode } from "./board";
import { getSerial, type SerialLike, type SerialPortLike } from "./serial";
import { TwinBridge, type SimFrame, type TwinOptions, type TwinSim } from "./twin";
import { BOARD_VENDOR_IDS, identifyUsb } from "./usb";

export type SessionError = HwErrorCode | "denied";

export type SessionSnapshot = {
  readonly phase: "idle" | "connecting" | "connected";
  readonly error: SessionError | null;
  /** Ports this site may open without the chooser (granted earlier). */
  readonly known: readonly SerialPortLike[];
  readonly board: FirmataBoard | null;
  readonly bridge: TwinBridge | null;
  readonly options: TwinOptions;
};

const IDLE_FRAME: SimFrame = Object.freeze({ boardId: null, running: false, pins: Object.freeze({}), inputs: Object.freeze([]), inputsReady: true });

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

export class TwinSession {
  private snap: SessionSnapshot = { phase: "idle", error: null, known: [], board: null, bridge: null, options: { drive: true, sense: true } };
  private readonly listeners = new Set<() => void>();
  private sim: TwinSim | null = null;
  private simOff: (() => void) | null = null;
  private readonly simListeners = new Set<() => void>();
  private watching = false;

  /** Forwards to whichever lab is attached; an idle frame when none is. */
  private readonly proxy: TwinSim = {
    getFrame: () => this.sim?.getFrame() ?? IDLE_FRAME,
    subscribe: (listener) => {
      this.simListeners.add(listener);
      return () => this.simListeners.delete(listener);
    },
    setInput: (id, value) => this.sim?.setInput(id, value),
  };

  constructor(private readonly serial: () => SerialLike | null = getSerial) {}

  getSnapshot = (): SessionSnapshot => this.snap;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.watchPorts();
    return () => this.listeners.delete(listener);
  };

  /** The lab whose sketch the board follows. Returns the detach function. */
  attach(sim: TwinSim): () => void {
    this.simOff?.();
    this.sim = sim;
    this.simOff = sim.subscribe(() => this.emitSim());
    this.emitSim();
    return () => {
      if (this.sim !== sim) return;
      this.simOff?.();
      this.simOff = null;
      this.sim = null;
      this.emitSim();
    };
  }

  /**
   * Connect to `port`, or open the browser's chooser when it is omitted. Call it
   * straight from a click: the chooser needs the click's user activation, so
   * nothing is awaited before requestPort().
   */
  async connect(port?: SerialPortLike): Promise<void> {
    if (this.snap.phase !== "idle") return;
    const serial = this.serial();
    if (!serial) return;
    this.commit({ error: null });
    let chosen = port;
    if (!chosen) {
      try {
        chosen = await serial.requestPort({ filters: BOARD_VENDOR_IDS.map((usbVendorId) => ({ usbVendorId })) });
      } catch (error) {
        // NotFoundError: the learner closed the chooser without picking a board.
        if (errorName(error) !== "NotFoundError") this.commit({ error: errorName(error) === "SecurityError" ? "denied" : "failed" });
        return;
      }
    }
    this.commit({ phase: "connecting", error: null });
    let board: FirmataBoard;
    try {
      board = await FirmataBoard.connect(chosen);
    } catch (error) {
      this.commit({ phase: "idle", error: error instanceof HwError ? error.code : "failed" });
      return;
    }
    const bridge = new TwinBridge(board, this.proxy, this.snap.options);
    board.subscribe(() => {
      if (!board.ready && this.snap.board === board) this.ended(board.getSnapshot().status === "closed" ? null : "disconnected");
    });
    bridge.start();
    this.commit({ phase: "connected", board, bridge });
    void this.refreshKnown();
    const { firmware, usb, pins } = board.getSnapshot();
    const id = identifyUsb(usb);
    track("hw.connect", {
      firmware: firmware ? `${firmware.name} ${firmware.major}.${firmware.minor}` : null,
      board: id.kind === "board" ? id.name : id.kind === "adapter" ? id.chip : null,
      pins: pins.length,
    });
  }

  /** Leave the board safe (outputs LOW, pins high-impedance), then close the port. */
  async disconnect(): Promise<void> {
    const { board, bridge } = this.snap;
    if (!board) return;
    bridge?.stop();
    this.commit({ phase: "idle", board: null, bridge: null, error: null });
    await board.close();
  }

  setOptions(patch: Partial<TwinOptions>): void {
    const options = { ...this.snap.options, ...patch };
    this.snap.bridge?.set(options);
    this.commit({ options });
  }

  async refreshKnown(): Promise<void> {
    const serial = this.serial();
    if (!serial) return;
    try {
      const ports = await serial.getPorts();
      this.commit({ known: ports.filter((p) => p.connected !== false) });
    } catch {
      // getPorts() only fails when the page lost access to serial ports; the chooser still works.
    }
  }

  private watchPorts(): void {
    const serial = this.serial();
    if (this.watching || !serial) return;
    this.watching = true;
    const refresh = () => void this.refreshKnown();
    serial.addEventListener("connect", refresh);
    serial.addEventListener("disconnect", refresh);
    refresh();
  }

  private ended(error: SessionError | null): void {
    this.snap.bridge?.stop();
    this.commit({ phase: "idle", board: null, bridge: null, error });
    void this.refreshKnown();
  }

  private emitSim(): void {
    for (const l of this.simListeners) l();
  }

  private commit(patch: Partial<SessionSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const l of this.listeners) l();
  }
}

export const twinSession = new TwinSession();
