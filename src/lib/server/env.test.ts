// @vitest-environment node
import { describe, expect, it } from "vitest";
import { featuresOf, readEnv } from "./env";

const keypair = JSON.stringify(Array.from({ length: 64 }, (_, i) => i));
const programId = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

describe("readEnv", () => {
  it("falls back to every default when nothing is set", () => {
    const { env, issues } = readEnv({});
    expect(issues).toEqual([]);
    expect(env.META_API_KEY).toBeUndefined();
    expect(env.META_API_BASE).toBe("https://api.meta.ai/v1");
    expect(env.META_MODEL).toBe("muse-spark-1.3");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(200);
    expect(env.NEXT_PUBLIC_SOLANA_CLUSTER).toBe("devnet");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(featuresOf(env)).toEqual({
      ai: false,
      image: false,
      voice: false,
      search: false,
      solana: false,
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
      SOLANA_ISSUER_KEYPAIR: "[1,2,3]",
      DATABASE_URL: "mysql://x",
      NEXT_PUBLIC_REALTIME_URL: "https://not-a-socket.example",
      NEXT_PUBLIC_SOLANA_CLUSTER: "mainnet-beta",
    });
    expect(issues.sort()).toEqual(
      [
        "DATABASE_URL",
        "META_API_BASE",
        "NEXT_PUBLIC_REALTIME_URL",
        "NEXT_PUBLIC_SOLANA_CLUSTER",
        "SERPAPI_MONTHLY_BUDGET",
        "SOLANA_ISSUER_KEYPAIR",
      ].sort(),
    );
    expect(env.META_API_BASE).toBe("https://api.meta.ai/v1");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(200);
    expect(env.SOLANA_ISSUER_KEYPAIR).toBeUndefined();
    expect(env.NEXT_PUBLIC_SOLANA_CLUSTER).toBe("devnet");
  });

  it("parses keys, numbers, the issuer keypair and trims trailing slashes", () => {
    const { env, issues } = readEnv({
      META_API_KEY: "k",
      META_API_BASE: "https://proxy.example/v1/",
      SERPAPI_KEY: "s",
      SERPAPI_MONTHLY_BUDGET: "50",
      SOLANA_ISSUER_KEYPAIR: keypair,
      NEXT_PUBLIC_SOLANA_PROGRAM_ID: programId,
      DATABASE_URL: "postgres://u:p@host:5432/db",
      NEXT_PUBLIC_REALTIME_URL: "wss://rt.example/ws",
      GEMINI_API_KEY: "g",
    });
    expect(issues).toEqual([]);
    expect(env.META_API_BASE).toBe("https://proxy.example/v1");
    expect(env.SERPAPI_MONTHLY_BUDGET).toBe(50);
    expect(env.SOLANA_ISSUER_KEYPAIR).toBeInstanceOf(Uint8Array);
    expect(env.SOLANA_ISSUER_KEYPAIR?.length).toBe(64);
    expect(featuresOf(env)).toEqual({
      ai: true,
      image: true,
      voice: true,
      search: true,
      solana: true,
      db: true,
      realtime: true,
      gemini: true,
    });
  });

  it("lets Gemini alone carry text AI but not image or voice", () => {
    const f = featuresOf(readEnv({ GEMINI_API_KEY: "g" }).env);
    expect(f).toMatchObject({ ai: true, gemini: true, image: false, voice: false });
  });

  it("needs both the issuer and the program id for solana", () => {
    expect(featuresOf(readEnv({ SOLANA_ISSUER_KEYPAIR: keypair }).env).solana).toBe(false);
    expect(featuresOf(readEnv({ NEXT_PUBLIC_SOLANA_PROGRAM_ID: programId }).env).solana).toBe(false);
  });
});
