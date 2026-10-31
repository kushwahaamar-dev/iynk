import { createHash } from "node:crypto";
import type { Ids } from "../deps.ts";
import { ApiError } from "../http/errors.ts";
import type { Logger } from "../ops/log.ts";

export const COMPILE_LIMITS = {
  sourceBytesTotal: 262_144,
  files: 32,
  filesPerRequestSchema: 20,
  outputBytes: 1_048_576,
  wallMs: 30_000,
  memoryBytes: 1_073_741_824,
  cpus: 1,
  ttlMs: 900_000,
} as const;

export const COMPILE_BOARDS: readonly string[] = ["arduino:avr:uno", "arduino:avr:nano"];

export const COMPILE_LIBRARIES: readonly string[] = [
  "Wire",
  "SPI",
  "Servo",
  "EEPROM",
  "SoftwareSerial",
  "Adafruit BME280 Library",
  "Adafruit Unified Sensor",
  "Adafruit BusIO",
];

export const HEX_MEDIA_TYPE = "text/plain; charset=us-ascii";
export const ELF_MEDIA_TYPE = "application/octet-stream";

const JOB_PREFIX = "cmp_";
const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const EXTENSIONS = [".ino", ".h", ".hpp", ".c", ".cpp"];
const REQUEST_KEYS = ["board", "files", "libraries", "debug"];
const PATH_MAX = 255;
const LIBRARIES_MAX = 32;
const MESSAGES_MAX = 200;
const MESSAGE_TEXT_MAX = 500;
const PROBE_TIMEOUT_MS = 5000;
const PROBE_STALE_MS = 30_000;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export type DeviceId = string;
export type LibraryRef = { name: string; version: string };
export type CompileFile = { path: string; text: string };
export type CompileRequest = { board: string; files: CompileFile[]; libraries: LibraryRef[]; debug: boolean };

export type Diag = { file?: string; line?: number; column?: number; severity: string; message: string };
export type Size = { flashBytes: number; flashMax: number; ramBytes: number; ramMax: number };
export type Tool = { name: string; version: string };

export type CompileResult = { ok: boolean; hex?: string; elf?: Uint8Array; diagnostics: Diag[]; size: Size; tool: Tool; ms: number };

