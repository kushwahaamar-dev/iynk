// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInlinePort } from "./rpc.ts";

type Req = { t: "echo"; data: { n: number } } | { t: "fail" } | { t: "stream" };
type Ev = { t: "tick"; at: number };

describe("createInlinePort", () => {
  it("round-trips a handler result", async () => {
    const port = createInlinePort<Req, Ev>((msg) => (msg.t === "echo" ? msg.data.n + 1 : undefined));
    const ack = await port.call({ t: "echo", data: { n: 1 } });
    expect(ack.result).toBe(2);
    expect(port.state).toBe("ready");
  });

  it("clones the message, so mutating it after the call changes nothing the handler saw", async () => {
    const seen: number[] = [];
    const port = createInlinePort<Req, Ev>((msg) => {
      if (msg.t === "echo") seen.push(msg.data.n);
    });
    const data = { n: 1 };
    const reply = port.call({ t: "echo", data });
    data.n = 99;
    await reply;
    expect(seen).toEqual([1]);
  });

  it("does not let the handler change the caller's object", async () => {
    const port = createInlinePort<Req, Ev>((msg) => {
      if (msg.t === "echo") msg.data.n = -1;
    });
    const data = { n: 1 };
    await port.call({ t: "echo", data });
    expect(data.n).toBe(1);
  });

  it("clones the result", async () => {
    const shared = { n: 1 };
    const port = createInlinePort<Req, Ev>(() => shared);
    const ack = await port.call({ t: "stream" });
    expect(ack.result).toEqual(shared);
    expect(ack.result).not.toBe(shared);
  });

  it("turns a throw into a rejected call with its kind", async () => {
    const port = createInlinePort<Req, Ev>(() => {
      throw Object.assign(new Error("bad"), { kind: "oops" });
    });
    await expect(port.call({ t: "fail" })).rejects.toMatchObject({ kind: "oops", message: "bad" });
  });

  it("delivers emitted events to listeners", async () => {
    const port = createInlinePort<Req, Ev>((_msg, emit) => emit({ t: "tick", at: 3 }));
    const seen: Ev[] = [];
    port.on((ev) => seen.push(ev));
    await port.call({ t: "stream" });
    expect(seen).toEqual([{ t: "tick", at: 3 }]);
  });

  it("rejects a message that cannot be cloned", async () => {
    const port = createInlinePort<Req, Ev>(() => undefined);
    const bad = { t: "echo", data: { n: () => 1 } } as unknown as Req;
    await expect(port.call(bad)).rejects.toMatchObject({ kind: "bad_message" });
  });

  it("kill rejects later calls and resolves without waiting", async () => {
    const port = createInlinePort<Req, Ev>(() => undefined);
    await port.kill();
    expect(port.state).toBe("dead");
    await expect(port.call({ t: "stream" })).rejects.toMatchObject({ kind: "worker_killed" });
  });
});
