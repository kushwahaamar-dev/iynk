import { createStore } from "./select.ts";
import type { Store } from "./select.ts";

export type RunPhase = "idle" | "starting" | "running" | "paused" | "stopped" | "done" | "error" | "limit" | "killed";

export type LimitInfo = { which: "statements" | "operations" | "memory" | "time"; text: string };

export type Diagnostic = { id: string; severity: "error" | "warning" | "note"; text: string; file?: string; line?: number };

export type PartStateEntry = { part: string; kind: string } & Record<string, unknown>;

export type PartStateFrame = { tNs: number; pins: Record<string, 0 | 1 | "Z" | "X">; parts: readonly PartStateEntry[] };

export type SerialEntry = { id: number; tNs: number; kind: "out" | "in" | "sys"; text: string };

export type RunView = {
  phase: RunPhase;
  stale: boolean;
  tNs: number;
  frame: PartStateFrame | null;
  serial: SerialEntry[];
  serialDropped: number;
  diagnostics: Diagnostic[];
  limit: LimitInfo | null;
  /** The speed asked for, in simulated seconds per wall second; 0 is as fast as possible. It outlives a run. */
  speed: number;
  achievedSpeed: number;
  behindReal: boolean;
  startedAtMs: number | null;
  runningAtMs: number | null;
};

export type RunMessage =
  | { t: "phase"; phase: RunPhase; limit?: LimitInfo }
  | { t: "frame"; frame: PartStateFrame }
  | { t: "serial"; tNs: number; kind: SerialEntry["kind"]; text: string }
  | { t: "diagnostics"; diagnostics: Diagnostic[]; append?: boolean }
  | { t: "behind"; behind: boolean; achieved?: number }
  | { t: "speed"; speed: number };

export interface RunStore extends Store<RunView> {
  apply(msg: RunMessage): void;
  markStale(): void;
  clearSerial(): void;
  reset(): void;
}

export const SERIAL_RING = 5000;

/** SIMULATION 17.2: the page needs no more than 30 part frames per simulated second. */
const FRAME_GAP_NS = Math.ceil(1e9 / 30);

/** `[t=1.000 s]`, from the integer nanoseconds the simulator stamps. */
export function formatStamp(tNs: number): string {
  return `[t=${(tNs / 1e9).toFixed(3)} s]`;
}

const initial = (): RunView => ({
  phase: "idle",
  stale: false,
  tNs: 0,
  frame: null,
  serial: [],
  serialDropped: 0,
  diagnostics: [],
  limit: null,
  speed: 1,
  achievedSpeed: 0,
  behindReal: false,
  startedAtMs: null,
  runningAtMs: null,
});

export function createRunStore(clock: () => number = () => performance.now()): RunStore {
  const store = createStore<RunView>(initial());
  let nextId = 1;
  // The entry that still waits for its line break; more text for the same stream extends it in place.
  let open: { id: number; kind: SerialEntry["kind"] } | null = null;
  // The newest frame that the rate limit held back; the run's last frame must not be lost to it.
  let held: PartStateFrame | null = null;

  const patch = (changes: Partial<RunView>) => store.setState((s) => ({ ...s, ...changes }));

  function addText(s: RunView, tNs: number, kind: SerialEntry["kind"], text: string): RunView {
    const pieces = text.replace(/\r\n?/g, "\n").split("\n");
    const finished = pieces.pop()!;
    const entries = s.serial.slice();
    const add = (line: string) => {
      const last = entries[entries.length - 1];
      if (open && last && last.id === open.id && open.kind === kind) {
        entries[entries.length - 1] = { ...last, text: last.text + line };
      } else {
        entries.push({ id: nextId++, tNs, kind, text: line });
      }
      open = null;
    };
    for (const line of pieces) add(line);
    if (finished !== "") {
      add(finished);
      open = { id: entries[entries.length - 1]!.id, kind };
    }
    const over = Math.max(0, entries.length - SERIAL_RING);
    return { ...s, serial: over ? entries.slice(over) : entries, serialDropped: s.serialDropped + over };
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    apply(msg) {
      switch (msg.t) {
        case "phase":
          store.setState((s) => {
            if (msg.phase === "starting") {
              open = null;
              held = null;
              return { ...initial(), speed: s.speed, phase: "starting", startedAtMs: clock() };
            }
            const flushed = held;
            held = null;
            return {
              ...s,
              ...(flushed ? { frame: flushed, tNs: flushed.tNs } : {}),
              phase: msg.phase,
              limit: msg.phase === "limit" ? (msg.limit ?? null) : s.limit,
              runningAtMs: msg.phase === "running" && s.runningAtMs === null ? clock() : s.runningAtMs,
            };
          });
          return;
        case "frame":
          store.setState((s) => {
            const { tNs } = msg.frame;
            if (s.frame && tNs >= s.frame.tNs && tNs - s.frame.tNs < FRAME_GAP_NS) {
              held = msg.frame;
              return s;
            }
            held = null;
            return { ...s, frame: msg.frame, tNs };
          });
          return;
        case "serial":
          store.setState((s) => addText(s, msg.tNs, msg.kind, msg.text));
          return;
        case "diagnostics":
          store.setState((s) => ({ ...s, diagnostics: msg.append ? [...s.diagnostics, ...msg.diagnostics] : msg.diagnostics }));
          return;
        case "behind": {
          const { behindReal, achievedSpeed } = store.getState();
          const achieved = msg.achieved ?? 0;
          if (behindReal !== msg.behind || achievedSpeed !== achieved) patch({ behindReal: msg.behind, achievedSpeed: achieved });
          return;
        }
        case "speed":
          patch({ speed: msg.speed });
          return;
      }
    },
    markStale() {
      const s = store.getState();
      if (s.phase !== "idle" && !s.stale) patch({ stale: true });
    },
    clearSerial() {
      open = null;
      patch({ serial: [], serialDropped: 0 });
    },
    reset() {
      open = null;
      store.setState((s) => ({ ...initial(), speed: s.speed }));
    },
  };
}
