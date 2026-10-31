// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

afterEach(() => vi.unstubAllEnvs());

describe("GET /config.json", () => {
  it("reports no server on a bare deployment, with no modules key", async () => {
    vi.stubEnv("IYNK_SERVER_URL", "");
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ server: null, protocol: 1 });
  });

  it("reports the server url", async () => {
    vi.stubEnv("IYNK_SERVER_URL", "https://srv.example");
    const { GET } = await import("./route");
    expect(await (await GET()).json()).toEqual({ server: "https://srv.example", protocol: 1 });
  });

  it("reports no server when the url is not one", async () => {
    vi.stubEnv("IYNK_SERVER_URL", "not a url");
    const { GET } = await import("./route");
    expect((await (await GET()).json()).server).toBeNull();
  });
});
