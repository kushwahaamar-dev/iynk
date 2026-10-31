import { utf8Length } from "../core/canonical.ts";
import {
  CAPS,
  CLIENT_CAPS,
  CMD_NAMES,
  OP_SCHEMA,
  WIRE_PROTOCOL,
  type ChatUp,
  type ClientFrame,
  type Cmd,
  type CmdName,
  type CursorUp,
  type ErrorCode,
  type Hello,
  type PresencePatch,
  type PresenceUp,
  type Resync,
  type RoomSettings,
  type ServerFrame,
  type Submit,
  type SubmitOp,
  type WireOp,
} from "./frames.ts";

export type Parsed = { ok: true; frame: ClientFrame } | { ok: false; code: ErrorCode; message: string };

type Rec = Record<string, unknown>;

const MAX_DEPTH = 40;
const MAX_NAME = 24;
const MAX_STATUS = 80;
const MAX_CHAT = 500;
const MAX_OPS = 40;
const MAX_SEL = 16;
const MAX_VIEW = 72;
const MAX_CAPS = 16;
const MAX_ENGINES = 16;
const MAX_COORD_MM = 1_000_000;

const OP_ID = /^op_[a-z0-9][a-z0-9_-]{0,63}$/;
const REF = /^[A-Za-z0-9_.:-]{1,64}$/;
const ACTOR = /^usr_[A-Za-z0-9_-]{1,64}$/;
const DEVICE = /^dev_[a-z2-7]{26}$/;
const ROOM = /^rm_[A-Za-z0-9_-]{1,64}$/;
const DIGEST = /^[A-Za-z0-9_:+/=.-]{1,128}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{1,256}$/;
const LANG = /^[A-Za-z][A-Za-z0-9-]{1,7}$/;
const APP = /^[\x20-\x7e]{1,64}$/;
const ENGINE_NAME = /^[a-z0-9._-]{1,32}$/;
const ENGINE_VERSION = /^[\x20-\x7e]{1,32}$/;

// C0/C1 controls, DEL, zero-width and bidi override/isolate characters that let a name pose as another.
// eslint-disable-next-line no-control-regex
const NAME_JUNK = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;
// Chat keeps tabs and newlines.
// eslint-disable-next-line no-control-regex
const CHAT_JUNK = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩﻿]/g;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

const UNSAFE_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "toString"]);
const KNOWN_CAPS: ReadonlySet<string> = new Set([...CLIENT_CAPS, "run"]);

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

class FrameError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const bad = (field: string, rule: string): FrameError => new FrameError("bad_frame", `${field} ${rule}.`);

function capText(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (count === max) break;
    out += segment;
    count += 1;
  }
  return out;
}

function cleanLine(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const text = capText(v.replace(LONE_SURROGATE, "").replace(NAME_JUNK, "").replace(/\s+/g, " ").trim(), max);
  return text === "" ? null : text;
}

export function sanitizeName(v: unknown): string | null {
  return cleanLine(v, MAX_NAME);
}

export function sanitizeStatus(v: unknown): string | null {
  return cleanLine(v, MAX_STATUS);
}

export function sanitizeChat(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const text = capText(v.replace(LONE_SURROGATE, "").replace(CHAT_JUNK, "").trim(), MAX_CHAT);
  return text === "" ? null : text.trim();
}

/** Counts `[` and `{` outside strings without recursion, so a hostile text cannot blow the stack. */
export function exceedsDepth(text: string, max: number): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 0x5c) i++;
      else if (c === 0x22) inString = false;
    } else if (c === 0x22) inString = true;
    else if (c === 0x5b || c === 0x7b) {
      if (++depth > max) return true;
    } else if (c === 0x5d || c === 0x7d) depth--;
  }
  return false;
}

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function rec(v: unknown, field: string): Rec {
  if (!isRec(v)) throw bad(field, "must be an object");
  return v;
}

function matching(v: unknown, pattern: RegExp, field: string): string {
  if (typeof v !== "string" || !pattern.test(v)) throw bad(field, "is not valid");
  return v;
}

function oneOf<const T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    throw bad(field, `must be one of ${allowed.join(", ")}`);
  }
  return v as T;
}

function int(v: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min || v > max) {
    throw bad(field, `must be a whole number from ${min} to ${max}`);
  }
  return v;
}

function bool(v: unknown, field: string): boolean {
  if (typeof v !== "boolean") throw bad(field, "must be true or false");
  return v;
}

function mm(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) >= MAX_COORD_MM) {
    throw bad(field, `must be a number under ${MAX_COORD_MM} in size`);
  }
  return Math.round(v * 10) / 10 || 0;
}

