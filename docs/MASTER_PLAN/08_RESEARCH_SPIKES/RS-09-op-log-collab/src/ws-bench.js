// Reconnect time and throughput over a real localhost WebSocket.
import fc from "fast-check";
import { WebSocket, WebSocketServer } from "ws";
import { Client } from "./client.js";
import { Server } from "./server.js";
import { canonical } from "./doc.js";
import { genOp, runScenario, stepArb } from "./sim.js";
import os from "node:os";
import zlib from "node:zlib";

const PORT = 47091; // not 3000, not 43117
const load = () => os.loadavg()[0].toFixed(2);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

function startWs(server, { batched }) {
  const wss = new WebSocketServer({ port: PORT });
  const live = new Set();
  wss.on("connection", (ws) => {
    let cid = null;
    ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.t === "hello") {
        cid = m.cid;
        const w = server.hello(m.lastSeq);
        const frames = w.entries.map((e) => server.frame(e, cid));
        if (batched) ws.send(JSON.stringify({ t: "welcome", snapshot: w.snapshot, entries: frames }));
        else {
          ws.send(JSON.stringify({ t: "welcome-head", snapshot: w.snapshot, n: frames.length }));
          for (const f of frames) ws.send(JSON.stringify(f));
        }
        live.add({ ws, cid });
      } else if (m.t === "op") {
        const r = server.submit(m.cid, m.opId, m.baseRev, m.op);
        if (r.type === "reject") ws.send(JSON.stringify({ t: "reject", opId: r.opId, reason: r.reason }));
        else if (r.dup) ws.send(JSON.stringify(server.frame(r.entry, m.cid)));
        else for (const c of live) if (c.ws.readyState === 1) c.ws.send(JSON.stringify(server.frame(r.entry, c.cid)));
      }
    });
    ws.on("close", () => { for (const c of live) if (c.ws === ws) live.delete(c); });
  });
  return { close: () => new Promise((r) => { for (const c of wss.clients) c.terminate(); wss.close(r); }) };
}

/** A client that already holds the log up to seq `upTo` (applied offline), then reconnects over ws. */
function reconnectOnce(server, upTo, { batched }, src = server) {
  return new Promise((resolve, reject) => {
    const c = new Client("rc", () => {});
    let bytes = 0;
    if (upTo > 0) {
      // reproduce what a client with a stale replica holds: replay from the closest checkpoint, or the log head
      const ck = src.ckpts.filter((k) => k.seq <= upTo).pop();
      const base = ck ? JSON.parse(ck.json) : null;
      if (base) { c.confirmed = base.state; c.chain = base.chain; c.lastSeq = ck.seq; }
      for (const e of src.log) if (e.seq > c.lastSeq && e.seq <= upTo) c.onApply(src.frame(e, "x"));
      if (c.lastSeq !== upTo) return reject(new Error(`could not build client at ${upTo}, got ${c.lastSeq}`));
    }
    let expect = null;
    const t0 = performance.now();
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    c.send = (m) => ws.send(JSON.stringify(m));
    const done = () => {
      const ms = performance.now() - t0;
      const same = canonical(c.confirmed) === canonical(server.state) && c.lastSeq === server.seq;
      ws.close();
      resolve({ ms, bytes, same, snap: c.stats.snapshots });
    };
    ws.on("open", () => c.onConnect());
    ws.on("message", (raw) => {
      bytes += raw.length;
      const m = JSON.parse(raw);
      if (m.t === "welcome") { c.receive(m); done(); }
      else if (m.t === "welcome-head") {
        if (m.snapshot) { c.receive({ t: "welcome", snapshot: m.snapshot, entries: [] }); }
        expect = m.n;
        if (expect === 0) done();
      } else if (m.t === "apply") {
        c.onApply(m);
        if (--expect === 0) { c.ready = true; done(); }
      }
    });
    ws.on("error", reject);
  });
}

async function reconnectCase(label, server, upTo, opts, reps = 9, src = server) {
  const ws = startWs(server, opts);
  await new Promise((r) => setTimeout(r, 100));
  const ms = [];
  let bytes = 0, same = true, snap = 0;
  for (let i = 0; i < reps; i++) {
    const l = load();
    const r = await reconnectOnce(server, upTo, opts, src);
    ms.push(r.ms); bytes = r.bytes; same &&= r.same; snap = r.snap;
    if (Number(l) > 10) console.log("  WARNING load", l);
  }
  await ws.close();
  const row = { label, mode: opts.batched ? "batched" : "per-frame", fromSeq: upTo, serverSeq: server.seq, via: snap ? "snapshot+tail" : "tail", medianMs: +median(ms).toFixed(1), minMs: +Math.min(...ms).toFixed(1), maxMs: +Math.max(...ms).toFixed(1), kB: +(bytes / 1024).toFixed(1), identical: same, load: load() };
  console.log(JSON.stringify(row));
  return row;
}

