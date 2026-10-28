// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { accept, loadExample } from "./apply/fixtures.testing.ts";
import { applyBatch } from "./apply/index.ts";
import type { Checkpoint, Op, OpEnvelope, Project } from "./generated/types.ts";
import { foldChain, stateHash } from "./hash.ts";
import { withHoles } from "./semantic.testing.ts";
import { createSession } from "./session.ts";
import type { ProjectSession } from "./session.ts";
import { lessonSession, seededRandom, steppingClock, USER } from "./session.testing.ts";
import type { DocChange } from "./touched.ts";

const lesson = () => withHoles(loadExample("lesson-uno-r3-button"));
const FRIEND = { actor: "usr_friend", kind: "user" } as const;
const label = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });
const labelOf = (session: ProjectSession) => session.state.components.find((c) => c.id === "cmp_res1")?.label;

function withFriend(): ProjectSession {
  const joined = accept(lesson(), [
    { k: "actor.set", actor: { id: "usr_friend", name: "Friend" } },
    { k: "access.grant", actor: "usr_friend", role: "editor" },
  ]);
  return lessonSession({}, joined.state);
}

describe("apply", () => {
  it("stamps envelopes, grows the history and the revision, and keeps the chain", () => {
    const session = lessonSession();
    const result = session.apply([label("A"), label("B")], USER);
    expect(result).toMatchObject({ ok: true, revision: 2 });
    const { ops } = session.state.history;
    expect(ops.map(({ seq, base }) => [seq, base])).toEqual([[1, 0], [2, 1]]);
    expect(ops[0]!.batch).toBe(ops[0]!.opId);
    expect(ops[1]!.batch).toBe(ops[0]!.opId);
    expect(ops.map((e) => e.at)).toHaveLength(2);
    expect(ops[0]!.at).toMatch(/^2026-10-28T10:00:\d\d\.000Z$/);
    expect(session.revision).toBe(2);
    expect(session.chain).toBe(foldChain(session.state.history.baseChain, ops));
  });

  it("takes a single op as well as a list", () => {
    const session = lessonSession();
    expect(session.apply(label("A"), USER).ok).toBe(true);
    expect(session.state.history.ops[0]).not.toHaveProperty("batch");
  });

  it("replays to the live state hash", () => {
    const start = lesson();
    const session = lessonSession({}, start);
    session.apply(label("A"), USER);
    session.apply([{ k: "component.remove", id: "cmp_led1" }], USER);
    session.undo();
    session.apply({ k: "meta.set", set: { title: "Renamed" } }, USER);
    let replayed = start;
    for (const envelope of session.state.history.ops) {
      const outcome = applyBatch(replayed, [envelope.op], { author: envelope.author, at: envelope.at });
      if (!outcome.ok) throw new Error(outcome.reject.message);
      replayed = outcome.state;
    }
    expect(stateHash(replayed)).toBe(stateHash(session.state));
    expect(replayed.revision).toBe(session.revision);
  });

  it("changes nothing for a rejected batch", () => {
    const session = lessonSession();
    const before = session.state;
    const result = session.apply([label("A"), { k: "component.remove", id: "cmp_nope" }], USER);
    expect(result).toMatchObject({ ok: false, reject: "missing_target" });
    expect(session.state).toBe(before);
    expect(session.canUndo()).toBe(false);
  });

  it("refuses an empty batch as malformed", () => {
    expect(lessonSession().apply([], USER)).toMatchObject({ ok: false, reject: "malformed" });
  });

  it("tells subscribers where the change came from", () => {
    const session = withFriend();
    const origins: string[] = [];
    session.subscribe((change) => origins.push(change.origin));
    session.apply(label("A"), USER);
    session.apply(label("B"), { actor: "usr_friend", kind: "ai", model: "m" });
    session.apply(label("C"), { actor: "usr_friend", kind: "import" });
    expect(origins).toEqual(["local", "ai", "remote"]);
  });

  it("stops notifying after unsubscribe", () => {
    const session = lessonSession();
    const listener = vi.fn();
    const off = session.subscribe(listener);
    off();
    session.apply(label("A"), USER);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("undo and redo", () => {
  it("puts the LED back with its wires, and the hash with it", () => {
    const session = lessonSession();
    const start = stateHash(session.state);
    session.apply({ k: "component.remove", id: "cmp_led1" }, USER);
    expect(session.state.components.some((c) => c.id === "cmp_led1")).toBe(false);
    const undone = session.undo();
    if (!undone?.ok) throw new Error("undo did not apply");
    expect(stateHash(session.state)).toBe(start);
    expect(session.revision).toBe(1 + undone.inverse.length);
    expect(session.revision).toBeGreaterThan(2);
    expect(session.state.history.ops).toHaveLength(session.revision);
  });

  it("redoes what was undone", () => {
    const session = lessonSession();
    session.apply({ k: "component.remove", id: "cmp_led1" }, USER);
    const removed = stateHash(session.state);
    session.undo();
    expect(session.canRedo()).toBe(true);
    session.redo();
    expect(stateHash(session.state)).toBe(removed);
    expect(session.canUndo()).toBe(true);
    expect(session.canRedo()).toBe(false);
  });

  it("returns null with nothing to undo or redo", () => {
    const session = lessonSession();
    expect(session.undo()).toBeNull();
    expect(session.redo()).toBeNull();
    expect(session.canUndo()).toBe(false);
  });

  it("clears redo on a new edit", () => {
    const session = lessonSession();
    session.apply(label("A"), USER);
    session.undo();
    session.apply(label("B"), USER);
    expect(session.canRedo()).toBe(false);
  });

  it("keeps a stack per author", () => {
    const session = withFriend();
    session.apply(label("mine"), USER);
    session.apply({ k: "meta.set", set: { title: "Theirs" } }, FRIEND);
    expect(session.canUndo("usr_amar")).toBe(true);
    session.undo("usr_amar");
    expect(labelOf(session)).toBeUndefined();
    expect(session.state.meta.title).toBe("Theirs");
    expect(session.canUndo("usr_amar")).toBe(false);
    expect(session.canUndo("usr_friend")).toBe(true);
    session.undo("usr_friend");
    expect(session.state.meta.title).not.toBe("Theirs");
  });

  it("defaults to the actor of the latest apply", () => {
    const session = withFriend();
    session.apply({ k: "meta.set", set: { title: "Theirs" } }, FRIEND);
    session.undo();
    expect(session.state.meta.title).not.toBe("Theirs");
  });

  it("drops an entry whose target is gone and reports the reject", () => {
    const session = withFriend();
    session.apply(label("mine"), USER);
    session.apply(
      [{ k: "test.remove", id: "main" }, { k: "component.remove", id: "cmp_res1" }],
      FRIEND,
    );
    expect(session.canUndo("usr_amar")).toBe(true);
    expect(session.undo("usr_amar")).toMatchObject({ ok: false, reject: "missing_target" });
    expect(session.canUndo("usr_amar")).toBe(false);
  });

  it("starts a new session with empty stacks", () => {
    const first = lessonSession();
    first.apply(label("A"), USER);
    const reloaded = createSession({ state: first.state, clock: steppingClock(), rnd: seededRandom() });
    expect(reloaded.canUndo("usr_amar")).toBe(false);
    expect(reloaded.undo("usr_amar")).toBeNull();
    expect(reloaded.chain).toBe(first.chain);
  });

  it("keeps at most maxUndo entries", () => {
    const session = lessonSession({ maxUndo: 2 });
    for (const text of ["A", "B", "C"]) session.apply(label(text), USER);
    session.undo();
    session.undo();
    expect(session.canUndo()).toBe(false);
    expect(labelOf(session)).toBe("A");
  });
});

describe("replace", () => {
  it("swaps the state, forgets the stacks and says it was a load", () => {
    const session = lessonSession();
    session.apply(label("A"), USER);
    const seen: DocChange[] = [];
    session.subscribe((change) => seen.push(change));
    const other = loadExample("uno-blink-d12");
    session.replace(other);
    expect(session.state).toBe(other);
    expect(session.canUndo("usr_amar")).toBe(false);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ from: 1, to: other.revision, ops: [], origin: "load" });
    expect(session.chain).toBe(foldChain(other.history.baseChain, other.history.ops));
  });

  it("numbers the next op from the new revision", () => {
    const session = lessonSession();
    const other = loadExample("uno-blink-d12");
    session.replace(other);
    session.apply({ k: "meta.set", set: { title: "Next" } }, { actor: other.access.owners[0]!, kind: "user" });
    expect(session.state.history.ops.at(-1)!.seq).toBe(other.revision + 1);
  });
});

describe("compact", () => {
  function filler(count: number): OpEnvelope[] {
    return Array.from({ length: count }, (_, i) => ({
      opId: `op_fill${i}`,
      seq: i + 1,
      base: i,
      author: USER,
      at: "2026-10-27T10:00:00.000Z",
      op: { k: "meta.set", set: { description: `d${i}` } },
    }));
  }

  function nearFull(checkpoints: Checkpoint[] = []): Project {
    const state = lesson();
    return { ...state, revision: 999, history: { ...state.history, ops: filler(999), checkpoints } };
  }

  it("keeps the last 500 ops at 1,000 and records a checkpoint", () => {
    const onCompact = vi.fn();
    const state = nearFull();
    const session = lessonSession({ onCompact }, state);
    session.apply({ k: "meta.set", set: { description: "last" } }, USER);
    const { history } = session.state;
    expect(history.ops).toHaveLength(500);
    expect(history.baseRevision).toBe(500);
    expect(history.ops[0]!.seq).toBe(501);
    expect(history.ops.at(-1)!.seq).toBe(1000);
    expect(session.chain).toBe(foldChain(history.baseChain, history.ops));
    expect(history.checkpoints).toEqual([
      {
        revision: 1000,
        kind: "auto",
        at: expect.stringMatching(/Z$/),
        author: "usr_amar",
        stateHash: stateHash(session.state),
        store: "local-db",
      },
    ]);
    expect(onCompact).toHaveBeenCalledTimes(1);
    expect(onCompact).toHaveBeenCalledWith({ revision: 1000, state: session.state, stateHash: stateHash(session.state) });
  });

  it("does nothing below 1,000 ops", () => {
    const onCompact = vi.fn();
    const session = lessonSession({ onCompact });
    session.apply(label("A"), USER);
    session.compact();
    expect(session.state.history.ops).toHaveLength(1);
    expect(onCompact).not.toHaveBeenCalled();
  });

  it("keeps the chain equal to a fold of the full history", () => {
    const state = nearFull();
    const full = foldChain(state.history.baseChain, state.history.ops);
    const session = lessonSession({}, state);
    expect(session.chain).toBe(full);
    session.apply({ k: "meta.set", set: { description: "last" } }, USER);
    const { baseChain, ops } = session.state.history;
    expect(baseChain).toBe(foldChain(state.history.baseChain, state.history.ops.slice(0, 500)));
    expect(foldChain(baseChain, ops)).toBe(session.chain);
  });

  it("holds at 256 checkpoints, dropping the oldest auto one", () => {
    const made = (revision: number, kind: Checkpoint["kind"]): Checkpoint => ({
      revision,
      kind,
      at: "2026-10-27T10:00:00.000Z",
      author: "usr_amar",
      stateHash: "0".repeat(64),
      store: "local-db",
    });
    const checkpoints = [made(1, "named"), ...Array.from({ length: 255 }, (_, i) => made(i + 2, "auto"))];
    const session = lessonSession({}, nearFull(checkpoints));
    session.apply({ k: "meta.set", set: { description: "last" } }, USER);
    const kept = session.state.history.checkpoints;
    expect(kept).toHaveLength(256);
    expect(kept[0]).toMatchObject({ revision: 1, kind: "named" });
    expect(kept[1]!.revision).toBe(3);
    expect(kept.at(-1)!.revision).toBe(1000);
  });
});
