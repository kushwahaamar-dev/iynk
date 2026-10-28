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
      db: false,
      realtime: false,
      gemini: false,
    });
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
      DATABASE_URL: "mysql://x",
      NEXT_PUBLIC_REALTIME_URL: "https://not-a-socket.example",
    });
    expect(issues.sort()).toEqual(
      [
        "DATABASE_URL",
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
      DATABASE_URL: "postgres://u:p@host:5432/db",
      NEXT_PUBLIC_REALTIME_URL: "wss://rt.example/ws",
      GEMINI_API_KEY: "g",
    });
    expect(issues).toEqual([]);
    expect(env.META_API_BASE).toBe("https://proxy.example/v1");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(50);
    expect(featuresOf(env)).toEqual({
      ai: true,
     
      voice: true,
      search: true,
      db: true,
      realtime: true,
      gemini: true,
    });
  });

  it("lets Gemini alone carry text AI but not voice", () => {
    const f = featuresOf(readEnv({ GEMINI_API_KEY: "g" }).env);
    expect(f).toMatchObject({ ai: true, gemini: true, voice: false });
  });
});
