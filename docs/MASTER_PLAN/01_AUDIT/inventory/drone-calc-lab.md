# Drone Lab: calculator, design/pick model, store, CLI emulator, assembly and safety tests, BOM and budget optimiser

**Paths:** `src/lib/drone/**`, `src/lib/dronelab/**`, `src/components/dronelab/**`, `src/app/[lang]/drones/page.tsx`, `src/app/[lang]/drones/[drone]/page.tsx` (plus consumers `src/lib/search/optimize.ts`, `src/lib/search/bom.ts`, `src/lib/flight/from-calc.ts`, `src/lib/server/mcp/tools/drone.ts`, and per-craft data in `src/content/drones/*.ts`, 11,297 LOC).
**Entry points:** `calc()` at `src/lib/drone/calc.ts:151`; `evaluateDesign()` at `src/lib/drone/design.ts:26`; `createDroneLabStore()` at `src/lib/dronelab/store.ts:253`; `runCli()` at `src/lib/dronelab/cli.ts:~235`; page `src/app/[lang]/drones/[drone]/page.tsx:41`; MCP tool `drone_calc` at `src/lib/server/mcp/tools/drone.ts:50`; `optimize()` at `src/lib/search/optimize.ts:112`.
**LOC:** `cat src/lib/drone/*.ts src/lib/dronelab/*.ts src/components/dronelab/*.ts* | wc -l` = 4,919 TypeScript/TSX (incl. tests); with the two route files 5,093. `calc.ts` itself is 344 lines (the brief's "~10k" is mostly fixtures: `wc -l src/lib/drone/__fixtures__/*` = 9,713, of which golden-b.json 5,423 and golden-a.json 2,238). Per-craft content files add 11,297.
**Owner today:** docs/ARCHITECTURE.md §2 (line 109) lists work packages; Drone Lab calc and content were written by the "drone content agent" (ARCHITECTURE.md:158). No human owner named. VERIFIED (grep).

## Purpose

An interactive page per drone craft (13 crafts) where a learner (1) picks a battery, motor and prop from a three-option-each catalogue and sees weight, thrust-to-weight, hover throttle/current, flight minutes, cost and warnings; (2) assembles the craft part by part in an embedded 3D figure; (3) runs bench tests (smoke, motor direction, accelerometer calibration); (4) types Betaflight/INAV/MAVProxy/cflib commands into an emulated console; (5) takes quizzes; (6) flies the result on a simulated range (`/fly`, outside this scope). The same calculator also feeds the shopping BOM, the budget optimiser, the flight range and an MCP tool. VERIFIED (read code).

## Dependencies (imports in, imports out; third-party packages)

- `calc.ts` has zero imports. `design.ts` imports `@/content/schema` types only. VERIFIED (`sed -n 1,5p`).
- `src/lib/dronelab/*` imports content schema, `@/components/dock/types` (LabStore), `@/components/figure/protocol`, `@/lib/progress/keys`, `@/lib/flight/*` (types, `fromCalc`, crash ids, challenge). Note lib imports from components (`store.ts:2-3`, `fly.ts:2`): layering inversion.
- Imported by (calc/design): 13 `src/content/drones/*.test.ts`, `src/content/drones/_checks.ts`, `src/content/schema.ts`, `src/components/dronelab/{data,DesignPanel,FlyWorkspace}`, `src/components/search/RealBuildPanel.tsx`, `src/lib/flight/from-calc.ts`, `src/lib/dronelab/{store,fly}.ts`, `src/lib/server/mcp/tools/drone.ts`, `src/lib/search/optimize.ts` (command: `grep -rln "drone/calc\|from '@/lib/drone" src`, 28 hits).
- Runtime assembly and bench-test physics live in the figure engine `figures/drones/*.js` (5,070 lines, `wc -l figures/drones/*.js`) in an iframe, outside this scope. The React side only reads the state the figure reports. VERIFIED (`src/lib/dronelab/figure.ts:49-93`).
- Third-party: React, Next (`next/navigation`), `zod` (MCP tool only). No physics, units or optimisation library. Test runner vitest 5.0.3.

## Public interfaces (exported functions/types/components/messages, with path:line)

| Export | Path:line | Notes |
|---|---|---|
| `calc(CalcInput): CalcResult` | `src/lib/drone/calc.ts:151` | Pure, O(1) |
| `designChecks`, `verdicts`, `batteryLimitA`, `motorChordMm`, `checkLevel`, constants `HOVER_THR_LIMIT=0.6`, `LIION_CELL_A=45`, `SHORT_FLIGHT_MIN=2` | `calc.ts:~232-330` | 9 check codes |
| Types `CalcModel`, `ThrustRule`, `FlightRule`, `OverRule`, `CalcBattery/Motor/Prop/FixedPart` | `calc.ts:6-110` | Rules are discriminated unions |
| `isDesignPick`, `designInput`, `evaluateDesign` | `src/lib/drone/design.ts:5,17,28` | Only accepts keys already in the craft's catalogue (`Object.hasOwn`) |
| `createDroneLabStore`, `reduce`, `initialState`, `figureInitial`, `cliContext`, `quizScore`, `benchSummary`, `DroneLabAction` (17 action types) | `src/lib/dronelab/store.ts` | Reducer returns `{state, send: HostCommand[]}` |
| `createFlyStore`, `reduceFly`, `flyRules`, `flightCalc`, `flightFaults`, `craftPatch`, `flyPick` | `src/lib/dronelab/fly.ts` | |
| `stepStatus`, `buildComplete`, `testStatus`, `armingRules`, `canArm`, `droneProgressKeys` | `src/lib/dronelab/bench.ts` | Assembly and arming rules |
| `runCli`, `createCliSession`, `cliBanner`, `parseValue`, `unsavedCount` | `src/lib/dronelab/cli.ts` | Pure CLI emulator |
| `readBench`, `holds`, `readPath`, `mergeLog` | `src/lib/dronelab/figure.ts` | Defensive reader of the figure's reported state |
| `readBenchSummary` / `writeBenchSummary` | `src/lib/dronelab/session.ts:15,31` | sessionStorage |
| `optimize`, `evaluate`, `priceLines`, `costRange` | `src/lib/search/optimize.ts` | Budget optimiser |
| MCP tool `drone_calc` | `src/lib/server/mcp/tools/drone.ts:50` | Catalogue keys only |
| Components `DroneWorkspace`, `FlyWorkspace`, `DesignPanel`, `BuildPanel`, `WiringPanel`, `TestsPanel`, `CliConsole`, `QuizPanel`, `KeyboardHelp`, `CraftProgress` | `src/components/dronelab/` | |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Workshop state: one serialisable `DroneLabState` in an in-memory store (`store.ts:253-285`): pick, figure-reported state, tab, CLI session/lines/history, attempted tests, quiz picks. Not persisted by the store itself.
- sessionStorage key `iynk:dronelab:<id>` (`session.ts:7`): hands the bench build (pick, built flag, readiness, saved CLI flight patch) from workshop to `/fly` in the same tab. Per tab, never progress. Content is `JSON.parse`d with only a shallow shape check (`session.ts:15-28`).
- Progress keys (`progressKey.droneBuild/droneTest/droneQuiz/droneCourse`, `bench.ts:~58`) go to the shared progress system (outside scope).
- Room sync: `sync/hydrate` action accepts a host's snapshot (`store.ts:~110`); no server DB tables are used by this subsystem. The optimiser and MCP tool are stateless.
- Catalogues, constants and golden rows are static TypeScript in `src/content/drones/<id>.ts`; there is no per-user project or custom design storage. VERIFIED.

## Current functionality (what VERIFIED works, how you know)

Test run on this commit: `npx vitest run src/lib/drone src/lib/dronelab src/components/dronelab src/content/drones` = 20 files, 842 tests passed, 128 s. VERIFIED.

What the calculator computes (`calc.ts:151-230`), VERIFIED by reading:

| Output | Formula | Constants origin |
|---|---|---|
| Pack voltage V | `cells * 3.7` (nominal, no sag, no resistance) | fixed |
| No-load krpm | `kv * V / 1000` | |
| Thrust per motor (krpm rule) | `k * (sz) * pf * krpm^2`, capped at `overCap` when over-spun (VTOL only) | `k` is one hand-tuned scalar per craft (1.06 quad5, 0.00304 whoop, 550 agrihex, ...) in `models.ts` |
| Thrust (reference rule, swarm) | `grams * (kv/refKv)^2 * pf` | one reference motor point |
| Max current | `n * thrust / (maxGPerW * eff) / V` | `maxGPerW` per craft (1.7 to 4.2 g/W) |
| AUW | sum fixed + n*(motor+prop) + battery + payload | catalogue grams |
| T:W | `n * thrust / AUW` | |
| Hover throttle | `sqrt(AUW / (n * thrust))` (assumes thrust proportional to throttle squared) | |
| Hover current | `AUW / (gPerW * eff) / V` (constant efficiency in g/W regardless of load) | `gPerW` per craft (3.4 to 9.5) |
| Hover min | `usable * Ah / hoverA * 60` | `usable` 0.8 (wing 0.85) |
| "Fly" min | `hoverMin * flyFactor` (0.42 to 0.92) | per-craft fudge |
| Wing cruise | min speed `speedK*sqrt(kg/loadRef)`, drag = weight/(L/D), amps = `kg*g*v/(L/D)/eff/propEff/V` | L/D 6, eff 0.36 fixed |
| VTOL cruise | `AUW*g*speed/(L/D)/eff/V` | |
| "Over" flag | `kv*cells > limit` (or kvCellsPf, maxCells, maxAmps, big) | per-craft limit, e.g. `1750*6*1.15` |
| "Weak" flag | `tw < minTW` | per-craft |
| Cost | sum of catalogue prices; prop priced per pair or each | catalogue |

Design checks added on top of the original (`designChecks`, `calc.ts:~290`): over-spin, weak, cannot-hover (tw<1), hover-high (>0.6 or craft limit), ESC over-current (`maxA/n > escAmps`), battery over-current (C rating or 45 A per Li-ion cell), prop clash (chord vs prop radius, octo only), tail-heavy wing, short flight (<2 min). Only octo has `armRadiusMm`, so prop-clash fires for one craft. VERIFIED (`grep -c armRadiusMm src/content/drones/*.ts` shows one craft; models.ts:136).

Assembly and safety (React side, `bench.ts`): a build step is "done" when the figure-reported state satisfies `step.done`; `buildComplete` needs every step's condition. `armingRules` (`bench.ts:66-83`) yields 5 blocking rules (built, capacitor fault, smoke test, motor check, accel calibration) and warnings (FC arrow reversed, props swapped, other mistakes) plus an always-true throttle rule. A test counts as passed only if the learner ran it and its condition holds (`testStatus`, `bench.ts:~30`). The actual part placement, orientation, smoke and fault physics run inside the figure iframe, so this subsystem trusts what the figure reports. VERIFIED (read); behaviour inside figures NOT audited here.

CLI emulator (`cli.ts`, 667 lines): deterministic, pure reducer over a per-craft settings table (`CliEmulator`: settings, limits, commands, effects, prompt). Four dialects: Betaflight CLI, INAV CLI (`get/set/diff/dump/save/exit/defaults/status/version/mixer/aux/serial/servo/smix/feature/beeper/resource/vtxtable`), MAVProxy (`arm/disarm/mode/param/status`), cflib Python. Values are validated against min/max/lookup limits (`parseValue`, `cli.ts:~195`). Arming-disable flags are only three (RXLOSS, CLI, NO_ACC_CAL, `cli.ts:~147`). Settings tables are firmware-sourced (`docs/facts/quad5.md` cites Betaflight 2026.6.2 `settings.c` etc., line 37-44). It is a hand-written emulator of a subset of commands, not the firmware. `status` fakes voltage as `cells * 4.2` (`cli.ts:~290`). A setting can have an "effect" that patches the flight (angleLimit, boardYaw, tailReverse), linking CLI edits to the range. VERIFIED.

Budget optimiser (`src/lib/search/optimize.ts`): enumerates all batt x motor x prop combinations (27 with 3 options each; `optimize.ts:114-120`), runs the same `designInput` + `calc` + `designChecks` for each, attaches live-offer prices from `priceLines`, rejects builds with any danger check other than "weak" (`UNSAFE`, line 59), requires user minTW and minFlightMin, picks highest headroom then cheapest then fewest swaps. It reuses the calc completely; the only addition is the price source. It cannot add parts outside the catalogue. VERIFIED.

BOM (`src/lib/search/bom.ts`, 390 lines): for each craft a hard-coded `DRONE_PARTS` map from fixed-part id to a free-text shopping query (e.g. quad5 FRAME = "5 inch FPV freestyle frame 225mm carbon"); batt/motor/prop lines come from the catalogue labels. Queries go to store search (Google Shopping etc.). VERIFIED (lines 1-90 read; rest sampled).

## Known defects (with repro or evidence)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | The "445 of 445 calculator tests" claim in HANDOFF.md:104 is not 445 calculator tests. `vitest run src/lib/drone` (substring also matches `src/lib/dronelab`) gives 445 = calc.test 355 + content.test 26 + design.test 3 + cli.test 34 + fly.test 12 + store.test 15. Calculator-only is 384, of which 342 are golden rows. Repro: JSON reporter, per-file `assertionResults` length. | VERIFIED | low (misleading metric) |
| 2 | Wing top speed is `sqrt(static thrust / Cd)` (`calc.ts:~207`): uses static full-throttle thrust at speed, so it is overstated. Test pins 146 km/h for an 8x6 prop wing (`calc.test.ts` wing case). | VERIFIED formula; realism ESTIMATED | medium |
| 3 | Hover current uses constant g/W independent of throttle; real motor efficiency varies strongly with load. Flight time on 25C packs is not modelled (no sag, no internal resistance, no C-rate except Li-ion/cRating). | `calc.ts:~189` | medium |
| 4 | No input validation in `calc`: `mah=0`, zero thrust or negative values give `Infinity`/`NaN`, and `sqrt` of a negative cannot arise only because catalogue data is static. Becomes live the moment user parts exist. | `calc.ts:151-230` read, no guard | high once custom parts exist, low today |
| 5 | Prop-clash check exists for one craft (octo). Quad5 etc. have no `armRadiusMm`, so oversized props never warn. | `models.ts:136` only | medium |
| 6 | `hydrate` takes a room host's `cli` object with only top-level shape checks (`isRecord`, `Array.isArray`) and stores it as `CliSession` (`store.ts:~120-125`). A malicious host can inject arbitrary `values`/`lines` types that the console renders. | VERIFIED read | medium |
| 7 | `readBenchSummary` returns `parsed.flight` and `parsed.cli` objects with no field validation (`session.ts:23-26`); they feed `flightFaults` and `craftPatch`, which copy any numeric key that exists on the craft object (`fly.ts:~190`). Same-tab, self-inflicted only. | VERIFIED | low |
| 8 | Test run needs 128 s for the scoped set (dominated by figure-based craft tests); `_checks.ts` imports a component (`CliConsole`) into content tests. | measured | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Calc constants are per-craft magic numbers (k, gPerW, flyFactor, minTW, limits) copied from a third-party site, not derived from motor/prop data | `src/lib/drone/__fixtures__/models.ts`, duplicated in each `src/content/drones/<id>.ts` `design.model` | `content.test.ts:~70` asserts the two copies are equal; models.ts is a test oracle for itself | high | 3-6 weeks to replace with measured motor/prop curves |
| Duplicate source of truth: constants live in `models.ts` fixture AND in 13 content files, kept in sync by a test | as above | CLAUDE.md "One source of truth" violated | medium | 2 days |
| Golden fixtures come from a regex extractor reading the original's JS source (`extract.py`) and from research markdown tables | `src/lib/drone/__fixtures__/extract.py` | requires the original figure sources (not in repo) as an argument | medium | n/a |
| lib imports components (`LabStore`, `HostCommand`, `CliConsole` in tests) | `store.ts:2-3`, `fly.ts:2`, `_checks.ts` | grep | low | 1 day |
| `DroneWorkspace.tsx` 425 and `FlyWorkspace.tsx` 409 lines, many effects | `src/components/dronelab/` | `wc -l` | low | 3 days |
| Hard-coded Betaflight command help and 26 mixers, features list in cli.ts; INAV/ArduPilot/cflib fidelity thinner than Betaflight | `cli.ts:36-150` | read | medium | ongoing |
| BOM queries are hand-written strings per craft; no part numbers or vendor SKUs | `bom.ts:42-90` | read | medium | 1 week |
| Optimiser enumerates only 3x3x3 catalogue picks | `optimize.ts:114` | read | medium (blocks real use) | depends on part DB |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

Numbers by command above (JSON reporter, `src/lib/drone` + `src/lib/dronelab`): calc.test 355, content.test 26, design.test 3, cli.test 34, fly.test 12, store.test 15.

- **Golden tables (342 rows = 108 golden-a + 234 golden-b), 13 crafts, every battery x motor x prop combination.** The expected values were captured from the original third-party "Drone Engineer" site's own `calc()` on its live page (`docs/research/drone-lab-b-calc-matrix.md:3`, `https://drone-engineer.vercel.app`, per that file). They are NOT hardware measurements and NOT datasheet or bench thrust-stand data. They prove the port is a faithful copy of that site's formulas at printed precision (`calc.test.ts` slack = half a display unit, plus one extra decimal for golden-a). Whether the original site's formulas are physically accurate is untested anywhere in the repo. VERIFIED.
- Four "worked default" tests and about nine design-check tests (`calc.test.ts:~120-226`) use hand-set expectations from the same formulas (e.g. `thrust` 2600 cap, octo chord 520.4 mm = `2*680*sin(pi/8)`): self-consistency. VERIFIED.
- `content.test.ts` checks each craft content file equals the fixture oracle (`models.ts`, `catalogues.json`) and recomputes every combination against the oracle: self-consistency between two copies of the same data.
- `cli.test.ts` (34) and `store.test.ts` (15): behaviour of the emulator against the repo's own expected Betaflight-style output strings; firmware fidelity is not tested against a real Betaflight build. `fly.test.ts` (12): arming rules and fault mapping.
- `src/content/drones/<id>.test.ts` (13 files, via `_checks.ts`): per-craft figure parts, build order, wiring, tests, CLI snippets, courses. Not in the 445.
- No test exercises invalid numeric inputs to `calc`, no property tests, no comparison with external physical references (no manufacturer thrust tables). The optimiser has `optimize.test.ts` (200 lines, outside the 445).

## Performance characteristics

`calc` is closed-form arithmetic, O(1), no allocation beyond one result object: ESTIMATED sub-microsecond to microseconds per call. `optimize` calls it 27 times per run: ESTIMATED negligible; the cost there is network price lookup (outside scope). The scoped vitest suite takes 128 s (MEASURED) because of craft/figure tests. Page weight dominated by the figure iframe (UNKNOWN, not measured).

## Security risks

- `hydrate` and `readBenchSummary` accept partly validated objects from a room host or storage (defects 6 and 7). Rendering is through React so XSS is unlikely; state-corruption and UI confusion are possible. MEDIUM.
- MCP `drone_calc` rejects unknown keys via `isDesignPick` and uses `Object.hasOwn`, which blocks prototype keys (`design.test.ts` covers `toString`). Input strings are capped at 40 chars. Good. VERIFIED.
- Safety tests are client-side and learner-visible: progress credit for tests is decided in the browser from figure-reported state, so it can be forged by any user. Acceptable for a tutorial, not for certification or any grading. UNKNOWN whether the server re-verifies (progress code is out of scope).
- Educational output could be mistaken for engineering sign-off: no disclaimer logic is in `calc`. Real flight safety (battery fire, over-current) is advised only by heuristics. LOW to MEDIUM for a product.
- Provenance and licence: formulas, catalogues and 342 golden rows derive from a third-party site's source/outputs. License terms UNKNOWN; HANDOFF.md:51 states a hackathon rule that code must be written during the hacking period. Flag for the founder. HYPOTHESIS: needs a legal check, not verified here.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

Only catalogue items today. VERIFIED:
1. `designInput` throws on any pick key not in the craft's `design.batts/motors/props` (`design.ts:17-19`), and the UI offers only `<select>`s of those options (`DesignPanel.tsx:70-99`). The MCP tool and optimiser do the same.
2. A user cannot enter a motor KV/weight, a prop diameter or a battery capacity. All catalogue entries are generic labelled classes ("2306 1750KV"), not real SKUs; a full part has only `kv, g, price` for motors and `pf, eff, g, price` for props where `pf` and `eff` are dimensionless factors relative to a reference prop of that craft.
3. The thrust law `k * pf * krpm^2` uses a per-craft scalar `k` that implicitly encodes the reference motor and prop of that craft. A new motor with a different stator or prop size on the same craft has no principled `k`, `pf` or `eff`. So the formula cannot take arbitrary diameters or pitches. The 13 `CalcModel`s are effectively 13 separate regressions.
4. Frame is fixed per craft (fixed parts list, arm radius, CLI table, figure SVG/JS). A user cannot change frame size or motor count; `n` comes from the model.
What is reusable: the `CalcInput` shape is already data (model + fixed + battery + motor + prop), `calc()` has no UI or content dependency, and the checks/optimiser are pure. A builder could call `calc` with a custom input today by constructing a `CalcModel` and parts, but results would be unvalidated outside the 13 calibrated crafts.

## Required refactoring to get there

1. Replace the `k/pf/eff` abstraction with real motor and prop performance data (thrust and current at several throttle or rpm points from manufacturer or test-stand tables, with source and licence per row), interpolated; keep the legacy `ThrustRule` as a fallback for catalogue crafts.
2. Part database with schema: motor (kv, stator size, weight, max current, voltage range), prop (diameter, pitch, blades, Ct/Cp), battery (cells, capacity, C, internal resistance, weight), ESC, frame; store sources. Import path for user-defined parts with validation.
3. Add input validation and unit handling to `calc` (finite, positive, bounds), return typed errors instead of `NaN`/`Infinity`.
4. Model battery sag and load-dependent efficiency; replace `flyFactor` and `gPerW` constants.
5. Generalise `designInput`/`isDesignPick`/`optimize` to accept a free-form parts list (n motors, any frame) rather than catalogue keys; generalise prop-clash to frame geometry for all crafts.
6. Single source for model constants (delete duplicate in `models.ts` after content becomes the source); move golden data to a documented oracle with an external comparison set (thrust-stand data).
7. Move `LabStore`/`HostCommand` types out of components into lib; validate `hydrate` and sessionStorage payloads with zod.
8. Decide provenance of the original-site constants and golden values with a license check.

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend** the pure `calc`/`designChecks`/`optimize` core and the CLI/store/arming logic (clean, pure, well tested against the port), but **replace** the thrust and energy model behind them with data-driven part performance before user-defined drones; the current numbers match a third-party site, not hardware.

## Open questions

- Who owns drone-engineer.vercel.app and is reuse of its catalogue, constants and golden outputs permitted (and compatible with the HackTX rule at HANDOFF.md:51)? UNKNOWN.
- Is the original site's physics validated against any thrust-stand data? UNKNOWN; none in the repo.
- Do `k`, `gPerW` and `maxGPerW` per craft come from a derivation or were they tuned to look plausible? UNKNOWN (`docs/research/drone-lab-b.md` "Design maths" holds them; not read in full here, 3,370 lines).
- Does the server re-verify test passes / progress credit? Out of scope; UNKNOWN.
- What exactly do the figure engines enforce for assembly (orientation, polarity, smoke)? Not audited here (`figures/drones/*.js`, 5,070 lines); sampled only through their reported state in `figure.ts`.
- Sampled, not read in full: `cli.ts` lines 330-667 (command list and structure only), `bom.ts` lines 90-390, `DroneWorkspace.tsx`, `FlyWorkspace.tsx`, `CliConsole.tsx`, `TestsPanel.tsx`, `WiringPanel.tsx`, `QuizPanel.tsx`, `golden-*.json`, `catalogues.json`, 12 of 13 `src/content/drones/*.ts` files.