export interface CompileClient {
  version(signal: AbortSignal): Promise<Tool>;
  run(job: { fqbn: string; files: CompileFile[]; libraries: LibraryRef[]; debug: boolean }, signal: AbortSignal): Promise<CompileResult>;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "timed_out";

export type CompileJob = {
  id: string;
  status: JobStatus;
  createdAt: string;
  finishedAt: string | null;
  cacheHit: boolean;
  inputSha256: string;
  artifact: { sha256: string; bytes: number; mediaType: string } | null;
  messages: { severity: "error" | "warning" | "note"; file?: string; line?: number; column?: number; text: string }[];
};

type Rejection = { ok: false; status: 400 | 413; code: string; message: string };

const reject = (status: 400 | 413, code: string, message: string): Rejection => ({ ok: false, status, code, message });
const invalid = (message: string): Rejection => reject(400, "bad_request", message);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function checkPath(path: string): string | null {
  if (path.length === 0 || path.length > PATH_MAX) return "A file path must be 1 to 255 characters.";
  if (path !== path.normalize("NFC") || CONTROL.test(path) || path.includes("\\")) return `"${path}" is not a plain relative path.`;
  if (path.split("/").some((part) => part === "" || part === "." || part === "..")) return `"${path}" must be a relative path without "." or "..".`;
  if (!EXTENSIONS.some((extension) => path.endsWith(extension))) return `"${path}" must end in ${EXTENSIONS.join(", ")}.`;
  return null;
}

export function checkRequest(r: unknown): { ok: true; value: CompileRequest } | Rejection {
  if (!isObject(r)) return invalid("Send a JSON object.");
  for (const key of Object.keys(r)) if (!REQUEST_KEYS.includes(key)) return invalid(`"${key}" is not allowed.`);

  const { board, files, libraries = [], debug = false } = r;
  if (typeof board !== "string" || !COMPILE_BOARDS.includes(board)) {
    return reject(400, "board_not_supported", `Only ${COMPILE_BOARDS.join(" and ")} can be compiled.`);
  }
  if (typeof debug !== "boolean") return invalid("debug must be true or false.");
  if (!Array.isArray(files) || files.length === 0) return invalid("Send at least one file.");
  if (files.length > COMPILE_LIMITS.files) return reject(413, "too_large", `Send at most ${COMPILE_LIMITS.files} files.`);
  if (files.length > COMPILE_LIMITS.filesPerRequestSchema) return invalid(`Send at most ${COMPILE_LIMITS.filesPerRequestSchema} files.`);

  const seen = new Set<string>();
  const checked: CompileFile[] = [];
  let bytes = 0;
  for (const file of files as unknown[]) {
    if (!isObject(file) || Object.keys(file).some((key) => key !== "path" && key !== "text")) return invalid("Each file is { path, text }.");
    const { path, text } = file;
    if (typeof path !== "string" || typeof text !== "string") return invalid("Each file is { path, text }.");
    const problem = checkPath(path);
    if (problem !== null) return invalid(problem);
    if (seen.has(path)) return invalid(`"${path}" is listed twice.`);
    seen.add(path);
    bytes += Buffer.byteLength(text);
    checked.push({ path, text });
  }
  if (bytes > COMPILE_LIMITS.sourceBytesTotal) return reject(413, "too_large", `The sources are above ${COMPILE_LIMITS.sourceBytesTotal} bytes in total.`);

  if (!Array.isArray(libraries) || libraries.length > LIBRARIES_MAX) return invalid(`Send at most ${LIBRARIES_MAX} libraries.`);
  const refs: LibraryRef[] = [];
  for (const library of libraries as unknown[]) {
    if (!isObject(library) || Object.keys(library).some((key) => key !== "name" && key !== "version")) return invalid("Each library is { name, version }.");
    const { name, version } = library;
    if (typeof name !== "string" || typeof version !== "string" || name.length > 80 || version.length > 40) return invalid("Each library is { name, version }.");
    if (!COMPILE_LIBRARIES.includes(name)) return reject(400, "library_not_allowed", `"${name}" is not one of the libraries this server carries.`);
    refs.push({ name, version });
  }

  return { ok: true, value: { board, files: checked, libraries: refs, debug } };
}

function inputHash(req: CompileRequest, tool: string): string {
  const files = [...req.files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const libraries = [...req.libraries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return createHash("sha256").update(JSON.stringify({ fqbn: req.board, files, libraries, tool, debug: req.debug })).digest("hex");
}

const sha256 = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");

function severity(raw: string): "error" | "warning" | "note" {
  return raw === "error" || raw === "warning" ? raw : "note";
}

type Entry = { owner: DeviceId; job: CompileJob; hex?: string; elf?: Uint8Array; expiresAt: number };

export type CompileRunner = ReturnType<typeof createRunner>;

export function createRunner(o: { client: CompileClient; now(): number; ids: Ids; log: Logger; limits: typeof COMPILE_LIMITS }) {
  const { client, now, limits, log } = o;
  const entries = new Map<string, Entry>();
  const keys = new Map<string, string>();
  let tool: string | null = null;
  let probedAt = Number.NEGATIVE_INFINITY;
  let up = false;
  let tail: Promise<void> = Promise.resolve();

  const iso = (): string => new Date(now()).toISOString();

  const view = (entry: Entry, cacheHit: boolean): CompileJob => ({ ...entry.job, cacheHit, messages: [...entry.job.messages] });

  function newId(): string {
    const bytes = o.ids.random(16);
    let id = JOB_PREFIX;
    for (let i = 0; i < 16; i++) id += ID_ALPHABET[(bytes[i] as number) & 31];
    return id;
  }

  async function probe(): Promise<void> {
    probedAt = now();
    try {
      const found = await client.version(AbortSignal.timeout(PROBE_TIMEOUT_MS));
      tool = `${found.name}@${found.version}`;
      up = true;
    } catch {
      up = false;
    }
  }

  function sweep(): void {
    const at = now();
    for (const [id, entry] of entries) if (entry.expiresAt <= at) entries.delete(id);
    for (const [key, id] of keys) if (!entries.has(id)) keys.delete(key);
  }

  function fail(entry: Entry, status: "failed" | "timed_out", text: string): void {
    entry.job.status = status;
    entry.job.messages.push({ severity: "error", text });
  }

  function settle(entry: Entry, out: CompileResult): void {
    for (const diag of out.diagnostics.slice(0, MESSAGES_MAX)) {
      entry.job.messages.push({
        severity: severity(diag.severity),
        ...(diag.file !== undefined && { file: diag.file }),
        ...(diag.line !== undefined && { line: diag.line }),
        ...(diag.column !== undefined && { column: diag.column }),
        text: diag.message.slice(0, MESSAGE_TEXT_MAX),
      });
    }
    if ((out.hex?.length ?? 0) + (out.elf?.length ?? 0) > limits.outputBytes) {
      fail(entry, "failed", `The output is larger than ${limits.outputBytes} bytes.`);
    } else if (!out.ok) {
      entry.job.status = "failed";
    } else if (out.hex === undefined) {
      fail(entry, "failed", "The compiler produced no hex file.");
    } else {
      entry.job.status = "succeeded";
      entry.job.artifact = { sha256: sha256(out.hex), bytes: out.hex.length, mediaType: HEX_MEDIA_TYPE };
      entry.hex = out.hex;
      if (out.elf !== undefined) entry.elf = out.elf;
    }
  }

  async function execute(entry: Entry, req: CompileRequest): Promise<void> {
    entry.job.status = "running";
    const started = now();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), limits.wallMs);
    const timedOut = new Promise<never>((_, reject) => abort.signal.addEventListener("abort", () => reject(new Error("timed out")), { once: true }));
    const running = client.run({ fqbn: req.board, files: req.files, libraries: req.libraries, debug: req.debug }, abort.signal);
    running.catch(() => {});
    try {
      settle(entry, await Promise.race([running, timedOut]));
    } catch {
      if (abort.signal.aborted) fail(entry, "timed_out", `The compile took longer than ${limits.wallMs / 1000} seconds.`);
      else fail(entry, "failed", "The compile service failed.");
    } finally {
      clearTimeout(timer);
    }
    entry.job.finishedAt = iso();
    log.info("compile_job", { job: entry.job.id, status: entry.job.status, ms: now() - started });
  }

  return {
    /** Whether the compile service answered its last probe; asks again in the background once the answer is stale. */
    reachable(): boolean {
      if (now() - probedAt > PROBE_STALE_MS) void probe();
      return up;
    },

    probe,

    async submit(device: DeviceId, req: CompileRequest, idempotencyKey?: string): Promise<CompileJob> {
      sweep();
      if (tool === null) await probe();
      if (tool === null) throw new ApiError(503, "unavailable", "The compile service is not reachable.");
      const hash = inputHash(req, tool);
      const bind = (entry: Entry, cacheHit: boolean): CompileJob => {
        if (idempotencyKey !== undefined) keys.set(`${device}\0${idempotencyKey}`, entry.job.id);
        return view(entry, cacheHit);
      };

      const prior = idempotencyKey === undefined ? undefined : entries.get(keys.get(`${device}\0${idempotencyKey}`) ?? "");
      if (prior !== undefined) {
        if (prior.job.inputSha256 !== hash) throw new ApiError(409, "idempotency_conflict", "This Idempotency-Key was used for a different request.");
        return view(prior, prior.job.cacheHit);
      }

      const mine = [...entries.values()].filter((entry) => entry.owner === device);
      const same = mine.find((entry) => entry.job.inputSha256 === hash && entry.job.status !== "timed_out");
      if (same !== undefined) return bind(same, true);
      const busy = mine.find((entry) => entry.job.status === "queued" || entry.job.status === "running");
      if (busy !== undefined) return bind(busy, false);

      const entry: Entry = {
        owner: device,
        expiresAt: now() + limits.ttlMs,
        job: { id: newId(), status: "queued", createdAt: iso(), finishedAt: null, cacheHit: false, inputSha256: hash, artifact: null, messages: [] },
      };
      entries.set(entry.job.id, entry);
      tail = tail.then(() => execute(entry, req));
      return bind(entry, false);
    },

    get(device: DeviceId, id: string): CompileJob | null {
      sweep();
      const entry = entries.get(id);
      return entry !== undefined && entry.owner === device ? view(entry, entry.job.cacheHit) : null;
    },

    artifact(device: DeviceId, id: string, kind: "hex" | "elf" = "hex"): { bytes: Uint8Array; mediaType: string } | null {
      sweep();
      const entry = entries.get(id);
      if (entry === undefined || entry.owner !== device) return null;
      if (kind === "hex") return entry.hex === undefined ? null : { bytes: Buffer.from(entry.hex, "ascii"), mediaType: HEX_MEDIA_TYPE };
      return entry.elf === undefined ? null : { bytes: entry.elf, mediaType: ELF_MEDIA_TYPE };
    },

    sweep,
  };
}

type WireResult = {
  ok: boolean;
  hex?: string;
  elfBase64?: string;
  diagnostics: Diag[];
  size: Size;
  tool: Tool;
  ms: number;
};

export function createHttpClient(base: URL, request: typeof fetch = fetch): CompileClient {
  async function call(path: string, signal: AbortSignal, init?: RequestInit): Promise<unknown> {
    const response = await request(new URL(path, base), { ...init, signal });
    if (!response.ok) throw new Error(`compile service answered ${response.status}`);
    return response.json();
  }

  return {
    async version(signal) {
      const found = (await call("version", signal)) as { tool: string; version: string; core?: string };
      return { name: found.tool, version: found.core === undefined ? found.version : `${found.version}+${found.core}` };
    },
    async run(job, signal) {
      const out = (await call("job", signal, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(job),
      })) as WireResult;
      const { elfBase64, ...rest } = out;
      return { ...rest, ...(elfBase64 !== undefined && { elf: new Uint8Array(Buffer.from(elfBase64, "base64")) }) };
    },
  };
}
