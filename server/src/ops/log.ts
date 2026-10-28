import { createHash } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
export type Fields = Record<string, unknown>;

export type Logger = {
  level: LogLevel;
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(base: Fields): Logger;
  lines(): string[];
};

export const REDACT_KEYS: readonly string[] = [
  "authorization",
  "x-iynk-provider-key",
  "x-iynk-server-token",
  "cookie",
  "token",
  "signature",
  "code",
  "secret",
  "enrollmentcode",
  "publickey",
];

const RANK = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;
const MAX_DEPTH = 4;
const REDACTED = "<redacted>";
const CUT = "<cut>";

const redactKeys = new Set(REDACT_KEYS);

const SECRET_SHAPES: readonly [RegExp, string][] = [
  [/iynk_at_[A-Za-z0-9_-]{43}/g, "iynk_at_<redacted>"],
  [/iynk_pat_[A-Za-z0-9_-]+/g, "iynk_pat_<redacted>"],
  [/(#\/pair\/|enrol=)[A-Za-z0-9_-]{22}/g, `$1${REDACTED}`],
  [/(code\W{0,4})[0-9A-Za-z]{26,}/gi, `$1${REDACTED}`],
];

function maskString(text: string): string {
  let masked = text;
  for (const [shape, replacement] of SECRET_SHAPES) masked = masked.replace(shape, replacement);
  return masked;
}

function redactAt(value: unknown, depth: number): unknown {
  if (typeof value === "string") return maskString(value);
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return CUT;
  if (value instanceof Error) {
    return { name: value.name, message: maskString(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redactAt(item, depth + 1));
  const out: Fields = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = redactKeys.has(key.toLowerCase()) ? REDACTED : redactAt(inner, depth + 1);
  }
  return out;
}

export function redact(value: unknown): unknown {
  return redactAt(value, 0);
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function expandIpv6(address: string): number[] | null {
  const [head = "", tail, extra] = address.split("::");
  if (extra !== undefined) return null;
  const left = head === "" ? [] : head.split(":");
  const right = tail === undefined || tail === "" ? [] : tail.split(":");
  const missing = 8 - left.length - right.length;
  if (tail === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array<string>(tail === undefined ? 0 : missing).fill("0"), ...right];
  const parsed = groups.map((group) => (/^[0-9a-f]{1,4}$/i.test(group) ? parseInt(group, 16) : NaN));
  return parsed.some(Number.isNaN) ? null : parsed;
}

function addressPrefix(address: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  const text = mapped?.[1] ?? address;
  if (!text.includes(":")) return text;
  const groups = expandIpv6(text);
  return groups ? groups.slice(0, 4).join(":") : text;
}

function hashAddress(address: string): string {
  return sha256Hex(addressPrefix(address)).slice(0, 8);
}

function shape(level: Exclude<LogLevel, "silent">, fields: Fields): Fields {
  const { ip, device, ...rest } = fields;
  const out: Fields = { ...rest };
  if (typeof device === "string") out.dev = sha256Hex(device).slice(0, 8);
  if (level === "warn" && typeof ip === "string") out.ip = hashAddress(ip);
  return out;
}

export function createLogger(opts: {
  level: LogLevel;
  write?: (line: string) => void;
  clock?: () => number;
  keep?: number;
}): Logger {
  const write = opts.write ?? ((line: string) => void process.stdout.write(`${line}\n`));
  const clock = opts.clock ?? Date.now;
  const keep = opts.keep ?? 1000;
  const kept: string[] = [];

  function build(base: Fields): Logger {
    const emit = (level: Exclude<LogLevel, "silent">, msg: string, fields?: Fields) => {
      if (RANK[level] < RANK[opts.level]) return;
      let line: string;
      try {
        const merged = shape(level, { ...base, ...fields });
        const head = { ts: new Date(clock()).toISOString(), level, msg: maskString(msg) };
        line = JSON.stringify({ ...head, ...(redact(merged) as Fields), ...head });
      } catch {
        return;
      }
      kept.push(line);
      if (kept.length > keep) kept.splice(0, kept.length - keep);
      try {
        write(line);
      } catch {
        // a broken sink must not fail the request that logged
      }
    };
    return {
      level: opts.level,
      debug: (msg, fields) => emit("debug", msg, fields),
      info: (msg, fields) => emit("info", msg, fields),
      warn: (msg, fields) => emit("warn", msg, fields),
      error: (msg, fields) => emit("error", msg, fields),
      child: (extra) => build({ ...base, ...extra }),
      lines: () => kept.slice(),
    };
  }

  return build({});
}
