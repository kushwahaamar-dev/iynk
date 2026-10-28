import { describe, expect, it, vi } from "vitest";
import { fetchConfig, parseConfig, probeServer } from "./probe";

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

describe("probeServer", () => {
  const info = { audience: "https://srv.example", software: { name: "iynk-server" }, apiVersions: [1], apiVersion: "1", enrollment: "code" };
  const scripted = (res: () => Response | Promise<Response>) => vi.fn(async () => res()) as unknown as typeof fetch;

  it("is ready when the server answers", async () => {
    const result = await probeServer("https://srv.example/", { fetch: scripted(() => Response.json(info)), secure: true });
    expect(result).toMatchObject({ state: "ready", upgradeRequired: false, info: { enrollment: "code" } });
  });

  it("is unreachable on a network error and on a refusal, without throwing", async () => {
    const offline = scripted(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await probeServer("https://srv.example", { fetch: offline, secure: true })).toEqual({ state: "unreachable", info: null, upgradeRequired: false });
    const refused = scripted(() => Response.json({ error: { code: "forbidden", message: "no", requestId: "r" } }, { status: 403 }));
    expect(await probeServer("https://srv.example", { fetch: refused, secure: true })).toEqual({ state: "unreachable", info: null, upgradeRequired: false });
  });

  it("flags a server that wants a newer app", async () => {
    const old = scripted(() => Response.json({ error: { code: "upgrade_required", message: "x", requestId: "r" } }, { status: 426 }));
    expect(await probeServer("https://srv.example", { fetch: old, secure: true })).toEqual({ state: "unreachable", info: null, upgradeRequired: true });
  });

  it("is insecure, without a request, for http away from localhost on a page that is not secure", async () => {
    const fetchFn = scripted(() => Response.json(info));
    expect((await probeServer("http://srv.example", { fetch: fetchFn, secure: false })).state).toBe("insecure");
    expect(fetchFn).not.toHaveBeenCalled();
    expect((await probeServer("http://localhost:9", { fetch: fetchFn, secure: false })).state).toBe("ready");
    expect((await probeServer("http://srv.example", { fetch: fetchFn, secure: true })).state).toBe("ready");
  });

  it("calls a non-URL unreachable", async () => {
    expect((await probeServer("srv", { secure: true })).state).toBe("unreachable");
  });
});
