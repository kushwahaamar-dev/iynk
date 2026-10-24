import { isLogLevel } from "./log.js";

/** Numbers fixed by HX-CONTRACT H7. Tests shorten the timings; deployments don't. */
export const PROTOCOL = {
  maxPeers: 8,
  maxFrameBytes: 64 * 1024,
  /** A snapshot may be 512 KB; the state frame around it gets 1 KB more. */
  maxStateFrameBytes: 512 * 1024 + 1024,
  framesPerSecond: 60,
  /** Cursor and pose frames each. */
  streamHz: 20,
  heartbeatMs: 15_000,
  peerTimeoutMs: 45_000,
  roomTtlMs: 30 * 60_000,
};

export const DEFAULT_LIMITS = {
  ...PROTOCOL,
  /** ws closes the socket (1009) above this; frames between the H7 caps and this get an error instead. */
  maxPayloadBytes: 640 * 1024,
  streamBurst: 10,
  joinTimeoutMs: 10_000,
  snapshotTimeoutMs: 5_000,
  chatBacklog: 50,
  banListSize: 64,
  /** The action log behind snapshot catch-up and reconnect replay, per room. */
  logEntries: 2048,
  logBytes: 1024 * 1024,
  maxRooms: 500,
  maxConnections: 2000,
  maxConnectionsPerIp: 64,
  /** Above this much unsent data a peer is cut off; cursor and pose frames stop at the lower mark. */
  maxBufferedBytes: 4 * 1024 * 1024,
  lossyBufferedBytes: 256 * 1024,
  /** Dropped frames within the window after which a flooding socket is closed. */
  floodDrops: 600,
  floodWindowMs: 5_000,
  shutdownGraceMs: 5_000,
};

/** @typedef {typeof DEFAULT_LIMITS} Limits */
/** @typedef {{ any: boolean, localDev: boolean, exact: Set<string>, suffixes: { protocol: string, host: string }[] }} OriginPolicy */
/**
 * @typedef {{
 *   port: number, host: string, path: string, origins: OriginPolicy, trustProxy: boolean,
 *   logLevel: import('./log.js').LogLevel, limits: Limits,
 * }} Config
 */
/**
 * @typedef {{
 *   port?: number, host?: string, path?: string, origins?: string, trustProxy?: boolean,
 *   logLevel?: import('./log.js').LogLevel, limits?: Partial<Limits>,
 * }} RelayOptions
 */

/** @param {RelayOptions} [options] @returns {Config} */
export function resolveConfig(options = {}) {
  return {
    port: options.port ?? 8787,
    host: options.host ?? "0.0.0.0",
    path: options.path ?? "/ws",
    origins: parseOrigins(options.origins),
    trustProxy: options.trustProxy ?? false,
    logLevel: options.logLevel ?? "info",
    limits: { ...DEFAULT_LIMITS, ...options.limits },
  };
}

/**
 * Reads the deployment knobs from the environment (and --port/--host). Throws on bad values so a
 * misconfigured container fails at start instead of at the first visitor.
 * @param {NodeJS.ProcessEnv} env
 * @param {{ port?: string, host?: string }} [args]
 * @returns {RelayOptions}
 */
export function loadConfig(env, args = {}) {
  const logLevel = env.LOG_LEVEL ?? "info";
  if (!isLogLevel(logLevel)) throw new Error("LOG_LEVEL must be one of debug, info, warn, error, silent.");
  const origins = env.REALTIME_ALLOWED_ORIGINS;
  parseOrigins(origins);
  return {
    port: intFrom(args.port ?? env.PORT, "PORT", 8787, 1, 65_535),
    host: args.host ?? env.HOST ?? "0.0.0.0",
    origins,
    trustProxy: env.TRUST_PROXY === "1" || env.TRUST_PROXY === "true",
    logLevel,
    limits: {
      maxRooms: intFrom(env.MAX_ROOMS, "MAX_ROOMS", DEFAULT_LIMITS.maxRooms, 1, 100_000),
      maxConnections: intFrom(env.MAX_CONNECTIONS, "MAX_CONNECTIONS", DEFAULT_LIMITS.maxConnections, 1, 1_000_000),
      maxConnectionsPerIp: intFrom(env.MAX_CONNECTIONS_PER_IP, "MAX_CONNECTIONS_PER_IP", DEFAULT_LIMITS.maxConnectionsPerIp, 1, 100_000),
    },
  };
}

/** @param {string | undefined} value @param {string} name @param {number} fallback @param {number} min @param {number} max */
function intFrom(value, name, fallback, min, max) {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return n;
}

/**
 * REALTIME_ALLOWED_ORIGINS: a comma list of origins (https://simlab.tech), `https://*.example.com`
 * for subdomains, or `*` for any. Unset means local development: http(s)://localhost and 127.0.0.1.
 * @param {string | undefined} value
 * @returns {OriginPolicy}
 */
export function parseOrigins(value) {
  /** @type {OriginPolicy} */
  const policy = { any: false, localDev: false, exact: new Set(), suffixes: [] };
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    policy.localDev = true;
    return policy;
  }
  for (const entry of entries) {
    if (entry === "*") {
      policy.any = true;
      continue;
    }
    const wildcard = /^(https?:)\/\/\*\.([a-z0-9.-]+(?::\d+)?)$/i.exec(entry);
    if (wildcard) {
      policy.suffixes.push({ protocol: wildcard[1].toLowerCase(), host: `.${wildcard[2].toLowerCase()}` });
      continue;
    }
    /** @type {URL} */
    let url;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(`REALTIME_ALLOWED_ORIGINS: "${entry}" is not an origin like https://simlab.tech.`);
    }
    if (!/^https?:$/.test(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
      throw new Error(`REALTIME_ALLOWED_ORIGINS: "${entry}" must be scheme://host[:port] with nothing after it.`);
    }
    policy.exact.add(url.origin);
  }
  return policy;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Browsers always send Origin on a WebSocket upgrade. Clients without one (Node, wscat) can claim
 * any origin anyway, so they are let through; the check protects visitors' browsers, not the relay.
 * @param {OriginPolicy} policy
 * @param {string | undefined} origin
 */
export function originAllowed(policy, origin) {
  if (origin === undefined) return true;
  if (policy.any) return true;
  /** @type {URL} */
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (policy.exact.has(url.origin)) return true;
  if (policy.localDev && LOCAL_HOSTS.has(url.hostname)) return true;
  return policy.suffixes.some((s) => url.protocol === s.protocol && url.host.endsWith(s.host));
}
