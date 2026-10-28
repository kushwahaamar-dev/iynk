// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "./env";

const TOKEN = "t".repeat(40);

async function load(token?: string) {
  vi.resetModules();
  if (token !== undefined) vi.stubEnv("IYNK_SERVER_TOKEN", token);
  return import("./access");
}

const request = (token?: string) =>
  new Request("http://localhost/api/x", { headers: token === undefined ? {} : { "x-iynk-server-token": token } });

afterEach(() => vi.unstubAllEnvs());

describe("requireServerToken", () => {
  it("passes the right token", async () => {
    const { requireServerToken } = await load(TOKEN);
    expect(requireServerToken(request(TOKEN))).toBeNull();
  });

  it("answers a missing, wrong and empty token with the same bytes", async () => {
    const { requireServerToken } = await load(TOKEN);
    const bodies = await Promise.all(
      [undefined, "w".repeat(40), ""].map(async (given) => {
        const res = requireServerToken(request(given));
        expect(res?.status).toBe(401);
        expect(res?.headers.get("cache-control")).toBe("no-store");
        return res?.text();
      }),
    );
    expect(bodies[0]).toBe('{"error":{"code":"unauthorized","message":""}}');
    expect(new Set(bodies).size).toBe(1);
  });

  it("stays closed when no token is configured, even for an empty header", async () => {
    const { requireServerToken } = await load();
    expect(requireServerToken(request(""))?.status).toBe(401);
    expect(requireServerToken(request())?.status).toBe(401);
  });

  it("stays closed when the configured token is under 32 characters", async () => {
    const { env, issues } = readEnv({ IYNK_SERVER_TOKEN: "s".repeat(31) });
    expect(issues).toEqual(["IYNK_SERVER_TOKEN"]);
    const { serverTokenOk } = await load();
    expect(serverTokenOk(request("s".repeat(31)), env.IYNK_SERVER_TOKEN)).toBe(false);
  });
});
