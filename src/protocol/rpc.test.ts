// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtocolError, WorkerError } from "./errors.ts";
import { FakeWorker } from "./fake-worker.testing.ts";
import { createRpcPort, type RpcPort } from "./rpc.ts";

type Req = { t: "ping"; n?: number };
type Ev = { t: "tick"; at: number };

let worker: FakeWorker;
let port: RpcPort<Req, Ev>;

beforeEach(() => {
  vi.useFakeTimers();
  worker = new FakeWorker();
  port = createRpcPort<Req, Ev>(worker);
  worker.ready();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("call", () => {
  it("resolves on the ack with the request id", async () => {
    const reply = port.call({ t: "ping", n: 1 });
    expect(worker.sent).toEqual([{ t: "ping", n: 1, v: 1, id: 1 }]);
    worker.receive({ v: 1, id: 1, t: "ack", result: 42 });
    await expect(reply).resolves.toMatchObject({ id: 1, result: 42 });
  });

  it("rejects on an error with its kind, message and hint", async () => {
    const reply = port.call({ t: "ping" });
    worker.receive({ v: 1, id: 1, t: "error", error: { kind: "bad_input", message: "no", hint: "try again" } });
    const err = await reply.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkerError);
    expect(err).toMatchObject({ kind: "bad_input", message: "no", hint: "try again" });
  });

  it("drops an ack for an unknown id", () => {
    worker.receive({ v: 1, id: 99, t: "ack" });
    expect(port.dropped).toBe(1);
  });

  it("drops a message with another version or no type, and counts it", () => {
    worker.receive({ v: 2, t: "tick", at: 1 });
    worker.receive({ v: 1 });
    worker.receive(null);
    expect(port.dropped).toBe(3);
  });

  it("rejects with call_timeout and keeps the port alive", async () => {
    const reply = port.call({ t: "ping" }, { timeoutMs: 500 });
    const seen = reply.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    expect(await seen).toMatchObject({ kind: "call_timeout" });
    expect(port.state).toBe("ready");
  });

  it("uses defaultCallTimeoutMs when the call sets none", async () => {
    const slow = createRpcPort<Req, Ev>(worker, { defaultCallTimeoutMs: 100 });
    const seen = slow.call({ t: "ping" }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    expect(await seen).toMatchObject({ kind: "call_timeout" });
  });

  it("rejects at once when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(port.call({ t: "ping" }, { signal: controller.signal })).rejects.toMatchObject({ kind: "aborted" });
    expect(worker.sent).toHaveLength(0);
  });

  it("rejects when the signal aborts later and drops the late ack", async () => {
    const controller = new AbortController();
    const reply = port.call({ t: "ping" }, { signal: controller.signal });
    controller.abort();
    await expect(reply).rejects.toMatchObject({ kind: "aborted" });
    worker.receive({ v: 1, id: 1, t: "ack" });
    expect(port.dropped).toBe(1);
  });

  it("rejects bad_message when the message cannot be posted", async () => {
    worker.postMessage = () => {
      throw new Error("could not clone");
    };
    await expect(port.call({ t: "ping" })).rejects.toMatchObject({ kind: "bad_message", message: "could not clone" });
  });

  it("passes the transfer list to the worker", () => {
    const spy = vi.spyOn(worker, "postMessage");
    const buffer = new ArrayBuffer(8);
    void port.call({ t: "ping" }, { transfer: [buffer] });
    expect(spy).toHaveBeenCalledWith(expect.anything(), [buffer]);
  });
});

describe("events", () => {
  it("reach listeners without the envelope, until unsubscribed", () => {
    const seen: Ev[] = [];
    const off = port.on((ev) => seen.push(ev));
    worker.receive({ v: 1, t: "tick", at: 5 });
    off();
    worker.receive({ v: 1, t: "tick", at: 6 });
    expect(seen).toEqual([{ t: "tick", at: 5 }]);
  });
});

describe("life cycle", () => {
  it("is starting until ready", () => {
    const fresh = createRpcPort<Req, Ev>(new FakeWorker());
    expect(fresh.state).toBe("starting");
  });

  it("fails the next call with worker_start_timeout after 10 s and terminates once", async () => {
    const silent = new FakeWorker();
    const quiet = createRpcPort<Req, Ev>(silent);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(quiet.state).toBe("dead");
    await expect(quiet.call({ t: "ping" })).rejects.toMatchObject({ kind: "worker_start_timeout" });
    expect(silent.terminated).toBe(1);
  });

  it("rejects calls waiting at the start timeout", async () => {
    const quiet = createRpcPort<Req, Ev>(new FakeWorker(), { startTimeoutMs: 50 });
    const seen = quiet.call({ t: "ping" }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(50);
    expect(await seen).toMatchObject({ kind: "worker_start_timeout" });
  });

  it("does not time out once ready", async () => {
    await vi.advanceTimersByTimeAsync(60_000);
    expect(port.state).toBe("ready");
    expect(worker.terminated).toBe(0);
  });

  it("kill rejects pending calls, terminates after the grace and resolves", async () => {
    const reply = port.call({ t: "ping" });
    const seen = reply.catch((e: unknown) => e);
    const done = port.kill(1_000);
    expect(port.state).toBe("dead");
    expect(await seen).toMatchObject({ kind: "worker_killed" });
    expect(worker.terminated).toBe(0);
    await vi.advanceTimersByTimeAsync(1_000);
    await done;
    expect(worker.terminated).toBe(1);
  });

  it("kill defaults to a 2 s grace", async () => {
    const done = port.kill();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(worker.terminated).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(worker.terminated).toBe(1);
  });

  it("kill twice is safe", async () => {
    const first = port.kill(0);
    const second = port.kill(0);
    await Promise.all([first, second]);
    expect(worker.terminated).toBe(1);
  });

  it("rejects a call after death at once", async () => {
    await port.kill(0);
    await expect(port.call({ t: "ping" })).rejects.toBeInstanceOf(ProtocolError);
    expect(worker.sent).toHaveLength(0);
  });

  it("dies on a worker error and rejects pending calls", async () => {
    const seen = port.call({ t: "ping" }).catch((e: unknown) => e);
    worker.onerror?.({ message: "boom" });
    expect(await seen).toMatchObject({ kind: "worker_killed", message: "the worker crashed: boom" });
    expect(port.state).toBe("dead");
    expect(worker.terminated).toBe(1);
  });
});
