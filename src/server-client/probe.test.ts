import { describe, expect, it, vi } from "vitest";
import { fetchConfig, parseConfig } from "./probe";

describe("parseConfig", () => {
  it("reads the server and the modules", () => {
    expect(parseConfig({ server: "https://srv.example", protocol: 1, modules: { ai: true, search: false, voice: true }, extra: 1 })).toEqual({
      server: "https://srv.example",
      protocol: 1,
      modules: { ai: true, search: false, voice: true },
    });
  });

  it("accepts a document without modules, and counts a missing voice as off", () => {
    expect(parseConfig({ server: null, protocol: 1 })).toEqual({ server: null, protocol: 1 });
    expect(parseConfig({ server: null, protocol: 1, modules: { ai: true, search: true } })?.modules).toEqual({
      ai: true,
      search: true,
      voice: false,
    });
  });

  it("rejects what is not a config", () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig("x")).toBeNull();
    expect(parseConfig({ server: null, protocol: 2 })).toBeNull();
    expect(parseConfig({ server: 5, protocol: 1 })).toBeNull();
    expect(parseConfig({ protocol: 1 })).toBeNull();
  });
});

describe("fetchConfig", () => {
  it("returns the parsed document", async () => {
    const fetchFn = vi.fn(async () => Response.json({ server: null, protocol: 1 })) as unknown as typeof fetch;
    expect(await fetchConfig(fetchFn)).toEqual({ ok: true, config: { server: null, protocol: 1 } });
  });

  it("treats a 404 as no config", async () => {
    const fetchFn = vi.fn(async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    expect(await fetchConfig(fetchFn)).toEqual({ ok: true, config: null });
  });

  it("fails on another status or a network error", async () => {
    const server = vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    expect(await fetchConfig(server)).toEqual({ ok: false });
    const offline = vi.fn(async () => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch;
    expect(await fetchConfig(offline)).toEqual({ ok: false });
  });
});
