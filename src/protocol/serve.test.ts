// @vitest-environment node
import { describe, expect, it } from "vitest";
import { serveWorker, type WorkerScopeLike } from "./rpc.ts";

type Req = { t: "double"; n: number } | { t: "fail" } | { t: "stream" };
type Ev = { t: "tick"; at: number };

function fakeScope() {
  const posted: Record<string, unknown>[] = [];
  const scope: WorkerScopeLike = { onmessage: null, postMessage: (msg) => void posted.push(msg as Record<string, unknown>) };
  const send = async (data: unknown) => {
    scope.onmessage?.({ data });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };
  return { scope, posted, send };
}

describe("serveWorker", () => {
  it("posts ready first", () => {
    const { scope, posted } = fakeScope();
    serveWorker<Req, Ev>(scope, () => undefined);
    expect(posted).toEqual([{ v: 1, t: "ready" }]);
  });

  it("answers a request with an ack carrying its id and the result", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, (msg) => (msg.t === "double" ? msg.n * 2 : undefined));
    await send({ v: 1, id: 7, t: "double", n: 4 });
    expect(posted.at(-1)).toEqual({ v: 1, id: 7, t: "ack", result: 8 });
  });

  it("hands the handler the request without the envelope fields", async () => {
    const { scope, send } = fakeScope();
    const seen: unknown[] = [];
    serveWorker<Req, Ev>(scope, (msg) => void seen.push(msg));
    await send({ v: 1, id: 1, t: "double", n: 2 });
    expect(seen).toEqual([{ t: "double", n: 2 }]);
  });

  it("awaits an async handler", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, async () => "late");
    await send({ v: 1, id: 2, t: "stream" });
    expect(posted.at(-1)).toMatchObject({ t: "ack", result: "late" });
  });

  it("turns a throw into an error with kind, message and hint", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, () => {
      throw Object.assign(new Error("nope"), { kind: "limit", hint: "lower it" });
    });
    await send({ v: 1, id: 3, t: "fail" });
    expect(posted.at(-1)).toEqual({ v: 1, id: 3, t: "error", error: { kind: "limit", message: "nope", hint: "lower it" } });
  });

  it("gives a plain throw the kind internal", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, () => {
      throw new Error("plain");
    });
    await send({ v: 1, id: 4, t: "fail" });
    expect(posted.at(-1)).toEqual({ v: 1, id: 4, t: "error", error: { kind: "internal", message: "plain" } });
  });

  it("posts what emit sends, inside the envelope", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, (_msg, emit) => emit({ t: "tick", at: 9 }));
    await send({ v: 1, id: 5, t: "stream" });
    expect(posted[1]).toEqual({ v: 1, t: "tick", at: 9 });
  });

  it("answers an unreadable request that has an id with bad_message", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, () => undefined);
    await send({ v: 9, id: 6, t: "double" });
    expect(posted.at(-1)).toMatchObject({ id: 6, t: "error", error: { kind: "bad_message" } });
  });

  it("ignores a message with neither a valid envelope nor an id", async () => {
    const { scope, posted, send } = fakeScope();
    serveWorker<Req, Ev>(scope, () => undefined);
    await send("junk");
    expect(posted).toHaveLength(1);
  });
});
