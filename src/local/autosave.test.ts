// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createInlinePort } from "@/protocol";
import { stateHash } from "@/project/hash";
import { startProject } from "@/project/testing/generators";
import { ownerOf, session } from "@/project/testing/harness";
import { attachAutosave, type AutosaveEnv } from "./autosave";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import { createProjectHandler } from "./project-handler";
import { createProjectHost, type ProjectHost } from "./project-host";
import type { ProjectEv, SaveReason } from "./project-protocol";
import { createShadow } from "./shadow";
import { fakeTimers } from "./timers.testing";

function fakeTarget<T extends object>(extra: T) {
  const listeners = new Map<string, Set<EventListener>>();
  const of = (type: string) => listeners.get(type) ?? listeners.set(type, new Set()).get(type)!;
  return {
    ...extra,
    addEventListener: (type: string, fn: EventListener) => void of(type).add(fn),
    removeEventListener: (type: string, fn: EventListener) => void of(type).delete(fn),
    fire: (type: string) => of(type).forEach((fn) => fn(new Event(type))),
    count: (type: string) => of(type).size,
  };
}

/** A host that only records what autosave asks of it; the test answers with events. */
const saved = (revision = 1): ProjectEv => ({ t: "saved", revision, hash: "h", writtenAt: 1 });

