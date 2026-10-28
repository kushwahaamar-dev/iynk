import type { OpEnvelope, Project } from "@/project/generated/types";
import type { RecordLoad } from "./repository";

export type SaveReason = "debounce" | "maxwait" | "hidden" | "pagehide" | "manual";

export interface LoadResult {
  status: RecordLoad["status"];
  state?: Project;
  revision?: number;
  hash?: string;
}

/** The port adds `v` and `id` on the way out and the handler never sees them. */
export type ProjectReq =
  | { t: "load"; projectId: string }
  | { t: "open"; projectId: string; state: Project; revision: number }
  | { t: "commit"; fromRevision: number; toRevision: number; ops: OpEnvelope[] }
  | { t: "save"; reason: SaveReason }
  | { t: "close"; projectId: string }
  /** The session's `onCompact` snapshot; it goes to the `revisions` store. */
  | { t: "revision"; revision: number; state: Project; stateHash: string };

export type SaveFailure = "quota" | "blocked" | "conflict" | "validation" | "unavailable";

export type ProjectEv =
  | { t: "saved"; revision: number; hash: string; writtenAt: number }
  | { t: "save_failed"; kind: SaveFailure; detail: string }
  | { t: "hash_mismatch"; revision: number; workerHash: string }
  | { t: "worker_restarted" }
  /** Load or open fell back to the previous slot: the last save was damaged and an older copy was opened. */
  | { t: "recovered_from_previous"; projectId: string; revision: number }
  /** Both slots failed their hash check. Nothing was deleted. */
  | { t: "record_lost"; projectId: string }
  /** The worker fell back to the memory repository, so projects are not kept. */
  | { t: "degraded"; reason: "indexeddb-unavailable" };

export interface OpenResult {
  accepted: boolean;
}

export interface CommitResult {
  folded: boolean;
}

export interface SaveOutcome {
  written: boolean;
}
