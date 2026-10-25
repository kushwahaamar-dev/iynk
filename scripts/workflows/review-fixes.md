# Review fixes (after the final pass, 2026-10-25 04:47)

F-review walked the final pass against POLISH-SPEC and wrote `docs/verify/ui-review.md`: one blocker (B1), seven
ugly findings (U1-U7) and seventeen nits (N1-N17), each with its cause and fix. The builders are done, so four agents
take them by area. Run with `scripts/workflows/phase3-wave.js` (brief `review-fixes.md`).

## Shared rules

1. Shared rules 2, 3, 7, 8, 9, 10 and 13 of `scripts/workflows/phase2.md` apply word for word (the hackathon rule,
   Node 24, others' half-done work, careful git with only your paths and no agent attribution lines, secrets, the last
   step). Read `HANDOFF.md` ("Rules that never change"), `docs/design/POLISH-SPEC.md` (the spec the review checked
   against) and your findings in `docs/verify/ui-review.md` with their screenshots (the paths are in the report).
2. **Only your paths** (your section lists them). Others are fixing the other areas at the same time.
3. **Since the review build**, the driver changed: `FigureFrame`'s `hideChrome` (`chrome` message) now also hides the
   figure's switches (`xr` See-through, `labels`) and `stats` (the HUD's big numbers); board pages hide `xr`, the
   drone workshop hides `stats` and shows its status strip on phones (`87315a4`, `docs/FIGURES.md`). quad5 has a
   fourth test (failsafe). The room and sound specs are fixed. Build on that.
4. **Visible text.** A new or changed string goes into all six languages of its message file, in the words that file
   already uses. List every visible label you change (old -> new); keep the labels `docs/hacktx/VIDEO.md` and
   `PITCH.md` tell the presenter to click, or say old and new.
5. **Test first where a test can say it** (a component test, an e2e assertion, a content check); run it red, then
   green.
6. **Done means:** `npx tsc --noEmit` and `npx eslint . --quiet` are clean; `npx vitest run` for the folders you
   touched passes; one production build of your own (`NEXT_DIST_DIR=.next-<your label>
   IYNK_BUILD_SKIP_TYPECHECK=1 npm run build`, then `E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-<your label> npx
   playwright test <your specs>`) passes; you looked at what you changed at 1440 x 900 and 390 x 844 (and in German
   where text length matters) in screenshots you read. Then delete `.next-<your label>` and remove its two lines from
   `tsconfig.json` with `python3 -I
   /private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/clean-tsconfig.py
   <your label>` (it parses the file; never edit those lines by hand, never commit tsconfig.json). Report real
   numbers, failures included.
7. Scratch files in `<scratchpad>/<your label>/`. Commit with `git commit -m "…" -- <your paths>` after each verified
   finding and push (retry with `git -c http.version=HTTP/1.1 push` if it fails; never pull, rebase or stash). Aim to
   be pushed by 06:20 CDT.

## Sections

### F-fix-boards

Owns `src/components/boardlab/**`, `src/app/[lang]/boards/**`, `src/i18n/messages/*/boardlab.json`,
`src/content/boards/uno-r3.ts`, `src/content/boards/uno-r3.test.ts`, the six `src/i18n/content/*/boards/uno-r3.json`
and `e2e/boardlab.spec.ts`. In order:

1. **B1** (blocker): `relative` on `ScrollRow`'s root. Prove it with `node scripts/crawl-routes.mjs --base <your
   server> --dist .next-<label> --workers 3 --only /boards/` (0 failed) and an e2e assertion that a lesson page at
   390 px has `scrollWidth === clientWidth`.
2. **U1**: the burnt readout's number. Keep each part's peak current while it burns and print that, or drop the
   number in all six languages; pick what reads honestly next to the figure's toast.
3. **U2**: a Blink run with LED1 burnt out must not pass. Add a check to the lesson in `uno-r3.ts` that LED1 is seen
   lit during the run (read how the existing checks read the run and the figure's measured state), with a test that
   fails before it. Blink untouched on a healthy board still passes (worked example, FE nit 1).
4. **U3** (boards part): on the board page hide the figure's assembly buttons that the Assembly tab's Do it sends, at
   every width (`boardHidden` in `ViewBar.tsx`); keep Press RESET and anything no tab offers.
5. **N2** (serial resize handle: a 44 px hit area), **N5** (catalogue kicker "12 boards" like the drones' count),
   **N7** (board page readouts: only the parts the current view draws), **N8** (lesson code panel title hidden under
   `xl` in German and wherever it truncates).
6. Before Run, a lesson's figure runs the board's out-of-the-box program (Blink on an Uno) while the serial tab says
   "Your code isn't running yet" and the readout row may disagree with the blinking LED. Look at it and make the
   page tell one story (wording or behaviour), the smallest honest change.

### F-fix-robotics

Owns `src/components/robotics/**`, `src/app/[lang]/robotics/**`, `src/i18n/messages/*/robotics.json`,
`e2e/robotics.spec.ts`. In order:

1. **U3** (the bench part, the biggest): on a phone the bench drawing is a thumbnail under the figure's eight pills.
   Hide (`hideChrome`) every figure button whose job a step's Do it already sends; keep the ones a "Do this in the
   figure" step (`action === null`) needs, or put those on the step itself. Consider hiding `stats` too if the rail
   already shows the same status and rails: the Status tab and the bar must then carry everything the HUD showed
   (status, rail volts, the running program). Measure the drawing's size at 390 before and after.
2. **N3** ("Hints" summary 44 px tall), **N10** (one word for one state across the strip, the Status panel and the
   figure; "Limit 500 mA · 500 mA to spare").

### F-fix-drones

Owns `src/components/dronelab/**`, `src/components/flight/**`, `src/app/[lang]/drones/**`,
`src/i18n/messages/*/dronelab.json`, `src/i18n/messages/*/flight.json`, `e2e/dronelab.spec.ts`,
`e2e/fly*.spec.ts`. In order:

1. **U5**: the fly telemetry stays one row from `lg` in every language (German, `swarm`'s long checkpoint names).
2. **U6**: the phone cockpit: the mode select ends in an ellipsis, not mid-word; the course hint and the HUD leave the
   gate label and the course visible once armed.
3. The phone workshop: the empty-mat card ("No parts fitted yet") covers the figure's zoom control; keep it clear.
4. **N4** (catalogue rows as subgrid), **N6** (Exploded view as a pressed secondary button, as the board ViewBar
   does), **N16** (the verdict's first sentence bold, the rest in body weight), **N17** (the toolbar readouts truncate
   with an ellipsis or drop out under a container width when Lab tools takes the stage's room).

### F-fix-shell

Owns `src/components/ui/**`, `src/components/shell/**`, `src/components/settings/**`,
`src/components/{ai,dock,search,realtime,hw,data}/**`, `src/app/[lang]/about/**`, `src/app/[lang]/together/**`,
`src/app/[lang]/page.tsx`, `src/app/globals.css`, `src/i18n/messages/*/{common,shell,together,ai,search,hw}.json`,
`e2e/shell.spec.ts`, `e2e/dock*.spec.ts`. Not `src/components/figure/**` (the driver's). In order:

1. **U4** ("Match system" cut by its pill in the Settings popover and the phone menu), **U7** (`Stat` units at 12 px,
   not `0.6em`).
2. **N1** (tooltips on a coarse pointer and off the screen edge), **N13** (the bar's progress badge names what it
   counts on hover and to screen readers), **N14** (About's kicker), **N12** (the Together lede without the
   translation clause while the AI service is off).
3. N17's drawer half, only if it is small and safe: from 1280 px the Lab tools drawer takes its width from the rail
   rather than squeezing the stage. Otherwise say why not.
