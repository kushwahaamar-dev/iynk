import type { Project } from "@/project/generated/types";
import type { JournalEdit, JournalRow, StoreName } from "./stores";

export interface ProjectRecord {
  doc: Project;
  hash: string;
  writtenAt: number;
}

export interface IndexRow {
  name: string;
  updatedAt: string;
  hash: string;
  board: string;
  size: number;
  hasFileCopy: boolean;
  archived: boolean;
}

export type SaveResult =
  | { ok: true; hash: string; writtenAt: number }
  | { ok: false; kind: "quota" | "blocked" | "conflict" | "validation" | "unavailable"; detail: string };

/**
 * What load found. `recovered` means the current slot failed its hash check and the previous slot was returned.
 * `lost` means both slots failed. `missing` means the id has no record.
 */
export type RecordLoad =
  | { status: "ok"; rec: ProjectRecord }
  | { status: "recovered"; rec: ProjectRecord }
  | { status: "lost" }
  | { status: "missing" };

export interface Repository {
  list(): Promise<Array<{ id: string } & IndexRow>>;
  load(id: string): Promise<RecordLoad>;
  save(id: string, rec: ProjectRecord, row: IndexRow, expect: { revision: number; hash: string } | null): Promise<SaveResult>;
  /** Moves the project to the trash. */
  remove(id: string, deletedAt: number): Promise<void>;
  restore(id: string): Promise<void>;
  purgeTrash(olderThan: number): Promise<number>;
  listTrash(): Promise<Array<{ id: string; name: string; deletedAt: number }>>;
  journal: {
    read(id: string): Promise<JournalRow | null>;
    append(id: string, baseRevision: number, edits: JournalEdit[], now: number): Promise<void>;
    clear(id: string): Promise<void>;
  };
  backups: {
    put(id: string, doc: Project, hash: string, at: number): Promise<void>;
    list(id: string): Promise<Array<{ n: number; at: number; hash: string }>>;
  };
  revisions: {
    put(id: string, revision: number, snap: { state: Project; stateHash: string }): Promise<void>;
    get(id: string, revision: number): Promise<{ state: Project; stateHash: string } | null>;
    list(id: string): Promise<number[]>;
    remove(id: string, revision: number): Promise<void>;
  };
  setFileCopy(id: string, has: boolean): Promise<void>;
  /** Used by wipe and Delete AI data. */
  clearStores(names: readonly StoreName[]): Promise<void>;
  estimate(): Promise<{ usage: number; quota: number } | null>;
}
