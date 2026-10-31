import type { OpEnvelope, Project } from "@/project/generated/types";
import { createRpcPort, ProtocolError, WorkerError, type RpcPort, type WorkerLike } from "@/protocol";
import { LibraryError, type Library, type LibraryErrorCode } from "./library";
import type {
  CommitResult,
  ImportOutcome,
  LegacyProgress,
  LoadResult,
  OpenResult,
  ProjectEv,
  ProjectReq,
  SaveReason,
} from "./project-protocol";
import { mergeWipeReports, WIPE_PHRASE, wipeBrowser, type WipeReport } from "./wipe";

type ProjectPort = RpcPort<ProjectReq, ProjectEv>;

const CALL_TIMEOUT_MS = 20_000;
/** The key `src/lib/progress/storage.ts` writes. `local` does not import `lib`, so the name is repeated. */
const LEGACY_KEY = "iynk:v1";
const LIBRARY_ERRORS: readonly string[] = ["invalid", "not_found", "exists", "unreadable", "save_failed"] satisfies LibraryErrorCode[];

export interface ProjectHost {
  load(projectId: string): Promise<LoadResult>;
  open(projectId: string, state: Project, revision: number): Promise<void>;
  /** Folds the ops into the worker's shadow; nothing is written. */
  commit(fromRevision: number, toRevision: number, ops: OpEnvelope[]): Promise<void>;
  /** Writes the shadow. The result arrives as `saved` or `save_failed`. */
  save(reason: SaveReason): Promise<void>;
  close(projectId: string): Promise<void>;
  /** Pass this as `SessionOptions.onCompact`. */
  keepRevision(snap: { revision: number; state: Project; stateHash: string }): void;
  onEvent(fn: (ev: ProjectEv) => void): () => void;
  /** Test hook: stops the worker; the next request starts a new one. */
  kill(): Promise<void>;
  readonly state: "starting" | "ready" | "dead";
  readonly library: Library;
  readonly files: {
    /** Exports the saved record, not the unsaved shadow of a project that is open. */
    exportProject(id: string, kind: "iynk" | "iynkz"): Promise<Uint8Array>;
    importBytes(bytes: Uint8Array, name: string): Promise<ImportOutcome>;
    markFileCopy(id: string, has: boolean): Promise<void>;
  };
  readonly data: {
    exportAll(): Promise<Uint8Array>;
    /** Checks the phrase, wipes the stores in the worker, then the browser storage here. A wrong phrase removes nothing. */
    wipe(confirmation: string): Promise<WipeReport>;
    deleteAiData(): Promise<void>;
  };
  readonly health: {
    estimate(): Promise<{ usage: number; quota: number } | null>;
    persist(): Promise<boolean>;
  };
}

export interface ProjectHostOptions {
  /** Builds a worker port. The default starts `project.worker.ts`; tests pass an inline port over a handler. */
  makePort?: () => ProjectPort;
  /** What the page owns and the worker cannot reach. The defaults are the page's globals; tests pass fakes. */
  local?: Storage | null;
  caches?: CacheStorage | null;
  sw?: ServiceWorkerContainer | null;
}

interface Snapshot {
  projectId: string;
  state: Project;
  revision: number;
}

interface Commit {
  fromRevision: number;
  toRevision: number;
  ops: OpEnvelope[];
}

function workerPort(): ProjectPort {
  const worker = new Worker(new URL("./project.worker.ts", import.meta.url), { type: "module" });
  return createRpcPort<ProjectReq, ProjectEv>(worker as unknown as WorkerLike, { defaultCallTimeoutMs: CALL_TIMEOUT_MS });
}

function pageGlobal<T>(read: () => T | undefined): T | null {
  try {
    return read() ?? null;
  } catch {
    return null;
  }
}

