// @vitest-environment node
import { describe, expect, it } from "vitest";
import { explainOnlyInstruction, gate, InvalidCounter } from "./guard.ts";
import type { GateInput } from "./guard.ts";
import type { StageReject } from "./types.ts";

const base: GateInput = {
  mode: "direct",
  role: "editor",
  sealedOpen: false,
  ladderLevel: 0,
  showMe: false,
  fixIt: false,
  applyIt: false,
  xTaint: false,
  taintConfirmed: false,
};

describe("gate", () => {
  const rows: [string, Partial<GateInput>, ReturnType<typeof gate>][] = [
    ["commenter", { role: "commenter" }, { offer: false, reason: "role" }],
    ["viewer", { role: "viewer" }, { offer: false, reason: "role" }],
    ["sealed item", { sealedOpen: true }, { offer: false, reason: "sealed_item" }],
    ["sealed item beats direct mode", { mode: "advanced", sealedOpen: true }, { offer: false, reason: "sealed_item" }],
    ["socratic below 3", { mode: "socratic", ladderLevel: 2 }, { offer: false, reason: "ladder" }],
    ["beginner below 3", { mode: "beginner", ladderLevel: 1 }, { offer: false, reason: "ladder" }],
    ["socratic at 3", { mode: "socratic", ladderLevel: 3 }, { offer: true, needsConfirm: false }],
    ["beginner show me", { mode: "beginner", showMe: true }, { offer: true, needsConfirm: false }],
    ["beginner apply it at level 1", { mode: "beginner", ladderLevel: 1, applyIt: true }, { offer: true, needsConfirm: false }],
    ["debugging without fix it", { mode: "debugging" }, { offer: false, reason: "not_asked" }],
    ["debugging with fix it", { mode: "debugging", fixIt: true }, { offer: true, needsConfirm: false }],
    ["direct", { mode: "direct" }, { offer: true, needsConfirm: false }],
    ["advanced", { mode: "advanced" }, { offer: true, needsConfirm: false }],
    ["tainted, not confirmed", { xTaint: true }, { offer: true, needsConfirm: true }],
    ["tainted, confirmed", { xTaint: true, taintConfirmed: true }, { offer: true, needsConfirm: false }],
  ];

  it.each(rows)("%s", (_name, over, want) => {
    expect(gate({ ...base, ...over })).toEqual(want);
  });
});

describe("InvalidCounter", () => {
  it("repairs twice, then explains only", () => {
    const c = new InvalidCounter();
    expect(c.onInvalid()).toEqual({ action: "repair", attempt: 1 });
    expect(c.onInvalid()).toEqual({ action: "repair", attempt: 2 });
    expect(c.onInvalid()).toEqual({ action: "explain_only" });
    expect(c.count).toBe(3);
  });

  it("resets when a proposal opens", () => {
    const c = new InvalidCounter();
    c.onInvalid();
    c.onInvalid();
    c.onOpen();
    expect(c.count).toBe(0);
    expect(c.onInvalid()).toEqual({ action: "repair", attempt: 1 });
  });

  it("resets on a new user message", () => {
    const c = new InvalidCounter();
    c.onInvalid();
    c.onInvalid();
    c.onInvalid();
    c.onUserMessage();
    expect(c.onInvalid()).toEqual({ action: "repair", attempt: 1 });
  });
});

describe("explainOnlyInstruction", () => {
  it("is short and carries no op payloads", () => {
    const rejects: StageReject[] = Array.from({ length: 40 }, (_, i) => ({
      stage: "P2",
      code: "bad_args",
      message: `{"k":"wire.add","id":"w${i}"}`,
    }));
    const text = explainOnlyInstruction(rejects);
    expect(text.length).toBeLessThanOrEqual(400);
    expect(text).not.toContain("{");
    expect(text).toContain("bad_args");
  });
});
