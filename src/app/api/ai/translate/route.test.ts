// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, completion, fakeFetch } from "@/lib/server/ai/__test__/upstream";

const TOKEN = "t".repeat(40);
const KEY = "iynk-canary-key-7c1d";
let ip = 0;

async function load(vars: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("IYNK_AI_ENABLE", "1");
  vi.stubEnv("IYNK_SEARCH_ENABLE", "1");
  vi.stubEnv("IYNK_TRUST_PROXY", "1");
  vi.stubEnv("IYNK_SERVER_TOKEN", TOKEN);
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/ai/translate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-iynk-server-token": TOKEN, "x-iynk-provider-key": KEY, "x-real-ip": `10.1.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });

/** The texts the model was asked to translate, as the provider sent them. */
function sentTexts(body: unknown): string[] {
  const user = (body as { messages: Array<{ role: string; content: string }> }).messages[1].content;
  return JSON.parse(user.slice(user.indexOf("<<<\n") + 4, user.lastIndexOf("\n>>>"))).texts;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/translate", () => {
  it("protects code, pins and units, restores them, and caches by text", async () => {
    const text = "Connect `pinMode(13, OUTPUT)` to D13 with a 220 Ω resistor";
    const { calls, mock } = fakeFetch(() => {
      const [masked] = sentTexts(calls[0].body);
      expect(masked).toBe("Connect ⟦0⟧ to ⟦2⟧ with a ⟦1⟧ resistor");
      return completion(JSON.stringify({ from: "en", texts: ["Conecta ⟦0⟧ a ⟦2⟧ con una resistencia de ⟦1⟧"] }));
    });
    const POST = await load();
    const first = await POST(post({ texts: [text], to: "es" }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ texts: ["Conecta `pinMode(13, OUTPUT)` a D13 con una resistencia de 220 Ω"], from: "en" });

    const second = await POST(post({ texts: [text, ""], to: "es" }));
    expect(await second.json()).toEqual({ texts: ["Conecta `pinMode(13, OUTPUT)` a D13 con una resistencia de 220 Ω", ""], from: "en" });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("returns the texts untouched when from equals to", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    const res = await POST(post({ texts: ["hola"], to: "es", from: "es" }));
    expect(await res.json()).toEqual({ texts: ["hola"], from: "es" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("falls back to the original when the model drops a protected token", async () => {
    fakeFetch(completion(JSON.stringify({ from: "en", texts: ["Pon el LED en la pata"] })));
    const POST = await load();
    const res = await POST(post({ texts: ["Put the LED on D13"], to: "es", from: "en" }));
    expect(await res.json()).toEqual({ texts: ["Put the LED on D13"], from: "en" });
  });

  it("answers 502 when the model returns the wrong number of texts", async () => {
    fakeFetch(completion(JSON.stringify({ from: "en", texts: ["uno", "dos"] })));
    const POST = await load();
    const res = await POST(post({ texts: ["one"], to: "es" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("upstream_failed");
  });

  it("validates the batch", async () => {
    const POST = await load();
    expect((await POST(post({ texts: [], to: "es" }))).status).toBe(400);
    expect((await POST(post({ texts: Array(21).fill("a"), to: "es" }))).status).toBe(400);
    expect((await POST(post({ texts: ["é".repeat(1500)], to: "es" }))).status).toBe(400);
    expect((await POST(post({ texts: ["hi"], to: "pt" }))).status).toBe(400);
  });

  it("answers 401 with an empty message when the token is missing or wrong", async () => {
    const POST = await load();
    const missing = await POST(post({ texts: ["hi"], to: "es" }, { "x-iynk-server-token": "" }));
    const wrong = await POST(post({ texts: ["hi"], to: "es" }, { "x-iynk-server-token": "w".repeat(40) }));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toEqual({ code: "unauthorized", message: "" });
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toEqual({ code: "unauthorized", message: "" });
  });

  it("answers 501 feature_disabled when the switch is off", async () => {
    const POST = await load({ IYNK_AI_ENABLE: "0" });
    const res = await POST(post({ texts: ["hi"], to: "es" }));
    expect(res.status).toBe(501);
    expect((await res.json()).error.code).toBe("feature_disabled");
  });

  it("answers 422 key_required without the caller's key and 400 bad_key for a malformed one", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    const missing = await POST(post({ texts: ["hi"], to: "es" }, { "x-iynk-provider-key": "" }));
    expect(missing.status).toBe(422);
    expect((await missing.json()).error.code).toBe("key_required");
    const bad = await POST(post({ texts: ["hi"], to: "es" }, { "x-iynk-provider-key": "has a space" }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("bad_key");
    expect(mock).not.toHaveBeenCalled();
  });

  it("sends the caller's key upstream and keeps it out of the response and the console", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((name) => vi.spyOn(console, name).mockImplementation(() => {}));
    const { calls } = fakeFetch(
      completion(JSON.stringify({ from: "en", texts: ["hola"] })),
      apiError(400, KEY),
    );
    const POST = await load();
    const ok = await POST(post({ texts: ["hello"], to: "es" }));
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const failed = await POST(post({ texts: ["goodbye"], to: "es" }));
    expect(failed.status).toBe(502);
    const seen = JSON.stringify([await ok.text(), await failed.text(), spies.flatMap((spy) => spy.mock.calls)]);
    expect(seen).not.toContain(KEY);
  });
});
