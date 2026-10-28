// Client frames (HX-CONTRACT H7, details in docs/hacktx/REALTIME.md). Every frame is checked here
// and rebuilt from its known fields, so nothing unvalidated reaches another peer.

export const LOCALES = new Set(["en", "es", "fr", "de", "zh", "hi"]);
export const ROLES = new Set(["wirer", "coder", "pilot", "watcher"]);
export const CHAT_KINDS = new Set(["text", "voice", "ai", "system"]);
export const LABS = new Set(["board", "robotics", "drone"]);

export const ROOM_ID = /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/;
const PEER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ITEM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR = /^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[a-z][a-z0-9-]{0,23})$/;
const PROGRESS_KEY = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const EPOCH = /^[A-Za-z0-9_-]{1,32}$/;

export const MAX_NAME = 24;
export const MAX_STATUS = 80;
export const MAX_CHAT = 500;
const MAX_ITEM_ID = 64;
const MAX_ACTION_TYPE = 64;
const MAX_DONE = 256;
const MAX_GATE = 32;

// C0/C1 controls, plus zero-width and bidi-override characters that let a name pose as another.
// eslint-disable-next-line no-control-regex
const NAME_JUNK = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;
// Chat keeps tabs and newlines.
// eslint-disable-next-line no-control-regex
const CHAT_JUNK = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩﻿]/g;

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * @typedef {'board' | 'robotics' | 'drone'} Lab
 * @typedef {{ id: string, name: string, color: string, lang: string, role?: string, status?: string, baton?: true, done: string[] }} PeerRecord
 * @typedef {{ role?: string | null, status?: string | null, baton?: boolean, name?: string, done?: string[] }} PresenceUpdate
 * @typedef {{ type: string, [key: string]: unknown }} Action
 * @typedef {{ t: 'join', room: string, peer: PeerRecord, lab: Lab | null, itemId: string | null, since: number | null, epoch: string | null }} JoinMsg
 * @typedef {{ t: 'action', action: Action }} ActionMsg
 * @typedef {{ t: 'state', to: string, seq: number, snapshot: unknown }} StateMsg
 * @typedef {{ t: 'chat', id: string, text: string, lang: string, kind: string }} ChatMsg
 * @typedef {{ t: 'cursor', x: number, y: number }} CursorMsg
 * @typedef {{ t: 'presence', update: PresenceUpdate }} PresenceMsg
 * @typedef {{ t: 'pose', p: number[], q: number[], v?: number | number[], gate?: number | string }} PoseMsg
 * @typedef {{ t: 'kick', id: string }} KickMsg
 * @typedef {{ t: 'ping' }} PingMsg
 * @typedef {JoinMsg | ActionMsg | StateMsg | ChatMsg | CursorMsg | PresenceMsg | PoseMsg | KickMsg | PingMsg} ClientMsg
 * @typedef {{ ok: true, msg: ClientMsg } | { ok: false, t: string | null, code: string, message: string }} Parsed
 */

class ProtocolError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** @param {string} field @param {string} rule */
const bad = (field, rule) => new ProtocolError("bad_message", `${field} ${rule}.`);

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Caps by grapheme clusters, so an emoji or an accented letter is never cut in half. @param {string} text @param {number} max */
export function capText(text, max) {
  if (text.length <= max) return text;
  let out = "";
  let count = 0;
  for (const { segment } of graphemes.segment(text)) {
    if (count === max) break;
    out += segment;
    count += 1;
  }
  return out;
}

/** @param {unknown} value @param {string} field @param {number} max */
function line(value, field, max) {
  if (typeof value !== "string") throw bad(field, "must be a string");
  return capText(value.replace(NAME_JUNK, "").replace(/\s+/g, " ").trim(), max);
}

/** @param {unknown} value @param {string} field */
function name(value, field) {
  const text = line(value, field, MAX_NAME);
  if (!text) throw bad(field, "must not be empty");
  return text;
}

/** @param {unknown} value @param {RegExp} pattern @param {string} field */
function matching(value, pattern, field) {
  if (typeof value !== "string" || !pattern.test(value)) throw bad(field, "is not valid");
  return value;
}

/** @param {unknown} value @param {Set<string>} allowed @param {string} field */
function oneOf(value, allowed, field) {
  if (typeof value !== "string" || !allowed.has(value)) throw bad(field, `must be one of ${[...allowed].join(", ")}`);
  return value;
}

/** @param {unknown} value @param {string} field */
function seqOf(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw bad(field, "must be a whole number ≥ 0");
  return value;
}

/** @param {unknown} value @param {string} field */
function finite(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw bad(field, "must be a finite number");
  return value;
}

/** @param {unknown} value @param {number} length @param {string} field */
function vector(value, length, field) {
  if (!Array.isArray(value) || value.length !== length) throw bad(field, `must be ${length} numbers`);
  return value.map((n, i) => finite(n, `${field}[${i}]`));
}

/** @param {unknown} value @param {string} field */
function doneKeys(value, field) {
  if (!Array.isArray(value) || value.length > MAX_DONE) throw bad(field, `must be a list of at most ${MAX_DONE} progress keys`);
  return [...new Set(value.map((key) => matching(key, PROGRESS_KEY, field)))];
}

/** @param {unknown} value @param {string} field */
function boolean(value, field) {
  if (typeof value !== "boolean") throw bad(field, "must be true or false");
  return value;
}

