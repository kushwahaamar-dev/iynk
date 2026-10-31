// Deterministic virtual network + property test (fast-check) for the op-log design.
import fc from "fast-check";
import { Client } from "./client.js";
import { Server } from "./server.js";
import { FILES, PART_TYPES, canonical, danglingWires, hash } from "./doc.js";

const N_CLIENTS = 5;

class Net {
  constructor(server, clients, delays, bugs) {
    this.server = server;
    this.clients = clients;
    this.now = 0;
    this.conns = new Array(clients.length).fill(null);
    this.live = new Set();
    this.delays = delays;
    this.d = 0;
    this.bugs = bugs;
    this.counters = { msgs: 0, dropped: 0, disconnects: 0, reconnects: 0, welcomeSnap: 0, welcomeTail: 0 };
  }
  delay() {
    return this.delays[this.d++ % this.delays.length];
  }
  push(q, msg, from) {
    const last = q.length ? q[q.length - 1].at : 0;
    q.push({ at: Math.max(last, this.now + this.delay()), msg });
    this.counters.msgs++;
  }
  connect(i) {
    const conn = { c2s: [], s2c: [], alive: true, i };
    this.conns[i] = conn;
    const c = this.clients[i];
    c.send = (m) => conn.alive && this.conns[i] === conn && this.push(conn.c2s, m);
    c.onConnect();
    this.counters.reconnects++;
  }
  disconnect(i) {
    const conn = this.conns[i];
    if (!conn) return;
    this.counters.dropped += conn.c2s.length + conn.s2c.length;
    conn.alive = false;
    this.live.delete(conn);
    this.conns[i] = null;
    this.clients[i].onDisconnect();
    this.counters.disconnects++;
  }
  nextDue(limit) {
    let best = null;
    for (const conn of this.conns) {
      if (!conn) continue;
      for (const q of [conn.c2s, conn.s2c]) {
        if (q.length && q[0].at <= limit && (!best || q[0].at < best.q[0].at)) best = { conn, q };
      }
    }
    return best;
  }
  run(until) {
    for (;;) {
      const b = this.nextDue(until);
      if (!b) break;
      const { conn, q } = b;
      const { at, msg } = q.shift();
      this.now = Math.max(this.now, at);
      if (q === conn.c2s) this.serverRecv(conn, msg);
      else this.clients[conn.i].receive(msg);
    }
    this.now = Math.max(this.now, until);
  }
  serverRecv(conn, m) {
    const s = this.server;
    if (m.t === "hello") {
      const w = s.hello(m.lastSeq);
      if (w.snapshot) this.counters.welcomeSnap++;
      else this.counters.welcomeTail++;
      this.push(conn.s2c, {
        t: "welcome",
        snapshot: w.snapshot,
        entries: w.entries.map((e) => s.frame(e, this.clients[conn.i].cid)),
      });
      this.live.add(conn);
    } else if (m.t === "op") {
      const r = s.submit(m.cid, m.opId, m.baseRev, m.op);
      if (r.type === "reject") this.push(conn.s2c, { t: "reject", opId: r.opId, reason: r.reason });
      else if (r.dup) this.push(conn.s2c, s.frame(r.entry, m.cid));
      else {
        for (const c of this.live) this.push(c.s2c, s.frame(r.entry, this.clients[c.i].cid));
      }
    }
  }
}

const rnd = (r, n) => (n <= 0 ? 0 : r % n);

