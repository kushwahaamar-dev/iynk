import { canonicalize } from "../core/canonical.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { ComponentDependency, Project } from "../project/generated/types.ts";
import { digestOf } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { placeholderSpec } from "./fallback.ts";
import type { FallbackSpec } from "./fallback.ts";
import { interfaceOf } from "./pins.ts";
import type { InterfaceSnapshot } from "./pins.ts";
import type { PartRegistry } from "./registry.ts";

const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);

const pointer = (...segments: (string | number)[]): string =>
  segments.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

function byId<T extends { id: string }>(items: readonly T[] | undefined): Map<string, T> {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

/** Compares two keyed lists of the snapshot and lists a pointer for every id on one side only and for every id whose entries differ. */
function compareKeyed<T extends { id: string }>(
  list: string,
  pinned: readonly T[] | undefined,
  derived: readonly T[] | undefined,
  differs: (a: T, b: T) => string[],
): string[] {
  const left = byId(pinned);
  const right = byId(derived);
  const out: string[] = [];
  for (const [id, a] of left) {
    const b = right.get(id);
    if (b === undefined) out.push(pointer(list, id));
    else out.push(...differs(a, b).map((field) => pointer(list, id, field)));
  }
  for (const id of right.keys()) {
    if (!left.has(id)) out.push(pointer(list, id));
  }
  return out;
}

function differingKeys(a: object, b: object): string[] {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((k) => !same(left[k], right[k]));
}

type SnapshotPin = InterfaceSnapshot["pins"][number];

function pinDifferences(a: SnapshotPin, b: SnapshotPin): string[] {
  const out: string[] = [];
  if (a.type !== b.type) out.push("type");
  if (a.class !== undefined && b.class !== undefined && a.class !== b.class) out.push("class");
  if (a.polarity !== undefined && b.polarity !== undefined && a.polarity !== b.polarity) out.push("polarity");
  if (a.position !== undefined && b.position !== undefined && !same(a.position, b.position)) out.push("position");
  return out;
}

const sameMembers = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

/**
 * The differences between the interface a project pins and the one derived from the descriptor, as JSON Pointers
 * into the snapshot. The legacy `net` and `header` pin fields are ignored: the descriptor does not carry them.
 */
export function compareInterface(pinned: InterfaceSnapshot, derived: InterfaceSnapshot): string[] {
  const out: string[] = [];
  if (pinned.role !== derived.role) out.push("/role");
  out.push(...compareKeyed("pins", pinned.pins, derived.pins, pinDifferences));
  out.push(
    ...compareKeyed("groups", pinned.groups, derived.groups, (a, b) =>
      a.kind === b.kind && sameMembers(a.pins, b.pins) ? [] : ["pins"],
    ),
  );
  out.push(...compareKeyed("params", pinned.params, derived.params, differingKeys));
  return out;
}

/** The dependency with the interface derived from the descriptor again, and the digest too when it had one. */
export function refreshInterface(dep: ComponentDependency, d: Descriptor): ComponentDependency {
  const refreshed: ComponentDependency = { ...dep, interface: interfaceOf(d) };
  if (dep.digest !== undefined) refreshed.digest = digestOf(d);
  return refreshed;
}

/** What to draw for a part the library does not have (R-028): the pinned pins, labelled with the part's ref. */
export function placeholderFor(dep: ComponentDependency): FallbackSpec {
  return placeholderSpec(dep.interface, dep.ref);
}

function checkDependency(dep: ComponentDependency, index: number, reg: PartRegistry | undefined): Diagnostic[] {
  const path = pointer("dependencies", "components", index);
  const out: Diagnostic[] = [];
  if (dep.interface.role === "surface" && dep.interface.pins.length === 0) {
    out.push(
      diag(
        "V6-SURFACE-EMPTY",
        "error",
        `${path}/interface/pins`,
        `${dep.ref} is a wiring surface with no holes, so wires and strips cannot be checked`,
        "pin the full hole list of the surface",
      ),
    );
  }
  if (reg === undefined) return out;

  const descriptor = reg.get(dep.ref, dep.version);
  if (descriptor === undefined) {
    if (dep.origin !== "embedded" || dep.definition === undefined) {
      out.push(
        diag(
          "V6-UNKNOWN-PART",
          "warning",
          path,
          `${dep.ref}@${dep.version} is not in the part library; it is drawn as a placeholder with its pinned pins`,
        ),
      );
    }
    return out;
  }

  const drift = compareInterface(dep.interface, interfaceOf(descriptor));
  if (drift.length > 0) {
    out.push(
      diag(
        "V6-INTERFACE-DRIFT",
        "warning",
        `${path}/interface`,
        `${dep.ref}@${dep.version} no longer matches its pinned interface at ${drift.join(", ")}; the part library is used`,
        "update the part to pin its current interface",
      ),
    );
  }
  if (dep.origin !== "builtin" && dep.digest !== digestOf(descriptor)) {
    out.push(
      diag("V6-DIGEST", "warning", `${path}/digest`, `${dep.ref}@${dep.version} differs from the copy this project was made with`),
    );
  }
  return out;
}

function checkFaults(doc: Project, reg: PartRegistry): Diagnostic[] {
  const components = byId(doc.components);
  const out: Diagnostic[] = [];
  doc.simulation.faults.forEach((fault, i) => {
    const injectable = fault.injectable;
    if (injectable === undefined) return;
    const instance = components.get(injectable.component);
    const descriptor = instance && reg.get(instance.definition.ref, instance.definition.version);
    if (instance !== undefined && descriptor === undefined) return;
    const found = descriptor?.injectable_faults?.some((f) => f.id === injectable.id) ?? false;
    if (!found) {
      out.push(
        diag(
          "V6-FAULT-DRIFT",
          "warning",
          pointer("simulation", "faults", i, "injectable"),
          `${injectable.component} has no injectable fault ${injectable.id} in the part library`,
        ),
      );
    }
  });
  return out;
}

/**
 * Validation pass V6: the pinned part interfaces against the part library. A missing part is a warning, never an error,
 * so a project that uses a part you do not have still opens. Without a registry only the checks that need none run.
 */
export function checkLibrary(doc: Project, reg?: PartRegistry): Diagnostic[] {
  const out = doc.dependencies.components.flatMap((dep, i) => checkDependency(dep, i, reg));
  if (reg !== undefined) out.push(...checkFaults(doc, reg));
  return out;
}
