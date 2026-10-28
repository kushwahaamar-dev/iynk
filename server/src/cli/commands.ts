import { copyFileSync, chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, statfsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { checkConfig, loadConfig, type ServerConfig } from "../config.ts";
import { realDeps, type Deps } from "../deps.ts";
import { createEnrolmentCode } from "../identity/enrol.ts";
import { getDevice, listDevices, revokeDevice } from "../identity/devices.ts";
import { createLogger } from "../ops/log.ts";
import { assertNotNewer } from "../store/migrate.ts";
import type { ServerStore } from "../store/port.ts";
import { openStore } from "../store/sqlite.ts";
import { collectDiagnostics, serverVersion, writeTarball } from "./diagnostics.ts";

export type Io = { out(line: string): void; err(line: string): void; now(): number };

export const COMMANDS: readonly string[] = [
  "init",
  "enrol",
  "enroll",
  "devices",
  "revoke",
  "backup",
  "restore",
  "check-config",
  "compact",
  "diagnostics",
];

const EXIT_OK = 0;
const EXIT_RUNTIME = 1;
const EXIT_CONFIG = 2;
const EXIT_USAGE = 64;
const BACKUPS_KEPT = 7;
const BACKUP_PATTERN = /^iynk-(\d+)\.db$/;
const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

type Parsed = { positional: string[]; json: boolean; name: string | null };

class UsageError extends Error {}

function parseArgs(args: string[]): Parsed {
  const parsed: Parsed = { positional: [], json: false, name: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (arg === "--json") parsed.json = true;
    else if (arg === "--name") {
      const value = args[(i += 1)];
      if (value === undefined) throw new UsageError("--name needs a value.");
      parsed.name = value;
    } else if (arg.startsWith("-")) throw new UsageError(`Unknown option ${arg}.`);
    else parsed.positional.push(arg);
  }
  return parsed;
}

function stamp(ms: number | null): string {
  return ms === null ? "-" : new Date(ms).toISOString();
}

function table(rows: string[][]): string[] {
  const widths = (rows[0] ?? []).map((_, column) => Math.max(...rows.map((row) => (row[column] ?? "").length)));
  return rows.map((row) => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd());
}

function openConfiguredStore(config: ServerConfig, deps: Deps): ServerStore {
  return openStore(
    {
      path: join(config.dataDir, "iynk.db"),
      sync: config.storeSync,
      migrationsDir: MIGRATIONS_DIR,
      backupsDir: join(config.dataDir, "backups"),
      serverVersion: serverVersion(),
    },
    deps,
  );
}

function enrol(config: ServerConfig, store: ServerStore, args: Parsed, deps: Deps, io: Io): void {
  const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
  const link = `${config.publicUrl.origin}/together#enrol=${code.link}`;
  if (args.json) {
    io.out(JSON.stringify({ link, code: code.typed, expiresAt: code.expiresAt }));
    return;
  }
  if (args.name !== null) io.out(`Enrolment code for ${args.name}`);
  io.out(`Enrolment link: ${link}`);
  io.out(`Typed code: ${code.typed}`);
  io.out(`Expires: ${stamp(code.expiresAt)}`);
}

function listDeviceRows(store: ServerStore, io: Io): void {
  const devices = store.read((tx) => listDevices(tx));
  if (devices.length === 0) {
    io.out("No devices yet.");
    return;
  }
  const rows = [["id", "identity", "name", "role", "created", "last seen", "revoked"]];
  for (const d of devices) rows.push([d.id, d.identityId, d.name, d.role, stamp(d.createdAt), stamp(d.lastSeenAt), stamp(d.revokedAt)]);
  for (const line of table(rows)) io.out(line);
}

function revoke(store: ServerStore, args: Parsed, deps: Deps, io: Io): void {
  const [target, ...extra] = args.positional;
  if (target === undefined || extra.length > 0) throw new UsageError("Usage: iynk-server revoke <deviceId|identityId>");
  const { device, ended } = store.transaction((tx) => {
    const found = getDevice(tx, target);
    if (!found || found.revokedAt !== null) return { device: found, ended: 0 };
    const open = tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM sessions WHERE device_id = ? AND revoked_at IS NULL", found.id)?.n ?? 0;
    revokeDevice(tx, found.id, deps.clock.now());
    return { device: found, ended: open };
  });
  if (!device) throw new Error("no such device");
  if (device.revokedAt !== null) throw new Error(`${device.name} (${device.id}) is already revoked.`);
  io.out(`Revoked ${device.name} (${device.id}); ended ${ended} ${ended === 1 ? "session" : "sessions"}.`);
}

function backup(config: ServerConfig, store: ServerStore, deps: Deps, io: Io): void {
  const dir = join(config.dataDir, "backups");
  const target = join(dir, `iynk-${deps.clock.now()}.db`);
  store.backupTo(target);
  const old = readdirSync(dir)
    .flatMap((entry) => {
      const match = BACKUP_PATTERN.exec(entry);
      return match ? [{ entry, at: Number(match[1]) }] : [];
    })
    .sort((a, b) => b.at - a.at)
    .slice(BACKUPS_KEPT);
  for (const { entry } of old) rmSync(join(dir, entry), { force: true });
  io.out(`Backup written to ${target}`);
}

function assertNoServerHoldsDatabase(live: string): void {
  const db = new DatabaseSync(live, { timeout: 0 });
  try {
    const mode = db.prepare("PRAGMA journal_mode = DELETE").get() as { journal_mode: string } | undefined;
    if (mode?.journal_mode !== "delete") throw new Error("busy");
    db.exec("BEGIN EXCLUSIVE");
    db.exec("ROLLBACK");
  } catch {
    throw new Error("The database is in use; stop iynk-server before restoring.");
  } finally {
    db.close();
  }
}

function restore(config: ServerConfig, args: Parsed, io: Io): void {
  const [file, ...extra] = args.positional;
  if (file === undefined || extra.length > 0) throw new UsageError("Usage: iynk-server restore <file>");
  const source = resolve(file);
  if (!existsSync(source)) throw new Error(`${source} does not exist.`);

  const backupDb = new DatabaseSync(source, { readOnly: true });
  try {
    const verdict = (backupDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string } | undefined)?.integrity_check;
    if (verdict !== "ok") throw new Error(`${source} failed the integrity check: ${verdict ?? "unknown"}.`);
    assertNotNewer(backupDb, MIGRATIONS_DIR, serverVersion());
  } finally {
    backupDb.close();
  }

  const live = join(config.dataDir, "iynk.db");
  if (existsSync(live)) assertNoServerHoldsDatabase(live);
  mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  const partial = `${live}.restore`;
  copyFileSync(source, partial);
  chmodSync(partial, 0o600);
  renameSync(partial, live);
  rmSync(`${live}-wal`, { force: true });
  rmSync(`${live}-shm`, { force: true });
  io.out(`Restored ${basename(source)} to ${live}`);
}

