import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createLogger } from "../src/log.js";
import { capText } from "../src/protocol.js";
import { Client, joined, json, peer, roomId, serveSnapshots, startRelay } from "./helpers.js";

/** @type {Awaited<ReturnType<typeof startRelay>>} */
let env;
/** @type {string[]} */
const logLines = [];

before(async () => {
  env = await startRelay({ logger: createLogger("debug", (line) => logLines.push(line)) });
});
after(() => env.relay.close());

describe("join and welcome", () => {
  test("the first peer is host and owns the state", async () => {
    const room = roomId();
    const { client, welcome } = await joined(env.url, room, "ana", { join: { lab: "drone", itemId: "quad5" } });
    assert.equal(welcome.you, "ana");
    assert.equal(welcome.room, room);
    assert.equal(welcome.host, "ana");
    assert.equal(welcome.seq, 0);
    assert.equal(welcome.sync, "none");
    assert.equal(welcome.lab, "drone");
    assert.equal(welcome.itemId, "quad5");
    assert.match(welcome.epoch, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(welcome.peers, [{ id: "ana", name: "Peer ana", color: "tomato", lang: "en", done: [] }]);
    await client.close();
  });

  test("a second peer is announced, the host is asked for a snapshot and the joiner gets it", async () => {
    const room = roomId();
    const host = await joined(env.url, room, "ana", { peer: { role: "wirer", done: ["board:uno-r3:lesson:blink"] } });
    serveSnapshots(host.client, () => ({ wires: 3 }));
    const bea = await joined(env.url, room, "bea", { peer: { lang: "es", color: "#1f6feb" } });
    assert.equal(bea.welcome.sync, "snapshot");
    assert.equal(bea.welcome.host, "ana");
    assert.deepEqual(
      bea.welcome.peers.map((/** @type {{ id: string }} */ p) => p.id),
      ["ana", "bea"],
    );
    assert.equal(bea.welcome.peers[0].role, "wirer");
    assert.deepEqual(bea.welcome.peers[0].done, ["board:uno-r3:lesson:blink"]);
    const announced = await host.client.next("peer");
    assert.deepEqual(announced.peer, { id: "bea", name: "Peer bea", color: "#1f6feb", lang: "es", done: [] });
    assert.deepEqual(await host.client.next("snapshot-request"), { t: "snapshot-request", from: "bea" });
    assert.deepEqual(await bea.client.next("state"), { t: "state", from: "ana", snapshot: { wires: 3 }, seq: 0 });
    await Promise.all([host.client.close(), bea.client.close()]);
  });

  test("names are cleaned and capped at 24 graphemes", async () => {
    const long = "👩‍💻".repeat(30);
    assert.equal(capText(long, 24), "👩‍💻".repeat(24));
    const { client, welcome } = await joined(env.url, roomId(), "zed", { peer: { name: "  Zoë‮ \n\t Ali  " } });
    assert.equal(welcome.peers[0].name, "Zoë Ali");
    await client.close();
  });

  test("a bad join is refused and closed with 4000", async () => {
    const client = await Client.open(env.url);
    client.send({ t: "join", room: "ABCDEF", peer: peer("ana") });
    const error = await client.next("error");
    assert.equal(error.code, "bad_message");
    assert.match(error.message, /room/);
    assert.equal((await client.closed).code, 4000);
  });

  test("a join without a name, or with an unknown locale, is refused", async () => {
    for (const bad of [{ name: "   " }, { lang: "pt" }, { color: "red; background:url(x)" }]) {
      const client = await Client.open(env.url);
      client.send({ t: "join", room: roomId(), peer: peer("ana", bad) });
      assert.equal((await client.next("error")).code, "bad_message");
      assert.equal((await client.closed).code, 4000);
    }
  });
});

describe("frame checks", () => {
  test("bad frames get an error and the socket stays open", async () => {
    const client = await Client.open(env.url);
    client.send("not json");
    assert.equal((await client.next("error")).code, "bad_json");
    client.send("[1,2]");
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "teleport" });
    assert.equal((await client.next("error")).code, "bad_type");
    client.send({ t: "__proto__" });
    assert.equal((await client.next("error")).code, "bad_type");
    client.send({ t: "action", action: { type: "x" } });
    assert.equal((await client.next("error")).code, "not_joined");
    client.ws.send(Buffer.from([1, 2, 3]), { binary: true });
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "ping" });
    await client.next("pong");
    client.send({ t: "join", room: roomId(), peer: peer("ana") });
    await client.next("welcome");
    client.send({ t: "join", room: roomId(), peer: peer("ana") });
    assert.equal((await client.next("error")).code, "already_joined");
    client.send({ t: "action", action: { type: "" } });
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "action", action: [1] });
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "cursor", x: "1", y: 0 });
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "pose", p: [0, 0], q: [0, 0, 0, 1] });
    assert.equal((await client.next("error")).code, "bad_message");
    client.send({ t: "ping" });
    await client.next("pong");
    await client.close();
  });
});

