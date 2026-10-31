import assert from "node:assert/strict";
import { test } from "node:test";
import { PRESET_HOSTS } from "../../src/protocol/ai-presets.ts";
import { ApiError } from "../src/http/errors.ts";
import { moduleRoutes } from "../src/modules/index.ts";
import { providerKey, requireEnabled } from "../src/modules/guard.ts";
import { startApp, testConfig } from "./http-helpers.ts";

function problemsOf(env: Record<string, string>): string[] {
  try {
    testConfig(env);
  } catch (error) {
    return (error as { problems: string[] }).problems;
  }
  assert.fail("testConfig did not throw");
}

test("the module settings default to off and unset", () => {
  const config = testConfig();
  assert.equal(config.aiEnable, false);
  assert.equal(config.searchEnable, false);
  assert.deepEqual(config.aiAllowedHosts, []);
  assert.equal(config.aiAllowPrivate, false);
  assert.equal(config.aiDailyRequests, 200);
  assert.equal(config.searchMonthly, null);
});

test("good values are read, with hosts lower-cased and de-duplicated", () => {
  const config = testConfig({
    IYNK_AI_ENABLE: "1",
    IYNK_SEARCH_ENABLE: "1",
    IYNK_AI_ALLOWED_HOSTS: "Models.Example, models.example,llm.local:8080,",
    IYNK_AI_RELAY_ALLOW_PRIVATE: "1",
    IYNK_AI_DAILY_REQUESTS: "0",
    IYNK_SEARCH_MONTHLY: "0",
  });
  assert.equal(config.aiEnable, true);
  assert.equal(config.searchEnable, true);
  assert.deepEqual(config.aiAllowedHosts, ["models.example", "llm.local:8080"]);
  assert.equal(config.aiAllowPrivate, true);
  assert.equal(config.aiDailyRequests, 0);
  assert.equal(config.searchMonthly, 0);
});

test("bad values are all reported together", () => {
  const problems = problemsOf({
    IYNK_AI_ENABLE: "yes",
    IYNK_SEARCH_ENABLE: "2",
    IYNK_AI_RELAY_ALLOW_PRIVATE: "true",
    IYNK_AI_DAILY_REQUESTS: "100001",
    IYNK_SEARCH_MONTHLY: "-1",
    IYNK_AI_ALLOWED_HOSTS: "*.example,https://a.example,b.example/x,c.example:99999",
  });
  for (const name of ["IYNK_AI_ENABLE", "IYNK_SEARCH_ENABLE", "IYNK_AI_RELAY_ALLOW_PRIVATE", "IYNK_AI_DAILY_REQUESTS", "IYNK_SEARCH_MONTHLY"]) {
    assert.ok(problems.some((problem) => problem.startsWith(`${name}:`)), name);
  }
  assert.equal(problems.filter((problem) => problem.startsWith("IYNK_AI_ALLOWED_HOSTS:")).length, 4);
  assert.match(problems.find((problem) => problem.includes('"*"'))!, /not allowed/);
});

test("renamed and removed names point at the right one", () => {
  const problems = problemsOf({ IYNK_AI_ALLOW_PRIVATE: "1", IYNK_AI_RELAY_HOSTS: "a.example", IYNK_AI_KEY_OPENAI: "sk-x" });
  assert.match(problems[0]!, /^IYNK_AI_ALLOW_PRIVATE: .*IYNK_AI_RELAY_ALLOW_PRIVATE/);
  assert.match(problems[1]!, /^IYNK_AI_RELAY_HOSTS: .*IYNK_AI_ALLOWED_HOSTS/);
  assert.match(problems[2]!, /^IYNK_AI_KEY_OPENAI: /);
  assert.ok(!problems[2]!.includes("sk-x"));
});

test("requireEnabled throws 501 feature_disabled naming the flag, and never for tools", () => {
  const off = testConfig();
  for (const [name, flag] of [["ai", "IYNK_AI_ENABLE"], ["search", "IYNK_SEARCH_ENABLE"]] as const) {
    assert.throws(
      () => requireEnabled(off, name),
      (error) => error instanceof ApiError && error.status === 501 && error.code === "feature_disabled" && JSON.stringify(error.details) === JSON.stringify([{ path: `/${flag}` }]),
    );
  }
  assert.doesNotThrow(() => requireEnabled(off, "tools"));
  const on = testConfig({ IYNK_AI_ENABLE: "1", IYNK_SEARCH_ENABLE: "1" });
  assert.doesNotThrow(() => requireEnabled(on, "ai"));
  assert.doesNotThrow(() => requireEnabled(on, "search"));
});

test("providerKey reads the header and refuses a missing or malformed key", () => {
  assert.deepEqual(providerKey(new Headers({ "X-Iynk-Provider-Key": "sk-1234567890" })), { ok: true, key: "sk-1234567890" });
  assert.deepEqual(providerKey(new Headers()), { ok: false });
  assert.deepEqual(providerKey(new Headers({ "X-Iynk-Provider-Key": "short" })), { ok: false });
});

test("the probe follows the switches", async () => {
  const off = await startApp();
  try {
    const body = (await (await off.get("/v1/server")).json()) as { features: Record<string, boolean>; ai: unknown };
    assert.equal(body.features["aiRelay"], false);
    assert.equal(body.features["searchProxy"], false);
    assert.deepEqual(body.ai, { relayHosts: [], relayAllowPrivate: false, serverKey: [] });
  } finally {
    await off.stop();
  }
  const on = await startApp({ env: { IYNK_AI_ENABLE: "1", IYNK_SEARCH_ENABLE: "1", IYNK_AI_ALLOWED_HOSTS: "models.example", IYNK_AI_RELAY_ALLOW_PRIVATE: "1" } });
  try {
    const body = (await (await on.get("/v1/server")).json()) as { features: Record<string, boolean>; ai: unknown };
    assert.equal(body.features["aiRelay"], true);
    assert.equal(body.features["searchProxy"], true);
    assert.deepEqual(body.ai, { relayHosts: [...PRESET_HOSTS, "models.example"], relayAllowPrivate: true, serverKey: [] });
  } finally {
    await on.stop();
  }
});

test("no module routes are registered yet", async () => {
  const running = await startApp();
  try {
    assert.deepEqual(moduleRoutes({} as never), []);
  } finally {
    await running.stop();
  }
});
