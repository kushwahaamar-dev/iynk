import type { Net, Project as ProjectState, Wire } from "../../project/generated/types.ts";
import { blankProject } from "../../project/blank.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import { interfaceOf } from "../../parts/pins.ts";

export type PerfOptions = { parts: number; wires: number; seed: number };

export const PERF_DEFAULT: PerfOptions = { parts: 500, wires: 1000, seed: 1 };

/** The schematic view carries no surface, so every part is a plain placement. */
export const PERF_VIEW = "vw_sch";

const KINDS = [
  { ref: "core.resistor", prefix: "R" },
  { ref: "core.led-5mm", prefix: "D" },
  { ref: "core.push-button-6mm", prefix: "SW" },
  { ref: "core.buzzer-piezo", prefix: "BZ" },
  { ref: "core.potentiometer-10k", prefix: "RV" },
] as const;

const PITCH_MM = 14;
const SCREEN_ASPECT = 16 / 9;
const NET_PINS = 7;
const AIR_EVERY = 5;

type Pin = { c: string; p: string };

/** mulberry32: small, seeded, and the same on every machine. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `parts` core parts on a grid shaped like a screen, and `wires` wires between random pins, in nets of about seven
 * pins. Every fifth net leaves one pin unwired, so the air wire overlay has something to draw. Throws when the parts
 * have too few pins for that many wires.
 */
export function makePerfProject({ parts, wires, seed }: PerfOptions): ProjectState {
  const rnd = random(seed);
  const registry = builtinRegistry();
  const state = blankProject({ board: "uno", title: "Perf", locale: "en", actor: "usr_perf", now: "2026-10-28T00:00:00.000Z", id: "prj_perf" });
  const view = state.views.find((v) => v.id === PERF_VIEW)!;
  const columns = Math.ceil(Math.sqrt(parts * SCREEN_ASPECT));
  const counts = new Map<string, number>();
  const pins: Pin[] = [];

  for (let i = 0; i < parts; i++) {
    const kind = KINDS[i % KINDS.length]!;
    const descriptor = registry.latest(kind.ref)!;
    const number = (counts.get(kind.prefix) ?? 0) + 1;
    counts.set(kind.prefix, number);
    const c = `cmp_${i}`;
    state.components.push({ id: c, definition: { ref: descriptor.id, version: descriptor.version }, refdes: `${kind.prefix}${number}` });
    view.placements.push({ c, x_mm: (i % columns) * PITCH_MM, y_mm: Math.floor(i / columns) * PITCH_MM });
    for (const pin of descriptor.pins) if (pin.type !== "mechanical" && pin.class !== "mechanical") pins.push({ c, p: pin.id });
  }
  for (const kind of KINDS) {
    if (!counts.has(kind.prefix)) continue;
    const descriptor = registry.latest(kind.ref)!;
    state.dependencies.components.push({ ref: descriptor.id, version: descriptor.version, origin: "builtin", interface: interfaceOf(descriptor) });
  }

  for (let i = pins.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pins[i], pins[j]] = [pins[j]!, pins[i]!];
  }
  const queue = [...pins];
  const take = (n: number): Pin[] => {
    if (queue.length < n) throw new RangeError(`${parts} parts have too few pins for ${wires} wires`);
    return queue.splice(0, n);
  };

  const nets: Net[] = [];
  const drawn: Wire[] = [];
  for (let n = 0; drawn.length < wires; n++) {
    const edges = Math.min(NET_PINS - 1, wires - drawn.length);
    const members = take(edges + 1 + (n % AIR_EVERY === AIR_EVERY - 1 ? 1 : 0));
    const net = `net_${n}`;
    nets.push({ id: net, connections: members.map((m) => ({ c: m.c, p: m.p })) as Net["connections"] });
    for (let k = 1; k <= edges; k++) {
      const from = members[k]!;
      const to = members[Math.floor(rnd() * k)]!;
      drawn.push({ id: `wir_${drawn.length}`, net, from: { kind: "pin", ...from }, to: { kind: "pin", ...to } });
    }
  }
  state.nets = nets;
  view.wires = drawn;
  return state;
}
