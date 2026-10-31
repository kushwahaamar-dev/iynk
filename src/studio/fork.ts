import type { Project } from "../project/generated/types.ts";
import type { TemplateKind } from "../project/guided/plan.ts";

export interface ForkDeps {
  newId(): string;
  now(): string;
  /** A `usr_` id matching the pattern of `Checkpoint.author`. */
  actor: string;
  /** `chain_0` of the new project. */
  genesis(id: string): string;
  stateHash(p: Project): string;
}

export const START_LABEL = "Start";

const SOLUTION_KEY = "x-iynk-solution";

/** A template as the learner's own project: new id and owner, revision 0, a fresh history, no hidden solution. The template is not touched. */
export function forkTemplate(template: Project, kind: TemplateKind | "template", deps: ForkDeps): Project {
  const fork = JSON.parse(JSON.stringify(template)) as Project;
  const now = deps.now();
  const origin: Project["provenance"]["origin"] =
    kind === "template"
      ? { kind: "template", template: template.id }
      : { kind: "fork", project: template.id, revision: template.revision, stateHash: deps.stateHash(template) };
  const owner = template.actors.find((a) => a.id === deps.actor) ?? { id: deps.actor, name: "Owner" };

  fork.id = deps.newId();
  fork.revision = 0;
  fork.meta.createdAt = now;
  fork.meta.updatedAt = now;
  fork.history = { baseRevision: 0, baseChain: deps.genesis(fork.id), checkpoints: [], ops: [] };
  fork.provenance = { ...fork.provenance, createdBy: deps.actor, origin };
  fork.actors = [owner];
  fork.access = { ...fork.access, owners: [deps.actor], grants: [] };
  delete fork.exports;
  if (fork.ext) delete (fork.ext as Record<string, unknown>)[SOLUTION_KEY];
  return fork;
}

/** The fork with one named checkpoint at revision 0, so a learner can always go back to how the lesson began. */
export function withStartCheckpoint(forked: Project, deps: ForkDeps): Project {
  const start = {
    revision: 0,
    kind: "named" as const,
    label: START_LABEL,
    at: deps.now(),
    author: deps.actor,
    stateHash: deps.stateHash(forked),
    store: "local-db" as const,
  };
  return { ...forked, history: { ...forked.history, checkpoints: [start] } };
}

/** `prj_<board>-<lesson>`, with `tour` as the lesson of a board tour. */
export function templateIdFor(board: string, lesson: string | "tour"): string {
  return `prj_${board}-${lesson}`;
}
