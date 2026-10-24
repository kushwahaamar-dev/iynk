import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Client, joined, peer, roomId, serveSnapshots, startRelay } from "./helpers.js";

/** @type {Awaited<ReturnType<typeof startRelay>>} */
let env;
before(async () => {
  env = await startRelay();
});
after(() => env.relay.close());

/** @param {Client} client @param {number} count */
async function collectActions(client, count) {
  const out = [];
  while (out.length < count) out.push(await client.next("action", 5_000));
  return out;
}

test("concurrent actions reach every peer, the sender included, in one gapless order", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana");
  serveSnapshots(ana.client, () => ({ count: 0 }));
  const bea = await joined(env.url, room, "bea");
  const cy = await joined(env.url, room, "cy");
  await Promise.all([bea.client.next("state"), cy.client.next("state")]);

  // Each peer stays inside its 60-frame burst; the load test covers sustained rates.
  const perPeer = 50;
  const clients = [ana.client, bea.client, cy.client];
  clients.forEach((client, who) => {
    for (let n = 0; n < perPeer; n += 1) client.send({ t: "action", action: { type: "count/add", who, n } });
  });
  const seen = await Promise.all(clients.map((client) => collectActions(client, perPeer * clients.length)));

  const order = seen[0].map((m) => `${m.seq}:${m.from}:${m.action.n}`);
  assert.deepEqual(
    seen[0].map((m) => m.seq),
    Array.from({ length: perPeer * 3 }, (_, i) => i + 1),
  );
  for (const list of seen.slice(1)) assert.deepEqual(list.map((m) => `${m.seq}:${m.from}:${m.action.n}`), order);
  for (const [who, id] of ["ana", "bea", "cy"].entries()) {
    const mine = seen[who].filter((m) => m.from === id).map((m) => m.action.n);
    assert.deepEqual(mine, Array.from({ length: perPeer }, (_, i) => i), `${id} sees its own actions in send order`);
    assert.ok(seen[who].every((m) => m.action.who === ["ana", "bea", "cy"].indexOf(m.from)));
  }
  await Promise.all(clients.map((client) => client.close()));
});

test("a peer still waiting for its snapshot can't send actions", async () => {
  const room = roomId();
  const ana = await joined(env.url, room, "ana");
  const bea = await Client.open(env.url);
  bea.send({ t: "join", room, peer: peer("bea") });
  assert.equal((await bea.next("welcome")).sync, "snapshot");
  bea.send({ t: "action", action: { type: "wire/add" } });
  assert.equal((await bea.next("error")).code, "not_synced");
  await ana.client.none("action");
  await Promise.all([ana.client.close(), bea.close()]);
});
