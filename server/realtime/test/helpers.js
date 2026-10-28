import { WebSocket } from "ws";
import { createRelay } from "../src/relay.js";

const ROOM_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function roomId() {
  let id = "";
  for (let i = 0; i < 6; i += 1) id += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  return id;
}

/** @param {string} id @param {Record<string, unknown>} [extra] */
export function peer(id, extra = {}) {
  return { id, name: `Peer ${id}`, color: "tomato", lang: "en", ...extra };
}

/** Ports a test never listens on. src/test-support/ports.ts keeps the same list; its test compares them. */
export const RESERVED_PORTS = new Set([43_117]);

/**
 * A random port in 40000–49999, redrawn while it is reserved. It does not check that the port is free.
 * @param {() => number} [random]
 */
export function randomTestPort(random = Math.random) {
  for (;;) {
    const port = 40_000 + Math.floor(random() * 10_000);
    if (!RESERVED_PORTS.has(port)) return port;
  }
}

/**
 * Starts a relay on a random port in 40000–49999, the range agents on this machine may listen on.
 * @param {Parameters<typeof createRelay>[0]} [options]
 */
export async function startRelay(options = {}) {
  const relay = createRelay({ logLevel: "silent", ...options });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const port = randomTestPort();
    try {
      await relay.listen(port, "127.0.0.1");
      return { relay, port, url: `ws://127.0.0.1:${port}/ws`, base: `http://127.0.0.1:${port}` };
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error("No free port in 40000–49999.");
}

/** @typedef {Record<string, any>} Msg */
/** @typedef {string | ((msg: Msg) => boolean)} Filter */

/** A test client that keeps every frame it receives and lets a test await them in order. */
export class Client {
  /**
   * @param {string} url
   * @param {{ origin?: string, autoPong?: boolean }} [options]
   * @returns {Promise<Client>}
   */
  static open(url, options = {}) {
    const ws = new WebSocket(url, { origin: options.origin, autoPong: options.autoPong ?? true });
    return new Promise((resolve, reject) => {
      ws.once("open", () => resolve(new Client(ws)));
      ws.once("error", reject);
      ws.once("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    });
  }

  /** @param {WebSocket} ws */
  constructor(ws) {
    this.ws = ws;
    /** @type {Msg[]} */
    this.inbox = [];
    this.read = 0;
    /** @type {Set<() => void>} */
    this.waiters = new Set();
    /** @type {Promise<{ code: number, reason: string }>} */
    this.closed = new Promise((resolve) => ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() })));
    ws.on("message", (data) => {
      this.inbox.push(JSON.parse(data.toString()));
      for (const waiter of [...this.waiters]) waiter();
    });
  }

  /** @param {unknown} msg */
  send(msg) {
    this.ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  /**
   * The next unread frame that matches; frames skipped on the way count as read.
   * @param {Filter} [filter] a `t` value or a predicate
   * @param {number} [timeoutMs]
   * @returns {Promise<Msg>}
   */
  next(filter, timeoutMs = 2_000) {
    const match = typeof filter === "string" ? (/** @type {Msg} */ m) => m.t === filter : (filter ?? (() => true));
    return new Promise((resolve, reject) => {
      const check = () => {
        for (let i = this.read; i < this.inbox.length; i += 1) {
          if (match(this.inbox[i])) {
            this.read = i + 1;
            this.waiters.delete(check);
            clearTimeout(timer);
            resolve(this.inbox[i]);
            return;
          }
        }
      };
      const timer = setTimeout(() => {
        this.waiters.delete(check);
        const unread = this.inbox.slice(this.read).map((m) => m.t);
        reject(new Error(`Timed out waiting for ${typeof filter === "string" ? filter : "a frame"}; unread: ${JSON.stringify(unread)}`));
      }, timeoutMs);
      this.waiters.add(check);
      check();
    });
  }

  /** Resolves when no matching frame arrives within `ms`. @param {Filter} filter @param {number} [ms] */
  async none(filter, ms = 150) {
    const match = typeof filter === "string" ? (/** @type {Msg} */ m) => m.t === filter : filter;
    await new Promise((resolve) => setTimeout(resolve, ms));
    const hit = this.inbox.slice(this.read).find(match);
    if (hit) throw new Error(`Unexpected frame ${JSON.stringify(hit).slice(0, 200)}`);
  }

  close() {
    this.ws.close();
    return this.closed;
  }
}

/**
 * Opens a socket, joins and waits for the welcome.
 * @param {string} url
 * @param {string} room
 * @param {string} id
 * @param {{ peer?: Record<string, unknown>, join?: Record<string, unknown> }} [extra]
 */
export async function joined(url, room, id, extra = {}) {
  const client = await Client.open(url);
  client.send({ t: "join", room, peer: peer(id, extra.peer), ...extra.join });
  const welcome = await client.next("welcome");
  return { client, welcome };
}

/** Answers every snapshot request with `snapshot()` at the seq of the last action it applied. @param {Client} host @param {() => unknown} snapshot */
export function serveSnapshots(host, snapshot) {
  let base = 0;
  host.ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.t === "action") base = msg.seq;
    if (msg.t === "snapshot-request") host.send({ t: "state", to: msg.from, seq: base, snapshot: snapshot() });
  });
}

/** Response.json() is typed unknown; tests read fields straight off it. @param {Response} res @returns {Promise<any>} */
export const json = (res) => res.json();

/** @param {number} ms */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
