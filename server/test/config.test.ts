import assert from "node:assert/strict";
import { test } from "node:test";
import { checkConfig, ConfigError, loadConfig, type FsProbe } from "../src/config.ts";

const goodEnv = {
  IYNK_PUBLIC_URL: "https://iynk.example",
  IYNK_ALLOWED_ORIGINS: "https://iynk.example",
};

function probe(overrides: Partial<{ mode: number | null; writable: boolean; uid: number }> = {}): FsProbe {
  const { mode = null, writable = true, uid = 1000 } = overrides;
  return { statMode: () => mode, isWritable: () => writable, uid: () => uid };
}

function problemsOf(env: Record<string, string | undefined>, fake = probe()): readonly string[] {
  try {
    loadConfig(env, fake);
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.problems;
  }
  assert.fail("loadConfig did not throw");
}

test("a good environment gives the defaults", () => {
  const config = loadConfig(goodEnv, probe());
  assert.equal(config.audience, "iynk.example");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 8787);
  assert.deepEqual(config.allowedOrigins, ["https://iynk.example"]);
  assert.equal(config.trustProxy, 0);
  assert.equal(config.allowDirect, false);
  assert.equal(config.enrol, "code");
  assert.equal(config.tokenTtlMs, 12 * 3_600_000);
  assert.equal(config.storeSync, "full");
  assert.equal(config.logLevel, "info");
  assert.equal(config.allowRoot, false);
  assert.equal(config.maxIdentities, 100);
  assert.equal(config.deletionGraceHours, 24);
  assert.equal(config.serverName, "iynk");
  assert.equal(config.minClient, "0.0.0");
  assert.ok(config.dataDir.endsWith("data"));
  assert.deepEqual(checkConfig(goodEnv, probe()), []);
});

test("a wildcard origin is refused and names the variable", () => {
  const problems = problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "*" });
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /^IYNK_ALLOWED_ORIGINS: "\*" is not allowed/);
});

test("origins must be exact, and are normalised", () => {
  assert.match(problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "https://a.example/" })[0]!, /ends with a slash; write https:\/\/a\.example\./);
  assert.match(problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "https://a.example/app" })[0]!, /not an exact origin/);
  assert.match(problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "a.example" })[0]!, /not an exact origin/);
  assert.match(problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "https://*.example" })[0]!, /"\*" is not allowed/);
  assert.match(problemsOf({ ...goodEnv, IYNK_ALLOWED_ORIGINS: "  " })[0]!, /required/);
  const config = loadConfig(
    { ...goodEnv, IYNK_ALLOWED_ORIGINS: "HTTPS://Iynk.Example, http://[::1]:3000,https://iynk.example" },
    probe(),
  );
  assert.deepEqual(config.allowedOrigins, ["https://iynk.example", "http://[::1]:3000"]);
});

test("the public URL is required and plain", () => {
  assert.match(problemsOf({ IYNK_ALLOWED_ORIGINS: goodEnv.IYNK_ALLOWED_ORIGINS })[0]!, /^IYNK_PUBLIC_URL: required/);
  for (const bad of ["https://iynk.example/app", "ftp://iynk.example", "https://me:pw@iynk.example", "nonsense"]) {
    assert.match(problemsOf({ ...goodEnv, IYNK_PUBLIC_URL: bad })[0]!, /^IYNK_PUBLIC_URL/);
  }
});

test("a data directory that is not writable is refused", () => {
  const problems = problemsOf(goodEnv, probe({ mode: 0o700, writable: false }));
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /^IYNK_DATA_DIR: .* is not writable/);
});

test("a data directory open to the group or others is refused with the fix", () => {
  const problems = problemsOf(goodEnv, probe({ mode: 0o755 }));
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /mode 755.*chmod 700/);
  assert.deepEqual(checkConfig(goodEnv, probe({ mode: 0o700 })), []);
  assert.equal(checkConfig(goodEnv, probe({ mode: 0o640 })).length, 1);
});

test("a missing data directory is fine", () => {
  assert.deepEqual(checkConfig(goodEnv, probe({ mode: null })), []);
});

test("running as root needs IYNK_ALLOW_ROOT", () => {
  const problems = problemsOf(goodEnv, probe({ uid: 0 }));
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /^IYNK_ALLOW_ROOT/);
  assert.equal(loadConfig({ ...goodEnv, IYNK_ALLOW_ROOT: "1" }, probe({ uid: 0 })).allowRoot, true);
});

test("each removed variable is refused by name", () => {
  const removed = [
    "IYNK_SECRET",
    "IYNK_SERVER_TOKEN",
    "LOG_LEVEL",
    "TRUST_PROXY",
    "MAX_ROOMS",
    "MAX_CONNECTIONS",
    "MAX_CONNECTIONS_PER_IP",
    "REALTIME_ANYTHING",
  ];
  for (const name of removed) {
    const problems = problemsOf({ ...goodEnv, [name]: "x" });
    assert.equal(problems.length, 1, name);
    assert.ok(problems[0]!.startsWith(`${name}:`), name);
  }
});

