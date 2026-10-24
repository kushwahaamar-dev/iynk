import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { LabKind, LabStore } from "@/components/dock/types";
import { FakeRelay } from "./__fixtures__/relay";
import { RoomClient } from "./room";
import { attachStore } from "./store-sync";

type Act = { type: string; [key: string]: unknown };

type Drone = { pick: Record<string, string>; log: string[]; sel: string | null; tab: string };

function makeStore<S>(init: S, reduce: (s: S, a: Act) => S): LabStore<S, Act> {
  let state = init;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
  };
}

const droneInit: Drone = { pick: {}, log: [], sel: null, tab: "design" };

function droneReduce(s: Drone, a: Act): Drone {
  switch (a.type) {
    case "design/pick":
      return { ...s, pick: { ...s.pick, [String(a.key)]: String(a.value) }, log: [...s.log, `${String(a.key)}=${String(a.value)}`] };
    case "select":
      return { ...s, sel: (a.id as string | null) ?? null };
    case "tab":
      return { ...s, tab: String(a.tab) };
    case "sync/hydrate": {
      const from = a.state as Drone;
      return { ...from, tab: s.tab };
    }
    default:
      return s;
  }
}

type Board = { code: string; view: string };

function boardReduce(s: Board, a: Act): Board {
  if (a.type === "code/replace") return a.code === s.code ? s : { ...s, code: String(a.code) };
  if (a.type === "view/set") return { ...s, view: String(a.view) };
  if (a.type === "sync/hydrate") return { ...(a.state as Board) };
  return s;
}

// A tiny deterministic random, so latencies differ per client but every run is the same.
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

function join<S>(relay: FakeRelay, name: string, store: LabStore<S, Act>, latency: () => number, lab: LabKind = "drone", itemId = "quad5") {
  const transport = relay.connect(latency);
  const room = new RoomClient({
    id: "abc234",
    link: `https://simlab.test/en/drones/${itemId}?room=abc234`,
    me: { id: name, name, color: "#ef6a4c", lang: "en", done: [] },
    lab,
    itemId,
    transport,
    snapshotTimeoutMs: 5000,
  });
  const detach = attachStore(store, lab, room, { debounceMs: 100, maxWaitMs: 300 });
  room.start();
  return { room, store, transport, detach };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ordering and convergence", () => {
  test("three clients apply every shared action in the relay's seq order, their own included", () => {
    const relay = new FakeRelay();
    const random = seeded(7);
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 30);
    vi.advanceTimersByTime(200);
    const c = join(relay, "cy", makeStore(droneInit, droneReduce), () => 1 + Math.floor(random() * 50));
    vi.advanceTimersByTime(400);
    expect([a, b, c].map((x) => x.room.getState().status)).toEqual(["live", "live", "live"]);

    for (let i = 0; i < 6; i += 1) {
      a.store.dispatch({ type: "design/pick", key: "motor", value: `a${i}` });
      b.store.dispatch({ type: "design/pick", key: "prop", value: `b${i}` });
      c.store.dispatch({ type: "design/pick", key: "frame", value: `c${i}` });
      vi.advanceTimersByTime(7);
    }
    // No optimistic apply: nothing has come back from the relay for this tick's dispatch yet.
    a.store.dispatch({ type: "design/pick", key: "battery", value: "late" });
    expect(a.store.getState().log).not.toContain("battery=late");

    vi.advanceTimersByTime(1000);
    const relayOrder = relay.stamped.map(({ action }) => `${String(action.key)}=${String(action.value)}`);
    expect(relayOrder).toHaveLength(19);
    const logs = [a, b, c].map((x) => x.store.getState().log);
    expect(logs[0]).toEqual(relayOrder);
    expect(logs[1]).toEqual(relayOrder);
    expect(logs[2]).toEqual(relayOrder);
    expect(new Set([a, b, c].map((x) => x.room.getState().seq))).toEqual(new Set([relay.rooms.get("abc234")!.seq]));
  });

  test("local actions stay on their own screen", () => {
    const relay = new FakeRelay();
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(200);
    a.store.dispatch({ type: "tab", tab: "wiring" });
    vi.advanceTimersByTime(200);
    expect(a.store.getState().tab).toBe("wiring");
    expect(b.store.getState().tab).toBe("design");
    expect(relay.stamped).toHaveLength(0);
  });
});

