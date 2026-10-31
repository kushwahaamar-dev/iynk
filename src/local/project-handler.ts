import { WorkerError, type WorkerHandler } from "@/protocol";
import { cryptoRandom, newProjectId, type Clock, type RandomSource } from "@/core/ids";
import { readIynk, writeIynk, type ReadReport } from "@/export/iynk";
import { readIynkz, writeIynkz } from "@/export/iynkz";
import { forkProject } from "@/project/fork";
import type { Project } from "@/project/generated/types";
import { canonicalBytes, stateHash } from "@/project/hash";
import { limitDiagnostics } from "@/project/limits";
import { validateValue } from "@/project/validate";
import { exportAll } from "./export-all";
import { createLibrary, LibraryError } from "./library";
import type {
  CommitResult,
  DataCall,
  FileCall,
  ImportOutcome,
  LegacyProgress,
  LibCall,
  LoadResult,
  OpenResult,
  ProjectEv,
  ProjectReq,
  SaveOutcome,
  StorageCall,
} from "./project-protocol";
import type { IndexRow, RecordLoad, Repository } from "./repository";
import type { createShadow, Shadow } from "./shadow";
import type { ProgressKv } from "./storage-health";
import { deleteAiData, wipeStores } from "./wipe";

const LEGACY_MIGRATED_KEY = "migrated:iynk-v1";
const ID_TRIES = 3;
const DEFAULT_ACTOR = "usr_local";

export interface ProjectHandlerDeps {
  repo: Repository;
  shadowFactory: typeof createShadow;
  clock: Clock;
  /** Set when the repository is the memory fallback; the first request then reports `degraded`. */
  degraded?: boolean;
  /** Where the one-time copy of the old `iynk:v1` progress goes. Without it the copy is skipped. */
  progress?: ProgressKv;
  rnd?: RandomSource;
  /** The person the library and imports act as. */
  actor?: string;
}

interface SavedMark {
  revision: number;
  hash: string;
  writtenAt: number;
}

const refusal = (kind: string, message: string) => new WorkerError({ kind, message });

/** The page tells the worker's refusals apart by `kind`, so library errors and the wipe phrase check carry one. */
function asWorkerError(err: unknown): unknown {
  if (err instanceof LibraryError) return refusal(err.code, err.message);
  if (err instanceof Error && err.message === "bad_confirmation") return refusal("bad_confirmation", "the confirmation phrase is wrong");
  return err;
}

export function createProjectHandler(deps: ProjectHandlerDeps): WorkerHandler<ProjectReq, ProjectEv> {
  const { repo, shadowFactory, clock, progress, rnd = cryptoRandom, actor = DEFAULT_ACTOR } = deps;
  const library = createLibrary({ repo, clock, rnd, actor });
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

  async function copyLegacyProgress(legacy: LegacyProgress) {
    if (!progress || (await progress.get(LEGACY_MIGRATED_KEY)) !== undefined) return;
    await progress.set("done", legacy.done);
    await progress.set("quiz", legacy.quiz);
    await progress.set("best", legacy.best);
    await progress.set(LEGACY_MIGRATED_KEY, { at: clock() });
  }

  async function open(req: Extract<ProjectReq, { t: "open" }>, emit: (ev: ProjectEv) => void): Promise<OpenResult> {
    shadow = null;
    saved = null;
    if (req.legacyProgress) await copyLegacyProgress(req.legacyProgress);
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

  const rowOf = (doc: Project, hash: string): IndexRow => ({
    name: doc.meta.title,
    updatedAt: doc.meta.updatedAt,
    hash,
    board: doc.boards[0]?.definition.ref ?? "",
    size: canonicalBytes(doc),
    hasFileCopy: false,
    archived: false,
  });

  async function freshId(): Promise<string> {
    for (let i = 0; i < ID_TRIES; i++) {
      const id = newProjectId(clock(), rnd);
      if ((await repo.load(id)).status === "missing") return id;
    }
    throw new LibraryError("save_failed", "could not find a free project id");
  }

  async function exportProject(id: string, kind: "iynk" | "iynkz"): Promise<Uint8Array> {
    const found = await repo.load(id);
    if (found.status === "missing") throw new LibraryError("not_found", `no project ${id}`);
    if (found.status === "lost") throw new LibraryError("unreadable", `project ${id} cannot be read`);
    return kind === "iynk" ? writeIynk(found.rec.doc) : writeIynkz(found.rec.doc, []);
  }

  async function importBytes(bytes: Uint8Array, name: string): Promise<ImportOutcome> {
    const report: ReadReport = name.toLowerCase().endsWith(".iynkz") ? await readIynkz(bytes, clock) : readIynk(bytes, clock);
    if (!report.ok) return { ok: false, error: report.error, raw: bytes };
    const taken = (await repo.load(report.project.id)).status !== "missing";
    const doc = taken
      ? forkProject(report.project, { id: await freshId(), now: new Date(clock()).toISOString(), actor })
      : report.project;
    const hash = taken ? stateHash(doc) : report.hash;
    const result = await repo.save(doc.id, { doc, hash, writtenAt: clock() }, rowOf(doc, hash), null);
    if (!result.ok) throw new LibraryError("save_failed", result.detail);
    return {
      ok: true,
      id: doc.id,
      hash,
      hashMatches: report.hashMatches,
      warnings: report.warnings.map((d) => `${d.code}: ${d.message}`),
      forked: taken,
    };
  }

  async function runLib(call: LibCall): Promise<unknown> {
    switch (call.op) {
      case "list":
        return library.list();
      case "create":
        return library.create({ board: call.board, title: call.title });
      case "rename":
        return library.rename(call.id, call.title);
      case "fork":
        return library.fork(call.id, call.title === undefined ? undefined : { title: call.title });
      case "forkDocument":
        return library.forkDocument(call.doc, { title: call.title, origin: call.origin });
      case "trash":
        return library.trash(call.id);
      case "restore":
        return library.restore(call.id);
      case "emptyTrash":
        return library.emptyTrash();
      case "purgeExpired":
        return library.purgeExpired();
      case "trashList":
        return library.trashList();
    }
  }

  async function runFile(call: FileCall): Promise<unknown> {
    switch (call.op) {
      case "export":
        return exportProject(call.id, call.kind);
      case "import":
        return importBytes(call.bytes, call.name);
      case "markCopy":
        return repo.setFileCopy(call.id, call.has);
    }
  }

  async function runData(call: DataCall): Promise<unknown> {
    switch (call.op) {
      case "exportAll":
        return exportAll({ repo, settingsJson: call.settingsJson, now: clock });
      case "wipeStores": {
        const report = await wipeStores(repo, call.confirmation);
        shadow = null;
        saved = null;
        return report;
      }
      case "deleteAiData":
        return deleteAiData(repo);
    }
  }

  async function runStorage(call: StorageCall): Promise<unknown> {
    switch (call.op) {
      case "estimate":
        return repo.estimate();
      case "persist":
        return (await globalThis.navigator?.storage?.persist?.()) ?? false;
    }
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
      case "lib":
        return runLib(msg.call);
      case "file":
        return runFile(msg.call);
      case "data":
        return runData(msg.call);
      case "storage":
        return runStorage(msg.call);
      default:
        throw refusal("bad_message", `unknown request ${String((msg as { t: unknown }).t)}`);
    }
  }

  // One request at a time: an `open` waits on the repository, and the `commit` behind it must see its shadow.
  return (msg, emit) => {
    const run = tail.then(() => handle(msg, emit)).catch((err) => {
      throw asWorkerError(err);
    });
    tail = run.catch(() => undefined);
    return run;
  };
}
