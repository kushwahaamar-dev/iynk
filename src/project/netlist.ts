import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { PinRef, Project } from "./generated/types.ts";
import type { InterfaceSnapshot } from "./holes.ts";

export interface NetlistNode {
  id: string;
  nets: string[];
  names: string[];
  pins: PinRef[];
}

export interface Netlist {
  version: 1;
  nodes: NetlistNode[];
  pinNode: Record<string, string>;
  diagnostics: Diagnostic[];
}

const JOINING_GROUPS = new Set(["internal-short", "plane"]);

const pinKey = (c: string, p: string): string => `${c}/${p}`;
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const byPin = (a: PinRef, b: PinRef): number => byText(a.c, b.c) || byText(a.p, b.p);

class UnionFind {
  private parent = new Map<string, string>();
  private size = new Map<string, number>();

  find(key: string): string {
    let root = this.parent.get(key);
    if (root === undefined) {
      this.parent.set(key, key);
      this.size.set(key, 1);
      return key;
    }
    let walk = key;
    while (root !== walk) {
      walk = root;
      root = this.parent.get(walk)!;
    }
    for (let k = key; k !== root; ) {
      const next = this.parent.get(k)!;
      this.parent.set(k, root);
      k = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return;
    if (this.size.get(ra)! < this.size.get(rb)!) [ra, rb] = [rb, ra];
    this.parent.set(rb, ra);
    this.size.set(ra, this.size.get(ra)! + this.size.get(rb)!);
  }

  keys(): IterableIterator<string> {
    return this.parent.keys();
  }
}

/**
 * The electrical nodes of a document: the pins of each net, joined by the `internal-short` and `plane` groups of the
 * parts they sit on. It reads `nets`, `boards`, `components` and `dependencies` only, never `views`, so moving a part
 * or re-routing a wire cannot change it. It does not validate: a dangling pin is simply a member of its node.
 */
export function netlist(doc: Project): Netlist {
  const { nets, boards, components, dependencies } = doc;
  const diagnostics: Diagnostic[] = [];
  const sets = new UnionFind();

  nets.forEach((net, i) => {
    const first = pinKey(net.connections[0]!.c, net.connections[0]!.p);
    const distinct = new Set<string>();
    for (const { c, p } of net.connections) {
      const key = pinKey(c, p);
      distinct.add(key);
      sets.union(first, key);
    }
    if (distinct.size < 2) {
      diagnostics.push(diag("NL-SINGLE-PIN", "warning", `/nets/${i}`, `Net ${net.id} has only one pin.`));
    }
  });

  const interfaces = new Map<string, InterfaceSnapshot>();
  for (const dep of dependencies.components) interfaces.set(`${dep.ref}@${dep.version}`, dep.interface);
  const instances = [
    ...boards.map((b, i) => ({ id: b.id, def: b.definition, path: `/boards/${i}` })),
    ...components.map((c, i) => ({ id: c.id, def: c.definition, path: `/components/${i}` })),
  ];
  for (const inst of instances) {
    const iface = interfaces.get(`${inst.def.ref}@${inst.def.version}`);
    if (!iface) {
      diagnostics.push(
        diag("NL-UNKNOWN-DEF", "warning", inst.path, `${inst.id} uses ${inst.def.ref}@${inst.def.version}, which is not in dependencies.`),
      );
      continue;
    }
    for (const group of iface.groups ?? []) {
      if (!JOINING_GROUPS.has(group.kind)) continue;
      const first = pinKey(inst.id, group.pins[0]);
      for (const p of group.pins) sets.union(first, pinKey(inst.id, p));
    }
  }

  const members = new Map<string, PinRef[]>();
  for (const key of sets.keys()) {
    const slash = key.indexOf("/");
    const root = sets.find(key);
    const pin = { c: key.slice(0, slash), p: key.slice(slash + 1) };
    const list = members.get(root);
    if (list) list.push(pin);
    else members.set(root, [pin]);
  }

  const netsOfRoot = new Map<string, number[]>();
  nets.forEach((net, i) => {
    const root = sets.find(pinKey(net.connections[0]!.c, net.connections[0]!.p));
    const list = netsOfRoot.get(root);
    if (list) list.push(i);
    else netsOfRoot.set(root, [i]);
  });

  const nodes: NetlistNode[] = [];
  for (const [root, indexes] of netsOfRoot) {
    const pins = members.get(root)!.sort(byPin);
    const keys = pins.map((pin) => pinKey(pin.c, pin.p));
    const ids = indexes.map((i) => nets[i]!.id).sort(byText);
    const names = indexes.flatMap((i) => nets[i]!.name ?? []).sort(byText);
    nodes.push({ id: `n:${keys.reduce((a, b) => (b < a ? b : a))}`, nets: ids, names, pins });
    if (indexes.length > 1) {
      diagnostics.push(
        diag("NL-JOINED-NETS", "warning", `/nets/${indexes[0]}`, `Nets ${ids.join(", ")} are one electrical node.`),
      );
    }
  }
  nodes.sort((a, b) => byText(a.id, b.id));

  const pinNode: Record<string, string> = {};
  for (const node of nodes) for (const pin of node.pins) pinNode[pinKey(pin.c, pin.p)] = node.id;
  return { version: 1, nodes, pinNode, diagnostics };
}

/** The node a pin belongs to, or undefined when no document net reaches it. */
export function nodeOfPin(nl: Netlist, c: string, p: string): NetlistNode | undefined {
  const id = nl.pinNode[pinKey(c, p)];
  return id === undefined ? undefined : nl.nodes.find((node) => node.id === id);
}

/** Each node as a sorted list of `c/p` keys, the lists sorted: the shape of the figure's union-find classes. */
export function pinSets(nl: Netlist): string[][] {
  return nl.nodes.map((node) => node.pins.map((pin) => pinKey(pin.c, pin.p))).sort((a, b) => byText(a[0]!, b[0]!));
}

/** A canonical text of the nodes, one line each, for equality tests. */
export function netlistText(nl: Netlist): string {
  return nl.nodes
    .map((n) => `${n.id}\t${n.nets.join(",")}\t${n.names.join(",")}\t${n.pins.map((pin) => pinKey(pin.c, pin.p)).join(",")}`)
    .join("\n");
}
