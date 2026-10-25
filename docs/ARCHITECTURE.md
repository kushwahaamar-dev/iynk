# SimLab architecture: the binding contract

Owner: architect. Read this, `src/content/schema.ts` and `src/content/ids.ts` before writing any item. The fixed
decisions D1-D14 (docs/hacktx/BASE_ARCHITECTURE.md) win over anything here; the figure formats are
docs/FIGURES-BENCH.md (Board Bench engine) and docs/FIGURES-DRONE.md (Drone engine); my own choices are in
docs/DECISIONS.md.

## 0. Change log (newest first; after 14:00 CDT Oct 24 schema and id changes are additive only)

- v1.9 00:51 CDT Oct 25 (P2-drones-vtol, schema owner in wave B): additive. `schema.ts`: `Goal.led?: string`, the
  CSS colour every drone's LEDs show on the leg to that goal in a swarm show (asked in
  `docs/requests/P2-drones-heavy-to-P2-fun-spray-lightshow.md` item 3). Nothing reads it yet: the registry's
  waypoints and the range's LEDs are `src/lib/flight/**`, and the swarm's goal colours are `swarm.ts`.

- v1.8 00:43 CDT Oct 25 (driver, wave B tail): additive. `schema.ts`: `CliEmulator.readOnly?: string[]`, the cflib
  parameters the firmware only reports (the console answers `AttributeError: <name> is read-only!`). Interpreter:
  `World.onboard`, a map from sensor name to value, set by a world input with `device: { kind: 'onboard', sensor }`
  (temperature in °C, compass in degrees, microphone and light 0-255, touch 1 = touched), kept over a reset or a
  deep-sleep wake, and read by the Pico's `ADC(4)`, the micro:bit's temperature, compass, sound and light level and
  logo, and the ESP32's `temperatureRead()`. The check trace has each PCA9685 channel as a pseudo-pin
  `PCA<hex address>.<ch>`: `servo` in degrees on the Servo library's 544-2400 µs scale for a 0.5-2.5 ms pulse in a
  40-60 Hz frame, else `pwm` duty; off or asleep is `out` 0, fully on `out` 1. Board Lab: `figureState` sends each
  world input's value as `params[input.part].value`, so lesson props follow the sliders. Drone Lab: the Betaflight
  CLI takes `servo` and `smix reverse`, and `save` sends the flight patch `tailReverse`, which `fly.ts` turns into a
  toggle on `servosReversed` (as `boardYaw` 180 toggles `fcReversed`); `CalcModel.hoverLimit?` replaces the
  `hover-high` limit for one model; the flight sim's `flipWhy` and crash cause get `flipServo`, and
  `BREAKS.tricopter` offers `servosReversed`.

