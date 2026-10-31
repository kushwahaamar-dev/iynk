import type { OpEnvelope, Project } from "../../../src/project/generated/types.ts";
import { apply } from "../../../src/project/apply/index.ts";
import { chainNext, stateHash } from "../../../src/project/hash.ts";
import { toCanonicalText } from "../../../src/project/normalize.ts";
import { validateValue } from "../../../src/project/validate.ts";
import type { Actor, RoomId } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import type { Logger } from "../ops/log.ts";
import { packDoc, unpackDoc } from "../store/rooms.ts";
import type { CheckpointRow, MemberRow, OpRow, RoomsRepo } from "../store/rooms.ts";
import type { CommitWrite } from "./commit.ts";
import type { RoomCore } from "./core.ts";
import type { Checkpointer, RoomInit } from "./types.ts";

const PAGE = 500;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const EPOCH_CHARS = 8;

export type LoadResult =
  | { ok: true; init: RoomInit; members: MemberRow[]; fromCheckpoint: number; replayed: number }
  | { ok: false; reason: "missing" | "corrupt"; atSeq?: number };

type Position = { doc: Project; seq: number; chain: string };
type Replayed = ({ ok: true } & Position & { replayed: number }) | { ok: false; atSeq: number; pruned: boolean };

export class CheckpointPolicy implements Checkpointer {
  readonly #repo: RoomsRepo;
  readonly #limits: CollabLimits;
  readonly #clock: () => number;
  readonly #log: Logger | undefined;
  readonly #last = new Map<string, { seq: number; at: number }>();

  constructor(repo: RoomsRepo, limits: CollabLimits, clock: () => number, log?: Logger) {
    this.#repo = repo;
    this.#limits = limits;
    this.#clock = clock;
    this.#log = log;
  }

  afterCommit(core: RoomCore, group: CommitWrite[]): void {
    const now = this.#clock();
    const last = this.#last.get(core.id) ?? this.#startOf(core.id, now);
    const sinceOps = core.seq - last.seq;
    if (sinceOps < this.#limits.checkpointEveryOps && (sinceOps === 0 || now - last.at < this.#limits.checkpointEveryMs)) return;
    const hash = group[group.length - 1]?.write.state_hash ?? stateHash(core.doc);
    try {
      this.#repo.putCheckpoint({
        room_id: core.id,
        seq: core.seq,
        state_hash: hash,
        chain: core.chain,
        doc: packDoc(toCanonicalText(core.doc)),
        at: now,
        kind: "auto",
      });
      this.#repo.pruneCheckpoints(core.id, this.#limits.keepCheckpoints);
      this.#repo.nullOldPayloads(core.id, this.#limits.keepPayloadOps);
      this.#last.set(core.id, { seq: core.seq, at: now });
    } catch (error) {
      this.#log?.warn("room.checkpoint_failed", { room: core.id, seq: core.seq, error: String(error) });
    }
  }

  #startOf(id: string, now: number): { seq: number; at: number } {
    const latest = this.#repo.latestCheckpoint(id);
    return { seq: latest?.seq ?? 0, at: latest?.at ?? now };
  }
}

function readCheckpoint(c: CheckpointRow): Project | null {
  try {
    const report = validateValue(JSON.parse(unpackDoc(c.doc)));
    return report.ok && report.doc && stateHash(report.doc) === c.state_hash ? report.doc : null;
  } catch {
    return null;
  }
}

function readEnvelope(row: OpRow): OpEnvelope | null {
  if (row.env === null) return null;
  try {
    return JSON.parse(Buffer.from(row.env).toString("utf8")) as OpEnvelope;
  } catch {
    return null;
  }
}

function replay(repo: RoomsRepo, id: RoomId, from: Position, until: number): Replayed {
  let { doc, seq, chain } = from;
  let replayed = 0;
  while (seq < until) {
    const rows = repo.loadTail(id, seq, Math.min(PAGE, until - seq));
    if (rows.length === 0) break;
    for (const row of rows) {
      const env = readEnvelope(row);
      if (row.seq !== seq + 1 || !env) return { ok: false, atSeq: row.seq, pruned: row.env === null };
      const next = chainNext(chain, env);
      const outcome = apply(doc, env.op, { author: env.author, at: env.at });
      if (env.seq !== row.seq || next !== row.chain || !outcome.ok) return { ok: false, atSeq: row.seq, pruned: false };
      doc = outcome.state;
      chain = next;
      seq = row.seq;
      replayed += 1;
    }
  }
  return { ok: true, doc, seq, chain, replayed };
}

