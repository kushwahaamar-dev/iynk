import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Client, joined, peer, roomId, serveSnapshots, startRelay } from "./helpers.js";

/** @type {Awaited<ReturnType<typeof startRelay>>} */
let env;
before(async () => {
  env = await startRelay({ limits: { snapshotTimeoutMs: 150 } });
});
after(() => env.relay.close());

/** @param {Client} client @param {number} n @param {string} [type] */
function act(client, n, type = "count/add") {
  for (let i = 0; i < n; i += 1) client.send({ t: "action", action: { type, i } });
}

/** @param {Client} client @param {number} seq */
const untilSeq = (client, seq) => client.next((m) => m.t === "action" && m.seq === seq);

describe("snapshot plus replay", () => {
  test("the joiner gets the snapshot, then every action after it, and no action before it", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    act(ana.client, 5);
    await untilSeq(ana.client, 5);

    const bea = await Client.open(env.url);
    bea.send({ t: "join", room, peer: peer("bea") });
    const welcome = await bea.next("welcome");
    assert.deepEqual([welcome.sync, welcome.seq], ["snapshot", 5]);
    const request = await ana.client.next("snapshot-request");
    // The host keeps working before it answers, and answers with an older snapshot.
    act(ana.client, 3);
    await untilSeq(ana.client, 8);
    ana.client.send({ t: "state", to: request.from, seq: 5, snapshot: { count: 5 } });
    act(ana.client, 1);

    const frames = [];
    while (frames.length < 5) frames.push(await bea.next((m) => m.t === "state" || m.t === "action"));
    assert.deepEqual(frames[0], { t: "state", from: "ana", snapshot: { count: 5 }, seq: 5 });
    assert.deepEqual(
      frames.slice(1).map((m) => m.seq),
      [6, 7, 8, 9],
    );
    await Promise.all([ana.client.close(), bea.close()]);
  });

  test("a reconnect with since and epoch is replayed from the log, with no snapshot", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    await bea.client.next("state");
    act(ana.client, 4);
    await untilSeq(bea.client, 4);
    await bea.client.close();
    act(ana.client, 3);
    await untilSeq(ana.client, 7);

    const back = await Client.open(env.url);
    back.send({ t: "join", room, peer: peer("bea"), since: 4, epoch: bea.welcome.epoch });
    const welcome = await back.next("welcome");
    assert.deepEqual([welcome.sync, welcome.seq], ["replay", 7]);
    const replayed = [await back.next("action"), await back.next("action"), await back.next("action")];
    assert.deepEqual(
      replayed.map((m) => m.seq),
      [5, 6, 7],
    );
    act(ana.client, 1);
    assert.equal((await back.next("action")).seq, 8);
    await ana.client.none("snapshot-request");
    await Promise.all([ana.client.close(), back.close()]);
  });

  test("since from another epoch, or ahead of the room, falls back to a snapshot", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({ fresh: true }));
    act(ana.client, 2);
    await untilSeq(ana.client, 2);
    for (const join of [
      { since: 1, epoch: "old-epoch" },
      { since: 40, epoch: ana.welcome.epoch },
    ]) {
      const client = await Client.open(env.url);
      client.send({ t: "join", room, peer: peer("bea"), ...join });
      assert.equal((await client.next("welcome")).sync, "snapshot");
      assert.deepEqual(await client.next("state"), { t: "state", from: "ana", snapshot: { fresh: true }, seq: 2 });
      await client.close();
    }
    await ana.client.close();
  });

  test("only the asked peer may answer, and a snapshot can't be ahead of the room", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    await bea.client.next("state");
    // A host that answers late and wrong first.
    const silent = await joined(env.url, roomId(), "solo");
    silent.client.send({ t: "state", to: "bea", seq: 0, snapshot: {} });
    assert.equal((await silent.client.next("error")).code, "not_asked");
    bea.client.send({ t: "state", to: "ana", seq: 0, snapshot: {} });
    assert.equal((await bea.client.next("error")).code, "not_asked");
    await Promise.all([ana.client.close(), bea.client.close(), silent.client.close()]);

    const room2 = roomId();
    const host = await joined(env.url, room2, "host");
    const cy = await Client.open(env.url);
    cy.send({ t: "join", room: room2, peer: peer("cy") });
    await host.client.next("snapshot-request");
    host.client.send({ t: "state", to: "cy", seq: 99, snapshot: {} });
    assert.equal((await host.client.next("error")).code, "bad_message");
    await Promise.all([host.client.close(), cy.close()]);
  });
});

describe("when the snapshot source goes away", () => {
  test("the host leaving before it answers moves the request to the next synced peer", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({ from: "ana" }));
    const bea = await joined(env.url, room, "bea");
    await bea.client.next("state");
    serveSnapshots(bea.client, () => ({ from: "bea" }));
    ana.client.ws.removeAllListeners("message");
    const cy = await Client.open(env.url);
    cy.send({ t: "join", room, peer: peer("cy") });
    await cy.next("welcome");
    await ana.client.close();
    assert.deepEqual(await cy.next("host"), { t: "host", id: "bea" });
    assert.deepEqual(await cy.next("state"), { t: "state", from: "bea", snapshot: { from: "bea" }, seq: 0 });
    await Promise.all([bea.client.close(), cy.close()]);
  });

  test("with nobody holding the state, the earliest waiting peer keeps its own", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    act(ana.client, 2);
    await untilSeq(ana.client, 2);
    const bea = await Client.open(env.url);
    bea.send({ t: "join", room, peer: peer("bea") });
    await bea.next("welcome");
    const cy = await Client.open(env.url);
    cy.send({ t: "join", room, peer: peer("cy") });
    await cy.next("welcome");
    await ana.client.close();
    assert.deepEqual(await bea.next("state"), { t: "state", from: "bea", snapshot: null, seq: 2 });
    // cy is now served from bea.
    const request = await bea.next("snapshot-request");
    assert.equal(request.from, "cy");
    bea.send({ t: "state", to: "cy", seq: 2, snapshot: { local: "bea" } });
    assert.deepEqual(await cy.next("state"), { t: "state", from: "bea", snapshot: { local: "bea" }, seq: 2 });
    await Promise.all([bea.close(), cy.close()]);
  });

  test("a silent host times out and the next synced peer is asked", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    await bea.client.next("state");
    serveSnapshots(bea.client, () => ({ from: "bea" }));
    ana.client.ws.removeAllListeners("message");
    const cy = await Client.open(env.url);
    cy.send({ t: "join", room, peer: peer("cy") });
    await cy.next("welcome");
    assert.deepEqual(await cy.next("state", 1_000), { t: "state", from: "bea", snapshot: { from: "bea" }, seq: 0 });
    await Promise.all([ana.client.close(), bea.client.close(), cy.close()]);
  });

  test("when every synced peer has been asked in vain, the joiner is closed with 4010", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    const bea = await Client.open(env.url);
    bea.send({ t: "join", room, peer: peer("bea") });
    await bea.next("welcome");
    assert.equal((await bea.next("error", 1_000)).code, "snapshot_unavailable");
    assert.equal((await bea.closed).code, 4010);
    assert.deepEqual(await ana.client.next("leave"), { t: "leave", id: "bea" });
    await ana.client.close();
  });
});
