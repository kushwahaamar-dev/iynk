# Figure item slices (boards, parts, modules, robotics, drones)

**Paths:** figures/{boards,parts,modules,robotics,drones}/*.js, figures/prompts/*.md, figures/_smoke, figures/flight (relation only), public/figures/**, src/i18n/figures/<lang>.json, scripts/figure-{strings,langs,thumbs}.mjs   **Entry points:** `python3 -I figures/tools/cfbuild.py <kind>/<id>` (figures/tools/cfbuild.py:234 `main`) producing public/figures/<kind>/<id>.html; each page self-registers in `B.board/B.module/B.bench/B.part` (figures/engine/bench.js:20-29)   **LOC:** `cat figures/{boards,parts,modules,robotics,drones}/*.js | wc -l` = 16036 (boards 3444, parts 2799, modules 2548, robotics 2175, drones 5070); prompts 2744 lines in 69 md files; engine it depends on, `cat figures/engine/bench*.js | wc -l` = 2833, `cat figures/engine/*.js figures/tools/*.py | wc -l` = 5240   **Owner today:** "item figure agents" (docs/ARCHITECTURE.md:126); engine files belong to platform / engine:bench / engine:drone (ARCHITECTURE.md:114,120,121)

Item counts (VERIFIED, `ls figures/<kind> | wc -l` and `ls public/figures/<kind>`): 12 boards, 29 parts, 12 modules, 13 robotics benches, 13 drones = 79 item slices, plus 1 flight page = 80 built files (`git ls-files public/figures | wc -l` = 80). Built output is committed: 24 669 406 bytes total (`wc -c public/figures/*/*.html`), 24 MB by `du`; largest uno-r3.html 495 777 bytes.

## Purpose

Each item slice is one JS file that, together with a shared engine, becomes one self-contained HTML page (an isometric, hand-inked 3D figure) that the app embeds in an iframe and talks to over postMessage. Boards, modules, parts and robotics benches run on the "Board Bench" engine (figures/engine/bench*.js). Drones run on the "Drone" engine (figures/engine/drone*.js). The figure shows the object, lets the user take it apart and rebuild it, power it, break it, and run it on a virtual clock. In Board Lab the figure also shows the lesson circuit for the lesson being read. (VERIFIED: figures/boards/uno-r3.js header comment lines 22-34; figures/engine/bench.js:2-7.)

## Dependencies (imports in, imports out; third-party packages)

- Imports in (what a slice uses): there are no ES imports. A slice lists files with `// @cf use ...` directives that cfbuild.py concatenates into one page (cfbuild.py:11-17). uno-r3.js uses `engine/bench.list` (bench.js, bench-kinds.js, bench-bb.js, bench-solve.js, sheets.js, parts/breadboard.js, led.js, resistor.js, wire.js; `figures/engine/bench.list`) plus 19 `parts/*.js` (uno-r3.js:2-20). Page total is 29 scripts (cfbuild output: "uno-r3.html (484 kB, 29 scripts)"). quad5 is 6 scripts (199 kB). VERIFIED by running cfbuild with `--out` into the scratchpad.
- Vendored core: figures/vendor/colorfigures/{core.js,build.py,vendor.py,PATCHES.md}. cfbuild.py parses build.py's HEAD/TAIL with `ast` and applies two string patches (B1, B2) to the TAIL (cfbuild.py:60-70, 96-110). A change upstream breaks the build on purpose ("build.py TAIL changed").
- Imports out (what depends on slices): the app embeds `/figures/<kind>/<id>.html` (docs/ARCHITECTURE.md:100,106; src/components/figure). Content files in src/content/** name figure circuit keys, part ids and fault ids (see Coupling below). src/content tests read figure source with regexes (src/content/boards/uno-r3.test.ts:15-17) and build the page in jsdom through figures/engine/testkit.mjs. figures/flight/build.mjs imports src/content/drones/quad5 and lib/flight, so flight depends on content, not on item slices (figures/flight/build.mjs:20,35).
- Third-party at build time: none. cfbuild.py imports only argparse, ast, json, os, re, sys (cfbuild.py:24-29). VERIFIED.
- Tools for translation and screenshots: scripts/figure-strings.mjs needs playwright and acorn (scripts/figure-strings.mjs:21-23); figures/tools/cfshoot.py imports asyncio and uses a browser (cfshoot.py:19-25; not run).
- Python: `python3 -I --version` = 3.12.6 here. The script uses f-strings and `ast.literal_eval` only, so 3.8+ is probably enough (HYPOTHESIS, not tested on older versions).

## Public interfaces (exported functions/types/components/messages, with path:line)

Slice-facing registration API (global `SL.bench`, no modules):

| API | Where | What it takes |
|---|---|---|
| `B.board(def)` | figures/engine/bench.js:29 | id, pcb outline, `parts[]`, `power`, `modes`, `faults`, `circuits`, `xr`, `tags`, `variants` (uno-r3.js:35-399) |
| `B.module(def)`, `B.bench(def)` | bench.js:29, `B.benchToBoard` bench.js:1236 | a bench = a board + a circuit + programs + tasks |
| `B.part(name, def)` | bench.js:21 | `legs`, `span`, `params`, `elec(p)`, `tag`, `press`, `draw(ctx)`, `show` (parts/ldr.js:36-). Rejected with a note if there is no `draw` function. |
| `B.kind(name, def)` | bench.js:20 | board-level part kinds with `draw(ctx)`; 39 `K(...)` registrations in figures/engine/bench-kinds.js (`grep -c "^K('"` = 39) |
| `SL.drone.define(def)` | figures/drones/quad5.js:50 | layout, frame, design options (battery, motor, prop), harness functions, tests |

Host-facing messages (the real contract with the app). The bridge is figures/engine/embed.js (IN='iynk', OUT='iynk-figure', V=1, embed.js:8). The bench's whitelist of settable keys is `ACCEPT_KEYS` (bench.js:1183): power, pins, mode, exploded, build, remove, restore, fault, matStep, circuit, params, tones, inputs, press, view, select, serial. Notes: `circuit` must be an existing key of the board's own `circuits` object, otherwise the engine answers 'unknown circuit' (bench.js:1204). `fault` is a string such as `short:5V:GND` or `reversed:LED1` (bench.js:1198-1202; uno-r3.js:150 `faults: ['short:5V:GND','short:3V3:GND']`). Origin of postMessage is checked (embed.js:15-20, 23-30).

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

The figure page owns its state in memory only (`st` in bench.js). Nothing is written to localStorage, IndexedDB, a server or a DB by the slices (VERIFIED: `grep -rlE "localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest"` over the five item dirs and figures/engine/*.js returns no files, so the figures make no network calls and store nothing). The host (src/lib/boardlab/store.ts, FigureFrame) owns lesson progress and sends `set` patches. The figure reports small discrete values back with `embed.report`. Translations of figure strings live in src/i18n/figures/<lang>.json (5 files, 4089 lines each for hi and zh, 20 445 total; `wc -l src/i18n/figures/*.json`).

## Current functionality (what VERIFIED works, how you know)

- Build works and is deterministic. `python3 -I figures/tools/cfbuild.py boards/uno-r3 --out <scratch>` produced a file byte-identical to the committed public/figures/boards/uno-r3.html (`cmp` printed identical). VERIFIED.
- Build time per figure: 0.06 to 0.085 s (uno-r3 0.077 s, quad5 0.060 s, ldr 0.070 s, robotics/hc-sr04 0.085 s; `date +%s.%N` around each call). ESTIMATED for all 80: under 10 s, ESTIMATED from 80 x ~0.08 s. I did not run `--all` because it writes to public/figures.
- Tests: `npx vitest run figures` ran 5 files, 105 tests, all passed, 64.6 s (VERIFIED). Counts of `it(` per file: bench.test.mjs 67, bench-solve.test.mjs 16, drone.test.mjs 14, embed.test.mjs 6.
- The bench engine really solves circuits. bench-solve.js builds a nodal network from the breadboard strips, rails, board nets and part legs, with Gaussian elimination and piecewise-linear LED, diode and transistor models (bench-solve.js:1-8, linsolve at :14). A test checks the Blink circuit gives 12.2 mA through 220 Ohm from a 5 V pin (bench-solve.test.mjs:21-24). This is a DC solver; PWM is solved per time slice and averaged (bench-solve.js:6-7). There is no AC, no capacitor charging, no inductor, no I2C or SPI electrical model; those are behavioural modes (see below).
- Programs on boards are not firmware. `modes` are canned JS functions of virtual time returning pin levels, e.g. `blink: { out: (st, t) => ({ D13: blink(t,1,1) }) }` (uno-r3.js:142-147). Real user code runs in a separate interpreter in the host (src/lib/interp) and the host feeds pin levels in with `set {pins}` (bench.js:1191, 1220).

## Known defects (with repro or evidence)

1. Part-level fault modelling for parts without `m.state` is ad hoc: ldr.js:41-43 has a `FAULTS` table of one entry (`overheated: 'burnt'`). Each part invents its own fault table (VERIFIED in ldr.js; pattern across parts not exhaustively checked). Severity low.
2. Circuits cannot be sent over the bridge. `set {circuit}` accepts only a key already in the compiled-in `circuits` object (bench.js:1204). The only way to a new circuit is to edit the slice and rebuild (see Reusability). Severity high for a builder, not a defect for the current catalogue.
3. The uno-r3 slice's own comment admits a gap: "The ULN2003 driver has no breadboard part yet, so the stepper circuit leaves its four signal wires out" (uno-r3.js:158-159). In the same file the stepper circuit then does wire `DRV1.IN1..IN4` (uno-r3.js:302-306 region), so the comment is stale. UNKNOWN which is true on screen. Severity low.
4. Test-time dependency on text layout: the content test finds circuits with `\n {4}'?key'?: \{\n {6}title: ` (src/content/boards/uno-r3.test.ts:17). A reformat of uno-r3.js (tab width, line wrap) makes `figureCircuits` empty and the circuit-key check silently weaker or failing. Severity medium.

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Built output committed (24.7 MB, 80 files) next to its source | public/figures/** | `git ls-files public/figures \| wc -l` = 80; files equal to build output (cmp) | medium: merge conflicts, stale-output risk | 1 day to move to a build step in CI |
| Each page inlines the whole engine (about 200 to 340 KB of shared code per page) | public/figures/boards/*.html | uno-r3.html 495 777 B; 29 scripts inlined by cfbuild.py | medium: no browser caching of the engine across figures; 24 MB total | 2 to 3 days to split engine into a cached script |
| Pinout, nets and caps duplicated in two places: figure `pins`/`parts` and src/content pinout | figures/boards/uno-r3.js:110-117 vs src/content/boards/uno-r3.ts:1987 (`pinout:`, 143 `pin:` rows by `grep -c "pin:"`) | two hand-typed lists linked only by names | high: drift between a lesson and the drawing | 1 to 2 weeks to make one schema |
| Lesson circuit keys = lesson ids; circuit part ids (`RES1`, `LED1`) are referenced from content | figures/boards/uno-r3.js:155 comment "key = lesson id in src/content/boards/uno-r3.ts"; src/content/boards/uno-r3.ts:155 `figure: { part: 'RES1', key: 'ohms' }` | content breaks if either side renames | high | 1 week |
| Every part is hand-written drawing code (`draw(ctx)` with SVG strings), 29 parts in 2799 lines (avg 97) | figures/parts/*.js, e.g. ldr.js:53-112 | no declarative description | high for a builder | see Reusability |
| 39 board-level kinds (chip, dip, qfn, ...) are generic and reused, but still code | figures/engine/bench-kinds.js (`grep -c "^K('"` = 39) | | low (this part is good) | n/a |
| Drone slices are hand-placed 3D coordinates and per-drone functions | figures/drones/quad5.js:11-47, 50-169 | `harness`, `camLead`, `vtxCoax` use literal mm coordinates | medium | per drone |
| Tests cover few items | see Test coverage | | high | 1 to 2 weeks |
| No pinned Python version or CI step for figures | cfbuild.py has no version guard; package.json scripts do not call it (`grep "cfbuild" package.json` empty) | builds are manual | medium | 0.5 day |
| Prompts as "source of truth" for authorship | figures/prompts/*.md (69 files) e.g. uno-r3.md | prompt text describes the figure; only the .js runs | low | n/a |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

- figures/engine/bench.test.mjs, bench-solve.test.mjs, drone.test.mjs, embed.test.mjs: 105 tests passed. Item mentions (`grep -ohE "(boards|parts|modules|robotics|drones)/[a-z0-9-]+" figures/engine/*.test.mjs | sort | uniq -c`): uno-r3 24, esp32-s3-devkitc-1 8, esp32-s3-build 7, nodemcu 6, basys3 5, quad5 4, pico 4, transistor-switch 2, led-resistor 2, piezo-buzzer 2, tb6612fng 2, nucleo-f401re 2, microbit-v2 2, de10-lite 2. Not named in any engine test: nano, uno-r4, esp32-devkitc, pi4-pi5 boards, and most of the 29 parts, 12 modules and 13 robotics benches. (One reference, `parts/flux-capacitor`, is a fixture, not an item.)
- Reference values: the Uno Blink test uses a textbook number, 12.2 mA through 220 Ohm (bench-solve.test.mjs:21-24). 5 V minus an LED drop of about 2 V over 220 Ohm is roughly 13.6 mA; the engine's 12.2 mA follows from its LED model plus the 25 Ohm pin resistance. This is a hand-checkable value but it is derived from the same constants the engine uses (PIN_R=25, bench-solve.js:9), so it is partly self-consistency. ESTIMATED.
- Per-board content tests in src/content/boards/*.test.ts and src/content/drones/_checks.ts load the real built figure in jsdom (`buildFigure`) and check that content ids match figure ids: `uno-r3.test.ts:16-17` (kinds, circuits), `:86` (loads the page and turns the LED round). `_checks.ts:349` does it for every drone id. These are consistency tests between two hand-written sources, not tests against hardware.
- Nothing renders pixels (testkit.mjs header: "Nothing here draws pixels"; canvas getContext is stubbed to null). Visual correctness is untested by CI; cfshoot.py takes screenshots by hand.
- No test checks the geometry of a board against its Eagle file; positions in uno-r3.js are claimed to come from UNO-TH_Rev3e.brd (uno-r3.js:22) with no automated check. DOCUMENTED, not verified.

## Performance characteristics

- Build: 60 to 85 ms per figure (MEASURED, 4 figures). Full 80 build ESTIMATED under 10 s.
- Output size: 204 KB (quad5) to 496 KB (uno-r3) per page, 24.7 MB total. Pages are one request each, inlined, so first load of a figure is 0.2 to 0.5 MB before gzip. UNKNOWN: gzip size and in-browser frame time; I did not run a browser.
- Test suite for figures alone is 64.6 s (MEASURED), mostly jsdom page loads.
- Solver: Gaussian elimination, dense, up to 40 rounds per solve (`ROUNDS = 40`, bench-solve.js:9). Fine for a breadboard of tens of nodes. UNKNOWN for hundreds of nodes; dense O(n^3) is a limit for a large user circuit. ESTIMATED.

## Security risks

- Pages are built from repo files only; no user input reaches the build. cfbuild.py rejects `</script` and `<!--` inside inlined scripts and refuses paths outside figures/ (cfbuild.py:inside, check_script). VERIFIED.
- The bridge checks `ev.source === host`, the origin, a source tag and a version before handling a message (embed.js:23-30). Only whitelisted keys are accepted (bench.js:1183-1187) and unknown keys are refused. Good.
- The `?origin=` query parameter lets a URL name the host origin the figure posts to (embed.js:10-13); it accepts any http(s) origin. A crafted link to a figure page with `?origin=https://attacker` makes the figure post its state to that origin, but only if the page is embedded (host = window.parent) and the parent is that window, so the message goes to the real parent filtered by `target` origin. Net effect: low. Needs checking in a browser. HYPOTHESIS.
- If a future builder lets users supply circuits or part definitions, the draw functions return SVG strings that are inserted into the DOM (`ctx.put(..., s)` with template strings, e.g. ldr.js:104-110). User-supplied text would go into labels and ids. Today the strings are static or numeric, but there is no escaping layer in the part API that I saw (HYPOTHESIS; not audited across all 29 parts).
- Vendored core.js is third-party-derived code (colorfigures) with local patches; license file present (figures/vendor/colorfigures/LICENSE). Not audited.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

Answer: only on catalogue items today. Reasoning with evidence:

1. How a board or part is described. A board is a JS object literal of data (`pcb.outline` polygon in mm, `parts[]` with `kind`, `at` [x,y] mm, `rot`, `size`, `pins[]`, `label`) copied from the vendor's board file (uno-r3.js:35-117). Electrical description is also data: `power.sources`, `power.rails` with `from`, `via`, `reg`, `dropout`, `drop`, `protect`, `burns` (uno-r3.js:118-139), `mcu.needs`, `upload.needs`. Pins and nets are data the engine reads (the solver builds nodes from board nets and header pins). So a board is largely declarative. Positions are hand-typed numbers; there is no importer from KiCad or Eagle (UNKNOWN whether a script produced them; none in figures/tools).
2. Parts have two halves. Electrical model is a small function `elec: p => ({type:'res', ohms, pmax, vmax, lag})` (ldr.js:44); the solver knows only a few types (`res`, `led`, transistor, diode, ...). Geometry is `draw(ctx)`: SVG built by hand in 3D mm with `rod`, `cyl`, `fill` (ldr.js:53-112). There is no data-only way to define a new part. Of the 29 parts, 26 have `elec:` (`grep -n "elec:" figures/parts/*.js figures/modules/*.js | wc -l` = 26, includes modules).
3. Could a new user-defined component render without a hand-drawn slice? A generic fallback exists only at the board level: 39 `kind`s in bench-kinds.js (chip, dip, qfn, soic, female header, box, module, can ...) take size, pins and labels as data. A user part can be shown as a `box`/`module` kind with pin labels (HYPOTHESIS: the `module` and `box` kinds accept arbitrary size/label; I did not render one). On the breadboard, however, a part must be registered through `B.part` with a `draw` function, otherwise `B.part` rejects it (bench.js:21). So a generic "black box with N legs" breadboard part would need new engine code, but the 39 kinds show the intended extension point.
4. Lesson, fault, step ids in figure files. Grep for "lesson" in figures/{boards,parts,modules,robotics,drones}/*.js gives 32 hits, nearly all comments (`grep -c -i lesson` summed = 32). The hard couplings are: (a) circuit keys equal lesson ids (uno-r3.js:155 and src/content/boards/uno-r3.ts has `circuit: 'blink'` ... `'parking'` at lines 172-1857, `grep -n "circuit:"`), (b) circuit part ids such as RES1/LED1/US1 are used by content (`figure: { part: 'RES1', key: 'ohms' }`, uno-r3.ts:155), (c) fault strings like `reversed:LED1` and `short:5V:GND` are written in content (uno-r3.ts:2264-2275 region) and parsed by the engine, (d) modes in robotics benches keep sketch ids from the lessons ("these sketches, which keep their ids", robotics/hc-sr04.js:11). No step ids are hardcoded in the figure code that I found; steps are in content and call `press`/`matStep` with ids the figure publishes (`choiceIds`, bench.js:~1225).
5. Why not arbitrary projects. Circuits cannot be sent in a message; parts need drawing code; the DC solver has no digital/I2C devices (those are `modes`/world models in the host); one page per object kind; no persistence. A user project would need: an accepted `circuit` object in `set`, a generic part type, and a serializer.

What is reusable as-is: the DC solver (bench-solve.js), the breadboard model (bench-bb.js, hole ids like `a10`, strips, rails), the 39 board kinds, the power tree evaluator (rails with `from`/`via`/`reg`), the build-and-refusal flow, the postMessage bridge and its whitelist, cfbuild.py. What is per-item art: all 29 part drawings, each board's silk/trace/positions, drone harness and frame functions, `tags`, `xr` notes.

## Required refactoring to get there

1. Accept `circuit` as data in `set` (validate: part names exist, holes exist, wires reference known pins) and key it by id, not by lesson. Remove the "circuit key = lesson id" rule by letting lessons carry a circuit id and the figure carry a library. (about 3 to 5 days)
2. Add a generic part: "dip-n / sip-n / two-leg" breadboard parts drawn from `legs`, `span`, a body size and a colour, with `elec` chosen from a small named set (resistor, led, diode, switch, source, load). Reuse the `kind` drawing code. (1 to 2 weeks)
3. Split the part contract into a JSON-able description (name, legs, span, params, elec type and constants) and an optional `draw`. The current ldr.js already has these fields separated; only the functions (`elec`, `tag`, `press`) mix data and code. (1 week)
4. One schema for pinouts: generate both src/content `pinout` and the figure's `pins`/`parts` from a single board description, or add a CI check comparing them (the existing test does a regex check for the Uno only). (1 to 2 weeks)
5. Stop committing built output; build in CI with `python3 -I figures/tools/cfbuild.py --all`; split the engine out of each page. (2 to 4 days)
6. Replace regex reads of slice source in tests with the loaded page's `report()` / registry (uno-r3.test.ts:15-17). (1 day)
7. Add tests for the untested items at least as "page loads, no notes, every circuit solves without a refusal". (1 week)

## Recommendation: extend

The engine, solver, breadboard, 39 board kinds and bridge are real and tested (105 passing tests, solver on textbook values); replace nothing, extend by making circuits and generic parts data-driven, and treat the 29 hand-drawn parts as a catalogue library rather than a method to scale to user parts.

## Open questions

- Does the browser frame rate stay acceptable on phones for uno-r3 (496 KB, many SVG parts)? Not measured (no browser run).
- Are the board coordinates in the 12 board files all from vendor CAD, or hand-estimated for non-Arduino boards? Only uno-r3.js claims Eagle origin (line 22); not checked for the other eleven.
- Did figures/prompts/*.md drive generation by an LLM agent, and are they still needed? 69 files, 2744 lines; docs/ARCHITECTURE.md:126 lists "item figure agents" as owner.
- Is the stale comment at uno-r3.js:158-159 (ULN2003 has no breadboard part) correct or is the stepper circuit complete? See Known defects 3.
- How many of the 4089 figure string keys per language (src/i18n/figures/hi.json lines) are still used? scripts/figure-strings.mjs --check does this but needs playwright and was not run.
