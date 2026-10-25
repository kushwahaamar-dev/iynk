# Phase 3 workflow (BUILD-PLAN.md §5, phase 3 and overnight)

Planned by Amar's session on 2026-10-24 at 22:55 CDT, under Amar's 22:20 full-autonomy go (CONTEXT.md §5). Phase 3
is translation, polish and release; phase 4 (Solana, hardware) is skipped. Every agent runs in the same working tree
(`/Users/amar/Codes/ak/simlab`) and owns only the files its section lists.

| Wave | When | Labels | What |
|---|---|---|---|
| T1 | alongside phase 2 wave B | P3-prose-es, -fr, -de, -zh, -hi | prose of the items that exist now, judge path first |
| T2 | after gate 2 | UI strings, figure dictionaries, prose of wave B's items | planned at gate 2, appended below |
| D | after gate 2 | README, prompt records, DECISIONS, JUDGE-QA, PITCH, DEVPOST-WRITEUP, VIDEO | planned at gate 2 |

T1 runs beside wave B because it touches only new files (`src/i18n/content/<lang>/...`) for items whose English prose
no wave-B agent owns.

## Shared rules (every phase-3 agent)

1. Shared rules 2, 3, 7, 8, 9 and 13 of `scripts/workflows/phase2.md` apply word for word: the hackathon rule, Node 24
   and Next.js 16.4, others' half-done work, careful git (only your paths, never `add -A`/stash/checkout/reset/pull/
   rebase, push after each commit, no agent attribution lines), secrets, and the last step.
2. Read `HANDOFF.md` ("Rules that never change") and `docs/hacktx/BUILD-PLAN.md` §0 (D2), §4 (the locale row) and §6.
3. Up to 15 agents share the machine while wave B runs. Don't run `next build`, Playwright or the crawl; the driver
   runs them at the gate.

## Wave T1: P3-prose-<lang>

Each agent owns `src/i18n/content/<lang>/**` for its one language (es Spanish, fr French, de German, zh Simplified
Chinese, hi Hindi in Devanagari) and translates the English prose files it is given, in the order given:
`src/i18n/content/en/<lab>/<id>.json` → `src/i18n/content/<lang>/<lab>/<id>.json`. The first three are the judge path
(`boards/uno-r3`, `drones/quad5`, `robotics/esp32-s3-build`). Once a file exists, that page shows it instead of the
English prose and its "not yet translated" notice (`getContentProse` in `src/i18n/server.ts`).

**The file must be complete.** It replaces the English file whole, and `t()` throws on a missing key or placeholder,
so a gap crashes the page. Exactly the English keys, in the same structure; every `{placeholder}` kept, spelled the
same; plural objects keep `other` (add the forms your language needs). `npx vitest run src/i18n/content.test.ts`
checks keys, placeholders and that the sentences really are translated.

**What a good translation is here.** A learner in that language reads it as if it was written for them: plain,
friendly, precise, the same register as the English. Use the terms makers in that language use (es "protoboard",
de "Steckbrett", fr "platine d'essai", zh "面包板", hi "ब्रेडबोर्ड"); where the trade name is English (Arduino, ESP32,
Betaflight, PWM, GPIO, I²C, LiPo), keep it. Never change code, pin names (`D13`, `GPIO2`, `A0`), part numbers, units
and their numbers, CLI commands, menu or button names that the figure shows in English, file names, or anything in
backticks. Numbers keep their values; use the language's decimal separator only in prose sentences, never inside code
or a value the UI parses. Don't add or drop facts. Keep any markdown, line breaks and emoji as they are.

**How.** The big files are large (`boards/uno-r3` is 1226 strings, 10k words): translate one top-level section at a
time into a file in your scratchpad, then merge them with a short node or python script into the final JSON (key order
as in English, 2-space indent, UTF-8, no escaped non-ASCII). After each item: `node -e` parse check, `npx vitest run
src/i18n/content.test.ts` (your files pass), then commit and push that one file:
`git add src/i18n/content/<lang>/<lab>/<id>.json && git commit -m "<Language> prose: <id>" -- <that path>`.
If the English file changes under you (another agent fixes it), the content test shows the new key: add it.

**Done when:** every file in your list is translated, passes the content test and is pushed; or, if the run is cut
short, every file you did is, and your report lists the ones left.