export function genOp(c, kind, r) {
  const v = c.view();
  const pids = Object.keys(v.parts);
  const wids = Object.keys(v.wires);
  const pick = (arr, x) => arr[rnd(x, arr.length)];
  switch (kind) {
    case 0: {
      // add part, with a small chance of reusing an existing id (duplicate-id rejection)
      const dupe = pids.length && rnd(r[0], 30) === 0;
      return { k: "addPart", id: dupe ? pick(pids, r[1]) : c.nextId("p"), type: pick(PART_TYPES, r[2]), x: rnd(r[1], 1000), y: rnd(r[2], 1000) };
    }
    case 1:
      return pids.length ? { k: "movePart", id: pick(pids, r[0]), x: rnd(r[1], 1000), y: rnd(r[2], 1000) } : null;
    case 2:
      return pids.length ? { k: "delPart", id: pick(pids, r[0]) } : null;
    case 3: {
      if (!pids.length) return null;
      // chance of wiring to a part id that this client has seen deleted or never saw
      const ghost = rnd(r[2], 8) === 0 ? `${rnd(r[0], N_CLIENTS)}-p${1 + rnd(r[1], 400)}` : null;
      return { k: "addWire", id: c.nextId("w"), from: { p: pick(pids, r[0]), pin: rnd(r[1], 16) }, to: { p: ghost ?? pick(pids, r[1] + r[2]), pin: rnd(r[2], 16) } };
    }
    case 4:
      return wids.length ? { k: "delWire", id: pick(wids, r[0]) } : null;
    case 5: {
      const file = pick(FILES, r[0]);
      const t = v.code[file];
      const del = t.length > 0 && rnd(r[2], 3) === 0 ? 1 + rnd(r[1], Math.min(12, t.length)) : 0;
      const ins = rnd(r[2], 4) === 0 && del > 0 ? "" : "abcdefghij".slice(0, 1 + rnd(r[0], 8)).replace(/./g, (ch, i) => String.fromCharCode(97 + ((r[1] + i) % 26)));
      return { k: "editCode", file, pos: rnd(r[1], t.length + 1), del: Math.min(del, t.length), ins };
    }
    default:
      return null;
  }
}

/** Runs one scenario; returns stats, throws on violation. */
export function runScenario(steps, { retention = Infinity, ckptEvery = 100, bugs = {}, delays = [3, 11, 40, 1, 25, 7, 90, 2], evUp = 10, keep = false } = {}) {
  const server = new Server({ retention, ckptEvery: Number.isFinite(retention) ? Math.max(1, Math.floor(retention / 2)) : ckptEvery, bugs });
  const clients = Array.from({ length: N_CLIENTS }, (_, i) => new Client(`c${i}`, () => {}, bugs));
  const net = new Net(server, clients, delays, bugs);
  clients.forEach((_, i) => net.connect(i));
  let opSteps = 0;
  const checkChains = () => {
    for (const c of clients) {
      if (c.lastSeq > server.seq) throw new Error("client ahead of server");
      if (!bugs.clientDrop && c.chain !== server.chains[c.lastSeq]) throw new Error(`${c.cid}: chain differs at seq ${c.lastSeq}`);
    }
  };
  for (const s of steps) {
    net.run(net.now + s.dt);
    if (s.ev < 4) net.disconnect(s.ec % N_CLIENTS);
    else if (s.ev < evUp) {
      const down = clients.map((_, i) => i).filter((i) => !net.conns[i]);
      if (down.length) net.connect(down[s.ec % down.length]);
    }
    const c = clients[s.c];
    if (s.kind === 6) {
      c.undo();
      opSteps++;
    } else {
      // bias away from unbounded growth
      let kind = s.kind;
      const v = c.view();
      if (Object.keys(v.parts).length > 40 && kind === 0) kind = 2;
      const op = genOp(c, kind, s.r);
      if (op) c.submit(op);
      opSteps++;
    }
    if (opSteps % 997 === 0) checkChains();
  }
  // quiescence: reconnect everyone, drain
  for (let i = 0; i < N_CLIENTS; i++) if (!net.conns[i]) net.connect(i);
  for (let round = 0; round < 1000; round++) {
    net.run(net.now + 1000);
    if (clients.every((c) => !c.pending.length && !c.inflight && c.ready) && !net.nextDue(Infinity)) break;
  }
  const errors = [];
  if (net.nextDue(Infinity)) errors.push("network not quiescent");
  const sh = hash(server.state);
  const sc = canonical(server.state);
  for (const c of clients) {
    if (c.pending.length || c.inflight) errors.push(`${c.cid} still has pending ops`);
    if (c.lastSeq !== server.seq) errors.push(`${c.cid} at seq ${c.lastSeq}, server at ${server.seq}`);
    if (canonical(c.confirmed) !== sc) errors.push(`${c.cid} confirmed state differs (hash ${hash(c.confirmed).slice(0, 8)} vs ${sh.slice(0, 8)})`);
    if (canonical(c.view()) !== sc) errors.push(`${c.cid} view differs from server after quiescence`);
    if (danglingWires(c.confirmed).length) errors.push(`${c.cid} has dangling wires`);
    if (c.chain !== server.chains[server.seq]) errors.push(`${c.cid} chain differs`);
  }
  if (danglingWires(server.state).length) errors.push("server has dangling wires");
  // acknowledged ops: each acked opId is in the server log exactly once, at the seq the client was told
  const seen = new Map();
  if (retention === Infinity) {
    for (const e of server.log) {
      if (seen.has(e.opId)) errors.push(`opId ${e.opId} applied twice`);
      seen.set(e.opId, e.seq);
    }
    for (const c of clients) for (const [opId, seq] of c.acked) if (seen.get(opId) !== seq) errors.push(`${c.cid} acked ${opId}@${seq} but log has ${seen.get(opId)}`);
    const totalAcked = clients.reduce((a, c) => a + c.acked.size, 0);
    // ops applied that no client saw acked would be "lost acks" (client resent and got dropped); every applied op must be acked
    if (totalAcked !== server.seq) errors.push(`acked ${totalAcked} != applied ${server.seq}`);
  }
  const gen = clients.reduce((a, c) => a + c.stats.generated, 0);
  const rej = clients.reduce((a, c) => a + c.stats.rejected, 0);
  const li = clients.reduce((a, c) => a + c.stats.localInvalid, 0);
  if (!bugs.noDedup && gen !== server.seq + rej + li) errors.push(`generated ${gen} != applied ${server.seq} + rejected ${rej} + localInvalid ${li}`);
  if (errors.length) throw new Error(errors.slice(0, 6).join("; "));
  return {
    opSteps,
    generated: gen,
    applied: server.seq,
    rejectedByServer: rej,
    rejectReasons: server.rejectReasons,
    localInvalid: li,
    undos: clients.reduce((a, c) => a + c.stats.undos, 0),
    resends: clients.reduce((a, c) => a + c.stats.resends, 0),
    dedupHits: server.counters.dups,
    staleBase: server.counters.staleBase,
    ...net.counters,
    virtualMs: Math.round(net.now),
    finalParts: Object.keys(server.state.parts).length,
    finalWires: Object.keys(server.state.wires).length,
    codeLen: Object.values(server.state.code).map((t) => t.length),
    hash: sh.slice(0, 12),
    ...(keep ? { server } : {}),
  };
}

