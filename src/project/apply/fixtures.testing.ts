import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { canonicalize } from "../../core/canonical.ts";
import { sha256Hex } from "../../core/sha256.ts";
import type { Op, Project } from "../generated/types.ts";
import { applyBatch } from "./index.ts";
import type { ApplyContext, Reject, RejectCode } from "./types.ts";

const EXAMPLES = new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/", import.meta.url);

export type ExampleName =
  "drone-quad" | "env-monitor-esp32" | "lesson-uno-r3-button" | "robot-line-follower" | "uno-blink-d12";

export function loadExample(name: ExampleName): Project {
  return JSON.parse(readFileSync(new URL(`${name}.project.json`, EXAMPLES), "utf8")) as Project;
}

const BOOT_LINE = '  Serial.println("boot");\n';
const BOOT_AT = 130;

/**
 * The env monitor as it stood at revision 140: the final document without the `boot` line a friend typed at 141 and
 * without the `flt_swap` fault added at 142. The retained tail is empty, which is what a replayed `source.edit`
 * needs (it transforms over the ops after its `baseSeq`). The hash ignores `history`, so the hash is unchanged.
 */
export function monitorAt140(): Project {
  const project = loadExample("env-monitor-esp32");
  const main = project.sources.find((source) => source.id === "src_main");
  if (!main || main.content.slice(BOOT_AT, BOOT_AT + BOOT_LINE.length) !== BOOT_LINE) {
    throw new Error("the env monitor example no longer has the boot line at position 130 of src_main");
  }
  main.content = main.content.slice(0, BOOT_AT) + main.content.slice(BOOT_AT + BOOT_LINE.length);
  project.simulation.faults = project.simulation.faults.filter((fault) => fault.id !== "flt_swap");
  project.revision = 140;
  project.history.ops = [];
  return project;
}

/** Freezes a document all the way down, so a handler that edits its input throws instead of passing quietly. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** What the state hash covers: everything except `revision`, `meta.updatedAt`, `history` and `exports`. */
export function contentOf(project: Project): unknown {
  const content: Record<string, unknown> = { ...project, meta: { ...project.meta, updatedAt: undefined } };
  delete content.revision;
  delete content.history;
  delete content.exports;
  return content;
}

export const AT = "2026-10-28T10:00:00.000Z";

export const OWNER = { actor: "usr_amar", kind: "user" } as const;

export const ctxFor = (
  author: ApplyContext["author"] = OWNER,
  invariants?: ApplyContext["invariants"],
): ApplyContext => ({
  author,
  at: AT,
  invariants,
});

export function accept(state: Project, ops: Op[], ctx: ApplyContext = ctxFor()) {
  const outcome = applyBatch(state, ops, ctx);
  if (!outcome.ok) throw new Error(`rejected ${outcome.reject.code}: ${outcome.reject.message}`);
  return outcome;
}

export function refuse(state: Project, ops: Op[], code: RejectCode, ctx: ApplyContext = ctxFor()): Reject {
  const outcome = applyBatch(state, ops, ctx);
  if (outcome.ok) throw new Error(`expected ${code}, but the batch was accepted`);
  expect(outcome.reject.code).toBe(code);
  return outcome.reject;
}

/** Applies `ops`, then the returned inverse, and checks that the hashed content is back. Returns the inverse. */
export function roundTrip(state: Project, ops: Op[], ctx: ApplyContext = ctxFor()): Op[] {
  const forward = accept(state, ops, ctx);
  const back = accept(forward.state, forward.inverse, ctx);
  expect(contentOf(back.state)).toEqual(contentOf(state));
  expect(sha256Hex(canonicalize(contentOf(back.state)))).toBe(sha256Hex(canonicalize(contentOf(state))));
  return forward.inverse;
}