function compact(config: ServerConfig, io: Io): void {
  const live = join(config.dataDir, "iynk.db");
  if (!existsSync(live)) throw new Error(`There is no database at ${live}.`);
  const before = statSync(live).size;
  const { bavail, bsize } = statfsSync(config.dataDir);
  if (bavail * bsize < before) throw new Error(`Not enough free disk space to compact: ${before} bytes needed, ${bavail * bsize} free.`);
  const db = new DatabaseSync(live, { timeout: 5000 });
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.exec("VACUUM");
  } finally {
    db.close();
  }
  io.out(`Compacted ${live}: ${before} bytes before, ${statSync(live).size} after.`);
}

function diagnostics(config: ServerConfig, store: ServerStore, deps: Deps, io: Io): void {
  const { files } = collectDiagnostics(config, store, createLogger({ level: "silent" }));
  const target = join(config.dataDir, `diagnostics-${deps.clock.now()}.tar`);
  writeTarball(files, target, deps.clock.now());
  io.out(`Diagnostics written to ${target}`);
}

function withStore(config: ServerConfig, deps: Deps, action: (store: ServerStore) => void): void {
  const store = openConfiguredStore(config, deps);
  try {
    action(store);
  } finally {
    store.close();
  }
}

function dispatch(command: string, args: Parsed, config: ServerConfig, deps: Deps, io: Io): void {
  switch (command) {
    case "init":
    case "enrol":
    case "enroll":
      return withStore(config, deps, (store) => enrol(config, store, args, deps, io));
    case "devices":
      return withStore(config, deps, (store) => listDeviceRows(store, io));
    case "revoke":
      return withStore(config, deps, (store) => revoke(store, args, deps, io));
    case "backup":
      return withStore(config, deps, (store) => backup(config, store, deps, io));
    case "diagnostics":
      return withStore(config, deps, (store) => diagnostics(config, store, deps, io));
    case "restore":
      return restore(config, args, io);
    case "compact":
      return compact(config, io);
    default:
      throw new UsageError(`Unknown command "${command}". Run iynk-server --help.`);
  }
}

export async function run(argv: string[], env: NodeJS.ProcessEnv, io: Io, deps: Deps = { ...realDeps(), clock: { now: io.now } }): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") {
    for (const name of COMMANDS) io.out(name);
    return EXIT_OK;
  }
  if (command === undefined || !COMMANDS.includes(command)) {
    io.err(command === undefined ? "Missing command. Run iynk-server --help." : `Unknown command "${command}". Run iynk-server --help.`);
    return EXIT_USAGE;
  }

  try {
    const args = parseArgs(rest);
    const problems = checkConfig(env);
    if (problems.length > 0) {
      for (const problem of problems) io.err(problem);
      return EXIT_CONFIG;
    }
    if (command === "check-config") {
      io.out("The configuration is valid.");
      return EXIT_OK;
    }
    dispatch(command, args, loadConfig(env), deps, io);
    return EXIT_OK;
  } catch (error) {
    if (error instanceof UsageError) {
      io.err(error.message);
      return EXIT_USAGE;
    }
    io.err(error instanceof Error ? error.message : String(error));
    return EXIT_RUNTIME;
  }
}
