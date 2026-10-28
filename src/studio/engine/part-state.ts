import type { Component, Project as ProjectState } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
import type { Netlist, NetlistNode } from "../../project/netlist.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import type { PartStateEntry, PartStateFrame } from "../stores/run.ts";

export type PinLevel = 0 | 1 | null;

export type PartVisualState =
  | { kind: "led"; on: boolean; duty: number }
  | { kind: "button"; pressed: boolean }
  | { kind: "pot"; position: number }
  | { kind: "buzzer"; tone: number | null }
  | { kind: "none"; reason: "not-modelled-yet" };

type Lookup = Pick<PartRegistry, "get">;
type Element = "led" | "res" | "button" | "pot" | "buzzer" | "other";

const NONE: PartVisualState = { kind: "none", reason: "not-modelled-yet" };
const ANODE = "A";
const CATHODE = "K";
const DEFAULT_POT_POSITION = 0.5;

let shipped: PartRegistry | undefined;
const shippedParts = (): PartRegistry => (shipped ??= builtinRegistry());

let cached: { state: ProjectState; nl: Netlist } | undefined;
function netlistOf(state: ProjectState): Netlist {
  if (cached?.state !== state) cached = { state, nl: netlist(state) };
  return cached.nl;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

function elementOf(registry: Lookup, c: Component): Element | "surface" | "unknown" {
  const descriptor = registry.get(c.definition.ref, c.definition.version);
  if (!descriptor) return "unknown";
  if (descriptor.identity.tags?.includes("surface")) return "surface";
  if (descriptor.simulation.status === "not-modelled-yet") return "unknown";
  for (const layer of descriptor.behaviour.layers) {
    if (layer.model.kind !== "element") continue;
    const e = layer.model.element;
    return e === "led" || e === "res" || e === "button" || e === "pot" || e === "buzzer" ? e : "other";
  }
  return "unknown";
}

function levelOf(frame: PartStateFrame, node: NetlistNode | undefined): PinLevel {
  if (!node) return null;
  const raw = frame.pins[node.id] ?? (node.names[0] === undefined ? undefined : frame.pins[node.names[0]]);
  return raw === 0 || raw === 1 ? raw : null;
}

/** The level of every pin that sits on a net, as `c/p`. A pin whose node the frame does not report, or reports as `Z` or `X`, is `null`. */
export function pinLevels(state: ProjectState, frame: PartStateFrame): Map<string, PinLevel> {
  const nl = netlistOf(state);
  const byId = new Map(nl.nodes.map((n) => [n.id, n]));
  return new Map(Object.entries(nl.pinNode).map(([key, id]) => [key, levelOf(frame, byId.get(id))]));
}

/** Nodes joined by a resistor, so an LED behind a series resistor sees the pin that drives the resistor. */
function resistorLinks(state: ProjectState, registry: Lookup, nl: Netlist): Map<string, Set<string>> {
  const links = new Map<string, Set<string>>();
  for (const c of state.components) {
    if (elementOf(registry, c) !== "res") continue;
    const nodes = Object.entries(nl.pinNode)
      .filter(([key]) => key.startsWith(`${c.id}/`))
      .map(([, node]) => node);
    for (const a of nodes) {
      const set = links.get(a) ?? new Set<string>();
      for (const b of nodes) set.add(b);
      links.set(a, set);
    }
  }
  return links;
}

function ledFromPins(c: Component, frame: PartStateFrame, nl: Netlist, links: Map<string, Set<string>>): PartVisualState {
  const byId = new Map(nl.nodes.map((n) => [n.id, n]));
  const anode = nl.pinNode[`${c.id}/${ANODE}`];
  const cathode = nl.pinNode[`${c.id}/${CATHODE}`];
  if (anode === undefined) return { kind: "led", on: false, duty: 0 };
  const seen = new Set([anode]);
  const queue = [anode];
  let driven = false;
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (levelOf(frame, byId.get(id)) === 1) driven = true;
    for (const next of links.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  const on = driven && levelOf(frame, cathode === undefined ? undefined : byId.get(cathode)) !== 1;
  return { kind: "led", on, duty: on ? 1 : 0 };
}

function fromEntry(entry: PartStateEntry, c: Component): PartVisualState {
  switch (entry.kind) {
    case "led": {
      if (entry.lit !== true) return { kind: "led", on: false, duty: 0 };
      return { kind: "led", on: true, duty: typeof entry.brightness === "number" ? clamp01(entry.brightness) : 1 };
    }
    case "button":
      return { kind: "button", pressed: entry.pressed === true };
    case "buzzer":
      return { kind: "buzzer", tone: entry.on === true && typeof entry.hz === "number" ? entry.hz : null };
    case "pot":
      return { kind: "pot", position: typeof entry.position === "number" ? clamp01(entry.position) : potParam(c) };
    default:
      return NONE;
  }
}

function potParam(c: Component): number {
  const pos = c.params?.pos;
  return typeof pos === "number" ? clamp01(pos) : DEFAULT_POT_POSITION;
}

/**
 * What each part of the document looks like in `frame`. The part kind comes from the descriptor's element model, not
 * from the part id. The simulator's own entry for a part wins; an LED it did not report is read from the pin levels
 * through the netlist and any series resistors. A part whose descriptor says it is not modelled, or has no model, is
 * `none`. Boards, wiring surfaces and resistors have no visual state and are left out. Parts that left the document
 * while a frame was in flight are never visited, so their entries drop out.
 */
export function derivePartStates(
  state: ProjectState,
  frame: PartStateFrame,
  registry: Lookup = shippedParts(),
): Map<string, PartVisualState> {
  const nl = netlistOf(state);
  const entries = new Map(frame.parts.map((p) => [p.part, p]));
  const links = resistorLinks(state, registry, nl);
  const out = new Map<string, PartVisualState>();
  for (const c of state.components) {
    const element = elementOf(registry, c);
    if (element === "surface" || element === "res") continue;
    if (element === "unknown" || element === "other") {
      out.set(c.id, NONE);
      continue;
    }
    const entry = entries.get(c.id);
    if (entry) {
      out.set(c.id, fromEntry(entry, c));
    } else if (element === "led") {
      out.set(c.id, ledFromPins(c, frame, nl, links));
    } else if (element === "button") {
      out.set(c.id, { kind: "button", pressed: false });
    } else if (element === "pot") {
      out.set(c.id, { kind: "pot", position: potParam(c) });
    } else {
      out.set(c.id, NONE);
    }
  }
  return out;
}
