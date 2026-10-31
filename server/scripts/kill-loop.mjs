// Kills a real server process between COMMIT and ack and at random moments, restarts it, resumes two members,
// resends what was never acknowledged and audits the log.
//   node server/scripts/kill-loop.mjs --runs 50 --sync full|normal --seed 1
import { spawn } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { newProjectId } from "../../src/core/ids.ts";
import { blankProject } from "../../src/project/blank.ts";
import { chainStart, stateHash } from "../../src/project/hash.ts";
import { toCanonicalText } from "../../src/project/normalize.ts";
import { OP_SCHEMA } from "../../src/protocol/frames.ts";
import { deriveDeviceId, deriveIdentityId, keyThumbprint, toBase64Url } from "../../src/protocol/identity.ts";
import { realDeps } from "../src/deps.ts";
import { registerDevice } from "../src/identity/devices.ts";
import { randomBase32, verifyChainFull } from "../src/rooms/checkpoint.ts";
import { openStore } from "../src/store/sqlite.ts";
import { createRoomsRepo, packDoc } from "../src/store/rooms.ts";
import { signedBytes } from "../src/ws/auth.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
const CRASH_MAIN = fileURLToPath(new URL("../test/support/crash-main.ts", import.meta.url));
const SERVER_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const SEED_BATCHES = 50;
const SEED_BATCH_OPS = 4;
const STREAM_OPS = 200;
const TICK_MS = 5;
const TRIPLE_EVERY = 4;
const WAIT_MS = 15_000;
const KILL_BACKSTOP_MS = 5000;

const { values } = parseArgs({
  options: { runs: { type: "string", default: "50" }, sync: { type: "string", default: "full" }, seed: { type: "string", default: "1" } },
});
const runs = Number(values.runs);
const sync = values.sync;
const seed = Number(values.seed);
if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(seed) || (sync !== "full" && sync !== "normal")) {
  console.error("usage: kill-loop.mjs --runs N --sync full|normal --seed N");
  process.exit(2);
}

function seeded(start) {
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(what, ready) {
  const stop = Date.now() + WAIT_MS;
  while (!ready()) {
    if (Date.now() > stop) throw new Error(`timed out waiting for ${what}`);
    await sleep(10);
  }
}

function makeKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const spki = new Uint8Array(publicKey.export({ format: "der", type: "spki" }));
  return {
    spki,
    deviceId: deriveDeviceId(spki),
    identityId: deriveIdentityId(spki),
    thumbprint: keyThumbprint(spki),
    sign: (bytes) => toBase64Url(new Uint8Array(sign("sha256", bytes, { key: privateKey, dsaEncoding: "ieee-p1363" }))),
  };
}

function freePort(rng) {
  return new Promise((resolve) => {
    const port = 47000 + Math.floor(rng() * 1000);
    const probe = createServer();
    probe.once("error", () => resolve(freePort(rng)));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(port)));
  });
}

function openAt(dir) {
  return openStore({ path: join(dir, "iynk.db"), sync, migrationsDir: MIGRATIONS_DIR, backupsDir: join(dir, "backups"), serverVersion: SERVER_VERSION }, realDeps());
}

