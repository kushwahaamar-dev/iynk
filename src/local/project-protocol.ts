import type { OpEnvelope, Project } from "@/project/generated/types";
import type { ForkOptions } from "@/project/fork";
import type { ImportError } from "@/export/iynk";
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
  | { t: "open"; projectId: string; state: Project; revision: number; legacyProgress?: LegacyProgress | null }
  | { t: "commit"; fromRevision: number; toRevision: number; ops: OpEnvelope[] }
  | { t: "save"; reason: SaveReason }
  | { t: "close"; projectId: string }
  /** The session's `onCompact` snapshot; it goes to the `revisions` store. */
  | { t: "revision"; revision: number; state: Project; stateHash: string }
  | { t: "lib"; call: LibCall }
  | { t: "file"; call: FileCall }
  | { t: "data"; call: DataCall }
  | { t: "storage"; call: StorageCall };

/** The progress the page read from `localStorage["iynk:v1"]`; a worker has no `localStorage`. */
export interface LegacyProgress {
  done: unknown;
  quiz: unknown;
  best: unknown;
}

export type LibCall =
  | { op: "list" }
  | { op: "create"; board: "uno"; title?: string }
  | { op: "rename"; id: string; title: string }
  | { op: "fork"; id: string; title?: string }
  | { op: "forkDocument"; doc: Project; title?: string; origin?: ForkOptions["origin"] }
  | { op: "trash"; id: string }
  | { op: "restore"; id: string }
  | { op: "emptyTrash" }
  | { op: "purgeExpired" }
  | { op: "trashList" };

export type FileCall =
  | { op: "export"; id: string; kind: "iynk" | "iynkz" }
  | { op: "import"; bytes: Uint8Array; name: string }
  | { op: "markCopy"; id: string; has: boolean };

export type DataCall =
  | { op: "exportAll"; settingsJson: string | null }
  | { op: "wipeStores"; confirmation: string }
  | { op: "deleteAiData" };

export type StorageCall = { op: "estimate" } | { op: "persist" };

/** `forked` is true when the file's project id was already in the library, so it was stored under a new id. */
export type ImportOutcome =
  | { ok: true; id: string; hash: string; hashMatches: boolean; warnings: string[]; forked: boolean }
  | { ok: false; error: ImportError; raw: Uint8Array };

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
