import type { Actor, Cmd, RoomId, RoomSettings } from "../../../src/protocol/frames.ts";
import type { RoomsRepo } from "../store/rooms.ts";
import { Baton } from "./baton.ts";
import type { Timers } from "./baton.ts";
import type { RoomCore } from "./core.ts";
import {
  announce,
  changeSettings,
  claimHost,
  closeRoom,
  kick,
  lock,
  mute,
  passHost,
  permitted,
  presentWriter,
  refuse,
  setHost,
  syncBaton,
} from "./host.ts";
import type { HostCtx } from "./host.ts";
import { HostSuccession } from "./succession.ts";
import type { Present } from "./succession.ts";
import type { CommandRegistry, MemberRef, Outbound } from "./types.ts";

const BATON_HOLD_MS = 30_000;
const HOST_GRACE_MS = 60_000;

const actorArg = (args: Record<string, unknown>, key: string): Actor | null => {
  const value = args[key];
  return typeof value === "string" && value.startsWith("usr_") ? (value as Actor) : null;
};

const withRef = (out: Outbound, ref: string): Outbound =>
  "frame" in out && out.frame?.t === "error" ? { ...out, frame: { ...out.frame, ref } } : out;

export function createCommandRegistry(d: {
  repo: RoomsRepo;
  clock: () => number;
  timers: Timers;
  emit: (core: RoomCore, out: Outbound[]) => void;
}): CommandRegistry & {
  memberLeft(core: RoomCore, m: MemberRef): Outbound[];
  memberBack(core: RoomCore, m: MemberRef): Outbound[];
} {
  const rooms = new Map<RoomId, HostCtx>();

  const ctxFor = (core: RoomCore): HostCtx => {
    let ctx = rooms.get(core.id);
    if (!ctx) {
      ctx = {
        repo: d.repo,
        clock: d.clock,
        baton: new Baton(core.baton, d.timers, BATON_HOLD_MS),
        succession: new HostSuccession(d.timers, HOST_GRACE_MS),
      };
      rooms.set(core.id, ctx);
    }
    return ctx;
  };

  const present = (core: RoomCore): Present[] => {
    const joined = new Map(d.repo.members(core.id).map((row) => [row.device_id, row.joined_at]));
    return core.members().map((member) => ({
      actor: member.actor,
      role: member.role,
      spectator: member.spectator,
      presentSince: joined.get(member.device) ?? d.clock(),
    }));
  };

  const requestBaton = (ctx: HostCtx, core: RoomCore, m: MemberRef): Outbound[] => {
    if (!permitted(ctx, core, m, "baton.request")) return [refuse(m)];
    if (core.baton === m.actor) return [];
    const { granted, askedOf } = ctx.baton.request(m.actor);
    if (!granted) return [announce(ctx, core, "baton.request", m.actor, { holder: askedOf })];
    syncBaton(ctx, core);
    return [announce(ctx, core, "baton.grant", m.actor, { to: m.actor })];
  };

  const grantBaton = (ctx: HostCtx, core: RoomCore, m: MemberRef, to: Actor): Outbound[] => {
    if (!permitted(ctx, core, m, "baton.grant") || !presentWriter(core, to)) return [refuse(m)];
    ctx.baton.grant(to);
    syncBaton(ctx, core);
    return [announce(ctx, core, "baton.grant", m.actor, { to })];
  };

  const releaseBaton = (ctx: HostCtx, core: RoomCore, m: MemberRef): Outbound[] => {
    if (!permitted(ctx, core, m, "baton.release")) return [refuse(m)];
    ctx.baton.release();
    syncBaton(ctx, core);
    return [announce(ctx, core, "baton.release", m.actor, {})];
  };

  const takeBaton = (ctx: HostCtx, core: RoomCore, m: MemberRef): Outbound[] => {
    if (!permitted(ctx, core, m, "baton.take")) return [refuse(m)];
    ctx.baton.take(m.actor);
    syncBaton(ctx, core);
    return [announce(ctx, core, "baton.take", m.actor, { to: m.actor })];
  };

  const dispatch = (ctx: HostCtx, core: RoomCore, m: MemberRef, cmd: Cmd): Outbound[] => {
    const args = cmd.args ?? {};
    const actor = actorArg(args, "actor");
    const to = actorArg(args, "to");
    switch (cmd.name) {
      case "baton.request":
        return requestBaton(ctx, core, m);
      case "baton.grant":
        return to ? grantBaton(ctx, core, m, to) : [refuse(m, "bad_frame", "to must be a member")];
      case "baton.release":
        return releaseBaton(ctx, core, m);
      case "baton.take":
        return takeBaton(ctx, core, m);
      case "host.pass":
        return to ? passHost(ctx, core, m, to) : [refuse(m, "bad_frame", "to must be a member")];
      case "host.claim":
        return claimHost(ctx, core, m);
      case "member.kick":
        return actor ? kick(ctx, core, m, actor) : [refuse(m, "bad_frame", "actor must be a member")];
      case "member.mute":
        return actor && typeof args.on === "boolean" ? mute(ctx, core, m, actor, args.on) : [refuse(m, "bad_frame", "mute needs actor and on")];
      case "room.lock":
        return typeof args.on === "boolean" ? lock(ctx, core, m, args.on) : [refuse(m, "bad_frame", "lock needs on")];
      case "room.settings":
        return changeSettings(ctx, core, m, args as Partial<RoomSettings>);
      case "room.close": {
        const out = closeRoom(ctx, core, m);
        if (d.repo.getRoom(core.id)?.state === "closed") rooms.delete(core.id);
        return out;
      }
      case "room.pin":
        return [{ to: { kind: "member", m: m.m }, frame: { t: "error", code: "bad_type", message: "pinning is not built yet", retryable: false } }];
    }
  };

  return {
    handle(core, m, cmd) {
      return dispatch(ctxFor(core), core, m, cmd).map((out) => withRef(out, cmd.id));
    },

    memberLeft(core, m) {
      if (core.members().some((other) => other.m !== m.m && other.actor === m.actor)) return [];
      const ctx = ctxFor(core);
      if (ctx.baton.holder === m.actor) {
        ctx.baton.disconnected(m.actor, () => {
          syncBaton(ctx, core);
          d.emit(core, [announce(ctx, core, "baton.free", null, { actor: m.actor })]);
        });
      }
      if (core.host === m.actor) {
        ctx.succession.hostLeft(() => {
          const next = ctx.succession.pick(present(core));
          setHost(ctx, core, next);
          d.emit(core, [announce(ctx, core, "host.expire", null, { to: next })]);
        });
      }
      return [];
    },

    memberBack(core, m) {
      const ctx = ctxFor(core);
      ctx.baton.reconnected(m.actor);
      if (core.host === m.actor) ctx.succession.hostBack();
      return [];
    },
  };
}