function view(v: unknown, field: string): string {
  if (typeof v !== "string" || v.length < 1 || v.length > MAX_VIEW || /[\u0000-\u001f\u007f-\u009f]/.test(v)) {
    throw bad(field, `must be 1 to ${MAX_VIEW} printable characters`);
  }
  return v;
}

function present<T>(v: unknown, read: (v: unknown) => T): T | undefined {
  return v === undefined ? undefined : read(v);
}

function cloneJson(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(cloneJson);
  if (!isRec(v)) return v;
  const out: Rec = {};
  for (const key of Object.keys(v)) if (!UNSAFE_KEYS.has(key)) out[key] = cloneJson(v[key]);
  return out;
}

function wireOp(v: unknown, field: string): WireOp {
  const op = rec(v, field);
  if (typeof op.k !== "string" || op.k === "") throw bad(`${field}.k`, "must be the op kind");
  return cloneJson(op) as WireOp;
}

function digestPair(o: Rec, seqKey: string, field: string): { seq: number; chain: string } {
  return { seq: int(o[seqKey], `${field}.${seqKey}`, 0), chain: matching(o.chain, DIGEST, `${field}.chain`) };
}

function hello(o: Rec): Hello {
  if (typeof o.protocol !== "number" || !Number.isSafeInteger(o.protocol)) throw bad("protocol", "must be a whole number");
  if (o.protocol !== WIRE_PROTOCOL) {
    throw new FrameError("upgrade_required", `This server speaks protocol ${WIRE_PROTOCOL}; the client sent ${o.protocol}.`);
  }
  if (typeof o.opSchema !== "string") throw bad("opSchema", "must be a string");
  if (o.opSchema !== OP_SCHEMA) {
    throw new FrameError("schema_mismatch", `This server speaks opSchema ${OP_SCHEMA}; the client sent ${o.opSchema}.`);
  }
  if (!Array.isArray(o.caps) || o.caps.length > MAX_CAPS) throw bad("caps", `must be a list of at most ${MAX_CAPS} strings`);
  const caps = [...new Set(o.caps.filter((c): c is string => typeof c === "string" && KNOWN_CAPS.has(c)))];

  const out: Hello = {
    t: "hello",
    protocol: WIRE_PROTOCOL,
    app: matching(o.app, APP, "app"),
    opSchema: OP_SCHEMA,
    device: matching(o.device, DEVICE, "device") as Hello["device"],
    sig: matching(o.sig, SIGNATURE, "sig"),
    caps,
  };
  if (o.room !== undefined) out.room = matching(o.room, ROOM, "room") as Hello["room"];
  if (o.resume !== undefined) {
    const r = rec(o.resume, "resume");
    out.resume = { epoch: matching(r.epoch, DIGEST, "resume.epoch"), ...digestPair(r, "seq", "resume") };
  }
  if (o.local !== undefined) {
    const l = rec(o.local, "local");
    const { seq, chain } = digestPair(l, "rev", "local");
    out.local = { rev: seq, chain };
  }
  if (o.engines !== undefined) {
    const e = rec(o.engines, "engines");
    const keys = Object.keys(e);
    if (keys.length > MAX_ENGINES) throw bad("engines", `must have at most ${MAX_ENGINES} entries`);
    const engines: Record<string, string> = {};
    for (const key of keys) {
      if (!UNSAFE_KEYS.has(key) && ENGINE_NAME.test(key)) engines[key] = matching(e[key], ENGINE_VERSION, `engines.${key}`);
    }
    out.engines = engines;
  }
  return out;
}

function submitOp(v: unknown, i: number): SubmitOp {
  const field = `ops[${i}]`;
  const o = rec(v, field);
  const out: SubmitOp = {
    opId: matching(o.opId, OP_ID, `${field}.opId`),
    base: int(o.base, `${field}.base`, 0),
    op: wireOp(o.op, `${field}.op`),
  };
  if (o.kind !== undefined) out.kind = oneOf(o.kind, ["user", "ai"], `${field}.kind`);
  if (o.proposal !== undefined) out.proposal = matching(o.proposal, REF, `${field}.proposal`);
  return out;
}

function submit(o: Rec): Submit {
  const sub = int(o.sub, "sub", 1);
  const batch = present(o.batch, (v) => matching(v, REF, "batch"));
  if (!Array.isArray(o.ops) || o.ops.length < 1 || o.ops.length > MAX_OPS) {
    throw bad("ops", `must have 1 to ${MAX_OPS} entries`);
  }
  const out: Submit = { t: "submit", sub, ops: o.ops.map(submitOp) };
  if (batch !== undefined) out.batch = batch;
  return out;
}

