import type { Op, OpEnvelope, Project as ProjectState } from "../../project/generated/types.ts";
import type { ApplyResult, ProjectSession } from "../../project/session.ts";
import type { DocChange } from "../../project/touched.ts";
import { createStore } from "./select.ts";
import type { Store } from "./select.ts";

type Author = OpEnvelope["author"];
type RejectCode = Extract<ApplyResult, { ok: false }>["reject"];

export type SaveChip = "saved" | "saving" | "unsaved" | "autosave-failed" | "read-only";

export type DocView = {
  revision: number;
  state: ProjectState;
  canUndo: boolean;
  canRedo: boolean;
  saveChip: SaveChip;
  readOnly: boolean;
};

/** Whether this member may edit. Declared here, structurally, so the store never imports the collab module. */
export type DocAccess = { mode: "edit" } | { mode: "readonly"; reason: string };

export type CommitResult = { ok: true; revision: number } | { ok: false; reject: RejectCode; message: string };

/**
 * The only writer of the document: every key, button and tool change goes through `commit`, `undo` or `redo`, and
 * nothing else in Studio calls the session's mutators. It holds no copy of the project: `getState()` is a view
 * of the session that changes identity only when the revision or the save chip does.
 */
export interface DocStore extends Store<DocView> {
  readonly session: ProjectSession;
  /** The last revision the authority has confirmed; a plain read, so it never causes a render. */
  readonly confirmedSeq: number;
  readonly access: DocAccess;
  commit(batch: Op[], opts: { label: string; author?: Author }): CommitResult;
  /** Canvas scope: entries holding a `source.edit` stay on the stack. */
  undo(): CommitResult | null;
  redo(): CommitResult | null;
  /** Swaps in a session (open another project). Listeners get one `load` change. */
  replaceSession(next: ProjectSession): void;
  onChange(fn: (change: DocChange) => void): () => void;
  setSaveChip(chip: SaveChip): void;
  /** Other members' ops, applied as they were authored. The authority link wraps the call so they are not sent back. */
  applyRemote(envelopes: readonly OpEnvelope[]): void;
  /** The visible state replaced in place (confirmed plus pending after a rebase); undo history is dropped. */
  resync(snapshot: ProjectState): void;
  setAccess(access: DocAccess): void;
  setConfirmedSeq(seq: number): void;
}

/** Canvas undo leaves text edits to the code editor's own history (STUDIO 11.2). */
const canvasOp = (op: Op) => op.k !== "source.edit";

const READ_ONLY_REFUSAL = { ok: false, reject: "permission", message: "This project is read only." } as const;

export function createDocStore(initial: ProjectSession): DocStore {
  let session = initial;
  let chip: SaveChip = "saved";
  let access: DocAccess = { mode: "edit" };
  let confirmedSeq = initial.revision;
  const listeners = new Set<(change: DocChange) => void>();
  const locked = () => chip === "read-only" || access.mode === "readonly";
  const view = () => ({
    revision: session.revision,
    state: session.state,
    canUndo: session.canUndo(undefined, canvasOp),
    canRedo: session.canRedo(undefined, canvasOp),
    saveChip: chip,
    readOnly: locked(),
  });
  const store = createStore<DocView>(view());
  let unsubscribe = () => {};

  /** The session pushes its undo entry after it notifies, so the can-undo flags are re-read once the call returns. */
  function sync() {
    const current = store.getState();
    const next = view();
    if (next.revision !== current.revision || next.state !== current.state || next.saveChip !== current.saveChip || next.readOnly !== current.readOnly || next.canUndo !== current.canUndo || next.canRedo !== current.canRedo) {
      store.setState(next);
    }
  }

  function follow() {
    unsubscribe();
    unsubscribe = session.subscribe((change) => {
      if (change.origin !== "load" && chip === "saved") chip = "unsaved";
      sync();
      for (const listener of [...listeners]) if (listeners.has(listener)) listener(change);
    });
  }
  follow();

  const refused = (): CommitResult | null => (locked() ? READ_ONLY_REFUSAL : null);
  function settle(r: ApplyResult): CommitResult {
    sync();
    return r.ok ? { ok: true, revision: r.revision } : { ok: false, reject: r.reject, message: r.message };
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    get session() {
      return session;
    },
    get confirmedSeq() {
      return confirmedSeq;
    },
    get access() {
      return access;
    },
    commit(batch, opts) {
      const refusal = refused();
      if (refusal) return refusal;
      if (batch.length === 0) return { ok: true, revision: session.revision };
      return settle(session.apply(batch, opts.author ?? { actor: session.state.access.owners[0]!, kind: "user" }));
    },
    undo() {
      const refusal = refused();
      if (refusal) return refusal;
      const result = session.undo(undefined, canvasOp);
      return result && settle(result);
    },
    redo() {
      const refusal = refused();
      if (refusal) return refusal;
      const result = session.redo(undefined, canvasOp);
      return result && settle(result);
    },
    replaceSession(next) {
      unsubscribe();
      const before = session;
      session = next;
      chip = chip === "read-only" ? chip : "saved";
      sync();
      follow();
      for (const listener of [...listeners]) {
        if (listeners.has(listener)) {
          listener({ from: before.revision, to: next.revision, ops: [], touched: emptyTouched(), origin: "load" });
        }
      }
    },
    onChange(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    setSaveChip(next) {
      if (next === chip) return;
      chip = next;
      sync();
    },
    applyRemote(envelopes) {
      for (const envelope of envelopes) session.apply(envelope.op, envelope.author);
      sync();
    },
    resync(snapshot) {
      session.replace(snapshot);
      sync();
    },
    setAccess(next) {
      access = next;
      sync();
    },
    setConfirmedSeq(seq) {
      confirmedSeq = seq;
    },
  };
}

const emptyTouched = (): DocChange["touched"] => ({
  components: new Set(),
  nets: new Set(),
  wires: new Set(),
  views: new Set(),
  sources: new Set(),
});
