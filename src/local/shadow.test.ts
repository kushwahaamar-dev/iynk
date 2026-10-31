// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { OpEnvelope } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { generateSession } from "@/project/testing/generators";
import { ownerOf, session } from "@/project/testing/harness";
import { createShadow } from "./shadow";

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("shadow", () => {
  it.each(SEEDS)("folds a generated session (seed %i) into the same document and history", (seed) => {
    const { start, live } = generateSession(seed, 40);
    const envelopes = live.state.history.ops;
    const shadow = createShadow(start.id, start, start.revision);

    expect(shadow.fold(envelopes, start.revision, live.revision)).toEqual({ ok: true });
    expect(shadow.revision).toBe(live.revision);
    expect(shadow.hash()).toBe(stateHash(live.state));
    expect(shadow.doc.history.ops).toEqual(envelopes);
  });

  it("folds the same session in pieces", () => {
    const { start, live } = generateSession(7, 40);
    const envelopes = live.state.history.ops;
    const shadow = createShadow(start.id, start, start.revision);
    const mid = Math.floor(envelopes.length / 2);

    expect(shadow.fold(envelopes.slice(0, mid), start.revision, envelopes[mid - 1]!.seq).ok).toBe(true);
    expect(shadow.fold(envelopes.slice(mid), shadow.revision, live.revision).ok).toBe(true);
    expect(shadow.hash()).toBe(stateHash(live.state));
  });

  it("applies the envelopes of one batch together", () => {
    const { start, ops } = generateSession(1, 30);
    const live = session(start);
    expect(live.apply(ops.slice(0, 3), ownerOf(start)).ok).toBe(true);
    const envelopes = live.state.history.ops;
    expect(new Set(envelopes.map((e) => e.batch)).size).toBe(1);

    const shadow = createShadow(start.id, start, start.revision);
    expect(shadow.fold(envelopes, start.revision, live.revision).ok).toBe(true);
    expect(shadow.hash()).toBe(stateHash(live.state));
    expect(shadow.doc.history.ops).toEqual(envelopes);
  });

  it("reports a gap when the batch does not start at the shadow's revision", () => {
    const { start, live } = generateSession(2, 10);
    const envelopes = live.state.history.ops;
    const shadow = createShadow(start.id, start, start.revision);

    expect(shadow.fold(envelopes, start.revision + 1, live.revision)).toEqual({ ok: false, reason: "gap" });
    expect(shadow.fold(envelopes.slice(1), start.revision, live.revision)).toEqual({ ok: false, reason: "gap" });
    expect(shadow.revision).toBe(start.revision);
  });

  it("leaves the shadow unchanged when an op is rejected", () => {
    const { start, live } = generateSession(3, 10);
    const envelopes = live.state.history.ops;
    const last = envelopes[envelopes.length - 1]!;
    const bad: OpEnvelope = { ...last, op: { k: "component.remove", id: "cmp_nothere" } };
    const shadow = createShadow(start.id, start, start.revision);
    const before = shadow.hash();

    expect(shadow.fold([...envelopes.slice(0, -1), bad], start.revision, live.revision)).toEqual({ ok: false, reason: "reject" });
    expect(shadow.revision).toBe(start.revision);
    expect(shadow.hash()).toBe(before);
    expect(shadow.doc.history.ops).toEqual([]);
  });
});