const defaultLocal = () => pageGlobal(() => globalThis.localStorage);
const defaultCaches = () => pageGlobal(() => globalThis.caches);
const defaultSw = () => pageGlobal(() => globalThis.navigator?.serviceWorker);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function readLegacy(local: Storage | null): Record<string, unknown> | null {
  try {
    const raw = local?.getItem(LEGACY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function legacyProgress(local: Storage | null): LegacyProgress | null {
  const saved = readLegacy(local);
  return saved && { done: saved.done ?? {}, quiz: saved.quiz ?? {}, best: saved.best ?? {} };
}

function settingsJson(local: Storage | null): string | null {
  const settings = readLegacy(local)?.settings;
  return settings === undefined ? null : JSON.stringify(settings);
}

/** A refusal from the worker's library comes back as the `LibraryError` the module throws. */
function restoreError(err: unknown): unknown {
  return err instanceof WorkerError && LIBRARY_ERRORS.includes(err.kind) ? new LibraryError(err.kind as LibraryErrorCode, err.message) : err;
}

const portFailed = (err: unknown): boolean => err instanceof ProtocolError && err.kind !== "aborted" && err.kind !== "bad_message";

export function createProjectHost({
  makePort = workerPort,
  local = defaultLocal(),
  caches = defaultCaches(),
  sw = defaultSw(),
}: ProjectHostOptions = {}): ProjectHost {
  const listeners = new Set<(ev: ProjectEv) => void>();
  let port: ProjectPort | null = null;
  let ready: Promise<ProjectPort> | null = null;
  let everStarted = false;
  let snapshot: Snapshot | null = null;
  let commits: Commit[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  let progressSent = false;

  const emit = (ev: ProjectEv) => {
    for (const fn of [...listeners]) fn(ev);
  };

  // One request at a time, so a restart replays exactly the commits that were acknowledged before it.
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = queue.then(work);
    queue = run.catch(() => undefined);
    return run;
  }

  async function start(restart: boolean): Promise<ProjectPort> {
    const fresh = makePort();
    fresh.on(emit);
    port = fresh;
    if (snapshot) {
      await fresh.call({ t: "open", ...snapshot });
      for (const commit of commits) await fresh.call({ t: "commit", ...commit });
    }
    if (restart) emit({ t: "worker_restarted" });
    return fresh;
  }

  function alive(): Promise<ProjectPort> {
    if (ready && port && port.state !== "dead") return ready;
    const restart = everStarted;
    everStarted = true;
    const starting = start(restart);
    ready = starting;
    starting.catch(() => {
      if (ready === starting) ready = null;
    });
    return starting;
  }

  async function send(msg: ProjectReq): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let current: ProjectPort | undefined;
      try {
        current = await alive();
        return (await current.call(msg)).result;
      } catch (err) {
        if (!portFailed(err) || attempt > 0) throw err;
        await (current ?? port)?.kill(0);
      }
    }
  }

  const request = <T>(msg: ProjectReq) =>
    enqueue(async () => {
      try {
        return (await send(msg)) as T;
      } catch (err) {
        throw restoreError(err);
      }
    });

  const library: Library = {
    list: () => request({ t: "lib", call: { op: "list" } }),
    create: (o) => request({ t: "lib", call: { op: "create", ...o } }),
    rename: (id, title) => request({ t: "lib", call: { op: "rename", id, title } }),
    fork: (id, o) => request({ t: "lib", call: { op: "fork", id, title: o?.title } }),
    forkDocument: (doc, o) => request({ t: "lib", call: { op: "forkDocument", doc, title: o?.title, origin: o?.origin } }),
    trash: (id) => request({ t: "lib", call: { op: "trash", id } }),
    restore: (id) => request({ t: "lib", call: { op: "restore", id } }),
    emptyTrash: () => request({ t: "lib", call: { op: "emptyTrash" } }),
    purgeExpired: () => request({ t: "lib", call: { op: "purgeExpired" } }),
    trashList: () => request({ t: "lib", call: { op: "trashList" } }),
  };

  return {
    library,

    files: {
      exportProject: (id, kind) => request({ t: "file", call: { op: "export", id, kind } }),
      importBytes: (bytes, name) => request({ t: "file", call: { op: "import", bytes, name } }),
      markFileCopy: (id, has) => request({ t: "file", call: { op: "markCopy", id, has } }),
    },

    data: {
      exportAll: () => request({ t: "data", call: { op: "exportAll", settingsJson: settingsJson(local) } }),

      async wipe(confirmation) {
        if (confirmation !== WIPE_PHRASE) throw new Error("bad_confirmation");
        const stores = await request<Pick<WipeReport, "stores" | "errors">>({
          t: "data",
          call: { op: "wipeStores", confirmation },
        });
        snapshot = null;
        commits = [];
        return mergeWipeReports(stores, await wipeBrowser({ local, caches, sw }, confirmation));
      },

      deleteAiData: () => request({ t: "data", call: { op: "deleteAiData" } }),
    },

    health: {
      estimate: () => request({ t: "storage", call: { op: "estimate" } }),
      persist: () => request({ t: "storage", call: { op: "persist" } }),
    },

    load: (projectId) => enqueue(async () => (await send({ t: "load", projectId })) as LoadResult),

    open: (projectId, state, revision) =>
      enqueue(async () => {
        const first = !progressSent;
        const result = (await send({
          t: "open",
          projectId,
          state,
          revision,
          ...(first && { legacyProgress: legacyProgress(local) }),
        })) as OpenResult;
        progressSent = true;
        snapshot = result.accepted ? { projectId, state, revision } : null;
        commits = [];
      }),

    commit: (fromRevision, toRevision, ops) =>
      enqueue(async () => {
        const commit = { fromRevision, toRevision, ops };
        const result = (await send({ t: "commit", ...commit })) as CommitResult;
        if (result.folded) commits.push(commit);
        else {
          snapshot = null;
          commits = [];
        }
      }),

    save: (reason) => enqueue(async () => void (await send({ t: "save", reason }))),

    close: (projectId) =>
      enqueue(async () => {
        await send({ t: "close", projectId });
        if (snapshot?.projectId === projectId) {
          snapshot = null;
          commits = [];
        }
      }),

    keepRevision(snap) {
      // A lost restore point costs nothing but that restore point, so a failure here is not worth an error.
      void enqueue(() => send({ t: "revision", ...snap })).catch(() => undefined);
    },

    onEvent(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },

    async kill() {
      await port?.kill(0);
    },

    get state() {
      return port?.state ?? "starting";
    },
  };
}
