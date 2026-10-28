// @vitest-environment node
import { describe, expect, it } from "vitest";
import { featuresOf, readEnv } from "./env";

describe("readEnv", () => {
  it("falls back to every default when nothing is set", () => {
    const { env, issues } = readEnv({});
    expect(issues).toEqual([]);
    expect(env.META_API_KEY).toBeUndefined();
    expect(env.META_API_BASE).toBe("https://api.meta.ai/v1");
    expect(env.META_MODEL).toBe("muse-spark-1.3");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(200);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(featuresOf(env)).toEqual({
      ai: false,
      voice: false,
      search: false,
      realtime: false,
      gemini: false,
    });
    expect(env.IYNK_AI_PROVIDER).toBe("meta");
    expect(env.IYNK_AI_DAILY_TOKENS).toBe(200000);
    expect(env.IYNK_SEARCH_MONTHLY).toBe(200);
    expect(env.IYNK_DATA_DIR).toBe(".iynk-data");
    expect(env.IYNK_CONNECT_ORIGINS).toBe("");
    expect(env.IYNK_SERVER_URL).toBeUndefined();
  });

  it("treats blank values as unset", () => {
    const { env, issues } = readEnv({ META_API_KEY: "   ", META_MODEL: "" });
    expect(issues).toEqual([]);
    expect(env.META_API_KEY).toBeUndefined();
    expect(env.META_MODEL).toBe("muse-spark-1.3");
  });

  it("keeps going past malformed values and names them without their values", () => {
    const { env, issues } = readEnv({
      META_API_BASE: "ftp://nope",
      SERPAPI_MONTHLY_BUDGET: "lots",
      NEXT_PUBLIC_REALTIME_URL: "https://not-a-socket.example",
    });
    expect(issues.sort()).toEqual(
      [
        "META_API_BASE",
        "NEXT_PUBLIC_REALTIME_URL",
        "SERPAPI_MONTHLY_BUDGET",
      ].sort(),
    );
    expect(env.META_API_BASE).toBe("https://api.meta.ai/v1");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(200);
  });

  it("parses keys, numbers and trims trailing slashes", () => {
    const { env, issues } = readEnv({
      META_API_KEY: "k",
      META_API_BASE: "https://proxy.example/v1/",
      SERPAPI_KEY: "s",
      SERPAPI_MONTHLY_BUDGET: "50",
      NEXT_PUBLIC_REALTIME_URL: "wss://rt.example/ws",
      IYNK_AI_ENABLE: "1",
      IYNK_SEARCH_ENABLE: "1",
    });
    expect(issues).toEqual([]);
    expect(env.META_API_BASE).toBe("https://proxy.example/v1");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(50);
    expect(featuresOf(env)).toEqual({
      ai: true,
      voice: true,
      search: true,
      realtime: true,
      gemini: false,
    });
  });

  it("switches AI on without any key", () => {
    const f = featuresOf(readEnv({ IYNK_AI_ENABLE: "1" }).env);
    expect(f).toMatchObject({ ai: true, voice: true, gemini: false });
  });

  it("lets the Gemini provider carry text AI but not voice", () => {
    const f = featuresOf(readEnv({ IYNK_AI_PROVIDER: "gemini", IYNK_AI_ENABLE: "1" }).env);
    expect(f).toMatchObject({ ai: true, gemini: true, voice: false });
  });

  it("falls back to the defaults for bad operator values", () => {
    const { env, issues } = readEnv({
      IYNK_AI_PROVIDER: "openai",
      IYNK_AI_DAILY_TOKENS: "-5",
      IYNK_SEARCH_MONTHLY: "many",
      IYNK_SERVER_URL: "ftp://x",
    });
    expect(issues.sort()).toEqual(
      ["IYNK_AI_DAILY_TOKENS", "IYNK_AI_PROVIDER", "IYNK_SEARCH_MONTHLY", "IYNK_SERVER_URL"].sort(),
    );
    expect(env.IYNK_AI_PROVIDER).toBe("meta");
    expect(env.IYNK_AI_DAILY_TOKENS).toBe(200000);
  });

  it("accepts a daily token cap of 0 and keeps the origin list as text", () => {
    const { env, issues } = readEnv({ IYNK_AI_DAILY_TOKENS: "0", IYNK_CONNECT_ORIGINS: "https://a.example,ftp://b," });
    expect(issues).toEqual([]);
    expect(env.IYNK_AI_DAILY_TOKENS).toBe(0);
    expect(env.IYNK_CONNECT_ORIGINS).toBe("https://a.example,ftp://b,");
  });

  it("reads the switches as off unless they are exactly 1", () => {
    const off = readEnv({});
    expect([off.env.IYNK_AI_ENABLE, off.env.IYNK_SEARCH_ENABLE, off.env.IYNK_TRUST_PROXY]).toEqual([false, false, false]);
    const on = readEnv({ IYNK_AI_ENABLE: "1", IYNK_SEARCH_ENABLE: "1", IYNK_TRUST_PROXY: "1" });
    expect([on.env.IYNK_AI_ENABLE, on.env.IYNK_SEARCH_ENABLE, on.env.IYNK_TRUST_PROXY]).toEqual([true, true, true]);
    const bad = readEnv({ IYNK_AI_ENABLE: "yes" });
    expect(bad.issues).toEqual(["IYNK_AI_ENABLE"]);
    expect(bad.env.IYNK_AI_ENABLE).toBe(false);
  });

  it("keeps a feature off while its switch is off, even with a key", () => {
    const f = featuresOf(readEnv({ META_API_KEY: "k", GEMINI_API_KEY: "g", SERPAPI_KEY: "s" }).env);
    expect(f).toMatchObject({ ai: false, voice: false, gemini: false, search: false });
    expect(featuresOf(readEnv({ IYNK_AI_PROVIDER: "gemini" }).env).gemini).toBe(false);
  });

  it("keeps search off with its switch on but no key", () => {
    expect(featuresOf(readEnv({ IYNK_SEARCH_ENABLE: "1" }).env).search).toBe(false);
  });

  it("treats a server token under 32 characters as unset", () => {
    const short = readEnv({ IYNK_SERVER_TOKEN: "short" });
    expect(short.issues).toEqual(["IYNK_SERVER_TOKEN"]);
    expect(short.env.IYNK_SERVER_TOKEN).toBeUndefined();
    expect(readEnv({ IYNK_SERVER_TOKEN: "x".repeat(32) }).env.IYNK_SERVER_TOKEN).toBe("x".repeat(32));
  });
});
