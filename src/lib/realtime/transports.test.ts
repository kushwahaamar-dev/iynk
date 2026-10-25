// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import { createBroadcastTransport } from "./broadcast-transport";
import type { ClientMsg, ServerMsg } from "./protocol";
import { RoomClient } from "./room";
import { attachStore } from "./store-sync";
import { createWsTransport } from "./ws-transport";

type Act = { type: string; [key: string]: unknown };
type Drone = { log: string[] };

function droneStore(): LabStore<Drone, Act> {
  let state: Drone = { log: [] };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      // Picks need the keyboard (the host's); selecting a part is free, so every tab can write it.
      if (action.type === "design/pick") state = { log: [...state.log, String(action.value)] };
      else if (action.type === "select") state = { log: [...state.log, String(action.id)] };
      else if (action.type === "sync/hydrate") state = action.state as Drone;
      else return;
      for (const l of listeners) l();
    },
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("BroadcastChannel transport", () => {
  const rooms: RoomClient[] = [];
  afterEach(() => {
    for (const room of rooms.splice(0)) room.leave();
  });

  function tab(name: string, roomId: string) {
    const store = droneStore();
    const room = new RoomClient({
      id: roomId,
      link: "",
      me: { id: name, name, color: "#76a0e2", lang: "en", done: [] },
      lab: "drone",
      itemId: "quad5",
      transport: createBroadcastTransport(roomId, { settleMs: 30, heartbeatMs: 1000 }),
    });
    attachStore(store, "drone", room);
    room.start();
    rooms.push(room);
    return { room, store };
  }

  test("three tabs agree on one host and one order", async () => {
    const roomId = "bc2345";
    const a = tab("ana", roomId);
    await wait(60);
    a.store.dispatch({ type: "design/pick", key: "motor", value: "first" });
    const b = tab("bo", roomId);
    const c = tab("cy", roomId);
    await wait(120);
    expect([b.room.getState().hostId, c.room.getState().hostId]).toEqual(["ana", "ana"]);
    for (let i = 0; i < 5; i += 1) {
      a.store.dispatch({ type: "select", id: `a${i}` });
      b.store.dispatch({ type: "select", id: `b${i}` });
      c.store.dispatch({ type: "select", id: `c${i}` });
    }
    await wait(150);
    const log = a.store.getState().log;
    expect(log).toHaveLength(16);
    expect(log[0]).toBe("first");
    expect(b.store.getState().log).toEqual(log);
    expect(c.store.getState().log).toEqual(log);
    expect(b.room.getState().peers.map((p) => p.id).sort()).toEqual(["ana", "cy"]);

    a.room.leave();
    await wait(80);
    expect(b.room.getState().hostId).toBe("bo");
    expect(c.room.getState().hostId).toBe("bo");
    c.store.dispatch({ type: "select", id: "after" });
    await wait(80);
    expect(b.store.getState().log.at(-1)).toBe("after");
    expect(c.store.getState().log).toEqual(b.store.getState().log);
  });

  test("the welcome names the host's lab item for lobby lookups", async () => {
    const roomId = "bc2346";
    tab("ana", roomId);
    await wait(60);
    const probe = createBroadcastTransport(roomId, { settleMs: 30 });
    const seen: ServerMsg[] = [];
    probe.onMessage((msg) => seen.push(msg));
    probe.start(() => ({ t: "join", room: roomId, peer: { id: "probe", name: "lobby", color: "#000000", lang: "en", status: "lobby" } }));
    await wait(80);
    const welcome = seen.find((m) => m.t === "welcome");
    expect(welcome && welcome.t === "welcome" ? welcome.room : null).toEqual({ id: roomId, lab: "drone", itemId: "quad5" });
    probe.close();
  });
});

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  serverOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  serverSend(msg: ServerMsg) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  serverClose() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe("WebSocket transport", () => {
  afterEach(() => {
    vi.useRealTimers();
    FakeSocket.instances = [];
  });

  test("joins on open, pings, reconnects with backoff and resumes as the same peer", () => {
    vi.useFakeTimers();
    const transport = createWsTransport("wss://relay.test/ws", {
      WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
      random: () => 1,
      baseDelayMs: 500,
      maxDelayMs: 4000,
      heartbeatMs: 15_000,
      deadAfterMs: 45_000,
    });
    const statuses: string[] = [];
    transport.onStatus((s) => statuses.push(s));
    const join: Extract<ClientMsg, { t: "join" }> = { t: "join", room: "abc234", peer: { id: "ana", name: "Ana", color: "#ef6a4c", lang: "es" } };
    transport.start(() => join);

    const first = FakeSocket.instances[0];
    first.serverOpen();
    expect(JSON.parse(first.sent[0])).toEqual(join);
    expect(transport.send({ t: "ping" })).toBe(false); // nothing goes out before the welcome
    first.serverSend({ t: "welcome", you: "ana", room: "abc234", peers: [], host: "ana", seq: 0 });
    expect(statuses).toEqual(["open"]);
    vi.advanceTimersByTime(15_000);
    expect(first.sent.at(-1)).toBe('{"t":"ping"}');

    // Two failed attempts double the wait: 500 ms, then 1000 ms.
    first.serverClose();
    expect(statuses.at(-1)).toBe("reconnecting");
    vi.advanceTimersByTime(499);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].serverClose();
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    const third = FakeSocket.instances[2];
    third.serverOpen();
    expect(JSON.parse(third.sent[0]).peer.id).toBe("ana");
    third.serverSend({ t: "welcome", you: "ana", room: "abc234", peers: [], host: "ana", seq: 3 });
    expect(statuses.at(-1)).toBe("open");

    // A socket that goes silent for over 45 s is dropped at the next heartbeat (60 s) and
    // replaced after the first backoff step, since the welcome reset the attempts.
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(3);
    vi.advanceTimersByTime(500);
    expect(FakeSocket.instances).toHaveLength(4);
    transport.close();
    expect(statuses.at(-1)).toBe("closed");
  });

  test("frames over 64 KB are refused instead of sent", () => {
    const transport = createWsTransport("wss://relay.test/ws", { WebSocketImpl: FakeSocket as unknown as typeof WebSocket });
    transport.start(() => ({ t: "join", room: "abc234", peer: { id: "ana", name: "Ana", color: "#ef6a4c", lang: "en" } }));
    const socket = FakeSocket.instances[0];
    socket.serverOpen();
    socket.serverSend({ t: "welcome", you: "ana", room: "abc234", peers: [], host: "ana", seq: 0 });
    expect(transport.send({ t: "chat", id: "x", text: "a".repeat(70_000), lang: "en", kind: "text" })).toBe(false);
    expect(transport.send({ t: "chat", id: "y", text: "hello", lang: "en", kind: "text" })).toBe(true);
    transport.close();
  });
});
