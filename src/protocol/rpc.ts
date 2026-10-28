import { ProtocolError, WorkerError, type ErrorBody } from "./errors.ts";
import { PROTOCOL_VERSION } from "./version.ts";

const START_TIMEOUT_MS = 10_000;
const KILL_GRACE_MS = 2_000;

export interface WorkerLike {
  postMessage(msg: unknown, transfer?: unknown[]): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

/** The worker's side of the wire, structural so no Worker global is named. */
export interface WorkerScopeLike {
  postMessage(msg: unknown, transfer?: unknown[]): void;
  onmessage: ((e: { data: unknown }) => void) | null;
}

export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

export interface Ack {
  v: typeof PROTOCOL_VERSION;
  id: number;
  t: "ack";
  result?: unknown;
}

interface Timers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface PortOptions {
  startTimeoutMs?: number;
  /** Applied to a call that sets no `timeoutMs`; without it a call waits for ever. */
  defaultCallTimeoutMs?: number;
  timers?: Timers;
}

export type WorkerHandler<Req extends { t: string }, Ev extends { t: string }> = (
  msg: Req,
  emit: (ev: Ev) => void,
) => Promise<unknown> | unknown;

export interface RpcPort<Req extends { t: string }, Ev extends { t: string }> {
  call(msg: Req, opts?: { signal?: AbortSignalLike; timeoutMs?: number; transfer?: unknown[] }): Promise<Ack>;
  on(handler: (ev: Ev) => void): () => void;
  /** Terminates the worker after a grace period; resolves once it is gone. Safe to call twice. */
  kill(graceMs?: number): Promise<void>;
  readonly state: "starting" | "ready" | "dead";
  /** Messages the port threw away: wrong version, no `t`, or an unknown call id. */
  readonly dropped: number;
}

interface Pending {
  resolve(ack: Ack): void;
  reject(err: Error): void;
}

type Wire = { v: number; t: string; id?: number; [key: string]: unknown };

const realTimers = globalThis as unknown as Timers;

function clone<T>(value: T): T {
  return (globalThis as unknown as { structuredClone<V>(v: V): V }).structuredClone(value);
}

function asWire(data: unknown): Wire | null {
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Wire;
  return msg.v === PROTOCOL_VERSION && typeof msg.t === "string" ? msg : null;
}

function strip<T extends { t: string }>(msg: Wire): T {
  const rest: Partial<Wire> = { ...msg };
  delete rest.v;
  delete rest.id;
  return rest as unknown as T;
}

function errorBody(err: unknown): ErrorBody {
  if (typeof err !== "object" || err === null) return { kind: "internal", message: String(err) };
  const e = err as { kind?: unknown; message?: unknown; hint?: unknown };
  return {
    kind: typeof e.kind === "string" ? e.kind : "internal",
    message: typeof e.message === "string" ? e.message : String(err),
    ...(typeof e.hint === "string" ? { hint: e.hint } : {}),
  };
}

export function serveWorker<Req extends { t: string }, Ev extends { t: string }>(
  scope: WorkerScopeLike,
  handler: WorkerHandler<Req, Ev>,
): void {
  const emit = (ev: Ev) => scope.postMessage({ ...ev, v: PROTOCOL_VERSION });

  scope.onmessage = (e) => {
    const msg = asWire(e.data);
    if (!msg) {
      const id = (e.data as { id?: unknown } | null)?.id;
      if (typeof id === "number") {
        const error: ErrorBody = { kind: "bad_message", message: "unreadable request" };
        scope.postMessage({ v: PROTOCOL_VERSION, id, t: "error", error });
      }
      return;
    }
    const id = msg.id;
    if (typeof id !== "number") return;
    void (async () => {
      try {
        const result = await handler(strip<Req>(msg), emit);
        scope.postMessage({ v: PROTOCOL_VERSION, id, t: "ack", result });
      } catch (err) {
        scope.postMessage({ v: PROTOCOL_VERSION, id, t: "error", error: errorBody(err) });
      }
    })();
  };
  scope.postMessage({ v: PROTOCOL_VERSION, t: "ready" });
}

export function createRpcPort<Req extends { t: string }, Ev extends { t: string }>(
  worker: WorkerLike,
  opts: PortOptions = {},
): RpcPort<Req, Ev> {
  const timers = opts.timers ?? realTimers;
  const pending = new Map<number, Pending>();
  const listeners = new Set<(ev: Ev) => void>();
  let state: "starting" | "ready" | "dead" = "starting";
  let dropped = 0;
  let nextId = 1;
  let death: ProtocolError | null = null;
  let gone: Promise<void> | null = null;

  const die = (err: ProtocolError, graceMs: number): Promise<void> => {
    if (gone) return gone;
    state = "dead";
    death = err;
    timers.clearTimeout(startTimer);
    for (const call of [...pending.values()]) call.reject(err);
    gone = new Promise<void>((resolve) => {
      if (graceMs <= 0) {
        worker.terminate();
        resolve();
        return;
      }
      timers.setTimeout(() => {
        worker.terminate();
        resolve();
      }, graceMs);
    });
    return gone;
  };

  const startTimer = timers.setTimeout(() => {
    if (state !== "starting") return;
    void die(new ProtocolError("worker_start_timeout", "the worker did not report ready in time"), 0);
  }, opts.startTimeoutMs ?? START_TIMEOUT_MS);

  worker.onmessage = (e) => {
    const msg = asWire(e.data);
    if (!msg) {
      dropped++;
      return;
    }
    if (msg.t === "ready") {
      if (state === "starting") {
        state = "ready";
        timers.clearTimeout(startTimer);
      }
      return;
    }
    if (msg.t === "ack" || msg.t === "error") {
      const call = typeof msg.id === "number" ? pending.get(msg.id) : undefined;
      if (!call) {
        dropped++;
        return;
      }
      if (msg.t === "ack") call.resolve(msg as unknown as Ack);
      else call.reject(new WorkerError(errorBody(msg.error)));
      return;
    }
    const ev = strip<Ev>(msg);
    for (const listener of [...listeners]) listener(ev);
  };

  worker.onerror = (e) => {
    const reason = (e as { message?: unknown } | null)?.message;
    const detail = typeof reason === "string" && reason ? `: ${reason}` : "";
    void die(new ProtocolError("worker_killed", `the worker crashed${detail}`), 0);
  };

  return {
    call(msg, callOpts = {}) {
      if (death) return Promise.reject(death);
      const signal = callOpts.signal;
      if (signal?.aborted) return Promise.reject(new ProtocolError("aborted", "the call was aborted"));

      const id = nextId++;
      return new Promise<Ack>((resolve, reject) => {
        const timeoutMs = callOpts.timeoutMs ?? opts.defaultCallTimeoutMs;
        let timer: unknown;
        const cleanup = () => {
          pending.delete(id);
          if (timer !== undefined) timers.clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        };
        const fail = (err: Error) => {
          cleanup();
          reject(err);
        };
        const onAbort = () => fail(new ProtocolError("aborted", "the call was aborted"));
        pending.set(id, {
          resolve: (ack) => {
            cleanup();
            resolve(ack);
          },
          reject: fail,
        });
        signal?.addEventListener("abort", onAbort, { once: true });
        if (timeoutMs !== undefined) {
          timer = timers.setTimeout(
            () => fail(new ProtocolError("call_timeout", `no answer to ${msg.t} after ${timeoutMs} ms`)),
            timeoutMs,
          );
        }
        try {
          worker.postMessage({ ...msg, v: PROTOCOL_VERSION, id }, callOpts.transfer);
        } catch (err) {
          fail(new ProtocolError("bad_message", err instanceof Error ? err.message : String(err)));
        }
      });
    },
    on(handler) {
      listeners.add(handler);
      return () => void listeners.delete(handler);
    },
    kill(graceMs = KILL_GRACE_MS) {
      return die(new ProtocolError("worker_killed", "the worker was killed"), graceMs);
    },
    get state() {
      return state;
    },
    get dropped() {
      return dropped;
    },
  };
}

/**
 * The worker's handler run in the calling thread, behind the same port. Messages cross a
 * structured clone and a microtask each way, so a test sees what a worker would see.
 */
export function createInlinePort<Req extends { t: string }, Ev extends { t: string }>(
  handler: WorkerHandler<Req, Ev>,
  opts?: PortOptions,
): RpcPort<Req, Ev> {
  let closed = false;
  const deliver = (to: { onmessage: ((e: { data: unknown }) => void) | null }, data: unknown) => {
    const copy = clone(data);
    (globalThis as unknown as { queueMicrotask(fn: () => void): void }).queueMicrotask(() => {
      if (!closed) to.onmessage?.({ data: copy });
    });
  };

  const scope: WorkerScopeLike = {
    onmessage: null,
    postMessage: (msg) => deliver(worker, msg),
  };
  const worker: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (msg) => deliver(scope, msg),
    terminate: () => {
      closed = true;
    },
  };

  const port = createRpcPort<Req, Ev>(worker, opts);
  serveWorker(scope, handler);

  return {
    call: (msg, callOpts) => port.call(msg, callOpts),
    on: (fn) => port.on(fn),
    kill: () => port.kill(0),
    get state() {
      return port.state;
    },
    get dropped() {
      return port.dropped;
    },
  };
}
