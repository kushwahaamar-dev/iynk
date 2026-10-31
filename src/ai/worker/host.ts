import { createRpcPort } from "../../protocol/index.ts";
import type { RpcPort, WorkerLike } from "../../protocol/index.ts";
import type { AiClient, ConformanceInput, ModelEvent, ModelRequest } from "../adapters/types.ts";
import { aiError, toAiError } from "../errors.ts";
import type { AiToHost, HostToAi } from "./protocol.ts";

export type AiPort = RpcPort<HostToAi, AiToHost>;

export interface AiHost extends AiClient {
  dispose(): void;
}

export function spawnAiWorker(): Worker {
  return new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
}

const PROBE_FAILED: ConformanceInput = { reachable: false, modelIds: [] };

function portOf(made: Worker | AiPort): AiPort {
  return "call" in made ? made : createRpcPort<HostToAi, AiToHost>(made as unknown as WorkerLike);
}

function isStaleToken(ev: ModelEvent): boolean {
  return ev.t === "error" && ev.code === "relay_denied" && ev.status === 401;
}

export function createAiHost(o: {
  spawn: () => Worker | AiPort;
  token: () => Promise<string | null>;
  relayUrl: () => string | null;
}): AiHost {
  let port: AiPort | null = null;
  let disposed = false;
  let nextId = 1;
  const active = new Set<string>();

  function ensurePort(): AiPort {
    if (disposed) throw aiError("internal");
    if (!port || port.state === "dead") port = portOf(o.spawn());
    return port;
  }

  async function sync(p: AiPort): Promise<void> {
    await p.call({ t: "config", relayUrl: o.relayUrl() });
    await p.call({ t: "token", token: await o.token() });
  }

  /** One attempt: the worker's events for one id, ending with its `end` or a crash. */
  async function* attempt(
    p: AiPort,
    id: string,
    start: HostToAi,
    signal: AbortSignal,
  ): AsyncGenerator<AiToHost> {
    const inbox: AiToHost[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    const push = (ev: AiToHost | null) => {
      if (ev) inbox.push(ev);
      else finished = true;
      wake?.();
    };
    const off = p.on((ev) => {
      if (ev.id !== id) return;
      push(ev.t === "end" ? null : ev);
    });
    const onAbort = () => void p.call({ t: "abort", id }).catch(() => {});
    signal.addEventListener("abort", onAbort, { once: true });
    active.add(id);
    p.call(start).catch(() => {
      inbox.push({ t: "event", id, ev: { t: "error", code: "internal" } });
      push(null);
    });
    try {
      for (;;) {
        const ev = inbox.shift();
        if (ev) {
          yield ev;
          continue;
        }
        if (finished) return;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = null;
      }
    } finally {
      off();
      signal.removeEventListener("abort", onAbort);
      active.delete(id);
      if (!finished) onAbort();
    }
  }

  async function* stream(req: ModelRequest, profileId: string, signal: AbortSignal): AsyncGenerator<ModelEvent> {
    // A stale device token shows up as a 401 before any output. The caller's `token()` is asked again, once.
    for (let tries = 0; ; tries++) {
      let stale = false;
      try {
        if (signal.aborted) throw aiError("aborted");
        const p = ensurePort();
        await sync(p);
        const id = `s${nextId++}`;
        let first = true;
        for await (const msg of attempt(p, id, { t: "stream", id, profileId, req }, signal)) {
          if (msg.t !== "event") continue;
          if (first && tries === 0 && isStaleToken(msg.ev)) {
            stale = true;
            break;
          }
          first = false;
          yield msg.ev;
        }
      } catch (error) {
        yield { t: "error", code: toAiError(error, signal).code };
        return;
      }
      if (!stale) return;
    }
  }

  return {
    stream,

    async probe(profileId, signal) {
      try {
        if (signal.aborted) return PROBE_FAILED;
        const p = ensurePort();
        await sync(p);
        const id = `p${nextId++}`;
        for await (const msg of attempt(p, id, { t: "probe", id, profileId }, signal)) {
          if (msg.t === "probe") return msg.result;
        }
      } catch {
        return PROBE_FAILED;
      }
      return PROBE_FAILED;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      const p = port;
      port = null;
      if (!p) return;
      for (const id of active) void p.call({ t: "abort", id }).catch(() => {});
      void p.kill(0);
    },
  };
}
