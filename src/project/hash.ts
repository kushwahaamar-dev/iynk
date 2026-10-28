import { canonicalize, utf8Length } from "../core/canonical.ts";
import { sha256Hex } from "../core/sha256.ts";
import type { Checkpoint, OpEnvelope, Project } from "./generated/types.ts";
import { normalizeForWrite, toCanonicalText } from "./normalize.ts";

/** PDM 6.4: the parts of a document that say where it is in its history, not what it holds. */
function stripVolatile(doc: Project): Record<string, unknown> {
  const content: Record<string, unknown> = { ...doc, meta: { ...doc.meta } };
  delete content.history;
  delete content.exports;
  delete content.revision;
  delete (content.meta as Record<string, unknown>).updatedAt;
  return content;
}

/** Lower-case hex SHA-256 of the canonical content: equal for equal content, whatever the set order or `revision`. */
export function stateHash(doc: Project): string {
  return sha256Hex(canonicalize(stripVolatile(normalizeForWrite(doc))));
}

/** UTF-8 length of the whole canonical document, which is what V4-SIZE counts. */
export function canonicalBytes(doc: Project): number {
  return utf8Length(toCanonicalText(doc));
}

/** `chain_0` of a project (PDM 6.4). */
export function chainStart(projectId: string): string {
  return sha256Hex("iynk.chain.v1:" + projectId);
}

/** `chain_n = sha256(chain_(n-1) + canonical(envelope_n))`. */
export function chainNext(prev: string, envelope: OpEnvelope): string {
  return sha256Hex(prev + canonicalize(envelope));
}

/** The chain value after `ops`, starting from `baseChain`. */
export function foldChain(baseChain: string, ops: readonly OpEnvelope[]): string {
  return ops.reduce(chainNext, baseChain);
}

/** The history entry for the document as it stands. `store` is where the snapshot bytes will live. */
export function checkpointOf(
  doc: Project,
  kind: Checkpoint["kind"],
  label: string | undefined,
  author: string,
  at: string,
  store: Checkpoint["store"] = "local-db",
): Checkpoint {
  const checkpoint: Checkpoint = { revision: doc.revision, kind, at, author, stateHash: stateHash(doc), store };
  if (label !== undefined) checkpoint.label = label;
  return checkpoint;
}
