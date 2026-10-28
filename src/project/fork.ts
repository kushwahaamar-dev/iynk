import type { Project } from "./generated/types.ts";
import { stateHash } from "./hash.ts";

export interface ForkOptions {
  id: string;
  now: string;
  actor: string;
  title?: string;
}

/** A new project from any document: new id and owner, revision 0, an empty history, and the source named in `provenance.origin`. The source is not touched. */
export function forkProject(src: Project, o: ForkOptions): Project {
  const sourceHash = stateHash(src);
  const fork = JSON.parse(JSON.stringify(src)) as Project;
  delete fork.exports;
  fork.id = o.id;
  fork.revision = 0;
  fork.meta.createdAt = o.now;
  fork.meta.updatedAt = o.now;
  if (o.title !== undefined) fork.meta.title = o.title;
  if (!fork.actors.some((a) => a.id === o.actor)) fork.actors.push({ id: o.actor, name: "Owner" });
  fork.access = { ...fork.access, owners: [o.actor], grants: [] };
  fork.history = { baseRevision: 0, baseChain: sourceHash, checkpoints: [], ops: [] };
  fork.provenance = {
    ...fork.provenance,
    createdBy: o.actor,
    origin: { kind: "fork", project: src.id, revision: src.revision, stateHash: sourceHash },
  };
  return fork;
}
