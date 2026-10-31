import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createLogger, REDACT_KEYS, redact, type LogLevel } from "../src/ops/log.ts";

const AT = `iynk_at_${"A".repeat(43)}`;

function capture(level: LogLevel = "debug", keep?: number) {
  const out: string[] = [];
  const logger = createLogger({ level, write: (line) => out.push(line), clock: () => 0, keep });
  return { out, logger };
}

function parse(line: string | undefined): Record<string, unknown> {
  assert.ok(line);
  return JSON.parse(line) as Record<string, unknown>;
}

test("every redact key is replaced, whatever its case", () => {
  for (const key of REDACT_KEYS) {
    const { out, logger } = capture();
    logger.info("hit", { [key]: "canary-value", [key.toUpperCase()]: "canary-value" });
    assert.ok(!out[0]?.includes("canary-value"), key);
    assert.equal(parse(out[0])[key], "<redacted>");
  }
});

test("a line has ts, level and msg", () => {
  const { out, logger } = capture();
  logger.info("hello", { req: "req_1", status: 200 });
  assert.deepEqual(parse(out[0]), { ts: "1970-01-01T00:00:00.000Z", level: "info", msg: "hello", req: "req_1", status: 200 });
});

test("fields cannot overwrite ts, level or msg", () => {
  const { out, logger } = capture();
  logger.info("real", { ts: "x", level: "debug", msg: "fake" });
  const line = parse(out[0]);
  assert.equal(line.level, "info");
  assert.equal(line.msg, "real");
});

test("token shapes are masked in msg and nested fields", () => {
  const pat = "iynk_pat_abcDEF123_-xyz";
  const link = "https://iynk.example/#/pair/" + "b".repeat(22);
  const enrol = "https://iynk.example/join?enrol=" + "c".repeat(22);
  const crockford = "0123456789ABCDEFGHJKMNPQRS";
  const { out, logger } = capture();
  logger.info(`got ${AT}`, { nested: { list: [pat, link, enrol, `code=${crockford}`] }, plain: `x ${AT}` });
  const text = out[0] ?? "";
  for (const secret of [AT, pat, "b".repeat(22), "c".repeat(22), crockford]) assert.ok(!text.includes(secret), secret);
  assert.ok(text.includes("iynk_at_<redacted>"));
});

test("short codes and ordinary words survive", () => {
  const { out, logger } = capture();
  logger.info("status code 200 for the room", { reason: "unicode ok" });
  assert.equal(parse(out[0]).msg, "status code 200 for the room");
});

test("nested keys are redacted inside arrays and objects", () => {
  assert.deepEqual(redact({ a: [{ Token: "t", keep: 1 }] }), { a: [{ Token: "<redacted>", keep: 1 }] });
});

test("circular structures are cut at depth 4", () => {
  const loop: Record<string, unknown> = { name: "loop" };
  loop.self = loop;
  const { out, logger } = capture();
  logger.info("loop", { loop });
  assert.deepEqual(parse(out[0]).loop, { name: "loop", self: { name: "loop", self: { name: "loop", self: "<cut>" } } });
});

test("an Error is logged by name and masked message, without its stack", () => {
  const { out, logger } = capture();
  logger.error("failed", { err: new TypeError(`bad ${AT}`) });
  const err = parse(out[0]).err as Record<string, unknown>;
  assert.deepEqual(err, { name: "TypeError", message: "bad iynk_at_<redacted>" });
});

test("level filter", () => {
  const { out, logger } = capture("warn");
  logger.debug("d");
  logger.info("i");
  logger.warn("w");
  logger.error("e");
  assert.deepEqual(out.map((line) => parse(line).msg), ["w", "e"]);
  const silent = capture("silent");
  silent.logger.error("e");
  assert.equal(silent.out.length, 0);
  assert.equal(silent.logger.lines().length, 0);
});

test("child merges base fields and child fields win over base, call fields over both", () => {
  const { out, logger } = capture();
  const child = logger.child({ req: "req_1", route: "a" }).child({ route: "b" });
  child.info("x", { status: 204 });
  child.info("y", { route: "c" });
  assert.deepEqual([parse(out[0]).req, parse(out[0]).route, parse(out[0]).status], ["req_1", "b", 204]);
  assert.equal(parse(out[1]).route, "c");
});

test("lines() keeps only the last keep lines, shared with children", () => {
  const { logger } = capture("debug", 3);
  const child = logger.child({ a: 1 });
  for (let i = 0; i < 5; i += 1) (i % 2 ? child : logger).info(`m${i}`);
  assert.deepEqual(logger.lines().map((line) => parse(line).msg), ["m2", "m3", "m4"]);
});

test("device ids are logged as the first 8 hex of their SHA-256", () => {
  const { out, logger } = capture();
  logger.info("x", { device: "dev_abc" });
  const line = parse(out[0]);
  assert.equal(line.dev, createHash("sha256").update("dev_abc").digest("hex").slice(0, 8));
  assert.ok(!("device" in line));
});

test("an IP appears only on warn lines, hashed over its /64", () => {
  const { out, logger } = capture();
  logger.info("a", { ip: "203.0.113.9" });
  logger.warn("b", { ip: "2001:db8:1:2:aaaa::1" });
  logger.warn("c", { ip: "2001:db8:1:2:bbbb::2" });
  logger.warn("d", { ip: "::ffff:203.0.113.9" });
  logger.warn("e", { ip: "203.0.113.9" });
  assert.ok(!("ip" in parse(out[0])));
  assert.match(String(parse(out[1]).ip), /^[0-9a-f]{8}$/);
  assert.equal(parse(out[1]).ip, parse(out[2]).ip);
  assert.equal(parse(out[3]).ip, parse(out[4]).ip);
  assert.ok(!out.join("\n").includes("203.0.113.9"));
});

test("a throwing sink never reaches the caller, and the line is still kept", () => {
  const logger = createLogger({
    level: "info",
    write: () => {
      throw new Error("disk full");
    },
  });
  assert.doesNotThrow(() => logger.info("x"));
  assert.equal(logger.lines().length, 1);
});

test("values JSON cannot hold do not throw", () => {
  const { out, logger } = capture();
  assert.doesNotThrow(() => logger.info("x", { big: 10n }));
  assert.equal(parse(out[0]).big, "10");
});
