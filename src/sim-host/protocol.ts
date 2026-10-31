import type { CheckJob, CheckOutcome } from "@/lib/interp";
import type { SimTime } from "@/sim/core/clock";
import type {
  HostInput,
  PartState,
  ProgramImage,
  SimDiagnostic,
  SimNetlist,
  SimRunOptions,
  StepUnit,
} from "@/sim/engine";
import type { Finding } from "@/sim/faults/types";
import type { ProbeHandle, ProbeSpec, Reading, TraceChunk } from "@/sim/probe/tap";

export type ControlOp = "run" | "pause" | "stop" | "reset" | "cancel";

export type PinLevel = 0 | 1 | "Z" | "X";

/** SIM A.4. A run has one runtime, so every op names the engine id it is for in the request. */
export type DebugOp =
  | { op: "set-breakpoints"; file: string; lines: number[] }
  | { op: "continue" }
  | { op: "pause" }
  | { op: "step"; unit: "line" | "over" | "out" }
  | { op: "inspect"; frame: number }
  | { op: "watch"; addr: number; len: number }
  | { op: "unwatch"; addr: number };

export type SimRunState = "idle" | "running" | "paused" | "halted" | "done" | "limit";

/** The port adds `v: 1` and the call id on the way out and the handler never sees them. `run` is the run id (R-041). */
export type SimReq =
  | { t: "load"; run: number; net: SimNetlist; opts: SimRunOptions; program: ProgramImage }
  | { t: "control"; run: number; op: ControlOp }
  /** Only `ns` and `event` run; the other units ack with the diagnostic `step-unit-unsupported`. A running run refuses with `not_paused`. */
  | { t: "step"; run: number; unit: StepUnit; n: number }
  /** Simulated seconds per wall second, 0.01 to 100, or 0 for as fast as the slice budget allows. Engines are never told. */
  | { t: "speed"; run: number; x: number }
  | { t: "input"; run: number; input: HostInput }
  | { t: "check"; job: CheckJob; budgetMs?: number }
  /** Runs the fault rules over a netlist. `sources` is path to text; the code rules read it when it is not empty. */
  | { t: "static-check"; net: SimNetlist; sources: Record<string, string> }
  /** Probes belong to the run: a load or a reset clears them, and the UI adds them again. At most 64. */
  | { t: "probe.add"; run: number; spec: ProbeSpec }
  | { t: "probe.remove"; run: number; id: string }
  | { t: "probe.read"; run: number; id: string }
  /** Streams the samples of a probe from `from` on, as `probe.chunk` events. */
  | { t: "probe.sub"; run: number; id: string; from: SimTime }
  /** `runtime` is the id of the engine the op is for. `inspect`, `watch` and `unwatch` answer `not-yet`. */
  | { t: "debug"; run: number; runtime: string; op: DebugOp }
  /** Answered only when the run is at `tNs`. */
  | { t: "hashes.request"; run: number; tNs: SimTime }
  /** Busy-loops for ever so the watchdog can be tested; answered only by a worker created with `diag`. */
  | { t: "diag"; op: "stall" };

export type SimEv =
  | {
      t: "frame";
      run: number;
      at: SimTime;
      pins: Record<string, PinLevel>;
      parts: PartState[];
      serial: Array<{ at: SimTime; text: string }>;
    }
  | { t: "state"; run: number; state: SimRunState; at: SimTime; limit?: { kind: string; message: string } }
  /** What the last second of a running run achieved, and whether that is short of the speed asked for. */
  | { t: "probe.reading"; run: number; id: string; reading: Reading }
  | { t: "probe.chunk"; run: number; chunk: TraceChunk }
  | { t: "speed.report"; run: number; achieved: number; behind: boolean }
  | {
      t: "event";
      run: number;
      event:
        | { kind: "diagnostic" | "output-contention" | "no-time-progress"; message: string; at: SimTime }
        | {
            kind: "paused";
            runtime: string;
            reason: "breakpoint" | "step" | "watch";
            file: string;
            line: number;
            atNs: SimTime;
            bound?: Array<{ file: string; line: number }>;
          }
        /** Posted when a run ends and when it pauses. */
        | { kind: "findings"; findings: Finding[] };
    };

/** The ack of `debug` `step`: whether the step ran, and the state the run is in. */
export interface DebugStepReply {
  state: SimRunState;
}

/** The ack of `load` and `step`. */
export interface DiagnosticsReply {
  diagnostics: SimDiagnostic[];
}

/** The ack of `static-check`. */
export interface StaticCheckReply {
  findings: Finding[];
  /** Rule id, then the reason a check was skipped, then how many times. */
  skipped: Record<string, Record<string, number>>;
  errors: Array<{ ruleId: string; message: string }>;
}

/** A request for a run the worker no longer has is acked with this and does nothing. */
export interface IgnoredReply {
  ignored: true;
}

/** The ack of `probe.add`. */
export interface ProbeAddReply {
  error?: NonNullable<ProbeHandle["error"]>;
}

/** The ack of `hashes.request`: the two class hashes of the run at `tNs`. */
export interface HashesReply {
  tNs: SimTime;
  hb: string;
  hd: string;
}
