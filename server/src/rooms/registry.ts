import { CLOSE } from "../../../src/protocol/close-codes.ts";
import type { Role, RoomId } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import type { Logger } from "../ops/log.ts";
import { unpackDoc } from "../store/rooms.ts";
import type { DeviceId, RoomRow, RoomsRepo } from "../store/rooms.ts";
import { loadRoomState } from "./checkpoint.ts";
import { RoomCore } from "./core.ts";
import type { Checkpointer, CommandRegistry, CoreMetrics, Outbound } from "./types.ts";

const DAY_MS = 86_400_000;
const NORMAL_CLOSE = 1000;

export const IDLE_EXPIRE_MS = 30 * DAY_MS;

export type OpenResult = { status: "ok"; core: RoomCore } | { status: "missing" | "closed" | "corrupt" | "live_cap" };

export type RegistryDeps = {
  repo: RoomsRepo;
  limits: CollabLimits;
  clock: () => number;
  commands: CommandRegistry;
  checkpoints: Checkpointer;
  hasBlob: (room: RoomId, sha: string) => boolean;
  metrics: CoreMetrics;
  emit: (core: RoomCore, out: Outbound[]) => void;
  log: Logger;
};

/** A room that was locked before it went idle or was restored comes back locked. */
export function settleState(repo: RoomsRepo, room: Pick<RoomRow, "id" | "settings">, now: number): void {
  if (room.settings.locked) repo.setState(room.id, "locked", now);
}

export class RoomRegistry {
  readonly #d: RegistryDeps;
  readonly #live = new Map<RoomId, RoomCore>();
  readonly #seen = new Map<RoomId, number>();

  constructor(d: RegistryDeps) {
    this.#d = d;
  }

  open(id: RoomId): OpenResult {
    const { repo, limits, clock } = this.#d;
    const room = repo.getRoom(id);
    if (!room) return { status: "missing" };
    if (room.state === "closed") return { status: "closed" };
    if (room.state === "corrupt") return { status: "corrupt" };
    const live = this.#live.get(id);
    if (live) return { status: "ok", core: live };
    if (this.#live.size >= limits.maxLiveRooms) return { status: "live_cap" };

    const loaded = loadRoomState(repo, id);
    if (!loaded.ok) {
      if (loaded.reason === "corrupt") {
        repo.setState(id, "corrupt", clock());
        this.#d.log.error("room.corrupt", { room: id, atSeq: loaded.atSeq });
      }
      return { status: loaded.reason };
    }
    const now = clock();
    if (room.state === "idle") {
      repo.setState(id, "open", now);
      settleState(repo, room, now);
    }
    const core = new RoomCore(
      { ...loaded.init, state: room.settings.locked ? "locked" : "open" },
      {
        repo,
        limits,
        clock,
        metrics: this.#d.metrics,
        hasBlob: this.#d.hasBlob,
        log: this.#d.log,
        checkpointer: this.#d.checkpoints,
        commands: this.#d.commands,
      },
    );
    this.#live.set(id, core);
    this.#seen.set(id, now);
    this.#d.log.info("room.open", { room: id, fromCheckpoint: loaded.fromCheckpoint, replayed: loaded.replayed });
    return { status: "ok", core };
  }

  live(): readonly RoomCore[] {
    return [...this.#live.values()];
  }

  liveCount(): number {
    return this.#live.size;
  }

  /** Drops a room that was closed from memory without touching its stored state. */
  forget(id: RoomId): void {
    this.#live.delete(id);
    this.#seen.delete(id);
  }

  evictIdle(): number {
    const { repo, clock, limits, log } = this.#d;
    const now = clock();
    let evicted = 0;
    for (const [id, core] of this.#live) {
      const state = repo.getRoom(id)?.state;
      if (core.members().length > 0 && state !== "closed") {
        this.#seen.set(id, now);
        continue;
      }
      if (state !== "closed" && now - (this.#seen.get(id) ?? now) < limits.idleEvictMs) continue;
      if (state === "open" || state === "locked") {
        core.flush();
        repo.setState(id, "idle", now);
      }
      this.forget(id);
      evicted += 1;
      log.info("room.evict", { room: id });
    }
    return evicted;
  }

  roleOf(id: RoomId, device: DeviceId): Role | null {
    const member = this.#d.repo.member(id, device);
    return member && !member.banned ? member.role : null;
  }

  listsAsset(id: RoomId, sha256Hex: string): boolean {
    const live = this.#live.get(id);
    if (live) return live.doc.assets.some((asset) => asset.sha256 === sha256Hex);
    const checkpoint = this.#d.repo.latestCheckpoint(id);
    if (!checkpoint) return false;
    const doc = JSON.parse(unpackDoc(checkpoint.doc)) as { assets?: { sha256: string }[] };
    return (doc.assets ?? []).some((asset) => asset.sha256 === sha256Hex);
  }

  removeSharedAccess(a: DeviceId, b: DeviceId): { rooms: string[]; after(): void } {
    const { repo } = this.#d;
    const rooms = repo.removeCrossMembers(a, b);
    repo.deleteInvitesBetween(a, b);
    return {
      rooms,
      after: () => {
        for (const id of rooms) {
          const core = this.#live.get(id as RoomId);
          if (!core) continue;
          const gone = core.members().filter((member) => (member.device === a || member.device === b) && repo.member(id, member.device) === null);
          this.#expel(core, gone.map((member) => member.m));
        }
      },
    };
  }

  dropDevice(device: DeviceId): string[] {
    const { repo, clock } = this.#d;
    const rooms = repo.listRoomsFor(device);
    for (const room of rooms) {
      repo.removeMember(room.id, device);
      const core = this.#live.get(room.id as RoomId);
      if (core) this.#expel(core, core.members().filter((member) => member.device === device).map((member) => member.m));

      const hasOwner = repo.members(room.id).some((member) => member.role === "owner" && !member.banned);
      if (hasOwner || (room.state !== "open" && room.state !== "locked" && room.state !== "idle")) continue;
      const now = clock();
      repo.setState(room.id, "closed", now);
      repo.addEvent(room.id, now, "room.close", null, { reason: "no_owner" });
      this.#d.log.info("room.close", { room: room.id, reason: "no_owner" });
      if (core) {
        this.#expel(core, core.members().map((member) => member.m), NORMAL_CLOSE);
        this.forget(core.id);
      }
    }
    return rooms.map((room) => room.id);
  }

  sweep(): { closed: number; erased: number } {
    const { repo, clock, limits, log } = this.#d;
    const result = repo.sweep(clock(), limits.closedRetentionDays * DAY_MS, IDLE_EXPIRE_MS);
    if (result.erased > 0) log.info("room.erase", { count: result.erased });
    return result;
  }

  shutdown(): void {
    for (const core of this.#live.values()) this.#d.emit(core, core.flush());
    this.#live.clear();
    this.#seen.clear();
  }

  #expel(core: RoomCore, members: number[], code: number = CLOSE.roomUnavailable): void {
    if (members.length === 0) return;
    this.#d.emit(core, members.map((m) => ({ to: { kind: "member", m }, close: code })));
    for (const m of members) core.removeMember(m);
  }
}
