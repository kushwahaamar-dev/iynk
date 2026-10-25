# Phase 3 workflow (BUILD-PLAN.md §5, phase 3 and overnight)

Planned by Amar's session on 2026-10-24 at 22:30 CDT, under Amar's 22:20 full-autonomy go (CONTEXT.md §5). Phase 3
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

## Wave T2 (after gate 2)

### P3-ui-<lang> (es, fr, de, zh, hi)

Owns `src/i18n/messages/<lang>/*.json` and `src/i18n/figures/<lang>.json` for its one language (the five agents never
share a file). Three jobs, the T1 translation rules apply to all:

1. **UI strings.** Every leaf in `src/i18n/messages/<lang>/<namespace>.json` that still carries the English text is
   translated (find them by comparing with `src/i18n/messages/en/`; the `*-to-phase3-strings.md` requests in
   `docs/requests/` list the keys added in phase 2). Keys stay exactly as they are (`src/i18n/messages.test.ts`).
   Short labels that are the same word in your language, product names and units may stay.
2. **Figure strings.** `src/i18n/figures/<lang>.json` exists (T2a) for the keys listed then. The driver has since
   regenerated `src/i18n/figure-keys.json` with the acorn-based collector (wave B's figures, the drone and bench
   message tables, status words, craft logs, "Off"), so `npx vitest run src/i18n/figure-strings.test.ts` lists the
   keys your file lacks and the ones it has that are gone: add the new ones, drop the gone ones, keep every other
   entry as it is. Same rules as T2a (the notes at the top of your file's commit history): placeholders in braces
   stay, a part reference before the dot stays (`R18 · …`), silkscreen text printed on a board stays as printed,
   CLI and log lines keep their commands and values, button names match your prose.
3. **Consistency.** `docs/requests/P3-figs-notes.md` has T2a's notes for your language. that a UI string and the figure name the same control differently
   (e.g. es "Móntalo por mí" in the figure, English in `dronelab.json`), make the UI match the figure and the prose.

Done when `npx vitest run src/i18n` passes and no leaf of yours equals English unless it should.

### P3-figs-<lang> (wave T2a, beside wave B)

Job 2 of P3-ui-<lang> on its own, run early because `src/i18n/figures/<lang>.json` is a new file no wave-B agent
touches: one entry for every key in `src/i18n/figure-keys.json` as it is now (1866 strings). Wave B's new figures add
keys later; P3-ui-<lang> adds that delta after gate 2. Owns only `src/i18n/figures/<lang>.json`. Done when
`npx vitest run src/i18n/figure-strings.test.ts` passes for your language and the file is pushed.

### P3-prompts (wave T2a, beside wave B)

Owns `figures/prompts/<id>.md` for the figures that have none and that no wave-B agent is building: boards
`esp32-s3-devkitc-1`, `nano`, `nodemcu`, `pico`; robotics `esp32-s3-build`; parts `breadboard`, `led`, `resistor`,
`soil-moisture`, `ssd1306`, `traffic-light`, `wire`; modules `soil-moisture`, `ssd1306`, `traffic-light`, `uln2003`.
Each in the format of `figures/prompts/rgb-led.md`: read the figure source and look at its built page
(`python3 -I figures/tools/cfshoot.py <kind>/<id> --out <your scratchpad>`), then describe what it draws and does, as
built (no feature the figure doesn't have). Commit each record as you finish it.

### P3-prose-<lang>-<n>

Wave B's items' prose and whatever T1 left, through `scripts/workflows/phase3-prose.js` with the same rules as T1.

## Wave D (after gate 2)

### P3-docs-repo

Owns `README.md`, `figures/prompts/**` (only the records that don't exist yet), `docs/DECISIONS.md`.
- `README.md` rewritten for a judge and a new developer: what SimLab is (one paragraph), the 38 items and 6 languages
  as they really are, run and test (`npm run dev`, `npm run check`, vitest, Playwright, `cfbuild.py`/`cfshoot.py`),
  deploy (`docs/hacktx/DEPLOY.md`), the sponsor map (BUILD-PLAN §1, only what is live or degrades cleanly), how
  figures are made (Colorfigures, `figures/prompts/`), and the pre-event disclosure (HANDOFF "Hackathon rule": the
  research and prototypes before 11:30 Oct 24 are knowledge, every line of code was written during the event).
- A prompt record (`figures/prompts/<id>.md`, the format of `figures/prompts/rgb-led.md`) for every figure that has
  none: read the figure source and its built page (`cfshoot.py`), describe what it draws and does, as built.
- `docs/DECISIONS.md`: a "Build night" section with the scope decisions of phases 1–3 (D1 tracks, D2 translation
  tiers, the model hook, the 55 A racer ESC, telemetry wording, phase 4 skipped), one line each with why, from
  HANDOFF, CONTEXT §5, BUILD-PLAN and `docs/requests/*-gaps.md`.

### P3-docs-pitch

Owns `docs/hacktx/{PITCH,DEVPOST-WRITEUP,DEVPOST,VIDEO}.md` and a new `docs/hacktx/JUDGE-QA.md`.
- Every claim matches what is live on this tree at gate 2 (`docs/verify/gate2.md`): counts, languages, what works
  without keys, what needs the relay or keys (say so plainly). Solana and Best Hardware Hack are not claimed (phase 4
  skipped). Remove anything that overclaims (BUILD-PLAN §2 "Docs").
- `JUDGE-QA.md`: the 25 questions judges are likely to ask (how the sim works, what is real vs modelled, why the
  failures are accurate, the AI parts, SerpApi's role, Meta's role, what isn't done and why), each answered in 2–4
  sentences with the file or page that shows it.
- `VIDEO.md`: a 3-minute shot list over the BUILD-PLAN §1 demo path as it works locally, with the exact clicks.
