import type { Component, Net, PinRef, Project } from "../../project/generated/types.ts";
import { quoteField } from "./sanitize.ts";

export type Level = "D0" | "D1" | "D2";
export type Quote = (raw: string, cap?: number) => string;

const MAX_NEAR = 60;
const MAX_MEMBERS = 100;

/** A quoted field that cannot pass for a fence line when it lands inside the pack. */
export const quoteSafe: Quote = (raw, cap) => quoteField(raw, cap).replaceAll("<<", "<\\<");

/** Ids and registry names are schema-checked already; this keeps one that was not from spoiling a row. */
export function word(raw: string): string {
  return raw.replace(/[^\w.@:+-]/g, "_") || "-";
}

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function pinText(ref: PinRef): string {
  return `${word(ref.c)}.${word(ref.p)}`;
}

function sortedConnections(net: Net): PinRef[] {
  return [...net.connections].sort((a, b) => (a.c !== b.c ? (a.c < b.c ? -1 : 1) : a.p < b.p ? -1 : a.p > b.p ? 1 : 0));
}

/** Components within `depth` net hops of the seeds (component or net ids), breadth first, ties in id order, at most `max`. */
export function neighbourhood(doc: Project, seeds: readonly string[], depth: number, max: number = MAX_NEAR): string[] {
  const netsOf = new Map<string, string[]>();
  const membersOf = new Map<string, string[]>();
  for (const net of doc.nets) {
    const members = [...new Set(net.connections.map((p) => p.c))].sort();
    membersOf.set(net.id, members);
    for (const c of members) {
      const list = netsOf.get(c);
      if (list) list.push(net.id);
      else netsOf.set(c, [net.id]);
    }
  }
  const components = new Set(doc.components.map((c) => c.id));
  const seen = new Set<string>();
  const order: string[] = [];
  let frontier: string[] = [];
  const visit = (id: string) => {
    if (seen.has(id) || order.length >= max) return;
    seen.add(id);
    order.push(id);
    frontier.push(id);
  };
  for (const seed of [...seeds].sort()) {
    if (components.has(seed)) visit(seed);
    else for (const c of membersOf.get(seed) ?? []) visit(c);
  }
  for (let hop = 0; hop < depth && frontier.length > 0 && order.length < max; hop++) {
    const current = frontier.sort();
    frontier = [];
    for (const id of current) {
      for (const netId of [...(netsOf.get(id) ?? [])].sort()) {
        for (const c of membersOf.get(netId) ?? []) visit(c);
      }
    }
  }
  return order;
}

function paramText(component: Component, quote: Quote): string {
  const params = component.params ?? {};
  const parts: string[] = [];
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined) continue;
    const text =
      typeof value === "string" ? quote(value) : typeof value === "object" ? `param:${word(value.param)}` : String(value);
    parts.push(`${word(key)}=${text}`);
  }
  if (component.label !== undefined) parts.push(`label=${quote(component.label)}`);
  return parts.length > 0 ? parts.join(" ") : "-";
}

function componentRow(c: Component, quote: Quote): string {
  return `${word(c.id)} ${word(c.definition.ref)}@${word(c.definition.version)} ${word(c.refdes)} ${paramText(c, quote)}`;
}

function netRow(net: Net, quote: Quote): string {
  const connections = sortedConnections(net);
  const shown = connections.slice(0, MAX_MEMBERS).map(pinText).join(" ");
  const more = connections.length > MAX_MEMBERS ? ` +${connections.length - MAX_MEMBERS} more` : "";
  return `${word(net.id)} ${net.name === undefined ? "-" : quote(net.name)} ${net.class ?? "signal"} : ${shown}${more}`;
}

const COMPONENT_LEGEND = "id definition refdes params";
const NET_LEGEND = "id name class : members (component.pin)";

/**
 * The component and net lines of the pack. D2 lists everything; D1 lists ids only and gives full rows for the
 * components in `near` and the nets that touch them; D0 gives counts and the same full rows.
 */
export function digestLines(
  doc: Project,
  level: Level,
  near: readonly string[],
  quote: Quote = quoteSafe,
): { components: string[]; nets: string[] } {
  const components = [...doc.components].sort(byId);
  const nets = [...doc.nets].sort(byId);
  const close = new Set(near);
  const nearComponents = components.filter((c) => close.has(c.id));
  const nearNets = nets.filter((n) => n.connections.some((p) => close.has(p.c)));

  if (level === "D2") {
    return {
      components: [`[COMPONENTS] ${COMPONENT_LEGEND}`, ...(components.length > 0 ? components.map((c) => componentRow(c, quote)) : ["-"])],
      nets: [`[NETS] ${NET_LEGEND}`, ...(nets.length > 0 ? nets.map((n) => netRow(n, quote)) : ["-"])],
    };
  }

  const componentLines: string[] = [];
  const netLines: string[] = [];
  if (level === "D1") {
    componentLines.push("[COMPONENTS] outline: id refdes", ...components.map((c) => `${word(c.id)} ${word(c.refdes)}`));
    netLines.push(
      "[NETS] outline: id name size",
      ...nets.map((n) => `${word(n.id)} ${n.name === undefined ? "-" : quote(n.name)} ${n.connections.length}`),
    );
  } else {
    const perDefinition = new Map<string, number>();
    for (const c of components) {
      const key = `${word(c.definition.ref)}@${word(c.definition.version)}`;
      perDefinition.set(key, (perDefinition.get(key) ?? 0) + 1);
    }
    componentLines.push(
      `[COMPONENTS] count=${components.length}`,
      ...[...perDefinition].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, n]) => `${key} x${n}`),
    );
    netLines.push(`[NETS] count=${nets.length}`);
  }
  if (nearComponents.length > 0) {
    componentLines.push(`near: ${COMPONENT_LEGEND}`, ...nearComponents.map((c) => componentRow(c, quote)));
  }
  if (nearNets.length > 0) netLines.push(`near: ${NET_LEGEND}`, ...nearNets.map((n) => netRow(n, quote)));
  return { components: componentLines, nets: netLines };
}
