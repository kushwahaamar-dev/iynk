import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  profiles: 0,
  server: null as string | null,
  searchProxy: false,
}));

vi.mock("@/local/db", () => ({ openDb: async () => ({}) }));
vi.mock("@/local/ai-profiles", () => ({
  idbProfileStore: () => ({ list: async () => Array.from({ length: world.profiles }) }),
}));
vi.mock("@/server-client/profile", async (original) => ({
  ...(await original<typeof import("@/server-client/profile")>()),
  openServerDb: async () => ({}),
  idbProfileStore: () => ({ read: async () => ({ url: world.server }) }),
}));
vi.mock("@/server-client/probe", async (original) => ({
  ...(await original<typeof import("@/server-client/probe")>()),
  probeServer: async () => ({ state: "ready", info: { features: { searchProxy: world.searchProxy } }, upgradeRequired: false }),
}));

async function load() {
  vi.resetModules();
  return import("./features");
}

beforeEach(() => {
  world.profiles = 0;
  world.server = null;
  world.searchProxy = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useFeatures", () => {
  it("starts loading with every feature off, then shares one fetched answer", async () => {
    world.profiles = 1;
    const fetchMock = vi.fn(async () => Response.json({ server: null, protocol: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { useFeatures, NO_FEATURES } = await load();

    const first = renderHook(() => useFeatures());
    expect(first.result.current).toEqual({ status: "loading", features: NO_FEATURES });
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(first.result.current.features).toEqual({ ...NO_FEATURES, ai: true });

    const second = renderHook(() => useFeatures());
    expect(second.result.current.status).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an unreachable server as an error, and retries when back online", async () => {
    world.profiles = 2;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json({ server: null, protocol: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { useFeatures } = await load();

    const { result } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.features.ai).toBe(true);
  });

  it("treats a server error status as an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const { useFeatures, reloadFeatures } = await load();
    const { result } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => reloadFeatures());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});

describe("getFeatures", () => {
  it("shares one request with useFeatures and turns search on when the server offers the proxy", async () => {
    world.server = "https://srv.example";
    world.searchProxy = true;
    const fetchMock = vi.fn(async () => Response.json({ server: null, protocol: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getFeatures, useFeatures, NO_FEATURES } = await load();
    const both = Promise.all([getFeatures(), getFeatures()]);
    const { result } = renderHook(() => useFeatures());
    expect(await both).toEqual([
      { ...NO_FEATURES, search: true },
      { ...NO_FEATURES, search: true },
    ]);
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(await getFeatures()).toEqual({ ...NO_FEATURES, search: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual(["/config.json", expect.anything()]);
  });

  it("leaves search off when the server has no proxy or there is no server", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ server: "https://srv.example", protocol: 1 })));
    const { getFeatures, NO_FEATURES } = await load();
    expect(await getFeatures()).toEqual(NO_FEATURES);
  });

  it("treats a missing config file as ready with every feature off", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const { useFeatures, NO_FEATURES } = await load();
    const { result } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.features).toEqual(NO_FEATURES);
  });

  it("resolves to every feature off when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    const { getFeatures, NO_FEATURES } = await load();
    expect(await getFeatures()).toEqual(NO_FEATURES);
  });
});