describe("fan-out", () => {
  test("chat reaches everyone, the sender too, cleaned, capped and stamped", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana", { peer: { name: "Ana" } });
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    const text = `hola\u0007 ${"x".repeat(600)}`;
    const before = Date.now();
    ana.client.send({ t: "chat", id: "m1", text, lang: "es", kind: "voice" });
    const seen = await Promise.all([ana.client.next("chat"), bea.client.next("chat")]);
    for (const msg of seen) {
      assert.equal(msg.from, "ana");
      assert.equal(msg.name, "Ana");
      assert.equal(msg.id, "m1");
      assert.equal(msg.lang, "es");
      assert.equal(msg.kind, "voice");
      assert.equal([...msg.text].length, 500);
      assert.ok(msg.text.startsWith("hola x"));
      assert.ok(msg.ts >= before && msg.ts <= Date.now());
    }
    ana.client.send({ t: "chat", id: "m2", text: "  \n ", lang: "en", kind: "text" });
    assert.equal((await ana.client.next("error")).code, "bad_message");
    await Promise.all([ana.client.close(), bea.client.close()]);
  });

  test("a joiner gets the recent chat right after its welcome", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    for (let i = 0; i < 3; i += 1) ana.client.send({ t: "chat", id: `m${i}`, text: `line ${i}`, lang: "en", kind: "text" });
    await ana.client.next((m) => m.t === "chat" && m.id === "m2");
    const bea = await Client.open(env.url);
    bea.send({ t: "join", room, peer: peer("bea") });
    await bea.next("welcome");
    const backlog = [await bea.next(), await bea.next(), await bea.next()];
    assert.deepEqual(
      backlog.map((m) => [m.t, m.id]),
      [
        ["chat", "m0"],
        ["chat", "m1"],
        ["chat", "m2"],
      ],
    );
    await Promise.all([ana.client.close(), bea.close()]);
  });

  test("cursor and pose go to the others only", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    ana.client.send({ t: "cursor", x: 1.7, y: -2 });
    assert.deepEqual(await bea.client.next("cursor"), { t: "cursor", from: "ana", x: 1, y: 0 });
    ana.client.send({ t: "pose", p: [1, 2, 3], q: [0, 0, 0, 1], v: 4.5, gate: 2, extra: "dropped" });
    assert.deepEqual(await bea.client.next("pose"), { t: "pose", p: [1, 2, 3], q: [0, 0, 0, 1], v: 4.5, gate: 2, from: "ana" });
    await ana.client.none((m) => m.t === "cursor" || m.t === "pose");
    await Promise.all([ana.client.close(), bea.client.close()]);
  });

  test("presence is merged, echoed to everyone, and the baton has one holder", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    ana.client.send({ t: "presence", role: "coder", status: "fixing the LED", baton: true });
    for (const c of [ana.client, bea.client]) {
      assert.deepEqual(await c.next("presence"), { t: "presence", from: "ana", role: "coder", status: "fixing the LED", baton: true });
    }
    bea.client.send({ t: "presence", baton: true, done: ["drone:quad5:test:props-off"] });
    for (const c of [ana.client, bea.client]) {
      assert.deepEqual(await c.next("presence"), { t: "presence", from: "ana", baton: false });
      assert.deepEqual(await c.next("presence"), { t: "presence", from: "bea", baton: true, done: ["drone:quad5:test:props-off"] });
    }
    ana.client.send({ t: "presence", role: null, name: "Ana B." });
    await bea.client.next((m) => m.t === "presence" && m.role === null && m.name === "Ana B.");
    const cy = await joined(env.url, room, "cy");
    const records = Object.fromEntries(cy.welcome.peers.map((/** @type {{ id: string }} */ p) => [p.id, p]));
    assert.deepEqual(records.ana, { id: "ana", name: "Ana B.", color: "tomato", lang: "en", done: [], status: "fixing the LED" });
    assert.equal(records.bea.baton, true);
    await Promise.all([ana.client.close(), bea.client.close(), cy.client.close()]);
  });
});

