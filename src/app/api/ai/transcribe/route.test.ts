// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, completion, fakeFetch } from "@/lib/server/ai/__test__/upstream";
import { encodeWav } from "@/lib/server/ai/wav";

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

function post(audio: Uint8Array | null, lang?: string, type = "audio/wav", headers: Record<string, string> = {}) {
  const form = new FormData();
  if (audio) form.set("audio", new Blob([audio as BlobPart], { type }), "clip");
  if (lang) form.set("lang", lang);
  return new Request("http://localhost/api/ai/transcribe", { method: "POST", body: form, headers: { "x-iynk-server-token": TOKEN, "x-iynk-provider-key": KEY, "x-real-ip": `10.2.0.${++ip}`, ...headers } });
}

const speech = (seconds: number, sampleRate = 44100) =>
  encodeWav({ samples: Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, i) => Math.sin(i / 10) * 0.3), sampleRate });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/transcribe", () => {
  it("converts WAV to 16 kHz mono and sends it to Muse Voice Transcribe with a language hint", async () => {
    const { calls } = fakeFetch(Response.json({ sessionId: "s", transcript: "el LED está al revés", audioDurationMs: 1200, turns: [] }));
    const POST = await load();
    const res = await POST(post(speech(1.2), "es"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "el LED está al revés", lang: "es" });
    expect(calls[0].url).toBe("https://api.meta.ai/v1/asr/transcribe");
    const body = Buffer.from(calls[0].init.body as Uint8Array);
    expect(body.toString("latin1")).toContain('"languageBias":["Spanish"]');
    const wavAt = body.indexOf("RIFF");
    expect(body.readUInt32LE(wavAt + 24)).toBe(16000);
    expect(body.readUInt16LE(wavAt + 22)).toBe(1);
  });

  it("reports Chinese or Hindi from the transcript's script", async () => {
    fakeFetch(Response.json({ sessionId: "s", transcript: "把电阻换成220欧", audioDurationMs: 900, turns: [] }));
    const POST = await load();
    expect(await (await POST(post(speech(1), "en"))).json()).toEqual({ text: "把电阻换成220欧", lang: "zh" });
  });

  it("sends MP3 through Muse Spark's audio input", async () => {
    const { calls } = fakeFetch(completion("hello there"));
    const POST = await load();
    const mp3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]);
    const res = await POST(post(mp3, "en", "audio/mpeg"));
    expect(await res.json()).toEqual({ text: "hello there", lang: "en" });
    const user = (calls[0].body as { messages: Array<{ role: string; content: unknown }> }).messages[1];
    expect(user.content).toEqual([{ type: "input_audio", input_audio: { data: Buffer.from(mp3).toString("base64"), format: "mp3" } }]);
  });

  it("refuses webm/opus with a clear code", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    const res = await POST(post(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]), "en", "audio/webm"));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("unsupported_audio");
    expect(mock).not.toHaveBeenCalled();
  });

  it("skips the upstream call for a silent tap", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    expect(await (await POST(post(speech(0.1), "fr"))).json()).toEqual({ text: "", lang: "fr" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("validates the form", async () => {
    const POST = await load();
    expect((await POST(post(null))).status).toBe(400);
    expect((await POST(post(speech(1), "pt"))).status).toBe(400);
    expect((await POST(post(new TextEncoder().encode("RIFF....WAVEbroken")))).status).toBe(400);
    expect((await POST(post(speech(121, 8000)))).status).toBe(400);
  });

  it("answers 401 with an empty message when the token is missing or wrong", async () => {
    const POST = await load();
    const missing = await POST(post(speech(1), "en", "audio/wav", { "x-iynk-server-token": "" }));
    const wrong = await POST(post(speech(1), "en", "audio/wav", { "x-iynk-server-token": "w".repeat(40) }));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toEqual({ code: "unauthorized", message: "" });
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toEqual({ code: "unauthorized", message: "" });
  });

  it("answers 501 feature_disabled when the switch is off", async () => {
    const POST = await load({ IYNK_AI_ENABLE: "0" });
    const res = await POST(post(speech(1), "en"));
    expect(res.status).toBe(501);
    expect((await res.json()).error.code).toBe("feature_disabled");
  });

  it("answers 501 feature_disabled when the operator chose Gemini, which cannot transcribe", async () => {
    const { mock } = fakeFetch();
    const POST = await load({ IYNK_AI_PROVIDER: "gemini" });
    const res = await POST(post(speech(1), "en"));
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("feature_disabled");
    expect(body.error.message).toMatch(/turned off/);
    expect(mock).not.toHaveBeenCalled();
  });

  it("answers 422 key_required without the caller's key and 400 bad_key for a malformed one", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    const missing = await POST(post(speech(1), "en", "audio/wav", { "x-iynk-provider-key": "" }));
    expect(missing.status).toBe(422);
    expect((await missing.json()).error.code).toBe("key_required");
    const bad = await POST(post(speech(1), "en", "audio/wav", { "x-iynk-provider-key": "has a space" }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("bad_key");
    expect(mock).not.toHaveBeenCalled();
  });

  it("sends the caller's key upstream and keeps it out of the response and the console", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((name) => vi.spyOn(console, name).mockImplementation(() => {}));
    const { calls } = fakeFetch(
      Response.json({ sessionId: "s", transcript: "hola", audioDurationMs: 900, turns: [] }),
      apiError(400, KEY),
    );
    const POST = await load();
    const ok = await POST(post(speech(1), "es"));
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const failed = await POST(post(speech(1), "es"));
    expect(failed.status).toBe(502);
    const seen = JSON.stringify([await ok.text(), await failed.text(), spies.flatMap((spy) => spy.mock.calls)]);
    expect(seen).not.toContain(KEY);
  });
});
