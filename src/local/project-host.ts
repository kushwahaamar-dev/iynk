import type { OpEnvelope, Project } from "@/project/generated/types";
import { createRpcPort, ProtocolError, type RpcPort, type WorkerLike } from "@/protocol";
import type {
  CommitResult,
  LoadResult,
  OpenResult,
  ProjectEv,
  ProjectReq,
  SaveReason,
} from "./project-protocol";

type ProjectPort = RpcPort<ProjectReq, ProjectEv>;

const CALL_TIMEOUT_MS = 20_000;

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
}

export interface ProjectHostOptions {
  /** Builds a worker port. The default starts `project.worker.ts`; tests pass an inline port over a handler. */
  makePort?: () => ProjectPort;
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

const portFailed = (err: unknown): boolean => err instanceof ProtocolError && err.kind !== "aborted" && err.kind !== "bad_message";

export function createProjectHost({ makePort = workerPort }: ProjectHostOptions = {}): ProjectHost {
  const listeners = new Set<(ev: ProjectEv) => void>();
  let port: ProjectPort | null = null;
  let ready: Promise<ProjectPort> | null = null;
  let everStarted = false;
  let snapshot: Snapshot | null = null;
  let commits: Commit[] = [];
  let queue: Promise<unknown> = Promise.resolve();

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

  return {
    load: (projectId) => enqueue(async () => (await send({ t: "load", projectId })) as LoadResult),

    open: (projectId, state, revision) =>
      enqueue(async () => {
        const result = (await send({ t: "open", projectId, state, revision })) as OpenResult;
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
