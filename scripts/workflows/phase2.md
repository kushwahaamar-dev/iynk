# Phase 2 workflow (BUILD-PLAN.md §5, phase 2)

Planned by Amar's session on 2026-10-24 at 19:26 CDT, after gate 1 went green apart from phase-2 prose
(`docs/verify/gate1.md`). Not launched yet: Amar decides the wave size and gives the go. Every agent runs in the same
working tree (`/Users/amar/Codes/ak/simlab`) and owns the files listed in its section. If a session dies, the next
driver relaunches only the unfinished labels with this file as the brief.

Wave A ran 19:29–21:27 CDT with a pause (`wf_bde0e200-6a3`): all 9 labels done, every commit pushed. Wave B runs
under Amar's 22:20 full-autonomy go; its sections below carry wave A's leftovers.

Phase 2's goal is §4's bar for all 38 items in English: no item is a placeholder or a 404. Two waves, so no more than
10 agents run at once (the 14:19 usage-limit stop happened with 56). Wave B starts after the driver closes wave A.

| Wave | Labels | Agents | Rough wall time |
|---|---|---|---|
| A | P2-engine, P2-uno-r4, P2-modules, P2-drone-prose, P2-drones-fpv, P2-flight, P2-rob-uno, P2-rob-motor, P2-social | 9 | 2–2.5 h |
| B | P2-engine-b, P2-microbit, P2-nucleo, P2-pi, P2-fpga, P2-rob-sensors, P2-rob-power, P2-drones-heavy, P2-drones-vtol, P2-fun | 10 | 2.5–3 h |

Wave A goes first because it holds what wave B builds on: the engine requests, the hc-sr04 and mpu6050 module figures
(the sensor benches), the flight registry (the new crafts and ghosts) and the mat parts (the motor benches).

## Shared rules (every agent)

1. **Read first:** `HANDOFF.md` ("Rules that never change"), `docs/hacktx/BUILD-PLAN.md` (§3.2, §4, §5 phase 2, §6,
   §8), `AGENTS.md`, the audit your section names in `docs/audit/` (written at 15:20, before phase 1: check what
   phase 1 already fixed before you redo it), `docs/ARCHITECTURE.md` §2 for owners, and the open requests in
   `docs/requests/` addressed to your items.
2. **Hackathon rule.** Write every line now. Never copy code from git baseline `245763f`, pre-event prototypes or
   code blocks in `docs/research/`; use them only as knowledge. `docs/audit/salvage/` content written today is fine.
   Fact sheets in `docs/facts/` are knowledge, not code.
3. **Node 24** (`node -v`). **Next.js 16.4 differs from what you know:** read the guide in `node_modules/next/dist/docs/`
   before using a Next API. A `next build` uses `NEXT_DIST_DIR=.next-<your label>`; delete that folder after and
   remove the `.next-<label>` lines `next build` adds to `tsconfig.json` (don't commit them). Don't run `npm ci`.
4. **Own only your files.** Other agents edit this tree at the same time. Edit only the files your section owns. If you
   need a change in someone else's file, write `docs/requests/<your-label>-to-<owner-label>-<topic>.md` (what, why,
   exact shape) and work around it; owners re-read `docs/requests/` every hour and before finishing.
   One owner per wave for shared files:

   | Shared file | Wave A | Wave B |
   |---|---|---|
   | `figures/engine/**`, `figures/tools/**`, `figures/vendor/**` | P2-engine | P2-engine-b |
   | `src/content/schema.ts` (additive only, logged at the top of `docs/ARCHITECTURE.md`) | P2-flight | P2-drones-vtol |
   | `src/lib/interp/**` | P2-modules (sensor inputs only) | P2-pi (`python/**`), P2-fpga (`verilog/**`, compile options) |
   | `src/lib/boardlab/engine.ts`, `src/lib/boardlab/inputs.ts` | P2-modules | P2-fpga |
   | `src/i18n/messages/*/dronelab.json` | P2-flight | P2-fun |
   | `src/i18n/messages/*/boardlab.json` | P2-uno-r4 | P2-microbit |
   | `src/i18n/messages/*/robotics.json` | P2-rob-motor | P2-rob-sensors |
   | `src/i18n/messages/*/common.json`, settings, `src/lib/features.ts` | P2-social | P2-fun |
   | lab workspace components (`BoardWorkspace`, `LessonWorkspace`, `BenchWorkspace`, `DroneWorkspace`) | P2-social | P2-fun |
   | `FlyWorkspace`, `src/lib/flight/**` | P2-flight | P2-fun |