function seedRoom(dir, rng, keys) {
  const store = openAt(dir);
  const deps = realDeps();
  const repo = createRoomsRepo(store);
  const random = (n) => Uint8Array.from({ length: n }, () => Math.floor(rng() * 256));
  const now = Date.now();
  try {
    for (const [index, key] of keys.entries()) {
      store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: `Member ${index}`, maxIdentities: 100 }));
    }
    const [a, b] = keys;
    const blank = blankProject({ board: "uno", title: "Crash test", locale: "en", actor: a.identityId, now: new Date(now).toISOString(), id: newProjectId(now, { bytes: random }) });
    const doc = {
      ...blank,
      actors: [...blank.actors, { id: b.identityId, name: "Member 1" }],
      access: { ...blank.access, grants: [{ actor: b.identityId, role: "editor" }] },
      history: { baseRevision: blank.revision, baseChain: chainStart(blank.id), checkpoints: [], ops: [] },
    };
    const id = `rm_${randomBase32(random, 16)}`;
    const member = (key, role, index) => ({
      room_id: id,
      device_id: key.deviceId,
      actor: key.identityId,
      role,
      spectator: false,
      muted: false,
      banned: false,
      name: `Member ${index}`,
      color: "#e5484d",
      joined_at: now,
    });
    repo.createRoom(
      {
        id,
        project_id: doc.id,
        title: "Crash test",
        creator_device: a.deviceId,
        host_actor: a.identityId,
        epoch: randomBase32(random, 8),
        opschema: OP_SCHEMA,
        settings: { codeMode: "baton", runControl: "editors", spectatorCursors: false, locked: false, maxMembers: 8, maxSpectators: 8 },
        created_at: now,
      },
      { room_id: id, seq: doc.revision, state_hash: stateHash(doc), chain: chainStart(doc.id), doc: packDoc(toCanonicalText(doc)), at: now, kind: "genesis" },
      member(a, "owner", 0),
    );
    repo.upsertMember(member(b, "editor", 1));
    return id;
  } finally {
    store.close();
  }
}

function startServer(dir, port, killOnCommit) {
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", CRASH_MAIN], {
    env: {
      PATH: process.env.PATH,
      IYNK_DATA_DIR: dir,
      IYNK_PUBLIC_URL: origin,
      IYNK_ALLOWED_ORIGINS: origin,
      IYNK_PORT: String(port),
      IYNK_STORE_SYNC: sync,
      IYNK_LOG_LEVEL: "error",
      KILL_ON_COMMIT: String(killOnCommit),
    },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const server = { child, exited: false, listening: false };
  child.once("exit", () => {
    server.exited = true;
  });
  child.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("listening")) server.listening = true;
  });
  server.stop = async (signal) => {
    if (!server.exited) child.kill(signal);
    await until("the server to exit", () => server.exited);
  };
  return until("the server to listen", () => server.listening || server.exited).then(() => {
    if (server.exited) throw new Error("the server exited before it listened");
    return server;
  });
}

class Member {
  constructor(label, key, room, origin, problems) {
    this.label = label;
    this.key = key;
    this.room = room;
    this.origin = origin;
    this.problems = problems;
    this.acked = new Map();
    this.unacked = new Map();
    this.submissions = [];
    this.sub = 0;
    this.n = 0;
    this.seen = 0;
    this.chain = null;
    this.epoch = null;
    this.ready = false;
    this.ws = null;
  }

