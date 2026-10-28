#!/usr/bin/env node
// Load test: N peers in one room, each sending actions at R per second for S seconds, against the
// relay running as its own process. Prints relay latency (send to echo, every receiver) and checks
// that every peer saw the same gapless order. `npm run load -- --seconds 30`.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { WebSocket } from "ws";
import { peer, randomTestPort, roomId, sleep } from "./helpers.js";

const { values } = parseArgs({
  options: {
    peers: { type: "string", default: "8" },
    rate: { type: "string", default: "60" },
    seconds: { type: "string", default: "30" },
  },
});
const PEERS = Number(values.peers);
const RATE = Number(values.rate);
const SECONDS = Number(values.seconds);

const port = randomTestPort();
const serverPath = fileURLToPath(new URL("../server.js", import.meta.url));
const relay = spawn(process.execPath, [serverPath, "--port", String(port), "--host", "127.0.0.1"], {
  env: { ...process.env, LOG_LEVEL: "warn" },
  stdio: ["ignore", "inherit", "inherit"],
});
const base = `http://127.0.0.1:${port}`;

/** @returns {Promise<any>} */
async function getMetrics() {
  return (await fetch(`${base}/metrics`)).json();
}

async function waitForRelay() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(100);
  }
  throw new Error("The relay did not start.");
}

/** @typedef {{ ws: WebSocket, id: string, base: number, latencies: number[], received: number, gaps: number, limited: number, synced: Promise<void> }} LoadPeer */

/** @param {string} room @param {number} index @returns {Promise<LoadPeer>} */
function connect(room, index) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const id = `load${index}`;
  /** @type {(value?: void) => void} */
  let markSynced = () => {};
  /** @type {LoadPeer} */
  const p = { ws, id, base: -1, latencies: [], received: 0, gaps: 0, limited: 0, synced: new Promise((resolve) => (markSynced = resolve)) };
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.t === "action") {
      if (p.base >= 0 && msg.seq !== p.base + 1) p.gaps += 1;
      p.base = msg.seq;
      p.received += 1;
      p.latencies.push(performance.now() - msg.action.at);
    } else if (msg.t === "welcome") {
      if (msg.sync === "none") {
        p.base = msg.seq;
        markSynced();
      }
    } else if (msg.t === "state") {
      p.base = msg.seq;
      markSynced();
    } else if (msg.t === "snapshot-request") {
      ws.send(JSON.stringify({ t: "state", to: msg.from, seq: Math.max(0, p.base), snapshot: { load: true } }));
    } else if (msg.t === "error" && msg.code === "rate_limited") {
      p.limited += 1;
    }
  });
  return new Promise((resolve, reject) => {
    ws.once("open", () => {
      ws.send(JSON.stringify({ t: "join", room, peer: peer(id), lab: "drone", itemId: "quad5" }));
      resolve(p);
    });
    ws.once("error", reject);
  });
}

/** @param {number[]} sorted @param {number} q */
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

async function main() {
  await waitForRelay();
  const room = roomId();
  /** @type {LoadPeer[]} */
  const peers = [];
  for (let i = 0; i < PEERS; i += 1) {
    const p = await connect(room, i);
    await p.synced;
    peers.push(p);
  }

  let sent = 0;
  const start = performance.now();
  const end = start + SECONDS * 1000;
  const perPeer = new Array(PEERS).fill(0);
  /** @type {any} */
  let midMetrics = null;
  const midpoint = setTimeout(async () => {
    midMetrics = await getMetrics();
  }, (SECONDS * 1000) / 2);

  await new Promise((resolve) => {
    const timer = setInterval(() => {
      const now = performance.now();
      const due = Math.floor((Math.min(now, end) - start) * (RATE / 1000));
      peers.forEach((p, i) => {
        while (perPeer[i] < due) {
          perPeer[i] += 1;
          sent += 1;
          p.ws.send(JSON.stringify({ t: "action", action: { type: "load/tick", n: perPeer[i], at: performance.now() } }));
        }
      });
      if (now >= end) {
        clearInterval(timer);
        resolve(undefined);
      }
    }, 4);
  });
  clearTimeout(midpoint);
  await sleep(1_000);

  const latencies = peers.flatMap((p) => p.latencies).sort((a, b) => a - b);
  const expected = sent * PEERS;
  const received = peers.reduce((sum, p) => sum + p.received, 0);
  const result = {
    peers: PEERS,
    ratePerPeer: RATE,
    seconds: SECONDS,
    sent,
    expectedDeliveries: expected,
    delivered: received,
    gaps: peers.reduce((sum, p) => sum + p.gaps, 0),
    rateLimitedErrors: peers.reduce((sum, p) => sum + p.limited, 0),
    latencyMs: {
      p50: Number(quantile(latencies, 0.5).toFixed(2)),
      p90: Number(quantile(latencies, 0.9).toFixed(2)),
      p99: Number(quantile(latencies, 0.99).toFixed(2)),
      max: Number(latencies[latencies.length - 1].toFixed(2)),
    },
    relayAtMidpoint: midMetrics && { framesPerSecond: midMetrics.framesPerSecond, memoryMB: midMetrics.memoryMB, peers: midMetrics.peers },
  };
  console.log(JSON.stringify(result, null, 2));
  for (const p of peers) p.ws.close();
  const ok = received === expected && result.gaps === 0 && result.rateLimitedErrors === 0;
  if (!ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => relay.kill("SIGTERM"));
