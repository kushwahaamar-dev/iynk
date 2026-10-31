import { describe, expect, it } from "vitest";
import { buildCsp, buildFigureCsp, parseOrigins } from "./csp";

const PAGE_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; " +
  "connect-src 'self'; img-src 'self' data: blob:; font-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; " +
  "base-uri 'none'; form-action 'self'";

describe("buildCsp", () => {
  it("is the D-022 policy for a production build", () => {
    expect(buildCsp({ dev: false, connectOrigins: [] })).toBe(PAGE_POLICY);
  });

  it("allows unsafe-eval only in dev", () => {
    expect(buildCsp({ dev: false, connectOrigins: [] })).not.toContain("'unsafe-eval'");
    expect(buildCsp({ dev: true, connectOrigins: [] })).toContain("'wasm-unsafe-eval' 'unsafe-eval';");
  });

  it("adds the extra origins to connect-src only", () => {
    const policy = buildCsp({ dev: false, connectOrigins: ["https://a.example", "wss://b.example"] });
    expect(policy).toContain("connect-src 'self' https://a.example wss://b.example;");
    expect(policy.replace(/connect-src [^;]*/, "")).not.toContain("a.example");
  });
});

describe("buildFigureCsp", () => {
  it("lets figures run their own inline code and reach nothing else", () => {
    const policy = buildFigureCsp();
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("script-src 'unsafe-inline'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
  });
});

describe("parseOrigins", () => {
  it("keeps bare http, https, ws and wss origins", () => {
    expect(parseOrigins("https://a.example, http://localhost:8787,wss://rt.example")).toEqual([
      "https://a.example",
      "http://localhost:8787",
      "wss://rt.example",
    ]);
  });

  it("drops paths, other schemes, junk and empty entries", () => {
    expect(parseOrigins("https://a.example/path,ftp://b.example,nonsense,,https://c.example?x=1,'self'")).toEqual([]);
    expect(parseOrigins("")).toEqual([]);
  });
});