export function loadRoomState(repo: RoomsRepo, id: RoomId): LoadResult {
  const room = repo.getRoom(id);
  if (!room) return { ok: false, reason: "missing" };
  if (room.state === "corrupt") return { ok: false, reason: "corrupt" };
  const checkpoint = repo.latestCheckpoint(id);
  const doc = checkpoint && readCheckpoint(checkpoint);
  if (!checkpoint || !doc) return { ok: false, reason: "corrupt", atSeq: checkpoint?.seq };

  const result = replay(repo, id, { doc, seq: checkpoint.seq, chain: checkpoint.chain }, room.seq);
  if (!result.ok) return { ok: false, reason: "corrupt", atSeq: result.atSeq };
  if (result.seq !== room.seq || result.chain !== room.chain || stateHash(result.doc) !== room.state_hash) {
    return { ok: false, reason: "corrupt", atSeq: result.seq };
  }
  return {
    ok: true,
    init: {
      id,
      projectId: room.project_id,
      epoch: room.epoch,
      doc: result.doc,
      seq: result.seq,
      chain: result.chain,
      host: room.host_actor as Actor,
      baton: room.baton_actor as Actor | null,
      settings: room.settings,
      state: room.state === "locked" ? "locked" : "open",
    },
    members: repo.members(id),
    fromCheckpoint: checkpoint.seq,
    replayed: result.replayed,
  };
}

export function verifyChainFull(repo: RoomsRepo, id: RoomId): { ok: true } | { ok: false; atSeq: number } {
  const room = repo.getRoom(id);
  let seq = 0;
  let chain = repo.chainAt(id, 0);
  if (!room || chain === null) return { ok: false, atSeq: 0 };
  for (;;) {
    const rows = repo.loadTail(id, seq, PAGE);
    if (rows.length === 0) break;
    for (const row of rows) {
      const env = readEnvelope(row);
      if (row.seq !== seq + 1 || (row.env !== null && (!env || env.seq !== row.seq || chainNext(chain, env) !== row.chain))) {
        return { ok: false, atSeq: row.seq };
      }
      chain = row.chain;
      seq = row.seq;
    }
  }
  return seq === room.seq && chain === room.chain ? { ok: true } : { ok: false, atSeq: seq };
}

function holds(repo: RoomsRepo, id: RoomId, candidate: CheckpointRow, older: CheckpointRow | null): boolean {
  if (!readCheckpoint(candidate)) return false;
  const base = older && readCheckpoint(older);
  if (!older || !base) return true;
  const result = replay(repo, id, { doc: base, seq: older.seq, chain: older.chain }, candidate.seq);
  if (!result.ok) return result.pruned;
  return result.seq === candidate.seq && result.chain === candidate.chain && stateHash(result.doc) === candidate.state_hash;
}

export function randomBase32(random: (n: number) => Uint8Array, chars: number): string {
  return Array.from(random(chars), (byte) => BASE32[byte & 31]).join("");
}

export function newEpoch(random: (n: number) => Uint8Array): string {
  return randomBase32(random, EPOCH_CHARS);
}

export function restoreFromCheckpoint(
  repo: RoomsRepo,
  id: RoomId,
  random: (n: number) => Uint8Array,
  clock: () => number = Date.now,
): { epoch: string; seq: number } | null {
  let candidate = repo.latestCheckpoint(id);
  while (candidate) {
    const older = candidate.seq > 0 ? repo.latestCheckpoint(id, candidate.seq - 1) : null;
    if (holds(repo, id, candidate, older)) {
      const epoch = newEpoch(random);
      repo.rewindTo(id, candidate, epoch, clock());
      return { epoch, seq: candidate.seq };
    }
    candidate = older;
  }
  return null;
}
