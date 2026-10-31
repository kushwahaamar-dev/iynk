import { CLOSE, isRetryable } from "../../../src/protocol/close-codes.ts";
import type { Actor, CmdName, ErrorCode, RoomEvent, RoomSettings } from "../../../src/protocol/frames.ts";
import type { RoomsRepo } from "../store/rooms.ts";
import type { Baton } from "./baton.ts";
import type { RoomCore } from "./core.ts";
import { authorizeCmd } from "./permissions.ts";
import type { Subject } from "./permissions.ts";
import type { HostSuccession } from "./succession.ts";
import type { MemberRef, Outbound } from "./types.ts";

const NORMAL_CLOSE = 1000;

export type HostCtx = { repo: RoomsRepo; clock: () => number; baton: Baton; succession: HostSuccession };

export function refuse(m: MemberRef, code: Extract<ErrorCode, "permission" | "bad_frame"> = "permission", message = "not allowed"): Outbound {
  return { to: { kind: "member", m: m.m }, frame: { t: "error", code, message, retryable: isRetryable(code) } };
}

function eventFrame(at: number, kind: string, by: Actor | null, data: Record<string, unknown>): RoomEvent {
  return { t: "event", at: new Date(at).toISOString(), kind, ...(by === null ? {} : { by }), data };
}

export function announce(ctx: HostCtx, core: RoomCore, kind: string, by: Actor | null, data: Record<string, unknown>): Outbound {
  const at = ctx.clock();
  ctx.repo.addEvent(core.id, at, kind, by, data);
  return { to: { kind: "room" }, frame: eventFrame(at, kind, by, data) };
}

export function subjectOf(ctx: HostCtx, core: RoomCore, m: MemberRef): Subject {
  return {
    role: m.role,
    spectator: m.spectator,
    actor: m.actor,
    host: m.actor === core.host,
    creator: ctx.repo.getRoom(core.id)?.creator_device === m.device,
    baton: core.baton,
    codeMode: "baton",
    muted: m.muted,
  };
}

export function permitted(ctx: HostCtx, core: RoomCore, by: MemberRef, name: CmdName, target?: { actor: Actor; role: MemberRef["role"]; host?: boolean }): boolean {
  return authorizeCmd(subjectOf(ctx, core, by), name, target).ok;
}

export function syncBaton(ctx: HostCtx, core: RoomCore): void {
  core.baton = ctx.baton.holder;
  ctx.repo.patchRoom(core.id, { baton_actor: core.baton });
}

export function setHost(ctx: HostCtx, core: RoomCore, actor: Actor | null): void {
  core.host = actor;
  if (actor !== null) ctx.repo.patchRoom(core.id, { host_actor: actor });
}

export function kick(ctx: HostCtx, core: RoomCore, by: MemberRef, target: Actor): Outbound[] {
  const room = ctx.repo.getRoom(core.id);
  const rows = ctx.repo.members(core.id).filter((row) => row.actor === target);
  const first = rows[0];
  if (!room || !first || !permitted(ctx, core, by, "member.kick", { actor: target, role: first.role, host: target === core.host })) return [refuse(by)];
  if (target === by.actor || target === core.host || rows.some((row) => row.device_id === room.creator_device)) return [refuse(by)];

  for (const row of rows) ctx.repo.patchMember(core.id, row.device_id, { banned: true });
  const out = [announce(ctx, core, "member.kick", by.actor, { actor: target })];
  if (ctx.baton.holder === target) {
    ctx.baton.release();
    syncBaton(ctx, core);
    out.push(announce(ctx, core, "baton.free", by.actor, { actor: target }));
  }
  for (const member of core.members().filter((live) => live.actor === target)) {
    out.push({
      to: { kind: "member", m: member.m },
      close: CLOSE.kicked,
      frame: { t: "error", code: "kicked", message: "you were removed from the room", retryable: false },
    });
    core.removeMember(member.m);
  }
  return out;
}

export function mute(ctx: HostCtx, core: RoomCore, by: MemberRef, target: Actor, on: boolean): Outbound[] {
  const rows = ctx.repo.members(core.id).filter((row) => row.actor === target);
  if (rows.length === 0 || !permitted(ctx, core, by, "member.mute")) return [refuse(by)];
  for (const row of rows) ctx.repo.patchMember(core.id, row.device_id, { muted: on });
  for (const member of core.members()) if (member.actor === target) member.muted = on;
  return [announce(ctx, core, "member.mute", by.actor, { actor: target, on })];
}

