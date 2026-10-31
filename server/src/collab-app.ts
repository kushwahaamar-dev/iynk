import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { Actor, DeviceId as WireDevice, RoomId } from "../../src/protocol/frames.ts";
import { createAssetsRepo } from "./assets/store.ts";
import { assetRoutes } from "./assets/routes.ts";
import type { RouteDeps } from "./app.ts";
import { areBuddies } from "./buddies/visibility.ts";
import { fetchBuddies } from "./buddies/list.ts";
import { type RouteDef } from "./http/classes.ts";
import { inviteRoutes } from "./http/room-invites.ts";
import { roomRoutes } from "./http/rooms.ts";
import { getDevice } from "./identity/devices.ts";
import { createRoomsRepo } from "./store/rooms.ts";
import type { CommitWrite } from "./rooms/commit.ts";
import { CheckpointPolicy } from "./rooms/checkpoint.ts";
import { createCommandRegistry } from "./rooms/commands.ts";
import { MEMBER_COLORS } from "./rooms/lifecycle.ts";
import { RoomRegistry } from "./rooms/registry.ts";
import type { RoomCore } from "./rooms/core.ts";
import { createScoresRepo } from "./scores/store.ts";
import { scoreRoutes } from "./scores/routes.ts";
import { createSharesRepo } from "./shares/store.ts";
import { shareRoutes } from "./shares/routes.ts";
import { AuthLimiter, type DeviceLookup } from "./ws/auth.ts";
import { ChatRing } from "./ws/chat.ts";
import { CursorBatcher } from "./ws/cursors.ts";
import { LobbyHub, type BuddyInfo } from "./ws/lobby.ts";
import { NonceStore } from "./ws/nonces.ts";
import { PresenceHub } from "./ws/presence.ts";
import { createWsServer } from "./ws/server.ts";
import { SessionRegistry } from "./ws/sessions.ts";

export type TestHooks = { afterCommit?: (group: CommitWrite[]) => void };

