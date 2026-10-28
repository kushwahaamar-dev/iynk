import { describe, expect, it, vi } from "vitest";
import type { Session } from "./auth";
import { createClient } from "./client";
import { CODE, fakeServer } from "./fake-server.testing";
import { memoryKeyStore } from "./keys";
import { ClientError, NeedsEnrolment } from "./types";

const base = "https://srv.test";
const who = { code: CODE, displayName: "Mira", locale: "en" };

function setup(options?: Parameters<typeof fakeServer>[0]) {
  const server = fakeServer(options);
  const keys = memoryKeyStore();
  const onSession = vi.fn<(s: Session | null) => void>();
  const client = createClient({ base, keys, fetch: server.fetch, onSession });
  return { server, keys, onSession, client };
}

describe("createClient", () => {
  it("sends the bearer token only once signed in", async () => {
    const { server, client } = setup();
    await client.probe();
    await client.enrol(who);
    await client.me();
    const auth = (path: string) => server.seen.filter((r) => r.path === path).map((r) => r.authorization);
    expect(auth("/v1/server")).toEqual([null, null]);
    expect(auth("/v1/identities")).toEqual([null]);
    expect(auth("/v1/identities/me")).toEqual([expect.stringMatching(/^Bearer iynk_at_/)]);
  });

  it("signs in again once on a 401 and retries", async () => {
    const { server, client, onSession } = setup();
    await client.enrol(who);
    server.revokeAllTokens();
    await expect(client.me()).resolves.toMatchObject({ displayName: "Mira" });
    const mine = server.seen.filter((r) => r.path === "/v1/identities/me");
    expect(mine).toHaveLength(2);
    expect(mine[0].authorization).not.toBe(mine[1].authorization);
    expect(onSession).toHaveBeenLastCalledWith(expect.objectContaining({ identityId: expect.stringMatching(/^usr_/) }));
  });

  it("signs in from the stored key after a reload", async () => {
    const { server, keys } = setup();
    await createClient({ base, keys, fetch: server.fetch }).enrol(who);
    const reloaded = createClient({ base, keys, fetch: server.fetch });
    await expect(reloaded.listBuddies()).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("shares one sign-in between calls that fail together", async () => {
    const { server, client } = setup();
    await client.enrol(who);
    server.revokeAllTokens();
    await Promise.all([client.me(), client.listBuddies()]);
    expect(server.seen.filter((r) => r.path === "/v1/auth/challenges" && (r.body as { purpose: string }).purpose === "login")).toHaveLength(1);
  });

  it("throws NeedsEnrolment and clears the session when the second attempt is also refused", async () => {
    const { server, client, onSession } = setup();
    await client.enrol(who);
    server.forgetIdentities();
    server.revokeAllTokens();
    await expect(client.me()).rejects.toBeInstanceOf(NeedsEnrolment);
    expect(onSession).toHaveBeenLastCalledWith(null);
  });

  it("throws NeedsEnrolment when the key is gone", async () => {
    const { keys, client } = setup();
    await client.enrol(who);
    await keys.delete(base);
    await client.signOut();
    await expect(client.me()).rejects.toBeInstanceOf(NeedsEnrolment);
  });

  it("maps the error envelope", async () => {
    const { client } = setup();
    await client.enrol(who);
    const error = await client.getBuddy("usr_nobody").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toMatchObject({ code: "not_found", status: 404, requestId: "req_test" });
  });

  it("peeks without a token and unwraps a redeemed buddy", async () => {
    const { server, client } = setup();
    await expect(client.peekPairing({ code: "ABCD-EFGH23" })).resolves.toMatchObject({ from: { displayName: "Mira" } });
    expect(server.seen.at(-1)?.authorization).toBeNull();
    await client.enrol(who);
    await expect(client.redeemPairing({ token: "MDEyMzQ1Njc4OWFiY2RlZg" })).resolves.toMatchObject({ displayName: "Kai" });
    expect(server.seen.at(-1)?.body).toEqual({ pairing: { token: "MDEyMzQ1Njc4OWFiY2RlZg" } });
  });

  it("forgets the token on sign out and revokes it on the server", async () => {
    const { server, client, onSession } = setup();
    await client.enrol(who);
    await client.signOut();
    expect(server.tokens.size).toBe(0);
    expect(onSession).toHaveBeenLastCalledWith(null);
  });

  it("builds page queries", async () => {
    const { server, client } = setup();
    await client.enrol(who);
    await client.listBuddies({ limit: 10, cursor: "c1" });
    expect(server.seen.at(-1)?.path).toBe("/v1/buddies?limit=10&cursor=c1");
  });
});
