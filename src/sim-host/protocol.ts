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

export type ControlOp = "run" | "pause" | "stop" | "reset" | "cancel";

export type PinLevel = 0 | 1 | "Z" | "X";

export type SimRunState = "idle" | "running" | "paused" | "halted" | "done" | "limit";

/** The port adds `v: 1` and the call id on the way out and the handler never sees them. `run` is the run id (R-041). */
export type SimReq =
  | { t: "load"; run: number; net: SimNetlist; opts: SimRunOptions; program: ProgramImage }
  | { t: "control"; run: number; op: ControlOp }
  /** Only `ns` and `event` run; the other units ack with the diagnostic `step-unit-unsupported`. */
  | { t: "step"; run: number; unit: StepUnit; n: number }
  | { t: "input"; run: number; input: HostInput }
  | { t: "check"; job: CheckJob; budgetMs?: number }
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
  | {
      t: "event";
      run: number;
      event: { kind: "diagnostic" | "output-contention" | "no-time-progress"; message: string; at: SimTime };
    };

/** The ack of `load` and `step`. */
export interface DiagnosticsReply {
  diagnostics: SimDiagnostic[];
}

/** A request for a run the worker no longer has is acked with this and does nothing. */
export interface IgnoredReply {
  ignored: true;
}