describe("joining", () => {
  test("a joiner takes the host's snapshot, then replays what came after it", () => {
    const relay = new FakeRelay();
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    a.store.dispatch({ type: "design/pick", key: "motor", value: "2207" });
    a.store.dispatch({ type: "select", id: "esc" });
    vi.advanceTimersByTime(100);

    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 40);
    // b's welcome is on its way (it lands at 80 ms, the snapshot at 90 ms): this action is
    // stamped after the welcome's seq and reaches b before the snapshot does.
    vi.advanceTimersByTime(41);
    a.store.dispatch({ type: "design/pick", key: "prop", value: "5x4.3" });
    vi.advanceTimersByTime(44);
    expect(b.room.getState().status).toBe("syncing");
    // And this one is stamped after the snapshot was taken.
    a.store.dispatch({ type: "design/pick", key: "battery", value: "4s" });
    vi.advanceTimersByTime(500);

    expect(b.room.getState().status).toBe("live");
    expect(b.store.getState().log).toEqual(a.store.getState().log);
    expect(b.store.getState().sel).toBe("esc");
    expect(b.store.getState().log).toEqual(["motor=2207", "prop=5x4.3", "battery=4s"]);
  });

  test("a store without sync/hydrate is rebuilt from its own actions", () => {
    const relay = new FakeRelay();
    const plain = (s: Drone, a: Act) => (a.type === "sync/hydrate" ? s : droneReduce(s, a));
    const a = join(relay, "ana", makeStore(droneInit, plain), () => 5);
    vi.advanceTimersByTime(50);
    a.store.dispatch({ type: "design/pick", key: "motor", value: "2207" });
    a.store.dispatch({ type: "select", id: "fc" });
    vi.advanceTimersByTime(100);
    const b = join(relay, "bo", makeStore(droneInit, plain), () => 5);
    vi.advanceTimersByTime(300);
    expect(b.store.getState().pick).toEqual({ motor: "2207" });
    expect(b.store.getState().sel).toBe("fc");
  });

  test("the host leaving hands the room to the next peer, which answers the next joiner", () => {
    const relay = new FakeRelay();
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(100);
    a.store.dispatch({ type: "design/pick", key: "motor", value: "2306" });
    vi.advanceTimersByTime(100);
    a.room.leave();
    vi.advanceTimersByTime(100);
    expect(b.room.getState().hostId).toBe("bo");
    const c = join(relay, "cy", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(300);
    expect(c.store.getState().log).toEqual(["motor=2306"]);
    expect(b.room.getState().messages.map((m) => m.system?.event)).toEqual(["leave", "host", "join"]);
  });
});

describe("reconnecting", () => {
  test("a peer that drops resumes as itself and catches up", () => {
    const relay = new FakeRelay();
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 10);
    vi.advanceTimersByTime(200);
    b.transport.drop(400);
    vi.advanceTimersByTime(20);
    expect(b.room.getState().status).toBe("reconnecting");
    a.store.dispatch({ type: "design/pick", key: "motor", value: "2207" });
    // b's own action while offline waits in its outbox and goes out after the resume.
    b.store.dispatch({ type: "design/pick", key: "prop", value: "51466" });
    vi.advanceTimersByTime(1000);
    expect(b.room.getState().status).toBe("live");
    expect(b.room.getState().you.id).toBe("bo");
    expect(b.store.getState().log).toEqual(a.store.getState().log);
    expect(a.store.getState().log).toEqual(["motor=2207", "prop=51466"]);
  });
});

describe("the keyboard baton", () => {
  test("only the holder edits code; the others follow the debounced full text", () => {
    const relay = new FakeRelay();
    const board = () => makeStore<Board>({ code: "void setup() {}", view: "board" }, boardReduce);
    const a = join(relay, "ana", board(), () => 5, "board", "uno-r3");
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", board(), () => 5, "board", "uno-r3");
    vi.advanceTimersByTime(200);
    expect(a.room.getState().batonHolder).toBe("ana");

    b.store.dispatch({ type: "code/replace", code: "hacked" });
    expect(b.store.getState().code).toBe("void setup() {}");
    expect(b.room.getState().batonDenied).toBe(1);

    // The holder sees its own typing at once, and its echo never rewinds it.
    a.store.dispatch({ type: "code/replace", code: "void setup() { pinMode(13" });
    expect(a.store.getState().code).toBe("void setup() { pinMode(13");
    vi.advanceTimersByTime(120);
    a.store.dispatch({ type: "code/replace", code: "void setup() { pinMode(13, OUTPUT); }" });
    vi.advanceTimersByTime(15);
    expect(a.store.getState().code).toBe("void setup() { pinMode(13, OUTPUT); }");
    vi.advanceTimersByTime(400);
    expect(b.store.getState().code).toBe("void setup() { pinMode(13, OUTPUT); }");

    a.room.passBaton("bo");
    vi.advanceTimersByTime(100);
    expect(b.room.getState().batonHolder).toBe("bo");
    expect(a.room.getState().batonHolder).toBe("bo");
    b.store.dispatch({ type: "code/replace", code: "// bo was here" });
    vi.advanceTimersByTime(400);
    expect(a.store.getState().code).toBe("// bo was here");
    const lines = a.room.getState().messages.filter((m) => m.system?.event === "baton");
    expect(lines).toHaveLength(1);
  });
});

describe("chat and peers", () => {
  test("chat reaches everyone once, and the host can remove a peer", () => {
    const relay = new FakeRelay();
    const a = join(relay, "ana", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(50);
    const b = join(relay, "bo", makeStore(droneInit, droneReduce), () => 5);
    vi.advanceTimersByTime(200);
    b.room.chat("  hola, ¿quién conecta el LED?  ", "text", { lang: "es" });
    vi.advanceTimersByTime(100);
    const texts = (x: typeof a) => x.room.getState().messages.filter((m) => m.kind === "text");
    expect(texts(a).map((m) => [m.text, m.lang, m.from])).toEqual([["hola, ¿quién conecta el LED?", "es", "bo"]]);
    expect(texts(b)).toHaveLength(1);
    expect(texts(b)[0].pending).toBe(false);

    b.room.kick("ana");
    a.room.kick("bo");
    vi.advanceTimersByTime(100);
    expect(b.room.getState().ended).toBe("removed");
    expect(a.room.getState().peers).toEqual([]);
    expect(a.room.getState().messages.at(-1)?.system?.event).toBe("removed");
  });
});
