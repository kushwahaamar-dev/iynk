import type { Library } from "../local/library.ts";
import { forkProject } from "../project/fork.ts";
import type { Project } from "../project/generated/types.ts";
import type { Actor } from "../protocol/index.ts";

export type ForkOrigin = { project: string; revision: number; stateHash: string };

/** The room and its chain are not stored in the file; the server keeps them in the room record. */
export function forkDocument(doc: Project, origin: ForkOrigin, newId: string, me: Actor, now = doc.meta.updatedAt): Project {
  return forkProject(doc, { id: newId, now, actor: me, origin });
}

export function keepCopy(lib: Library, doc: Project, origin: ForkOrigin): Promise<string> {
  return lib.forkDocument(doc, { origin });
}

/** The creator's library keeps the project id; everyone else gets a new project, so two copies never share an id. */
export function planOnClose(isCreator: boolean): { keepId: boolean } {
  return { keepId: isCreator };
}

/** `ff` when the local copy sits on the room's chain, `separate` when a copy under the same id has diverged. */
export function reconcileLocalCopy(
  local: { rev: number; chain: string } | null,
  roomChainAt: (rev: number) => string | null,
): "ff" | "separate" | "none" {
  if (!local) return "none";
  return roomChainAt(local.rev) === local.chain ? "ff" : "separate";
}
