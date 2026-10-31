import type { Clock, RandomSource } from "../../core/ids.ts";
import { newProjectId } from "../../core/ids.ts";
import { rng } from "../../core/prng.ts";
import { fail, ok } from "../../core/result.ts";
import type { Diagnostic, Result } from "../../core/result.ts";
import { applyBatch } from "../apply/index.ts";
import type { Author } from "../apply/index.ts";
import type { ComponentDependency, DefRef, OpEnvelope, Project } from "../generated/types.ts";
import { chainStart, stateHash } from "../hash.ts";
import { toFileText } from "../normalize.ts";
import { checkBatch } from "../semantic.ts";
import { createSession } from "../session.ts";
import type { ProjectSession } from "../session.ts";
import { validateText } from "../validate.ts";

const DEFAULT_BOARD: DefRef = { ref: "core.uno-r3", version: "1.0.0" };
const DEFAULT_ACTOR = "usr_owner";

export interface NewProjectOptions {
  title: string;
  /** The interface the project pins for its board. */
  board: ComponentDependency["interface"];
  boardRef?: DefRef;
  /** Content of `main.ino`. */
  blink: string;
  seed?: number;
  /** Creation time; the project id is built from it. */
  at: string;
  rnd: RandomSource;
  /** The owner's actor id. */
  actor?: string;
}

/** A blank project with one board, one empty view and one firmware source (PRD R-025). */
export function newProject(opts: NewProjectOptions): Project {
  const actor = opts.actor ?? DEFAULT_ACTOR;
  const definition = opts.boardRef ?? DEFAULT_BOARD;
  const id = newProjectId(Date.parse(opts.at), opts.rnd);
  return {
    format: "iynk.project",
    schemaVersion: "1.1",
    id,
    revision: 0,
    meta: { title: opts.title, kind: "project", locale: "en", createdAt: opts.at, updatedAt: opts.at },
    actors: [{ id: actor, name: "Owner" }],
    access: { owners: [actor], visibility: "private", grants: [], authority: "advisory" },
    boards: [
      {
        id: "brd_main",
        definition,
        refdes: "U1",
        firmware: { language: "arduino-cpp", entry: "src_main", sources: ["src_main"], libraries: [] },
      },
    ],
    components: [],
    nets: [],
    views: [{ id: "vw_main", kind: "breadboard", name: "Breadboard", placements: [], wires: [] }],
    sources: [
      {
        id: "src_main",
        path: "main.ino",
        language: "arduino-cpp",
        role: "firmware",
        board: "brd_main",
        content: opts.blink,
      },
    ],
    simulation: {
      seed: opts.seed ?? 1,
      duration_ms: 4000,
      runtimes: [{ id: "rtm_main", board: "brd_main", engine: "iynk-interp" }],
      solver: { engine: "iynk-mna" },
      world: { inputs: [], script: [] },
      faults: [],
    },
    parameters: [],
    assets: [],
    dependencies: {
      components: [{ ref: definition.ref, version: definition.version, origin: "builtin", interface: opts.board }],
      libraries: [],
    },
    tests: [],
    history: { baseRevision: 0, baseChain: chainStart(id), checkpoints: [], ops: [] },
    provenance: { createdBy: actor, createdWith: { app: "iynk", version: "0.1.0" }, origin: { kind: "blank" } },
    license: { spdx: "LicenseRef-iynk-pending" },
  };
}

/** Bytes drawn from a seeded stream, so two runs make the same ids. */
export function seededRandom(seed: number): RandomSource {
  const draw = rng(seed, "ids");
  return { bytes: (count) => Uint8Array.from({ length: count }, () => draw.next() & 0xff) };
}

const STEP_MS = 1000;

/** A clock that starts a second after the project was last updated and moves a second per read. */
export function steppingClock(project: Project): Clock {
  let ms = Date.parse(project.meta.updatedAt) + STEP_MS;
  return () => {
    const now = ms;
    ms += STEP_MS;
    return now;
  };
}

export const ownerOf = (project: Project): Author => ({ actor: project.access.owners[0], kind: "user" });

/** A session with a fake clock and seeded ids. `maxUndo` is the session default unless given. */
export function session(project: Project, seed = 1, maxUndo?: number): ProjectSession {
  return createSession({
    state: project,
    clock: steppingClock(project),
    rnd: seededRandom(seed),
    ...(maxUndo === undefined ? {} : { maxUndo }),
  });
}

export const saveText = (s: ProjectSession): string => toFileText(s.state);

export function openText(text: string, seed = 1): Result<ProjectSession, Diagnostic[]> {
  const report = validateText(text);
  return report.ok && report.doc ? ok(session(report.doc, seed)) : fail(report.diagnostics);
}

export const hashOf = (s: ProjectSession): string => stateHash(s.state);

/** The envelopes cut into the batches they were applied in: a run with one `batch` id is one, any other envelope is alone. */
export function batchesOf(envelopes: readonly OpEnvelope[]): OpEnvelope[][] {
  const batches: OpEnvelope[][] = [];
  for (const envelope of envelopes) {
    const last = batches[batches.length - 1];
    if (last && envelope.batch !== undefined && last[0]?.batch === envelope.batch) last.push(envelope);
    else batches.push([envelope]);
  }
  return batches;
}

/** Applies the logged envelopes to `start` in order, the way a replica that only has the log would. */
export function replayFrom(start: Project, envelopes: readonly OpEnvelope[]): Project {
  let state = start;
  for (const batch of batchesOf(envelopes)) {
    const first = batch[0]!;
    const outcome = applyBatch(
      state,
      batch.map((envelope) => envelope.op),
      { author: first.author, at: first.at, invariants: checkBatch },
    );
    if (!outcome.ok) {
      throw new Error(`replay stopped at seq ${first.seq}: ${outcome.reject.code}: ${outcome.reject.message}`);
    }
    state = { ...outcome.state, history: { ...state.history, ops: [...state.history.ops, ...batch] } };
  }
  return state;
}