5. **Generated files.** Never commit `src/content/index.generated.ts` or anything under `public/figures/` that your
   section doesn't own. `npm run content` regenerates the index locally; the driver commits it at the end of the
   wave, and rebuilds every figure once (`cfbuild.py --all`) after the engine changes.
6. **Message parity.** `src/i18n/messages.test.ts` checks the six locales have the same keys. A new UI key goes into
   all six files; fr/de/es/zh/hi carry the English text for now, and you list those keys in
   `docs/requests/<your-label>-to-phase3-strings.md` so phase 3 translates them. Item prose is English only
   (`src/i18n/content/en/...`); the fallback shows it in every language with a notice.
7. **Other agents' half-done work will show up** in typecheck, eslint and tests. Judge your work by errors in your own
   files and by your own tests; mention others' failures in your report, don't fix them. Vitest's timeout is 30 s for
   the whole suite (`vitest.config.mts`); don't add per-test budgets. A test that times out while ten agents share the
   machine is rerun alone before you call it failed.
8. **Git, carefully.** Never `git add -A`/`.`, `git stash`, `git checkout -- <path>`, `git reset`, `git pull` or
   `git rebase`: in a shared tree they would grab or destroy other agents' work. Commit small steps with only your
   paths: `git add <your paths> && git commit -m "<what and why>" -- <your paths>` (retry after a few seconds if
   `.git/index.lock` is busy). Then `git push origin main` (if HTTP/2 fails, `git -c http.version=HTTP/1.1 push origin
   main`). If the push is rejected because `origin` moved, don't pull: say so in your report and the driver
   integrates. The author is the git config identity; add **no** `Co-Authored-By`, "Generated with" or other agent lines.
   Never commit `.env*` (except `.env.example`), keypairs, `.next*/` or transcripts. Check `git status --short`
   before each commit.
