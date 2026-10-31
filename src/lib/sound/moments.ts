// What just happened in a lab, read from two consecutive store states. The lab
// pages turn each moment into a sound cue and an anonymous telemetry event, so a
// change made by a room peer, the AI partner or a replay sounds and counts the
// same as one made by hand. The bench's are in bench-moments.ts: they need the
// robotics runner, which brings the interpreter, and only the bench page has it.

import type { DroneContent } from "@/content/schema";
import { sketchTones, type BoardLabState } from "@/lib/boardlab/store";
import { buildComplete, testStatus, type TestStatus } from "@/lib/dronelab/bench";
import { readBench } from "@/lib/dronelab/figure";
import type { DroneLabState } from "@/lib/dronelab/workshop";
import { progressKey } from "@/lib/progress/keys";

/** `key` is the D7 progress key of the lesson, task, test or step (null: a step with no key of its own). */
export type Moment =
  | { kind: "attempt"; key: string }
  | { kind: "pass"; key: string }
  | { kind: "fail"; key: string }
  | { kind: "step"; key: string | null }
  | { kind: "fault"; code: string }
  | { kind: "refused" };

export function boardMoments(prev: BoardLabState, next: BoardLabState): Moment[] {
  const out: Moment[] = [];
  const key = next.lesson ? progressKey.boardLesson(next.board, next.lesson) : null;
  if (key && next.checks.status !== prev.checks.status) {
    if (next.checks.status === "running") out.push({ kind: "attempt", key });
    // with a Break it fault still on, passing code doesn't finish the lesson (the Checks panel says so)
    else if (next.checks.status === "done" && next.checks.results.length > 0) out.push({ kind: next.checks.passed && !next.fault ? "pass" : "fail", key });
  }
  if (next.assembly.length > prev.assembly.length) out.push({ kind: "step", key: null });
  if (next.fault && next.fault !== prev.fault) out.push({ kind: "fault", code: next.fault });
  return out;
}

export type HeldTone = { hz: number; loud: number };

/**
 * The pitches a lesson holds while its sketch runs. A figure that solves its circuit reports
 * `sound` (null when nothing sounds), and only that plays: a buzzer on the wrong pin, fitted
 * backwards or missing stays quiet. A figure built before it did gets every tone() pitch.
 */
export function heldTones(s: BoardLabState): Map<string, HeldTone> {
  const out = new Map<string, HeldTone>();
  if (s.run.status !== "running") return out;
  if ("sound" in s.figure) {
    const sound = s.figure.sound as { part?: unknown; hz?: unknown; loud?: unknown } | null;
    if (sound && typeof sound.hz === "number" && sound.hz > 0) {
      out.set(`part:${String(sound.part)}`, { hz: sound.hz, loud: typeof sound.loud === "number" ? sound.loud : 1 });
    }
    return out;
  }
  for (const [net, hz] of Object.entries(sketchTones(s.pins))) out.set(`pin:${net}`, { hz, loud: 1 });
  return out;
}

const finished = (status: TestStatus) => status === "passed" || status === "failed";

export function droneMoments(content: DroneContent, prev: DroneLabState, next: DroneLabState): Moment[] {
  if (next.figure === prev.figure && next.attempted === prev.attempted) return [];
  const out: Moment[] = [];
  for (const test of content.tests) {
    const before = testStatus(test, prev.figure, prev.attempted[test.id] === true);
    const after = testStatus(test, next.figure, next.attempted[test.id] === true);
    if (before === after) continue;
    const key = progressKey.droneTest(content.id, test.id);
    if (after === "running") out.push({ kind: "attempt", key });
    // A result, not the figure changing under an old one (unplugging after a smoke test passed).
    else if (finished(after) && (before === "running" || before === "idle")) out.push({ kind: after === "passed" ? "pass" : "fail", key });
  }
  if (buildComplete(content, next.figure) && !buildComplete(content, prev.figure)) out.push({ kind: "step", key: progressKey.droneBuild(content.id) });
  const fault = readBench(next.figure).fault;
  if (fault && fault !== readBench(prev.figure).fault) out.push({ kind: "fault", code: fault });
  return out;
}
