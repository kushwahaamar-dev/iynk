// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op } from "./generated/types.ts";
import { lessonSession, USER } from "./session.testing.ts";

const label = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });
const typing = (ins: string): Op => ({ k: "source.edit", id: "src_sketch", baseSeq: 0, pos: 0, del: 0, ins });
const notText = (op: Op) => op.k !== "source.edit";

describe("undo and redo with a filter", () => {
  it("takes the newest entry the filter accepts and leaves the others in place", () => {
    const session = lessonSession();
    session.apply(label("A"), USER);
    session.apply(typing("x"), USER);
    session.apply(label("B"), USER);
    session.apply(typing("y"), USER);

    expect(session.undo(undefined, notText)).toMatchObject({ ok: true });
    expect(session.state.components.find((c) => c.id === "cmp_res1")?.label).toBe("A");
    expect(session.state.sources.find((s) => s.id === "src_sketch")?.content).toContain("y");
    expect(session.undo()).toMatchObject({ ok: true });
    expect(session.state.sources.find((s) => s.id === "src_sketch")?.content).not.toContain("y");
  });

  it("reports nothing to do when every entry holds a rejected op", () => {
    const session = lessonSession();
    session.apply(typing("x"), USER);
    const revision = session.revision;
    expect(session.canUndo(undefined, notText)).toBe(false);
    expect(session.undo(undefined, notText)).toBeNull();
    expect(session.revision).toBe(revision);
    expect(session.canUndo()).toBe(true);
  });

  it("filters redo the same way", () => {
    const session = lessonSession();
    session.apply(typing("x"), USER);
    session.apply(label("A"), USER);
    session.undo();
    session.undo();
    expect(session.canRedo(undefined, notText)).toBe(true);
    session.redo(undefined, notText);
    expect(session.state.components.find((c) => c.id === "cmp_res1")?.label).toBe("A");
    expect(session.canRedo(undefined, notText)).toBe(false);
    expect(session.canRedo()).toBe(true);
  });

  it("never leaves part of a batch undone", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const session = lessonSession();
      const content = () => session.state.sources.find((s) => s.id === "src_sketch")!.content;
      let n = seed;
      const next = () => (n = (n * 48271) % 2147483647);
      let plain = 0;
      for (let i = 0; i < 8; i++) {
        const batch: Op[] = [label(`L${i}`)];
        if (next() % 2 === 0) batch.push(typing(`#${i}#`));
        else plain++;
        session.apply(batch, USER);
      }
      const typed = content();

      let undone = 0;
      while (session.undo(undefined, notText)) undone++;

      expect(undone).toBe(plain);
      expect(content()).toBe(typed);
      expect(session.canUndo()).toBe(8 > plain);
    }
  });
});