9. **Secrets.** API keys are placeholders on this machine: every sponsor feature must degrade cleanly ("not set up on
   this deployment"). Never print a key. Don't create cloud resources, link Vercel, upload env vars or spend money.
10. **Phones.** Anything you render must fit a 390 px screen. Start phone grids with `grid-cols-1`; `cx` doesn't merge
    Tailwind classes, so override a base class with `!`. Text on a pastel fill (`bg-good-bg`, `bg-bad-bg`) takes the
    `on-fill` class.
11. **Done means verified through the app's own path** (BUILD-PLAN §6), never a private runner:
    - lessons and tasks: `SIMLAB_LESSON_TABLE=/tmp/<label>.md npx vitest run src/lib/interp/lessons.test.ts`
      (reference passes, starter fails, for each of yours);
    - bench steps: `node figures/engine/probe.mjs <bench-id>` (every step in order, 0 errors);
    - figures: `python3 -I figures/tools/cfbuild.py <kind>/<id>`, then `python3 -I figures/tools/cfshoot.py <kind>/<id>`
      (views, failures change state, 0 `CF_NOTE` unknown parts);
    - prose: `npm run content:check` has no line for your items;
    - pages: a production build of your own (`NEXT_DIST_DIR=.next-<label>`), `next start` on a free port, and
      `node scripts/crawl-routes.mjs --base <url> --dist .next-<label> --workers 3 --only /en/<your path>`: 200,
      no console errors, no sideways scroll;
    - plus `npx tsc --noEmit` (filter to your files), `npx eslint <your paths> --quiet` and the vitest files for
      your paths. Report real numbers, failures included.
12. **If an item can't reach §4 in time**, ship what passes (figure, prose, the lessons or steps that pass) and write
    the gap into your report and `docs/requests/<label>-gaps.md`. Never hide a gap and never leave a placeholder.
13. **Last step:** commit and push your remaining files, then reply with: what you changed (files), what is verified
    (commands and results), what is not done, and any requests you filed.

## Wave A

### P2-engine

Audits: `robotics.md`, `boards.md`, `drones.md`. Owns `figures/engine/**`, `figures/tools/**` and the engine tests.
Do the open engine requests, most important first: `P1-uno-to-P1-engine-assembly.md` (apply `fault`/`remove`/
`restore`/`build` before `power` in one patch; report `reversed:<id>` in `state.faults`), the engine items in
`item-uno-r3-build.md` (1–10), `item-tb6612fng.md` 1–4, `parts-drivers.md` §1–2 (mat bounds, the solver types the
model hook doesn't cover), `parts-inputs.md` §3 (buzzer/tone sound events). Then every request wave A files to you.
Rebuild only the figures no other wave-A agent owns (uno-r3 board, esp32 boards, nano, quad5) and re-run their probes.
Done when: those requests are answered in the request files (done, or why not), engine tests pass, `probe.mjs
esp32-s3-build` still passes 17/17, and `cfshoot.py boards/uno-r3` shows the four powered failures from P1-uno's
request.

### P2-uno-r4

Audits: `boards.md`. Owns board `uno-r4`: `src/content/boards/uno-r4.ts` and its test, `src/i18n/content/en/boards/uno-r4.json`,
`figures/prompts/uno-r4.md`, and the boardlab message files (shared table). Not its figure (P2-modules).
Do: write the English prose (it is the last board line in `content:check`); Minima and WiFi variants on the lessons
that need them (matrix and wifi need WiFi); blink period from the code; i2c with the MPU from P1-checks' world plumbing;
7 quizzes; the failures that leave straps "running" (`MD`, `ESP_DOWNLOAD`): file the engine side to P2-engine.
Done when: `/en/boards/uno-r4` and its 7 lessons render; the lesson table shows 7/7 reference pass and starter fail;
`content:check` has no uno-r4 line.

### P2-modules

Audits: `boards.md` (gaps 4–6). Owns `figures/modules/{hc-sr04,mpu6050}.js` (new), the board figures
`figures/boards/{pico,nodemcu,uno-r4}.js` and their built pages, `src/lib/boardlab/{engine,inputs}.ts` and the sensor
inputs in `src/lib/interp/**`.
Do: draw the HC-SR04 and MPU-6050 modules (wave B's sensor benches and 5 lessons use them); bundle the parts the
pico, nodemcu and uno-r4 circuits use but don't draw (button, pot, LDR, MPU); check that the hc-sr04, mpu6050,
network and qtr-rc inputs P1-checks added reach the lessons. Then re-probe all 7 boards.
Done when: `cfshoot.py` on all 7 boards passes with 0 `CF_NOTE` unknown parts, every lesson circuit draws its parts,
and the lesson table is still 59/59 (plus uno-r4's when it lands).

### P2-drone-prose

Audits: `drones.md`. Owns the English prose `src/i18n/content/en/drones/{whoop,cinewhoop,longrange,wing}.json`, their
content modules and tests, their figures (stale: rebuild with `cfbuild.py drones/<id>`) and `figures/prompts/<id>.md`.
Do: the prose these four modules already reference (they 404 without it); fix the craft tests that read `checks.*` or
`extra.*` against the drone engine's one `extra.*` path; check `longrange.ts` (saved mid-write at 14:19).
Done when: the four pages render in English with design, build, 3 safety tests, ≥1 craft test, CLI and quiz;
`content:check` has no drone line; `cfshoot.py drones/<id>` passes for all four.

### P2-drones-fpv

Audits: `drones.md`. Owns crafts `racer`, `gpscam`, `delivery`: content modules and tests, English prose, figures
(rebuild) and prompt records.
Do: content and prose from the calculator fixtures and the existing figures; default builds that don't open on an
over-current warning (racer); safety tests, craft tests (gimbal, winch, GPS), CLI snippets for their firmware.
Their flight params and courses go in the content for P2-flight's registry to read.
Done when: the three pages render in English to §4's drone bar apart from flying (P2-flight); `cfshoot.py` passes.

### P2-flight

Audits: `drones.md` (flight sim). Owns `src/lib/flight/**`, `FlyWorkspace`, the fly page, `src/content/schema.ts`
(this wave) and the dronelab message files.
Do: the flight registry: one adapter that reads `content.flight.params` and deletes the duplicate `crafts/<id>.ts`;
one course per craft with bronze/silver/gold par times and a mission (BUILD-PLAN §1 "Most Entertaining levers" 4);
wing and VTOL params where the sim supports them; FPV readouts that fit a phone in portrait.
Done when: quad5, whoop, cinewhoop, longrange, wing, racer, gpscam and delivery fly from `/en/drones/<id>/fly`
(e2e: arm, take off, one lap or checkpoint) as their content lands; `flight.test.ts` passes.

### P2-rob-uno

Audits: `robotics.md` (B4). Owns benches `uno-r3-build` and `led-resistor`: `src/content/robotics/<id>.ts` and tests,
English prose, `figures/robotics/<id>.js` and built pages, prompt records.
Do: `uno-r3-build.ts` from `docs/audit/salvage/item-uno-r3-build/` (parts, faults, modes, steps; add status, current,
tasks, quizzes, export); the prose JSON already exists (25 steps, 13 faults, 2 tasks, 5 quizzes). `led-resistor` from
its figure (220 Ω/1 k/10 k/bypass, meter, Ohm's-law serial). Engine needs go to P2-engine.
Done when: `probe.mjs uno-r3-build` and `probe.mjs led-resistor` pass every step in order; ≥3 breaks in state; each
task's reference passes and starter fails in the lesson table; both pages render.

### P2-rob-motor

Audits: `robotics.md` (B5, M2, M3). Owns benches `transistor-switch`, `tb6612fng`, `l298n` (content, prose, bench
figures, prompts), the mat parts `tt-motor`, `aa-holder-4`, `lipo-2s` under `figures/parts/`, and the robotics message
files.
Do: the three bench figures on the model hook (transistor saturation, H-bridge levels), the status keys no figure
reports today (`meas.Q1/M1/BT1`, tb6612 `levels.*`), the failing reference solutions (transistor-switch pulse,
tb6612 five-speeds), l298n content and prose.
Done when: `probe.mjs` passes for the three benches; their tasks pass in the lesson table; the
`/figures/robotics/<id>.html` 404s in `docs/verify/gate1-routes.md` are gone.

### P2-social

Audits: `platform.md`, `sponsor-layer.md`. Owns `src/lib/sound/**` (new), the settings toggle, `src/lib/features.ts`,
the common message files, the lab stores' `sync`/`hydrate` and the room adapter, `track()` calls outside the fly page,
and the lab workspace components (shared table).
Do: BUILD-PLAN §3.2 item 7 (sync/hydrate, action filter, baton enforced in the adapter) on the board, bench and drone
stores; a sound module (Web Audio, figure sfx + UI cues, off by default, a toggle in settings) wired into the
workspaces; §3.2 item 9 telemetry calls (lesson pass, bench step, fault triggered, ai call, search call), disclosed as
"anonymous, opt-out".
Done when: two browser contexts in one room see the same build state (BroadcastChannel fallback; the relay is not
approved); sound off by default and audible when on; e2e for both; no console errors with keys absent.

## Wave B

### P2-engine-b

Same ownership as P2-engine, plus every existing figure source and built page under
`figures/{boards,robotics,modules,parts,drones}/` that no other wave-B label owns (wave A's owners are gone). Answers
wave B's engine requests (sensor benches, motor drivers, new boards' assembly) first, since other agents wait on them.
Then wave A's leftovers, in this order:
1. `docs/requests/driver-to-P2-engine-b-figure-layout.md`: the six part pages with overlapping labels, bench stats over
   the art, tb6612fng's framing. Judges see these first.
2. Circuit-part faults (`P2-engine-gaps.md`, `parts-inputs.md` §1.7), then use them so the transistor-switch
   breadboard redraws its wiring faults (`P2-rob-motor-gaps.md` first item).
3. The UNO R4 `dac-wave` circuit drops its A0 → A1 jumper and its "read back on A1" title (`P2-uno-r4-gaps.md` 2).
4. The rest of `P2-engine-gaps.md` as time allows (props, ULN2003 breadboard part and stepper coils, part pages
   framed on the part, NPN overdrive, whoop-scale motors). Figure string dictionaries are phase 3's.
Done when: every wave-B request is answered, the six part pages pass `cfshoot.py`, the benches' stats clear the art,
and the engine tests and existing probes pass.

### P2-microbit, P2-nucleo

Audits: `boards.md`. Each owns one board end to end: `src/content/boards/<id>.ts` and test, English prose,
`figures/boards/<id>.js` and built page, prompt record (P2-microbit also the boardlab message files).
Do: a figure with board, breadboard, schematic and power views; ≥4 lessons in the board's languages (micro:bit
MicroPython; Nucleo Arduino C++), ≥5 failures that change the figure, an assembly sequence, a quiz per lesson, a
parts list for Build it for real.
Done when: §4's board bar, checked with the lesson table, `cfshoot.py boards/<id>` and the crawl.

### P2-pi

Audits: `boards.md`, `robotics.md` (B8, M2). Owns board `pi4-pi5`, bench `pi5-ros2` and `src/lib/interp/python/**`.
Do: the Pi 4/5 board (shared with the bench, variants keep their functions); the pi5-ros2 bench figure; the rclpy
subset its tasks need (`rclpy.executors`); `item-pi5-ros2.md` 1–5 (engine items go to P2-engine-b).
Done when: the board meets §4's board bar, `probe.mjs pi5-ros2` passes, and its 3 tasks pass in the lesson table.

### P2-fpga

Audits: `boards.md` (gap 1). Owns boards `basys3` and `de10-lite`, `src/lib/interp/verilog/**`, the compile options
and `src/lib/boardlab/{engine,inputs}.ts` (this wave).
Do: port-to-net mapping (`CompileOptions.ports`) so Verilog drives the figure's LEDs, switches and 7-segment; both
boards to §4's bar with Verilog lessons.
Done when: §4's board bar for both, checked as above.

### P2-rob-sensors

Audits: `robotics.md` (B7, B9). Owns benches `pca9685` (the simple arm), `qtr-8rc` (the line follower), `mpu6050`,
`hc-sr04` (content, prose, bench figures, prompts), the `pca9685` and `qtr-8rc` module figures, and the robotics
message files (this wave).
Do: the two brief items that have no exceptions (line follower on qtr-8rc, arm on pca9685; fallback for both:
tb6612fng); sensor benches on P2-modules' module figures.
Done when: §4's bench bar for all four, checked with `probe.mjs` and the lesson table.

### P2-rob-power

Audits: `robotics.md`. Owns benches `a4988` and `lm2596` (content, prose, bench figures, prompts), their module
figures, and the mat parts `nema17` and `multimeter`.
Do: stepper current limit on the a4988 (model hook), buck output on the lm2596, the meter readings both need.
Done when: §4's bench bar for both.

### P2-drones-heavy

Audits: `drones.md`. Owns crafts `agrihex` and `swarm` (content, prose, figures, prompts, their flight params and
courses).
Do: figures in their own palettes; the brief's agricultural spray and nano/Crazyflie swarm; missions (spray coverage,
light show). How a craft's content flies: `docs/requests/P2-flight-to-drone-content-flying.md`.
Done when: §4's drone bar, flying through P2-flight's registry.

### P2-drones-vtol

Audits: `drones.md`. Owns crafts `vtol`, `tricopter`, `octo` (as above) and `src/content/schema.ts` (this wave).
Do: VTOL transition, tricopter tail servo, octo motor-out (the sim supports all three); default builds that don't open
on a warning. How a craft's content flies: `docs/requests/P2-flight-to-drone-content-flying.md`.
Done when: §4's drone bar for all three.

### P2-fun

Audits: `drones.md` ("Most Entertaining levers"), `sponsor-layer.md`. Owns the fly page and `src/lib/flight/**` (this
wave), the dronelab and common message files, `/api/leaderboard` callers, the workspace components (this wave).
Do: §3.2 item 8 ghosts (your best-lap ghost from `replay()`; others' poses through the room adapter, BroadcastChannel
until the relay is approved); Break it slow-mo replay with "here's why" and one-click fix; daily challenge share link
and leaderboard (degrades cleanly without `DATABASE_URL`); flight-lap telemetry.
Also owns this wave `e2e/fly.spec.ts`, `src/lib/telemetry/**`, `src/lib/sound/**`, `src/lib/search/client.ts` and
`src/i18n/messages/*/shell.json`, and takes wave A's leftovers in them:
- `docs/requests/P2-social-to-driver-telemetry.md` §1–4: the client honours the usage opt-out, the `step.done` and
  `search.call` kinds with their two calls, the privacy copy that replaces "no tracking", the ARCHITECTURE §0 line.
- `docs/requests/P2-flight-gaps.md`: wing and delivery now have content and prose, so their fly e2e must run and pass.
- `docs/requests/P2-drones-fpv-gaps.md` 3–4: the delivery drop takes the parcel's mass off, and AUTO flies to a land
  goal level before it descends.
Done when: e2e: a ghost flies a lap beside you, a crash replays, a challenge link opens the right course; every craft
with content passes `e2e/fly.spec.ts`; unticking usage sharing stops every telemetry send (a unit test).

## Wave B tail: the driver's requests (launched 2026-10-25 00:20 CDT)

Requests wave A and B filed to the driver, for files no running label owns. Each agent owns the files its section
names; the request file says exactly what to change and how to check it. Append an `## Answer` to each request you
close (time from `date`). P2-engine-b, P2-fpga and P2-drones-vtol are still running: never edit their files
(FIGURES-BENCH, `figures/engine/**`, the FPGA boards, `octo`, `vtol`), and run vitest only on the files you touch.

### P2-req-interp

Owns `src/lib/interp/**` outside `verilog/` (`world.ts`, `lesson-world.ts`, `headless.ts`, `python/**`) and
`src/content/robotics/pca9685.ts`, `src/content/robotics/pca9685.test.ts`.
1. `docs/requests/P2-pi-to-driver-onboard-inputs.md`: onboard sensor inputs reach the run (`World.onboard`), and the
   Pico's `ADC(4)`, `microbit.temperature()`, compass heading and microphone level read them; the test it names.
2. `docs/requests/P2-rob-sensors-to-driver-pca9685-trace.md`: the PCA9685 channels in the headless trace as
   `PCA<addr>.<ch>` pseudo-pins; then the servo checks it proposes in `pca9685.ts`, with a test that each task's
   starter still fails and its solution passes.
Done when both requests are answered and `npx vitest run src/lib/interp src/content` passes.

### P2-req-host

Owns `src/lib/boardlab/**`, `src/components/boardlab/**`, `src/lib/search/bom.ts` (and its test),
`src/content/boards/uno-r3.ts` and `src/i18n/content/*/boards/uno-r3.json` (only the keys the WHEEL callout needs).
1. `docs/requests/P2-engine-b-to-driver-prop-values.md`: `figureState` sends each world input's value to its prop,
   with a unit test on `figureState`; then the stepper lesson's `WHEEL` callout: point it at `STP1` (keep its text
   key, so the six prose files stay valid) unless STP1 already has a callout, in which case fold the text in and
   remove the key from all six languages.
2. `docs/requests/P2-microbit-to-driver-bom-kit.md`: the micro:bit kit (no new query key).
Done when both requests are answered and `npx vitest run src/lib/boardlab src/components/boardlab src/lib/search
src/content/boards/uno-r3.test.ts src/i18n` passes.

### P2-req-drone

Owns `src/content/drones/_checks.ts`, `src/lib/dronelab/cli.ts` (and its tests), `src/lib/drone/calc.ts`,
`src/lib/drone/__fixtures__/models.ts`, `src/content/drones/{swarm,tricopter}.ts` and their tests, and the one
`CliEmulator.readOnly?: string[]` field in `src/content/schema.ts` (P2-drones-vtol owns the schema this wave: re-read
it right before that one edit and commit it at once).
1. `docs/requests/P2-drones-heavy-to-driver-checks-cflib.md`: `noSmoke` and the cflib rules in `_checks.ts`, then
   `swarm.test.ts` uses `checkCraft` and drops its copies; `readOnly` in the schema, the cflib console and `swarm.ts`.
2. `docs/requests/P2-drones-vtol-to-driver-cli-servo.md`: Betaflight `servo` and `smix` in the CLI, then the
   tricopter's commands and snippet lines become real (its test changes with them).
3. `docs/requests/P2-drones-vtol-to-driver-calc-defaults.md`: the tricopter's 40 A ESCs (fixture and content in one
   commit) and the optional `hoverLimit` in `calc.ts` with a unit test. Leave the octo's `hoverLimit: 0.7` value to
   the driver (its content is still being written): say so in the answer.
Done when the three requests are answered and `npx vitest run src/lib/dronelab src/lib/drone src/content/drones`
passes.

## Between and after the waves (the driver)

After each wave: `npm run content` and commit the index; `python3 -I figures/tools/cfbuild.py --all` and commit the
built pages; rerun the gate checks (`docs/verify/gate1.md` "How to rerun") and write `docs/verify/gate2.md` after wave
B; update HANDOFF.md and CONTEXT.md §5 with each label's state and run id. **Gate 2** is §6 passing for all 38 items in
English.
