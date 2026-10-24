import { loadDrone } from "@/content/index.generated";
import { DRONES, isDroneId, type DroneId } from "@/content/ids";
import { replayDroneSafety, type DroneTestSet } from "./drone-safety";
import { replayHash } from "./hash";
import type { RunKind, RunLog, VerifyResult } from "./runlog";
import { skillIdFor } from "./skill";

export { RUN_KINDS, runLogSchema, type RunKind, type RunLog, type VerifyResult } from "./runlog";
export { skillIdFor, parseSkillId, skillHash } from "./skill";

/** Kinds the server can re-run today; the others wait for the core's pure checks (see docs/hacktx/SOLANA-APP.md). */
export const VERIFIABLE: readonly RunKind[] = ["drone-safety"];

/** The bench tests a craft has: from its content module, else the engine's defaults (FIGURES-DRONE §8). */
export async function droneTestsFor(id: DroneId): Promise<DroneTestSet> {
  const content = await loadDrone(id);
  if (content) {
    const kinds = new Set(content.tests.map((test) => test.kind));
    return {
      smoke: kinds.has("smoke-stopper"),
      motors: kinds.has("motor-direction"),
      calibrate: kinds.has("accel-calibration"),
    };
  }
  return { smoke: id !== "whoop", motors: DRONES[id].motors > 0, calibrate: true };
}

/**
 * Re-runs a lab run on the server (H6). It trusts nothing the client says
 * about the outcome: the verdict and the score come from the replay alone.
 */
export async function verifyRun(kind: RunKind, itemId: string, sub: string | undefined, run: RunLog): Promise<VerifyResult> {
  if (run.kind !== kind || run.itemId !== itemId || (run.sub ?? undefined) !== sub) {
    return { ok: false, code: "mismatch", reason: "The run log is for a different lab item." };
  }
  const skillId = skillIdFor(kind, itemId, sub);
  if (!skillId) return { ok: false, code: "mismatch", reason: "Unknown skill." };
  const hash = await replayHash(run.inputs);

  if (kind === "drone-safety") {
    if (!isDroneId(itemId)) return { ok: false, code: "mismatch", reason: "Unknown drone.", replayHash: hash };
    const tests = await droneTestsFor(itemId);
    if (!tests.smoke && !tests.motors && !tests.calibrate) {
      return { ok: false, code: "unsupported", reason: "This craft has no bench safety tests.", replayHash: hash };
    }
    const report = replayDroneSafety(run.inputs, tests);
    if (!report) return { ok: false, code: "mismatch", reason: "The inputs are not a bench run.", replayHash: hash };
    if (!report.pass) {
      const why = report.violations.length ? `rule broken: ${report.violations.join(", ")}` : "not every safety test passed";
      return { ok: false, code: "failed", reason: `The replay did not pass (${why}).`, replayHash: hash };
    }
    return { ok: true, score: report.score, replayHash: hash, skillId };
  }

  return { ok: false, code: "unsupported", reason: `The server cannot re-run "${kind}" runs yet.`, replayHash: hash };
}
