import type { OpEnvelope } from "../../../src/project/generated/types.ts";
import type { RoomEvent } from "../../../src/protocol/frames.ts";
import type { TokenBucket } from "../ws/bucket.ts";
import type { RoomsRepo } from "../store/rooms.ts";
import type { RoomCore } from "./core.ts";
import { createRunChannel } from "./run-channel.ts";
import type { RunChannel, RunOutcome } from "./run-channel.ts";
import type { Outbound } from "./types.ts";

type Described = { kind: string; value?: unknown; collection?: unknown };

/** `classifyOp` reads an asset's role from `value`, so assets hand over the asset rather than the whole op. */
function described(env: OpEnvelope): Described {
  const op = env.op as { k: string; asset?: unknown; collection?: unknown };
  return { kind: op.k, value: op.asset ?? op, collection: op.collection };
}

export function createRunHub(d: { clock(): number; repo: RoomsRepo; bucket(): TokenBucket }): {
  forRoom(core: RoomCore): RunChannel;
  toOutbound(core: RoomCore, o: RunOutcome): Outbound[];
} {
  const channels = new WeakMap<RoomCore, RunChannel>();

  function toOutbound(core: RoomCore, o: RunOutcome): Outbound[] {
    const out: Outbound[] = o.send.map(({ to, frame }) => ({
      to: to === "all" ? { kind: "room" } : { kind: "member", m: to.m },
      frame,
    }));
    for (const { kind, by, data } of o.events) {
      const at = d.clock();
      d.repo.addEvent(core.id, at, kind, by, data);
      const frame: RoomEvent = { t: "event", at: new Date(at).toISOString(), kind, ...(by === null ? {} : { by }), data };
      out.push({ to: { kind: "room" }, frame });
    }
    for (const { to, error } of o.errors) out.push({ to: { kind: "member", m: to.m }, frame: error });
    return out;
  }

  return {
    forRoom(core) {
      const existing = channels.get(core);
      if (existing) return existing;
      const channel = createRunChannel(
        {
          settings: () => core.settings,
          members: () => core.members(),
          host: () => core.members().find((m) => m.actor === core.host) ?? null,
        },
        d,
      );
      channels.set(core, channel);
      core.onCommitted((writes) => toOutbound(core, channel.onCommit(core.seq, writes.flatMap((w) => w.envs.map(described)))));
      return channel;
    },
    toOutbound,
  };
}
