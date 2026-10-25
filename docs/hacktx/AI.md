# iynk AI gateway (hx:server-ai)

The server platform (env, HTTP helpers, rate limits, `/api/status`) and the Meta Model API gateway behind `/api/ai/*`, per HX-CONTRACT H1, H2 and H4. Everything here was written on 2026-10-24 during the hacking period.

## What Meta's docs say (read 2026-10-24)

Sources: the Markdown versions of the docs, listed at https://dev.meta.ai/llms.txt.
- https://dev.meta.ai/docs/models.md
- https://dev.meta.ai/docs/protocols/chat-completions.md
- https://dev.meta.ai/docs/api-reference/chat-completions/schemas.md
- https://dev.meta.ai/docs/tool-calling.md
- https://dev.meta.ai/docs/structured-output.md
- https://dev.meta.ai/docs/prompt-caching.md
- https://dev.meta.ai/docs/reasoning.md
- https://dev.meta.ai/docs/image-understanding.md
- https://dev.meta.ai/docs/video-understanding.md
- https://dev.meta.ai/docs/api-reference/images/create-image.md
- https://dev.meta.ai/docs/api-reference/images/schemas.md
- https://dev.meta.ai/docs/speech-to-text.md
- https://dev.meta.ai/docs/api-reference/voice/transcribe.md
- https://dev.meta.ai/docs/api-reference/voice/schemas.md
- https://dev.meta.ai/docs/error-handling.md
- https://dev.meta.ai/docs/pricing-rate-limits.md

**Base and auth.** The base URL is `https://api.meta.ai/v1`. Every call sends `Authorization: Bearer <key>`.

**Models.** Every model below is on the API (pay-as-you-go, Standard mode):

| Model | Id | Notes |
|---|---|---|
| Muse Spark | `muse-spark-1.1` | The original version. Answered `404 model_not_found` intermittently on 2026-10-25, so it is no longer the default. |
| Muse Spark | `muse-spark-1.2` | Best for audio input. |
| Muse Spark | `muse-spark-1.3` | Latest; "recommended for new work". Docs warn its audio input "may be degraded". |
| Muse Image | `muse-image-1.0` | Image generation. |
| Muse Voice Transcribe | `muse-voice-transcribe-1.0` | Speech to text. |

- All Muse Spark versions take text, image, video, audio and PDF input and have a 1,048,576-token context.
- The `-contributor` ids are cheaper but may train on your content; we don't use them.
- **Suggestion:** set `META_MODEL=muse-spark-1.3` in `.env.local` for better tool use. Voice doesn't need Muse Spark's audio input, so 1.3's audio caveat doesn't matter here.

**Chat completions:** `POST /chat/completions`, OpenAI-compatible.

- **Body:**
  - `model`, `messages` (roles system, developer, user, assistant, tool)
  - `tools: [{type:"function", function:{name, description, parameters}}]`
  - `tool_choice`: only `"auto"`; anything else is a 400
  - `parallel_tool_calls` (default true)
  - `response_format`: `{type:"json_schema", json_schema:{name, schema, strict?}}` or `{type:"json_object"}`
  - `max_completion_tokens` (`max_tokens` is a deprecated alias; reasoning tokens count against it)
  - `reasoning_effort`: minimal, low, medium, high, xhigh, plus `max` on 1.3. `none` is a 400 on Muse Spark.
  - `stream`, `stream_options: {include_usage: true}`
  - `prompt_cache_key`, `prompt_cache_retention` (`in_memory` or `24h`)
  - `safety_identifier`: up to 64 chars, hash the user id
- **Rejected with a 400:** `stop`, `n > 1`, `logprobs`, `modalities`, `audio`, `web_search_options`. Leave `temperature` and `top_p` at their defaults.
- **Content parts:**
  - `{type:"text"}`
  - `{type:"image_url", image_url:{url, detail?}}`; the url can be a `data:` URL
  - `{type:"input_audio", input_audio:{data: base64, format:"wav"|"mp3"}}`
  - `{type:"video_url"}`
  - `{type:"file"}`