export const stepArb = fc.record({
  c: fc.integer({ min: 0, max: N_CLIENTS - 1 }),
  kind: fc.oneof(
    { weight: 14, arbitrary: fc.constant(0) },
    { weight: 18, arbitrary: fc.constant(1) },
    { weight: 10, arbitrary: fc.constant(2) },
    { weight: 12, arbitrary: fc.constant(3) },
    { weight: 6, arbitrary: fc.constant(4) },
    { weight: 25, arbitrary: fc.constant(5) },
    { weight: 15, arbitrary: fc.constant(6) },
  ),
  r: fc.tuple(fc.nat(1e6), fc.nat(1e6), fc.nat(1e6)),
  dt: fc.integer({ min: 0, max: 25 }),
  ev: fc.integer({ min: 0, max: 99 }),
  ec: fc.nat(100),
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] ?? 10);
  const nOps = Number(process.argv[3] ?? 10000);
  const retentionArg = process.argv[4] === undefined ? undefined : Number(process.argv[4]);
  const t0 = performance.now();
  let i = 0;
  const all = [];
  fc.assert(
    fc.property(fc.array(stepArb, { minLength: nOps, maxLength: nOps }), fc.constantFrom(Infinity, 400, 150), (steps, retention) => {
      const stats = runScenario(steps, { retention: retentionArg ?? retention, evUp: Number(process.env.EV_UP ?? 10) });
      all.push({ retention: retentionArg ?? retention, ...stats });
      console.log(++i, JSON.stringify({ retention: retentionArg ?? retention, ...stats }));
      return true;
    }),
    { numRuns: runs, endOnFailure: true },
  );
  console.log(`PASS ${runs} runs x ${nOps} ops in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}
