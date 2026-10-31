import type { OrchestratorSnapshot } from "../engine.ts";

export const SCAN_FROM = 0x08;
export const SCAN_TO = 0x77;
export const DEFAULT_SCAN_BUS = "i2c0";

/** A second copy of the run at the snapshot's moment, owned by the scan and thrown away after it. */
export interface ScanSession {
  probe(addr: number): "ack" | "nack";
  /** The pins the sketch bound with `Wire.begin`, else the board's own I2C pins; null when it has neither. */
  pins(): { sda: string; scl: string } | null;
  dispose(): void;
}

export interface ScanResult {
  bus: string;
  sda: string;
  scl: string;
  probed: number;
  found: number[];
}

export class ScanError extends Error {}

/**
 * Writes the address phase of every address in range on a restored copy of the run and lists the ones that answer.
 * The running simulation is never stepped, so its trace hash cannot change.
 */
export function scanBus(
  snapshot: OrchestratorSnapshot,
  restore: (s: OrchestratorSnapshot) => ScanSession,
  opts: { bus?: string; from?: number; to?: number } = {},
): ScanResult {
  const { bus = DEFAULT_SCAN_BUS, from = SCAN_FROM, to = SCAN_TO } = opts;
  const session = restore(snapshot);
  try {
    const pins = session.pins();
    if (!pins) throw new ScanError("no pins bound");
    const found: number[] = [];
    let probed = 0;
    for (let addr = Math.max(from, SCAN_FROM); addr <= Math.min(to, SCAN_TO); addr++) {
      probed++;
      if (session.probe(addr) === "ack") found.push(addr);
    }
    return { bus, ...pins, probed, found };
  } finally {
    session.dispose();
  }
}