export function lock(ctx: HostCtx, core: RoomCore, by: MemberRef, on: boolean): Outbound[] {
  if (!permitted(ctx, core, by, "room.lock")) return [refuse(by)];
  const state = on ? "locked" : "open";
  if (core.state !== state) {
    ctx.repo.setState(core.id, state, ctx.clock());
    core.state = state;
  }
  core.settings = { ...core.settings, locked: on };
  ctx.repo.patchRoom(core.id, { settings: core.settings });
  return [announce(ctx, core, "room.lock", by.actor, { on })];
}

function mergeSettings(core: RoomCore, patch: Partial<RoomSettings>): RoomSettings | string {
  const current = core.settings;
  const next = { ...current };
  const live = core.members();
  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case "codeMode":
        if (value === "open") return "Open code mode is not built yet";
        if (value !== "baton") return "codeMode must be baton";
        break;
      case "runControl":
        if (value !== "editors" && value !== "host") return "runControl must be editors or host";
        next.runControl = value;
        break;
      case "spectatorCursors":
        if (typeof value !== "boolean") return "spectatorCursors must be true or false";
        next.spectatorCursors = value;
        break;
      case "maxMembers": {
        const floor = Math.max(2, live.filter((member) => !member.spectator).length);
        if (typeof value !== "number" || !Number.isInteger(value) || value > current.maxMembers || value < floor) {
          return `maxMembers must be a whole number from ${floor} to ${current.maxMembers}`;
        }
        next.maxMembers = value;
        break;
      }
      case "maxSpectators": {
        const floor = live.filter((member) => member.spectator).length;
        if (typeof value !== "number" || !Number.isInteger(value) || value > current.maxSpectators || value < floor) {
          return `maxSpectators must be a whole number from ${floor} to ${current.maxSpectators}`;
        }
        next.maxSpectators = value;
        break;
      }
      default:
        return `setting ${key} cannot be changed here`;
    }
  }
  return next;
}

export function changeSettings(ctx: HostCtx, core: RoomCore, by: MemberRef, patch: Partial<RoomSettings>): Outbound[] {
  if (!permitted(ctx, core, by, "room.settings")) return [refuse(by)];
  const next = mergeSettings(core, patch);
  if (typeof next === "string") return [refuse(by, "bad_frame", next)];
  core.settings = next;
  ctx.repo.patchRoom(core.id, { settings: next });
  return [announce(ctx, core, "room.settings", by.actor, { ...patch })];
}

export function closeRoom(ctx: HostCtx, core: RoomCore, by: MemberRef): Outbound[] {
  const room = ctx.repo.getRoom(core.id);
  const subject = subjectOf(ctx, core, by);
  const owner = subject.role === "owner" && !subject.spectator;
  if (!room || !(subject.host || owner)) return [refuse(by)];
  const data = { seq: core.seq, chain: core.chain };
  if (room.state === "closed") return [{ to: { kind: "member", m: by.m }, frame: eventFrame(ctx.clock(), "room.close", by.actor, data) }];

  ctx.repo.setState(core.id, "closed", ctx.clock());
  ctx.baton.release();
  ctx.succession.hostBack();
  const out = [announce(ctx, core, "room.close", by.actor, data)];
  for (const member of core.members()) {
    out.push({ to: { kind: "member", m: member.m }, close: NORMAL_CLOSE });
    core.removeMember(member.m);
  }
  return out;
}

export function presentWriter(core: RoomCore, actor: Actor): MemberRef | undefined {
  return core.members().find((member) => member.actor === actor && !member.spectator && (member.role === "owner" || member.role === "editor"));
}

export function passHost(ctx: HostCtx, core: RoomCore, by: MemberRef, to: Actor): Outbound[] {
  if (!permitted(ctx, core, by, "host.pass") || !presentWriter(core, to)) return [refuse(by)];
  setHost(ctx, core, to);
  return [announce(ctx, core, "host.pass", by.actor, { to })];
}

export function claimHost(ctx: HostCtx, core: RoomCore, by: MemberRef): Outbound[] {
  if (!permitted(ctx, core, by, "host.claim")) return [refuse(by)];
  ctx.succession.hostBack();
  if (core.host === by.actor) return [];
  setHost(ctx, core, by.actor);
  return [announce(ctx, core, "host.claim", by.actor, { to: by.actor })];
}