function resync(o: Rec): Resync {
  return {
    t: "resync",
    reason: oneOf(o.reason, ["chain", "hash", "apply"], "reason"),
    ...digestPair(o, "seq", "resync"),
  };
}

function nullableRef(v: unknown, field: string): string | null {
  return v === null ? null : matching(v, REF, field);
}

function presencePatch(v: unknown): PresencePatch {
  const p = rec(v, "patch");
  const out: PresencePatch = {};
  if (p.name !== undefined) {
    const name = sanitizeName(p.name);
    if (name === null) throw bad("patch.name", "must not be empty");
    out.name = name;
  }
  if (p.status !== undefined) {
    if (p.status !== null && typeof p.status !== "string") throw bad("patch.status", "must be text or null");
    out.status = p.status === null ? null : sanitizeStatus(p.status);
  }
  if (p.view !== undefined) out.view = view(p.view, "patch.view");
  if (p.sel !== undefined) {
    if (!Array.isArray(p.sel) || p.sel.length > MAX_SEL) throw bad("patch.sel", `must be a list of at most ${MAX_SEL} ids`);
    out.sel = p.sel.map((id) => matching(id, REF, "patch.sel"));
  }
  if (p.focus !== undefined) out.focus = nullableRef(p.focus, "patch.focus");
  if (p.typing !== undefined) out.typing = nullableRef(p.typing, "patch.typing");
  if (p.vp !== undefined) {
    const vp = rec(p.vp, "patch.vp");
    out.vp = { x: mm(vp.x, "patch.vp.x"), y: mm(vp.y, "patch.vp.y"), zoom: mm(vp.zoom, "patch.vp.zoom") };
  }
  return out;
}

function presence(o: Rec): PresenceUp {
  return { t: "presence", patch: presencePatch(o.patch) };
}

function cursor(o: Rec): CursorUp {
  return { t: "cursor", view: view(o.view, "view"), x_mm: mm(o.x_mm, "x_mm"), y_mm: mm(o.y_mm, "y_mm") };
}

function chat(o: Rec): ChatUp {
  const id = matching(o.id, REF, "id");
  const text = sanitizeChat(o.text);
  if (text === null) throw bad("text", "must not be empty");
  return { t: "chat", id, text, lang: matching(o.lang, LANG, "lang") };
}

function roomSettings(v: unknown): Partial<RoomSettings> {
  const s = rec(v, "settings");
  const out: Partial<RoomSettings> = {};
  if (s.codeMode !== undefined) out.codeMode = oneOf(s.codeMode, ["baton", "open"], "settings.codeMode");
  if (s.runControl !== undefined) out.runControl = oneOf(s.runControl, ["editors", "host"], "settings.runControl");
  if (s.spectatorCursors !== undefined) out.spectatorCursors = bool(s.spectatorCursors, "settings.spectatorCursors");
  if (s.locked !== undefined) out.locked = bool(s.locked, "settings.locked");
  if (s.maxMembers !== undefined) out.maxMembers = int(s.maxMembers, "settings.maxMembers", 2, 8);
  if (s.maxSpectators !== undefined) out.maxSpectators = int(s.maxSpectators, "settings.maxSpectators", 0, 8);
  if (Object.keys(out).length === 0) throw bad("settings", "must change at least one setting");
  return out;
}

type CmdArg = "to" | "on" | "settings" | "actor";

const CMD_ARGS: Record<CmdName, readonly CmdArg[]> = {
  "baton.request": [],
  "baton.grant": ["to"],
  "baton.release": [],
  "baton.take": [],
  "host.pass": ["to"],
  "host.claim": [],
  "member.kick": ["actor"],
  "member.mute": ["actor", "on"],
  "room.lock": ["on"],
  "room.settings": ["settings"],
  "room.close": [],
  "room.pin": ["on"],
};

const CMD_ARG_READ: Record<CmdArg, (v: unknown) => unknown> = {
  to: (v) => matching(v, ACTOR, "args.to"),
  actor: (v) => matching(v, ACTOR, "args.actor"),
  on: (v) => bool(v, "args.on"),
  settings: roomSettings,
};

function cmd(o: Rec): Cmd {
  const id = matching(o.id, REF, "id");
  const name = oneOf(o.name, CMD_NAMES, "name");
  const wanted = CMD_ARGS[name];
  const out: Cmd = { t: "cmd", id, name };
  if (wanted.length === 0) return out;
  const given = rec(o.args, "args");
  const args: Rec = {};
  for (const key of wanted) {
    if (given[key] === undefined) throw bad(`args.${key}`, "is required");
    args[key] = CMD_ARG_READ[key](given[key]);
  }
  out.args = args;
  return out;
}

