import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { Board, Component, ComponentDependency, Net, View, Wire } from "./generated/types.ts";
import { defKey, each, isRecord, pinKey } from "./semantic.entity.ts";
import type { Ctx } from "./semantic.entity.ts";

interface Occurrence {
  path: string;
  entity: object;
}

/** Groups `items` by key; the rules below report every member of a group of two or more. */
function collide(items: { key: string; at: Occurrence }[]): Map<string, Occurrence[]> {
  const groups = new Map<string, Occurrence[]>();
  for (const { key, at } of items) groups.set(key, [...(groups.get(key) ?? []), at]);
  for (const [key, found] of groups) if (found.length < 2) groups.delete(key);
  return groups;
}

function idRules(ctx: Ctx): Diagnostic[] {
  const { doc } = ctx;
  const found: { key: string; at: Occurrence }[] = [];
  if (typeof doc.id === "string") found.push({ key: doc.id, at: { path: "/id", entity: doc } });
  const collections: [string, unknown][] = [
    ["actors", doc.actors], ["boards", doc.boards], ["components", doc.components], ["nets", doc.nets],
    ["views", doc.views], ["sources", doc.sources], ["assets", doc.assets], ["parameters", doc.parameters],
    ["simulation/runtimes", doc.simulation?.runtimes], ["simulation/faults", doc.simulation?.faults],
    ["simulation/instruments", doc.simulation?.instruments],
    ["mechanical/frames", doc.mechanical?.frames], ["mechanical/bodies", doc.mechanical?.bodies],
    ["mechanical/joints", doc.mechanical?.joints], ["mechanical/mounts", doc.mechanical?.mounts],
  ];
  each<View>(doc.views, (view, vi) => {
    collections.push([`views/${vi}/wires`, view.wires]);
    collections.push([`views/${vi}/junctions`, view.junctions]);
  });
  for (const [path, items] of collections) {
    each<{ id: unknown }>(items, (item, i) => {
      if (typeof item.id === "string") found.push({ key: item.id, at: { path: `/${path}/${i}/id`, entity: item } });
    });
  }
  const out: Diagnostic[] = [];
  for (const [id, at] of collide(found)) {
    for (const one of at) {
      if (ctx.scoped(one.entity)) out.push(diag("V3-ID-DUP", "error", one.path, `The id ${id} is used ${at.length} times`));
    }
  }
  return out;
}

function actorRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const actors = new Set<string>();
  each<{ id: string }>(ctx.doc.actors, (a) => actors.add(a.id));
  const check = (actor: unknown, path: string, what: string, owner: unknown) => {
    if (ctx.scoped(owner) && !actors.has(actor as string)) {
      out.push(diag("V3-ACTOR", "error", path, `${what} ${String(actor)} is not in actors`));
    }
  };
  const { access, provenance, history } = ctx.doc;
  if (isRecord(access)) {
    (Array.isArray(access.owners) ? access.owners : []).forEach((o, i) => check(o, `/access/owners/${i}`, "The owner", access));
    each<{ actor: string }>(access.grants, (g, i) => check(g.actor, `/access/grants/${i}/actor`, "The grant to", access));
  }
  if (isRecord(provenance)) {
    check(provenance.createdBy, "/provenance/createdBy", "The creator", provenance);
    each<{ actor: string }>(provenance.contributors, (c, i) => check(c.actor, `/provenance/contributors/${i}/actor`, "The contributor", provenance));
  }
  each<{ author: string }>(history?.checkpoints, (cp, i) => check(cp.author, `/history/checkpoints/${i}/author`, "The checkpoint author", cp));
  return out;
}

function instanceRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const refdes: { key: string; at: Occurrence }[] = [];
  for (const group of [ctx.doc.boards, ctx.doc.components]) {
    each<Board | Component>(group, (e) => {
      const inst = ctx.instances.get(e.id);
      if (typeof e.refdes === "string" && inst?.entity === e) refdes.push({ key: e.refdes, at: { path: `${inst.path}/refdes`, entity: e } });
    });
  }
  for (const [name, at] of collide(refdes)) {
    for (const one of at) if (ctx.scoped(one.entity)) out.push(diag("V3-REFDES", "error", one.path, `The refdes ${name} is used ${at.length} times`));
  }

  const deps: { key: string; at: Occurrence }[] = [];
  each<ComponentDependency>(ctx.doc.dependencies?.components, (dep, i) => {
    if (isRecord(dep.interface)) deps.push({ key: defKey(dep), at: { path: `/dependencies/components/${i}`, entity: dep } });
  });
  for (const [name, at] of collide(deps)) {
    for (const one of at) if (ctx.scoped(one.entity)) out.push(diag("V3-DEP-DUP", "error", one.path, `${name} is listed ${at.length} times`));
  }
  return out;
}

function netRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const pins: { key: string; at: Occurrence }[] = [];
  const names: { key: string; at: Occurrence }[] = [];
  each<Net>(ctx.doc.nets, (net, i) => {
    if (typeof net.name === "string") names.push({ key: net.name, at: { path: `/nets/${i}/name`, entity: net } });
    each<{ c: string; p: string }>(net.connections, (m, j) => {
      const at = `/nets/${i}/connections/${j}`;
      if (ctx.scoped(net) && !ctx.pinOk(m.c, m.p)) {
        out.push(diag("V3-PIN", "error", at, `${net.id}: ${String(m.c)}.${String(m.p)} does not exist`));
      }
      pins.push({ key: pinKey(m.c, m.p), at: { path: at, entity: net } });
    });
  });
  for (const [name, at] of collide(names)) {
    for (const one of at) if (ctx.scoped(one.entity)) out.push(diag("V3-NET-NAME", "error", one.path, `The net name ${name} is used ${at.length} times`));
  }
  for (const [key, at] of collide(pins)) {
    for (const one of at) {
      if (ctx.scoped(one.entity)) out.push(diag("V3-PIN-TWICE", "error", one.path, `The pin ${key.replace("/", ".")} is in ${at.length} connections`, "A pin belongs to one net"));
    }
  }
  return out;
}

/** Per breadboard view: legs and wire ends in holes, grouped by the strip of the surface that carries them. */
function stripRules(ctx: Ctx, view: View, base: string): Diagnostic[] {
  const surface = ctx.surfaceOf(view);
  if (!surface) return [];
  const strips = new Map<string, Map<string, string | null>>();
  const touch = (hole: unknown, who: string, net: string | null) => {
    const strip = surface.strips.get(hole as string);
    if (strip === undefined) return;
    const members = strips.get(strip) ?? new Map<string, string | null>();
    members.set(who, net);
    strips.set(strip, members);
  };
  each<{ c: string; legs?: unknown }>(view.placements, (pl) => {
    for (const [leg, hole] of Object.entries(isRecord(pl.legs) ? pl.legs : {})) {
      touch(hole, `${pl.c}.${leg}`, ctx.pinNet.get(pinKey(pl.c, leg)) ?? null);
    }
  });
  each<Wire>(view.wires, (wire) => {
    for (const end of [wire.from, wire.to]) {
      if (isRecord(end) && end.kind === "hole" && end.surface === view.surface) touch(end.hole, wire.id, wire.net);
    }
  });

  const out: Diagnostic[] = [];
  for (const [strip, members] of strips) {
    const nets = new Set([...members.values()].filter((n) => n !== null));
    if (nets.size > 1) {
      out.push(diag("V3-STRIP-SHORT", "error", base, `Strip ${strip} joins ${[...nets].join(" and ")}`, "A strip carries one net"));
      continue;
    }
    const bare = [...members].filter(([, net]) => net === null).map(([who]) => who);
    if (bare.length > 0 && members.size > 1) {
      out.push(diag("V3-STRIP-IMPLIED", "warning", base, `Strip ${strip} shares ${bare.join(", ")} with other legs, but no net joins them`));
    }
  }
  return out;
}

function viewRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  each<View>(ctx.doc.views, (view, vi) => {
    const base = `/views/${vi}`;
    if (ctx.scoped(view)) {
      if (view.surface !== undefined && view.kind !== "breadboard") {
        out.push(diag("V3-VIEW-BOARD", "error", `${base}/surface`, "Only a breadboard view has a surface"));
      }
      if (view.kind === "board") {
        const placements = Array.isArray(view.placements) ? view.placements : [];
        const only = placements[0] as { c?: string } | undefined;
        if (placements.length !== 1) {
          out.push(diag("V3-VIEW-BOARD", "error", `${base}/placements`, `A board view places one board, not ${placements.length}`));
        } else if (!isRecord(only) || !ctx.instances.get(only.c as string)?.path.startsWith("/boards/")) {
          out.push(diag("V3-VIEW-BOARD", "error", `${base}/placements/0`, "A board view places a board"));
        }
        if (Array.isArray(view.wires) && view.wires.length > 0) out.push(diag("V3-VIEW-BOARD", "error", `${base}/wires`, "A board view has no wires"));
        if (Array.isArray(view.junctions) && view.junctions.length > 0) out.push(diag("V3-VIEW-BOARD", "error", `${base}/junctions`, "A board view has no junctions"));
      }
    }

    const members = new Set<string>();
    for (const key of ["placements", "wires", "junctions", "labels"] as const) {
      each<{ c?: string; id?: string }>(view[key], (item) => members.add((key === "placements" ? item.c : item.id) as string));
    }
    const groupOf = new Map<string, number>();
    each<{ members: unknown }>(view.groups, (group) => {
      new Set(Array.isArray(group.members) ? group.members : []).forEach((m) => groupOf.set(m as string, (groupOf.get(m as string) ?? 0) + 1));
    });
    each<{ id: string; members: unknown }>(view.groups, (group, gi) => {
      if (!ctx.scoped(group)) return;
      const at = `${base}/groups/${gi}`;
      const list: unknown[] = Array.isArray(group.members) ? group.members : [];
      if (new Set(list).size < 2) out.push(diag("V3-GROUP", "error", `${at}/members`, `${group.id} has fewer than two members`));
      list.forEach((m, k) => {
        if (!members.has(m as string)) out.push(diag("V3-GROUP", "error", `${at}/members/${k}`, `${group.id}: ${String(m)} is not in this view`));
        else if (groupOf.get(m as string)! > 1) out.push(diag("V3-GROUP", "error", `${at}/members/${k}`, `${String(m)} is in more than one group`));
      });
    });

    const holes: { key: string; at: Occurrence }[] = [];
    each<{ c: string; legs?: unknown }>(view.placements, (pl, pi) => {
      for (const [leg, hole] of Object.entries(isRecord(pl.legs) ? pl.legs : {})) {
        if (typeof hole === "string") holes.push({ key: hole, at: { path: `${base}/placements/${pi}/legs/${leg}`, entity: pl } });
      }
    });
    for (const [hole, at] of collide(holes)) {
      for (const one of at) if (ctx.scoped(one.entity)) out.push(diag("V3-HOLE-TWICE", "error", one.path, `The hole ${hole} holds ${at.length} legs`));
    }

    const junctions = new Map<string, { net: string }>();
    each<{ id: string; net: string }>(view.junctions, (j) => junctions.set(j.id, j));
    each<Wire>(view.wires, (wire, wi) => {
      if (!ctx.scoped(wire)) return;
      const at = `${base}/wires/${wi}`;
      if (!ctx.nets.has(wire.net)) out.push(diag("V3-WIRE-NET", "error", at, `${wire.id}: the net ${String(wire.net)} is not in the document`));
      for (const end of ["from", "to"] as const) {
        const e = wire[end];
        if (!isRecord(e) || e.kind !== "junction") continue;
        const junction = junctions.get(e.id);
        if (!junction || junction.net !== wire.net) {
          out.push(diag("V3-WIRE-JCT", "error", `${at}/${end}`, `${wire.id}: the junction ${String(e.id)} is missing or on another net`));
        }
      }
    });

    if (view.kind === "breadboard" && ctx.scoped(view)) out.push(...stripRules(ctx, view, base));
  });
  return out;
}

/** Rules that compare entities with each other. */
export const CROSS_RULES: readonly ((ctx: Ctx) => Diagnostic[])[] = [idRules, actorRules, instanceRules, netRules, viewRules];

/** V3-HIST-SEQ, V3-HIST-HEAD, V3-HIST-CP: the retained ops run on from the base revision to the head. Whole documents only. */
export function historyRules(ctx: Ctx): Diagnostic[] {
  const { history, revision } = ctx.doc;
  if (!isRecord(history) || typeof history.baseRevision !== "number") return [];
  const out: Diagnostic[] = [];
  let last = history.baseRevision;
  each<{ seq: number }>(history.ops, (envelope, i) => {
    if (envelope.seq !== last + 1) {
      out.push(diag("V3-HIST-SEQ", "error", `/history/ops/${i}/seq`, `Expected ${last + 1}, found ${String(envelope.seq)}`));
    }
    last = envelope.seq;
  });
  if (last !== revision) out.push(diag("V3-HIST-HEAD", "error", "/history", `The history ends at ${last} but the revision is ${String(revision)}`));
  each<{ revision: number }>(history.checkpoints, (cp, i) => {
    if (cp.revision > revision) out.push(diag("V3-HIST-CP", "error", `/history/checkpoints/${i}`, `The checkpoint at ${cp.revision} is ahead of revision ${revision}`));
  });
  return out;
}
