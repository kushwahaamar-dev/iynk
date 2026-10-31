import { newId } from "../../core/ids.ts";
import { blankProject } from "../../project/blank.ts";
import type { Op, Project } from "../../project/generated/types.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock, USER } from "../../project/session.testing.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { legRecipe, canConnect, wireRecipe } from "../rules/connect.ts";
import type { WireEndRef } from "../rules/connect.ts";
import { createDocStore } from "../stores/doc.ts";
import { BREADBOARD_REF, breadboardBatch, surfaceGeom } from "../views/breadboard.ts";
import type { IdSource } from "../views/breadboard.ts";

const VIEW = "vw_bb";
const BOARD_AT = { x: 0, y: 0 };
const UNO_AT = { x: -80, y: 0 };

type Seat = { ref: string; refdes: string; legs: Record<string, string>; anchor: string };

const SEATS: Record<"r1" | "led" | "button", Seat> = {
  r1: { ref: "core.resistor", refdes: "R1", legs: { P1: "a5", P2: "a9" }, anchor: "P1" },
  led: { ref: "core.led-5mm", refdes: "D1", legs: { A: "b11", K: "b12" }, anchor: "A" },
  button: { ref: "core.push-button-6mm", refdes: "SW1", legs: { P2: "e14", P1: "e17", P4: "f14", P3: "f17" }, anchor: "P2" },
};

export type BlinkCircuit = {
  project: Project;
  uno: string;
  breadboard: string;
  r1: string;
  led: string;
  button: string;
  /** The six wires of M1 step 4, in the order they were drawn. */
  wires: string[];
};

/**
 * The project of M1 steps 1 to 4: an Uno, a breadboard, a resistor, an LED and a button seated in it, and six wires.
 * D13 runs through R1 and the LED to a ground rail, D2 runs to the button, whose other side goes to the same rail,
 * and the rail goes to the Uno's GND. Parts and wires are added the way the editor adds them.
 */
export function blinkCircuit(): BlinkCircuit {
  const registry = builtinRegistry();
  const rnd = seededRandom();
  const ids: IdSource = (prefix) => newId(prefix, rnd);
  const doc = createDocStore(
    createSession({
      state: blankProject({ board: "uno", title: "Blink", locale: "en", actor: USER.actor, now: "2026-10-28T10:00:00.000Z", id: "prj_blink" }),
      clock: steppingClock(),
      rnd,
    }),
  );
  const commit = (batch: Op[], label: string) => {
    const done = doc.commit(batch, { label });
    if (!done.ok) throw new Error(`${label}: ${done.reject}: ${done.message}`);
  };

  const { batch, component: breadboard } = breadboardBatch(registry, ids, BOARD_AT);
  const geom = surfaceGeom(registry.latest(BREADBOARD_REF)!);
  commit([...batch, { k: "view.place", view: VIEW, placement: { c: "brd_uno", x_mm: UNO_AT.x, y_mm: UNO_AT.y } }], "Place boards");

  const placed = {} as Record<keyof typeof SEATS, string>;
  for (const [key, seat] of Object.entries(SEATS) as [keyof typeof SEATS, Seat][]) {
    const desc = registry.latest(seat.ref)!;
    const c = ids("cmp");
    placed[key] = c;
    const pin = desc.pins.find((p) => p.id === seat.anchor)!.position!;
    const hole = geom.byName.get(seat.legs[seat.anchor]!)!;
    const height = desc.dimensions?.body?.h ?? 0;
    const x_mm = Math.round((BOARD_AT.x + hole.xMm - pin.x) * 100) / 100;
    const y_mm = Math.round((BOARD_AT.y + hole.yMm - (height - pin.y)) * 100) / 100;
    commit(
      [
        { k: "dep.set", dependency: { ref: desc.id, version: desc.version, origin: "builtin", interface: interfaceOf(desc) } },
        { k: "component.add", component: { id: c, definition: { ref: desc.id, version: desc.version }, refdes: seat.refdes } },
        { k: "view.place", view: VIEW, placement: { c, x_mm, y_mm, legs: seat.legs } },
        ...legRecipe(doc.getState().state, VIEW, c, seat.legs, ids),
      ],
      `Place ${seat.refdes}`,
    );
  }

  const pin = (c: string, p: string): WireEndRef => ({ kind: "pin", c, p });
  const hole = (h: string): WireEndRef => ({ kind: "hole", surface: breadboard, hole: h });
  const runs: [WireEndRef, WireEndRef][] = [
    [pin("brd_uno", "D13"), hole("c5")],
    [hole("c9"), hole("c11")],
    [hole("c12"), hole("RAIL_BN2")],
    [pin("brd_uno", "GND"), hole("RAIL_BN3")],
    [pin("brd_uno", "D2"), hole("c14")],
    [hole("h14"), hole("RAIL_BN4")],
  ];
  const wires = runs.map(([a, b]) => {
    const state = doc.getState().state;
    const verdict = canConnect(state, VIEW, a, b);
    if (!verdict.ok) throw new Error(`blink wire refused: ${verdict.code}`);
    const recipe = wireRecipe(state, VIEW, a, b, ids);
    commit(recipe.batch, recipe.label);
    const wire = recipe.batch[recipe.batch.length - 1];
    return wire?.k === "wire.add" ? wire.wire.id : "";
  });

  return { project: doc.getState().state, uno: "brd_uno", breadboard, ...placed, wires };
}
