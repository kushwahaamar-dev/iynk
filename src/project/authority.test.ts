// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createLocalAuthority } from "./authority.ts";
import type { Op } from "./generated/types.ts";
import { lessonSession, seededRandom, USER } from "./session.testing.ts";

const OPS: Op[] = [
  { k: "meta.set", set: { title: "One" } },
  { k: "meta.set", set: { title: "Two" } },
  { k: "meta.set", set: { title: "Three" } },
];

function authority(startRevision = 7) {
  return createLocalAuthority({ clock: () => Date.UTC(2026, 9, 28, 10, 0, 0, 5), rnd: seededRandom(), startRevision });
}

describe("createLocalAuthority", () => {
  it("is local", () => {
    expect(authority().mode).toBe("local");
  });

  it("numbers seq from startRevision + 1 and sets base one behind", () => {
    const stamped = authority().stamp(OPS, USER);
    expect(stamped.map((e) => [e.seq, e.base])).toEqual([[8, 7], [9, 8], [10, 9]]);
  });

  it("carries on from the last batch", () => {
    const local = authority(0);
    local.stamp(OPS, USER);
    expect(local.stamp(OPS.slice(0, 1), USER)[0]!.seq).toBe(4);
  });

  it("stamps the clock time in ISO form, copies the author and keeps the op", () => {
    const [first] = authority().stamp(OPS.slice(0, 1), { ...USER, proposal: "pr_1" });
    expect(first).toMatchObject({ at: "2026-10-28T10:00:00.005Z", author: { actor: "usr_amar", kind: "user", proposal: "pr_1" }, op: OPS[0] });
    expect(first!.opId).toMatch(/^op_[a-z2-7]{16}$/);
  });

  it("shares one batch id, the first opId, across a batch of several ops only", () => {
    const stamped = authority().stamp(OPS, USER);
    expect(stamped.every((e) => e.batch === stamped[0]!.opId)).toBe(true);
    expect(authority().stamp(OPS.slice(0, 1), USER)[0]).not.toHaveProperty("batch");
  });

  it("gives equal output for a seeded source and a fixed clock", () => {
    expect(authority().stamp(OPS, USER)).toEqual(authority().stamp(OPS, USER));
  });

  it("stamps what a session records", () => {
    const session = lessonSession();
    session.apply(OPS, USER);
    const stamped = createLocalAuthority({
      clock: () => Date.UTC(2026, 9, 28, 10, 0, 1),
      rnd: seededRandom(),
      startRevision: 0,
    }).stamp(OPS, USER);
    const recorded = session.state.history.ops;
    expect(recorded.map(({ seq, base, op, batch }) => ({ seq, base, op, batch: batch !== undefined }))).toEqual(
      stamped.map(({ seq, base, op, batch }) => ({ seq, base, op, batch: batch !== undefined })),
    );
    expect(recorded.map((e) => e.opId)).toEqual(stamped.map((e) => e.opId));
  });
});
