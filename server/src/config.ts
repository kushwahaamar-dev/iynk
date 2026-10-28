import { statSync, accessSync, constants } from "node:fs";
import { resolve } from "node:path";

export type ServerConfig = {
  dataDir: string;
  publicUrl: URL;
  audience: string;
  host: string;
  port: number;
  allowedOrigins: readonly string[];
  trustProxy: number;
  allowDirect: boolean;
  enrol: "code" | "closed";
  tokenTtlMs: number;
  storeSync: "full" | "normal";
  logLevel: "debug" | "info" | "warn" | "error";
  metricsAddr: string;
  allowRoot: boolean;
  maxIdentities: number;
  deletionGraceHours: number;
  serverName: string;
  minClient: string;
};

export type FsProbe = {
  statMode(path: string): number | null;
  isWritable(path: string): boolean;
  uid(): number;
};

export class ConfigError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid server configuration:\n${problems.map((problem) => `  ${problem}`).join("\n")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

type Env = Record<string, string | undefined>;

const HOUR_MS = 3_600_000;
const ENROL_MODES = ["code", "closed"] as const;
const STORE_SYNCS = ["full", "normal"] as const;
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
const REMOVED_VARIABLES = [
  "IYNK_SECRET",
  "IYNK_SERVER_TOKEN",
  "LOG_LEVEL",
  "TRUST_PROXY",
  "MAX_ROOMS",
  "MAX_CONNECTIONS",
  "MAX_CONNECTIONS_PER_IP",
];
const ORIGIN_PATTERN = /^(https?):\/\/([^/?#@\s]+)$/i;

const nodeProbe: FsProbe = {
  statMode(path) {
    try {
      return statSync(path).mode & 0o777;
    } catch {
      return null;
    }
  },
  isWritable(path) {
    try {
      accessSync(path, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  },
  uid() {
    return process.getuid?.() ?? -1;
  },
};

function isLoopback(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase();
  return bare === "localhost" || bare === "::1" || /^127(\.\d{1,3}){3}$/.test(bare);
}

function parseOrigin(raw: string): { origin: string } | { problem: string } {
  const entry = raw.trim();
  if (entry.includes("*")) {
    return { problem: '"*" is not allowed; list exact origins like https://iynk.example.' };
  }
  const bare = entry.replace(/\/+$/, "");
  if (bare !== entry && ORIGIN_PATTERN.test(bare)) {
    return { problem: `"${entry}" ends with a slash; write ${bare}.` };
  }
  if (ORIGIN_PATTERN.test(entry)) {
    try {
      return { origin: new URL(entry).origin };
    } catch {
      // falls through to the shared message
    }
  }
  return { problem: `"${entry}" is not an exact origin; use scheme://host[:port] like https://iynk.example.` };
}

function evaluate(env: Env, probe: FsProbe): { config: ServerConfig | null; problems: string[] } {
  const problems: string[] = [];
  const fail = (message: string) => {
    problems.push(message);
  };

  const text = (name: string, fallback: string): string => {
    const value = env[name]?.trim();
    return value === undefined || value === "" ? fallback : value;
  };

  const integer = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < min || value > max) {
      fail(`${name}: "${raw}" is not valid; use a whole number from ${min} to ${max}.`);
      return fallback;
    }
    return value;
  };

  const flag = (name: string): boolean => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === "" || raw === "0") return false;
    if (raw === "1") return true;
    fail(`${name}: "${raw}" is not valid; use 1 or 0.`);
    return false;
  };

  const choice = <T extends string>(name: string, options: readonly T[], fallback: T): T => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === "") return fallback;
    const match = options.find((option) => option === raw);
    if (match === undefined) {
      fail(`${name}: "${raw}" is not valid; use ${options.join(" or ")}.`);
      return fallback;
    }
    return match;
  };

  for (const name of Object.keys(env)) {
    if (env[name] === undefined) continue;
    if (REMOVED_VARIABLES.includes(name) || name.startsWith("REALTIME_")) {
      fail(`${name}: this setting was removed with the old relay; delete it from the environment.`);
    }
  }

  const dataDir = resolve(text("IYNK_DATA_DIR", "./data"));
  const mode = probe.statMode(dataDir);
  if (mode !== null) {
    if (!probe.isWritable(dataDir)) {
      fail(`IYNK_DATA_DIR: ${dataDir} is not writable by this user; fix its owner or permissions.`);
    }
    if ((mode & 0o077) !== 0) {
      fail(`IYNK_DATA_DIR: ${dataDir} is readable by other users (mode ${mode.toString(8).padStart(3, "0")}); run chmod 700 ${dataDir}.`);
    }
  }

  const allowRoot = flag("IYNK_ALLOW_ROOT");
  if (probe.uid() === 0 && !allowRoot) {
    fail("IYNK_ALLOW_ROOT: refusing to run as root; run as an ordinary user, or set IYNK_ALLOW_ROOT=1 if you must.");
  }

  let publicUrl = new URL("http://localhost");
  const rawPublicUrl = env["IYNK_PUBLIC_URL"]?.trim();
  if (rawPublicUrl === undefined || rawPublicUrl === "") {
    fail("IYNK_PUBLIC_URL: required; set the address people reach this server at, like https://iynk.example.");
  } else {
    try {
      const url = new URL(rawPublicUrl);
      const plain = url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";
      if ((url.protocol !== "http:" && url.protocol !== "https:") || !plain) {
        fail(`IYNK_PUBLIC_URL: "${rawPublicUrl}" must be an http or https address with no path or credentials, like https://iynk.example.`);
      } else {
        publicUrl = url;
      }
    } catch {
      fail(`IYNK_PUBLIC_URL: "${rawPublicUrl}" is not a web address; use something like https://iynk.example.`);
    }
  }

  const allowedOrigins: string[] = [];
  const rawOrigins = env["IYNK_ALLOWED_ORIGINS"];
  if (rawOrigins === undefined || rawOrigins.trim() === "") {
    fail("IYNK_ALLOWED_ORIGINS: required; list exact origins like https://iynk.example.");
  } else {
    for (const entry of rawOrigins.split(",")) {
      const parsed = parseOrigin(entry);
      if ("problem" in parsed) fail(`IYNK_ALLOWED_ORIGINS: ${parsed.problem}`);
      else if (!allowedOrigins.includes(parsed.origin)) allowedOrigins.push(parsed.origin);
    }
  }

  const host = text("IYNK_HOST", "127.0.0.1");
  const port = integer("IYNK_PORT", 8787, 1, 65535);
  const trustProxy = integer("IYNK_TRUST_PROXY", 0, 0, 8);
  const allowDirect = flag("IYNK_ALLOW_DIRECT");
  if (!isLoopback(host) && trustProxy === 0 && !allowDirect) {
    fail(`IYNK_HOST: ${host} is reachable from other machines; put the server behind a proxy and set IYNK_TRUST_PROXY, or set IYNK_ALLOW_DIRECT=1.`);
  }

  const serverName = text("IYNK_SERVER_NAME", "iynk");
  if (serverName.length > 60) fail("IYNK_SERVER_NAME: use at most 60 characters.");

  const minClient = text("IYNK_MIN_CLIENT", "0.0.0");
  if (!/^\d+\.\d+\.\d+$/.test(minClient)) fail(`IYNK_MIN_CLIENT: "${minClient}" is not a version; use something like 0.1.0.`);

  const config: ServerConfig = {
    dataDir,
    publicUrl,
    audience: publicUrl.hostname,
    host,
    port,
    allowedOrigins,
    trustProxy,
    allowDirect,
    enrol: choice("IYNK_ENROL", ENROL_MODES, "code"),
    tokenTtlMs: integer("IYNK_TOKEN_TTL_HOURS", 12, 1, 720) * HOUR_MS,
    storeSync: choice("IYNK_STORE_SYNC", STORE_SYNCS, "full"),
    logLevel: choice("IYNK_LOG_LEVEL", LOG_LEVELS, "info"),
    metricsAddr: text("IYNK_METRICS_ADDR", ""),
    allowRoot,
    maxIdentities: integer("IYNK_MAX_IDENTITIES", 100, 1, 100_000),
    deletionGraceHours: integer("IYNK_DELETION_GRACE_HOURS", 24, 0, 720),
    serverName,
    minClient,
  };

  return { config: problems.length === 0 ? config : null, problems };
}

export function checkConfig(env: Env, probe: FsProbe = nodeProbe): string[] {
  return evaluate(env, probe).problems;
}

export function loadConfig(env: Env, probe: FsProbe = nodeProbe): ServerConfig {
  const { config, problems } = evaluate(env, probe);
  if (config === null) throw new ConfigError(problems);
  return config;
}
