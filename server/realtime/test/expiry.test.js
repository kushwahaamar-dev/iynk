import assert from "node:assert/strict";
import { test } from "node:test";
import { Client, joined, json, peer, roomId, sleep, startRelay } from "./helpers.js";

/** @param {string} base */
const metrics = async (base) => json(await fetch(`${base}/metrics`));

test("an empty room keeps its history for the TTL, then is gone", async () => {
  const env = await startRelay({ limits: { roomTtlMs: 300 } });
  try {
    const room = roomId();
    const first = await joined(env.url, room, "ana");
    first.client.send({ t: "action", action: { type: "wire/add" } });
    await first.client.next("action");
    await first.client.close();

    const back = await joined(env.url, room, "ana");
    assert.deepEqual([back.welcome.seq, back.welcome.epoch], [1, first.welcome.epoch]);
    await back.client.close();
    assert.equal((await metrics(env.base)).rooms, 1);

    await sleep(600);
    assert.equal((await metrics(env.base)).rooms, 0);
    const fresh = await joined(env.url, room, "ana");
    assert.equal(fresh.welcome.seq, 0);
    assert.notEqual(fresh.welcome.epoch, first.welcome.epoch);
    await fresh.client.close();
  } finally {
    await env.relay.close();
  }
});

test("a peer that stops answering is dropped after the timeout, and the others see it leave", async () => {
  const env = await startRelay({ limits: { heartbeatMs: 60, peerTimeoutMs: 250 } });
  try {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    // A browser answers WebSocket pings by itself; this client is a dead one.
    const ghost = await Client.open(env.url, { autoPong: false });
    ghost.send({ t: "join", room, peer: peer("ghost") });
    await ghost.next("welcome");
    const keepAlive = setInterval(() => ana.client.send({ t: "ping" }), 50);
    assert.deepEqual(await ana.client.next("leave", 2_000), { t: "leave", id: "ghost" });
    // ana answered pings (automatically) and is still there.
    await sleep(300);
    clearInterval(keepAlive);
    assert.equal((await metrics(env.base)).peers, 1);
    await ana.client.close();
  } finally {
    await env.relay.close();
  }
});

test("shutdown drains: peers are closed with 1012 and healthz turns 503", async () => {
  const env = await startRelay();
  const { client } = await joined(env.url, roomId(), "ana");
  const closing = env.relay.close();
  assert.equal((await client.closed).code, 1012);
  await closing;
  await assert.rejects(fetch(`${env.base}/healthz`));
});

test("healthz reports draining while peers are still closing", async () => {
  const env = await startRelay({ limits: { shutdownGraceMs: 400 } });
  // A client that stops reading never answers the close handshake, so the relay keeps draining.
  const { client } = await joined(env.url, roomId(), "ana");
  client.ws.pause();
  const closing = env.relay.close();
  const health = await fetch(`${env.base}/healthz`);
  assert.equal(health.status, 503);
  assert.equal((await json(health)).draining, true);
  await closing;
  client.ws.resume();
  client.ws.terminate();
});
