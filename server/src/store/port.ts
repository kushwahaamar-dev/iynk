export type SqlValue = string | number | bigint | Uint8Array | null;

export type Row = Record<string, unknown>;

export interface Tx {
  run(sql: string, ...params: SqlValue[]): { changes: number };
  get<T extends Row = Row>(sql: string, ...params: SqlValue[]): T | undefined;
  all<T extends Row = Row>(sql: string, ...params: SqlValue[]): T[];
}

export interface ServerStore {
  transaction<T>(fn: (tx: Tx) => T): T;
  read<T>(fn: (tx: Tx) => T): T;
  backupTo(path: string): void;
  integrityCheck(): string;
  ping(): boolean;
  schemaVersion(): number;
  close(): void;
}

export type StoreErrorCode = "db_newer_than_server" | "migration_checksum_changed" | "store_unavailable";

export class StoreError extends Error {
  readonly code: StoreErrorCode;

  constructor(code: StoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StoreError";
    this.code = code;
  }
}