describe("kick and item binding", () => {
  test("only the host can remove a peer, and the removed id can't come back", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana");
    serveSnapshots(ana.client, () => ({}));
    const bea = await joined(env.url, room, "bea");
    bea.client.send({ t: "kick", id: "ana" });
    assert.equal((await bea.client.next("error")).code, "not_host");
    ana.client.send({ t: "kick", id: "nobody" });
    assert.equal((await ana.client.next("error")).code, "bad_target");
    ana.client.send({ t: "kick", id: "bea" });
    assert.equal((await bea.client.next("error")).code, "kicked");
    assert.equal((await bea.client.closed).code, 4003);
    assert.deepEqual(await ana.client.next("leave"), { t: "leave", id: "bea" });
    const again = await Client.open(env.url);
    again.send({ t: "join", room, peer: peer("bea") });
    assert.equal((await again.next("error")).code, "kicked");
    assert.equal((await again.closed).code, 4003);
    await ana.client.close();
  });

  test("a room is bound to one lab item; an empty room rebinds with a new history", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana", { join: { lab: "board", itemId: "uno-r3" } });
    const lobby = await joined(env.url, room, "lou");
    assert.equal(lobby.welcome.lab, "board");
    await lobby.client.close();
    const wrong = await Client.open(env.url);
    wrong.send({ t: "join", room, peer: peer("bea"), lab: "drone", itemId: "quad5" });
    const error = await wrong.next("error");
    assert.deepEqual([error.code, error.lab, error.itemId], ["wrong_item", "board", "uno-r3"]);
    assert.equal((await wrong.closed).code, 4009);
    const epoch = ana.welcome.epoch;
    await ana.client.close();
    const bea = await joined(env.url, room, "bea", { join: { lab: "drone", itemId: "quad5" } });
    assert.equal(bea.welcome.lab, "drone");
    assert.notEqual(bea.welcome.epoch, epoch);
    await bea.client.close();
  });
});

describe("http", () => {
  test("healthz and metrics", async () => {
    const health = await fetch(`${env.base}/healthz`);
    assert.equal(health.status, 200);
    assert.equal((await json(health)).ok, true);
    const { client } = await joined(env.url, roomId(), "ana");
    const metrics = await json(await fetch(`${env.base}/metrics`));
    assert.ok(metrics.rooms >= 1);
    assert.ok(metrics.peers >= 1);
    assert.equal(typeof metrics.framesPerSecond.in, "number");
    assert.equal(typeof metrics.framesPerSecond.out, "number");
    assert.equal((await fetch(`${env.base}/nope`)).status, 404);
    assert.equal((await fetch(`${env.base}/ws`)).status, 426);
    assert.equal((await fetch(`${env.base}/healthz`, { method: "POST" })).status, 405);
    await client.close();
  });

  test("origins outside the allow-list are refused before the upgrade", async () => {
    const strict = await startRelay({ origins: "https://simlab.tech, https://*.vercel.app" });
    try {
      await assert.rejects(Client.open(strict.url, { origin: "https://evil.example" }), /HTTP 403/);
      await assert.rejects(Client.open(strict.url, { origin: "http://localhost:3000" }), /HTTP 403/);
      await assert.rejects(Client.open(`ws://127.0.0.1:${strict.port}/other`), /HTTP 404/);
      for (const origin of ["https://simlab.tech", "https://simlab-git-main.vercel.app", undefined]) {
        const client = await Client.open(strict.url, { origin });
        await client.close();
      }
      const cors = await fetch(`${strict.base}/healthz`, { headers: { origin: "https://simlab.tech" } });
      assert.equal(cors.headers.get("access-control-allow-origin"), "https://simlab.tech");
      const blocked = await fetch(`${strict.base}/healthz`, { headers: { origin: "https://evil.example" } });
      assert.equal(blocked.headers.get("access-control-allow-origin"), null);
    } finally {
      await strict.relay.close();
    }
    const dev = await startRelay();
    try {
      const client = await Client.open(dev.url, { origin: "http://localhost:3000" });
      await client.close();
      await assert.rejects(Client.open(dev.url, { origin: "https://simlab.tech" }), /HTTP 403/);
    } finally {
      await dev.relay.close();
    }
  });

  test("logs hold metadata only: no chat text, names, actions or snapshots", async () => {
    const room = roomId();
    const ana = await joined(env.url, room, "ana", { peer: { name: "SecretName" } });
    serveSnapshots(ana.client, () => ({ secret: "SecretSnapshot" }));
    const bea = await joined(env.url, room, "bea");
    await bea.client.next("state");
    ana.client.send({ t: "chat", id: "m1", text: "SecretChat", lang: "en", kind: "text" });
    ana.client.send({ t: "action", action: { type: "SecretAction", value: "SecretValue" } });
    await bea.client.next("action");
    await Promise.all([ana.client.close(), bea.client.close()]);
    const all = logLines.join("\n");
    assert.ok(all.includes('"event":"snapshot"'));
    for (const secret of ["SecretName", "SecretSnapshot", "SecretChat", "SecretAction", "SecretValue"]) assert.ok(!all.includes(secret), secret);
    for (const line of logLines) assert.doesNotThrow(() => JSON.parse(line));
  });
});
