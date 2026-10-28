import { afterEach, describe, expect, it, vi } from "vitest";
import { enrol, signIn } from "./auth";
import { CODE, fakeServer } from "./fake-server.testing";
import { memoryKeyStore } from "./keys";
import { ClientError, EnrolmentClosed, InsecureContext, NeedsEnrolment, ServerUnreachable, SigningInputMismatch } from "./types";

const base = "https://srv.test";
const who = { code: CODE, displayName: "Mira", locale: "en" };

afterEach(() => vi.unstubAllGlobals());

describe("enrol", () => {
  it("makes a key, signs the challenge and registers the 122-character public key (CM-01)", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    const { identity, session } = await enrol({ base, fetch: server.fetch }, keys, who);
    const key = await keys.get(base);
    expect(key?.privateKey.extractable).toBe(false);
    const register = server.seen.find((r) => r.path === "/v1/identities");
    expect((register?.body as { publicKey: string }).publicKey).toHaveLength(122);
    expect(register?.body).not.toHaveProperty("password");
    expect(identity.displayName).toBe("Mira");
    expect(session.token).toMatch(/^iynk_at_/);
    expect(session.identityId).toBe(identity.id);
  });

  it("accepts a typed code with spaces, a lower-case code and the whole link", async () => {
    for (const code of ["7qkx 2m9r 4tbv", "7QKX-2M9R-4TBV", `https://srv.test/together#enrol=${CODE}`]) {
      const server = fakeServer();
      await expect(enrol({ base, fetch: server.fetch }, memoryKeyStore(), { ...who, code })).resolves.toBeTruthy();
    }
  });

  it("never writes the token to the key store", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    const { session } = await enrol({ base, fetch: server.fetch }, keys, who);
    expect(JSON.stringify(await keys.get(base), (_, v: unknown) => (v instanceof Uint8Array ? [...v] : v))).not.toContain(session.token);
  });

  it("makes no key when enrolment is closed", async () => {
    const server = fakeServer({ enrollment: "closed" });
    const keys = memoryKeyStore();
    const put = vi.spyOn(keys, "put");
    await expect(enrol({ base, fetch: server.fetch }, keys, who)).rejects.toBeInstanceOf(EnrolmentClosed);
    expect(put).not.toHaveBeenCalled();
    expect(server.seen.map((r) => r.path)).toEqual(["/v1/server"]);
  });

  it("makes no key in an insecure context and does not touch the network (CM-02)", async () => {
    vi.stubGlobal("isSecureContext", false);
    const server = fakeServer();
    const keys = memoryKeyStore();
    const put = vi.spyOn(keys, "put");
    await expect(enrol({ base, fetch: server.fetch }, keys, who)).rejects.toBeInstanceOf(InsecureContext);
    expect(put).not.toHaveBeenCalled();
    expect(server.seen).toHaveLength(0);
  });

  it("refuses a signing input that differs from the one it rebuilds, and leaves no key", async () => {
    const server = fakeServer({ badInput: true });
    const keys = memoryKeyStore();
    await expect(enrol({ base, fetch: server.fetch }, keys, who)).rejects.toBeInstanceOf(SigningInputMismatch);
    expect(await keys.get(base)).toBeNull();
  });

  it("deletes the new key when the code is wrong", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    const error = await enrol({ base, fetch: server.fetch }, keys, { ...who, code: "AAAAAAAAAAAA" }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "unauthorized", status: 401, requestId: "req_test" });
    expect(await keys.get(base)).toBeNull();
  });

  it("keeps an earlier key when a second enrolment fails", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    await enrol({ base, fetch: server.fetch }, keys, who);
    const first = await keys.get(base);
    await expect(enrol({ base, fetch: server.fetch }, keys, { ...who, code: "AAAAAAAAAAAA" })).rejects.toBeInstanceOf(ClientError);
    expect(await keys.get(base)).toBe(first);
  });

  it("rejects a malformed code and an empty name before any request", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    await expect(enrol({ base, fetch: server.fetch }, keys, { ...who, code: "nope" })).rejects.toMatchObject({ code: "invalid_enrolment_code" });
    await expect(enrol({ base, fetch: server.fetch }, keys, { ...who, displayName: "  " })).rejects.toMatchObject({ code: "invalid_display_name" });
    expect(server.seen).toHaveLength(0);
  });

  it("cuts a long name to 24 characters", async () => {
    const server = fakeServer();
    await enrol({ base, fetch: server.fetch }, memoryKeyStore(), { ...who, displayName: "x".repeat(40) });
    expect((server.seen.find((r) => r.path === "/v1/identities")?.body as { displayName: string }).displayName).toHaveLength(24);
  });

  it("reports an unreachable server", async () => {
    const down: typeof fetch = () => Promise.reject(new TypeError("fetch failed"));
    await expect(enrol({ base, fetch: down }, memoryKeyStore(), who)).rejects.toBeInstanceOf(ServerUnreachable);
  });
});

describe("signIn", () => {
  it("signs a login challenge with the stored key", async () => {
    const server = fakeServer();
    const keys = memoryKeyStore();
    const api = { base, fetch: server.fetch };
    const { session } = await enrol(api, keys, who);
    const again = await signIn(api, keys, session.identityId);
    expect(again.token).not.toBe(session.token);
    expect(again.identityId).toBe(session.identityId);
  });

  it("needs enrolment when the key is gone", async () => {
    const server = fakeServer();
    await expect(signIn({ base, fetch: server.fetch }, memoryKeyStore(), "usr_x")).rejects.toBeInstanceOf(NeedsEnrolment);
    expect(server.seen).toHaveLength(0);
  });
});
