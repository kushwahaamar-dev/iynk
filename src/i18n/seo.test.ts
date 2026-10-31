import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "./seo";

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns SITE_URL when set", () => {
    vi.stubEnv("SITE_URL", "https://iynk.example");
    expect(siteUrl().href).toBe("https://iynk.example/");
  });

  it("falls back to the local server", () => {
    vi.stubEnv("SITE_URL", "");
    expect(siteUrl().href).toBe("http://localhost:3000/");
  });

  it("ignores the Vercel production domain", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "iynk.vercel.app");
    expect(siteUrl().href).toBe("http://localhost:3000/");
  });
});