- v1.7 Oct 24 (P2-fun): additive, no schema.ts change. Fly page fun (§3.2 item 8): two localStorage keys,
  `simlab:ghost:v1:<craft>:<course>` (your fastest lap as a ghost track, cut from a replay of the session log) and
  `simlab:challenge:v1:<yyyy-mm-dd>` (your best time on that day's challenge). Leaderboard course ids are
  `<craft>-<course>` and `daily-<yyyymmdd>`; `flight.lap` is sent only for non-demo laps flown with nothing broken on
  purpose, `flight.start` on each take-off. Room poses on the fly page are `{ p: [x, y, z], q: [yaw, pitch, roll, 0],
  gate: <course id> }` (degrees). The fly store ignores `sync/hydrate`: each pilot in a room keeps their own build.
- v1.6 Oct 24 (P2-fun): additive, no schema.ts change. D7 settings: `settings.telemetry: boolean` (default true,
  opt-out: the "Share anonymous usage counts" checkbox at the bottom of each lab page), and `settings.sound` now
  defaults to false (BUILD-PLAN §3.1 "off by default"). Old saved documents keep their stored `sound`; a document
  without `telemetry` reads true. `src/lib/telemetry` sends and queues nothing while `telemetry` is false, and drops
  what was queued when it is unticked. Two telemetry kinds: `step.done` `{ key }` (a bench step or a drone's finished
  build) and `search.call` `{ engine }`. The privacy copy (`shell.json` `footer.privacy`, `about.how.privacy`) now says
  "anonymous, opt-out" instead of "no tracking".

- v1.5 Oct 24 (P2-flight): additive schema.ts change for the flight registry (`src/lib/flight/registry.ts`), which
  flies every craft from its content module; `src/lib/flight/crafts/` and `courses/` are gone. `FlightMode` gets
  optional `attitude`, `expo`, `angleLimit`, `rateScale` (an acro gate race is `kind: 'race', attitude: 'acro'`).
  `FlightConfig` gets an optional `look` (`FlightLook`: body, propR, ducted, span, chord, isoScale; the rest is
  derived from `frame` and the default prop). `RangePrim` box, house, cyl and pole get an optional `kind`
  (`RangeHitKind`, what the crash line names). `Goal` gets optional `land` (counts only on touchdown), `hold`,
  `action` (`photo`, `drop`, `spray-on`, `spray-off`, `land`) and `speed` for autopilot missions. `Course` gets
  optional `par` (`ParTimes`: gold, silver, bronze seconds; without it `parOf` derives them from `parS`, which is
  silver), `ceiling`, `ground` and `wind`. Content course ids are the range's course ids, and the course's `kind`
  decides what scores: laps on `gates`, a timed run on `checkpoints`, `missionDone` on `mission`, in every mode.
  `DroneTestKind` gets `'prop-clearance'` (turn each prop by hand inside its duct; P2-drone-prose's cinewhoop test).

- v1.4 18:46 CDT Oct 24 (driver, BUILD-PLAN §3.2 item 5): additive, no schema.ts change. When
  `src/i18n/content/<lang>/<lab>/<id>.json` is missing, the item shows its English prose instead of a 404:
  `getContentProse` (src/i18n/server.ts) returns `{ text, lang }`, the board, bench and craft loaders expose it as
  `textLang`, and the page puts `UntranslatedNotice` (`common.untranslated`) above it. The fallback is per file,
  never per key: a missing key still throws, a bench with incomplete prose is still hidden, and an item with no
  English prose still 404s and fails `npm run content:check`. The dashboard and the Together lobby list such items
  under their English titles.

- v1.3 Oct 24 (P1-checks): additive, no schema.ts change. Checks run as a `CheckJob` (`lessonJob`, `taskJob`) through
  `runChecks`; the UI calls `startChecks`, which runs that in a Web Worker (in-thread where `Worker` is missing) with
  progress and a 20 s budget (`CHECK_BUDGET_MS`), then reports "limit". Board Lab store: `checks.progress`/`checks.limit`
  (optional) and an `input/request` action (re-sends a network request). The Pico W LED net is `WL_GPIO0`. Python
  rclpy adds parameters, `rclpy.executors` and `try_shutdown`; its logger prints `[LEVEL] [name]: msg` (no timestamp).
- v1.2 16:55 CDT Oct 24 (P1-checks): additive. `DeviceModel` network gets an optional `password` (the Wi-Fi
  password the simulated network wants; omitted = open, or the default bench network's password). `RunTrace` gets an
  optional `http` list (requests the world's network inputs sent and the sketch's answers). One check path:
  `src/lib/interp` exports `runHeadless` + `evaluateChecks`; Board Lab, Robotics and the content tests use only these.
  Rule changes in that one evaluator: `pin-toggles.periodMs` is the full period, rising edge to rising edge (what
  every lesson and task was written against); a `pwm` check accepts a pin driven fully low/high as duty 0/1.
- v1.1 14:15 CDT Oct 24 (orchestrator, who owns the architect's files now): `StateCond` is
  `Partial<Record<string, string | number | boolean | null>>` (additive). With `satisfies XContent`, an array of
  steps whose `done` objects name different paths widens to optional-undefined fields. The old Record rejected
  those, so every content module failed to type as `Loader<XContent>` in index.generated.ts. The evaluators read
  only the keys that exist, so behaviour is unchanged. Both `satisfies` and a `const x: XContent` annotation work.
- v1 13:48 CDT Oct 24: first publication. schema.ts, ids.ts, gen-content-index.mjs, this file, DECISIONS.md.
  Aligned with docs/FIGURES-BENCH.md v1 and docs/FIGURES-DRONE.md v1 (figure files own geometry, circuits, build
  rules and the drone wiring sheet; content owns text, lessons, checks and the calc catalogue).

## 1. Module map

```
 src/content/ids.ts ──────────────┐  ids + index metadata (fig, palette, tags, board/modules per bench)
 src/content/schema.ts ───────────┤  the types every item satisfies
 src/content/{boards,robotics,drones}/<id>.ts   one data module per item (default export `satisfies XContent`)
        │  scripts/gen-content-index.mjs (scan) ──▶ src/content/index.generated.ts (lazy registry: loadBoard(id)…)
        │  gen-content-index.mjs --emit <lab>/<id> ──▶ JSON for the figure build (optional SL.content)
        ▼
 src/i18n/content/<lang>/<lab>/<id>.json   item prose (TextKeys)      src/i18n/messages/<lang>/<ns>.json   UI strings
 src/i18n/figures/<lang>.json              figure strings (CF_T, English source string -> translation)
        │
 src/app/[lang]/…  static pages ──▶ lab page = store (src/lib/<lab>/store.ts) + components
        │                                   │ dispatch(action) only (D14b)
        │      ┌────────────────────────────┼──────────────────────────────┬─────────────────┐
        ▼      ▼                            ▼                              ▼                 ▼
 CodePanel  SerialMonitor        FigureFrame (src/components/figure)    LabDock (dock)    src/lib/sound
   │  ▲          ▲                handle.send(type, payload) ─────▶ iframe /figures/<kind>/<id>.html
   ▼  │          │                onEvent(e)  ◀───── ready/part/button/state/labels/flash/focus/error
 src/lib/interp  (arduino-cpp | micropython | python | verilog, virtual clock, devices, checks)
   └─ pins ≤30 Hz ──▶ store ──▶ handle.send('set', {pins}) ;  serial lines ──▶ SerialMonitor
 src/lib/drone/calc.ts  (DroneDesign + pick ──▶ CalcInput ──▶ CalcResult tiles)
 src/lib/flight + src/components/flight ──▶ iframe /figures/flight/range.html  (D9)
 figures/ (vendor core, engine, tools, items) ──cfbuild.py──▶ public/figures/<kind>/<id>.html
```

## 2. Ownership (today's work packages)

| Package | Owns (write only these) |
|---|---|
| architect | src/content/schema.ts, src/content/ids.ts, src/content/index.generated.ts, scripts/gen-content-index.mjs, docs/ARCHITECTURE.md, docs/DECISIONS.md |
| platform | figures/vendor/**, figures/tools/** (cfbuild.py, cfshoot.py, string extraction), figures/engine/embed.js, docs/FIGURES.md, figures/prompts/README.md |
| shell-app | src/app/[lang]/layout.tsx, page.tsx (dashboard), about/**, [...rest]/**, not-found, next.config.ts, package.json scripts, src/components/figure/**, src/components/dock/**, src/lib/progress/**, src/lib/settings/**, src/i18n/*.ts(x), src/i18n/messages/*/common.json, vitest/playwright/eslint config |
| design-system | src/components/ui/**, src/components/shell/** (incl. nav.ts), src/app/globals.css, src/i18n/messages/*/shell.json |
| interpreters | src/lib/interp/** (languages, virtual clock, device models, `checks.ts` evaluating `Check` on `RunTrace`) |
| calc | src/lib/drone/calc.ts, src/lib/drone/__fixtures__/**, src/lib/drone/calc*.test.ts |
| flight | figures/flight/**, public/figures/flight/**, src/lib/flight/**, src/components/flight/**, src/app/[lang]/drones/[drone]/fly/**, src/i18n/messages/*/flight.json |
| engine:bench | figures/engine/bench*.js, figures/engine/sheets*.js, docs/FIGURES-BENCH.md, the Uno R3 figure slice (figures/boards/uno-r3.js) |
| engine:drone | figures/engine/drone*.js, docs/FIGURES-DRONE.md, the quad5 figure slice (figures/drones/quad5.js) |
| ui:boardlab | src/app/[lang]/boards/**, src/components/boardlab/**, src/lib/board/** (store.ts, run glue), src/i18n/messages/*/boardlab.json |
| ui:robotics | src/app/[lang]/robotics/**, src/components/robotics/**, src/lib/robotics/**, src/i18n/messages/*/robotics.json |
| ui:dronelab | src/app/[lang]/drones/** except fly/**, src/components/dronelab/**, src/lib/drone/store.ts, src/lib/drone/cli.ts (CLI emulator), src/i18n/messages/*/dronelab.json |
| sound | src/lib/sound/**, src/components/sound/** (shell-app mounts the provider in the layout) |
| item figure agents | figures/{boards,parts,modules,robotics,drones}/<id>.js, figures/prompts/<id>.md, public/figures/<kind>/<id>.html (built) |
| item content agents | src/content/<lab>/<id>.ts, src/content/<lab>/<id>.test.ts, src/i18n/content/en/<lab>/<id>.json |
| item verify agents | tests/e2e/<lab>-<id>.spec.ts, docs/verify/<lab>-<id>.md |
| translation (per language) | src/i18n/content/<lang>/**, src/i18n/figures/<lang>.json, and <lang> files of namespaces whose owner has finished |
| verification, README | tests/e2e/*.spec.ts (cross-lab), README.md |
| hackathon layer (D14d) | src/app/api/**, src/lib/{server,ai,search,solana,realtime,hw}/**, src/components/{ai,search,solana,realtime,hw}/**, /[lang]/{together,passport,verify} |

Anything else: write a request to docs/requests/<label>.md.

## 3. Content types and who fills them

All in `src/content/schema.ts`. An item module looks like:

```ts
import type { BoardContent } from '@/content/schema';
const board = { lab: 'board', id: 'pico', /* … */ } satisfies BoardContent;
export default board;
```

Rules: only `import type` (the generator loads items with Node type stripping); no enums, no functions, no values
imported at runtime; ids from ids.ts; every prose field is a TextKey (§5); facts from docs/facts/<id>.md with
`sources`. Run `node scripts/gen-content-index.mjs --check` before you finish: it fails on unknown ids, a wrong
`lab`/`id`, or a text key missing from your en JSON.

| Type | What it holds | Filled by |
|---|---|---|
| `BoardContent` | identity, `variants`, `mcu` (part, core, clock, memories, `target` = interpreter int width), `logicVolts`, `power` (inputs with limits and protection, rails, per-pin and total current, brown-out volts), `pinout` (PinRow per pin: header, pin, label, functions, caps, volts, current, net, FPGA pin), `leds`, `controls`, `displays`, `figure` (page + part texts + sheets), `wireables`, `failures`, `assembly`, `lessons`, `serial`, `sources` | board content agent |
| `BoardVariant` | product name, overrides (mcu, power, leds, controls, displays, pinPatch) and `figureVariant` sent as `set {variant}` | board content agent |
| `Lesson` | id, n, level, `language`, `code` (template with `{{p:id}}` / `{{t:key}}` tokens + libraries), `params` (chips, optional figure target), `circuit` (figure circuit key), `world` (inputs with device models + deterministic script), `serial` (baud + sample), `runMs`, `checks`, `pins`, `callouts`, `specs`, texts, `hints`, optional `quiz` | board content agent (Uno R3: the 16 Learn Arduino lessons) |
| `FailureMode` | kind, `trigger` (how the UI causes it), `figure` (bridge command, engine fault ids), `effect` (power, halts, pins, damages, extra mA, serial), title/symptom/explanation/fix | board and bench content agents |
| `BuildStep` | build / break / test step: bridge `action` (or null = by hand), `done` state condition, `fault`, `major` (a quiz follows), texts, `refusal` | board (assembly) and bench content agents |
| `RoboticsContent` | fig, `board`, `modules`, `parts` (= ids.ts ROBOTICS), figure, `power`, `modes` (sketches/positions with code), `steps`, `faults`, `status` (live fields from figure state), `current` (supplies + loads), `tasks` (PracticeTask with solution + checks), `quizzes` (one per major step) | bench content agent |
| `DroneContent` | fig, `class`, `frame` (layout, size, motor positions + spin, must match the figure file), `design` (calc model, fixed parts, batts/motors/props keyed like the figure, default pick, golden rows), `parts` (texts), `build`, `wiring` (connections, same edges as the figure's sheet), `tests`, `firmware` (snippets + CLI emulator), `flight` (physics class + params, modes, FPV, OSD, failsafes), `courses`, `quizzes` | drone content agent |
| `RunTrace`, `Check`, `DeviceModel` | the run record, the checks evaluated on it, the input devices | interpreters implements; content agents use |
| `ItemMeta` (+ BoardMeta, RoboticsMeta, DroneMeta) | fig, palette (the single source of an item's palette), tags | architect (ids.ts) |

Drone calc contract: `CalcInput = { model: design.model, fixed: design.fixed, battery: design.batts[pick.batt],
motor: design.motors[pick.motor], prop: design.props[pick.prop] }` (type `DesignToCalcInput`, implemented as
`designInput` in src/lib/drone/design.ts with `evaluateDesign` and `isDesignPick`). Copy `model`, catalogues,
`fixed` and `default` from src/lib/drone/__fixtures__ (docs/requests/calc.md); `src/lib/drone/content.test.ts`
compares them. The full golden tables stay in those fixtures; `design.golden` may be `[]` or add spot rows.

Figure data vs content data (one source each): geometry, build groups, polarity, removability, circuits, built-in
demo modes, drone build rules and the wiring sheet live in the figure file; everything the host shows or checks
(pinout, text, lessons, checks, failures' explanations, tasks, quizzes, calc catalogue numbers, CLI) lives in the
content module. Shared ids must match exactly: part ids, net names, control ids, circuit keys (= lesson ids), mode
ids, fault ids, design option keys, button ids. The verify agent checks the figure's `ready`/`state` against them.

## 4. Ids

`src/content/ids.ts`: BOARD_IDS (12), ROBOTICS_IDS (13), DRONE_IDS (13), MODULE_IDS, PART_IDS, and
BOARDS / ROBOTICS / DRONES metadata. Robotics benches, in figure order:

| Fig | id | board on the mat | modules | parts |
|---|---|---|---|---|
| 01 | uno-r3-build | uno-r3 (the board itself) | | led |
| 02 | led-resistor | none (USB-C 5 V) | | led, resistor, multimeter |
| 03 | transistor-switch | nano | | tip120, diode-1n4007, tt-motor, aa-holder-4 |
| 04 | esp32-s3-build | esp32-s3-devkitc-1 (the board itself) | | |
| 05 | tb6612fng | nano | tb6612fng | tt-motor, lipo-2s |
| 06 | l298n | nano | l298n | tt-motor, lipo-2s |
| 07 | a4988 | nano | a4988 | nema17, lipo-2s, multimeter |
| 08 | pca9685 | nano | pca9685 | servo-sg90 |
| 09 | mpu6050 | nano | mpu6050 | |
| 10 | hc-sr04 | nano | hc-sr04 | |
| 11 | qtr-8rc | nano | qtr-8rc | |
| 12 | lm2596 | none (2S LiPo) | lm2596 | lipo-2s, tt-motor |
| 13 | pi5-ros2 | pi4-pi5 (variant pi5) | | |

Item ids are kebab-case; lesson, step, task, quiz, test, course and variant ids are kebab-case and unique inside
their item. Figure part ids are the silkscreen designators (FIGURES-BENCH §0); drone part ids are upper case.

## 5. Content JSON key scheme

File: `src/i18n/content/<lang>/<lab>/<id>.json` with `<lab>` = boards | robotics | drones. Nested objects; a
TextKey is the dot path to a string leaf (the shared `t()` walks dot paths). Same keys in every locale; a locale
with no file for an item shows the English file under a notice (v1.4). A string
in item data is treated as a text key when it is one of the top keys or starts with a section prefix below; any
other string is a literal (pin names, part numbers, code, units).

| Key | Used by |
|---|---|
| `title`, `tagline`, `overview`, `sub`, `hint`, `noun`, `practice` | identity (index cards read `title` and `tagline`) |
| `mcu.<companion-part-slug>` | Mcu.companions[].role |
| `power.<inputId>.protection`, `power.rails.<railSlug>`, `power.io` | BoardPower |
| `pins.<header-slug>.<pin-slug>` | PinRow.note (slug: lower case, non-alphanumerics to `-`) |
| `leds.<id>`, `controls.<id>`, `displays.<id>` | notes / effects |
| `parts.<partId>.name`, `parts.<partId>.what` | FigurePart, DronePart |
| `variants.<variantId>` | BoardVariant.note |
| `wireables.<part>.note`, `wireables.<part>.caution` | Wireable |
| `failures.<id>.title`, `.symptom`, `.explanation`, `.fix` (robotics: `faults.<id>.…`) | FailureMode |
| `assembly.<stepId>.title`, `.body`, `.refusal` (robotics: `steps.<stepId>.…`; drones: `build.<stepId>.…`) | BuildStep, DroneBuildStep |
| `lessons.<lessonId>.title`, `.lede`, `.steps.<n>`, `.hints.<n>`, `.specs.<n>.label`, `.specs.<n>.value`, `.pins.<pin>.to`, `.pins.<pin>.role`, `.callouts.<part>`, `.features.<n>`, `.params.<paramId>.label`, `.params.<paramId>.<value>`, `.world.<inputId>`, `.checks.<n>`, `.code.<name>` | Lesson (n is 1-based) |
| `lessons.<lessonId>.quiz.<qid>.q`, `.options.<n>`, `.why` | lesson quiz |
| `modes.<id>`, `status.<id>`, `current.<id>`, `power.label`, `power.ok` | RoboticsContent |
| `tasks.<taskId>.title`, `.brief`, `.hints.<n>`, `.checks.<n>`, `.code.<name>` | PracticeTask |
| `quizzes.<quizId>.<qid>.q`, `.options.<n>`, `.why` | Quiz |
| `design.fixed.<id>`, `design.verdict.over`, `design.verdict.weak`, `design.verdict.ok` | fixed part names; the craft's verdict lines (`verdicts(result)`) |
| `tests.<id>.title`, `.pass`, `.fail` | DroneTest |
| `wiring.<from>-<to>` | DroneWire.note |
| `firmware.<snippetId>.title`, `.explain` | CliSnippet |
| `flight.modes.<id>.title`, `.hint`, `flight.failsafes.<id>`, `flight.controls` | FlightConfig |
| `courses.<id>.title`, `.brief`, `.goals.<n>` | Course |

Code comments: write them as `// {{t:lessons.blink.code.setup}}` so they translate; identifiers stay English.
Text may hold `{name}` placeholders that the UI fills (`{pin}`, `{ma}`); no HTML.

## 6. Progress (D7)

One localStorage key `simlab:v1` = `{ v:1, done, quiz, best, settings }` (store and hooks: src/lib/progress).

| Key | Set when |
|---|---|
| `board:<id>:lesson:<lessonId>` | every check of the lesson passes on the deterministic run |
| `board:<id>:assembly` | the last assembly step's `done` holds |
| `robotics:<id>:step:<stepId>` | the step's `done` holds (break steps: the fault was seen, then cleared) |
| `robotics:<id>:task:<taskId>` | every task check passes |
| `robotics:<id>:quiz:<quizId>` / `drone:<id>:quiz:<quizId>` | answered; `quiz[key] = {score, total}` |
| `drone:<id>:build` | every build step done |
| `drone:<id>:test:<testId>` | the test's `done` holds |
| `drone:<id>:course:<courseId>` | the course was completed; `best[key]` = best time in seconds |

Totals shown as `done/total`: a board card counts its lessons (Uno R3 reads `0/16`, as the original) with assembly
as a separate tick; a bench counts steps + tasks + quizzes; a drone counts build + tests + quizzes + courses. The
dashboard sums the three labs.

## 7. Figure ↔ host contract

Envelope and handshake: colorfigures-guide §2.3 (host → figure `{source:'simlab', v:1, type, …}`, figure → host
`{source:'simlab-figure', v:1, type, …}`), FigureFrame (D11) does hello/ready, origin and source checks, pause on
hide, re-hello on show, theme and locale. `initial` is sent as `set` after every `ready`; the lab store keeps the
full figure state so a re-`ready` gets it all again. Every message goes through `handle.send` (D14b). `set` patches
at most 30 Hz.

**Board Lab** (`/figures/boards/<id>.html`, fields in FIGURES-BENCH §13):
- sends `set {variant}` (requested from engine:bench; fallback `?variant=` on the iframe URL), `set {view: 'board'|'breadboard'|'schematic'|'power'}`, `set {exploded}`, `set {circuit:
  lesson.circuit}`, `set {params: {part: {key: value}}}` (param chips with `figure`), `set {pins}` (run output),
  `set {serial}` (a line printed, TX LED), `set {power}` (source key or null), `set {fault}` (FailureMode.figure),
  `set {select}`, `set {remove|restore}`, `set {press: {id, down}}` (RESET, BOOT, BOOTSEL, buttons A/B, switches),
  `set {build}`; `press {id}` for the bench buttons; `xr`, `labels`, `view {yaw,pitch}`.
- expects `state` (`build`, `power`, `status`, `mode`, `rails`, `fault`, `faults`, `missing`, `selected`,
  `controls`, `boot`, `leds`, `circuit`, `meas`, `serial`) and `part` events (`act: 'part'|'ctl'|'hole'|'pin'`).
  `controls.<id>` and `inputs.<net>` feed world inputs; `status` gates the run (no run unless `running`).

**Robotics Lab** (`/figures/robotics/<id>.html`): the same engine and fields; plus `set {mode}` for instant modes
(jumper, trimpot) and the status panel reads the state keys named by `StatusField.key`. Practice-task checks run on
the host (RunTrace + `state` checks), never inside the figure.

**Drone Lab** (`/figures/drones/<id>.html`, FIGURES-DRONE §10): sends `set {design}`, `set {calc: {V, maxA,
hoverA}}`, `set {sel}`, `set {step}`, `set {add}`, `set {remove}`, `set {run: 'build'|'strip'|'explode'|'plug'|
'unplug'|'smoke'|'motors'|'calibrate'}`, `set {exploded}`, `set {sheet: 'wiring'|null}`, `press {id}` for craft
buttons, and CLI effects (`CliEmulator.effects[].set`). Expects `state` (`fitted`, `total`, `placed`, `next`,
`built`, `plugged`, `powered`, `fault`, `smokeOk`, `motorOk`, `accOk`, `test`, `wrongMotor`, `design`, `flight`,
`log`, `sfx`) and `part` events (3D part or wiring block). `state.flight` goes to the flight page.

**Parts and modules** (`/figures/parts/<id>.html`, `/figures/modules/<id>.html`): opened from the Inspect dialog
on lab pages; `set {params}`, `set {pins}`; reports `selected`.

**Sound**: figures report `sfx {n, name}` (or flash) in state; the host plays it (src/lib/sound) when `n` changes.

## 8. Lesson run flow

```
 chips + template ──render──▶ source ──interp.compile(language, source, mcu.target)──▶ errors → editor + "Stopped"
        │                                                   │ ok
        ▼                                                   ▼
 "Run": figure status must be running ─▶ upload (compile 600 ms + upload 600 ms, TX/RX blink) ─▶ "Running"
        ▼
 virtual clock: each frame advances virtual time by real dt (paused when hidden); delay() is non-blocking,
 millis()/micros() read the virtual clock, interrupts fire on input edges
   inputs: world inputs (inspector sliders, figure `controls`/`inputs`) ─▶ devices ─▶ pin levels/ADC values
   outputs: pin changes ─▶ store ─▶ set {pins} ≤30 Hz ;  Serial.print ─▶ SerialMonitor (baud-paced) + set {serial}
        ▼
 completion: the same source re-runs headless with world.script for runMs ─▶ RunTrace ─▶ checks.ts ─▶ progress
```

The headless run is a pure function of (source, language, target, world.script, runMs) (D14c), so a server can
verify it. Stop resets pins; RESET in the figure restarts at t = 0 and repeats the serial banner.

## 9. Lab page composition

- `/[lang]/boards/[board]`: board overview: FigureFrame (view board, see-through, exploded), PinoutTable (from
  `pinout`, variant switch), power and limits card, LEDs/controls list, AssemblyPanel (steps + Do it + checks),
  FailurePanel ("Break it": triggers, symptom, explanation, fix), Wireables list (Inspect dialog), lessons grid
  with `done/total`, LabDock.
- `/[lang]/boards/[board]/[lesson]`: lesson strip, FigureFrame (breadboard circuit) with view tabs board /
  breadboard / schematic, CodePanel (CodeMirror, chips inline), Run/Stop, SerialMonitor (status, baud, clear),
  Inspector (params, world inputs), Checks list, Hints, Pins and Specs tables, quiz when present, LabDock.
- `/[lang]/robotics/[bench]`: FigureFrame, Bench buttons (steps in order, refusals shown), StatusPanel (status
  fields + current draw total vs supply limit), SerialMonitor, CodePanel (mode code), Practice tasks (editor + Run
  checks), Quiz dialog after each `major` step, LabDock.
- `/[lang]/drones/[drone]`: FigureFrame (bench + wiring sheet tab), Design it (3 selects, 6 tiles, warnings, cost
  table from calc), Build list, Tests, CLI card + emulator terminal, log terminal, Selected part, Fly button, Quiz,
  LabDock.
- `/[lang]/drones/[drone]/fly`: flight component (range iframe, sticks, gamepad, OSD), courses list, LabDock.

## 10. Per-item content checklists (each must be complete before the item is "done")

**Board** (`src/content/boards/<id>.ts` + en JSON + figure file):
- [ ] Pinout: every header pin as a PinRow with the documented label, functions, caps, logic volts, current limit
      and net; 5 V tolerance and strapping/boot pins noted; FPGA pins carry `fpgaPin` (XDC/QSF names).
- [ ] MCU facts (part, core, clock, memory, `target`), power inputs with real limits and protection, rails,
      brown-out voltage, per-pin and total current.
- [ ] Every on-board LED, control and display with the pin that drives it; every control works in the figure.
- [ ] Assembly / power-up sequence in the robotics style: build steps with bridge action, `done` and refusal,
      ending with a power-up check (rails measured, LED pattern, serial banner).
- [ ] At least 4 progressive lessons: io (Blink/I-O), input (button + sensor), analog (PWM/ADC), protocol or
      wireless; Uno R3 = Learn Arduino's 16. Each with editable code that compiles in src/lib/interp, param chips,
      a figure circuit (breadboard + schematic views), world inputs, expected serial, checks that pass with the
      starter code on the scripted run, hints. FPGA boards: a Verilog LED chaser with parameter overrides and a
      switch-to-LED mapping, plus the 7-segment display.
- [ ] Serial: baud and sample lines for every lesson that prints.
- [ ] Wireables: the common sensors/actuators with real connections, supply and level cautions (3.3 V boards).
- [ ] Failure modes that really trigger from the UI: reverse polarity, brown-out, wrong voltage, cold solder,
      plus a removed part (incl. a single SMD part) and the board's own (strapping pin, BOOTSEL, 5 V into 3.3 V).
- [ ] Variants (Uno R4 Minima/WiFi, Pico/Pico 2/Pico W, Pi 4/Pi 5) with their differences.
- [ ] Sources; every TextKey present in en JSON; `--check` clean; figure prompt in figures/prompts/<id>.md.

**Robotics bench** (`src/content/robotics/<id>.ts`):
- [ ] Build-and-break steps in the original order and with its refusals (strip → pick & place → reflow → low THT →
      tall THT → solder → last group → plug → upload → exploded), break steps for each fault with the fix.
- [ ] Faults from the original plus the brief's (reverse polarity, brown-out, wrong voltage, cold solder) where
      the bench can show them.
- [ ] Modes with real code (the original's sketches, defects fixed) and serial lines.
- [ ] Live status fields (RUNNING, pin levels, Powered ON, the bench's own readings) and a current model with the
      supply limit (brown-out when exceeded).
- [ ] Practice tasks as checkable exercises with starter code, a reference solution that passes every check, world
      script and hints (reaction timer with interrupt + debounce + millis(), line follower, arm, …).
- [ ] A quiz after each `major` step (the original's questions, corrected) and an end quiz.

**Drone** (`src/content/drones/<id>.ts`):
- [ ] Full part-by-part build (frame → motors → ESC → wiring → FC → VTX → camera → receiver → battery → props),
      texts for every part, refusals.
- [ ] Live calculations: design catalogue (3 × 3 × 3 options) and model for src/lib/drone/calc, default pick,
      golden rows that reproduce the research tables (corrections listed in DECISIONS.md).
- [ ] The clickable wiring diagram: the figure's wiring sheet (node ids = part ids) and the same connections in
      `wiring` with real pads, protocols and voltages; part texts for every block.
- [ ] Safety tests: smoke stopper, motor direction with props off, accelerometer calibration, plus the craft's own
      (compass, airspeed, CG, elevons, servo, tilt servos, failsafes).
- [ ] Firmware: version, real current CLI / params / cflib snippets per mode and for the build, CLI emulator
      settings, limits, commands and effects.
- [ ] Flight config: physics class and parameters, modes (angle vs acro where it applies), FPV, OSD, failsafes,
      controls; courses (gates or checkpoints or missions) that are visible and reachable.
- [ ] Quizzes; practice text; sources.
