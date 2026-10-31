import { deviceAssetBytes, type AssetBytes } from "@/local/asset-bytes";
import { builtinRegistry } from "@/parts/builtin";
import type { PartRegistry } from "@/parts/registry";
import type { RunWiring } from "@/collab/run-wiring";
import type { Op, Project } from "@/project/generated/types";
import type { OpImpact } from "@/project/opImpact";
import type { SimHost } from "@/sim-host/host";
import { buildSimNetlist } from "@/sim-host";
import type { SimEv } from "@/sim-host/protocol";
import type { ProgramImage, SimDiagnostic, SimRunOptions, StepUnit } from "@/sim/engine";
import type { DocStore } from "@/studio/stores/doc";
import type { Diagnostic, LimitInfo, RunStore } from "@/studio/stores/run";

export type SimHostLike = Pick<SimHost, "load" | "control" | "input" | "debug" | "onEvent" | "pause" | "resume" | "step" | "setSpeed">;

export interface SimLinkDeps {
  doc: DocStore;
  run: RunStore;
  host: SimHostLike;
  impact: (ops: Op[]) => OpImpact;
  reg?: Pick<PartRegistry, "get">;
  /** The breakpoint lines by source path, read each time a run starts. */
  breakpoints?: () => Readonly<Record<string, readonly number[]>>;
  /** Where the imported files of the project are read from; a run on the avr8js engine needs its hex. */
  assets?: Pick<AssetBytes, "get">;
}

export interface SimLink {
  run(): Promise<void>;
  stop(): void;
  reset(): void;
  pause(): void;
  resume(): void;
  /** Runs `n` units of one kind from a paused run; the host refuses while running. */
  step(unit: StepUnit, n: number): void;
  /** Simulated seconds per wall second, or 0 for as fast as possible. */
  setSpeed(x: number): void;
  restart(): Promise<void>;
  sendSerial(text: string): void;
  press(c: string, pin: string, down: boolean): void;
  dispose(): void;
}

const LIMITS = { statements: 400_000, events: 100_000, outputBytes: 1024 * 1024 };
const WORKER_REPLACED = ["wall-stall", "cancel-unanswered"];

let target: RunWiring | null = null;
const targetListeners = new Set<() => void>();

/** Points the run controls at a room's run, or back at the local host with `null`. */
export function setRunTarget(next: RunWiring | null) {
  if (target === next) return;
  target = next;
  for (const fn of [...targetListeners]) fn();
}

export const getRunTarget = (): RunWiring | null => target;

export function subscribeRunTarget(fn: () => void): () => void {
  targetListeners.add(fn);
  return () => void targetListeners.delete(fn);
}

/** The room's run when the controls belong to it: a private run is the member's own. */
function sharedRun(): RunWiring | null {
  return target && target.client.state.status !== "detached-own" ? target : null;
}

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
export function programOf(state: Project): ProgramImage | null {
  const firmware = state.boards.find((b) => b.firmware)?.firmware;
  if (!firmware) return null;
  const files = firmware.sources.flatMap((id) => {
    const source = state.sources.find((s) => s.id === id);
    return source ? [{ path: source.path, text: source.content }] : [];
  });
  const entry = state.sources.find((s) => s.id === firmware.entry)?.path;
  return entry === undefined || files.length === 0 ? null : { kind: "source", language: firmware.language, files, entry };
}

const FIRMWARE_ENGINE = "avr8js";
const textOf = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/** The hex of the first runtime when it runs on the avr8js engine, with its ELF when one was imported; null when the files are not there. */
async function hexProgramOf(state: Project, assets: Pick<AssetBytes, "get">): Promise<ProgramImage | null> {
  const options: { image?: string; elf?: string } | undefined = state.simulation.runtimes[0]?.options;
  const read = async (id: string | undefined): Promise<Uint8Array | null> => {
    const asset = state.assets.find((a) => a.id === id);
    return asset ? assets.get(asset.sha256) : null;
  };
  const hex = await read(options?.image);
  if (!hex) return null;
  const elf = options?.elf === undefined ? undefined : ((await read(options.elf)) ?? undefined);
  return { kind: "hex", hex: textOf(hex), ...(elf ? { elf } : {}) };
}

/** Loads the project's circuit and firmware into `host`, not started, at the speed a mirrored run needs. */
export async function loadForRun(host: Pick<SimHost, "load">, state: Project, seed: number, reg: Pick<PartRegistry, "get"> = builtinRegistry()): Promise<void> {
  const { net, diagnostics } = buildSimNetlist(state, reg);
  const program = programOf(state);
  if (!program) throw new Error("The project has no code to run.");
  const blocked = diagnostics.find((d) => d.severity === "error");
  if (blocked) throw new Error(String(blocked.args?.message ?? blocked.text_key));
  const loaded = await host.load(net, { seed, speed: 0, limits: LIMITS, tier: "T1" }, program);
  const failed = loaded.diagnostics.find((d) => d.severity === "error");
  if (failed) throw new Error(String(failed.args?.message ?? failed.text_key));
}

