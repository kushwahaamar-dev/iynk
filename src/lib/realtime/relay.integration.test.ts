// @vitest-environment node
// Three RoomClients against the real relay in server/realtime, started on a
// random port as docs/hacktx/REALTIME.md describes. Skips (with the reason)
// when the relay or its dependencies aren't there; under CI that is a failure.

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LabStore } from "@/components/dock/types";
import { serviceMissing } from "@/test-support/require-service";
import { RoomClient } from "./room";
import { attachStore } from "./store-sync";
import { createWsTransport } from "./ws-transport";

const RELAY_DIR = join(process.cwd(), "server/realtime");
const missing = !existsSync(join(RELAY_DIR, "server.js"))
  ? "server/realtime/server.js is not written yet"
  : !existsSync(join(RELAY_DIR, "node_modules/ws"))
    ? "server/realtime has no node_modules (run npm ci there)"
    : typeof WebSocket === "undefined"
      ? "this Node has no global WebSocket"
      : null;
const skip = serviceMissing("relay", missing);

type Act = { type: string; [key: string]: unknown };
type Drone = { log: string[]; sel: string | null };

function droneStore(): LabStore<Drone, Act> {
  let state: Drone = { log: [], sel: null };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      // Picks need the keyboard (the host's); selecting a part is free, so every peer can write it.
      if (action.type === "design/pick") state = { ...state, log: [...state.log, String(action.value)] };
      else if (action.type === "select") state = { ...state, sel: (action.id as string | null) ?? null, log: [...state.log, `sel:${String(action.id)}`] };
      else if (action.type === "sync/hydrate") state = action.state as Drone;
      else return;
      for (const l of listeners) l();
    },
  };
}

/** WebSocket that the test can cut, to force a reconnect. */
const sockets = new Map<string, WebSocket[]>();
function trackedSocket(label: string): typeof WebSocket {
  return class extends WebSocket {
    constructor(url: string | URL) {
      super(url);
      sockets.set(label, [...(sockets.get(label) ?? []), this]);
    }
  };
}

async function until(check: () => boolean, ms = 4000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out waiting for the room");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

let relay: ChildProcess | null = null;
let url = "";
const rooms: RoomClient[] = [];

beforeAll(async () => {
  if (skip) return;
  const port = 40000 + Math.floor(Math.random() * 10000);
  relay = spawn(process.execPath, ["server.js", "--port", String(port)], {
    cwd: RELAY_DIR,
    env: { ...process.env, LOG_LEVEL: "silent", PORT: String(port) },
    stdio: "ignore",
  });
  url = `ws://127.0.0.1:${port}/ws`;
  const health = `http://127.0.0.1:${port}/healthz`;
  const end = Date.now() + 8000;
  for (;;) {
    try {
      if ((await fetch(health)).ok) break;
    } catch {
      // Not listening yet.
    }
    if (Date.now() > end) throw new Error("the relay did not start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}, 15_000);

afterAll(() => {
  for (const room of rooms.splice(0)) room.leave();
  relay?.kill("SIGTERM");
});

function peer(name: string, roomId: string) {
  const store = droneStore();
  const room = new RoomClient({
    id: roomId,
    link: "",
    me: { id: `${name}-${roomId}`, name, color: "#93d3b0", lang: name === "bo" ? "es" : "en", done: [] },
    lab: "drone",
    itemId: "quad5",
    transport: createWsTransport(url, { WebSocketImpl: trackedSocket(`${name}-${roomId}`), baseDelayMs: 50, maxDelayMs: 200 }),
  });
  attachStore(store, "drone", room);
  room.start();
  rooms.push(room);
  return { room, store };
}

describe.skipIf(skip)("against the real relay", () => {
  test("three clients converge on the relay's order, through snapshot and replay", async () => {
    const roomId = "nt2345";
    const a = peer("ana", roomId);
    await until(() => a.room.getState().status === "live");
    a.store.dispatch({ type: "design/pick", value: "a-before" });
    a.store.dispatch({ type: "select", id: "esc" });
    await until(() => a.store.getState().log.length === 2);

    const b = peer("bo", roomId);
    const c = peer("cy", roomId);
    await until(() => b.room.getState().status === "live" && c.room.getState().status === "live");
    expect(b.store.getState()).toEqual(a.store.getState());

    for (let i = 0; i < 5; i += 1) {
      a.store.dispatch({ type: "select", id: `a${i}` });
      b.store.dispatch({ type: "select", id: `b${i}` });
      c.store.dispatch({ type: "select", id: `c${i}` });
    }
    await until(() => [a, b, c].every((x) => x.store.getState().log.length === 17));
    expect(b.store.getState().log).toEqual(a.store.getState().log);
    expect(c.store.getState().log).toEqual(a.store.getState().log);
    expect(new Set([a, b, c].map((x) => x.room.getState().seq)).size).toBe(1);

    // Cut b's socket: it reconnects as itself, catches up and keeps the order.
    sockets.get(`bo-${roomId}`)!.at(-1)!.close();
    await until(() => b.room.getState().status !== "live");
    a.store.dispatch({ type: "design/pick", value: "while-b-away" });
    await until(() => b.room.getState().status === "live" && b.store.getState().log.length === 18);
    expect(b.store.getState().log).toEqual(a.store.getState().log);
    expect(b.room.getState().you.id).toBe(`bo-${roomId}`);
  }, 20_000);

  test("chat arrives once with the sender's language, and the host can remove a peer", async () => {
    const roomId = "nt2346";
    const a = peer("ana", roomId);
    await until(() => a.room.getState().status === "live");
    const b = peer("bo", roomId);
    await until(() => b.room.getState().status === "live" && a.room.getState().peers.length === 1);

    b.room.chat("¿Dónde va el LED?");
    await until(() => a.room.getState().messages.some((m) => m.kind === "text"));
    const line = a.room.getState().messages.find((m) => m.kind === "text")!;
    expect([line.text, line.lang, line.from]).toEqual(["¿Dónde va el LED?", "es", `bo-${roomId}`]);
    await until(() => b.room.getState().messages.filter((m) => m.kind === "text").length === 1);

    a.room.kick(`bo-${roomId}`);
    await until(() => b.room.getState().ended === "removed");
    await until(() => a.room.getState().peers.length === 0);
  }, 20_000);
});
