import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Client, joined, peer, roomId, serveSnapshots, startRelay } from "./helpers.js";

/** @type {Awaited<ReturnType<typeof startRelay>>} */
let env;
before(async () => {
  env = await startRelay();
});
after(() => env.relay.close());

test("when the host leaves, the earliest remaining peer becomes host", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana");
  serveSnapshots(ana.client, () => ({}));
  const bea = await joined(env.url, room, "bea");
  await bea.client.next("state");
  serveSnapshots(bea.client, () => ({}));
  const cy = await joined(env.url, room, "cy");
  await cy.client.next("state");
  assert.equal(cy.welcome.host, "ana");

  await ana.client.close();
  for (const c of [bea.client, cy.client]) {
    assert.deepEqual(await c.next("leave"), { t: "leave", id: "ana" });
    assert.deepEqual(await c.next("host"), { t: "host", id: "bea" });
  }
  // A non-host leaving changes nothing.
  const dee = await joined(env.url, room, "dee");
  assert.equal(dee.welcome.host, "bea");
  await dee.client.close();
  assert.deepEqual(await cy.client.next("leave"), { t: "leave", id: "dee" });
  await cy.client.none("host");

  await bea.client.close();
  assert.deepEqual(await cy.client.next("host"), { t: "host", id: "cy" });
  // The new host can kick; the old rule followed the role.
  const eve = await joined(env.url, room, "eve");
  cy.client.send({ t: "kick", id: "eve" });
  assert.equal((await eve.client.closed).code, 4003);
  await cy.client.close();
});

test("a reconnect with the same id takes over its old place and stays host", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana", { peer: { role: "coder" } });
  serveSnapshots(ana.client, () => ({ v: 1 }));
  const bea = await joined(env.url, room, "bea");
  await bea.client.next("state");
  serveSnapshots(bea.client, () => ({ v: 2 }));

  const again = await Client.open(env.url);
  again.send({ t: "join", room, peer: peer("ana", { name: "Ana (phone)" }) });
  const welcome = await again.next("welcome");
  assert.equal(welcome.host, "ana");
  assert.deepEqual(
    welcome.peers.map((/** @type {{ id: string }} */ p) => p.id),
    ["ana", "bea"],
  );
  assert.equal(welcome.sync, "snapshot");
  assert.deepEqual(await again.next("state"), { t: "state", from: "bea", snapshot: { v: 2 }, seq: 0 });
  assert.equal((await ana.client.next("error")).code, "replaced");
  assert.equal((await ana.client.closed).code, 4001);

  const update = await bea.client.next("peer");
  assert.equal(update.peer.name, "Ana (phone)");
  await bea.client.none("leave");
  await Promise.all([again.close(), bea.client.close()]);
});

test("the room keeps 8 places and the host's place moves through them in join order", async () => {
  const room = roomId();
  const clients = [];
  for (let i = 0; i < 8; i += 1) {
    const { client } = await joined(env.url, room, `p${i}`);
    serveSnapshots(client, () => ({}));
    clients.push(client);
  }
  for (let i = 0; i < 7; i += 1) {
    await clients[i].close();
    assert.deepEqual(await clients[7].next("host"), { t: "host", id: `p${i + 1}` });
  }
  await clients[7].close();
});
