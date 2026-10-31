# Council memo: AI systems architect

Seat: AI systems architect (context-aware agents, tools, evaluations, inference costs).
Date: 2026-10-27. Repo state: audited commit bb546d6 (2026-10-26) plus the research files dated 2026-10-26/27.
Question owned: red-team question 12, "Will AI inference make free access unsustainable?"

Labels: VERIFIED (audit read or ran it), DOCUMENTED (a project doc says so), EXTERNAL (research file and [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (with a test), UNKNOWN. No confidence percentages.

## 1. Bottom line

Inference alone will not make free access unsustainable. The way it is built and bought today could.

1. Price is a choice, not a fate. The same 12-question session costs about USD 0.27 on Muse Spark 1.1 and about USD 0.008 on Haiku 5.5 with caching, a 35x spread (ESTIMATED, plat §7.2, TECHNICAL_RESEARCH D11). A free tier on a small model with caching, a daily cap and a global dollar cap is affordable at student scale. A free tier on a flagship model on every turn is not.
2. Today there is no control at all. VERIFIED: no identity, no usage ledger, no durable budget, token usage returned to the browser and then dropped (`ai-search-mcp.md` D10, SECURITY_BASELINE C1, C6). The ceiling on spend is a per-instance in-memory counter that counts HTTP requests, not model calls (D8). So the real risk is not honest learners. It is one script, or one bad week of traffic, spending money nobody has budgeted.
3. The bigger cost risks are elsewhere: live price search (SerpApi free plan is already at 250 of 250 searches, one cold bill-of-materials view costs 17 to 22 percent of a month's quota) and vendor terms (Gemini bars apps likely to be used by under-18s; Meta's terms were never read).
4. The partner's value is only real if it is grounded in a structured project and proves itself on an evaluation set. Neither exists. There are 344 passing tests in the AI layer and zero tests of what the partner says (VERIFIED, `ai-search-mcp.md` "Prompt quality: none").
5. Do not build more AI features. Build the meter, the model-routing seam, the evaluation set and the project snapshot first. Then decide on free-tier limits with real numbers.

Decision rule for free access (HYPOTHESIS, measurable): free AI is sustainable if the measured cost per active learner per month stays under USD 0.10 at the target daily cap, and the global monthly cap is below the amount the founders will fund without revenue. Both numbers come from step 1 of section 7 (the meter) and spike RS-11.

## 2. Evidence reviewed (files)

Read in full:
- `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/ai-search-mcp.md` (partner, tools, defects D1 to D14, injection, cost, reusability).
- `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/02_RESEARCH/competitors/ai-hardware.md` (first 120 lines: Flux, JITX, Quilter, Diode, atopile, tscircuit, Cirkit Designer, Circuit Mind, CELUS, Zoo, Arduino AI Assistant).

Read the relevant sections (not the whole file):
- `01_AUDIT/SECURITY_BASELINE.md`: sections 1, 2.1 (cost), 2.5 (AI abuse, A1 to A7), 2.6 (child-safety surfaces), route table.
- `02_RESEARCH/TECHNICAL_RESEARCH.md`: D11 (AI provider strategy), F2, F4, F5, G7 to G9, RS-02, RS-11, section 3 baseline.
- `02_RESEARCH/tech/platform-options.md`: section 7 (AI economics, price table, worked session cost).
- `02_RESEARCH/tech/compliance-safety.md`: section 1 (COPPA, GDPR-K, DPDP), section 2 (EU AI Act, provider terms), section 4 to 5 (physical safety), feature matrix.
- `02_RESEARCH/MARKET_ANALYSIS.md`: section 3 (competitor pricing, Arduino Cloud AI quotas), section 10 tests T1, T6.
- `02_RESEARCH/WORKFLOW_BENCHMARK.md`: task 4 (wiring-failure feedback), task 9.
- `01_AUDIT/REVIEW_GAPS.md` (headings and items on AI/security).
- `docs/handoff/CONTEXT.md` (key and deployment decisions, grep only).
- Source read to check claims: `src/lib/server/ai/prompts/partner.ts` (full), `src/lib/server/env.ts` (lines 25 to 50), `docs/hacktx/AI.md` (model table, fallback).

Not read: the other 13 inventories, FEATURE_VERIFICATION, TECHNICAL_DEBT, PERFORMANCE_BASELINE, TEST_COVERAGE, USER_SEGMENTS, USER_RESEARCH_PLAN, the other competitor dossiers, simulation-options. I rely on `ai-search-mcp.md` for the code facts; where it says VERIFIED I carry that label and did not re-run its probes. No new web research was done. The Meta Muse Spark terms page and Meta's own price page remain unread by me (UNKNOWN).

## 3. What the partner is today

### 3.1 Context it gets (VERIFIED unless noted, `ai-search-mcp.md`)

| Input | Content | Limit | Problem |
|---|---|---|---|
| `PARTNER_RULES` | Socratic, safety, no invented facts, language, brevity | 2,623 bytes, about 710 tokens (ESTIMATED tokens) | Rules only; no worked examples; never evaluated |
| Locale and lab line | language, lab, item id | small | none |
| Peer list | up to 8 peers, name up to 24 chars, up to 40 done-keys | 100 to 400 tokens | Peer-controlled text sits in a system message (SECURITY_BASELINE A1/A2) |
| Bench dump | text rendering of the learner's lab state, built by per-lab adapters | 12 KB cap, about 3,000 to 3,500 tokens at the cap (ESTIMATED) | Board and robotics adapters return `parts: []` and `nets: []` (D6). The model cannot see wiring or part ids there, yet the prompt tells it to use part ids. Heuristic key-name guessing for unknown stores |
| History | last 24 messages | 16,000 chars each server side | Lost on reload (D11); no server copy |
| Tool results | datasheet search: up to 3 results plus 2 pages of 3,000 chars | about 1,700 tokens | Unfenced web text (A3) |

Typical round: 5,500 to 7,500 input tokens, 100 to 600 output tokens (ESTIMATED, `ai-search-mcp.md`). Reasoning is `low` with `maxTokens` 6,000, so output can be much larger than 600.

### 3.2 Tools

| Tool | Runs | Side effect | Control today |
|---|---|---|---|
| `search_datasheet` | server | up to 3 SerpApi searches | none per learner (D4) |
| `find_parts` | server | up to 30 SerpApi searches per call (10 parts x 3 engines) | none per learner (D4) |
| `highlight_part` | browser | UI only | id may be invented on boards and robotics (D6, effect UNKNOWN) |
| `propose_change` | browser | shows diff; Accept/Reject | stale overwrite: Accept replays a stored full-text replacement, so edits made while the card is pending are lost (D5). Schema offers wire and part changes that two of three labs reject (D7) |
| `ask_peer` | browser | posts model-written text to the room chat at once | no confirmation (A4). Strongest injection abuse path |
| `open_panel` | browser | UI only | none needed |

The good part: one zod schema per tool is the single source for the model-facing JSON Schema and for argument validation (`tools.ts`). Model output is parsed to a React tree, never HTML, and links are http(s) only (X5). The learner decision is fed back to the model.

### 3.3 Injection exposure

| Path | Who controls the text | What an injected model can do | Severity (SECURITY_BASELINE) |
|---|---|---|---|
| Search results and page text into tool messages, no fence | any website the search returns | `ask_peer` spam into a room; steer advice; propose a change (gated by Accept) | medium, VERIFIED (A3) |
| Peer names and `done` keys in a system message | any room member | inject into every other member's partner | medium, VERIFIED (A1/A2) |
| Chat text to story, plan, translate | any room member | the answer returns to the room | medium (A2) |
| Bench dump | the learner only | self-attack only | low |
| Forged history | the caller | fabricated tool results; self-inflicted | low |
| Buddy pool profiles into the matcher | strangers | free-text `why` shown to users (A5) | medium |

The fence `<<< >>>` plus a "this is data" sentence is the only defence. No injection test exists (VERIFIED, `grep` in tests). Direct statement: this is a hackathon-grade defence on a product whose users may be children, and the one tool that lets a model reach another person (`ask_peer`) has no human gate.

### 3.4 Cost per session (ESTIMATED, assumptions shown)

Token counts per question are from `ai-search-mcp.md`: first round 6.5k in and 0.4k out; a question with one tool hop is two rounds, about 15k in and 0.8k out. A 12-question session is therefore about 180k input and 9.6k output tokens. This matches the platform dossier's worked session (189.6k in, 7.2k out, plat §7.2). Prices are list prices per million tokens from plat §7.1 [S1, S4, S9, S11], as of 2026-10-26.

| Model (in / out per M) | One question, uncached | 12-question session, uncached | 12-question session, cached (plat §7.2) |
|---|---|---|---|
| Muse Spark 1.1 (1.25 / 4.25; price from a news report, not Meta [S69]) | USD 0.022 | USD 0.27 | USD 0.27 (no cache price published) |
| Sonnet 5.5 (2 / 10) | USD 0.038 | USD 0.48 | USD 0.13 |
| Gemini 3.8 Flash (0.75 / 3.75) | USD 0.014 | USD 0.18 | USD 0.049 (USD 0.099 from 2027-01-01) |
| gpt-oss-120B on Fireworks (0.15 / 0.60) | USD 0.0027 | USD 0.033 | USD 0.009 |
| Haiku 5.5 (0.10 / 0.50) | USD 0.0019 | USD 0.023 | USD 0.008 |

The "Muse Spark 1.3" model that the code actually calls (`META_MODEL` default) has no price anywhere in the repo or the research (UNKNOWN). Use 1.1 as a stand-in and treat it as a floor.

Monthly volume view (ESTIMATED, cached figures above, 100,000 sessions a month, TECHNICAL_RESEARCH D11): Haiku only about USD 760; 80/20 Haiku/Sonnet mix about USD 3,290; Sonnet only about USD 13,400; Muse Spark 1.1 about USD 26,800. Quality per model was never tested, so these are price only.

A heavy-user view (ESTIMATED, mine): a learner who asks 20 questions a day for 30 days is 600 questions. On Haiku 5.5 with caching at USD 0.008 per 12 questions that is about USD 0.40 a month. On Muse Spark 1.1 at USD 0.022 a question it is about USD 13 a month. The cap per learner matters far more than the model for light users, and the model matters far more for heavy ones.

Worst-case abuse ceiling per warm instance (ESTIMATED, mine, using Muse 1.1 prices): the guard allows 900 calls an hour, each call up to 4 model rounds (D8), about 7k in and 0.6k out each. That is 3,600 rounds: 25.2M input tokens (USD 31.5) plus 2.2M output (USD 9.2), about USD 41 an hour. If every round hits the 6,000-token output cap the output alone is 21.6M tokens, about USD 92, so a ceiling near USD 120 an hour per warm instance. Multiply by the number of instances. The audit's earlier placeholder of USD 8 an hour used a price of USD 1/5 and one round per call and is too low by a factor of five or more.

## 4. Weaknesses

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | No spend control that survives a cold start. Budget and rate limits are per-instance `Map`s; the AI budget counts requests not model calls; one request can run 4 rounds and the client can re-post 4 times (up to 16 model calls per question). | `ai-search-mcp.md` D8, security C1/C6; `guard.ts:8,22`; `chat/route.ts:17`; `conversation.ts:17` | VERIFIED |
| W2 | No usage ledger. Token usage reaches the browser and is thrown away; cached tokens are dropped before they get that far. We cannot answer "what did last week cost?" | D10; `chat/route.ts:94,123-125` | VERIFIED |
| W3 | No identity. Every limit is keyed by IP read from a header. A missing header shares one key (`unknown`). Anyone with curl uses the key as a free LLM. | security C1, C7; `http.ts:128-132` | VERIFIED code; platform header behaviour HYPOTHESIS |
| W4 | One vendor, terms unread. Meta Muse Spark is public preview, US developers only, price from a news report, no cache price. The audit's own smoke test says model id 1.1 returned intermittent 404s on 2026-10-25. | plat §7.1 [S69]; `AI.md` models table; D14 | EXTERNAL / DOCUMENTED |
| W5 | The fallback may not exist and may be barred. `GEMINI_MODEL` defaults to `gemini-3.5-flash`, a name that is not on Google's pricing or models pages. Google's terms require 18+ and bar clients likely to be accessed by under-18s; unpaid use can train Google products. | `env.ts` line 38; TECHNICAL_RESEARCH F2, F4, section 8 | VERIFIED (code), EXTERNAL (terms); the legal conclusion is HYPOTHESIS |
| W6 | The partner is ungrounded on two of three labs. Boards and robotics send no parts or nets; the model is told to use ids it cannot see. | D6 | VERIFIED; error rate UNKNOWN |
| W7 | There is no project object. The partner reads a lossy text dump built by key-name guessing, and a new project type needs a new adapter. This blocks "original projects" for the AI as much as for the editor. | `ai-search-mcp.md` "Reusability" | VERIFIED |
| W8 | Proposals are not revision-safe. Accept replays stored text and can overwrite newer edits. | D5 | VERIFIED by reading; not reproduced in a browser |
| W9 | No evaluation of partner behaviour: Socratic first, safety warnings, refusing invented pins, injection resistance. 344 tests check plumbing against fake upstreams. | `ai-search-mcp.md` test table | VERIFIED |
| W10 | Safety advice from an LLM, unverified, for beginners with LiPos. The prompt has the rules; nothing checks they are followed. | security risk 8 | HYPOTHESIS that failures occur; test below |
| W11 | Voice, story and image send children's audio, chat text and free-text image prompts to a vendor, with no consent text, no age gate, no output moderation of our own. | security A6, A7, D6; compliance matrix | VERIFIED |
| W12 | Search spend is a bigger cliff than inference. The SerpApi key has 0 of 250 searches left; one cold bill-of-materials view costs 17 to 22 percent of a month; `find_parts` can cost 30 searches per call and the model may call it at will. | D1 to D4 | VERIFIED |
| W13 | Competitors cap free AI very low. Arduino Cloud Free gives 30 AI interactions a month. Flux has no permanent free AI plan; it meters in compute units. A free partner with generous limits has no precedent in this market and no evidence it is needed. | MARKET_ANALYSIS section 3 [S3]; ai-hardware.md Flux | EXTERNAL |

## 5. Opportunities

- A structured project is the moat the AI needs. Flux's Copilot is grounded in the live design and shipped a public MCP server; Arduino's assistant reads board and code but not a circuit; Wokwi mentions no built-in AI; Cirkit Designer is the closest learner-facing rival (ai-hardware.md). iynk adds something none of them show: the running simulation, with named faults. Wokwi and Falstad showed no warning for an LED without a resistor or a 5 V to GND short; iynk names 16 faults (WORKFLOW_BENCHMARK task 4, TESTED, scripted, one run). A partner that reads fault and simulation state can explain a failure instead of guessing. Whether that is a durable edge is HYPOTHESIS.
- Reviewable AI edits are a real gap. No competitor in the AI-hardware dossier shows an approve/reject diff or undo (ai-hardware.md summary, one source set). iynk already has the diff card; making it revision-safe and operation-based turns a demo feature into the product's core promise.
- Cheap models may be enough. The tutoring task is short, repetitive and grounded. If a small model passes the evaluation set, free access gets cheap enough that cost stops being the story (spike RS-11).
- The provider seam is nearly there. `META_API_BASE` is a setting and both Meta and Gemini are spoken to over OpenAI-compatible HTTP (`env.ts`, `AI.md`). Adding Fireworks, Together or Anthropic is a small change, apart from the Meta-specific fields (`prompt_cache_key`, `safety_identifier`) that need a per-provider adapter. Effort is not estimated in the dossiers (UNKNOWN).
- Cache hits are designed in: rules first, byte-identical, then context. A server-side prefix that does not change between turns is exactly what makes the cached column of section 3.4 true.
- The MCP server is a distribution channel at zero inference cost to iynk: other people's agents (Muse, Claude, Cursor) read project state and pay for their own tokens. Flux did this in summer 2026 (ai-hardware.md [S6]). It needs auth first (security C4).
- Offline or on-device help for the "anywhere" mission is possible for narrow tasks (error-message explanation from the fault table needs no model). Not researched; HYPOTHESIS, test in section 9.

## 6. Design principles for a partner grounded in a structured project

These apply once a project file exists (TECHNICAL_RESEARCH proposes a plain-text project file with a version field; I treat that as the precondition, not the AI team's job).

1. The model proposes, the project applies, the human decides. The model never writes to the project. It emits operations (typed, small, validated against the project schema). The editor shows a preview. The learner applies or rejects. Every applied operation goes in the same op log as human edits.
2. Operations, not text blobs. One operation = one of: set pin, add part, connect, remove, set value, replace code range, add test. Each carries the base revision hash. If the revision differs on Apply, re-apply against current state or show "the project changed since this suggestion". This fixes D5 by design.
3. Preview before apply, with the simulator as the checker. A proposal is run in a throw-away copy: compile, run the fault checks, run the lesson test. The card shows the diff and the result ("compiles, LED current 8 mA, no faults"). A proposal that fails its own check is shown as failing, or not shown. This is the "generate, evaluate, feed back" loop (JITX, ai-hardware.md) used for teaching, and it is the part a plain chatbot cannot do. Label as HYPOTHESIS that learners value it.
4. Attribution is data. Every operation records `author` (human id or `partner`), `model`, `prompt-version`, `source` (project snapshot hash, any search result id). The UI says "suggested by the partner" and the log keeps it. This serves EU AI Act Art. 50 transparency [S84], teacher review, and later disputes about who did the work (credentials must not reward copied AI output without a flag).
5. Read what the learner can see. The snapshot contract is: parts, nets, code, faults, last run trace, the lesson goal, the learner's last 3 actions. Not "whatever fits in 12 KB". Parts are listed with ids so `highlight_part` cannot invent them; unknown ids are rejected by the tool, not trusted.
6. Untrusted text is typed, fenced and capability-limited. Anything from outside the learner's own project (search results, peers, buddy profiles, shared projects) goes in a labelled data block and cannot trigger a tool that reaches another person or spends money. `ask_peer` becomes a draft the learner sends. `find_parts` needs a click above a free-tier count.
7. Ask less, show the work. Socratic first, answer on second ask (already in the rules). Keep that, but measure it: it is a pedagogy claim with no data.
8. One meter for every call. Every model call writes one row: time, anonymous learner id, route, provider, model, prompt version, tokens in, cached in, out, tool calls, latency, outcome. No content stored by default.
9. Routing is configuration. A table maps task to model: hint (small), debug with simulation trace (stronger, only if the small model's answer failed the check or the learner asked again), translation (small), story (small), image (off for minors, see section 8). Provider and model are per-task settings with a health check at startup (D14).
10. Evaluate before you ship a prompt. A prompt, model or tool change runs the evaluation set (section 7, item 4). The change ships only if it does not lose points on safety and injection rows.
11. Say what is known. Rule 5 already forbids inventing parts, pins and ratings. Add: when the answer depends on a datasheet value, show the source or say it is unknown. The r/arduino thread (one thread, community) reports models inventing pin assignments and re-introducing fixed bugs (ai-hardware.md [S41]); treat as a prompt for testing, not as a finding.

## 7. What to build first (from the AI lens, in order, with the reason)

| # | Build | Reason | Effort guess (ESTIMATED by me) |
|---|---|---|---|
| 1 | A usage ledger and a global kill switch: one table, one row per model call, a daily and monthly dollar cap read from the table, and a status readout. Shared store, not memory. | Without it nobody can answer question 12 with data, and one script can drain the account. This is the cheapest step with the highest information value. Also closes D8, D10 and part of C1/C6. | 2 to 4 days |
| 2 | Anonymous signed sessions plus per-session caps on questions, rounds and search calls; remove the unauthenticated direct-to-model path; API key on MCP/REST. | Free access needs a unit to cap that is not an IP. Anonymous means no account wall for learners. | 3 to 5 days |
| 3 | Provider adapter with a routing table and startup model check; add one cheap OpenAI-compatible provider; fix the fallback id; gate Gemini off for minors until cleared. | Removes single-vendor and terms risk; makes RS-11 runnable. | 3 to 5 days |
| 4 | An evaluation set of 40 to 60 cases, run on every prompt change: 15 safety (LiPo, mains, current limits, props off), 10 injection (search result, peer name, bench text), 10 Socratic-first, 10 invented-pin traps, 5 language, 5 minor-safety (section 8). Score by rubric plus programmatic checks (tool called, refusal present). | Today quality is UNKNOWN. This is also the instrument for choosing the cheapest acceptable model (RS-11). The audit asks for 30 to 50 bench states; this widens it to the threats in this memo. | 1 week for the set and runner |
| 5 | Fence and demote untrusted text; make `ask_peer` a draft; cap `find_parts`. | Closes the worst injection path at small cost (`ai-search-mcp.md` debt table rates it S). | 1 to 2 days |
| 6 | Revision-safe operations and the `ProjectSnapshot` interface (depends on the project file decision). | Needed for original projects; fixes D5 and D6. | After the project format exists |
| 7 | Run RS-11 (50 scripted lab-debug conversations on Haiku 5.5, Sonnet 5.5, Gemini 3.8 Flash, gpt-oss-120B; log cache hits over 100 sessions). | Sets the real price of free. Pass rule from TECHNICAL_RESEARCH: cheapest model with at least 90 percent of the top score; at least 80 percent of prefix tokens read from cache. | 1 to 2 weeks including the set from item 4 |

Items 1 to 3 are infrastructure the other seats also need (rate limiting, identity, cost control), so they are not AI-only spending.

## 8. What the AI must never do with minors

These are product rules and also evaluation rows. Legal sufficiency is not claimed (compliance-safety.md is research, not legal advice; lawyer review is required before marketing to under-13s).

1. Never be offered on a provider whose terms bar under-18 use or whose terms are unread. Gemini unpaid and paid are both in question until cleared (F2). Meta's terms: read before launch (UNKNOWN).
2. Never receive a child's name, contact details, location, school, photo or voice unless the feature is on for that age band and consent exists. Filter these out of prompts on the server (names, emails, phone numbers, addresses) and log the filter hit, not the text.
3. Never act as a friend, companion or emotional support. No flattery loops, no streaks, no "come back" nudges, no emotion inference (AI Act Art. 5(1)(f), Art. 5(1)(b) on exploiting age vulnerability [S21]). The FTC opened 6(b) inquiries into companion chatbots in Sept 2025 [S7 in comp §1].
4. Never send messages to another person on its own. `ask_peer` is a draft the learner sends. No partner message appears as if a human wrote it (R7 spoofed `ai` lines is a relay problem too).
5. Never give instructions for mains-powered work, bypassing protection circuits, charging LiPos unattended, or flying where the law forbids. Extra-low voltage only (compliance §5.3 recommendation, HYPOTHESIS pending a source). When asked, refuse briefly and point to a teacher or adult.
6. Never invent a specification. If the datasheet value is not in the project or a cited source, say so (rule 5). A child will wire what it says.
7. Never produce or accept free-text image prompts for under-13s; the image route is a general text-to-image endpoint with no moderation of our own (A6). Keep covers templated or disable until moderation exists.
8. Never store a child's conversation by default, never train on it, never share it with a vendor that trains on it, never let a vendor retain it beyond the minimum. Use the vendor's zero-retention or no-training setting where it exists (UNKNOWN for Meta).
9. Never grade, rank, place or proctor (AI Act Annex III point 3: high-risk). Hints only.
10. Never hide that it is an AI. Label every partner reply in the data model and UI (Art. 50(1), applying from 2 Aug 2026 with a transition to 2 Dec 2026 noted in compliance §2, adoption of the Digital Omnibus UNKNOWN).
11. Never act on self-harm, abuse or safeguarding disclosures with advice. Respond with a short supportive line and a pointer to a trusted adult or local helpline. This needs a human-written, localised list. HYPOTHESIS: needed; UNKNOWN how often it happens on a hardware site. Cheapest answer: the evaluation set, five rows.
12. Never execute code from a child's project on the server on the model's behalf, and never browse arbitrary URLs for a child. Search is through a controlled tool and results are fenced.

## 9. Budget guardrails for a free tier

All numbers are starting values to be reset after item 1 and RS-11. They are ESTIMATED design choices, not findings.

| Guardrail | Starting value | Why |
|---|---|---|
| Global monthly AI cap (hard) | A dollar figure the founders choose (UNKNOWN). Example: USD 300. At the 80/20 routed mix (USD 33 per 1,000 sessions) that is about 9,000 sessions; on Haiku only about 39,000; on Muse 1.1 about 1,100 | Makes "sustainable" a number. Pick it first, size the tier from it |
| Alert thresholds | 50, 80, 100 percent of the monthly cap; page a human | Kill switch is last resort |
| Behaviour at the cap | AI degrades to the no-model help (fault table, lesson hints), never to a blank panel; the lab keeps working | Mission: access never depends on the vendor |
| Per-learner daily cap | 15 questions a day per anonymous session, 40 a day per IP | Arduino's free tier gives 30 a month, so 15 a day is generous (EXTERNAL [S3]); cut if the meter shows heavy tails |
| Per-question cost cap | max 3 rounds, `maxTokens` 1,500 for the hint tier, reasoning off for hints, history window 12 turns, bench dump cap by tokens | The 6,000-token output cap and 24-turn history are the main tail risks |
| Tool budget | 3 search calls a day per learner free; `find_parts` limited to 5 parts and 1 engine by default, expand on click | Search is the cliff (W12) |
| Model tier | small model by default; stronger model only when the check fails or on a second ask; no flagship on every turn | TECHNICAL_RESEARCH D11 |
| Cache discipline | rules and tool schema identical bytes, project snapshot after; log cache-read ratio per route; alert under 60 percent | The cached column only holds if prefixes hit |
| Abuse | session signature, proof-of-work or similar friction on the first call of a new session, not an account wall; block requests with no Origin on AI routes | Cheapest way to stop script drain without excluding kids |
| Image and voice | image off by default; voice off for under-13; per-day count of 3 | Highest unit cost per call, highest privacy cost |
| Classroom path | Teacher codes lift the learner cap and bill the teacher or school later | Cost follows the party that pays (T1 waitlist test) |
| Per-feature kill flags | AI, search, voice, image can each be turned off at runtime | Vendor outage or terms change must not need a deploy |

Sizing sanity check (ESTIMATED, mine): if 5,000 monthly learners each average 1.5 sessions of 8 questions, that is 7,500 sessions, about 60,000 questions. On Haiku with caching that is about USD 60 to 100 a month; on the 80/20 mix about USD 250 to 350; on Muse 1.1 uncached about USD 1,300. The first two are fundable by a small team; the third is not without revenue. These volumes are invented to show scale, not forecasts. Real traffic: UNKNOWN (the audit found no analytics read; telemetry is default-on but its numbers are not in the evidence).

## 10. Answers to the red-team questions in my remit

### Question 12: Will AI inference make free access unsustainable?

Short answer: no for the partner chat if it is routed and capped; yes if the free tier means unlimited flagship use, and yes if the search and image costs are left uncapped. Evidence by cost line:

| Cost line | Status | Label |
|---|---|---|
| Partner chat at small-model prices | USD 7.60 to 13 per 1,000 sessions cached (Haiku, DeepSeek, gpt-oss rows) | ESTIMATED, plat §7.2; quality untested |
| Partner chat on Muse 1.1 | USD 268 per 1,000 sessions, 35x Haiku | ESTIMATED; real 1.3 price UNKNOWN |
| Abuse by a script | up to about USD 120 an hour per warm instance today | ESTIMATED, section 3.4 |
| Image generation | price UNKNOWN; 3 per minute and 60 per hour per instance | UNKNOWN |
| Voice transcription | price UNKNOWN; 20 per minute per IP | UNKNOWN |
| Live prices (SerpApi) | free plan exhausted; paid price per search UNKNOWN | VERIFIED (state), UNKNOWN (price) |
| Platform (Vercel Pro, Fly, Neon) | about USD 27 to 46 a month before AI | ESTIMATED, D10 |
| Gemini fallback | price doubles 2027-01-01; terms issue for minors | EXTERNAL [S67, S86] |

What would change my answer: if RS-11 shows only a Sonnet-class or Muse-class model passes the evaluation set, free access needs a funded cap or a paying tier (schools) to carry it. If a Haiku-class or open-weight model passes at 90 percent of the top score, free access is cheap enough to be a rounding error beside hosting. The test costs a few hundred dollars at most in tokens (ESTIMATED: 50 conversations x about USD 0.50 on the dearest model = USD 25 per model) plus time to build the set.

Related answers within my remit:

- Meta Muse Spark API availability. EXTERNAL [S69]: 1.1 is a public preview for US developers, price reported by a news outlet, no cache price, no price on Meta's own page that the researchers loaded. The mission says "anywhere"; a US-only API conflicts with it. Whether our key works from outside the US is UNKNOWN (the smoke test passed from the audit machine). Fireworks lists a "Muse Spark Open" at the same price with a cache price of 0.15 input, but its open-weight licence is UNKNOWN (plat §7.1). Verdict: usable for the pilot, not a foundation.
- Terms and minors. Gemini: 18+ and not for clients likely to be accessed by under-18s (EXTERNAL [S86], text re-fetched 2026-10-27). Meta: UNKNOWN. This is a release blocker candidate for any child-facing launch (TECHNICAL_RESEARCH G7).
- Is the AI a differentiator or a cost centre? Both, and the evidence for differentiation is thin. The grounded, simulation-aware, reviewable-edit combination is not seen in the competitor set (EXTERNAL, one research pass); user demand for it is UNKNOWN. No interviews exist (USER_RESEARCH_PLAN is a plan). Treat the partner as a feature to be proven, not as the strategy.
- Is the injection exposure acceptable? Not for children. The abuse path through `ask_peer` is closed by a one-day change.
- Is the safety advice trustworthy? UNKNOWN. The prompt contains the right rules; no one has tested whether the model follows them, under pressure or after search results change its mind.

## 11. What not to build yet (and the trigger to change that)

| Not yet | Why | Trigger to revisit |
|---|---|---|
| Autonomous agent that builds a whole circuit from a prompt (Flux-style) | Needs a project schema, operations, a checker and an evaluation set that do not exist; Flux's own users report loops and billed failures (ai-hardware.md, Flux complaints) | Operations and preview/apply ship; evaluation set shows at least 90 percent valid operations on 50 prompts |
| Fine-tuning or training a model | No data, no budget, no rights to use children's chats | A consented, de-identified evaluation corpus of at least 1,000 sessions and a measured gap that prompting cannot close |
| Self-hosted GPU inference | Operational burden; no volume | Monthly vendor bill above the cost of one GPU node plus an on-call person, for 3 months, with a model that passes the evaluation set |
| On-device model in the browser (WebGPU) | Firefox desktop has WebGPU off by default through 161 [S43]; phones untested | A model under about 2 GB that passes the safety rows, tested on a mid-range Android phone |
| Memory across sessions / learner profile | Privacy surface, child data, no consent flow | Accounts, parental consent and a deletion path exist |
| Image generation for covers | Moderation gap, unit cost UNKNOWN, low learning value | Output moderation exists; price known |
| AI-written grades, badges or credentials | Annex III high-risk; also undermines credential trust | Never as a decision; only as teacher-reviewed suggestions after a high-risk plan |
| More MCP tools | Auth and cost control missing (C4); Muse connector never tested | API key and per-key quotas exist; one real client connected |
| Voice for under-13s | No consent, audio goes to a vendor | Consent flow and vendor retention terms read |
| Further model-vendor integrations before the adapter and the evaluation set | Each new vendor multiplies unknown behaviour | Items 3 and 4 of section 7 done |

## 12. Risks

| Risk | Effect | Mitigation | Label |
|---|---|---|---|
| Spend spike from a script or a viral day | Credits gone; feature dark for everyone | Ledger, caps, kill switch, session identity (items 1 and 2) | VERIFIED exposure |
| Vendor withdraws, reprices or restricts | Partner stops; cost model breaks | Adapter, routing table, no-model fallback | Gemini repricing EXTERNAL [S67]; Meta change UNKNOWN |
| Terms conflict for minors | Legal exposure; forced shutdown of AI for a segment | Provider chosen on terms first; counsel (RS-02, RS-17) | HYPOTHESIS pending counsel |
| Unsafe advice reaches a beginner | Physical harm, reputational loss | Evaluation rows, refusal rules, "lab guidance not certification" labels | HYPOTHESIS; no test yet |
| Injection through a peer or a web page | Spam or social engineering in rooms with children | Fence, draft-only `ask_peer`, tool capability limits | VERIFIED exposure |
| Partner reduces learning (answers too fast, copy-paste) | The mission fails while usage rises | Socratic-first measured on the set; a learning outcome study | UNKNOWN; no data |
| Wrong help from an ungrounded snapshot | Learner trusts a hallucinated pin | Parts and nets in the snapshot; tool rejects unknown ids | VERIFIED gap (D6); frequency UNKNOWN |
| Free tier trains users to expect unlimited | Hard to add limits later | State the cap on day one in the UI | HYPOTHESIS |
| Prices fall, making my caps too strict | Worse product than needed | Re-cost quarterly; caps are configuration | EXTERNAL trend not tested |
| Data goes to a vendor without consent | Regulator action | Minimise, strip personal data, vendor no-training terms | VERIFIED (current flow), law UNKNOWN |
| Overbuilding AI because it demos well | Engineering time not spent on the editor and project format | Gate AI work behind the project file decision | Judgement |

## 13. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer |
|---|---|---|
| 1 | What are the real Muse Spark 1.3 and Gemini prices for our account, and is the tool schema part of Meta's cached prefix? | Read the billing dashboard of the existing keys; run `scripts/smoke-ai.mjs` with usage logging for 20 calls. Under USD 1 |
| 2 | What do Meta's API terms say about minors, retention and training? | Read the terms page (30 minutes); email Meta developer support if unclear. Counsel only if the answer is ambiguous (RS-02) |
| 3 | Does the Muse API work for users outside the US, and do we need our own proxy region? | Call the API from a cloud VM in two non-US regions. A few dollars |
| 4 | Which model is cheapest at 90 percent of the best score? | Build the evaluation set (item 4), run RS-11. About USD 100 of tokens plus a week |
| 5 | Does caching hit as modelled? | Log cached tokens for 100 real sessions after the ledger exists. Free once item 1 is live |
| 6 | How many learners ask how many questions? | Ledger plus the existing telemetry; 2 weeks of data from a pilot class. Free |
| 7 | Does the partner follow safety rules under pressure and injection? | The 15 safety and 10 injection rows. 2 to 3 days |
| 8 | Is the simulation-aware, reviewable partner something learners value over a plain chatbot? | 5 teachers and 10 learners, same task with and without the partner, record time to fix and what they say. Part of the USER_RESEARCH_PLAN; hypothesis: median time to fix a wiring fault improves by at least 30 percent. Free apart from time |
| 9 | Does a small model plus the fault table cover most hints? | Replay 100 logged questions: what share is answerable from the fault table with no model call. Free after item 1 |
| 10 | How often does `highlight_part` get an invented id on boards and robotics? | Replay 30 recorded transcripts against the real model (D6, open question 4). USD 1 to 2 |
| 11 | What does the SerpApi paid plan cost, and how many real searches does a learner need? | Read the plan page; count searches per session from the ledger. Free |
| 12 | Is a US-only or terms-limited vendor acceptable to the founders for the pilot? | A decision by the founders, in writing (RS-02). Free |

## 14. Challenge to the founders' vision, from this seat

- "Original projects as a first-class capability" depends on the AI reading a project schema. If the project file is not designed first, the partner will stay a chat bubble over a text dump. Design the project and operation schema as one thing.
- "Free, anywhere, any language" and "one vendor with US-only access and unread terms" cannot both be true. Pick the first and let the vendor follow.
- A feature count is not value. The audit lists six tools, seven MCP tools, translation, voice, stories, images, planner, matcher. I could find no evidence any of them changes learning. Fewer, measured, safer AI features beat more.
- A hackathon AI that "works" is a demo of the plumbing. Its quality is UNKNOWN and its safety is unmeasured. Say that plainly in any school conversation.
