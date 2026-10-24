import { randomBytes } from "node:crypto";

/**
 * @typedef {import('./protocol.js').PeerRecord} PeerRecord
 * @typedef {import('./protocol.js').Lab} Lab
 * @typedef {import('./config.js').Limits} Limits
 * @typedef {{ from: string | null, asked: Set<string>, timer: NodeJS.Timeout | null }} Sync
 * @typedef {{ id: string, record: PeerRecord, conn: Conn, sync: Sync | null }} Peer
 * @typedef {import('./relay.js').Conn} Conn
 */

const newEpoch = () => randomBytes(6).toString("base64url");

/**
 * One room's state: its peers in join order (the first one is the host), the action seq and the
 * recent action frames that snapshot catch-up and reconnect replay are served from.
 */
export class Room {
  /** @param {string} id @param {Limits} limits @param {number} now */
  constructor(id, limits, now) {
    this.id = id;
    this.limits = limits;
    this.epoch = newEpoch();
    /** @type {Lab | null} */
    this.lab = null;
    /** @type {string | null} */
    this.itemId = null;
    this.seq = 0;
    /** @type {Map<string, Peer>} */
    this.peers = new Map();
    /** @type {{ seq: number, frame: string }[]} */
    this.log = [];
    this.logStart = 0;
    /** String length of the live log entries; a close enough stand-in for their memory. */
    this.logSize = 0;
    /** @type {string[]} */
    this.chat = [];
    /** @type {Set<string>} */
    this.banned = new Set();
    /** @type {number | null} */
    this.emptySince = now;
    this.pumping = false;
    this.pumpAgain = false;
  }

  /** @returns {string | null} */
  get hostId() {
    for (const id of this.peers.keys()) return id;
    return null;
  }

  records() {
    return Array.from(this.peers.values(), (peer) => peer.record);
  }

  /** Peers that hold the room state, in join order. @param {Peer | null} [except] */
  synced(except = null) {
    return [...this.peers.values()].filter((peer) => peer.sync === null && peer !== except);
  }

  waiting() {
    return [...this.peers.values()].filter((peer) => peer.sync !== null);
  }

  /** @param {Lab} lab @param {string | null} itemId */
  bind(lab, itemId) {
    this.lab = lab;
    this.itemId = itemId;
  }

  /** A new history: old seqs and the old log mean nothing for the new item. */
  restart() {
    this.epoch = newEpoch();
    this.log = [];
    this.logStart = 0;
    this.logSize = 0;
  }

  /** Stamps the next seq and returns the frame every synced peer gets. @param {string} from @param {unknown} action */
  appendAction(from, action) {
    const seq = ++this.seq;
    const frame = JSON.stringify({ t: "action", from, seq, action });
    this.log.push({ seq, frame });
    this.logSize += frame.length;
    while (
      this.log.length - this.logStart > 1 &&
      (this.log.length - this.logStart > this.limits.logEntries || this.logSize > this.limits.logBytes)
    ) {
      this.logSize -= this.log[this.logStart].frame.length;
      this.logStart += 1;
    }
    if (this.logStart >= 1024) {
      this.log = this.log.slice(this.logStart);
      this.logStart = 0;
    }
    return frame;
  }

  /** True when every action after `since` is still in the log. @param {number} since */
  canReplayFrom(since) {
    if (since > this.seq) return false;
    if (since === this.seq) return true;
    const first = this.log[this.logStart];
    return first !== undefined && first.seq <= since + 1;
  }

  /** The action frames after `since`; call canReplayFrom first. @param {number} since */
  actionsAfter(since) {
    const first = this.log[this.logStart];
    if (first === undefined || since >= this.seq) return [];
    const start = this.logStart + Math.max(0, since + 1 - first.seq);
    return this.log.slice(start).map((entry) => entry.frame);
  }

  /** @param {string} frame */
  addChat(frame) {
    this.chat.push(frame);
    if (this.chat.length > this.limits.chatBacklog) this.chat.shift();
  }

  /** @param {string} id */
  ban(id) {
    this.banned.add(id);
    if (this.banned.size > this.limits.banListSize) {
      const oldest = this.banned.values().next().value;
      if (oldest !== undefined) this.banned.delete(oldest);
    }
  }
}
