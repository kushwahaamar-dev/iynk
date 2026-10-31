import type { Actor } from "./frames.ts";

export type OpClass = "live-safe" | "sim-affecting" | "run-input";

export const RUN_EV_KINDS = ["pin", "analog", "serial", "param", "fault", "control"] as const;
export type RunEvKind = (typeof RUN_EV_KINDS)[number];

export const RUN_REQ_NAMES = ["start", "pause", "resume", "stop", "reset", "step", "speed", "input"] as const;
export type RunReqName = (typeof RUN_REQ_NAMES)[number];

export const RUN_DETACH_MODES = ["frames", "own", "sync"] as const;
export type RunDetachMode = (typeof RUN_DETACH_MODES)[number];

export const RUN_LIMITS = {
  reqPerSec: 20,
  logMax: 50_000,
  frameMaxBytes: 16 * 1024,
  framesPerSec: 10,
  evValueMaxBytes: 4096,
  targetMaxChars: 128,
} as const;

export interface RunState {
  runId: string;
  state: "idle" | "running" | "paused" | "halted" | "done";
  runner: Actor | null;
  atSeq: number;
  seed: number;
  speed: number;
  horizonNs: number;
  versions: Record<string, string>;
  rseq: number;
  haltReason?: "edited" | "server-restarted" | "log_full" | "error";
}

const LIVE_SAFE_GROUPS: ReadonlySet<string> = new Set(["view", "label", "meta", "guide", "instrument"]);
const RUN_INPUT_KINDS: ReadonlySet<string> = new Set(["fault.set", "input.set", "script.set"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Firmware binaries feed the runtime; every other asset role is only shown. */
function assetFeedsSim(value: unknown): boolean {
  return isRecord(value) && value.role === "binary";
}

/** Bodies carry mass and shape, so they change the physics; frames, joints and mounts are only drawn. */
function touchesBodies(op: { collection?: unknown; value?: unknown }): boolean {
  return op.collection === "bodies";
}

/** An unknown kind is `sim-affecting`: halting a run is safer than letting the runs diverge. */
export function classifyOp(op: { kind: string; value?: unknown; collection?: unknown }): OpClass {
  if (RUN_INPUT_KINDS.has(op.kind)) return "run-input";
  const [group] = op.kind.split(".");
  if (LIVE_SAFE_GROUPS.has(group)) return "live-safe";
  if (op.kind === "wire.route") return "live-safe";
  if (group === "asset") return assetFeedsSim(op.value) ? "sim-affecting" : "live-safe";
  if (group === "mech") return touchesBodies(op) ? "sim-affecting" : "live-safe";
  return "sim-affecting";
}
