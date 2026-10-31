import { sha256Hex } from "../../core/sha256.ts";
import type { PackItem, PackPlan } from "../../export/pack.ts";
import type { Op } from "../../project/generated/types.ts";
import type { PartConflict, PartRecord, PartsRepository } from "../../local/parts-store.ts";
import { buildDependency } from "../versions.ts";

export interface CommitChoice {
  mode: "library" | "project";
  /** Part keys, `id@version`. */
  ids: readonly string[];
}

export type PackCommitResult =
  | { ok: true; added: string[]; same: string[]; ops: Op[] }
  | { ok: false; conflicts: PartConflict[] };

const keyOf = (item: PackItem): string => `${item.id}@${item.version}`;

function recordOf(item: PackItem, plan: Extract<PackPlan, { ok: true }>): PartRecord {
  return {
    key: keyOf(item),
    id: item.id,
    version: item.version,
    descriptor: item.descriptor,
    digest: item.digest,
    trust: "imported",
    addedAt: new Date().toISOString(),
    files: Object.fromEntries([...item.files].map(([path, data]) => [path, sha256Hex(data)])),
    source: { sender: plan.sender, packSha256: plan.packSha256 },
  };
}

/**
 * Writes nothing until the whole choice is known to go through. `library` stores the parts as imported data in one
 * all-or-nothing call; `project` returns the ops that embed them and leaves the library alone. A code part is stored
 * as data only: `resolveLayers` gives it no running layer.
 */
export async function commitPack(plan: Extract<PackPlan, { ok: true }>, choice: CommitChoice, repo: PartsRepository): Promise<PackCommitResult> {
  const chosen = plan.items.filter((item) => choice.ids.includes(keyOf(item)));
  if (choice.mode === "project") {
    return { ok: true, added: [], same: [], ops: chosen.map((item): Op => ({ k: "dep.set", dependency: buildDependency(item.descriptor, "embedded") })) };
  }

  const conflicts = chosen.flatMap((item) =>
    item.collision ? [{ key: keyOf(item), installedDigest: item.collision.installedDigest, incomingDigest: item.digest }] : [],
  );
  if (conflicts.length > 0) return { ok: false, conflicts };

  const files = new Map<string, Blob>();
  for (const item of chosen) {
    for (const data of item.files.values()) files.set(sha256Hex(data), new Blob([data as BlobPart]));
  }
  const written = await repo.putMany(chosen.map((item) => recordOf(item, plan)), files);
  if (!written.ok) return written;
  const added: string[] = [];
  const same: string[] = [];
  chosen.forEach((item, i) => (written.results[i] === "added" ? added : same).push(keyOf(item)));
  return { ok: true, added, same, ops: [] };
}
