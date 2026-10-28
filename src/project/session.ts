import type { Clock, RandomSource } from "../core/ids.ts";
import { applyBatch } from "./apply/index.ts";
import type { Author, RejectCode } from "./apply/index.ts";
import { createLocalAuthority } from "./authority.ts";
import type { LocalAuthority } from "./authority.ts";
import type { Op, Project } from "./generated/types.ts";
import { checkpointOf, chainNext, foldChain } from "./hash.ts";
import { checkBatch } from "./semantic.ts";
import { computeTouched } from "./touched.ts";
import type { DocChange } from "./touched.ts";

/** The retained tail is cut to `KEEP_TAIL` ops once it reaches `COMPACT_AT`, the schema limit. */
const COMPACT_AT = 1000;
const KEEP_TAIL = 500;
const MAX_CHECKPOINTS = 256;
const DEFAULT_MAX_UNDO = 100;

export interface SessionOptions {
  state: Project;
  clock: Clock;
  rnd: RandomSource;
  maxUndo?: number;
  /** Called when `compact` drops old ops, so the store can keep the snapshot the new checkpoint stands for. */
  onCompact?: (snapshot: { revision: number; state: Project; stateHash: string }) => void;
}

export type ApplyResult =
  | { ok: true; revision: number; inverse: Op[] }
  | { ok: false; reject: RejectCode; message: string; refs?: string[] };

/** The one object that changes a document. Nothing else may call `applyBatch` (FA-01). */
export interface ProjectSession {
  readonly state: Project;
  readonly revision: number;
  /** Head of the hash chain over the retained ops. */
  readonly chain: string;
  apply(op: Op | readonly Op[], author: Author): ApplyResult;
  /**
   * `actor` defaults to the actor of the latest `apply`. With a `filter`, entries holding an op it rejects are
   * skipped whole and stay on their stack. Null when there is nothing to undo.
   */
  undo(actor?: string, filter?: OpFilter): ApplyResult | null;
  redo(actor?: string, filter?: OpFilter): ApplyResult | null;
  canUndo(actor?: string, filter?: OpFilter): boolean;
  canRedo(actor?: string, filter?: OpFilter): boolean;
  subscribe(fn: (change: DocChange) => void): () => void;
  /** Swaps in a snapshot (open, resync) and forgets every undo and redo entry. */
  replace(state: Project): void;
  compact(): void;
}

export type OpFilter = (op: Op) => boolean;

interface Entry {
  ops: Op[];
  author: Author;
}

type Stacks = Map<string, Entry[]>;

const originOf = (author: Author): DocChange["origin"] =>
  author.kind === "user" ? "local" : author.kind === "ai" ? "ai" : "remote";

export function createSession(opts: SessionOptions): ProjectSession {
  const maxUndo = opts.maxUndo ?? DEFAULT_MAX_UNDO;
  const listeners = new Set<(change: DocChange) => void>();
  const undoStacks: Stacks = new Map();
  const redoStacks: Stacks = new Map();
  let state = opts.state;
  let authority: LocalAuthority;
  let chain: string;
  let lastActor: string | undefined;

  function load(next: Project) {
    state = next;
    authority = createLocalAuthority({ clock: opts.clock, rnd: opts.rnd, startRevision: next.revision });
    chain = foldChain(next.history.baseChain, next.history.ops);
    undoStacks.clear();
    redoStacks.clear();
  }
  load(opts.state);

  const now = () => new Date(opts.clock()).toISOString();

  function notify(change: DocChange) {
    for (const listener of [...listeners]) listener(change);
  }

  function push(stacks: Stacks, actor: string, entry: Entry) {
    const stack = stacks.get(actor) ?? [];
    stack.push(entry);
    if (stack.length > maxUndo) stack.shift();
    stacks.set(actor, stack);
  }

  function compact() {
    const { ops, checkpoints } = state.history;
    if (ops.length < COMPACT_AT) return;
    const dropped = ops.slice(0, ops.length - KEEP_TAIL);
    const checkpoint = checkpointOf(state, "auto", undefined, ops[ops.length - 1]!.author.actor, now());
    const kept = [...checkpoints, checkpoint];
    while (kept.length > MAX_CHECKPOINTS) kept.splice(Math.max(0, kept.findIndex((c) => c.kind === "auto")), 1);
    state = {
      ...state,
      history: {
        baseRevision: dropped[dropped.length - 1]!.seq,
        baseChain: foldChain(state.history.baseChain, dropped),
        checkpoints: kept,
        ops: ops.slice(dropped.length),
      },
    };
    opts.onCompact?.({ revision: state.revision, state, stateHash: checkpoint.stateHash });
  }

  function commit(ops: readonly Op[], author: Author, origin: DocChange["origin"]): ApplyResult {
    const outcome = applyBatch(state, ops, { author, at: now(), invariants: checkBatch });
    if (!outcome.ok) {
      const { code, message, refs } = outcome.reject;
      return refs ? { ok: false, reject: code, message, refs } : { ok: false, reject: code, message };
    }
    const envelopes = authority.stamp(ops, author);
    for (const envelope of envelopes) chain = chainNext(chain, envelope);
    const before = state;
    state = { ...outcome.state, history: { ...before.history, ops: [...before.history.ops, ...envelopes] } };
    compact();
    if (listeners.size > 0) {
      notify({ from: before.revision, to: state.revision, ops: [...ops], touched: computeTouched(before, state), origin });
    }
    return { ok: true, revision: state.revision, inverse: outcome.inverse };
  }

  const allowed = (entry: Entry, filter: OpFilter | undefined) => !filter || entry.ops.every(filter);

  function step(from: Stacks, to: Stacks, actor: string | undefined, origin: "undo" | "redo", filter?: OpFilter): ApplyResult | null {
    const key = actor ?? lastActor;
    const stack = key === undefined ? undefined : from.get(key);
    const at = stack?.findLastIndex((e) => allowed(e, filter)) ?? -1;
    const entry = at < 0 ? undefined : stack?.splice(at, 1)[0];
    if (!key || !entry) return null;
    const result = commit(entry.ops, entry.author, origin);
    if (result.ok) push(to, key, { ops: result.inverse, author: entry.author });
    return result;
  }

  const has = (stacks: Stacks, actor: string | undefined, filter: OpFilter | undefined) => {
    const key = actor ?? lastActor;
    return key !== undefined && (stacks.get(key)?.some((e) => allowed(e, filter)) ?? false);
  };

  return {
    get state() {
      return state;
    },
    get revision() {
      return state.revision;
    },
    get chain() {
      return chain;
    },
    apply(op, author) {
      const result = commit("k" in op ? [op] : op, author, originOf(author));
      if (result.ok) {
        lastActor = author.actor;
        push(undoStacks, author.actor, { ops: result.inverse, author });
        redoStacks.delete(author.actor);
      }
      return result;
    },
    undo: (actor, filter) => step(undoStacks, redoStacks, actor, "undo", filter),
    redo: (actor, filter) => step(redoStacks, undoStacks, actor, "redo", filter),
    canUndo: (actor, filter) => has(undoStacks, actor, filter),
    canRedo: (actor, filter) => has(redoStacks, actor, filter),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    replace(next) {
      const before = state;
      load(next);
      notify({ from: before.revision, to: next.revision, ops: [], touched: computeTouched(before, next), origin: "load" });
    },
    compact,
  };
}
