import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { DbError, openDb } from "./db";
import { createProjectHandler } from "./project-handler";
import { createIdbRepository } from "./idb-repository";
import { createMemoryRepository } from "./memory-repository";
import { createShadow } from "./shadow";

async function openRepository() {
  try {
    return { repo: createIdbRepository(await openDb()), degraded: false };
  } catch (cause) {
    if (!(cause instanceof DbError) || cause.kind !== "unavailable") throw cause;
    return { repo: createMemoryRepository(), degraded: true };
  }
}

void openRepository().then(({ repo, degraded }) => {
  serveWorker(self as unknown as WorkerScopeLike, createProjectHandler({ repo, shadowFactory: createShadow, clock: Date.now, degraded }));
});