- **Response:** the OpenAI shape. `choices[0].message.content`, `tool_calls[{id, type:"function", function:{name, arguments: JSON string}}]`, `finish_reason` (stop, length, tool_calls, content_filter), and `usage{prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens, completion_tokens_details.reasoning_tokens}`.
- **Streaming:** `data: {chat.completion.chunk}` lines, then `data: [DONE]`.
  - `choices[0].delta` carries `content`, `reasoning_content` (redacted to empty for API keys) and `tool_calls[{index, id?, function:{name?, arguments?}}]`. Fragments are accumulated by `index`.
  - With `include_usage`, the final chunk has `choices: []` and `usage`.
- **Conversation structure:** an assistant turn with `tool_calls` must be replayed in full, followed by one `tool` message per call. Anything else is a 400.
- **Errors:** `{error:{message, type, param, code}}`. Retry 429, 500 and 503 with backoff and jitter. 429s carry `Retry-After`.
- **Rate limits:** per team. Muse Spark: 3,000 RPM and 4M TPM. Muse Image: 150 RPM. Voice Transcribe: 256 concurrent streams and 16,000 streams per hour.
- **Prompt caching:** automatic prefix caching, with no flag. Stable content goes first; `prompt_cache_key` raises the hit rate.

**Muse Image:** `POST /images/generations`.
- **Body:**
  - `{model:"muse-image-1.0", prompt, n (1–10), size:"WxH" (only the aspect ratio is used)}`
  - `response_format: "b64_json" | "url"` (default b64_json)
  - `output_format: "png" | "jpeg" | "webp"` (default webp)
  - `reasoning_strength: "low" | "high"` (default high)
  - `tool_enablement: {enable_web_search, enable_image_search, enable_shell}`
  - `user`
- **Response:** `{created, data:[{b64_json | url, revised_prompt?}], output_format, usage}`.

**Muse Voice Transcribe:** `POST /asr/transcribe`, `multipart/form-data`.
- **Parts:** `request` (JSON, `type=application/json`) and `audio` (the file).
- **`request` fields:**
  - `model`
  - `audioEncoding: "WAV"`: required. **The only accepted encoding:** "a RIFF/WAVE container holding mono integer PCM at 16 kHz or 24 kHz".
  - `mode`: PUSH_TO_TALK (default), ENDPOINTING or DIARIZATION
  - `keywords[]`
  - `languageBias[]`: language names such as "Spanish". Our six are all among its 25 languages; Chinese is "Mandarin Chinese".
- **Response** (`Accept: application/json`): `{sessionId, transcript, audioDurationMs, turns[]}`. It has no detected-language field.
- **Limits:** 32 MB and 10 minutes.
- **Realtime:** `wss://api.meta.ai/v1/asr/realtime` exists. We don't use it, because Vercel functions can't hold a socket.

