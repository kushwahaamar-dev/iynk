import type { WorkerLike } from "./rpc.ts";

export class FakeWorker implements WorkerLike {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: Record<string, unknown>[] = [];
  terminated = 0;

  postMessage(msg: unknown): void {
    this.sent.push(msg as Record<string, unknown>);
  }

  terminate(): void {
    this.terminated++;
  }

  receive(data: unknown): void {
    this.onmessage?.({ data });
  }

  ready(): void {
    this.receive({ v: 1, t: "ready" });
  }
}