export function linkSim({ doc, run, host, impact, reg = builtinRegistry(), breakpoints = () => ({}), assets = deviceAssetBytes() }: SimLinkDeps): SimLink {
  // A newer start, stop or reset makes the answers of an older start irrelevant.
  let generation = 0;

  function onSimEvent(ev: SimEv) {
    if (run.getState().phase === "idle") return;
    if (ev.t === "frame") {
      run.apply({ t: "frame", frame: { tNs: ev.at, pins: ev.pins, parts: ev.parts } });
      for (const chunk of ev.serial) run.apply({ t: "serial", tNs: chunk.at, kind: "out", text: chunk.text });
      return;
    }
    if (ev.t === "speed.report") {
      run.apply({ t: "behind", behind: ev.behind, achieved: ev.achieved });
      return;
    }
    if (ev.t === "event") {
      if (ev.event.kind === "paused" || ev.event.kind === "findings") return;
      const severity = ev.event.kind === "no-time-progress" ? "error" : "warning";
      run.apply({ t: "diagnostics", append: true, diagnostics: [{ id: ev.event.kind, severity, text: ev.event.message }] });
      return;
    }
    if (ev.t !== "state") return;
    if (ev.state === "running") run.apply({ t: "phase", phase: "running" });
    else if (ev.state === "paused") run.apply({ t: "phase", phase: "paused" });
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

  /** A board that cannot be debugged refuses the op; its run just goes without breakpoints. */
  async function armBreakpoints(program: ProgramImage): Promise<void> {
    const marked = breakpoints();
    if (program.kind !== "source") return;
    for (const { path } of program.files) {
      const lines = marked[path];
      if (lines?.length) await host.debug({ op: "set-breakpoints", file: path, lines: [...lines] }).catch(() => undefined);
    }
  }

  async function start(): Promise<void> {
    const mine = ++generation;
    run.apply({ t: "phase", phase: "starting" });
    const fail = (diagnostics: Diagnostic[]) => {
      run.apply({ t: "diagnostics", diagnostics });
      run.apply({ t: "phase", phase: "error" });
    };
    const state = doc.getState().state;
    const { net, diagnostics: netDiagnostics } = buildSimNetlist(state, reg);
    const blocked = netDiagnostics.filter((d) => d.severity === "error");
    if (blocked.length > 0) return fail(blocked.map(diagnosticOf));
    const compiled = state.simulation.runtimes[0]?.engine === FIRMWARE_ENGINE;
    const program = compiled ? await hexProgramOf(state, assets) : programOf(state);
    if (mine !== generation) return;
    if (!program) return fail([compiled ? failure("no-firmware-image", "Import a .hex file to run in Firmware mode.") : failure("no-firmware", "The project has no code to run.")]);
    const opts: SimRunOptions = { seed: state.simulation.seed, speed: run.getState().speed, limits: LIMITS, tier: "T1" };
    try {
      const loaded = await host.load(net, opts, program);
      if (mine !== generation) return;
      const errors = loaded.diagnostics.filter((d) => d.severity === "error").map(diagnosticOf);
      if (errors.length > 0) return fail(errors);
      run.apply({ t: "diagnostics", diagnostics: [...netDiagnostics, ...loaded.diagnostics].map(diagnosticOf) });
      await armBreakpoints(program);
      await host.control("run");
    } catch (err) {
      if (mine === generation) fail([failure("host-failed", err instanceof Error ? err.message : String(err))]);
    }
  }

  const quiet = (op: "stop" | "reset") => void host.control(op).catch(() => undefined);

  return {
    async run() {
      const shared = sharedRun();
      if (shared) return shared.start(run.getState().speed);
      const { phase, stale } = run.getState();
      if (phase === "starting" || (phase === "running" && !stale)) return;
      await start();
    },
    restart: async () => {
      const shared = sharedRun();
      if (shared) return shared.start(run.getState().speed);
      return start();
    },
    stop() {
      const shared = sharedRun();
      if (shared) return shared.client.request("stop");
      const { phase } = run.getState();
      if (phase !== "starting" && phase !== "running" && phase !== "paused") return;
      generation++;
      run.apply({ t: "phase", phase: "stopped" });
      quiet("stop");
    },
    reset() {
      const shared = sharedRun();
      if (shared) return shared.client.request("reset");
      generation++;
      run.reset();
      quiet("reset");
    },
    pause() {
      const shared = sharedRun();
      if (shared) return shared.client.request("pause");
      if (run.getState().phase === "running") void host.pause().catch(() => undefined);
    },
    resume() {
      const shared = sharedRun();
      if (shared) return shared.client.request("resume");
      if (run.getState().phase === "paused") void host.resume().catch(() => undefined);
    },
    step(unit, n) {
      const shared = sharedRun();
      if (shared) return shared.client.request("step", { unit, n });
      if (run.getState().phase === "paused") void host.step(unit, n).catch(() => undefined);
    },
    setSpeed(x) {
      run.apply({ t: "speed", speed: x });
      const shared = sharedRun();
      if (shared) return shared.client.request("speed", { x });
      if (run.getState().phase !== "idle") void host.setSpeed(x).catch(() => undefined);
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
