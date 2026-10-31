import { cryptoRandom, newProjectId } from "@/core/ids";
import { writeIynk } from "@/export/iynk";
import { learnStore } from "@/lib/learn/facade";
import { emptyRecord } from "@/project/guided/record";
import { chainStart, stateHash } from "@/project/hash";
import { LOCAL_ACTOR, openTemplate } from "@/studio/templates";
import { loadTemplate } from "../../../../content/projects";
import { forksOf } from "../guide/lessonProgress";
import type { Services } from "./services";

/** Opens the learner's copy of a template, making it and its learner record on the first visit. */
export async function openTemplateProject(templateId: string, { files, library }: Pick<Services, "files" | "library">): Promise<string> {
  const store = learnStore();
  const { projectId, created } = await openTemplate(templateId, {
    newId: () => newProjectId(Date.now(), cryptoRandom),
    now: () => new Date().toISOString(),
    actor: LOCAL_ACTOR,
    genesis: chainStart,
    stateHash,
    load: loadTemplate,
    library: {
      async create(project) {
        const outcome = await files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
        if (!outcome.ok) throw new Error(outcome.error.message);
        return outcome.id;
      },
    },
    async findFork(id) {
      await store.ready;
      const alive = new Set((await library.list()).map((row) => row.id));
      return forksOf(store.snapshot(), id).find((fork) => alive.has(fork));
    },
  });
  if (created) {
    const at = new Date().toISOString();
    store.update(projectId, (record) => record ?? emptyRecord(projectId, at, templateId), at);
  }
  return projectId;
}
