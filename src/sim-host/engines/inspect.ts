// Inspect mode: elaborates Verilog with Yosys (SA-21, FA-11). The engine is 12.5 MB on the wire and about 700 MB of
// renderer memory, so it loads only after a real click, in a worker of its own, and never on devices that report 4 GB or less.

import type { LoadEngine, LoadedFile } from "./loader";

export type MemoryVerdict = { kind: "refuse"; gb: number } | { kind: "ask"; gb: number } | { kind: "ask"; gb: null };

export function memoryVerdict(deviceMemory: number | undefined): MemoryVerdict {
  if (deviceMemory === undefined) return { kind: "ask", gb: null };
  return deviceMemory <= 4 ? { kind: "refuse", gb: deviceMemory } : { kind: "ask", gb: deviceMemory };
}

declare const clickBrand: unique symbol;
/** Proof that a person pressed the button. Only userClick makes one, so no other code path can start the load. */
export type UserClick = { readonly [clickBrand]: true };

export function userClick(e: { isTrusted: boolean }): UserClick | null {
  return e.isTrusted ? ({} as UserClick) : null;
}

export interface InspectOk {
  ok: true;
  cells: Record<string, number>;
  nets: number;
  netlistJson: string;
  implicitWires: { line: number; name: string }[];
  warnings: string[];
  ms: number;
}

export interface InspectFail {
  ok: false;
  error: string;
  log: string;
}

export type InspectResult = InspectOk | InspectFail;

export interface InspectSession {
  elaborate(src: string, o?: { top?: string }): Promise<InspectResult>;
  dispose(): void;
}

export type OpenInspectResult =
  | { ok: true; session: InspectSession }
  | { ok: false; reason: "device" | "integrity" | "network" | "unsupported"; detail: string };

export const MAX_SOURCE_BYTES = 256 * 1024;

export type WorkerRequest =
  | { type: "init"; files: Pick<LoadedFile, "url" | "kind" | "bytes">[] }
  | { type: "elaborate"; src: string; top?: string };

/** The worker cannot time itself against the caller's clock, so the session adds `ms`. */
export type WorkerReply = { type: "ready" } | { type: "failed"; error: string } | { type: "result"; result: Omit<InspectOk, "ms"> | InspectFail };

function startWorker(files: LoadedFile[]): Promise<{ ok: true; worker: Worker } | { ok: false; detail: string }> {
  const worker = new Worker(new URL("./inspect.worker.ts", import.meta.url), { type: "module", name: "inspect" });
  return new Promise((resolve) => {
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.type === "ready") resolve({ ok: true, worker });
      else if (event.data.type === "failed") {
        worker.terminate();
        resolve({ ok: false, detail: event.data.error });
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      resolve({ ok: false, detail: event.message });
    };
    const request: WorkerRequest = { type: "init", files: files.map(({ url, kind, bytes }) => ({ url, kind, bytes })) };
    worker.postMessage(request, files.map((f) => f.bytes));
  });
}

export async function openInspect(_click: UserClick, deps: { loadEngine: LoadEngine; now(): number }): Promise<OpenInspectResult> {
  const offer = await deps.loadEngine("yosys");
  if (!offer.ok) return offer;
  const fetched = await offer.fetchFiles();
  if (!fetched.ok) return fetched;
  const started = await startWorker(fetched.files);
  if (!started.ok) return { ok: false, reason: "network", detail: started.detail };

  const { worker } = started;
  let queue: Promise<unknown> = Promise.resolve();
  return {
    ok: true,
    session: {
      elaborate(src, o) {
        const run = async (): Promise<InspectResult> => {
          if (new TextEncoder().encode(src).length > MAX_SOURCE_BYTES) {
            return { ok: false, error: `The source is over ${MAX_SOURCE_BYTES / 1024} KiB.`, log: "" };
          }
          const begin = deps.now();
          const reply = await new Promise<Omit<InspectOk, "ms"> | InspectFail>((resolve) => {
            worker.onmessage = (event: MessageEvent<WorkerReply>) => {
              if (event.data.type === "result") resolve(event.data.result);
            };
            worker.onerror = (event) => resolve({ ok: false, error: event.message, log: "" });
            const request: WorkerRequest = { type: "elaborate", src, top: o?.top };
            worker.postMessage(request);
          });
          return reply.ok ? { ...reply, ms: Math.round(deps.now() - begin) } : reply;
        };
        const next = queue.then(run);
        queue = next.catch(() => undefined);
        return next;
      },
      dispose: () => worker.terminate(),
    },
  };
}