test("the five refusals together list five problems", () => {
  const problems = problemsOf(
    { IYNK_PUBLIC_URL: "https://iynk.example", IYNK_ALLOWED_ORIGINS: "*", IYNK_SECRET: "old" },
    probe({ mode: 0o755, writable: false, uid: 0 }),
  );
  assert.equal(problems.length, 5);
  const error = new ConfigError(problems);
  assert.equal(error.message.split("\n").length, 6);
});

test("bare PORT and HOST are not refused", () => {
  assert.deepEqual(checkConfig({ ...goodEnv, PORT: "8080", HOST: "0.0.0.0" }, probe()), []);
});

test("a proxy hop count above 8 is refused", () => {
  assert.match(problemsOf({ ...goodEnv, IYNK_TRUST_PROXY: "9" })[0]!, /^IYNK_TRUST_PROXY/);
  assert.equal(loadConfig({ ...goodEnv, IYNK_TRUST_PROXY: "8" }, probe()).trustProxy, 8);
});

test("a host open to the network needs a proxy or direct access", () => {
  const open = { ...goodEnv, IYNK_HOST: "0.0.0.0" };
  assert.match(problemsOf(open)[0]!, /^IYNK_HOST/);
  assert.equal(loadConfig({ ...open, IYNK_TRUST_PROXY: "1" }, probe()).host, "0.0.0.0");
  assert.equal(loadConfig({ ...open, IYNK_ALLOW_DIRECT: "1" }, probe()).allowDirect, true);
  for (const loopback of ["127.0.0.1", "localhost", "::1", "[::1]"]) {
    assert.deepEqual(checkConfig({ ...goodEnv, IYNK_HOST: loopback }, probe()), [], loopback);
  }
});

test("port zero and out of range ports are refused", () => {
  for (const port of ["0", "65536", "abc", "-1", "80.5"]) {
    assert.match(problemsOf({ ...goodEnv, IYNK_PORT: port })[0]!, /^IYNK_PORT/, port);
  }
  assert.equal(loadConfig({ ...goodEnv, IYNK_PORT: "65535" }, probe()).port, 65535);
});

test("the deletion grace accepts 0 and refuses -1 and 721", () => {
  assert.equal(loadConfig({ ...goodEnv, IYNK_DELETION_GRACE_HOURS: "0" }, probe()).deletionGraceHours, 0);
  assert.equal(loadConfig({ ...goodEnv, IYNK_DELETION_GRACE_HOURS: "720" }, probe()).deletionGraceHours, 720);
  for (const hours of ["-1", "721"]) {
    assert.match(problemsOf({ ...goodEnv, IYNK_DELETION_GRACE_HOURS: hours })[0]!, /^IYNK_DELETION_GRACE_HOURS/);
  }
});

test("choices, limits and names are checked", () => {
  const config = loadConfig(
    { ...goodEnv, IYNK_ENROL: "closed", IYNK_STORE_SYNC: "normal", IYNK_LOG_LEVEL: "debug", IYNK_TOKEN_TTL_HOURS: "720", IYNK_SERVER_NAME: "Lab" },
    probe(),
  );
  assert.equal(config.enrol, "closed");
  assert.equal(config.storeSync, "normal");
  assert.equal(config.logLevel, "debug");
  assert.equal(config.tokenTtlMs, 720 * 3_600_000);
  assert.equal(config.serverName, "Lab");
  for (const name of ["IYNK_ENROL", "IYNK_STORE_SYNC", "IYNK_LOG_LEVEL", "IYNK_TOKEN_TTL_HOURS", "IYNK_ALLOW_DIRECT"]) {
    assert.match(problemsOf({ ...goodEnv, [name]: "maybe" })[0]!, new RegExp(`^${name}`), name);
  }
  assert.match(problemsOf({ ...goodEnv, IYNK_TOKEN_TTL_HOURS: "0" })[0]!, /^IYNK_TOKEN_TTL_HOURS/);
  assert.match(problemsOf({ ...goodEnv, IYNK_SERVER_NAME: "x".repeat(61) })[0]!, /^IYNK_SERVER_NAME/);
  assert.match(problemsOf({ ...goodEnv, IYNK_MIN_CLIENT: "1.0" })[0]!, /^IYNK_MIN_CLIENT/);
});

test("settings owned by later phases are accepted and ignored", () => {
  assert.deepEqual(checkConfig({ ...goodEnv, IYNK_MAX_LIVE_ROOMS: "banana" }, probe()), []);
});
