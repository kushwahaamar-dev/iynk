// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Op } from "../../project/generated/types.ts";
import { lessonSession } from "../../project/session.testing.ts";
import { resolveShape } from "../engine/testing/mini-scene.ts";
import type { Overlay } from "../engine/types.ts";
import { createSessionStore } from "../stores/session.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { createToolHost } from "./host.ts";
import type { Tool, ToolCtx, ToolPointerEvent, ToolResult } from "./types.ts";

const rename = (text: string): Op => ({ k: "component.set", id: "cmp_res1", set: { label: text } });
const missing: Op = { k: "component.remove", id: "cmp_missing" };

function setup(tool?: Partial<Tool>) {
  const doc = createRecordingDoc(lessonSession());
  const session = createSessionStore("vw_bb");
  const host = createToolHost({ doc, session });
  const fake: Tool = {
    id: "select",
    cursor: () => "default",
    pointer: () => ({ kind: "none" }),
    key: () => ({ kind: "none" }),
    preview: () => [],
    ...tool,
  };
  host.register(fake);
  return { doc, session, host, fake };
}

const ctx = { resolve: resolveShape } as unknown as ToolCtx;
const ev = (type: ToolPointerEvent["type"]): ToolPointerEvent => ({
  type, xPx: 1, yPx: 2, xMm: 0, yMm: 0, button: 0, shift: false, alt: false, ctrl: false, pointerType: "mouse", pointerId: 1,
});
const ring: Overlay = { id: "ring", xMm: 0, yMm: 0, elements: [] };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("ToolHost", () => {
  it("sends a commit result to doc.commit once, as one batch with its label", () => {
    const { doc, host } = setup({ pointer: (e) => (e.type === "up" ? { kind: "commit", batch: [rename("A"), rename("B")], label: "Rename" } : { kind: "none" }) });
    host.pointer(ev("down"), ctx);
    host.pointer(ev("up"), ctx);
    expect(doc.commits).toHaveLength(1);
    expect(doc.commits[0]).toMatchObject({ label: "Rename", batch: [rename("A"), rename("B")] });
    expect(doc.getState().revision).toBe(2);
  });

  it("sets the reject key on the status, drops the preview and leaves the selection", () => {
    const { session, host } = setup({
      pointer: (e) => (e.type === "up" ? { kind: "commit", batch: [missing], label: "Remove" } : { kind: "preview" }),
      preview: () => [ring],
    });
    session.setSelection([{ kind: "part", view: "vw_bb", id: "cmp_res1" }]);
    host.pointer(ev("down"), ctx);
    expect(session.getState().preview).toEqual([ring]);
    host.pointer(ev("up"), ctx);
    expect(session.getState().status?.key).toBe("ops.reject.missing_target");
    expect(session.getState().preview).toEqual([]);
    expect(host.preview()).toEqual([]);
    expect(session.getState().selection).toHaveLength(1);
  });

  it("refuses a commit on a read-only document with the permission key", () => {
    const { doc, session, host } = setup({ pointer: () => ({ kind: "commit", batch: [rename("A")], label: "Rename" }) });
    doc.setSaveChip("read-only");
    host.pointer(ev("down"), ctx);
    expect(session.getState().status?.key).toBe("ops.reject.permission");
    expect(doc.getState().revision).toBe(0);
  });

  it("cancels a tool that throws, warns once and leaves the document alone", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { doc, session, host } = setup({
      pointer: () => {
        throw new Error("boom");
      },
    });
    host.pointer(ev("down"), ctx);
    host.pointer(ev("down"), ctx);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[iynk] tool failed", "select");
    expect(doc.commits).toHaveLength(0);
    expect(session.getState().preview).toEqual([]);
  });

  it("switches tool on a switch result", () => {
    const { session, host } = setup({ pointer: () => ({ kind: "switch", tool: "wire" }) });
    host.pointer(ev("down"), ctx);
    expect(session.getState().tool).toBe("wire");
  });

  it("ignores events when no tool is registered for the active id", () => {
    const { doc, session, host } = setup();
    session.setTool("place");
    host.pointer(ev("down"), ctx);
    expect(host.key({ key: "a", shift: false, alt: false, ctrl: false }, ctx)).toBe(false);
    expect(doc.commits).toHaveLength(0);
  });

  it("cancels a gesture on Escape and when the tool changes", () => {
    const seen: string[] = [];
    const { host } = setup({
      pointer: (e) => {
        seen.push(e.type);
        return { kind: "none" };
      },
    });
    host.register({ id: "wire", cursor: () => "crosshair", pointer: () => ({ kind: "none" }), key: () => ({ kind: "none" }), preview: () => [] });
    host.pointer(ev("down"), ctx);
    expect(host.key({ key: "Escape", shift: false, alt: false, ctrl: false }, ctx)).toBe(true);
    host.pointer(ev("down"), ctx);
    host.setTool("wire");
    expect(seen).toEqual(["down", "cancel", "down", "cancel"]);
  });

  it("passes keys to the tool and reports whether it used them", () => {
    const { host } = setup({ key: (k): ToolResult => (k.key === "x" ? { kind: "preview" } : { kind: "none" }) });
    expect(host.key({ key: "x", shift: false, alt: false, ctrl: false }, ctx)).toBe(true);
    expect(host.key({ key: "y", shift: false, alt: false, ctrl: false }, ctx)).toBe(false);
  });

  it("keeps the last 20 results only in a test build", () => {
    const { host } = setup({ pointer: () => ({ kind: "preview" }) });
    host.pointer(ev("move"), ctx);
    expect(host.recent()).toEqual([]);
    vi.stubEnv("NEXT_PUBLIC_STUDIO_TEST", "1");
    for (let i = 0; i < 25; i++) host.pointer(ev("move"), ctx);
    expect(host.recent()).toHaveLength(20);
    expect(host.recent()[0]).toEqual({ tool: "select", result: "preview" });
  });
});
