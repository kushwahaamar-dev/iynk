import type { GuideDeps, GuideInput } from './engine.ts';
import { substanceHash } from './substance.ts';

export const EDIT_OP_PREFIXES = ['source.', 'component.', 'net.', 'wire.', 'param.'] as const;

/**
 * True once the learner has changed the project's substance themselves. The record's stamp latches an earlier
 * result, because history compaction can drop the ops. Otherwise both the hash and the ops must agree: the hash
 * rejects undone and comment-only edits, the ops reject remote actors, restores and imports.
 */
export function isEdited(i: GuideInput, d: GuideDeps): boolean {
  if (i.record?.editedAt !== undefined) return true;
  const starter = i.plan.starterSubstanceHash;
  if (starter === undefined) return false;
  const { ops, startRevision, localActor } = i.history;
  const ownEdit = ops.some(
    (o) => o.revision > startRevision && o.actor === localActor && EDIT_OP_PREFIXES.some((p) => o.kind.startsWith(p)),
  );
  return ownEdit && substanceHash(i.project, d) !== starter;
}
