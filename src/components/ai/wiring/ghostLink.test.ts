// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emptyDiff } from "@/ai/proposals/diffsummary";
import type { ProposalRecord } from "@/ai/proposals/types";
import { stateHash } from "@/project/hash";
import { lessonSession } from "@/project/session.testing";
import type { Op, Project } from "@/project/generated/types";
import type { ResolvedPartShape } from "@/studio/engine/types";
import { createSessionStore } from "@/studio/stores/session";
import { linkGhost, MAX_GHOSTS, overlaysFor } from "./ghostLink";
import type { ProposalHost, ProposalView } from "./proposalHost";

const shape: ResolvedPartShape = {
  widthMm: 6,
  heightMm: 4,
  pins: [
    { id: "A", xMm: 0, yMm: 2, mechanical: false },
    { id: "K", xMm: 6, yMm: 2, mechanical: false },
  ],
  known: true,
};

const state: Project = lessonSession().state;
const view = state.views[0]!;
const old = state.components.find((c) => view.placements.some((p) => p.c === c.id))!;
const oldAt = view.placements.find((p) => p.c === old.id)!;

const place = (c: string, x: number, y: number): Op => ({ k: "view.place", view: view.id, placement: { c, x_mm: x, y_mm: y } });
const ctx = { viewId: view.id, resolve: () => shape };

function addDiff() {
  const diff = emptyDiff();
  diff.parts.added.push({ id: "cmp_new", label: "LED", definition: old.definition.ref });
  return diff;
}

describe("overlaysFor", () => {
  it("outlines an added part at its planned place", () => {
    const [ghost] = overlaysFor(addDiff(), [place("cmp_new", 30, 40)], state, ctx);
    expect(ghost).toMatchObject({ id: "ghost:add:cmp_new", xMm: 30, yMm: 40 });
  });

  it("skips an added part the proposal does not place", () => {
    expect(overlaysFor(addDiff(), [], state, ctx)).toEqual([]);
  });

  it("crosses out a removed part at its current place", () => {
    const diff = emptyDiff();
    diff.parts.removed.push({ id: old.id, label: "x" });
    const [ghost] = overlaysFor(diff, [], state, ctx);
    expect(ghost).toMatchObject({ id: `ghost:remove:${old.id}`, xMm: oldAt.x_mm, yMm: oldAt.y_mm });
    expect(ghost!.elements.some((e) => e.t === "path")).toBe(true);
  });

  it("draws a dashed pair for a new connection", () => {
    const diff = addDiff();
    diff.nets.push({ id: "net_x", added: ["cmp_new.A", `${old.id}.A`], removed: [] });
    const ghosts = overlaysFor(diff, [place("cmp_new", 30, 40)], state, ctx);
    expect(ghosts.map((g) => g.id)).toContain("ghost:join:net_x");
  });

  it("shows a count only past the cap", () => {
    const diff = emptyDiff();
    const ops: Op[] = [];
    for (let i = 0; i <= MAX_GHOSTS; i++) {
      diff.parts.added.push({ id: `cmp_${i}`, label: "r", definition: old.definition.ref });
      ops.push(place(`cmp_${i}`, i, i));
    }
    const ghosts = overlaysFor(diff, ops, state, ctx);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toMatchObject({ id: "ghost:count" });
  });
});

function hostWith(initial: ProposalView | null) {
  let current = initial;
  const listeners = new Set<() => void>();
  const host = {
    selected: () => current,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  } as unknown as ProposalHost;
  return {
    host,
    set(next: ProposalView | null) {
      current = next;
      for (const l of [...listeners]) l();
    },
  };
}

function cardView(): ProposalView {
  const record = {
    proposal: { id: "prp_1", steps: [{ id: "s1", label: "s", ops: [place("cmp_new", 30, 40)] }] },
  } as unknown as ProposalRecord;
  return { record, report: { diff: addDiff(), diffHash: "h1" } as ProposalView["report"], notice: null, changedSince: null, undoable: false, pendingTaint: false };
}

describe("linkGhost", () => {
  it("fills the preview while a card is selected, clears it after, and leaves the document alone", () => {
    const session = createSessionStore(view.id);
    const { host, set } = hostWith(cardView());
    const before = stateHash(state);
    const unlink = linkGhost({ session, host, state: () => state, resolve: ctx.resolve });
    expect(session.getState().preview).toHaveLength(1);
    set(null);
    expect(session.getState().preview).toEqual([]);
    set(cardView());
    expect(session.getState().preview).toHaveLength(1);
    unlink();
    expect(session.getState().preview).toEqual([]);
    expect(stateHash(state)).toBe(before);
  });

  it("does not clear a preview some tool put there", () => {
    const session = createSessionStore(view.id);
    const { host, set } = hostWith(null);
    linkGhost({ session, host, state: () => state, resolve: ctx.resolve });
    const tool = [{ id: "place:ghost", xMm: 0, yMm: 0, elements: [] }];
    session.setPreview(tool);
    set(null);
    expect(session.getState().preview).toBe(tool);
  });
});
