import type { ReplayLog } from "../../project/generated/types.ts";
import type { SimTime } from "../core/clock.ts";
import type { InputEntry, SimSettings } from "../engine.ts";
import type { Orchestrator } from "../orchestrator.ts";
import { pinTraceHash, serialHash } from "./trace.ts";

/** The `dmath` module is not adopted yet (ADR-0303), so every record says so. */
export const DMATH_VERSION = "none";

export interface ReplayRecord {
  format: 1;
  docHash: string;
  seed: number;
  settings: SimSettings;
  versions: { engines: Record<string, string>; models: Record<string, string>; dmath: string };
  inputs: InputEntry[];
  checkpoints: Array<{ at: SimTime; hash: string }>;
  endsAt: SimTime;
  pinTraceHash: string;
  serialHash: string;
}

/** What a log can carry; the optional four have no place in `ReplayLog`. */
export type ReplaySpec = Pick<ReplayRecord, "docHash" | "seed" | "versions" | "inputs" | "checkpoints"> &
  Partial<Pick<ReplayRecord, "settings" | "endsAt" | "pinTraceHash" | "serialHash">>;

export interface RecorderContext {
  docHash: string;
  settings: SimSettings;
  engineVersions: Record<string, string>;
  modelVersions?: Record<string, string>;
  /** The serial output so far, read when the record is finished. The orchestrator does not see serial text. */
  serial: () => ReadonlyArray<{ at: SimTime; text: string }>;
}

export function createRecorder(o: Orchestrator, ctx: RecorderContext): { finish(endsAt: SimTime): ReplayRecord } {
  return {
    finish: (endsAt) => ({
      format: 1,
      docHash: ctx.docHash,
      seed: ctx.settings.seed,
      settings: ctx.settings,
      versions: { engines: { ...ctx.engineVersions }, models: { ...ctx.modelVersions }, dmath: DMATH_VERSION },
      inputs: o.inputs.map((i) => ({ ...i })),
      checkpoints: o.checkpoints.map((c) => ({ ...c })),
      endsAt,
      pinTraceHash: pinTraceHash(o.pinEdges()),
      serialHash: serialHash(ctx.serial()),
    }),
  };
}

const SHA256 = /^[0-9a-f]{64}$/;
const PADDING = "0".repeat(48);
const MAX_ENGINES = 16;
const MAX_VERSION = 40;
const MAX_EVENTS = 1_000_000;
const MAX_CHECKPOINTS = 100_000;
const MODEL_PREFIX = "model:";

type LogEvent = ReplayLog["events"][number];

const KINDS: readonly InputEntry["kind"][] = ["pin", "analog", "serial", "param", "fault", "control"];

function eventKind(i: InputEntry): LogEvent["kind"] {
  if (i.kind === "fault") return "fault";
  if (i.kind === "control") return i.target === "power" ? "power" : "reset";
  return "input";
}

/** Maps a record to the schema's `iynk.replay`. `project` is given by the caller; a record that does not fit is refused. */
export function toReplayLog(r: ReplayRecord, project: { id: string; revision: number }): ReplayLog | { error: string } {
  if (!SHA256.test(r.docHash)) return { error: `docHash must be 64 hex digits, got ${r.docHash.length} characters` };
  if (!Number.isInteger(r.seed) || r.seed < 0 || r.seed > 0xffffffff) return { error: `seed ${r.seed} is not in 0 to 4294967295` };
  if (r.inputs.length > MAX_EVENTS) return { error: `${r.inputs.length} inputs; a log holds at most ${MAX_EVENTS}` };
  if (r.checkpoints.length > MAX_CHECKPOINTS) return { error: `${r.checkpoints.length} checkpoints; a log holds at most ${MAX_CHECKPOINTS}` };

  const engines: Record<string, string> = { ...r.versions.engines, dmath: r.versions.dmath };
  for (const [name, version] of Object.entries(r.versions.models)) engines[MODEL_PREFIX + name] = version;
  const keys = Object.keys(engines);
  if (keys.length > MAX_ENGINES) return { error: `${keys.length} engine and model versions; a log holds at most ${MAX_ENGINES}` };
  for (const key of keys) {
    const version = engines[key];
    if (version.length < 1 || version.length > MAX_VERSION) return { error: `version of ${key} must be 1 to ${MAX_VERSION} characters, got ${version.length}` };
  }
  for (const c of r.checkpoints) {
    if (c.hash.length !== 16) return { error: `checkpoint hash at ${c.at} must be 16 hex digits` };
  }

  return {
    format: "iynk.replay",
    version: 1,
    project: { id: project.id, revision: project.revision, stateHash: r.docHash },
    engines,
    seed: r.seed,
    events: r.inputs.map((i) => ({
      tNs: i.at,
      kind: eventKind(i),
      data: { seq: i.seq, kind: i.kind, target: i.target, value: i.value },
    })),
    checkpoints: r.checkpoints.map((c) => ({ tNs: c.at, hash: PADDING + c.hash })),
  };
}

const describeEngines = (engines: Record<string, string | undefined>): string =>
  Object.keys(engines)
    .sort()
    .map((k) => `${k}=${engines[k]}`)
    .join(", ");

function inputOf(e: LogEvent): InputEntry | null {
  const d = e.data as Partial<InputEntry>;
  if (typeof d.seq !== "number" || typeof d.target !== "string" || !KINDS.includes(d.kind as InputEntry["kind"])) return null;
  return { at: e.tNs, seq: d.seq, kind: d.kind as InputEntry["kind"], target: d.target, value: d.value };
}

/** Whole-string compare of every engine, model and dmath version; a difference refuses and shows both sides. */
export function refuseIfVersionsDiffer(rec: ReplayRecord, running: ReplayRecord["versions"]): { ok: true } | { ok: false; shown: string[] } {
  const side = (v: ReplayRecord["versions"]): string =>
    [`engines ${describeEngines(v.engines)}`, `models ${describeEngines(v.models)}`, `dmath ${v.dmath}`].join("; ");
  const logged = side(rec.versions);
  const here = side(running);
  return logged === here ? { ok: true } : { ok: false, shown: [logged, here] };
}

/** Reads a log back. It refuses a log made on other engine versions than the ones running, and says both. */
export function fromReplayLog(log: ReplayLog, running: { engines: Record<string, string> }): ReplaySpec | { error: string } {
  const engines: Record<string, string> = {};
  const models: Record<string, string> = {};
  let dmath = "";
  for (const [key, version] of Object.entries(log.engines)) {
    if (version === undefined) continue;
    if (key === "dmath") dmath = version;
    else if (key.startsWith(MODEL_PREFIX)) models[key.slice(MODEL_PREFIX.length)] = version;
    else engines[key] = version;
  }
  const logged = describeEngines(engines);
  const here = describeEngines(running.engines);
  if (logged !== here) return { error: `the log was made on engines [${logged}] but [${here}] are running` };

  const inputs: InputEntry[] = [];
  for (const event of log.events) {
    const input = inputOf(event);
    if (!input) return { error: `the event at ${event.tNs} ns does not carry seq, kind and target` };
    inputs.push(input);
  }
  const checkpoints: ReplayRecord["checkpoints"] = [];
  for (const c of log.checkpoints ?? []) {
    if (!c.hash.startsWith(PADDING)) return { error: `the checkpoint at ${c.tNs} ns is not a 64-bit hash padded with zeros` };
    checkpoints.push({ at: c.tNs, hash: c.hash.slice(PADDING.length) });
  }
  return { docHash: log.project.stateHash, seed: log.seed, versions: { engines, models, dmath }, inputs, checkpoints };
}
