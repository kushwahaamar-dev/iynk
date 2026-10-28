import { expect } from "vitest";
import type { Op, Project, View, Wire } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { accept, loadExample } from "./fixtures.testing.ts";

export const blink = (): Project => loadExample("uno-blink-d12");

export const viewOf = (state: Project, id: string): View => state.views.find((v) => v.id === id) as View;

export const wireOf = (state: Project, view: string, id: string): Wire =>
  viewOf(state, view).wires.find((w) => w.id === id) as Wire;

/**
 * The blink project with a junction stub, a label and two groups drawn in the schematic: `jct_g` hangs off the LED
 * cathode by `wir_g1` and the two share `grp_g`; `grp_h` groups the three original wires.
 */
export function drawnBlink(): Project {
  return accept(blink(), [
    { k: "junction.add", view: "vw_sch", junction: { id: "jct_g", net: "net_gnd", x_mm: 40, y_mm: 60 } },
    {
      k: "wire.add",
      view: "vw_sch",
      wire: {
        id: "wir_g1",
        net: "net_gnd",
        from: { kind: "pin", c: "cmp_led1", p: "K" },
        to: { kind: "junction", id: "jct_g" },
      },
    },
    { k: "label.set", view: "vw_sch", label: { id: "lbl_d12", text: "D12", x_mm: 10, y_mm: 10, net: "net_d12" } },
    { k: "group.set", view: "vw_sch", group: { id: "grp_g", members: ["wir_g1", "jct_g"] } },
    { k: "group.set", view: "vw_sch", group: { id: "grp_h", members: ["wir_s3", "wir_s1", "wir_s2"] } },
  ]).state;
}

/** Every op is something the schema accepts, which is what a replaying client checks first. */
export function expectValid(ops: Op[]): void {
  for (const op of ops) expect(validateOp(op)).toBe(true);
}