const CLIENT_PARSERS: Record<ClientFrame["t"], (o: Rec) => ClientFrame> = {
  hello,
  submit,
  resync,
  presence,
  cursor,
  chat,
  cmd,
  ping: () => ({ t: "ping" }),
  bye: () => ({ t: "bye" }),
};

/**
 * Rebuilds a client frame from its known fields. Never throws. `inflated` says the text came out of a gzip frame,
 * which may be larger than a plain text frame (RT 7.1).
 */
export function parseClientFrame(text: string, opts: { inflated?: boolean } = {}): Parsed {
  const fail = (code: ErrorCode, message: string): Parsed => ({ ok: false, code, message });
  try {
    const cap = opts.inflated ? CAPS.clientInflated : CAPS.clientWire;
    if (text.length > cap || utf8Length(text) > cap) return fail("too_large", `Frame is over ${cap} bytes.`);
    if (exceedsDepth(text, MAX_DEPTH)) return fail("bad_json", `Frame is nested deeper than ${MAX_DEPTH}.`);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return fail("bad_json", "Frame is not valid JSON.");
    }
    if (!isRec(value)) return fail("bad_frame", "Frame must be a JSON object.");
    const t = value.t;
    if (typeof t !== "string" || !Object.hasOwn(CLIENT_PARSERS, t)) return fail("bad_type", "Unknown frame type.");
    return { ok: true, frame: CLIENT_PARSERS[t as ClientFrame["t"]](value) };
  } catch (e) {
    if (e instanceof FrameError) return fail(e.code, e.message);
    return fail("bad_frame", "Frame could not be read.");
  }
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isSeq = (v: unknown): boolean => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const isOptional = (v: unknown, check: (v: unknown) => boolean): boolean => v === undefined || check(v);

function strings(o: Rec, keys: string[]): boolean {
  return keys.every((k) => isStr(o[k]));
}

function isAck(v: unknown): boolean {
  return isRec(v) && isNum(v.sub) && Array.isArray(v.inverse);
}

const SERVER_CHECKS: Record<ServerFrame["t"], (o: Rec) => boolean> = {
  challenge: (o) => o.protocol === WIRE_PROTOCOL && strings(o, ["nonce", "aud", "serverTime"]),
  welcome: (o) =>
    o.protocol === WIRE_PROTOCOL &&
    isStr(o.opSchema) &&
    isRec(o.room) &&
    isStr(o.room.id) &&
    isSeq(o.room.seq) &&
    isStr(o.room.chain) &&
    isRec(o.you) &&
    isStr(o.you.actor) &&
    Array.isArray(o.members) &&
    ["none", "tail", "snapshot", "ff"].includes(o.resume as string) &&
    isRec(o.limits),
  snapshot: (o) => strings(o, ["reason", "chain", "stateHash"]) && isSeq(o.seq) && isRec(o.doc),
  tail: (o) => isSeq(o.from) && isSeq(o.to) && isStr(o.chain) && Array.isArray(o.envs),
  ready: (o) => isSeq(o.seq),
  commit: (o) =>
    isSeq(o.seq0) &&
    isSeq(o.seq1) &&
    isStr(o.chain) &&
    isOptional(o.envs, Array.isArray) &&
    isOptional(o.ack, isAck),
  reject: (o) => isNum(o.sub) && strings(o, ["code", "message"]),
  check: (o) => isSeq(o.seq) && isStr(o.chain),
  presence: (o) => isNum(o.m) && isRec(o.patch),
  cursors: (o) => Array.isArray(o.c),
  chat: (o) => strings(o, ["id", "text", "lang", "at"]) && isNum(o.m) && (o.kind === "text" || o.kind === "system"),
  event: (o) => strings(o, ["at", "kind"]),
  error: (o) => strings(o, ["code", "message"]) && typeof o.retryable === "boolean",
  pong: () => true,
  buddies: (o) => Array.isArray(o.list),
  buddy: (o) => isStr(o.actor) && isRec(o.patch),
  invite: (o) => strings(o, ["room", "from", "title", "role", "expires"]),
};

/** Narrows a server frame by its type and the fields the client reads first. Null means ignore it and log once. */
export function parseServerFrame(text: string): ServerFrame | null {
  try {
    if (text.length > CAPS.snapshotInflated) return null;
    const value: unknown = JSON.parse(text);
    if (!isRec(value)) return null;
    const t = value.t;
    if (typeof t !== "string" || !Object.hasOwn(SERVER_CHECKS, t)) return null;
    if (t !== "snapshot" && utf8Length(text) > CAPS.otherServer) return null;
    return SERVER_CHECKS[t as ServerFrame["t"]](value) ? (value as ServerFrame) : null;
  } catch {
    return null;
  }
}
