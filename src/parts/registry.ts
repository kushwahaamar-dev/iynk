import { canonicalize, utf8Length } from "../core/canonical.ts";
import type { Diagnostic, Result } from "../core/result.ts";
import { diag, fail, ok } from "../core/result.ts";
import { digestOf, validateDescriptor, versionCompare } from "./descriptor.ts";
import type { Descriptor, DescriptorOptions } from "./descriptor.ts";

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
}

interface Entry {
  descriptor: Descriptor;
  summary: PartSummary;
}

const keyOf = (ref: string, version: string): string => `${ref}@${version}`;

/** An in-memory store of validated descriptors, keyed by `id@version`. */
export function createRegistry(): PartRegistry {
  const entries = new Map<string, Entry>();
  const versionsOf = new Map<string, string[]>();
  const legacy = new Map<string, string>();

  const sortedVersions = (ref: string): string[] => versionsOf.get(ref) ?? [];

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
  };
}
