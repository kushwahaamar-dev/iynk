export const DB_NAME = "iynk";
export const DB_VERSION = 2;

export interface StoreSpec {
  /** Stores use out-of-line keys, chosen by the caller or by the store when `autoIncrement` is set, unless `keyPath` names the key field. */
  autoIncrement: boolean;
  keyPath?: string;
  indexes: Readonly<Record<string, string>>;
}

const keyed: StoreSpec = { autoIncrement: false, indexes: {} };
const counted: StoreSpec = { autoIncrement: true, indexes: {} };

/** The 19 stores of SYSTEM 8.1 in table order, then `parts` (T-B11-13). Keys: see the comment on each line. */
export const STORES = {
  projects: keyed, // project id
  index: { autoIncrement: false, indexes: { updatedAt: "updatedAt" } }, // project id
  trash: { autoIncrement: false, indexes: { deletedAt: "deletedAt" } }, // project id
  backups: keyed, // `projectId:n`
  assets: keyed, // sha256
  revisions: keyed, // `projectId:revision`
  progress: keyed, // progress key
  proposals: keyed, // proposal id
  keys: keyed, // provider id
  events: counted,
  errors: counted,
  server: keyed, // server origin
  ai_threads: { autoIncrement: false, indexes: { projectId: "projectId" } }, // thread id
  ai_log: keyed, // row id
  ai_usage: keyed, // `provider:day`
  ai_memo: keyed, // hash of the query
  ai_debug: keyed, // request id
  journal: keyed, // project id
  identity: keyed, // server origin
  parts: { autoIncrement: false, keyPath: "key", indexes: { id: "id" } }, // `id@version`
} as const satisfies Record<string, StoreSpec>;

export type StoreName = keyof typeof STORES;

export const STORE_NAMES = Object.keys(STORES) as StoreName[];

/** The stores that Delete AI data clears (RC-09). */
export const AI_STORES = ["ai_threads", "ai_log", "ai_memo", "ai_debug", "proposals", "ai_usage"] as const satisfies readonly StoreName[];

export interface JournalEdit {
  src: string;
  pos: number;
  del: number;
  ins: string;
  t: number;
}

export interface JournalRow {
  baseRevision: number;
  edits: JournalEdit[];
  writtenAt: number;
}