export type Collab = {
  routes: RouteDef[];
  onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  registry: RoomRegistry;
  buddyRemoval: NonNullable<RouteDeps["buddyRemoval"]>;
  jobs: { start(): void; stop(): void };
  drain(): Promise<void>;
  shutdown(): void;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const REVOCATION_POLL_MS = 5 * SECOND;
const RESTART_RETRY_MS = 2000;
const SHARE_TOMBSTONE_MS = 30 * DAY;
const UNREFERENCED_ASSET_MS = DAY;
const DRAIN_POLL_MS = 25;
const SALT_BYTES = 16;

const noop = (): void => {};

const wsMetrics = { sockets: noop, closed: noop, frameIn: noop, frameDropped: noop, dispatchSeconds: noop };
const coreMetrics = { opsAccepted: noop, opRejected: noop, dedupHit: noop, commitSeconds: noop, queueDepth: noop };

function perRoom<T>(make: () => T): (core: RoomCore) => T {
  const made = new WeakMap<RoomCore, T>();
  return (core) => {
    let value = made.get(core);
    if (value === undefined) {
      value = make();
      made.set(core, value);
    }
    return value;
  };
}

export function mountCollab(ctx: RouteDeps, o: { hooks?: TestHooks } = {}): Collab {
  const { config, store, deps, log, limits } = ctx;
  const clock = deps.clock.now;
  const random = deps.ids.random;
  const publicUrl = config.publicUrl.origin;

  const repo = createRoomsRepo(store);
  const assets = createAssetsRepo(store, limits.deviceQuotaBytes);
  const shares = createSharesRepo(store, limits);
  const scores = createScoresRepo(store);

  const device = (id: string) => store.read((tx) => getDevice(tx, id));
  const lookup: DeviceLookup = (id) => device(id) as ReturnType<DeviceLookup>;
  const isBuddy = (a: string, b: string): boolean => store.read((tx) => areBuddies(tx, a, b));
  const buddyInfos = (me: string): BuddyInfo[] =>
    store.read((tx) =>
      fetchBuddies(tx, me, clock()).map((buddy) => ({
        device: buddy.deviceId as WireDevice,
        actor: buddy.identityId as Actor,
        name: buddy.displayName,
        color: buddy.color ?? MEMBER_COLORS[0],
        showOnline: buddy.online !== null,
      })),
    );

  const timers = {
    set(fn: () => void, ms: number): () => void {
      const timer = setTimeout(fn, ms);
      timer.unref();
      return () => clearTimeout(timer);
    },
  };

  const lobby = new LobbyHub({ buddiesOf: buddyInfos });
  const sessions = new SessionRegistry();
  const nonces = new NonceStore(clock, limits.helloTimeoutMs);
  const authLimiter = new AuthLimiter(limits, clock);
  const emit: Parameters<typeof createCommandRegistry>[0]["emit"] = (core, out) => ws.emit(core, out);
  const commands = createCommandRegistry({ repo, clock, timers, emit });
  const checkpoints = new CheckpointPolicy(repo, limits, clock, log);

  const registry = new RoomRegistry({
    repo,
    limits,
    clock,
    commands,
    checkpoints,
    hasBlob: (room, sha) => assets.has(room, sha),
    metrics: coreMetrics,
    emit,
    log,
    ...(o.hooks?.afterCommit ? { afterCommit: o.hooks.afterCommit } : {}),
  });

  const lifecycle = { repo, registry, commands, emit, limits, clock, random, sleep: deps.sleep, log, device };

  const routes = [
    ...roomRoutes(lifecycle),
    ...inviteRoutes({
      ...lifecycle,
      lobby,
      isBuddy,
      deviceOf: (identity) => device(identity),
      publicUrl,
    }),
    ...assetRoutes({
      repo: assets,
      roleOf: (room, id) => registry.roleOf(room as RoomId, id),
      roomsOf: (id) => repo.listRoomsFor(id).map((room) => room.id),
      roomListsAsset: (room, sha) => registry.listsAsset(room as RoomId, sha),
      limits,
      now: clock,
    }),
    ...shareRoutes({
      repo: shares,
      ownsBlob: (owner, sha) => assets.uploaded(owner, sha),
      isBuddy,
      blob: (sha) => assets.get(sha),
      authenticateBearer: (header) => {
        const token = /^Bearer (\S+)$/.exec(header ?? "")?.[1];
        return token === undefined ? null : ctx.authenticate(token);
      },
      limits,
      now: clock,
      random,
      log,
      publicUrl,
    }),
    ...scoreRoutes({
      repo: scores,
      buddiesOf: (id) => buddyInfos(id).map((buddy) => buddy.device),
      deviceInfo: (ids) =>
        new Map(
          ids.flatMap((id) => {
            const row = device(id);
            return row === null ? [] : [[id, { identityId: row.identityId as Actor, displayName: row.name }] as const];
          }),
        ),
      now: clock,
    }),
  ];

  const ws = createWsServer({
    registry,
    lobby,
    sessions,
    nonces,
    limiter: authLimiter,
    lookup,
    repo,
    commands,
    limits,
    clock,
    timers,
    aud: config.audience,
    origins: { allows: (origin) => config.allowedOrigins.includes(origin) },
    trustProxy: config.trustProxy,
    salt: random(SALT_BYTES),
    log,
    metrics: wsMetrics,
    presence: perRoom(() => new PresenceHub(limits, clock)),
    cursors: perRoom(() => new CursorBatcher(limits, clock)),
    chat: perRoom(() => new ChatRing(limits, clock)),
  });

  const buddyRemoval: Collab["buddyRemoval"] = (_tx, a, b) => {
    const removed = registry.removeSharedAccess(a, b);
    return () => {
      removed.after();
      lobby.buddyRemoved(a as WireDevice, b as WireDevice);
    };
  };

  const revokedSince = (() => {
    let since = clock();
    return (): WireDevice[] => {
      const from = since;
      since = clock();
      return store.read((tx) => tx.all<{ id: string }>("SELECT id FROM devices WHERE revoked_at >= ?", from)).map((row) => row.id as WireDevice);
    };
  })();

  const guarded = (name: string, fn: () => void) => () => {
    try {
      fn();
    } catch (error) {
      log.error("job_failed", { job: name, error });
    }
  };

  let timersRunning: NodeJS.Timeout[] = [];
  let stopRevocationWatch: (() => void) | null = null;

  const jobs = {
    start(): void {
      if (timersRunning.length > 0) return;
      const every = (ms: number, name: string, fn: () => void) => {
        const timer = setInterval(guarded(name, fn), ms);
        timer.unref();
        timersRunning.push(timer);
      };
      every(MINUTE, "evict_idle", () => registry.evictIdle());
      every(5 * MINUTE, "sweep", () => {
        registry.sweep();
        shares.sweep(clock(), SHARE_TOMBSTONE_MS);
      });
      every(HOUR, "sweep_assets", () => assets.sweepUnreferenced(clock(), UNREFERENCED_ASSET_MS, (room, sha) => registry.listsAsset(room as RoomId, sha)));
      stopRevocationWatch = sessions.startRevocationWatch(() => {
        const revoked = revokedSince();
        for (const id of revoked) registry.dropDevice(id);
        return revoked;
      }, REVOCATION_POLL_MS);
    },
    stop(): void {
      for (const timer of timersRunning) clearInterval(timer);
      timersRunning = [];
      stopRevocationWatch?.();
      stopRevocationWatch = null;
    },
  };

  let draining: Promise<void> | null = null;

  return {
    routes,
    onUpgrade: (req, socket, head) => ws.upgrade(req, socket, head),
    registry,
    buddyRemoval,
    jobs,
    drain() {
      draining ??= (async () => {
        jobs.stop();
        await ws.drain(RESTART_RETRY_MS);
        for (let waited = 0; ws.sockets() > 0 && waited < RESTART_RETRY_MS; waited += DRAIN_POLL_MS) {
          await new Promise((resolve) => setTimeout(resolve, DRAIN_POLL_MS));
        }
        await ws.close();
      })();
      return draining;
    },
    shutdown: () => registry.shutdown(),
  };
}
