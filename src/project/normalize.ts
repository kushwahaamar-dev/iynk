import { CanonicalError, canonicalize, prettyPrint } from "../core/canonical.ts";
import type { Project } from "./generated/types.ts";

/**
 * PDM 6.2: every array that is a set, by its dotted key path (array indices are not part of the path), and the
 * keys it sorts by, in order. Numbers compare as numbers, strings by UTF-16 code unit. An empty list sorts the
 * elements themselves. `simulation.world.script` is a sequence whose order is time, so it sorts too, and the
 * sort is stable. The other sequences (`history.*`, `exports`, `route_mm`, the guide) are not listed.
 *
 * Three sets of PDM 6.2 are left out on purpose: `meta.tags`, `boards[].firmware.sources` and
 * `dependencies.libraries`. The five examples store them unsorted, the examples may not change (RC-32), and the
 * hashes and file bytes recorded for them (PDM 9.6) were taken that way. Sort them when the examples are regenerated.
 */
export const SET_SORT_KEYS: Readonly<Record<string, readonly string[]>> = {
  actors: ["id"],
  boards: ["id"],
  components: ["id"],
  nets: ["id"],
  "nets.connections": ["c", "p"],
  views: ["id"],
  "views.placements": ["c"],
  "views.wires": ["id"],
  "views.junctions": ["id"],
  "views.labels": ["id"],
  "views.groups": ["id"],
  "views.groups.members": [],
  sources: ["id"],
  parameters: ["id"],
  assets: ["id"],
  tests: ["id"],
  "tests.checks": ["id"],
  "dependencies.components": ["ref", "version"],
  "mechanical.frames": ["id"],
  "mechanical.bodies": ["id"],
  "mechanical.joints": ["id"],
  "mechanical.mounts": ["id"],
  "simulation.runtimes": ["id"],
  "simulation.faults": ["id"],
  "simulation.instruments": ["id"],
  "simulation.world.inputs": ["id"],
  "simulation.world.script": ["t", "input"],
  "access.grants": ["actor"],
  "provenance.thirdParty": ["id"],
  "provenance.contributors": ["actor"],
};

const TIME_KEYS = new Set(["t", "atMs", "withinMs", "runMs", "duration_ms"]);

/** Keys whose subtree the writer leaves as given: history is hashed by the chain, the rest belongs to its owner. */
const AS_GIVEN = new Set(["history", "exports", "domains", "ext"]);

/** `sources[].content` is code: line ends become LF and nothing else changes. */
const CODE_TEXT = "sources.content";

/** The factor to round to for a key: 1000 for millimetres and milliseconds, 100 for degrees, none otherwise. */
function quantum(key: string): number | null {
  if (key.endsWith("_mm") || TIME_KEYS.has(key)) return 1000;
  if (key.endsWith("_deg")) return 100;
  return null;
}

const compareKeys = (keys: readonly string[]) => (a: unknown, b: unknown) => {
  for (const key of keys) {
    const x = (a as Record<string, string | number>)[key];
    const y = (b as Record<string, string | number>)[key];
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
};

const compareSelf = (a: unknown, b: unknown) => ((a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0);

const pointer = (trail: readonly string[]): string =>
  trail.map((segment) => "/" + segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("");

interface Walk {
  trail: string[];
}

function round(value: number, factor: number | null, w: Walk): number {
  if (!Number.isFinite(value)) throw new CanonicalError("NaN and infinities have no canonical form", pointer(w.trail));
  const rounded = factor === null ? value : Math.round(value * factor) / factor;
  return rounded + 0;
}

function array(value: unknown[], path: string, factor: number | null, w: Walk): unknown[] {
  let changed = false;
  const items = value.map((item, i) => {
    w.trail.push(String(i));
    const next = node(item, path, "", factor, w);
    w.trail.pop();
    if (next !== item) changed = true;
    return next;
  });
  const sortKeys = SET_SORT_KEYS[path];
  if (sortKeys) {
    const compare = sortKeys.length === 0 ? compareSelf : compareKeys(sortKeys);
    const sorted = items.every((item, i) => i === 0 || compare(items[i - 1], item) <= 0);
    if (!sorted) return items.sort(compare);
  }
  return changed ? items : value;
}

function object(value: Record<string, unknown>, path: string, w: Walk): Record<string, unknown> {
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const item = value[key];
    if (item === undefined) {
      changed = true;
      continue;
    }
    if (AS_GIVEN.has(key)) {
      out[key] = item;
      continue;
    }
    w.trail.push(key);
    const next = node(item, path, key, quantum(key), w);
    w.trail.pop();
    if (next !== item) changed = true;
    out[key] = next;
  }
  return changed ? out : value;
}

function node(value: unknown, parent: string, key: string, factor: number | null, w: Walk): unknown {
  const path = key === "" ? parent : parent === "" ? key : parent + "." + key;
  switch (typeof value) {
    case "number":
      return round(value, factor, w);
    case "string":
      return path === CODE_TEXT ? value.replace(/\r\n?/g, "\n") : value.normalize("NFC");
    case "object":
      if (value === null) return value;
      return Array.isArray(value)
        ? array(value, path, factor, w)
        : object(value as Record<string, unknown>, path, w);
    default:
      return value;
  }
}

/**
 * The form a writer stores (PDM 6.2, 6.3): sets sorted, strings in NFC, source code with LF line ends, lengths,
 * angles and authored time rounded, `-0` as `0`, `undefined` fields dropped. `history`, `exports`, `domains` and
 * `ext` are kept as given. Pure and idempotent; a sub-object that needs no change keeps its reference.
 * Throws `CanonicalError` for NaN or an infinity.
 */
export function normalizeForWrite(doc: Project): Project {
  return node(doc, "", "", null, { trail: [] }) as Project;
}

/** Canonical (RFC 8785) text of the normalised document: what V4-SIZE counts and what is hashed. */
export function toCanonicalText(doc: Project): string {
  return canonicalize(normalizeForWrite(doc));
}

/** The `.iynk` body: the same value in pretty form, LF line ends, one trailing newline. */
export function toFileText(doc: Project): string {
  return prettyPrint(normalizeForWrite(doc));
}
