import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deps } from "../src/deps.ts";
import { addressKey, createLimiter, type Rule } from "../src/http/limits.ts";
import type { BucketName } from "../src/http/classes.ts";

function clockDeps(): { deps: Deps; advance(ms: number): void } {
  let now = 1_000_000;
  const deps: Deps = {
    clock: { now: () => now },
    ids: { random: (bytes) => new Uint8Array(bytes) },
    sleep: async () => {},
  };
  return { deps, advance: (ms) => void (now += ms) };
}

test("a burst up to the limit passes and the next call is refused with a wait", () => {
  const { deps, advance } = clockDeps();
  const limiter = createLimiter(deps);
  for (let i = 0; i < 20; i++) assert.equal(limiter.take("auth.challenge", "1.2.3.4").ok, true);
  advance(10_000);
  const refused = limiter.take("auth.challenge", "1.2.3.4");
  assert.equal(refused.ok, false);
  assert.equal(refused.remaining, 0);
  assert.equal(refused.retryAfter, 50);
  assert.equal(limiter.take("auth.challenge", "5.6.7.8").ok, true);
});

test("the window refills as old hits age out", () => {
  const { deps, advance } = clockDeps();
  const limiter = createLimiter(deps);
  for (let i = 0; i < 5; i++) limiter.take("identity.register", "a");
  assert.equal(limiter.take("identity.register", "a").ok, false);
  advance(30_000);
  assert.equal(limiter.take("identity.register", "a").ok, false);
  advance(30_001);
  const again = limiter.take("identity.register", "a");
  assert.equal(again.ok, true);
  assert.equal(again.remaining, 4);
});

test("a refused call does not extend the lockout", () => {
  const { deps, advance } = clockDeps();
  const limiter = createLimiter(deps);
  for (let i = 0; i < 5; i++) limiter.take("identity.register", "a");
  for (let i = 0; i < 50; i++) {
    advance(1_000);
    assert.equal(limiter.take("identity.register", "a").ok, false);
  }
  advance(10_001);
  assert.equal(limiter.take("identity.register", "a").ok, true);
});

test("every rule of a bucket must pass", () => {
  const { deps, advance } = clockDeps();
  const limiter = createLimiter(deps);
  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < 10; i++) assert.equal(limiter.take("pairing.guess", "a").ok, true);
    advance(60_001);
  }
  const refused = limiter.take("pairing.guess", "a");
  assert.equal(refused.ok, false);
  assert.ok(refused.retryAfter > 60);
});

test("auth.token.identity allows 5 then refuses the 6th while auth.token still has room", () => {
  const { deps } = clockDeps();
  const limiter = createLimiter(deps);
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.take("auth.token.identity", "id:abc").ok, true);
    assert.equal(limiter.take("auth.token", "1.2.3.4").ok, true);
  }
  assert.equal(limiter.take("auth.token.identity", "id:abc").ok, false);
  const token = limiter.take("auth.token", "1.2.3.4");
  assert.equal(token.ok, true);
  assert.equal(token.remaining, 14);
});

test("the oldest key is evicted at 10,001 keys", () => {
  const { deps } = clockDeps();
  const table = { read: [{ limit: 1, windowMs: 60_000 }] } as unknown as Record<BucketName, Rule[]>;
  const limiter = createLimiter(deps, table);
  limiter.take("read", "first");
  for (let i = 0; i < 10_000; i++) limiter.take("read", `k${i}`);
  assert.equal(limiter.take("read", "first").ok, true);
  assert.equal(limiter.take("read", "k9999").ok, false);
});

test("reset forgets every key", () => {
  const { deps } = clockDeps();
  const limiter = createLimiter(deps);
  for (let i = 0; i < 5; i++) limiter.take("identity.register", "a");
  limiter.reset();
  assert.equal(limiter.take("identity.register", "a").ok, true);
});

test("addressKey ignores X-Forwarded-For without a trusted proxy", () => {
  assert.equal(addressKey("10.0.0.9", "6.6.6.6", 0), "10.0.0.9");
});

test("addressKey takes the Nth entry from the right", () => {
  assert.equal(addressKey("10.0.0.9", "6.6.6.6, 1.1.1.1", 1), "1.1.1.1");
  assert.equal(addressKey("10.0.0.9", "6.6.6.6, 1.1.1.1, 2.2.2.2", 2), "1.1.1.1");
  assert.equal(addressKey("10.0.0.9", "6.6.6.6, 1.1.1.1", 2), "6.6.6.6");
});

test("addressKey falls back to the socket on a short, missing or junk header", () => {
  assert.equal(addressKey("10.0.0.9", "1.1.1.1", 2), "10.0.0.9");
  assert.equal(addressKey("10.0.0.9", null, 1), "10.0.0.9");
  assert.equal(addressKey("10.0.0.9", "not-an-ip", 1), "10.0.0.9");
  assert.equal(addressKey("", null, 0), "unknown");
});

test("addressKey survives a header with 40 entries", () => {
  const header = Array.from({ length: 40 }, (_, i) => `9.9.9.${i}`).join(",");
  assert.equal(addressKey("10.0.0.9", header, 1), "9.9.9.39");
  assert.equal(addressKey("10.0.0.9", header, 8), "9.9.9.32");
});

test("addressKey reduces IPv6 to its /64", () => {
  assert.equal(addressKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd", null, 0), "2001:db8:1:2::/64");
  assert.equal(addressKey("2001:db8:1:2::1", null, 0), addressKey("2001:db8:1:2:ffff::9", null, 0));
  assert.equal(addressKey("::1", null, 0), "0:0:0:0::/64");
  assert.equal(addressKey("fe80::1%eth0", null, 0), "fe80:0:0:0::/64");
});

test("addressKey treats IPv4-mapped IPv6 as IPv4", () => {
  assert.equal(addressKey("::ffff:1.2.3.4", null, 0), "1.2.3.4");
  assert.equal(addressKey("::ffff:102:304", null, 0), "1.2.3.4");
  assert.equal(addressKey("10.0.0.9", "::ffff:5.6.7.8", 1), "5.6.7.8");
});