**Gemini fallback** (https://ai.google.dev/gemini-api/docs/openai, read 2026-10-24):
- **Endpoint:** base `https://generativelanguage.googleapis.com/v1beta/openai/`, with `Authorization: Bearer GEMINI_API_KEY`.
- **Model:** our default is `gemini-3.5-flash` (`GEMINI_MODEL`); the docs' examples use `gemini-3.8-flash`, which was rate-limited on our key on 2026-10-25.
- **Supported:** streaming, tools, `image_url` and `reasoning_effort` (minimal to high).
- **What we send differently:** `max_tokens` replaces `max_completion_tokens`, and the Meta-only fields are dropped.

## What we built

| File | What |
|---|---|
| `src/lib/server/env.ts` | zod schema of every H1 variable (plus `GEMINI_MODEL`), parsed once from `process.env`. A blank variable is unset. A malformed one falls back to its default and is named in `envIssues`, never with its value. Exports `env`, `features`, `readEnv`, `featuresOf`. |
| `src/lib/server/http.ts` | `json()` (no-store by default), `fail(status, code, message?)`, `notConfigured(what)`, `parseBody(req, schema, {maxBytes})` and `parseForm(req, {maxBytes})`. Both cap the body while reading it, so a missing `content-length` doesn't get around the cap, and both return `{ok, data} \| {ok:false, response}`. Also `withTimeout(ms, parent?)`, `clientIp(req)` and `checkOrigin(req)`. |
| `src/lib/server/ratelimit.ts` | `rateLimit(key, {limit, windowMs})` (a sliding log per instance, capped at 10k keys), `checkRateLimit(req, bucket, opts)` (429 with `Retry-After`) and `tooManyRequests()`. |
| `src/app/api/status/route.ts` | `GET` returns `{features}`, booleans only. It calls `await connection()`, so Cache Components never prerenders it. |
| `src/lib/features.ts` | `useFeatures()` returns `{status: "loading" \| "ready" \| "error", features}`. One fetch per page load. The server render shows "loading" with everything off. It retries on `online`. `reloadFeatures()` backs a retry button. |
| `src/lib/server/ai/provider.ts` | `chat({messages, tools?, stream?, json?, maxTokens?, reasoning?, signal?, timeoutMs?, cacheKey?, user?})`, `chatJson(schema, name, opts)`, `generateImage()`, `transcribeWav()`, `ToolCallAssembler`, `AiError`, `safetyId()`. |
| `src/lib/server/ai/sse.ts` | `parseSse()`: chunk-safe, CRLF/CR/LF, multi-line data, BOM. It cancels the upstream body when the reader stops. `sseResponse()` sends our own SSE with a keep-alive comment every 10 s. |
| `src/lib/server/ai/types.ts` | The `/api/ai/*` shapes, with no `server-only`, for `import type` in the browser. |
| `src/lib/server/ai/tools.ts` | The server-tool registry: `search_datasheet` (hx:search `web` + Extract) and `find_parts` (hx:search `offers`). Search tools are offered to the model only when `features.search` is on. |
| `src/lib/server/ai/guard.ts` | `guardAi(req, route, perMinute, feature)` checks origin, then the feature (503 `not_configured`), then the per-IP limit, then the instance budget (900 upstream calls/hour, 60 images/hour). `aiFailure()` maps errors to the H2 shape. |
| `src/lib/server/ai/wav.ts` | Sniffs the container. Decodes PCM/float WAV, downmixes, resamples to 16 kHz and re-encodes 16-bit WAV. |
| `src/lib/server/ai/catalog.ts` | The items plan and match may pick: the generated content index when it lists any, else every D3 id. |
| `src/lib/server/ai/prompts/*` | `partner`, `translate` (with ⟦n⟧ masking), `story`, `plan`, `match`, `image` (the Colorfigures template), `language`. |

**Behaviour worth knowing:**
- **Retries and timeouts:**
  - Every upstream call has `AbortSignal.timeout`: chat 60 s, streams 90 s, images 110 s, transcribe 45 s, each tool 35 s.
  - It also follows the browser's `req.signal`, so a closed tab stops the upstream call.
  - One retry on 429, 5xx or a network error, after `Retry-After` (if ≤ 4 s) or 250–750 ms of jitter. 4xx is never retried.
- **Gemini fallback:** only when `GEMINI_API_KEY` is set, and only before any output went to the client. `usage.provider` says who answered. With only a Gemini key, text features work and image and voice stay off.
- **Error detail:** upstream errors are logged on the server as status, type, code and param. Clients see only the H2 codes:
  - `not_configured` (503)
  - `upstream_failed` and `upstream_busy` (502)
  - `upstream_timeout` (504)
  - `rate_limited` (429)
  - `bad_request` and `bad_json` (400), `too_large` (413), `unsupported_media_type` (415)
  - `forbidden_origin` (403)
  - transcribe also uses `bad_audio`, `too_long` and `unsupported_audio`
- **Display:** the message is a developer hint. **UIs pick their own localised text by `code`.**
- **JSON bodies:** must be sent with `content-type: application/json` (otherwise 415). Together with `checkOrigin`, that keeps other sites from firing simple cross-origin POSTs at the AI routes (H11).
- **Prompt caching:** the partner sends the fixed rules as the first system message and the learner's context (locale, item, peers, bench) as the second. The rules prefix stays identical for Meta's prefix cache, and the requests share `prompt_cache_key: "iynk-partner"`. `safety_identifier` is a salted SHA-256 of the caller's IP, never the IP itself.

## The routes

All are POST except status, rate-limited per IP, origin-checked, and 256 KB max unless stated.

| Route | Limit/min | Notes |
|---|---|---|
| `GET /api/status` | 120 | `{features}`; `cache-control: public, max-age=60`. |
| `/api/ai/chat` | 20 | SSE; H4 events. See the loop below. |
| `/api/ai/translate` | 60 | ≤ 20 texts, ≤ 2 KB each. Translations are cached in memory by sha256(from, to, text), 5,000 entries. Reasoning `low`. |
| `/api/ai/transcribe` | 20 | Multipart `audio` (≤ 4 MB) and `lang?`. See voice below. |
| `/api/ai/story` | 6 | JSON schema output. The story is capped at 250 words on a sentence boundary; `imagePrompt` at 600 chars, so it can go straight to `/api/ai/image`. |
| `/api/ai/image` | 3 | `{prompt ≤ 600, style:"colorfigures"}`, 8 KB body. Returns `{image: "data:image/webp;base64,…"}` at 1536×1024 (3:2). |
| `/api/ai/plan` | 6 | JSON schema whose `item` is an enum of the catalog keys, so it can't name an item that doesn't exist. Roles are kept only for real participants, in their order. |
| `/api/ai/match` | 10 | `id` and `suggestedProject` are enums of the pool ids and catalog keys. Duplicates and self are removed, scores clamped to 0–100, top 5 returned. An empty pool gives `[]` with no AI call. |

**Chat loop (H4):**
- **Request:** the body is the H4 shape, plus hx:partner's request: assistant turns may carry `tool_calls: [{id, name, args}]`. The server rejects with a 400 any history Meta would reject: a tool result that doesn't answer the assistant turn just before it, an unanswered call, or a chat that doesn't end with the user or a tool.
- **Rounds:** up to 4 model calls. The last one gets no tools, so it has to answer in text.
- **Server tools:** each call is validated with hx:partner's `parseToolCall`, then all run in parallel. A validation error goes back to the model as the tool result. `search_datasheet` results also go out as `citation` events.
- **Client tools:** validated calls stream out as `{type:"tool_call", id, name, args}` and end the turn. The browser runs them and posts the assistant turn plus one `role:"tool"` result per call. When a turn mixes server and client calls, the server calls are dropped, so the replayed history stays paired.
- **Output:** text from several rounds is joined with a blank line. `done` carries the summed usage. Failures end the stream with `{type:"error", code}`.

**Voice:**
- **WAV uploads:** decoded and, if needed, converted to 16 kHz mono 16-bit, then sent to Muse Voice Transcribe with `languageBias` from `lang`.
- **MP3:** goes to Muse Spark as `input_audio` (format mp3), the documented alternative.
- **Refused with 415 `unsupported_audio`:** webm/opus, ogg and mp4/aac. No documented Meta path accepts them, and H13 rules out ffmpeg. The browser should decode its MediaRecorder blob with `decodeAudioData` and upload WAV (docs/requests/hx-server-ai.md §5).
- **Short and long clips:** clips under 0.25 s return `""` without an upstream call. Clips over 120 s get 400 `too_long`.
- **`lang` in the reply:** "zh" or "hi" when the transcript's script says so, else the speaker's `lang`. The API returns no language.

**Translate:**
- **Protected text:** fenced and inline code, URLs, numbers with units (220 Ω, 3.3V, 20 mA) and pin or part tokens (D13, GPIO2, HC-SR04) are swapped for ⟦n⟧ before the model sees them and restored after.
- **Lost tokens:** if the model loses or invents a token, that text falls back to the original.
- **`from`:** the requested source language, else the model's detection (`und` when it's none of our six).

## Credits

No third-party code. We rely on the documented Meta Model API and Gemini OpenAI-compatible HTTP interfaces, and on zod (MIT) for validation.
