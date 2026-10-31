import type { Project } from "../../../src/project/generated/types.ts";
import type { apply } from "../../../src/project/apply/index.ts";
import type { Actor, Cmd, DeviceId, Role, RoomId, RoomSettings, ServerFrame } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import type { Logger } from "../ops/log.ts";
import type { RoomsRepo } from "../store/rooms.ts";
import type { CommitWrite } from "./commit.ts";
import type { RoomCore } from "./core.ts";

export type MemberRef = {
  m: number;
  device: DeviceId;
  actor: Actor;
  role: Role;
  spectator: boolean;
  name: string;
  color: string;
  muted: boolean;
  ready: boolean;
};

export type Target = { kind: "member"; m: number } | { kind: "room"; except?: number };

export type Outbound =
  | { to: Target; frame: ServerFrame }
  | { to: { kind: "member"; m: number }; close: number; frame?: ServerFrame };

export type RoomInit = {
  id: RoomId;
  projectId: string;
  epoch: string;
  doc: Project;
  seq: number;
  chain: string;
  host: Actor | null;
  baton: Actor | null;
  settings: RoomSettings;
  state: "open" | "locked";
};

export interface Checkpointer {
  afterCommit(core: RoomCore, group: CommitWrite[]): void;
}

export interface CommandRegistry {
  handle(core: RoomCore, m: MemberRef, cmd: Cmd): Outbound[];
}

export interface CoreMetrics {
  opsAccepted(n: number): void;
  opRejected(code: string): void;
  dedupHit(): void;
  commitSeconds(seconds: number): void;
  queueDepth(n: number): void;
}

export type CoreDeps = {
  repo: RoomsRepo;
  limits: CollabLimits;
  clock: () => number;
  metrics: CoreMetrics;
  hasBlob(room: RoomId, sha256: string): boolean;
  log?: Logger;
  checkpointer?: Checkpointer;
  commands?: CommandRegistry;
  /** Test seam: T-B7-20 passes mutated `apply` functions (ADR-0409). */
  apply?: typeof apply;
  /** Test seam: runs after COMMIT and before any frame is returned; T-B7-33 kills the process here. */
  afterCommit?: (group: CommitWrite[]) => void;
};
