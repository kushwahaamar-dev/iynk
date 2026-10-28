// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { completion, fakeFetch } from "@/lib/server/ai/__test__/upstream";

let ip = 0;

async function load(vars: Record<string, string> = { META_API_KEY: "k" }) {
  vi.resetModules();
  vi.stubEnv("IYNK_AI_ENABLE", "1");
  vi.stubEnv("IYNK_SEARCH_ENABLE", "1");
  vi.stubEnv("IYNK_TRUST_PROXY", "1");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

const post = (body: unknown) =>
  new Request("http://localhost/api/ai/translate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.1.0.${++ip}` },
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

  it("is not configured without a key", async () => {
    const POST = await load({});
    expect((await POST(post({ texts: ["hi"], to: "es" }))).status).toBe(503);
  });
});
