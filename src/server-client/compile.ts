import { parseElf } from "../export/elf.ts";
import { parseHex } from "../export/hex.ts";
import type { SourceMap } from "../export/dwarf-lines.ts";
import { sourceMapOf } from "../sim/mcu/firmware.ts";
import type { ServerClient } from "./client.ts";
import type { ServerProbe } from "./probe.ts";
import { ClientError } from "./types.ts";

export interface LibraryRef {
  name: string;
  version: string;
}

export interface CompileRequest {
  fqbn: string;
  files: { path: string; text: string }[];
  libraries: LibraryRef[];
  debug: boolean;
}

export interface CompileDiagnostic {
  file?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning" | "note";
  message: string;
}

export interface CompileResult {
  ok: boolean;
  timedOut: boolean;
  hex?: string;
  elf?: Uint8Array;
  sourceMap?: SourceMap;
  diagnostics: CompileDiagnostic[];
  size?: { flashBytes: number; flashMax: number };
  ms: number;
  cacheHit: boolean;
}

export interface CompileService {
  compile(r: CompileRequest, signal: AbortSignal): Promise<CompileResult>;
}

export const FQBN = { "uno-r3": "arduino:avr:uno", nano: "arduino:avr:nano" } as const;

export const FLASH_BYTES = 32768;

const MAX_FILES = 20;
const MAX_SOURCE_BYTES = 262_144;
const POLL_MS = 1000;

function checkCaps(r: CompileRequest): void {
  const bytes = r.files.reduce((sum, f) => sum + new TextEncoder().encode(f.text).length, 0);
  if (r.files.length > MAX_FILES || bytes > MAX_SOURCE_BYTES) throw new ClientError("too_large", 413);
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal.addEventListener("abort", stop, { once: true });
  });
}

/** A hidden tab does not poll; the next poll waits until the tab is shown again. */
function whenVisible(signal: AbortSignal): Promise<void> {
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onChange);
      signal.removeEventListener("abort", onAbort);
    };
    const onChange = () => {
      if (document.hidden) return;
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    document.addEventListener("visibilitychange", onChange);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const fromBase64 = (data: string): Uint8Array => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

export function createServerCompileService(c: ServerClient): CompileService {
  return {
    async compile(r, signal) {
      checkCaps(r);
      let job = await c.createCompileJob({ board: r.fqbn, files: r.files, libraries: r.libraries, debug: r.debug }, crypto.randomUUID());
      while (job.status === "queued" || job.status === "running") {
        await pause(POLL_MS, signal);
        await whenVisible(signal);
        job = await c.getCompileJob(job.id);
      }
      signal.throwIfAborted();

      const ms = Math.max(0, Date.parse(job.finishedAt ?? job.createdAt) - Date.parse(job.createdAt));
      const diagnostics = job.messages.map(({ text, ...rest }): CompileDiagnostic => ({ ...rest, message: text }));
      const base = { diagnostics, ms, cacheHit: job.cacheHit };
      if (job.status !== "succeeded") return { ...base, ok: false, timedOut: job.status === "timed_out" };

      const hex = (await c.getCompileArtifact(job.id, "hex")).data;
      const parsed = parseHex(hex, { flashBytes: FLASH_BYTES });
      const size = parsed.ok ? { flashBytes: parsed.value.bytes, flashMax: FLASH_BYTES } : undefined;
      if (!r.debug) return { ...base, ok: true, timedOut: false, hex, size };

      const elf = fromBase64((await c.getCompileArtifact(job.id, "elf")).data);
      const image = parseElf(elf, { flashBytes: FLASH_BYTES });
      const sourceMap = image.ok ? sourceMapOf(elf, image.value) : undefined;
      return { ...base, ok: true, timedOut: false, hex, elf, size, ...(sourceMap ? { sourceMap } : {}) };
    },
  };
}

export function compileAvailable(probe: ServerProbe): "yes" | "off" | "no-server" {
  if (probe.state !== "ready" || !probe.info) return "no-server";
  return probe.info.features.compile ? "yes" : "off";
}