  connect(port) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { origin: this.origin } });
      this.ws = ws;
      ws.on("message", (data) => this.#frame(JSON.parse(data.toString("utf8")), resolve));
      ws.on("close", () => {
        this.ready = false;
      });
      ws.on("error", reject);
    });
  }

  drop() {
    this.ready = false;
    this.ws?.terminate();
  }

  #frame(f, ready) {
    switch (f.t) {
      case "challenge":
        this.ws.send(
          JSON.stringify({
            t: "hello",
            protocol: 2,
            app: "kill-loop",
            opSchema: OP_SCHEMA,
            device: this.key.deviceId,
            room: this.room,
            sig: this.key.sign(signedBytes(f.aud, f.nonce, this.room)),
            caps: [],
            ...(this.epoch === null ? {} : { resume: { epoch: this.epoch, seq: this.seen, chain: this.chain } }),
          }),
        );
        break;
      case "welcome":
        this.epoch = f.room.epoch;
        break;
      case "snapshot":
        this.seen = f.seq;
        this.chain = f.chain;
        break;
      case "tail":
        this.seen = f.to;
        this.chain = f.chain;
        break;
      case "ready":
        this.ready = true;
        ready();
        break;
      case "commit":
        this.#commit(f);
        break;
      case "reject":
      case "error":
        this.problems.push(`${this.label}: unexpected ${f.t} ${f.code}: ${f.message}`);
        break;
    }
  }

  #commit(f) {
    if (!f.ack?.dup) {
      if (f.seq0 !== this.seen + 1) this.problems.push(`${this.label}: commit ${f.seq0}..${f.seq1} after seq ${this.seen}`);
      this.seen = f.seq1;
      this.chain = f.chain;
    }
    if (!f.ack) return;
    const submission = this.unacked.get(f.ack.sub);
    if (!submission) return;
    this.unacked.delete(f.ack.sub);
    if (f.seq1 - f.seq0 + 1 !== submission.opIds.length) this.problems.push(`${this.label}: ack for sub ${f.ack.sub} covers ${f.seq0}..${f.seq1}`);
    submission.opIds.forEach((opId, i) => this.acked.set(opId, f.seq0 + i));
    submission.dup = f.ack.dup === true;
    submission.done?.();
  }

  submit(count) {
    if (!this.ready) return null;
    this.sub += 1;
    const opIds = [];
    const ops = [];
    for (let i = 0; i < count; i += 1) {
      this.n += 1;
      const opId = `op_${this.label}_${this.n}`;
      opIds.push(opId);
      ops.push({ opId, base: this.seen, op: { k: "meta.set", set: { title: `${this.label} ${this.n}` } } });
    }
    const submission = { sub: this.sub, opIds, ops, dup: false, resent: false };
    this.unacked.set(this.sub, submission);
    this.submissions.push(submission);
    this.#send(submission);
    return submission;
  }

  resend() {
    for (const submission of this.unacked.values()) {
      submission.resent = true;
      this.#send(submission);
    }
  }

  #send(submission) {
    this.ws.send(JSON.stringify({ t: "submit", sub: submission.sub, ops: submission.ops }));
  }
}

function stream(members, quota) {
  let sent = 0;
  let tick = 0;
  let finish;
  const done = new Promise((resolve) => {
    finish = resolve;
  });
  const timer = setInterval(() => {
    tick += 1;
    const count = tick % TRIPLE_EVERY === 0 ? 3 : 1;
    const made = members[tick % members.length].submit(count);
    if (made) sent += count;
    if (sent >= quota) {
      clearInterval(timer);
      finish();
    }
  }, TICK_MS);
  return { done, stop: () => clearInterval(timer) };
}

function readLog(dir, room) {
  const store = openAt(dir);
  try {
    const repo = createRoomsRepo(store);
    const rows = repo.loadTail(room, 0, 1_000_000);
    const seqsByOp = new Map();
    for (const row of rows) {
      const env = JSON.parse(Buffer.from(row.env).toString("utf8"));
      seqsByOp.set(env.opId, [...(seqsByOp.get(env.opId) ?? []), row.seq]);
    }
    return { seqsByOp, chain: verifyChainFull(repo, room), seq: repo.getRoom(room).seq, rows: rows.length };
  } finally {
    store.close();
  }
}

function halfApplied(submissions, log) {
  return submissions.filter((s) => {
    const seqs = s.opIds.map((id) => log.seqsByOp.get(id)?.[0]);
    const present = seqs.filter((seq) => seq !== undefined).length;
    return present !== 0 && (present !== s.opIds.length || seqs.some((seq, i) => seq !== seqs[0] + i));
  });
}

