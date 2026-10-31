// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op } from "./generated/types.ts";
import { lessonSession, USER } from "./session.testing.ts";

const refused = (ops: Op[]) => {
  const session = lessonSession();
  const before = session.state;
  const result = session.apply(ops, USER);
  expect(session.state).toBe(before);
  return result;
};

describe("batch rules through the session", () => {
  it("refuses a wire whose end pin is not in its net", () => {
    const result = refused([
      {
        k: "wire.add",
        view: "vw_bb",
        wire: {
          id: "wir_bad",
          net: "net_gnd",
          from: { kind: "pin", c: "brd_uno", p: "D2" },
          to: { kind: "hole", hole: "a9", surface: "cmp_bb1" },
        },
      },
    ]);
    expect(result).toMatchObject({ ok: false, reject: "invariant" });
    expect(!result.ok && result.message).toMatch(/^V3-WIRE-END/);
  });

  it("refuses two nets on one strip", () => {
    const result = refused([
      {
        k: "view.place",
        view: "vw_bb",
        placement: { c: "cmp_res1", x_mm: 0, y_mm: 0, legs: { P1: "b10", P2: "d19" } },
      },
    ]);
    expect(!result.ok && result.message).toMatch(/^V3-STRIP-SHORT/);
  });

  it("refuses a leg in a taken hole", () => {
    const result = refused([
      {
        k: "view.place",
        view: "vw_bb",
        placement: { c: "cmp_res1", x_mm: 0, y_mm: 0, legs: { P1: "b10", P2: "c19" } },
      },
    ]);
    expect(!result.ok && result.message).toMatch(/^V3-HOLE-TWICE/);
  });

  it("refuses a pin that is in two nets", () => {
    const result = refused([{ k: "net.connect", net: "net_5v", pin: { c: "cmp_btn1", p: "P3" } }]);
    expect(result).toMatchObject({ ok: false, reject: "pin_in_use" });
  });

  it("refuses a duplicate refdes", () => {
    const result = refused([{ k: "component.set", id: "cmp_res1", set: { refdes: "BTN1" } }]);
    expect(!result.ok && result.message).toMatch(/^V3-REFDES/);
  });

  it("accepts a grant with its actor in one batch and refuses it alone", () => {
    const grant: Op = { k: "access.grant", actor: "usr_pal", role: "viewer" };
    expect(refused([grant])).toMatchObject({ ok: false, reject: "invariant" });
    const session = lessonSession();
    const joined = session.apply([{ k: "actor.set", actor: { id: "usr_pal", name: "Pal" } }, grant], USER);
    expect(joined.ok).toBe(true);
    expect(session.state.access.grants).toEqual([{ actor: "usr_pal", role: "viewer" }]);
  });
});