async function main() {
  console.log("uptime load at start:", load());
  const [steps] = fc.sample(fc.array(stepArb, { minLength: 26000, maxLength: 26000 }), { numRuns: 1, seed: 7 });
  const big = runScenario(steps, { keep: true, evUp: 10 }).server;
  console.log("built server log: seq", big.seq, "state parts", Object.keys(big.state.parts).length, "wires", Object.keys(big.state.wires).length, "code chars", Object.values(big.state.code).map((t) => t.length));
  console.log("final-state JSON bytes:", JSON.stringify(big.state).length);
  const rows = [];
  for (const batched of [true, false]) {
    rows.push(await reconnectCase("tail 1,000", big, big.seq - 1000, { batched }));
    rows.push(await reconnectCase("tail 10,000", big, big.seq - 10000, { batched }));
  }
  const gz = (n) => zlib.gzipSync(JSON.stringify({ t: "welcome", entries: big.log.slice(-n).map((e) => big.frame(e, "x")) })).length;
  console.log("gzip size of batched tail: 1,000 ops", gz(1000), "bytes; 10,000 ops", gz(10000), "bytes");
  // bounded server: retention 2,000, checkpoint every 1,000
  const small = new Server({ retention: 2000, ckptEvery: 1000 });
  for (const e of big.log) small.submit(e.cid, e.opId, small.seq, e.op);
  if (small.seq !== big.seq) throw new Error("replay into bounded server diverged in length");
  rows.push(await reconnectCase("snapshot+tail (client at 0, fresh join)", small, 0, { batched: true }));
  rows.push(await reconnectCase("snapshot+tail (client 10,000 behind, window 2,000)", small, small.seq - 10000, { batched: true }, 9, big));
  // tail 0: caught up
  rows.push(await reconnectCase("caught up (0 tail)", big, big.seq, { batched: true }));
  console.log("ROWS", JSON.stringify(rows));

  // throughput: server core, no network
  const core = new Server();
  const ops = [];
  for (let i = 0; i < 20; i++) ops.push({ k: "addPart", id: `s-${i}`, type: "led", x: i, y: i });
  for (const [i, o] of ops.entries()) core.submit("s", `s:${i}`, core.seq, o);
  const N = 200000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    const op = i % 3 === 0 ? { k: "editCode", file: "main.ino", pos: (i * 7) % 50, del: i % 5 === 0 ? 1 : 0, ins: "xy" } : { k: "movePart", id: `s-${i % 20}`, x: i % 1000, y: (i * 3) % 1000 };
    core.submit("s", `s:${i + 100}`, core.seq - (i % 4), op);
  }
  const coreMs = performance.now() - t0;
  console.log(JSON.stringify({ test: "server core (validate+apply+seq+sha1 chain+log), no network", ops: N, ms: Math.round(coreMs), opsPerSec: Math.round(N / (coreMs / 1000)), load: load() }));

  // throughput: 5 clients over ws, closed loop window 1, 10 s
  const server = new Server({ retention: 5000, ckptEvery: 1000 });
  const ws = startWs(server, { batched: true });
  await new Promise((r) => setTimeout(r, 100));
  const lat = [];
  const sentAt = new Map();
  let stop = false;
  const clients = [];
  for (let i = 0; i < 5; i++) {
    const sock = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const c = new Client(`w${i}`, (m) => { if (m.t === "op") sentAt.set(m.opId, performance.now()); sock.send(JSON.stringify(m)); });
    let k = 0;
    const more = () => {
      if (stop) return;
      let op;
      for (let tries = 0; !op && tries < 5; tries++) {
        const r = [(k * 7919) % 1000003, (k * 104729) % 1000003, (k * 1299709) % 1000003];
        k++;
        op = genOp(c, [0, 1, 1, 5, 5, 3, 4, 2][k % 8], r);
      }
      if (!op) op = { k: "addPart", id: c.nextId("p"), type: "led", x: k % 1000, y: 1 };
      if (!c.submit(op)) setImmediate(more);
    };
    const origApply = c.onApply.bind(c);
    c.onApply = (f) => {
      const was = c.inflight && c.inflight.opId === f.opId && f.cid === c.cid;
      if (was) lat.push(performance.now() - sentAt.get(f.opId));
      origApply(f);
      if (was) more();
    };
    const origRecv = c.receive.bind(c);
    c.receive = (m) => { const wasInflight = c.inflight; origRecv(m); if (m.t === "reject" && wasInflight) { lat.push(performance.now() - sentAt.get(m.opId)); more(); } if (m.t === "welcome") more(); };
    sock.on("open", () => c.onConnect());
    sock.on("message", (raw) => c.receive(JSON.parse(raw)));
    clients.push({ c, sock });
  }
  const T = performance.now();
  await new Promise((r) => setTimeout(r, 10000));
  stop = true;
  const dur = (performance.now() - T) / 1000;
  await new Promise((r) => setTimeout(r, 300));
  console.log(JSON.stringify({ test: "5 ws clients, window 1, 10 s, all in one Node process", resolvedOps: lat.length, applied: server.seq, rejected: server.counters.rejected, opsPerSec: Math.round(lat.length / dur), appliedPerSec: Math.round(server.seq / dur), p50ms: +pct(lat, 0.5).toFixed(2), p95ms: +pct(lat, 0.95).toFixed(2), p99ms: +pct(lat, 0.99).toFixed(2), load: load() }));
  const same = clients.every(({ c }) => canonical(c.confirmed) === canonical(server.state));
  console.log("replicas identical after throughput run:", same, "clients lastSeq", clients.map(({ c }) => c.lastSeq), "server", server.seq);
  for (const { sock } of clients) sock.close();
  await ws.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
