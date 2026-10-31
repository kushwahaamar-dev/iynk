import { describe, expect, it } from "vitest";
import { buildCsp } from "../lib/csp.ts";
import { PRESETS, PRESET_HOSTS, PRESET_ORIGINS } from "./ai-presets.ts";

const cloud = PRESETS.filter((preset) => !preset.local);

describe("provider presets", () => {
  it("has unique ids", () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
  });

  it("serves every cloud preset over a bare https origin base", () => {
    for (const preset of cloud) {
      const url = new URL(preset.baseUrl);
      expect(url.protocol, preset.id).toBe("https:");
      expect(url.search, preset.id).toBe("");
      expect(url.hash, preset.id).toBe("");
      expect(url.username + url.password, preset.id).toBe("");
    }
  });

  it("lists each cloud host once", () => {
    const hosts = cloud.map((preset) => new URL(preset.baseUrl).host);
    expect(new Set(hosts).size).toBe(hosts.length);
  });

  it("derives origins and hosts from the cloud presets only", () => {
    expect(PRESET_ORIGINS).toEqual(cloud.map((preset) => new URL(preset.baseUrl).origin));
    expect(PRESET_HOSTS).toEqual(cloud.map((preset) => new URL(preset.baseUrl).host));
    expect(PRESET_ORIGINS.join(" ")).not.toMatch(/127\.0\.0\.1/);
  });

  it("puts every preset origin in connect-src without a wildcard", () => {
    const csp = buildCsp({ dev: false, connectOrigins: PRESET_ORIGINS });
    const connect = csp.split("; ").find((part) => part.startsWith("connect-src"))!;
    for (const origin of PRESET_ORIGINS) expect(connect.split(" ")).toContain(origin);
    expect(connect).not.toContain("*");
  });
});
