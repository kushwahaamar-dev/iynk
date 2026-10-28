import { readFileSync, writeFileSync } from "node:fs";
import type { ServerConfig } from "../config.ts";
import type { Logger } from "../ops/log.ts";
import type { ServerStore } from "../store/port.ts";

const BLOCK = 512;
const SECRET_NAME = /key|secret/i;
const NO_LOG_FILE = "no log file; stdout is captured by the container runtime";

export function serverVersion(): string {
  const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  return manifest.version;
}

function configText(config: ServerConfig): string {
  return Object.entries(config)
    .map(([name, value]) => {
      if (SECRET_NAME.test(name)) return `${name} = ${value ? "<set>" : "<unset>"}`;
      return `${name} = ${value instanceof URL ? value.href : Array.isArray(value) ? value.join(",") : String(value)}`;
    })
    .join("\n");
}

export function collectDiagnostics(config: ServerConfig, store: ServerStore, log: Logger): { files: Record<string, string> } {
  const { sqlite, migrations, tables } = store.read((tx) => ({
    sqlite: tx.get<{ version: string }>("SELECT sqlite_version() AS version")?.version ?? "unknown",
    migrations: tx.all<{ version: number; name: string; applied_at: number }>("SELECT version, name, applied_at FROM schema_migrations ORDER BY version"),
    tables: tx
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .map(({ name }) => `${name} = ${tx.get<{ n: number }>(`SELECT COUNT(*) AS n FROM "${name}"`)?.n ?? 0}`),
  }));
  const logLines = log.lines();
  return {
    files: {
      "versions.txt": `node = ${process.version}\nsqlite = ${sqlite}\niynk-server = ${serverVersion()}\n`,
      "config.txt": `${configText(config)}\n`,
      "migrations.txt": `${migrations.map((row) => `${row.version} ${row.name} ${new Date(row.applied_at).toISOString()}`).join("\n")}\n`,
      "tables.txt": `${tables.join("\n")}\n`,
      "log.txt": logLines.length > 0 ? `${logLines.join("\n")}\n` : `${NO_LOG_FILE}\n`,
      "integrity.txt": `${store.integrityCheck()}\n`,
    },
  };
}

function octal(value: number, width: number): string {
  return `${value.toString(8).padStart(width - 1, "0")}\0`;
}

function header(name: string, size: number, mtime: number): Buffer {
  const block = Buffer.alloc(BLOCK);
  block.write(name, 0, 100, "utf8");
  block.write(octal(0o600, 8), 100, "ascii");
  block.write(octal(0, 8), 108, "ascii");
  block.write(octal(0, 8), 116, "ascii");
  block.write(octal(size, 12), 124, "ascii");
  block.write(octal(mtime, 12), 136, "ascii");
  block.write("        ", 148, "ascii");
  block.write("0", 156, "ascii");
  block.write("ustar\0" + "00", 257, "ascii");
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  return block;
}

/** Writes an uncompressed ustar archive; file names must be plain and under 100 bytes. */
export function writeTarball(files: Record<string, string>, to: string, mtimeMs = 0): void {
  const parts: Buffer[] = [];
  for (const [name, text] of Object.entries(files)) {
    const body = Buffer.from(text, "utf8");
    parts.push(header(name, body.length, Math.floor(mtimeMs / 1000)), body, Buffer.alloc((BLOCK - (body.length % BLOCK)) % BLOCK));
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  writeFileSync(to, Buffer.concat(parts), { mode: 0o600 });
}
