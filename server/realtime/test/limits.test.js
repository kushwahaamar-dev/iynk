import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Client, joined, peer, roomId, serveSnapshots, sleep, startRelay } from "./helpers.js";

/** @type {Awaited<ReturnType<typeof startRelay>>} */
let env;
before(async () => {
  env = await startRelay();
});
after(() => env.relay.close());

test("a ninth peer is refused with room_full and 4004", async () => {
  const room = roomId();
  const clients = [];
  for (let i = 0; i < 8; i += 1) {
    const { client } = await joined(env.url, room, `p${i}`);
    serveSnapshots(client, () => ({}));
    clients.push(client);
  }
  const ninth = await Client.open(env.url);
  ninth.send({ t: "join", room, peer: peer("p8") });
  assert.equal((await ninth.next("error")).code, "room_full");
  assert.equal((await ninth.closed).code, 4004);
  await Promise.all(clients.map((client) => client.close()));
});

test("frames over 64 KB are refused; a state frame may carry a 512 KB snapshot", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana");
  ana.client.send({ t: "action", action: { type: "code/replace", text: "x".repeat(64 * 1024) } });
  assert.equal((await ana.client.next("error")).code, "too_large");
  ana.client.send({ t: "action", action: { type: "code/replace", text: "x".repeat(60 * 1024) } });
  assert.equal((await ana.client.next("action")).seq, 1);

  const bea = await Client.open(env.url);
  bea.send({ t: "join", room, peer: peer("bea") });
  await ana.client.next("snapshot-request");
  ana.client.send({ t: "state", to: "bea", seq: 1, snapshot: "y".repeat(513 * 1024) });
  assert.equal((await ana.client.next("error")).code, "too_large");
  const snapshot = "z".repeat(512 * 1024 - 64);
  ana.client.send({ t: "state", to: "bea", seq: 1, snapshot });
  const state = await bea.next("state");
  assert.equal(state.snapshot.length, snapshot.length);
  await Promise.all([ana.client.close(), bea.close()]);
});

test("over 60 frames a second: the excess is dropped with at most one error a second", async () => {
  const { client } = await joined(env.url, roomId(), "ana");
  await sleep(1_100);
  for (let i = 0; i < 100; i += 1) client.send({ t: "action", action: { type: "tick", i } });
  await client.next((m) => m.t === "action" && m.action.i === 59, 3_000);
  await sleep(200);
  const actions = client.inbox.filter((m) => m.t === "action");
  const errors = client.inbox.filter((m) => m.t === "error");
  assert.ok(actions.length >= 60 && actions.length < 70, `relayed ${actions.length}`);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "rate_limited");
  await client.close();
});

test("a sustained flood is cut off with 1008", async () => {
  const flood = await startRelay({ limits: { floodDrops: 50 } });
  try {
    const { client } = await joined(flood.url, roomId(), "ana");
    for (let i = 0; i < 200; i += 1) client.send({ t: "ping" });
    assert.equal((await client.closed).code, 1008);
  } finally {
    await flood.relay.close();
  }
});

test("cursor and pose frames above 20 a second are dropped silently", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana");
  serveSnapshots(ana.client, () => ({}));
  const bea = await joined(env.url, room, "bea");
  await bea.client.next("state");
  for (let i = 0; i < 40; i += 1) ana.client.send({ t: "cursor", x: i / 40, y: 0.5 });
  await sleep(300);
  const cursors = bea.client.inbox.filter((m) => m.t === "cursor").length;
  assert.ok(cursors >= 10 && cursors <= 17, `relayed ${cursors}`);
  assert.equal(ana.client.inbox.filter((m) => m.t === "error").length, 0);
  await Promise.all([ana.client.close(), bea.client.close()]);
});

test("join must come within the join timeout", async () => {
  const quick = await startRelay({ limits: { joinTimeoutMs: 100 } });
  try {
    const client = await Client.open(quick.url);
    assert.equal((await client.next("error")).code, "join_timeout");
    assert.equal((await client.closed).code, 4000);
  } finally {
    await quick.relay.close();
  }
});

test("connection and room caps", async () => {
  const capped = await startRelay({ limits: { maxConnectionsPerIp: 2, maxRooms: 1 } });
  try {
    const a = await joined(capped.url, roomId(), "ana");
    const b = await Client.open(capped.url);
    await assert.rejects(Client.open(capped.url), /HTTP 429/);
    b.send({ t: "join", room: roomId(), peer: peer("bea") });
    assert.equal((await b.next("error")).code, "server_full");
    assert.equal((await b.closed).code, 1013);
    await a.client.close();
  } finally {
    await capped.relay.close();
  }
});
