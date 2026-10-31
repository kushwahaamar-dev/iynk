import { gzipSync } from "node:zlib";
import type { OpEnvelope } from "../../../src/project/generated/types.ts";
import type { Hello, RoomId, ServerFrame, Snapshot, Tail, WireEnvelope } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import { unpackDoc } from "../store/rooms.ts";
import type { CheckpointRow, RoomsRepo } from "../store/rooms.ts";

export type ResumePlan = {
  kind: "none" | "tail" | "snapshot" | "ff";
  reason: Snapshot["reason"] | null;
  epochBreak: boolean;
  frames: ServerFrame[];
};

type RoomHead = { id: RoomId; epoch: string; seq: number; chain: string };

const defaultGzipSize = (envs: OpEnvelope[]): number => gzipSync(JSON.stringify(envs)).length;

function retainedEnvelopes(repo: RoomsRepo, room: RoomHead, after: number): WireEnvelope[] | null {
  const rows = repo.loadTail(room.id, after, room.seq - after);
  if (rows.length !== room.seq - after) return null;
  const envs: WireEnvelope[] = [];
  for (const row of rows) {
    if (row.env === null) return null;
    envs.push(JSON.parse(Buffer.from(row.env).toString("utf8")) as WireEnvelope);
  }
  return envs;
}

function tailFrame(after: number, room: RoomHead, envs: WireEnvelope[]): Tail {
  return { t: "tail", from: after + 1, to: room.seq, envs, chain: room.chain };
}

function snapshotPlan(repo: RoomsRepo, room: RoomHead, reason: Snapshot["reason"], epochBreak: boolean): ResumePlan {
  const checkpoint = repo.latestCheckpoint(room.id) as CheckpointRow;
  const snapshot: Snapshot = {
    t: "snapshot",
    reason,
    seq: checkpoint.seq,
    chain: checkpoint.chain,
    stateHash: checkpoint.state_hash,
    doc: JSON.parse(unpackDoc(checkpoint.doc)) as Snapshot["doc"],
  };
  const frames: ServerFrame[] = [snapshot];
  if (checkpoint.seq < room.seq) {
    const envs = retainedEnvelopes(repo, room, checkpoint.seq);
    if (!envs) throw new Error(`room ${room.id} is missing the ops after its checkpoint at ${checkpoint.seq}`);
    frames.push(tailFrame(checkpoint.seq, room, envs));
  }
  return { kind: "snapshot", reason, epochBreak, frames };
}

export function decideResume(
  repo: RoomsRepo,
  room: RoomHead,
  hello: Pick<Hello, "resume" | "local">,
  limits: CollabLimits,
  gzipSize: (envs: OpEnvelope[]) => number = defaultGzipSize,
): ResumePlan {
  const { resume, local } = hello;
  if (resume && (resume.epoch !== room.epoch || resume.seq > room.seq)) return snapshotPlan(repo, room, "epoch", true);
  if (resume?.seq === room.seq) return { kind: "none", reason: null, epochBreak: false, frames: [] };

  const base = resume?.seq ?? (local && repo.chainAt(room.id, local.rev) === local.chain ? local.rev : null);
  if (base === null) return snapshotPlan(repo, room, resume ? "resume" : "join", false);
  if (base === room.seq) return { kind: "ff", reason: null, epochBreak: false, frames: [] };

  const envs = room.seq - base <= limits.resumeTailOps ? retainedEnvelopes(repo, room, base) : null;
  if (!envs || gzipSize(envs as unknown as OpEnvelope[]) > limits.resumeTailGzipBytes) {
    return snapshotPlan(repo, room, resume ? "resume" : "join", false);
  }
  return { kind: resume ? "tail" : "ff", reason: null, epochBreak: false, frames: [tailFrame(base, room, envs)] };
}
