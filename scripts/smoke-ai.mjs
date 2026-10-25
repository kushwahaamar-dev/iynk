#!/usr/bin/env node
// Smoke test for the Meta Model API calls iynk makes (docs/hacktx/AI.md).
// Sends the same request shapes as src/lib/server/ai/provider.ts straight to
// the API. Reads keys from the environment or .env.local and never prints them.
// Usage: node scripts/smoke-ai.mjs [--no-image]

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    process.env[match[1]] = value;
  }
}

loadEnvFile(join(root, ".env.local"));

const key = process.env.META_API_KEY?.trim();
if (!key) {
  console.log("SKIP smoke-ai: META_API_KEY is not set (environment or .env.local). Nothing was called.");
  process.exit(0);
}

const base = (process.env.META_API_BASE?.trim() || "https://api.meta.ai/v1").replace(/\/+$/, "");
const model = process.env.META_MODEL?.trim() || "muse-spark-1.3";
const imageModel = process.env.META_IMAGE_MODEL?.trim() || "muse-image-1.0";
const transcribeModel = process.env.META_TRANSCRIBE_MODEL?.trim() || "muse-voice-transcribe-1.0";
const withImage = !process.argv.includes("--no-image");

const results = [];

/** A short, secret-free description of a failed response. */
async function describe(res) {
  try {
    const body = await res.json();
    const e = body.error ?? {};
    return ["HTTP", res.status, e.type, e.code, e.param && `param=${e.param}`].filter(Boolean).join(" ");
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function check(name, run) {
  const started = Date.now();
  try {
    const note = await run();
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`PASS ${name} (${seconds}s)${note ? `: ${note}` : ""}`);
    results.push(true);
  } catch (error) {
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    results.push(false);
  }
}

async function post(path, body, { accept = "application/json", timeoutMs = 60_000, raw = false } = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      accept,
      ...(raw ? { "content-type": body.contentType } : { "content-type": "application/json" }),
    },
    body: raw ? body.bytes : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(await describe(res));
  return res;
}

const chat = (body) => post("/chat/completions", { model, max_completion_tokens: 2000, reasoning_effort: "low", ...body });

async function* sseData(res) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let end;
    while ((end = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, "");
      const data = block
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data) yield data;
    }
  }
}

/** One second of a 440 Hz tone as 16 kHz mono 16-bit WAV: what /api/ai/transcribe sends upstream. */
function toneWav() {
  const rate = 16000;
  const samples = rate;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0, "latin1");
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write("WAVEfmt ", 8, "latin1");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36, "latin1");
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), 44 + i * 2);
  return bytes;
}