async function oneRun(index, rng, totals) {
  const dir = mkdtempSync(join(tmpdir(), "iynk-kill-"));
  const problems = [];
  let server = null;
  const members = [];
  try {
    const keys = [makeKey(), makeKey()];
    const room = seedRoom(dir, rng, keys);
    const port = await freePort(rng);
    const origin = `http://127.0.0.1:${port}`;
    members.push(...keys.map((key, i) => new Member(i === 0 ? "a" : "b", key, room, origin, problems)));
    const [first] = members;

    const atCommit = index % 2 === 0;
    const killAfterCommits = SEED_BATCHES + 1 + Math.floor(rng() * 60);
    server = await startServer(dir, port, atCommit ? killAfterCommits : 0);
    await Promise.all(members.map((m) => m.connect(port)));

    for (let i = 0; i < SEED_BATCHES; i += 1) {
      const made = first.submit(SEED_BATCH_OPS);
      await new Promise((resolve) => {
        made.done = resolve;
      });
    }

    const killer = stream(members, Infinity);
    const delay = 30 + Math.floor(rng() * 370);
    const backstop = setTimeout(() => server.child.kill("SIGKILL"), atCommit ? KILL_BACKSTOP_MS : delay);
    await until("the kill", () => server.exited);
    clearTimeout(backstop);
    killer.stop();
    members.forEach((m) => m.drop());

    const afterKill = readLog(dir, room);
    const unackedAtKill = members.flatMap((m) => [...m.unacked.values()]);
    for (const submission of unackedAtKill) {
      submission.expectDup = submission.opIds.every((id) => afterKill.seqsByOp.has(id));
    }

    server = await startServer(dir, port, 0);
    await Promise.all(members.map((m) => m.connect(port)));
    members.forEach((m) => m.resend());
    const rest = stream(members, STREAM_OPS);
    await rest.done;
    await until("every submission to be acknowledged", () => members.every((m) => m.unacked.size === 0));
    members.forEach((m) => m.drop());
    await server.stop("SIGTERM");

    const log = readLog(dir, room);
    const all = members.flatMap((m) => m.submissions);
    const lost = [];
    for (const m of members) {
      for (const [opId, seq] of m.acked) if (log.seqsByOp.get(opId)?.length !== 1 || log.seqsByOp.get(opId)[0] !== seq) lost.push(opId);
    }
    const copies = [...log.seqsByOp].filter(([, seqs]) => seqs.length > 1).map(([opId]) => opId);
    const wrongDup = unackedAtKill.filter((s) => s.dup !== s.expectDup).map((s) => s.opIds[0]);
    const half = [...halfApplied(all, afterKill), ...halfApplied(all, log)];

    totals.ackedOps += members.reduce((n, m) => n + m.acked.size, 0);
    totals.unackedAtKill += unackedAtKill.length;
    totals.committedBeforeAck += unackedAtKill.filter((s) => s.expectDup).length;
    totals.dupAcks += all.filter((s) => s.dup).length;
    totals.killsAtCommit += atCommit ? 1 : 0;
    return {
      run: index,
      mode: atCommit ? `commit ${killAfterCommits}` : `timer ${delay} ms`,
      violations: {
        lostAckedOps: lost,
        halfAppliedBatches: half.map((s) => s.opIds[0]),
        duplicateOps: copies,
        dupMismatch: wrongDup,
        chain: log.chain.ok && log.seq === log.rows ? [] : [JSON.stringify(log.chain)],
        unexpectedFrames: problems,
      },
    };
  } catch (error) {
    return { run: index, mode: "harness", violations: { harness: [String(error?.stack ?? error)] } };
  } finally {
    members.forEach((m) => m.drop());
    if (server && !server.exited) server.child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

const rng = seeded(seed);
const totals = { ackedOps: 0, unackedAtKill: 0, committedBeforeAck: 0, dupAcks: 0, killsAtCommit: 0 };
const failed = [];
const counts = {};
for (let i = 0; i < runs; i += 1) {
  const result = await oneRun(i, rng, totals);
  for (const [check, found] of Object.entries(result.violations)) {
    counts[check] = (counts[check] ?? 0) + found.length;
    if (found.length > 0) failed.push({ run: result.run, mode: result.mode, check, found: found.slice(0, 5) });
  }
}

console.log(JSON.stringify({ runs, sync, seed, ...totals, violations: counts, failed }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
