import type { WorkerHandler } from "@/protocol";
import type { Clock } from "@/core/ids";
import { canonicalBytes } from "@/project/hash";
import { limitDiagnostics } from "@/project/limits";
import { validateValue } from "@/project/validate";
import type { CommitResult, LoadResult, OpenResult, ProjectEv, ProjectReq, SaveOutcome } from "./project-protocol";
import type { IndexRow, RecordLoad, Repository } from "./repository";
import type { createShadow, Shadow } from "./shadow";

export interface ProjectHandlerDeps {
  repo: Repository;
  shadowFactory: typeof createShadow;
  clock: Clock;
  /** Set when the repository is the memory fallback; the first request then reports `degraded`. */
  degraded?: boolean;
}

interface SavedMark {
  revision: number;
  hash: string;
  writtenAt: number;
}

export function createProjectHandler(deps: ProjectHandlerDeps): WorkerHandler<ProjectReq, ProjectEv> {
  const { repo, shadowFactory, clock } = deps;
  let shadow: Shadow | null = null;
  let saved: SavedMark | null = null;
  let announcedRecovery: string | null = null;
  let degradedPending = deps.degraded === true;
  let tail: Promise<unknown> = Promise.resolve();

  const stored = (found: RecordLoad) => (found.status === "ok" || found.status === "recovered" ? found.rec : null);

  function announce(found: RecordLoad, projectId: string, emit: (ev: ProjectEv) => void) {
    if (found.status === "recovered") {
      emit({ t: "recovered_from_previous", projectId, revision: found.rec.doc.revision });
    } else if (found.status === "lost") {
      emit({ t: "record_lost", projectId });
    }
  }

  async function load(projectId: string, emit: (ev: ProjectEv) => void): Promise<LoadResult> {
    const found = await repo.load(projectId);
    announce(found, projectId, emit);
    announcedRecovery = projectId;
    const rec = stored(found);
    return rec ? { status: found.status, state: rec.doc, revision: rec.doc.revision, hash: rec.hash } : { status: found.status };
  }

  async function open(req: Extract<ProjectReq, { t: "open" }>, emit: (ev: ProjectEv) => void): Promise<OpenResult> {
    shadow = null;
    saved = null;
    const report = validateValue(req.state);
    if (!report.ok) {
      const first = report.first20[0];
      emit({ t: "save_failed", kind: "validation", detail: first ? `${first.code}: ${first.message}` : "the document is invalid" });
      return { accepted: false };
    }
    const found = await repo.load(req.projectId);
    if (announcedRecovery !== req.projectId) announce(found, req.projectId, emit);
    announcedRecovery = null;
    const rec = stored(found);
    saved = rec ? { revision: rec.doc.revision, hash: rec.hash, writtenAt: rec.writtenAt } : null;
    shadow = shadowFactory(req.projectId, req.state, req.revision);
    return { accepted: true };
  }

  function commit(req: Extract<ProjectReq, { t: "commit" }>, emit: (ev: ProjectEv) => void): CommitResult {
    const folded = shadow?.fold(req.ops, req.fromRevision, req.toRevision);
    if (folded?.ok) return { folded: true };
    emit({ t: "hash_mismatch", revision: shadow?.revision ?? req.fromRevision, workerHash: shadow?.hash() ?? "" });
    shadow = null;
    saved = null;
    return { folded: false };
  }

  async function save(emit: (ev: ProjectEv) => void): Promise<SaveOutcome> {
    if (!shadow) {
      emit({ t: "save_failed", kind: "unavailable", detail: "no project is open" });
      return { written: false };
    }
    const { projectId, doc, revision } = shadow;
    const hash = shadow.hash();
    if (saved && saved.revision === revision && saved.hash === hash) {
      emit({ t: "saved", revision, hash, writtenAt: saved.writtenAt });
      return { written: false };
    }

    const size = canonicalBytes(doc);
    const tooBig = limitDiagnostics(doc, size).find((d) => d.severity === "error");
    if (tooBig) {
      emit({ t: "save_failed", kind: "validation", detail: `${tooBig.code}: ${tooBig.message}` });
      return { written: false };
    }

    const existing = (await repo.list()).find((row) => row.id === projectId);
    const row: IndexRow = {
      name: doc.meta.title,
      updatedAt: doc.meta.updatedAt,
      hash,
      board: doc.boards[0]?.definition.ref ?? "",
      size,
      hasFileCopy: existing?.hasFileCopy ?? false,
      archived: existing?.archived ?? false,
    };
    const writtenAt = clock();
    const result = await repo.save(projectId, { doc, hash, writtenAt }, row, saved && { revision: saved.revision, hash: saved.hash });
    if (!result.ok) {
      emit({ t: "save_failed", kind: result.kind, detail: result.detail });
      return { written: false };
    }
    saved = { revision, hash, writtenAt: result.writtenAt };
    emit({ t: "saved", revision, hash, writtenAt: result.writtenAt });
    return { written: true };
  }

  async function handle(msg: ProjectReq, emit: (ev: ProjectEv) => void): Promise<unknown> {
    if (degradedPending) {
      degradedPending = false;
      emit({ t: "degraded", reason: "indexeddb-unavailable" });
    }
    switch (msg.t) {
      case "load":
        return load(msg.projectId, emit);
      case "open":
        return open(msg, emit);
      case "commit":
        return commit(msg, emit);
      case "save":
        return save(emit);
      case "close":
        if (shadow?.projectId === msg.projectId) {
          shadow = null;
          saved = null;
        }
        return undefined;
      case "revision":
        if (!shadow) return { stored: false };
        await repo.revisions.put(shadow.projectId, msg.revision, { state: msg.state, stateHash: msg.stateHash });
        return { stored: true };
    }
  }

  // One request at a time: an `open` waits on the repository, and the `commit` behind it must see its shadow.
  return (msg, emit) => {
    const run = tail.then(() => handle(msg, emit));
    tail = run.catch(() => undefined);
    return run;
  };
}