function multipart(parts) {
  const boundary = `----iynksmoke${Date.now().toString(16)}`;
  const chunks = [];
  for (const part of parts) {
    const file = part.filename ? `; filename="${part.filename}"` : "";
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${file}\r\nContent-Type: ${part.type}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data));
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { bytes: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

console.log(`smoke-ai: ${base} with ${model}, ${imageModel}, ${transcribeModel}`);

await check("models list has our ids", async () => {
  const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(await describe(res));
  const ids = new Set(((await res.json()).data ?? []).map((m) => m.id));
  const missing = [model, imageModel, transcribeModel].filter((id) => !ids.has(id));
  if (missing.length) throw new Error(`not listed: ${missing.join(", ")}`);
});

await check("chat (plain)", async () => {
  const body = await (await chat({ messages: [{ role: "user", content: "Reply with the single word: pong" }] })).json();
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty reply");
  return `${body.usage?.prompt_tokens ?? "?"} in / ${body.usage?.completion_tokens ?? "?"} out tokens`;
});

await check("chat (streaming, with usage)", async () => {
  const res = await chat({
    messages: [{ role: "user", content: "Count from one to five in words." }],
    stream: true,
    stream_options: { include_usage: true },
  });
  let deltas = 0;
  let usage = null;
  let done = false;
  for await (const data of sseData(res)) {
    if (data === "[DONE]") {
      done = true;
      break;
    }
    const chunk = JSON.parse(data);
    if (chunk.error) throw new Error(`stream error ${chunk.error.type ?? ""}`);
    if (chunk.choices?.[0]?.delta?.content) deltas++;
    if (chunk.usage) usage = chunk.usage;
  }
  if (!deltas) throw new Error("no text deltas");
  if (!done) throw new Error("no [DONE]");
  return `${deltas} deltas${usage ? ", usage chunk received" : ", no usage chunk"}`;
});

await check("tool call round trip", async () => {
  const tools = [
    {
      type: "function",
      function: {
        name: "read_pin_voltage",
        description: "Reads the voltage on one pin of the simulated board.",
        parameters: { type: "object", properties: { pin: { type: "string" } }, required: ["pin"] },
      },
    },
  ];
  const messages = [{ role: "user", content: "What is the voltage on pin D13 right now? Use the tool, then answer in one sentence." }];
  const first = (await (await chat({ messages, tools })).json()).choices?.[0];
  const call = first?.message?.tool_calls?.[0];
  if (!call) throw new Error(`no tool call (finish_reason ${first?.finish_reason})`);
  JSON.parse(call.function.arguments);
  messages.push(first.message, { role: "tool", tool_call_id: call.id, content: JSON.stringify({ pin: "D13", volts: 4.98 }) });
  const second = (await (await chat({ messages, tools })).json()).choices?.[0]?.message?.content ?? "";
  if (!/4[.,]98|5/.test(second)) throw new Error("the answer did not use the tool result");
  return `called ${call.function.name}`;
});

await check("structured output (translate)", async () => {
  const schema = {
    type: "object",
    properties: { from: { type: "string", enum: ["en", "es", "fr", "de", "zh", "hi", "und"] }, texts: { type: "array", items: { type: "string" } } },
    required: ["from", "texts"],
    additionalProperties: false,
  };
  const body = await (
    await chat({
      messages: [
        { role: "system", content: "Translate every text into Spanish. Keep each ⟦n⟧ token exactly. Return JSON." },
        { role: "user", content: JSON.stringify({ texts: ["Connect the long leg of the LED to ⟦0⟧."] }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "translation", schema } },
    })
  ).json();
  const reply = JSON.parse(body.choices?.[0]?.message?.content ?? "null");
  if (!reply || reply.texts?.length !== 1) throw new Error("reply does not match the schema");
  if (!reply.texts[0].includes("⟦0⟧")) throw new Error("the protected token was lost");
  return `from=${reply.from}`;
});

if (withImage) {
  await check("image (Muse Image)", async () => {
    const body = await (
      await post(
        "/images/generations",
        {
          model: imageModel,
          prompt: "A hand-inked isometric red LED on warm paper, flat colour bands, no text.",
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
          output_format: "webp",
          reasoning_strength: "low",
          tool_enablement: { enable_web_search: false, enable_image_search: false, enable_shell: false },
        },
        { timeoutMs: 120_000 },
      )
    ).json();
    const image = body.data?.[0];
    if (!image?.b64_json && !image?.url) throw new Error("no image in the response");
    return image.b64_json ? `${Math.round((image.b64_json.length * 3) / 4 / 1024)} KB ${body.output_format ?? "webp"}` : "url";
  });
} else {
  console.log("SKIP image (Muse Image): --no-image");
}

await check("transcribe (Muse Voice Transcribe, 1 s WAV)", async () => {
  const request = { model: transcribeModel, audioEncoding: "WAV", mode: "PUSH_TO_TALK", languageBias: ["English"] };
  const body = multipart([
    { name: "request", type: "application/json", data: JSON.stringify(request) },
    { name: "audio", type: "audio/wav", filename: "audio.wav", data: toneWav() },
  ]);
  const reply = await (await post("/asr/transcribe", body, { raw: true, timeoutMs: 45_000 })).json();
  if (typeof reply.transcript !== "string") throw new Error("no transcript field");
  return `audioDurationMs=${reply.audioDurationMs}`;
});

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `smoke-ai: ${failed} of ${results.length} checks failed` : `smoke-ai: all ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