function recordingHost(answerSaves = false) {
  const calls: Array<{ t: "open" | "commit" | "save"; reason?: SaveReason }> = [];
  const listeners = new Set<(ev: ProjectEv) => void>();
  const host: Pick<ProjectHost, "open" | "commit" | "save" | "onEvent"> = {
    open: async () => void calls.push({ t: "open" }),
    commit: async () => void calls.push({ t: "commit" }),
    save: async (reason) => {
      calls.push({ t: "save", reason });
      if (answerSaves) listeners.forEach((fn) => fn(saved()));
    },
    onEvent: (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
  return {
    host,
    saves: () => calls.filter((c) => c.t === "save").map((c) => c.reason),
    count: (t: "open" | "commit") => calls.filter((c) => c.t === t).length,
    emit: (ev: ProjectEv) => listeners.forEach((fn) => fn(ev)),
  };
}

function rig(overrides: Partial<AutosaveEnv> = {}, answerSaves = false) {
  const timers = fakeTimers();
  const doc = fakeTarget({ visibilityState: "visible" as DocumentVisibilityState });
  const win = fakeTarget({});
  const live = session(startProject(1));
  const owner = ownerOf(live.state);
  let n = 0;
  const edit = () => live.apply({ k: "meta.set", set: { title: `title ${n++}` } }, owner);
  const rec = recordingHost(answerSaves);
  const handle = attachAutosave(live, rec.host, { timers, doc, win, strategy: "worker-at-pagehide", ...overrides });
  return { timers, doc, win, live, edit, rec, handle };
}

describe("autosave triggers", () => {
  it("saves 500 ms after the last commit", () => {
    const { timers, edit, rec } = rig();
    edit();
    timers.advance(499);
    expect(rec.saves()).toEqual([]);
    timers.advance(1);
    expect(rec.saves()).toEqual(["debounce"]);
  });

  it("restarts the debounce on each commit", () => {
    const { timers, edit, rec } = rig();
    edit();
    timers.advance(400);
    edit();
    timers.advance(400);
    expect(rec.saves()).toEqual([]);
    timers.advance(100);
    expect(rec.saves()).toEqual(["debounce"]);
  });

  it("saves at the max wait under a stream of commits every 100 ms", () => {
    const { timers, edit, rec } = rig();
    for (let i = 0; i < 49; i++) {
      edit();
      timers.advance(100);
    }
    expect(rec.saves()).toEqual([]);
    edit();
    timers.advance(100);
    expect(rec.saves()).toEqual(["maxwait"]);
  });

  it("makes exactly two saves for a stream that outlasts the max wait: one at 5,000 ms, one 500 ms after the last commit (at 5,900 ms)", () => {
    const { timers, edit, rec } = rig({}, true);
    const savedAt: number[] = [];
    rec.host.onEvent((ev) => ev.t === "saved" && savedAt.push(timers.now()));
    for (let i = 0; i < 60; i++) {
      edit();
      timers.advance(100);
    }
    timers.advance(500);
    expect(rec.saves()).toEqual(["maxwait", "debounce"]);
    expect(savedAt).toEqual([5_000, 6_400]);
  });

  it("saves when the page becomes hidden and on pagehide", () => {
    const { timers, doc, win, edit, rec } = rig();
    edit();
    doc.visibilityState = "hidden";
    doc.fire("visibilitychange");
    expect(rec.saves()).toEqual(["hidden"]);
    rec.emit(saved());
    edit();
    win.fire("pagehide");
    expect(rec.saves()).toEqual(["hidden", "pagehide"]);
    timers.advance(10_000);
    expect(rec.saves()).toHaveLength(2);
  });

  it("sends nothing when the page hides with nothing unsaved", () => {
    const { doc, win, rec } = rig();
    doc.visibilityState = "hidden";
    doc.fire("visibilitychange");
    win.fire("pagehide");
    expect(rec.saves()).toEqual([]);
  });

  it("ignores a visibility change to visible", () => {
    const { doc, edit, rec } = rig();
    edit();
    doc.fire("visibilitychange");
    expect(rec.saves()).toEqual([]);
  });

  it("writes the journal batch at hidden and pagehide with the main-journal strategy only", () => {
    const flushJournal = vi.fn(async () => undefined);
    const main = rig({ strategy: "main-journal-at-pagehide", flushJournal });
    main.win.fire("pagehide");
    expect(flushJournal).toHaveBeenCalledTimes(1);

    const worker = rig({ strategy: "worker-at-pagehide", flushJournal });
    worker.win.fire("pagehide");
    expect(flushJournal).toHaveBeenCalledTimes(1);
  });
});

describe("autosave state", () => {
  it("1,000 commits in one second make one save", () => {
    const { timers, edit, rec } = rig();
    for (let i = 0; i < 1_000; i++) {
      edit();
      timers.advance(1);
    }
    timers.advance(500);
    expect(rec.saves()).toEqual(["debounce"]);
  });

  it("walks saved, unsaved, saving, saved", () => {
    const { timers, edit, rec, handle } = rig();
    expect(handle.status()).toBe("saved");
    expect(handle.lastSavedAt()).toBeNull();
    edit();
    expect(handle.status()).toBe("unsaved");
    timers.advance(500);
    expect(handle.status()).toBe("saving");
    timers.advance(30);
    rec.emit(saved());
    expect(handle.status()).toBe("saved");
    expect(handle.lastSavedAt()).toBe(530);
  });

  it("queues a second save for a commit made while the first is in flight", () => {
    const { timers, edit, rec, handle } = rig();
    edit();
    timers.advance(500);
    edit();
    timers.advance(500);
    expect(rec.saves()).toEqual(["debounce"]);
    expect(handle.status()).toBe("saving");
    rec.emit(saved());
    expect(rec.saves()).toEqual(["debounce", "debounce"]);
    rec.emit(saved());
    expect(handle.status()).toBe("saved");
  });

  it("stops after a failed save and a manual save retries", () => {
    const { timers, edit, rec, handle } = rig();
    edit();
    timers.advance(500);
    rec.emit({ t: "save_failed", kind: "quota", detail: "full" });
    expect(handle.status()).toBe("failed");
    edit();
    timers.advance(60_000);
    expect(rec.saves()).toEqual(["debounce"]);
    expect(rec.count("commit")).toBe(2);

    rec.emit(saved(2));
    expect(handle.status()).toBe("saved");
    edit();
    timers.advance(500);
    expect(rec.saves()).toEqual(["debounce", "debounce"]);
  });

  it("is failed when the host rejects a save", async () => {
    const { timers, edit, rec, handle } = rig();
    rec.host.save = () => Promise.reject(new Error("dead"));
    edit();
    timers.advance(500);
    await Promise.resolve();
    expect(handle.status()).toBe("failed");
  });

  it("commits the envelopes of each change", () => {
    const { edit, rec } = rig();
    edit();
    edit();
    expect(rec.count("commit")).toBe(2);
    expect(rec.count("open")).toBe(0);
  });

  it("opens the whole state again when the envelopes of a change are no longer in the history", () => {
    const { live, rec } = rig();
    let notify: Parameters<typeof live.subscribe>[0] = () => undefined;
    const compacted = {
      state: { ...live.state, history: { ...live.state.history, baseRevision: 9, ops: [] } },
      revision: 10,
      subscribe: (fn: typeof notify) => {
        notify = fn;
        return () => undefined;
      },
    };
    const other = recordingHost();
    attachAutosave(compacted, other.host, {
      timers: fakeTimers(),
      doc: fakeTarget({ visibilityState: "visible" as DocumentVisibilityState }),
      win: fakeTarget({}),
      strategy: "worker-at-pagehide",
    });
    notify({ from: 4, to: 10, ops: [], touched: {} as never, origin: "local" });
    expect(other.count("open")).toBe(1);
    expect(other.count("commit")).toBe(0);
    expect(rec.count("open")).toBe(0);
  });

  it("ignores a load", () => {
    const { live, timers, rec } = rig();
    live.replace({ ...live.state });
    timers.advance(10_000);
    expect(rec.saves()).toEqual([]);
    expect(rec.count("commit")).toBe(0);
  });

  it("stops listening when disposed", () => {
    const { timers, doc, win, edit, rec, handle } = rig();
    edit();
    handle.dispose();
    timers.advance(10_000);
    edit();
    doc.fire("visibilitychange");
    win.fire("pagehide");
    expect(rec.saves()).toEqual([]);
    expect(rec.count("commit")).toBe(1);
    expect(doc.count("visibilitychange")).toBe(0);
    expect(win.count("pagehide")).toBe(0);
  });
});

describe("autosave through the project host", () => {
  it("a reload gives an equal hash (M1 step 7)", async () => {
    const repo = createMemoryRepository({ rows: emptyRows() });
    const host = createProjectHost({
      makePort: () => createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => 9_000 })),
    });
    const timers = fakeTimers();
    const live = session(startProject(3));
    const owner = ownerOf(live.state);
    await host.open(live.state.id, live.state, live.revision);
    const handle = attachAutosave(live, host, {
      timers,
      doc: fakeTarget({ visibilityState: "visible" as DocumentVisibilityState }),
      win: fakeTarget({}),
      strategy: "worker-at-pagehide",
    });

    for (let i = 0; i < 6; i++) live.apply({ k: "meta.set", set: { title: `Blink ${i}` } }, owner);
    timers.advance(500);
    await vi.waitFor(() => expect(handle.status()).toBe("saved"));

    const reloaded = await repo.load(live.state.id);
    expect(reloaded.status).toBe("ok");
    expect(reloaded.status === "ok" && reloaded.rec.hash).toBe(stateHash(live.state));
    expect(reloaded.status === "ok" && reloaded.rec.doc.revision).toBe(live.revision);
    handle.dispose();
  });
});
