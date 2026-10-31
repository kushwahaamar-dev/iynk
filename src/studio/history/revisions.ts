import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";
import type { Checkpoint, Project } from "../../project/generated/types.ts";
import type { ProjectSession } from "../../project/session.ts";

/** A document as a checkpoint keeps it: everything but the op log and the export records. */
export type ProjectState = Project;

/** Where checkpoint bytes live. The UI wiring adapts the local `revisions` store to this. */
export interface RevisionPort {
  put(projectId: string, revision: number, snapshot: ProjectState): Promise<void>;
  get(projectId: string, revision: number): Promise<ProjectState | undefined>;
  list(projectId: string): Promise<number[]>;
  remove(projectId: string, revision: number): Promise<void>;
}

export interface CheckpointPolicy {
  everyOps: 500;
  everyMs: 600_000;
  max: 256;
}

export const CHECKPOINT_POLICY: CheckpointPolicy = { everyOps: 500, everyMs: 600_000, max: 256 };

const MAX_LABEL = 80;

export type CheckpointError = "limit" | "store" | "bad_author";

export interface CheckpointRequest {
  kind: "auto" | "named";
  label?: string;
  author: string;
  at: string;
}

export function shouldCheckpoint(sinceOps: number, sinceMs: number, policy: CheckpointPolicy = CHECKPOINT_POLICY): boolean {
  return sinceOps >= policy.everyOps || sinceMs >= policy.everyMs;
}

/** Drops the oldest `auto` entries until the list fits. A `named` entry stays, so the result can still be over `max`. */
export function pruneCheckpoints(cps: readonly Checkpoint[], max: number = CHECKPOINT_POLICY.max): Checkpoint[] {
  const kept = [...cps];
  for (let over = kept.length - max; over > 0; over--) {
    const oldest = kept.findIndex((c) => c.kind === "auto");
    if (oldest < 0) break;
    kept.splice(oldest, 1);
  }
  return kept;
}

/** The snapshot bytes of a document: its content with the op log and export records left out. */
export function snapshotOf(state: ProjectState): ProjectState {
  const snapshot: ProjectState = { ...state, history: { ...state.history, checkpoints: [], ops: [] } };
  delete snapshot.exports;
  return snapshot;
}

/**
 * Writes the snapshot, then the header entry. A failed `put` leaves the header alone, and a snapshot whose header
 * entry could not be recorded is removed again, so there is never an entry without bytes.
 */
export async function makeCheckpoint(
  session: ProjectSession,
  port: RevisionPort,
  req: CheckpointRequest,
): Promise<Result<Checkpoint, CheckpointError>> {
  const { state } = session;
  if (!state.actors.some((actor) => actor.id === req.author)) return fail("bad_author");

  const draft: Omit<Checkpoint, "stateHash"> = {
    revision: state.revision,
    kind: req.kind,
    at: req.at,
    author: req.author,
    store: "local-db",
  };
  if (req.label !== undefined) draft.label = req.label.slice(0, MAX_LABEL);

  const before = state.history.checkpoints;
  const fits = pruneCheckpoints([...before, { ...draft, stateHash: "" }]);
  if (fits.length > CHECKPOINT_POLICY.max) return fail("limit");

  try {
    await port.put(state.id, state.revision, snapshotOf(state));
  } catch {
    return fail("store");
  }

  let recorded: Checkpoint;
  try {
    recorded = session.recordCheckpoint(draft);
  } catch {
    await port.remove(state.id, state.revision).catch(() => undefined);
    return fail("store");
  }

  const kept = new Set(session.state.history.checkpoints.map((c) => c.revision));
  const orphaned = before.filter((c) => !kept.has(c.revision));
  await Promise.all(orphaned.map((c) => port.remove(state.id, c.revision).catch(() => undefined)));
  return ok(recorded);
}
