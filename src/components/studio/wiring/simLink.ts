import { builtinRegistry } from "@/parts/builtin";
import type { PartRegistry } from "@/parts/registry";
import type { Op, Project } from "@/project/generated/types";
import type { OpImpact } from "@/project/opImpact";
import type { SimHost } from "@/sim-host/host";
import { buildSimNetlist } from "@/sim-host";
import type { SimEv } from "@/sim-host/protocol";
import type { ProgramImage, SimDiagnostic, SimRunOptions } from "@/sim/engine";
import type { DocStore } from "@/studio/stores/doc";
import type { Diagnostic, LimitInfo, RunStore } from "@/studio/stores/run";

export type SimHostLike = Pick<SimHost, "load" | "control" | "input" | "onEvent">;

export interface SimLinkDeps {
  doc: DocStore;
  run: RunStore;
  host: SimHostLike;
  impact: (ops: Op[]) => OpImpact;
  reg?: Pick<PartRegistry, "get">;
  /** Wall clock in milliseconds, for the "slower than real time" note. */
  wallMs?: () => number;
}

export interface SimLink {
  run(): Promise<void>;
  stop(): void;
  reset(): void;
  restart(): Promise<void>;
  sendSerial(text: string): void;
  press(c: string, pin: string, down: boolean): void;
  dispose(): void;
}

const LIMITS = { statements: 400_000, events: 100_000, outputBytes: 1024 * 1024 };
/** How far the simulation may trail the wall clock before the run bar says so. */
const BEHIND_MS = 500;
const WORKER_REPLACED = ["wall-stall", "cancel-unanswered"];

const failure = (id: string, text: string): Diagnostic => ({ id, severity: "error", text });

function limitOf(message: string): LimitInfo {
  const lower = message.toLowerCase();
  const which = lower.includes("statement") ? "statements" : lower.includes("operation") ? "operations" : lower.includes("memory") ? "memory" : "time";
  return { which, text: message };
}

function diagnosticOf(d: SimDiagnostic): Diagnostic {
  const found: Diagnostic = { id: d.id, severity: d.severity, text: String(d.args?.message ?? d.text_key) };
  if (d.ref.file !== undefined) found.file = d.ref.file;
  if (d.ref.line !== undefined) found.line = d.ref.line;
  return found;
}

/** The firmware of the first board that has one, with the entry resolved from its source id to a path. */
function programOf(state: Project): ProgramImage | null {
  const firmware = state.boards.find((b) => b.firmware)?.firmware;
  if (!firmware) return null;
  const files = firmware.sources.flatMap((id) => {
    const source = state.sources.find((s) => s.id === id);
    return source ? [{ path: source.path, text: source.content }] : [];
  });
  const entry = state.sources.find((s) => s.id === firmware.entry)?.path;
  return entry === undefined || files.length === 0 ? null : { kind: "source", language: firmware.language, files, entry };
}

export function linkSim({ doc, run, host, impact, reg = builtinRegistry(), wallMs = () => performance.now() }: SimLinkDeps): SimLink {
  // A newer start, stop or reset makes the answers of an older start irrelevant.
  let generation = 0;
  let runningFrom: number | null = null;

  function onSimEvent(ev: SimEv) {
    if (run.getState().phase === "idle") return;
    if (ev.t === "frame") {
      run.apply({ t: "frame", frame: { tNs: ev.at, pins: ev.pins, parts: ev.parts } });
      for (const chunk of ev.serial) run.apply({ t: "serial", tNs: chunk.at, kind: "out", text: chunk.text });
      if (runningFrom !== null) run.apply({ t: "behind", behind: wallMs() - runningFrom - ev.at / 1e6 > BEHIND_MS });
      return;
    }
    if (ev.t === "event") {
      const severity = ev.event.kind === "no-time-progress" ? "error" : "warning";
      run.apply({ t: "diagnostics", append: true, diagnostics: [{ id: ev.event.kind, severity, text: ev.event.message }] });
      return;
    }
    runningFrom = ev.state === "running" ? wallMs() - ev.at / 1e6 : null;
    if (ev.state === "running") run.apply({ t: "phase", phase: "running" });
    else if (ev.state === "paused") run.apply({ t: "phase", phase: "stopped" });
    else if (ev.state === "done") run.apply({ t: "phase", phase: "done" });
    else if (ev.state === "halted") run.apply({ t: "phase", phase: "error" });
    else if (ev.state === "limit") {
      const kind = ev.limit?.kind ?? "";
      if (WORKER_REPLACED.includes(kind)) run.apply({ t: "phase", phase: "killed" });
      else run.apply({ t: "phase", phase: "limit", limit: limitOf(ev.limit?.message ?? "") });
    }
    if (ev.state !== "running") run.apply({ t: "behind", behind: false });
  }

  const offHost = host.onEvent(onSimEvent);
  const offDoc = doc.onChange((change) => {
    if (change.origin === "load" || impact(change.ops) !== "none") run.markStale();
  });

  async function start(): Promise<void> {
    const mine = ++generation;
    runningFrom = null;
    run.apply({ t: "phase", phase: "starting" });
    const fail = (diagnostics: Diagnostic[]) => {
      run.apply({ t: "diagnostics", diagnostics });
      run.apply({ t: "phase", phase: "error" });
    };
    const state = doc.getState().state;
    const { net, diagnostics: netDiagnostics } = buildSimNetlist(state, reg);
    const blocked = netDiagnostics.filter((d) => d.severity === "error");
    if (blocked.length > 0) return fail(blocked.map(diagnosticOf));
    const program = programOf(state);
    if (!program) return fail([failure("no-firmware", "The project has no code to run.")]);
    const opts: SimRunOptions = { seed: state.simulation.seed, speed: 1, limits: LIMITS, tier: "T1" };
    try {
      const loaded = await host.load(net, opts, program);
      if (mine !== generation) return;
      const errors = loaded.diagnostics.filter((d) => d.severity === "error").map(diagnosticOf);
      if (errors.length > 0) return fail(errors);
      run.apply({ t: "diagnostics", diagnostics: [...netDiagnostics, ...loaded.diagnostics].map(diagnosticOf) });
      await host.control("run");
    } catch (err) {
      if (mine === generation) fail([failure("host-failed", err instanceof Error ? err.message : String(err))]);
    }
  }

  const quiet = (op: "stop" | "reset") => void host.control(op).catch(() => undefined);

  return {
    async run() {
      const { phase, stale } = run.getState();
      if (phase === "starting" || (phase === "running" && !stale)) return;
      await start();
    },
    restart: start,
    stop() {
      const { phase } = run.getState();
      if (phase !== "starting" && phase !== "running") return;
      generation++;
      run.apply({ t: "phase", phase: "stopped" });
      quiet("stop");
    },
    reset() {
      generation++;
      run.reset();
      quiet("reset");
    },
    sendSerial(text) {
      if (run.getState().phase !== "running") return;
      run.apply({ t: "serial", tNs: run.getState().tNs, kind: "in", text });
      void host.input({ kind: "serial", target: "serial", value: text }).catch(() => undefined);
    },
    press(c, pin, down) {
      if (run.getState().phase !== "running") return;
      void host.input({ kind: "pin", target: `${c}/${pin}`, value: down }).catch(() => undefined);
    },
    dispose() {
      generation++;
      offHost();
      offDoc();
    },
  };
}
