// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./sw-register";

function fakeNav(existing = 0) {
  const unregister = vi.fn(async () => true);
  const register = vi.fn(async () => ({}));
  const getRegistrations = vi.fn(async () => Array.from({ length: existing }, () => ({ unregister })));
  const nav = { serviceWorker: { register, getRegistrations } } as unknown as Navigator;
  return { nav, register, unregister };
}

const secure = { protocol: "https:", hostname: "iynk.example" };

describe("registerServiceWorker", () => {
  it("unregisters old workers in development and registers none", async () => {
    const { nav, register, unregister } = fakeNav(2);
    const result = await registerServiceWorker({ nav, buildId: "abc", isProd: false, location: { protocol: "http:", hostname: "localhost" } });
    expect(result).toEqual({ registered: false, reason: "development" });
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(register).not.toHaveBeenCalled();
  });

  it("refuses plain http on a host that is not local", async () => {
    const { nav, register } = fakeNav();
    const result = await registerServiceWorker({ nav, buildId: "abc", isProd: true, location: { protocol: "http:", hostname: "192.168.1.20" } });
    expect(result).toEqual({ registered: false, reason: "insecure" });
    expect(register).not.toHaveBeenCalled();
  });

  it("reports a browser with no service worker support", async () => {
    const result = await registerServiceWorker({ nav: {} as Navigator, buildId: "abc", isProd: true, location: secure });
    expect(result).toEqual({ registered: false, reason: "unsupported" });
    expect(await registerServiceWorker({ nav: undefined, buildId: "abc", isProd: true, location: secure })).toEqual({ registered: false, reason: "unsupported" });
  });

  it("registers the versioned worker URL in production, also on localhost over http", async () => {
    for (const location of [secure, { protocol: "http:", hostname: "localhost" }]) {
      const { nav, register } = fakeNav();
      expect(await registerServiceWorker({ nav, buildId: "a1b2c3", isProd: true, location })).toEqual({ registered: true });
      expect(register).toHaveBeenCalledWith("/sw.js?v=a1b2c3", { scope: "/" });
    }
  });
});

describe("next.config.ts build id", () => {
  const config = readFileSync("next.config.ts", "utf8");

  it("feeds generateBuildId and NEXT_PUBLIC_BUILD_ID from the one BUILD_ID constant", () => {
    expect(config).toMatch(/generateBuildId:\s*async\s*\(\)\s*=>\s*BUILD_ID/);
    expect(config).toMatch(/NEXT_PUBLIC_BUILD_ID:\s*BUILD_ID/);
  });

  it("computes the id once", () => {
    expect(config.match(/computeBuildId\(/g)).toHaveLength(2); // the definition and the one call
    expect(config).toMatch(/BUILD_ID = \(process\.env\.IYNK_BUILD_ID \?\?= computeBuildId\(\)\)/);
  });
});
