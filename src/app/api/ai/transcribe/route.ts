import { isLocale, type Locale } from "@/i18n/config";
import { aiCap, aiFailure, aiUser, callerKey, guardAi } from "@/lib/server/ai/guard";
import { ledger } from "@/lib/server/ai/ledger";
import { TRANSCRIBE_LANGUAGES } from "@/lib/server/ai/prompts/language";
import { chat, transcribeWav } from "@/lib/server/ai/provider";
import type { TranscribeResponse } from "@/lib/server/ai/types";
import { sniffAudio, toTranscriberWav, WavError } from "@/lib/server/ai/wav";
import { fail, json, parseForm } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 60;

const MAX_AUDIO = 4 * 1024 * 1024;
/** Push-to-talk clips; Meta accepts up to 10 minutes, the dock never needs that. */
const MAX_SECONDS = 120;

/** The transcript's language when its script settles it, else the speaker's own locale. */
function languageOf(text: string, hint: Locale | undefined): Locale {
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const devanagari = text.match(/\p{Script=Devanagari}/gu)?.length ?? 0;
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  if (han > latin && han >= devanagari) return "zh";
  if (devanagari > latin) return "hi";
  if (hint && hint !== "zh" && hint !== "hi") return hint;
  return latin ? "en" : (hint ?? "en");
}

async function transcribeMp3(bytes: Uint8Array, key: string, lang: Locale | undefined, req: Request): Promise<{ text: string; tokens: number }> {
  const language = lang ? ` The speaker most likely speaks ${TRANSCRIBE_LANGUAGES[lang]}.` : "";
  const result = await chat({
    messages: [
      {
        role: "system",
        content: `Transcribe the recording verbatim in the language spoken.${language} Reply with the transcript only, no quotes or notes. Reply with nothing if there is no speech.`,
      },
      {
        role: "user",
        content: [{ type: "input_audio", input_audio: { data: Buffer.from(bytes).toString("base64"), format: "mp3" } }],
      },
    ],
    reasoning: "low",
    maxTokens: 2000,
    signal: req.signal,
    user: aiUser(req),
    key,
  });
  return { text: result.text.trim(), tokens: result.usage.inTokens + result.usage.outTokens };
}

export async function POST(req: Request) {
  const refused = guardAi(req, "transcribe", 20, "voice");
  if (refused) return refused;
  const key = callerKey(req);
  if (!key.ok) return key.response;
  const keyId = ledger.keyId(key.key);
  const capped = aiCap(keyId);
  if (capped) return capped;
  const form = await parseForm(req, { maxBytes: MAX_AUDIO + 64 * 1024 });
  if (!form.ok) return form.response;

  const audio = form.data.get("audio");
  if (!(audio instanceof Blob)) return fail(400, "bad_request", "audio: a file is required.");
  if (audio.size > MAX_AUDIO) return fail(413, "too_large", "audio: at most 4 MB.");
  const rawLang = form.data.get("lang");
  if (rawLang !== null && !isLocale(rawLang)) return fail(400, "bad_request", "lang: not a supported locale.");
  const lang = isLocale(rawLang) ? rawLang : undefined;

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const kind = sniffAudio(bytes);
  try {
    let text: string;
    let tokens = 0;
    if (kind === "wav") {
      let prepared: ReturnType<typeof toTranscriberWav>;
      try {
        prepared = toTranscriberWav(bytes);
      } catch (error) {
        if (error instanceof WavError) return fail(400, "bad_audio", `audio: ${error.message}.`);
        throw error;
      }
      if (prepared.seconds > MAX_SECONDS) return fail(400, "too_long", `audio: at most ${MAX_SECONDS} seconds.`);
      // Nothing to hear in a tap of the button; skip the upstream call.
      if (prepared.seconds < 0.25) return json({ text: "", lang: lang ?? "en" } satisfies TranscribeResponse);
      text = (await transcribeWav({ wav: prepared.wav, languages: lang ? [TRANSCRIBE_LANGUAGES[lang]] : undefined, signal: req.signal, key: key.key })).text;
    } else if (kind === "mp3") {
      ({ text, tokens } = await transcribeMp3(bytes, key.key, lang, req));
    } else {
      return fail(415, "unsupported_audio", "audio: send 16-bit PCM WAV (16 kHz mono is best) or MP3.");
    }
    await ledger.recordAi(keyId, { tokens });
    return json({ text, lang: languageOf(text, lang) } satisfies TranscribeResponse);
  } catch (error) {
    return aiFailure(error);
  }
}
