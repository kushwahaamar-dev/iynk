import { newId } from "../../core/ids.ts";
import { blankProject } from "../../project/blank.ts";
import type { Op, Project } from "../../project/generated/types.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock, USER } from "../../project/session.testing.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { breadboardBatch } from "../views/breadboard.ts";
import type { IdSource } from "../views/breadboard.ts";

export const registry = builtinRegistry();

/** A blank Uno project with a breadboard added through `breadboardBatch`. */
export function projectWithBreadboard(extra: (bb: string) => Op[] = () => []): { project: Project; bb: string } {
  const rnd = seededRandom();
  const ids: IdSource = (prefix) => newId(prefix, rnd);
  const session = createSession({
    state: blankProject({ board: "uno", title: "bb", locale: "en", actor: USER.actor, now: "2026-10-28T10:00:00.000Z", id: "prj_bbtest" }),
    clock: steppingClock(),
    rnd,
  });
  const { batch, component } = breadboardBatch(registry, ids, { x: 10, y: 20 });
  const result = session.apply([...batch, ...extra(component)], USER);
  if (!result.ok) throw new Error(`${result.reject}: ${result.message}`);
  return { project: session.state, bb: component };
}

/** The ops that add a resistor R1 (`cmp_r1`) and pin its interface. */
export function addResistor(): Op[] {
  const resistor = registry.latest("core.resistor")!;
  return [
    { k: "dep.set", dependency: { ref: resistor.id, version: resistor.version, origin: "builtin", interface: interfaceOf(resistor) } },
    { k: "component.add", component: { id: "cmp_r1", definition: { ref: resistor.id, version: resistor.version }, refdes: "R1" } },
  ];
}