/** @param {unknown} value @returns {PeerRecord} */
function peerRecord(value) {
  if (!isObject(value)) throw bad("peer", "must be an object");
  /** @type {PeerRecord} */
  const record = {
    id: matching(value.id, PEER_ID, "peer.id"),
    name: name(value.name, "peer.name"),
    color: matching(value.color, COLOR, "peer.color"),
    lang: oneOf(value.lang, LOCALES, "peer.lang"),
    done: value.done === undefined ? [] : doneKeys(value.done, "peer.done"),
  };
  if (value.role !== undefined && value.role !== null) record.role = oneOf(value.role, ROLES, "peer.role");
  if (value.status !== undefined && value.status !== null) {
    const status = line(value.status, "peer.status", MAX_STATUS);
    if (status) record.status = status;
  }
  if (value.baton !== undefined && boolean(value.baton, "peer.baton")) record.baton = true;
  return record;
}

/** @type {Record<string, (raw: Record<string, unknown>) => ClientMsg>} */
const PARSERS = {
  join(raw) {
    const room = matching(raw.room, ROOM_ID, "room");
    const peer = peerRecord(raw.peer);
    const lab = raw.lab === undefined || raw.lab === null ? null : /** @type {Lab} */ (oneOf(raw.lab, LABS, "lab"));
    let itemId = null;
    if (raw.itemId !== undefined && raw.itemId !== null) {
      itemId = matching(raw.itemId, ITEM_ID, "itemId");
      if (itemId.length > MAX_ITEM_ID) throw bad("itemId", `must be at most ${MAX_ITEM_ID} characters`);
      if (lab === null) throw bad("itemId", "needs lab");
    }
    const since = raw.since === undefined || raw.since === null ? null : seqOf(raw.since, "since");
    const epoch = raw.epoch === undefined || raw.epoch === null ? null : matching(raw.epoch, EPOCH, "epoch");
    return { t: "join", room, peer, lab, itemId, since, epoch };
  },

  action(raw) {
    const action = raw.action;
    if (!isObject(action)) throw bad("action", "must be an object");
    if (typeof action.type !== "string" || action.type.length === 0 || action.type.length > MAX_ACTION_TYPE) {
      throw bad("action.type", `must be a string of 1–${MAX_ACTION_TYPE} characters`);
    }
    return { t: "action", action: /** @type {Action} */ (action) };
  },

  state(raw) {
    const to = matching(raw.to, PEER_ID, "to");
    const seq = seqOf(raw.seq, "seq");
    if (raw.snapshot === undefined || raw.snapshot === null) throw bad("snapshot", "is missing");
    return { t: "state", to, seq, snapshot: raw.snapshot };
  },

  chat(raw) {
    const id = matching(raw.id, PEER_ID, "id");
    if (typeof raw.text !== "string") throw bad("text", "must be a string");
    const text = capText(raw.text.replace(/\r\n?/g, "\n").replace(CHAT_JUNK, "").trim(), MAX_CHAT);
    if (!text) throw bad("text", "must not be empty");
    return { t: "chat", id, text, lang: oneOf(raw.lang, LOCALES, "lang"), kind: oneOf(raw.kind, CHAT_KINDS, "kind") };
  },

  cursor(raw) {
    const clamp = (/** @type {number} */ n) => Math.min(1, Math.max(0, n));
    return { t: "cursor", x: clamp(finite(raw.x, "x")), y: clamp(finite(raw.y, "y")) };
  },

  presence(raw) {
    /** @type {PresenceUpdate} */
    const update = {};
    if (raw.role !== undefined) update.role = raw.role === null ? null : oneOf(raw.role, ROLES, "role");
    if (raw.status !== undefined) update.status = raw.status === null ? null : line(raw.status, "status", MAX_STATUS) || null;
    if (raw.baton !== undefined) update.baton = boolean(raw.baton, "baton");
    if (raw.name !== undefined) update.name = name(raw.name, "name");
    if (raw.done !== undefined) update.done = doneKeys(raw.done, "done");
    return { t: "presence", update };
  },

  pose(raw) {
    /** @type {PoseMsg} */
    const pose = { t: "pose", p: vector(raw.p, 3, "p"), q: vector(raw.q, 4, "q") };
    if (raw.v !== undefined) pose.v = Array.isArray(raw.v) ? vector(raw.v, 3, "v") : finite(raw.v, "v");
    if (raw.gate !== undefined) {
      const gate = raw.gate;
      if (typeof gate === "number" && Number.isSafeInteger(gate) && gate >= 0) pose.gate = gate;
      else if (typeof gate === "string" && gate.length <= MAX_GATE) pose.gate = gate;
      else throw bad("gate", `must be a whole number ≥ 0 or a string of at most ${MAX_GATE} characters`);
    }
    return pose;
  },

  kick(raw) {
    return { t: "kick", id: matching(raw.id, PEER_ID, "id") };
  },

  ping() {
    return { t: "ping" };
  },
};

/** @param {string} text @returns {Parsed} */
export function parseClientFrame(text) {
  /** @type {unknown} */
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, t: null, code: "bad_json", message: "Frames must be JSON text." };
  }
  if (!isObject(raw)) return { ok: false, t: null, code: "bad_message", message: "A frame must be a JSON object." };
  const t = typeof raw.t === "string" ? raw.t : null;
  const parse = t !== null && Object.hasOwn(PARSERS, t) ? PARSERS[t] : undefined;
  if (!parse) return { ok: false, t, code: "bad_type", message: "Unknown frame type." };
  try {
    return { ok: true, msg: parse(raw) };
  } catch (error) {
    if (error instanceof ProtocolError) return { ok: false, t, code: error.code, message: error.message };
    throw error;
  }
}
