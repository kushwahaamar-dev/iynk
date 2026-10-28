// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { stateHash } from "../../project/hash.ts";
import type { Op } from "../../project/generated/types.ts";
import { lessonSession } from "../../project/session.testing.ts";
import { runCommand } from "../commands.ts";
import type { CommandCtx } from "../commands.ts";
import { createDocStore } from "../stores/doc.ts";
import { registerHistoryCommands } from "./history.ts";

const label = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });
const typing: Op = { k: "source.edit", id: "src_sketch", baseSeq: 0, pos: 0, del: 0, ins: "// hi\n" };

let off = () => {};
afterEach(() => off());

function setup(focus: "canvas" | "code" | "other" = "canvas") {
  const doc = createDocStore(lessonSession());
  let where = focus;
  off = registerHistoryCommands({ doc, focus: () => where });
  const ctx = { doc } as CommandCtx;
  return { doc, ctx, focusOn: (next: typeof where) => void (where = next) };
}

describe("history commands", () => {
  it("restores the state hash on undo and again on redo", () => {
    const { doc, ctx } = setup();
    const start = stateHash(doc.session.state);
    doc.commit([label("A")], { label: "Rename" });
    const edited = stateHash(doc.session.state);

    expect(runCommand("undo", ctx)).toBe(true);
    expect(doc.getState().canRedo).toBe(true);
    expect(runCommand("redo", ctx)).toBe(true);
    expect(stateHash(doc.session.state)).toBe(edited);
    expect(start).not.toBe(edited);
  });

  it("does nothing while the code editor has focus", () => {
    const { doc, ctx, focusOn } = setup("code");
    doc.commit([label("A")], { label: "Rename" });
    const before = doc.getState();
    expect(runCommand("undo", ctx)).toBe(false);
    expect(doc.getState()).toBe(before);
    focusOn("canvas");
    expect(runCommand("undo", ctx)).toBe(true);
  });

  it("skips a text edit and undoes the canvas edit under it", () => {
    const { doc, ctx } = setup();
    doc.commit([label("A")], { label: "Rename" });
    doc.commit([typing], { label: "Type" });
    const source = () => doc.session.state.sources.find((s) => s.id === "src_sketch")!.content;
    const typed = source();

    expect(runCommand("undo", ctx)).toBe(true);
    expect(source()).toBe(typed);
    expect(doc.session.state.components.find((c) => c.id === "cmp_res1")?.label).not.toBe("A");
    expect(doc.getState().canUndo).toBe(false);
  });

  it("has nothing to undo on a swapped-in session", () => {
    const { doc, ctx } = setup();
    doc.commit([label("A")], { label: "Rename" });
    doc.replaceSession(lessonSession());
    expect(doc.getState()).toMatchObject({ canUndo: false, canRedo: false });
    expect(runCommand("undo", ctx)).toBe(false);
  });

  it("frees both ids when the commands are removed", () => {
    const { doc, ctx } = setup();
    off();
    expect(runCommand("undo", ctx)).toBe(false);
    off = registerHistoryCommands({ doc, focus: () => "canvas" });
    doc.commit([label("A")], { label: "Rename" });
    expect(runCommand("undo", ctx)).toBe(true);
  });
});
