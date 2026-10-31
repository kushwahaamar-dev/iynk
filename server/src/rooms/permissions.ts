import { OP_CLASS, type OpKind } from "./op-classes.ts";

export type Actor = `usr_${string}`;
export type Role = "owner" | "editor" | "commenter" | "viewer";
export type CmdName =
  | "baton.request" | "baton.grant" | "baton.release" | "baton.take"
  | "host.pass" | "host.claim"
  | "member.kick" | "member.mute"
  | "room.lock" | "room.settings" | "room.close" | "room.pin"
  | "runner.set" | "run.detach";

export type Subject = {
  role: Role;
  spectator: boolean;
  actor: Actor;
  host: boolean;
  creator: boolean;
  baton: Actor | null;
  codeMode: "baton";
  muted: boolean;
};

export type Verdict = { ok: true } | { ok: false; code: "permission" | "not_baton" };

const OK: Verdict = { ok: true };
const DENY_PERMISSION: Verdict = { ok: false, code: "permission" };
const DENY_BATON: Verdict = { ok: false, code: "not_baton" };

const SERVER_EMITTED: ReadonlySet<OpKind> = new Set(["actor.set", "access.grant"]);
const HOST_ONLY: ReadonlySet<CmdName> = new Set([
  "baton.take", "host.pass", "member.kick", "member.mute", "room.lock", "room.settings", "room.close", "room.pin",
]);

const canWrite = (s: Subject) => !s.spectator && (s.role === "owner" || s.role === "editor");

export function authorizeOp(s: Subject, kind: OpKind, origin: "client" | "server"): Verdict {
  const cls = Object.hasOwn(OP_CLASS, kind) ? OP_CLASS[kind] : undefined;
  if (cls === undefined) return DENY_PERMISSION;
  if (origin === "server" && SERVER_EMITTED.has(kind)) return OK;
  if (cls === "owner") return s.role === "owner" && !s.spectator ? OK : DENY_PERMISSION;
  if (!canWrite(s)) return DENY_PERMISSION;
  if (cls === "source" && s.baton !== s.actor) return DENY_BATON;
  return OK;
}

export function authorizeCmd(s: Subject, name: CmdName, target?: { actor: Actor; role: Role; host?: boolean }): Verdict {
  if (HOST_ONLY.has(name)) {
    if (!s.host) return DENY_PERMISSION;
    if (name === "member.kick" && target?.host === true && !s.creator) return DENY_PERMISSION;
    return OK;
  }
  switch (name) {
    case "baton.request":
      return canWrite(s) ? OK : DENY_PERMISSION;
    case "baton.grant":
      return s.host || s.baton === s.actor ? OK : DENY_PERMISSION;
    case "baton.release":
      return s.baton === s.actor ? OK : DENY_PERMISSION;
    case "host.claim":
      return s.creator ? OK : DENY_PERMISSION;
    default:
      return DENY_PERMISSION;
  }
}

export function authorizeChat(s: Subject): Verdict {
  return s.muted ? DENY_PERMISSION : OK;
}

export function authorizeCursor(s: Subject, spectatorCursors: boolean): Verdict {
  if (s.spectator || s.role === "viewer") return spectatorCursors ? OK : DENY_PERMISSION;
  return OK;
}
