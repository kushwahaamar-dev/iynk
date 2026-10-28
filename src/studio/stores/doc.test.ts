// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Op } from "../../project/generated/types.ts";
import { lessonSession } from "../../project/session.testing.ts";
import { createDocStore } from "./doc.ts";

const label = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });
const bad: Op = { k: "component.remove", id: "cmp_missing" };

describe("DocStore", () => {
  it("commits a batch, moves to unsaved and forwards the change once", () => {
    const doc = createDocStore(lessonSession());
    const seen = vi.fn();
    doc.onChange(seen);
    const result = doc.commit([label("A"), label("B")], { label: "Rename" });
    expect(result).toEqual({ ok: true, revision: 2 });
    expect(doc.getState()).toMatchObject({ revision: 2, canUndo: true, saveChip: "unsaved" });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]![0]).toMatchObject({ origin: "local", from: 0, to: 2 });
    expect(seen.mock.calls[0]![0].touched.components.has("cmp_res1")).toBe(true);
  });

  it("changes nothing for a rejected batch", () => {
    const doc = createDocStore(lessonSession());
    const before = doc.getState();
    const listener = vi.fn();
    doc.subscribe(listener);
    const result = doc.commit([bad], { label: "Remove" });
    expect(result.ok).toBe(false);
    expect(doc.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("returns ok without a revision change for an empty batch", () => {
    const doc = createDocStore(lessonSession());
    const before = doc.getState();
    expect(doc.commit([], { label: "Nothing" })).toEqual({ ok: true, revision: 0 });
    expect(doc.getState()).toBe(before);
  });

  it("undoes and redoes with the matching origin", () => {
    const doc = createDocStore(lessonSession());
    const origins: string[] = [];
    doc.onChange((c) => origins.push(c.origin));
    expect(doc.undo()).toBeNull();
    doc.commit([label("A")], { label: "Rename" });
    expect(doc.undo()).toMatchObject({ ok: true });
    expect(doc.getState()).toMatchObject({ canUndo: false, canRedo: true });
    expect(doc.redo()).toMatchObject({ ok: true });
    expect(origins).toEqual(["local", "undo", "redo"]);
  });

  it("keeps the same view object between commits", () => {
    const doc = createDocStore(lessonSession());
    doc.commit([label("A")], { label: "Rename" });
    const view = doc.getState();
    expect(doc.getState()).toBe(view);
    doc.setSaveChip("unsaved");
    expect(doc.getState()).toBe(view);
    doc.setSaveChip("saving");
    expect(doc.getState()).not.toBe(view);
  });

  it("refuses every write while the chip says read-only", () => {
    const session = lessonSession();
    const doc = createDocStore(session);
    doc.setSaveChip("read-only");
    expect(doc.getState().readOnly).toBe(true);
    expect(doc.commit([label("A")], { label: "Rename" })).toMatchObject({ ok: false, reject: "permission" });
    expect(doc.undo()).toMatchObject({ ok: false, reject: "permission" });
    expect(doc.redo()).toMatchObject({ ok: false, reject: "permission" });
    expect(session.revision).toBe(0);
  });

  it("emits one load change when the session is replaced and follows the new session", () => {
    const doc = createDocStore(lessonSession());
    const origins: string[] = [];
    doc.onChange((c) => origins.push(c.origin));
    doc.commit([label("A")], { label: "Rename" });
    const next = lessonSession();
    doc.replaceSession(next);
    expect(doc.session).toBe(next);
    expect(doc.getState()).toMatchObject({ revision: 0, saveChip: "saved", canUndo: false });
    doc.commit([label("B")], { label: "Rename" });
    expect(origins).toEqual(["local", "load", "local"]);
    expect(next.revision).toBe(1);
  });

  it("lets a listener unsubscribe another during a notify", () => {
    const doc = createDocStore(lessonSession());
    const second = vi.fn();
    let off = () => {};
    doc.onChange(() => off());
    off = doc.onChange(second);
    doc.commit([label("A")], { label: "Rename" });
    expect(second).not.toHaveBeenCalled();
  });
});
