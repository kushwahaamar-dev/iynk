import { canonicalize, utf8Length } from "../core/canonical.ts";
import type { Diagnostic, Result } from "../core/result.ts";
import { diag, fail, ok } from "../core/result.ts";
import { ORIGIN_OF_TRUST, digestOf, validateDescriptor, versionCompare } from "./descriptor.ts";
import type { Descriptor, DescriptorOptions, DescriptorOrigin } from "./descriptor.ts";

export interface PartSummary {
  ref: string;
  version: string;
  name: string;
  category: string;
  tier: string;
  status: string;
  bytes: number;
  digest: string;
}

export interface PartRegistry {
  /** Validates and stores a descriptor. The same id and version with other bytes is refused (`P-DUP-BYTES`). */
  add(value: unknown, opts?: DescriptorOptions): Result<Descriptor, Diagnostic[]>;
  get(ref: string, version: string): Descriptor | undefined;
  /** The newest version of a part. For palettes only: a document always pins a version. */
  latest(ref: string): Descriptor | undefined;
  /** Every stored version of a part, oldest first. */
  versions(ref: string): string[];
  list(): readonly PartSummary[];
  /** The part ref an old figure id (`identity.legacy_ids`) stands for. */
  resolveLegacy(legacyId: string): string | undefined;
  has(ref: string, version: string): boolean;
  /** Drops one version. Returns false when it was not stored. */
  remove(ref: string, version: string): boolean;
  /** Where a stored version came from. */
  originOf(ref: string, version: string): DescriptorOrigin | undefined;
  /** Drops every version that came from the given origin and returns how many went. Core parts are never removed this way. */
  removeByOrigin(origin: Exclude<DescriptorOrigin, "core">): number;
  /** Calls `fn` after every add that stored something and every removal. Returns the unsubscribe function. */
  onChange(fn: () => void): () => void;
}

interface Entry {
  descriptor: Descriptor;
  summary: PartSummary;
  origin: DescriptorOrigin;
}

const keyOf = (ref: string, version: string): string => `${ref}@${version}`;

/** An in-memory store of validated descriptors, keyed by `id@version`. */
export function createRegistry(): PartRegistry {
  const entries = new Map<string, Entry>();
  const versionsOf = new Map<string, string[]>();
  const legacy = new Map<string, string>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const fn of [...listeners]) fn();
  };

  const sortedVersions = (ref: string): string[] => versionsOf.get(ref) ?? [];

  const drop = (ref: string, version: string): boolean => {
    if (!entries.delete(keyOf(ref, version))) return false;
    const left = sortedVersions(ref).filter((v) => v !== version);
    if (left.length > 0) versionsOf.set(ref, left);
    else versionsOf.delete(ref);
    legacy.clear();
    for (const { descriptor } of entries.values()) {
      for (const id of descriptor.identity.legacy_ids ?? []) {
        if (!legacy.has(id)) legacy.set(id, descriptor.id);
      }
    }
    return true;
  };

  return {
    add(value, opts = {}) {
      const check = validateDescriptor(value, opts);
      if (!check.ok) return fail(check.diagnostics);
      const descriptor = value as Descriptor;
      const digest = digestOf(descriptor);
      const key = keyOf(descriptor.id, descriptor.version);
      const existing = entries.get(key);
      if (existing) {
        if (existing.summary.digest === digest) return ok(existing.descriptor);
        return fail([diag("P-DUP-BYTES", "error", "/version", `${key} is already installed with different contents`)]);
      }

      const sim = descriptor.simulation;
      entries.set(key, {
        descriptor,
        origin: opts.ctx ? ORIGIN_OF_TRUST[opts.ctx.trust] : (opts.origin ?? descriptor.provenance.origin),
        summary: {
          ref: descriptor.id,
          version: descriptor.version,
          name: `${descriptor.identity.manufacturer} ${descriptor.identity.model}`,
          category: descriptor.identity.category,
          tier: sim.tier,
          status: sim.status,
          bytes: opts.bytes ?? utf8Length(canonicalize(descriptor)),
          digest,
        },
      });
      const versions = [...sortedVersions(descriptor.id), descriptor.version].sort(versionCompare);
      versionsOf.set(descriptor.id, versions);
      for (const id of descriptor.identity.legacy_ids ?? []) {
        if (!legacy.has(id)) legacy.set(id, descriptor.id);
      }
      notify();
      return ok(descriptor);
    },
    get: (ref, version) => entries.get(keyOf(ref, version))?.descriptor,
    latest(ref) {
      const newest = sortedVersions(ref).at(-1);
      return newest === undefined ? undefined : entries.get(keyOf(ref, newest))?.descriptor;
    },
    versions: (ref) => [...sortedVersions(ref)],
    list: () => [...entries.values()].map((e) => e.summary),
    resolveLegacy: (legacyId) => legacy.get(legacyId),
    has: (ref, version) => entries.has(keyOf(ref, version)),
    remove(ref, version) {
      const dropped = drop(ref, version);
      if (dropped) notify();
      return dropped;
    },
    originOf: (ref, version) => entries.get(keyOf(ref, version))?.origin,
    removeByOrigin(origin) {
      const doomed = [...entries.values()].filter((e) => e.origin === origin);
      for (const { descriptor } of doomed) drop(descriptor.id, descriptor.version);
      if (doomed.length > 0) notify();
      return doomed.length;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/** The newest version of the part an old figure id stands for. */
export function descriptorForLegacy(reg: PartRegistry, legacyId: string): Descriptor | undefined {
  const ref = reg.resolveLegacy(legacyId);
  return ref === undefined ? undefined : reg.latest(ref);
}
