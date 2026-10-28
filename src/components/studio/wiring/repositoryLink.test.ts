// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AutosaveEnv } from "@/local/autosave";
import type { ProjectEv } from "@/local/project-protocol";
import { fakeTimers } from "@/local/timers.testing";
import type { Op } from "@/project/generated/types";
import { lessonSession } from "@/project/session.testing";
import { createDocStore } from "@/studio/stores/doc";
import { linkRepository, type LinkNotice, type ProjectHostLike } from "./repositoryLink";

const label = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });

function target() {
  const listeners = new Map<string, Set<EventListener>>();
  const of = (type: string) => listeners.get(type) ?? listeners.set(type, new Set()).get(type)!;
  return {
    addEventListener: (type: string, fn: EventListener) => void of(type).add(fn),
    removeEventListener: (type: string, fn: EventListener) => void of(type).delete(fn),
    count: (type: string) => of(type).size,
  };
}

function rig() {
  const timers = fakeTimers();
  const win = target();
  const env = { timers, doc: { ...target(), visibilityState: "visible" }, win, strategy: "main-journal-at-pagehide" } as unknown as AutosaveEnv;
  const listeners = new Set<(ev: ProjectEv) => void>();
  const host = {
    open: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    save: vi.fn(async () => undefined),
    onEvent: (fn: (ev: ProjectEv) => void) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  } as unknown as ProjectHostLike;
  const doc = createDocStore(lessonSession());
  const notices: LinkNotice[] = [];
  const unlink = linkRepository(doc, host, { env, onNotice: (n) => notices.push(n) });
  const emit = (ev: ProjectEv) => listeners.forEach((fn) => fn(ev));
  return { doc, host, win, timers, notices, emit, unlink, chip: () => doc.getState().saveChip };
}

const saved: ProjectEv = { t: "saved", revision: 1, hash: "h", writtenAt: 1 };

describe("linkRepository", () => {
  it("shows unsaved after a commit and saved once the host reports it", () => {
    const { doc, host, emit, chip, timers } = rig();
    doc.commit([label("A")], { label: "Rename" });
    expect(chip()).toBe("unsaved");
    expect(host.commit).toHaveBeenCalledTimes(1);

    timers.advance(500);
    expect(host.save).toHaveBeenCalledWith("debounce");
    emit(saved);
    expect(chip()).toBe("saved");
  });

  it("shows autosave-failed and logs once when a save fails, and keeps editing", () => {
    const { doc, emit, chip } = rig();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    doc.commit([label("A")], { label: "Rename" });
    emit({ t: "save_failed", kind: "quota", detail: "full" });
    expect(chip()).toBe("autosave-failed");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[iynk] save failed", "quota");

    expect(doc.commit([label("B")], { label: "Rename" })).toMatchObject({ ok: true });
    expect(chip()).toBe("autosave-failed");
    warn.mockRestore();
  });

  it("opens the project again when the worker drops its shadow", () => {
    const { doc, host, emit, notices } = rig();
    doc.commit([label("A")], { label: "Rename" });
    emit({ t: "hash_mismatch", revision: 1, workerHash: "w" });
    expect(notices).toEqual(["hash_mismatch"]);
    expect(host.open).toHaveBeenCalledWith(doc.session.state.id, doc.session.state, doc.session.revision);
  });

  it("raises the recovered, lost and degraded notices for this project only", () => {
    const { doc, emit, notices } = rig();
    const id = doc.session.state.id;
    emit({ t: "recovered_from_previous", projectId: id, revision: 3 });
    emit({ t: "record_lost", projectId: id });
    emit({ t: "record_lost", projectId: "prj_other" });
    emit({ t: "degraded", reason: "indexeddb-unavailable" });
    expect(notices).toEqual(["recovered", "lost", "degraded"]);
  });

  it("leaves a read-only chip alone", () => {
    const { doc, emit, chip } = rig();
    doc.setSaveChip("read-only");
    emit(saved);
    expect(chip()).toBe("read-only");
  });

  it("asks before the tab closes only while there is unsaved work", () => {
    const { doc, win, emit, timers } = rig();
    expect(win.count("beforeunload")).toBe(0);
    doc.commit([label("A")], { label: "Rename" });
    expect(win.count("beforeunload")).toBe(1);
    doc.commit([label("B")], { label: "Rename" });
    expect(win.count("beforeunload")).toBe(1);
    timers.advance(500);
    emit(saved);
    expect(win.count("beforeunload")).toBe(0);
  });

  it("removes its listener and stops tracking when unlinked", () => {
    const { doc, win, unlink, chip } = rig();
    doc.commit([label("A")], { label: "Rename" });
    unlink();
    expect(win.count("beforeunload")).toBe(0);
    doc.setSaveChip("saved");
    doc.commit([label("B")], { label: "Rename" });
    expect(chip()).toBe("unsaved");
  });
});
