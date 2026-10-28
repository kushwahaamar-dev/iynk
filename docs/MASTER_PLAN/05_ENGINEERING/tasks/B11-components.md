# B11 Components: atomic task packages

Written 2026-10-27 for the build plan step. Plan only: no file under `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Phase goal: add a part without touching the engine. A part editor, the existing 29 part figures and 12 module figures as descriptors, versions and pins, safe art, and packs with a trust ladder.
Scope: F-096, F-098, F-099, F-101, F-104 (path only), F-220; R-131 to R-138. Not in scope: a marketplace (F-103 out of scope) and code-bearing parts (F-102, R-135, blocked until RS-15 has a verdict).
Exit: `npm run check`; `e2e/parts.spec.ts`; CM-16, CM-17 and AR-14 pass. Then Amar's OK.
Depends on phases B4 (Studio Uno slice) and B10 (faults). Through the roadmap chain it also needs B2 (descriptor registry), B3 (storage, runtime, solver), B8 (fidelity registry) and the B5 Studio chrome.
Labels: VERIFIED (read or ran in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. What this phase starts from

Earlier phases have task files: `docs/MASTER_PLAN/05_ENGINEERING/tasks/B2-core-document-netlist.md`, `B3-core-storage-runtime-replay.md`, `B4-studio-uno.md`, `B8-fidelity-live-analog.md` and `B10-faults-any-circuit.md` (B5 to B7, B9 and B12 to B20 are there too). This phase reads those files, not code, for every earlier-phase name, because none of that code is built yet (DOCUMENTED). Where this file and one of those files name the same thing, the earlier file wins and this file adapts (section 4, precondition check). Roadmap rows are used only where those files are silent.

Facts read or run in this step:

| Fact | Evidence | Label |
|---|---|---|
| `src/parts` does not exist today; B2 creates it (`registry.ts`, `descriptor.ts`, `pins.ts`, `fallback.ts`, `browser/load.ts`) | `ls src/parts` fails; roadmap T-B2-11 (line 337) | VERIFIED / DOCUMENTED |
| B2 already ships the validation, registry and fallback contracts that B11 builds on. `src/parts/descriptor.ts`: `type Descriptor`, `validateDescriptor(value, opts?)` returning `DescriptorCheck {ok, diagnostics}`, `BANNED_WORDS`, `digestOf(d)`, `versionCompare(a, b)`. `semantic.ts`: `semanticChecks(d)`, codes `P-S-01` to `P-S-17`. `registry.ts`: `createRegistry(): PartRegistry` with `add/get/latest/versions/list/has/resolveLegacy`. `pins.ts`: `interfaceOf`, `checkPinRules`. `fallback.ts`: `FallbackSpec`, `fallbackSpec`, `placeholderSpec`. `library-check.ts`: `checkLibrary`, `compareInterface`, `placeholderFor` (T-B2-22). `builtin.ts`: `BUILTIN_DESCRIPTORS`, `builtinRegistry()`. `Diagnostic` and `Severity` are in `src/core/result.ts` | `tasks/B2-core-document-netlist.md` T-B2-11 (lines 685-730), T-B2-12 (831-872), T-B2-22 (874-910), `Diagnostic` at line 174 | DOCUMENTED |
| B2 keeps descriptors flat in `src/parts/data/*.component.json` and loads them by static JSON imports in `builtin.ts`. `npm run schema:check` globs that flat folder only (B2 T-B2-12, Integration row). B4 T-B4-10 adds `breadboard.component.json` and B9 T-B9-04 adds `bme280-module.component.json` in the same flat folder. B9's registry coverage test and B10's `registry-sweep.test.ts` glob it too. So B11 descriptors must be flat as well | `tasks/B2` line 863; `tasks/B4-studio-uno.md` lines 134, 455; `tasks/B9-fidelity-chip-engines.md` lines 1045, 1376; `tasks/B10-faults-any-circuit.md` line 1661 | DOCUMENTED |
| B3 puts the archive code in `src/export/zip.ts` (writer, streaming reader, limits) with `iynk.ts` and `iynkz.ts` as the format layers. `readIynkz` refuses `image/svg+xml` assets (PD-14). Database `iynk` version 1 has 19 stores, including `assets` (key sha256, value Blob). The repositories are `src/local/idb-repository.ts` and `memory-repository.ts` (T-B3-22) | `tasks/B3-core-storage-runtime-replay.md` lines 314, 536-560, 656-692, 120 | DOCUMENTED |
| B4's `src/studio/art/fallback.ts` exports `fallbackArt(shape, lod)`, which already draws the five generic renderers. `DocStore.commit(batch: Op[], opts: { label: string; author?: Author })` is the only document writer in Studio | `tasks/B4-studio-uno.md` lines 348, 238-246 | DOCUMENTED |
| B10 T-B10-02 ships one data file `src/sim/faults/data/failure-models.json` (seven records, each with `causeId` and `appliesTo`) and edits `src/sim/registry/entries.ts`. B8 T-B8-22 ships one fidelity entry per file under `src/sim/registry/data/*.json`, with ids such as `model:led.pwl@1` and the id shape `^([a-z0-9-]+:)?[a-z0-9.-]+@[0-9]+$` | `tasks/B10-faults-any-circuit.md` lines 641-660; `tasks/B8-fidelity-live-analog.md` lines 414, 1568-1600 | DOCUMENTED |
| `negative.mjs` holds 44 bad documents (the run prints "44 of 44 bad documents rejected"). B2's prose says 34 | run in this step; `tasks/B2` line 697 | VERIFIED / DOCUMENTED |
| 29 part figures and 12 module figures | `ls figures/parts` (29 `.js`), `ls figures/modules` (12 `.js`) | VERIFIED |
| `PART_IDS` has 21 ids, `MODULE_IDS` has 12; `wire`, `breadboard` and six parts that share an id with a module are the other 8 part files | `src/content/ids.ts:59-72` (modules), `ids.ts:76-98` (parts); `COMPONENT_ECOSYSTEM.md` 3.3 | VERIFIED |
| Distinct physical items besides boards: 21 parts + `breadboard` + 12 modules = 34. `wire` is a project object, not a part. Six items (`hc-sr04`, `mpu6050`, `soil-moisture`, `ssd1306`, `traffic-light`, `uln2003`) have a part figure and a module figure | `COMPONENT_ECOSYSTEM.md` 3.3 (counted); `ls` of both folders | VERIFIED |
| Already converted by earlier phases: Uno (board, B2), LED, resistor, push button, buzzer, potentiometer, SSD1306 (T-B2-12, line 338), breadboard (T-B4-10, line 433). That is 7 non-board items. Left for B11: 34 - 7 = **27 descriptors** (16 parts, 11 modules) | Roadmap lines 338, 433 | DOCUMENTED |
| Nine example descriptors validate and 44 of 44 broken ones are rejected, run today | `cd docs/MASTER_PLAN/04_ARCHITECTURE/schemas/tools && node validate.mjs ../examples/components/*.component.json` (9 VALID); `node negative.mjs` ("44 of 44 bad documents rejected"); `node semantic.mjs` ("semantic checks passed") | VERIFIED |
| Examples that B11 can adopt as starting points: `l298n-module` (id `core.l298n-module`), `mpu6050-gy521` (id `core.gy521-mpu6050`), `ssd1306`, `led-5mm`, `resistor`, `dc-gear-motor`, `bme280-module`, `esp32-devkitc`, `supply-bench-dc` | `schemas/examples/components/` | VERIFIED |
| Schema `simulation` requires `tier`, `status`, `what_it_models`, `not_modelled`; `provenance` requires `license`, `origin`, `created`, `review`; `visual` requires `fallback` | `schemas/component.schema.json` (`$defs.simulation.required`, `$defs.provenance.required`, `$defs.visual.required`) | VERIFIED |
| Model layer kinds in the schema are exactly `element`, `subcircuit`, `builtin`, `logic`, `extension`, `none` | `component.schema.json` `$defs.model.oneOf` titles | VERIFIED |
| Legacy part contract: `B.part(name, {name, fig, legs, span, params, elec, tag, draw})` | `figures/engine/bench.js:21`; `figures/parts/led.js:9-13` | VERIFIED |
| Legacy solver reads 12 element types; the LED slope `rd` is a fixed `.5` | `figures/engine/bench-solve.js:88-113`; `bench-solve.js:102` | VERIFIED |
| LED brightness curve `(I / 13.6 mA)^0.55` is third-party (Learn Arduino lesson) | `figures/parts/led.js:3-4`; `figures/engine/bench-bb.js:211` | VERIFIED |
| Module fault strings today: l298n 7 (`l298n.js:232`), hc-sr04 4 (`hc-sr04.js:189`), mpu6050 (`mpu6050.js:121`), pca9685 4 (`pca9685.js:214`), qtr-8rc (`qtr-8rc.js:218`), a4988 1 (`a4988.js:225`), tb6612fng 2 (`tb6612fng.js:151`), uln2003 2 (`uln2003.js:139`), soil-moisture 1 (`soil-moisture.js:147`), ssd1306 1 (`ssd1306.js:256`), traffic-light 1 (`traffic-light.js:120`). `lm2596.js` has no `faults:` line | `grep -n "faults:" figures/modules/*.js` | VERIFIED |
| Register-level device classes: `Mpu6050` (`src/lib/interp/devices.ts:21`), `Pca9685` (:104), `Ssd1306` (:173), `Lcd1602` (:212), `GenericI2C` (:242), `HcSr04` (:261) | `grep -n "^export class" src/lib/interp/devices.ts` | VERIFIED |
| Figure iframe has no `sandbox` attribute (first-party pages only) | `grep -n sandbox src/components/figure/FigureFrame.tsx` prints nothing; iframe at `FigureFrame.tsx:351` | VERIFIED |
| The planned CSP allows `img-src 'self' data: blob:` and forbids script `unsafe-inline` | `SYSTEM_ARCHITECTURE.md` 7.4 (line 664); `ADR-0405` line 30 | DOCUMENTED |
| Six UI languages: de, en, es, fr, hi, zh; one namespace is six files; namespaces are listed in `src/i18n/namespaces.ts:4` | `ls src/i18n/messages` | VERIFIED |
| Vitest includes `src/**/*.test.{ts,tsx}`, `figures/**/*.test.*`, `scripts/**/*.test.*`; Playwright `testDir: "e2e"`, random port 40000 to 49999 | `vitest.config.mts:12`; `playwright.config.ts:5` | VERIFIED |
| Next.js is 16.4.3 (`AGENTS.md` warns it differs from older versions) | `package.json`; `AGENTS.md` | VERIFIED |
| No zip, sanitiser or IndexedDB wrapper package is in `package.json` today (`fflate`, `jszip`, `dompurify`, `fake-indexeddb`, `idb`: none) | `grep` of `package.json` | VERIFIED |
| The existing LED blink on the Uno gives 12.2 mA with a 220 ohm resistor on D13 in the legacy solver (`PIN_R = 25`, `rd = .5`, `vf = 2.0`) | `figures/engine/bench-solve.test.mjs:20-24`; `bench-solve.js:10` | VERIFIED |

## 2. Decisions this plan makes, and the questions it leaves

Where two design documents disagree, `RECONCILIATION.md` decides and the JSON schema is the contract (RC-37, RC-60). The rows below are places the documents still disagree or are silent. Each has a default so agents can proceed; Amar can overrule at the phase stop.

| # | Question | Sources that disagree | Default in this plan | Label |
|---|---|---|---|---|
| Q1 | The roadmap says model kinds are "ideal, table, curve, piecewise-linear". The schema has six layer kinds and no `curve` or `table` data kind | `IMPLEMENTATION_ROADMAP.md` line 742 against `component.schema.json` `$defs.model` | The schema wins (field and module names are binding). Mapping: ideal and piecewise-linear are `element` layers (the solver's `pwl` mode); table is `logic` (truth table, at most 256 rows); `subcircuit`, `builtin`, `none` are as in the schema. A curve kind needs a schema minor and is **not built**; the editor offers no curve | DOCUMENTED |
| Q2 | Where do custom descriptors live in IndexedDB? `COMPONENT_SCHEMA.md` 4.1 and `COMPONENT_ECOSYSTEM.md` 5.4 say a store `parts` keyed `id@version`. The 19-store list in `SYSTEM_ARCHITECTURE.md` (lines 678-700) and the roadmap ("IndexedDB `assets` for part art; none on the server") have no `parts` store | CS 4.1, CE 5.4 against SYS stores table | Add a 20th store `parts` (T-B11-13, one database version bump). Art and test files go to the existing `assets` store by sha256 | DOCUMENTED |
| Q3 | Pack file: `.iynkpack` with `pack.json` (CS 9.10, CE 7.1, ADR-0207) against "a pack is a `.iynkz`, no new format" (`COMMUNITY.md` 3.8) | CS/CE/ADR against COMMUNITY | `.iynkpack`, as ADR-0207 decides. Projects that carry embedded descriptors (`.iynk`, `.iynkz`) go through the same validator, so there is one path. The archive limits are shared with the `.iynkz` reader (T-B3-05) | DOCUMENTED |
| Q4 | One descriptor can name only one figure in `visual.breadboard.figure`. Six items have a part figure and a module figure | CE 3.3 and Objection 3; examples `mpu6050-gy521` name the module page | `visual.breadboard.figure` names the **part** figure (what the breadboard view draws). The module page goes in the top-level tool key `x_module_figure` (`{id, path, sha256}`; the schema allows top-level `x_*` keys). The Board lab keeps using the module page until B12. The two shipped examples that name the module page stay as design samples; the shipped descriptors in `src/parts/data/` supersede them | HYPOTHESIS |
| Q5 | `wire` has a figure file but is a project object | CE 3.3; R-131 says "29 hand-drawn parts" | `wire` gets no descriptor. The coverage test (T-B11-02a) maps 28 part files + 12 module files = 40 figure files onto 34 descriptors and lists `wire` as exempt with the reason | DOCUMENTED |
| Q6 | A part whose behaviour code exists only inside a figure page (the L298N bridge in `figures/modules/l298n.js:40-60`, power-tree rules in `figures/engine/bench.js`) is not run by the Studio solver. The schema and `schemas/tools/semantic.mjs` (last checks, "status not-modelled-yet but a layer has a model") require every layer of a `not-modelled-yet` part to be `none` | CS 4.8 (`builtin` refs); roadmap B8; `semantic.mjs` | Honesty rule (ASSUMED, Amar may relax): `simulation.status` describes what the **Studio engine runs today**. A layer whose model the Studio cannot run is `{kind: "none", reason}` and the reason names the legacy ref and `file:lines`. The same pointer is stored in the top-level tool key `x_legacy_model: [{ref, path, lines}]`, so B12 and B13 find it and replace the layer when they register the `builtin` ref. A part whose layers are all `none` is `not-modelled-yet`, tier `none`, with `known_gaps` "modelled only in the Board lab figure until B12". A part with at least one runnable layer is `partly-modelled`, tier `T1`, with a test. A test enforces both directions (T-B11-02a). The `builtin` layers in the two shipped examples (`l298n-module`, `gy521-mpu6050`) are therefore rewritten as `none` plus `x_legacy_model` where the ref is not registered by T-B11-05a | ASSUMED |
| Q7 | Export of a pack rewrites the `local.` namespace to the sender's handle (CE 7.2 item 6, a PROPOSAL) | CE 7.2 | Not built. A second import of the same `id@version` with different bytes is refused with both hashes (CS 6.4). Listed under "Not in this phase" | DOCUMENTED |
| Q8 | Roadmap B11 lists 11 tasks and 3 / 5 / 8 weeks. This plan has 28 tasks because the 27 descriptors are split into seven data tasks of at most five descriptors each, and the UI files and the 5-file rule need more rows | Roadmap lines 25 and 747 | Task ids T-B11-01 to T-B11-11 keep the roadmap meaning (some split into letters and digits); T-B11-12 to T-B11-19 are new. Effort ESTIMATED 5 / 8 / 12 weeks. The orchestrator updates roadmap section 1 when Amar accepts this file | ESTIMATED |
| Q9 | A fault-model source of truth: ADR-0208 says the descriptor is authored; B10-02 (`tasks/B10` lines 641-660) put failure models as data in the single file `src/sim/faults/data/failure-models.json` | ADR-0208 against B10-02 | Descriptors own `failure_modes` and `injectable_faults` for parts. T-B11-17 compiles them into the B10 model registry. Where a B10 record and a descriptor describe the same failure (same `causeId`, and an `appliesTo` entry equal to the descriptor id or one of its `legacy_ids`), the descriptor-made model wins and `models.ts` ignores the B10 record. No conversion task touches `failure-models.json`: the serial task T-B11-02d deletes the duplicate records in one commit | DOCUMENTED |
| Q10 | Code-bearing pack: `COMMUNITY.md` 3.8 and CM-16 say the part arrives **disabled** and cannot be enabled before an RS-15 verdict. `PRODUCT_REQUIREMENTS.md` R-137, `COMPONENT_SCHEMA.md` AC-CS-10 and `COMPONENT_ECOSYSTEM.md` AC-CE-16 say the pack is **refused** while code parts are off | CM-16 against R-137 and AC-CS-10 | CM-16, because it is the phase exit gate named by the roadmap: the pack imports, the code part is stored as inert data, shown as "code part not approved", and no function can enable it. Switching to whole-pack refusal is one branch in `readPack` (T-B11-08) if Amar prefers R-137 | DOCUMENTED |

## 3. Task index

Group = parallel group (section 5). Priority P0 blocks the exit gate; P1 is in the gate but another task can proceed without it; P2 can be cut at the stop. Size is ESTIMATED focused agent time: S under 2 h, M 2 to 5 h, L over 5 h.

| ID | Task | Group | Pri | Size | Depends on (this phase) | Roadmap row |
|---|---|---|---|---|---|---|
| T-B11-01 | Descriptor validation context, semantic additions, copy check, CLI, `parts:check` | 1 | P0 | M | none | T-B11-01 |
| T-B11-05a | Model kind resolvers: element, subcircuit, logic, builtin, none; extension always disabled | 1 | P0 | M | none | T-B11-05 (sim half) |
| T-B11-06 | Safe art: SVG and PNG sanitiser, art selection and pin coverage over B2's fallback | 1 | P0 | L | none | T-B11-06 |
| T-B11-12 | Spike RS-15: Worker-kill prototype for code parts (verdict only) | 1 | P1 | M | none | new |
| T-B11-13 | `parts` IndexedDB store, atomic `putMany`, wipe and export hooks | 1 | P0 | M | none | new |
| T-B11-18 | i18n scaffold: namespaces `parteditor`, `partpack`, `partinfo` | 1 | P0 | S | none | new |
| T-B11-02a | Registry additions, app registry, descriptor barrel generator, per-descriptor gates, `part-draft` tool, golden harness | 2 | P0 | L | 01, 05a | T-B11-02 (tool half) |
| T-B11-04a | Part draft model: state, reducer, `toDescriptor`, live validation | 2 | P0 | M | 01 | T-B11-04 (model half) |
| T-B11-07 | Version rules, pinned lookup, upgrade plan (digest, interface and V6 come from B2) | 2 | P0 | M | 01 | T-B11-07 |
| T-B11-17 | Registry entries and failure models generated from descriptors (ADR-0208) | 2 | P1 | M | 01 | new |
| T-B11-02b1 | Convert 5 parts: rgb-led, ldr, fsr402, tmp36, diode-1n4007 | 3 | P0 | L | 02a, 17 | T-B11-02 |
| T-B11-02b2 | Convert 3 parts: npn-2n2222, tip120, multimeter | 3 | P0 | M | 02a, 17 | T-B11-02 |
| T-B11-02c1 | Convert 5 parts: dc-motor, fan, tt-motor, servo-sg90, stepper-28byj48 | 3 | P0 | L | 02a, 17 | T-B11-02 |
| T-B11-02c2 | Convert 3 parts: nema17, lipo-2s, aa-holder-4 | 3 | P0 | M | 02a, 17 | T-B11-02 |
| T-B11-03a | Convert 5 modules: tb6612fng, l298n, a4988, uln2003, pca9685 | 3 | P0 | L | 02a, 17 | T-B11-03 |
| T-B11-03b1 | Convert 3 modules: mpu6050, hc-sr04, qtr-8rc | 3 | P0 | M | 02a, 17 | T-B11-03 |
| T-B11-03b2 | Convert 3 modules: soil-moisture, traffic-light, lm2596 | 3 | P0 | M | 02a, 17 | T-B11-03 |
| T-B11-04b | Part editor shell: identity, pins, groups, footprint, JSON view, save | 3 | P0 | L | 04a, 13, 18, 06, 07, 01, 02a | T-B11-04 (UI half) |
| T-B11-08 | Packs: trust ladder, import with hostile-input limits, export, dialog | 3 | P0 | L | 01, 05a, 06, 07, 13, 18 | T-B11-08 |
| T-B11-09 | Orchestrator runs the layer kinds; "not modelled yet" is an event | 3 | P0 | L | 05a, 07, 02a | T-B11-09 |
| T-B11-02d | Serial: regenerate the descriptor barrel and generated entries; drop duplicate B10 failure-model records | 4 | P0 | S | 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 17 | new |
| T-B11-05b | Ratings, sources, tier and model templates in the editor | 4 | P1 | L | 04b, 05a, 18, 02a | T-B11-05 (UI half) |
| T-B11-14 | Part page: ratings in three slots, sources, validity, gaps, usage in the open project (R-132, R-133) | 4 | P1 | M | 02a, 17, 04b, 18, 05a, 08 | new |
| T-B11-19 | Coverage gate for the 40 figure files, and `provenance:check` | 5 | P0 | S | 02d, 14 | new |
| T-B11-15 | Upgrade preview dialog (diff and golden-trace differences) | 5 | P2 | M | 07, 14, 02a, 18 | new |
| T-B11-16 | Library in the palette: Add part, Import pack, library parts searchable | 5 | P0 | M | 13, 02a, 08, 04b, 17, 18 | new |
| T-B11-11 | `docs/ADD_A_PART.md` and the worked example | 5 | P1 | S | 04b, 05b, 08 | T-B11-11 |
| T-B11-10 | End to end: add a custom part, wire it, simulate it, share it, hostile inputs | 6 | P0 | L | all | T-B11-10 |

## 4. Rules every task obeys

These rules apply to every package below, so the packages do not repeat them. A package row that differs says so.

| Rule | Detail |
|---|---|
| Branch and commit | Work on local branch `build/v1`. One commit per task, authored as Amar Kushwaha, message `B11 T-B11-<id>: <what>`, no `Co-Authored-By` and no "Generated with" line. Never push, never deploy. A push to `main` deploys production on Vercel (roadmap 2.1). |
| Off limits | No production service, no `.env.local` value, ports 3000 and 43117. Verification is keyless on a local build. |
| Precondition check | Before editing, read the earlier phase's task file for the contract you use (`tasks/B2-core-document-netlist.md`, `B3-core-storage-runtime-replay.md`, `B4-studio-uno.md`, `B8-fidelity-live-analog.md`, `B10-faults-any-circuit.md`). Then run `ls` or `grep` on every file from an earlier phase that the task names. If a file or an export is missing or has another signature, keep the earlier phase's name, adapt the new code to it, and write the difference in the commit body. If the gap is large (a whole module missing), stop and report; do not widen the task. A task never re-creates a module, type or function that an earlier phase's task file already defines: it edits or imports it. |
| Next.js | Before naming any Next API read the matching guide in `node_modules/next/dist/docs/01-app/` (`AGENTS.md`). This phase needs only client components loaded through `next/dynamic` with `ssr: false` (guide: `02-guides/lazy-loading.md`) and no new route handler, no `proxy.ts`, no Server Action. |
| Portable code | `src/parts`, `src/project`, `src/sim`, `src/export` import no DOM, no React and no Node built-in (ADR-0014, roadmap line 91; checked by `npx tsc -p tsconfig.portable.json` and `src/architecture.test.ts`). Browser-only code goes in `src/parts/browser/` or `src/components/`. `scripts/*.mjs` may use Node. |
| 5-file rule | At most 5 source files per task. Test files count as zero. A data set of one kind counts as one file (descriptors, test fixtures, one i18n namespace in six languages), but a descriptor task holds at most 5 descriptors. A generated file committed together with its generator counts as zero. Counts are stated in each package. The rule rests on For Amar item 9 |
| Types | `Descriptor` is the type B2 exports from `src/parts/descriptor.ts` (generated from `component.schema.json`). This file writes `ComponentDescriptor` for it and defines no alias. Diagnostics are B2's `Diagnostic` and `Severity` from `src/core/result.ts` (T-B2-02); this file defines no issue type. `Trust` and `ValidateContext` are added to `descriptor.ts` by T-B11-01 and imported by later tasks. The project type is B2's `Project`. If B2 named anything otherwise, use B2's name |
| API contracts | None. This phase adds no HTTP route and no server code (roadmap B11: "APIs: None"). The server never stores a part (RC-24). |
| Permissions | All actions are by the local person on their own device. Imported content is untrusted input at every step. A part that arrives in a room (B7) goes through the same validator on each machine; no remote actor can write the local `parts` store. |
| Observability | No telemetry leaves the browser (D-015, B0). Failures are written to the local `errors` store (F-016, SYS store 11) as `{where: 'parts.<area>', message}` with no descriptor text and no file contents. User-visible reasons are shown in the UI. |
| Verify commands | Abbreviations used in the packages. `TL` = `npm run typecheck && npm run lint`. `V <p>` = `npx vitest run <p>`. `P` = `npx tsc -p tsconfig.portable.json`. `E <spec>` = `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>`. `KL` = `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (the roadmap 2.3 form; use the shorter list the roadmap says remains after T-B0-12). Each package also writes the literal commands. |
| Done means | Typecheck and lint print zero errors; the named tests pass; `git status` shows only the task's files; the commit exists. Not "looks right". |
| Rollback | `git revert <commit>` for the task. Tasks in later groups that depend on it are reverted first. Local tag `phase-B11` after Amar's OK is the phase rollback point. |

## 5. Parallel groups and file ownership

Groups run in order. Tasks in one group touch disjoint files (checked in the ownership table) and can be built by separate agents at once. A group starts after every task of the earlier groups is committed and its verify commands pass. Group 3 has the most fan-out: seven data agents, the editor shell, packs and the orchestrator. Group 4 starts with a serial task, T-B11-02d, that regenerates the shared generated files after all descriptors exist.

| Group | Tasks (run at once) | Starts when | What the group leaves behind |
|---|---|---|---|
| 1 | T-B11-01, T-B11-05a, T-B11-06, T-B11-12, T-B11-13, T-B11-18 | B10 exit gate passed | Validation context and CLI; layer resolvers; art selection; RS-15 verdict file; `parts` store; three i18n namespaces |
| 2 | T-B11-02a, T-B11-04a, T-B11-07, T-B11-17 | Group 1 | Registry additions and the barrel generator; the per-descriptor gate `library.test.ts` (green with any number of descriptors); draft model; version rules; registry and fault models from descriptors |
| 3 | T-B11-02b1, T-B11-02b2, T-B11-02c1, T-B11-02c2, T-B11-03a, T-B11-03b1, T-B11-03b2, T-B11-04b, T-B11-08, T-B11-09 | Group 2 | 27 descriptors; editor shell; packs; orchestrator runs layers |
| 4 | T-B11-02d, T-B11-05b, T-B11-14 | Group 3 | Barrel and generated entries regenerated, duplicate B10 records removed; ratings and templates in the editor; part page |
| 5 | T-B11-19, T-B11-15, T-B11-16, T-B11-11 | Group 4 | The 34 of 34 coverage gate and `provenance:check`; upgrade dialog; library in the palette; docs and worked example |
| 6 | T-B11-10 | Group 5 | `e2e/parts.spec.ts` and the AR-14 case in `e2e/csp.spec.ts` |

Which gate is red when. `src/parts/library.test.ts` (T-B11-02a) checks each descriptor on disk and is green with any number of descriptors, including B2's seven. `src/parts/coverage.test.ts` (T-B11-19) is the only count gate (34 of 34). It does not exist before group 5, so no gate is red before the data lands. `npm run content:check` is red from the first conversion commit in group 3 until T-B11-02d regenerates the barrel; conversion tasks do not run it (their verify commands are listed in each package).

Dependency edges (task: needs). The index in section 3 lists the same edges. 02a: 01, 05a. 04a: 01. 07: 01. 17: 01. 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2: 02a, 17. 04b: 04a, 13, 18, 06, 07, 01, 02a. 08: 01, 05a, 06, 07, 13, 18. 09: 05a, 07, 02a. 02d: 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 17. 05b: 04b, 05a, 18, 02a. 14: 02a, 17, 04b, 18, 05a, 08. 19: 02d, 14. 15: 07, 14, 02a, 18. 16: 13, 02a, 08, 04b, 17, 18. 11: 04b, 05b, 08. 10: all.


### File ownership

One row per file or file set. "Later edit" lists a task in a later group that edits the same file again; the two never run at once.

| File | Task (group) | Later edit |
|---|---|---|
| `src/parts/descriptor.ts` and `src/parts/semantic.ts` (edits of B2's files), `src/parts/copy-check.ts`, `scripts/validate-part.mjs` | T-B11-01 (1) | none |
| `package.json` (scripts `parts:check` and `check`; guarded `content` and `content:check` hook for `scripts/gen-parts-index.mjs`) | T-B11-01 (1) | T-B11-19 (5) adds script `provenance:check` |
| `src/sim/models/kinds.ts` | T-B11-05a (1) | T-B11-09 (3) |
| `src/sim/models/logic.ts`, `src/sim/models/builtins.ts` | T-B11-05a (1) | none |
| `src/parts/art-sanitize.ts`, `src/parts/fallback.ts` (edit of B2's file), `src/studio/art/figure-art.ts` (edit of B4's file) | T-B11-06 (1) | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-15-worker-kill/` (report and prototype; nothing outside this folder) | T-B11-12 (1) | none |
| `src/local/db.ts`, `src/local/stores.ts`, `src/local/parts-store.ts`, `src/local/wipe.ts`, `src/local/export-all.ts` | T-B11-13 (1) | none |
| `src/i18n/namespaces.ts`, `src/i18n/messages/*/parteditor.json`, `partpack.json`, `partinfo.json` (created empty-keyed) | T-B11-18 (1) | `parteditor.json`: 04b (3), 05b (4), 16 (5). `partpack.json`: 08 (3), 16 (5). `partinfo.json`: 14 (4), 15 (5) |
| `src/parts/registry.ts` and `src/parts/builtin.ts` (edits of B2's files), `src/parts/golden.ts`, `scripts/gen-parts-index.mjs`, `scripts/part-draft.mjs`, generated `src/parts/data/index.generated.ts` | T-B11-02a (2) | `golden.ts`: T-B11-15 (5). Barrel: T-B11-02d (4) regenerates it |
| `src/studio/parts/draft.ts` | T-B11-04a (2) | none |
| `src/parts/versions.ts`, `src/project/validate.ts` (only if the loader does not already call `checkLibrary`) | T-B11-07 (2) | none |
| `src/sim/registry/from-descriptor.ts`, `src/sim/registry/entries.ts`, `src/sim/faults/from-descriptor.ts`, `src/sim/faults/models.ts`, `scripts/gen-part-entries.mjs`, generated `src/sim/registry/data/parts.generated.json` | T-B11-17 (2) | `parts.generated.json`: T-B11-02d (4) regenerates it |
| `src/sim/orchestrator.ts`, `src/sim/analog/live.ts`, `src/sim/digital/logic-part.ts` (and `kinds.ts`, above) | T-B11-09 (3) | none |
| `src/parts/data/{rgb-led,ldr,fsr402,tmp36,diode-1n4007}.component.json` and `src/parts/data/tests/<those>.*.json` | T-B11-02b1 (3) | none |
| `src/parts/data/{npn-2n2222,tip120,multimeter}.component.json` and their `tests/` | T-B11-02b2 (3) | none |
| `src/parts/data/{dc-motor,fan,tt-motor,servo-sg90,stepper-28byj48}.component.json` and their `tests/` | T-B11-02c1 (3) | none |
| `src/parts/data/{nema17,lipo-2s,aa-holder-4}.component.json` and their `tests/` | T-B11-02c2 (3) | none |
| `src/parts/data/{tb6612fng-module,l298n-module,a4988-module,uln2003-module,pca9685-module}.component.json` and their `tests/` | T-B11-03a (3) | none |
| `src/parts/data/{gy521-mpu6050,hc-sr04,qtr-8rc}.component.json` and their `tests/` | T-B11-03b1 (3) | none |
| `src/parts/data/{soil-moisture,traffic-light,lm2596-module}.component.json` and their `tests/` | T-B11-03b2 (3) | none |
| `src/components/studio/PartEditor.tsx`, `PinTable.tsx` | T-B11-04b (3) | `PartEditor.tsx`: T-B11-05b (4) |
| `src/studio/router.ts`, `src/components/studio/StudioEntry.tsx` | T-B11-04b (3) | T-B11-14 (4); `StudioEntry.tsx` again T-B11-15 (5) |
| `src/export/pack.ts`, `src/parts/trust.ts`, `src/components/studio/PackDialog.tsx` | T-B11-08 (3) | none |
| `src/export/zip.ts` (only to add an optional `limits` parameter to the reader, if B3's reader lacks one) | T-B11-08 (3) | none |
| `src/parts/data/index.generated.ts`, `src/sim/registry/data/parts.generated.json` (regenerated), `src/sim/faults/data/failure-models.json` (duplicate records deleted) | T-B11-02d (4) | none |
| `src/components/studio/RatingsForm.tsx`, `TruthTableEditor.tsx`, `src/studio/parts/templates.ts` | T-B11-05b (4) | none |
| `src/components/studio/PartPage.tsx`, `src/parts/facts.ts` | T-B11-14 (4) | `PartPage.tsx`: T-B11-15 (5) |
| `scripts/provenance-check.mjs`, `src/parts/coverage.test.ts` | T-B11-19 (5) | none |
| `src/components/studio/UpgradeDialog.tsx` | T-B11-15 (5) | none |
| `src/parts/browser/library.ts`, `src/parts/search.ts`, `src/components/studio/Palette.tsx` | T-B11-16 (5) | none |
| `docs/ADD_A_PART.md`, `src/parts/data/examples/custom-led.component.json` (outside the flat folder on purpose), `CONTRIBUTING.md` (one pointer line) | T-B11-11 (5) | none |
| `e2e/parts.spec.ts`, `e2e/support/parts.ts`, `e2e/csp.spec.ts` (one new case) | T-B11-10 (6) | none |


Source-file count per task (tests excluded; a data set of one kind is one file; generated files committed with their generator count as zero): 01: 5 (`descriptor.ts`, `semantic.ts`, `copy-check.ts`, `validate-part.mjs`, `package.json`). 05a: 3. 06: 3. 12: 0. 13: 5. 18: 4. 02a: 5 (`registry.ts`, `builtin.ts`, `golden.ts`, `gen-parts-index.mjs`, `part-draft.mjs`). 04a: 1. 07: 1 (2 if `validate.ts` needs the `checkLibrary` call). 17: 5 (four modules and `gen-part-entries.mjs`). 02b1: 1 data set of 5 descriptors. 02b2: 1 of 3. 02c1: 1 of 5. 02c2: 1 of 3. 03a: 1 of 5. 03b1: 1 of 3. 03b2: 1 of 3. 04b: 5. 09: 4. 08: 4 (5 if `zip.ts` needs the `limits` parameter). 02d: 1 (`failure-models.json`; the two regenerated files count zero). 05b: 5. 14: 5. 19: 2 (script and `package.json`). 15: 5 (`UpgradeDialog.tsx`, `PartPage.tsx`, `StudioEntry.tsx`, `golden.ts`, `partinfo.json` set). 16: 5. 11: 3. 10: 0 (all test files).

## 6. Task packages

Every package has the BRIEF section 27 fields in four blocks: identity, intent, implementation, verification, delivery. Fields that section 4 covers say "Section 4" or "None" with the reason.

---

### T-B11-01 Descriptor validation context, semantic additions, copy check, CLI

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-01 / Components, `src/parts` (portable) / B11 |
| | priority, size, status | P0, M, not started |
| | dependencies | Phases B2 (T-B2-11 validator, semantic checks and registry; T-B2-04 generated validators; T-B2-12 builtin index). No task in this phase |
| Intent | problem | B2 (T-B2-11) already validates a descriptor: `validateDescriptor(value, opts?)` runs the size cap, the schema, `semanticChecks` (S-01 to S-09, S-11, S-13, S-14, the coverage half of S-10 and the `x-` shape half of S-17), the id rules and a copy check over `BANNED_WORDS = ['validated']`. It does not know who is asking (core, local or imported). It cannot compare against the solver's element list, the builtin list, the installed digests or the cause-id registry. It has no licence, `TODO`, trust-origin or status-honesty rule. Imported parts need all of these at the point of entry, in the browser. This task adds only those pieces to B2's files |
| | target user | Amar and a contributor adding a part; the app itself when it loads a library part or a buddy's pack |
| | user story | As someone adding a part, I run one command and get the first 20 problems with JSON paths, so I fix the file without reading the schema |
| | expected behaviour | `validateDescriptor` keeps B2's signature and gains `opts.ctx?: ValidateContext`; with no `ctx` it behaves as B2 shipped it. The CLI prints every issue with a code and a path and exits 1. A newer schema is refused with B2's `P-NEWER` ("made by a newer iynk"). `npm run parts:check` validates every shipped descriptor and is part of `npm run check` |
| | success metric | 9 of 9 shipped examples pass; every one of the 44 bad documents in `negative.mjs` fails with a code (B2 ports its list as data; this task adds only the ones B2 did not port); a 28.8 KB descriptor validates in a median under 50 ms warm in CI (target under 5 ms, ESTIMATED in `COMPONENT_SCHEMA.md` section 7; this task measures it and records the number) |
| Implementation | existing files | `src/parts/descriptor.ts` and `src/parts/semantic.ts` (T-B2-11; edited here, not re-created); `src/core/result.ts` (`Diagnostic`, `Severity`); `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/tools/semantic.mjs:1-78` (the rules still to port: S-10 solver half, S-12, S-15 digest half, S-17 registry half, the status rule), `validate.mjs:1-13`, `negative.mjs` (44 mutations); `04_ARCHITECTURE/schemas/component.schema.json`; `package.json:9,10,23` (`content`, `content:check`, `check`) |
| | new files | `src/parts/copy-check.ts`, `scripts/validate-part.mjs` |
| | edited files | `src/parts/descriptor.ts` (add `Trust`, `ValidateContext`, `opts.ctx`, `validateDescriptorText`, `formatDiagnostics`; B2's `BANNED_WORDS` moves to `copy-check.ts` and is re-exported), `src/parts/semantic.ts` (add the context-dependent rules below; keep every B2 rule and code), `package.json` (add script `parts:check`; insert `npm run parts:check &&` before `npm run typecheck` in `check`; chain `node scripts/gen-parts-index.mjs` into `content` and `--check` into `content:check` behind the existence guard already used at `package.json:9`, so the hook does nothing until T-B11-02a writes the script). No dependency change. Five source files |
| | modules and signatures | Reused from B2, not redefined: `Diagnostic`, `Severity` (`src/core/result.ts`); `validateDescriptor(value: unknown, opts?)` returning `DescriptorCheck { ok: boolean; diagnostics: Diagnostic[] }`; `semanticChecks`; `digestOf`; `versionCompare`. In this file `ComponentDescriptor` means B2's `Descriptor`. Added to `descriptor.ts`: `export type Trust = 'core' \| 'local' \| 'imported'; export const ORIGIN_OF_TRUST: Readonly<Record<Trust, 'core' \| 'local-user' \| 'imported-pack'>>; export interface ValidateContext { trust: Trust; candidateDigest?: string; installed?: ReadonlyMap<string, string>; solverElements?: ReadonlySet<string>; builtinRefs?: ReadonlySet<string>; causeIds?: ReadonlySet<string> }`; the `opts` of `validateDescriptor` gains `ctx?: ValidateContext` (when given, B2's `opts.origin` is `ORIGIN_OF_TRUST[ctx.trust]`); `export function validateDescriptorText(text: string, opts?: Parameters<typeof validateDescriptor>[1]): DescriptorCheck; export function formatDiagnostics(r: DescriptorCheck, max?: number): string;`. Added to `semantic.ts`: `export function semanticChecks(d: ComponentDescriptor, ctx?: ValidateContext): Diagnostic[]` (second parameter optional, so B2 callers are unchanged). `copy-check.ts`: `export const BANNED_WORDS: readonly RegExp[]; export function copyCheck(d: ComponentDescriptor): Diagnostic[];` (B2's one-word string list becomes this regex list) |
| | data model | Input is the `iynk.component/1` document (`component.schema.json`). Codes keep B2's `P-` prefix. B2 already emits `P-SCHEMA`, `P-SIZE`, `P-NEWER`, `P-DUP-BYTES`, `P-COPY` and `P-S-01` to `P-S-17` (the parts of S-10, S-12, S-15 and S-17 listed below excepted). This task adds: `P-S-10` (solver half), `P-S-12`, `P-S-15` (digest half), `P-S-17` (against `ctx.causeIds`), `P-LICENSE` (R-138), `P-TODO`, `P-TRUST-ORIGIN`, `P-BUILTIN-UNKNOWN`, `P-STATUS-LAYERS`, `P-TEST-TO-WRITE`. No `NEWER-SCHEMA` code is added: B2's `P-NEWER` is that refusal |
| | input and output schemas | Input `unknown` (parsed JSON) or text. Output `DescriptorCheck`. CLI: `node scripts/validate-part.mjs [--trust core\|local\|imported] [--all] [--root <dir>] <file...>`; prints `ok <file>` or `<file>` then `  <code> <path> <message>` lines (first 20), exit 0 or 1. `--all` reads the flat folder `<root>/*.component.json` (default root `src/parts/data`) and nothing else: it is not recursive, so it never reads `src/parts/data/examples/` or `src/parts/data/tests/` |
| | API contracts | None (section 4) |
| | algorithm | Steps 1 to 3 are B2's: size cap (`P-SIZE`), `JSON.parse` (text entry only: `validateDescriptorText` adds the byte-length check and the parse step in front, one `P-SCHEMA` issue with the position on a parse error), `iynk.component/<n>` with n above 1 gives `P-NEWER` and stops, schema (`P-SCHEMA`, first 20 kept, stop if any). 4) `semanticChecks(d, ctx)` keeps B2's rules and adds: S-10 solver half (when `ctx.solverElements` is given, every element in `solver_requires` is in it); S-12 warning when a `simulation` slot is outside a present `manufacturer` range without a rationale that mentions it; S-15 digest half (`ctx.installed.get(id@version)` equal to `ctx.candidateDigest`, else both digests in the message; the `core.` namespace half is B2's); S-17 for `ctx.trust !== 'core'`: every `cause_id` and `symptom_id` is in `ctx.causeIds` or starts with `x-` (without `ctx.causeIds` the rule stays B2's `x-` shape check). 5) `P-STATUS-LAYERS`: status `not-modelled-yet` with a layer that is not `none`, or tier `none` with a layer that is not `none`, or a layer that is not `none` with status `not-modelled-yet` (the `semantic.mjs` rule, both directions). 6) `P-LICENSE`: `provenance.license` empty. 7) `P-TODO`: any string value containing `TODO`. 8) `P-COPY` via `copy-check.ts`: `what_it_models[]` and `not_modelled[]` text (all languages present) matches `\bvalidated\b`, `verified against hardware`, `\baccurate\b`, `\bexact(ly)?\b`, `\breal\b`, case-insensitive. 9) `P-TRUST-ORIGIN`: `provenance.origin` must be `core`, `local-user`, `imported-pack` for `ctx.trust` `core`, `local`, `imported`. 10) `P-BUILTIN-UNKNOWN` warning (not error): trust `imported` and a `builtin` ref not in `ctx.builtinRefs`; the layer will load as `none` (`COMPONENT_SCHEMA.md` 8 rule 5). 11) `P-TEST-TO-WRITE`: a test with `state: 'to-write'` is an error for `core`, a warning otherwise |
| | state transitions | None (pure functions) |
| | validation rules | As the algorithm. Limits: 256 KiB (B2), 32 pins in beginner drafts are enforced by the editor (T-B11-04a), not here |
| | error conditions | Every failure is an issue, never a throw. `validateDescriptorText` never throws on bad input |
| | edge cases | `$schema` key absent; `x_*` top-level keys accepted (schema rule) and copied through; unknown top-level key without `x_` is a `P-SCHEMA` issue; a text object with only `en`; a quantity with `unit: "mA"` is a `P-SCHEMA` issue (closed unit enum); a rating with `used_by_model: none` read by a threshold whose `implemented_as` is `threshold` is S-04 (rule 5 in 4.6); empty `layers` array is a schema issue; a `ctx` with only `trust` set skips every check that needs a missing set |
| | permissions | None (pure) |
| | performance | Compile the Ajv validator once per module load. Typical descriptor under 32 KB. Median warm validation under 50 ms in the test; the test prints the measured number |
| | migration | `package.json` `check` gains one step; `content` and `content:check` gain an inert hook. No data migration |
| Verification | unit tests | B2's `descriptor.test.ts` stays green unchanged. New: `src/parts/descriptor.ctx.test.ts`: the 9 example descriptors pass as `core` with a full `ctx` (9 cases); the mutations of `negative.mjs` that B2 did not port are added in `src/parts/testdata/mutations.ts` and the union with B2's list is asserted to be 44; size 262,145 bytes fails with `P-SIZE`; `schema: "iynk.component/2"` gives `P-NEWER`; imported `core.x` gives `P-S-15`; same `id@version` with a different digest gives `P-S-15` naming both; `TODO` in a rationale gives `P-TODO`; empty `license` gives `P-LICENSE`; local trust with `origin: core` gives `P-TRUST-ORIGIN`; imported unknown builtin gives a warning and `ok: true`; imported part with `visual.breadboard` gives a `P-SCHEMA` issue; non-core `cause_id` outside `ctx.causeIds` and without `x-` gives `P-S-17`; a solver without `capacitor` and a part requiring it gives `P-S-10`; the timing case. `src/parts/semantic.ctx.test.ts`: one case per added rule. `src/parts/copy-check.test.ts`: each banned word, mixed case, a word inside another word ("inexact", "realistic") passes. `scripts/validate-part.test.mjs`: spawn the CLI on a valid and an invalid file, check exit code and the first printed line; `--all --root <temp>` skips an invalid file placed in `<temp>/examples/` and in `<temp>/tests/` and fails on one placed in `<temp>/` itself |
| | integration tests | `src/parts/library.test.ts` is T-B11-02a; this task only guarantees that `node scripts/validate-part.mjs --all` passes on B2's flat descriptors |
| | Playwright | None |
| | fixtures | `src/parts/testdata/mutations.ts` (the mutations B2 did not port); examples are read from `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/` |
| | acceptance | Given a valid example, When I run `node scripts/validate-part.mjs docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/led-5mm.component.json`, Then it prints `ok` and exits 0. Given a descriptor with `simulation.tier` removed, When validated, Then it fails with `P-SCHEMA` at `/simulation` naming `tier`. Given a rationale text "validated against a bench", When copy-checked, Then `P-COPY` is reported with the path. Given a bad file in `src/parts/data/examples/`, When `--all` runs, Then it is not read |
| | observability | The CLI prints to stdout only. The app wrapper (T-B11-13 and T-B11-08) logs the issue codes, not the descriptor text, to the `errors` store |
| | release blockers | A banned-word miss on a shipped descriptor; the CLI failing under Node 24 (see risk below) |
| Delivery | definition of done | Section 4 plus: `npm run parts:check` runs inside `npm run check`; the measured median is written in the commit body |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts scripts/validate-part.test.mjs`; `npx tsc -p tsconfig.portable.json`; `node scripts/validate-part.mjs --all` |
| | docs | `docs/ARCHITECTURE.md` (B2) gets one line under `src/parts`: "`validateDescriptor` in `descriptor.ts` is the only entry that accepts a descriptor from outside". `04_ARCHITECTURE/COMPONENT_SCHEMA.md` 6.2 gets a pointer to `src/parts/semantic.ts` once built (orchestrator, not this task) |
| | rollback | Revert the commit. `check` returns to its old chain |
| | later tasks need | `Trust`, `ValidateContext`, `validateDescriptor(value, { ctx })`, `validateDescriptorText`, `formatDiagnostics`, `copyCheck` (02a, 04a, 08, 13, 16, 17); `Diagnostic` comes from B2 |
| | risk | `scripts/validate-part.mjs` imports `src/parts/descriptor.ts`. This needs Node 24 type stripping and `.ts` import specifiers, which `SYSTEM_ARCHITECTURE.md` AX-03 lists as untested with Turbopack (UNKNOWN). Fallback if the import fails: the CLI shells out to `npx vitest run src/parts/library.test.ts` and prints its output. The agent records which path worked |

---

### T-B11-05a Model kind resolvers

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-05a / Simulation models, `src/sim/models` (portable) / B11 |
| | priority, size, status | P0, M, not started |
| | dependencies | Phases B3 (T-B3-10 clock and units, T-B3-15 device binding, T-B3-17 solver elements), B8 (live analog). No task in this phase |
| Intent | problem | The roadmap says "model kinds: ideal, table, curve, piecewise-linear". The schema has six layer kinds (Q1). Nothing in `src/sim` turns a descriptor layer into something the engine can run, so adding a part would mean editing the engine |
| | target user | The orchestrator (T-B11-09), the conversion tests (02a), the editor templates (05b) |
| | user story | As the engine, I ask a descriptor "what can you run today?" and get a typed answer per layer, never a silent value |
| | expected behaviour | `resolveLayers` returns one `ResolvedLayer` per layer. Anything the engine cannot run becomes `none` with a reason that the UI shows as "not modelled yet" (R-FID-3). `extension` layers are always `none` with reason `extension-disabled` |
| | success metric | Every example descriptor resolves with no throw; each of the 5 `none` reasons is reached by a test; `evalLogic` for a 256-row table runs in under 0.05 ms per call (ESTIMATED) |
| Implementation | existing files | `figures/engine/bench-solve.js:88-113` (the 12 element kinds the solver reads today, VERIFIED); `src/lib/interp/devices.ts:21,104,173,242,261` (device classes); `04_ARCHITECTURE/COMPONENT_SCHEMA.md` 4.8, 4.9; B3 `src/sim/analog/elements.ts` and `src/sim/mcu/bind.ts` (DOCUMENTED, read first) |
| | new files | `src/sim/models/kinds.ts`, `src/sim/models/logic.ts`, `src/sim/models/builtins.ts` |
| | modules and signatures | `kinds.ts`: `export const CODE_PARTS_ENABLED = false as const; export type NoneReason = 'declared' \| 'solver-lacks-element' \| 'unknown-builtin' \| 'extension-disabled' \| 'subcircuit-invalid'; export type ParamScalar = number \| string \| boolean; export interface ModelEnv { solverElements: ReadonlySet<string>; builtins: ReadonlyMap<string, BuiltinImpl>; lookupComponent?: (ref: string, version: string) => ComponentDescriptor \| undefined } ; export type ResolvedLayer = { kind: 'element'; layerId: string; element: string; terminals: Readonly<Record<string, string>>; params: Readonly<Record<string, ParamScalar>> } \| { kind: 'subcircuit'; layerId: string; instances: ResolvedInstance[]; nets: ResolvedNet[] } \| { kind: 'logic'; layerId: string; model: LogicModel } \| { kind: 'builtin'; layerId: string; ref: string; params: Readonly<Record<string, ParamScalar>>; impl: BuiltinImpl } \| { kind: 'none'; layerId: string; reason: NoneReason; detail: string }; export interface ResolveResult { layers: ResolvedLayer[]; runnable: boolean }; export function resolveLayers(def: ComponentDescriptor, instanceParams: Readonly<Record<string, ParamScalar>>, env: ModelEnv): ResolveResult; export function ratingValue(def: ComponentDescriptor, key: string, pick?: 'min' \| 'typ' \| 'max' \| 'value'): number;` `logic.ts`: `export type Bit = 0 \| 1; export type Out = 0 \| 1 \| 'z'; export interface LogicModel { inputs: readonly string[]; outputs: readonly string[]; rows: readonly { when: Readonly<Record<string, 0 \| 1 \| 'x'>>; then: Readonly<Record<string, Out>> }[]; delayNs: number; driveOhms: number } ; export function compileLogic(layerModel: LogicLayerModel, def: ComponentDescriptor): LogicModel; export function evalLogic(m: LogicModel, inputs: Readonly<Record<string, Bit>>): { outputs: Record<string, Out>; matchedRow: number };` `builtins.ts`: `export interface BuiltinImpl { ref: string; domain: LayerDomain; bind: 'i2c-device' \| 'netlist-hook'; make(params: Readonly<Record<string, ParamScalar>>): unknown } ; export const BUILTINS: ReadonlyMap<string, BuiltinImpl>; export function builtinRefsForImport(): ReadonlySet<string>;` |
| | data model | Reads `behaviour.layers[].model`, `ratings.*.used_by_model`, `parameters[]` (with `default`), `simulation.solver_requires`. Writes nothing |
| | input and output schemas | In: a frozen `ComponentDescriptor`, instance parameters (`Record<string, ParamScalar>`), `ModelEnv`. Out: `ResolveResult` |
| | API contracts | None |
| | algorithm | Per layer. `element`: if `layer.model.element` is not in `env.solverElements` give `none/solver-lacks-element` (planned elements in CS 4.9 land here); else resolve each param with `resolveParam`: `from_rating` reads the slot named by `used_by_model` and the `pick` (default `value` if present else `typ`); `by_parameter` maps the instance value (or the parameter default) to a rating key then reads it; a literal `value` is taken as is. `subcircuit`: each instance is an `element` or a `component` pinned `id@x.y.z` looked up with `env.lookupComponent`; depth at most 4, at most 128 instances, a repeated component on the path is a cycle; any failure gives `none/subcircuit-invalid`. `logic`: `compileLogic`; delay quantity converted to integer ns (round half up), `driveOhms` from the layer's `output_drive` rating or 25 ohm (the per-pin value `PIN_R = 25` at `figures/engine/bench-solve.js:10`). `builtin`: ref in `env.builtins` gives `builtin`, else `none/unknown-builtin`. `extension`: `none/extension-disabled` while `CODE_PARTS_ENABLED` is false. `none`: `none/declared` with the descriptor's reason. `runnable` is true when at least one layer is not `none`. `evalLogic`: first row whose `when` matches (every named input equal or `x`) wins; if none matches, every output is `'z'` and `matchedRow` is -1 (the orchestrator turns that into the diagnostic `logic-no-row`; no silent value) |
| | state transitions | None; all functions are pure and deterministic (no clock, no random: `src/sim` lint ban, T-B3-10) |
| | validation rules | Table rows reference only declared inputs and outputs (also schema); duplicate or shadowed rows are reported by `compileLogic` as `shadowedRows: number[]` in a returned `warnings` array |
| | error conditions | `ratingValue` throws `RatingError` when the slot is `none` or the pick is absent (S-04 and S-05 catch this earlier for validated parts). `resolveLayers` itself does not throw |
| | edge cases | Instance parameter missing and no default: layer is `none/declared` with detail naming the parameter. A `measured` slot named by `used_by_model` is read like any other. Logic with 8 inputs and 256 rows. Table with only `x` inputs (always matches) |
| | permissions | None |
| | performance | Resolution happens once per placed instance at run start, not per tick. `evalLogic` allocates no objects in the hot path other than the output record |
| | migration | None. `BUILTINS` initially registers `device:mpu6050@1`, `device:pca9685@1`, `device:ssd1306@1`, `device:hc-sr04@1` and `device:i2c-generic@1`, each delegating to the class that `src/sim/mcu/bind.ts` (T-B3-15) already binds, and `device:bme280@1` if `src/sim/devices/bme280.ts` exists (T-B9-04). Refs whose code lives only in figure pages (`module:l298n-bridge@1`, `power:linear-regulator@1`) are **not** registered (Q6) |
| Verification | unit tests | `src/sim/models/kinds.test.ts`: LED colour by parameter reads `vf` 2.0 for red and 3.0 for blue from `led-5mm`; `from_rating` with `pick: typ`; used-by-model `measured` slot; `capacitor` element gives `solver-lacks-element`; unknown builtin gives `unknown-builtin`; extension gives `extension-disabled` and flipping nothing in the test can enable it (the constant is `as const`); subcircuit with a pinned component, one with a cycle, one nested 5 deep; missing parameter; all 9 examples resolve without a throw. `src/sim/models/logic.test.ts`: NAND truth table (4 rows) all inputs; `x` don't-care; no matching row gives `'z'` and -1; shadowed row warning; 12 ns delay is 12 and 0.5 ns is 1; identical inputs give identical outputs over 1,000 random vectors from a fixed seed. `src/sim/models/builtins.test.ts`: `builtinRefsForImport()` equals the key set of `BUILTINS`; every registered ref's descriptor in the examples resolves to `builtin`, and `module:l298n-bridge@1` does not |
| | integration tests | Covered by T-B11-09 and T-B11-02a |
| | Playwright | None |
| | fixtures | The nine example descriptors; inline NAND and AND descriptors built in the test |
| | acceptance | Given the red `led-5mm` with `color: red`, When resolved, Then the `element` layer has `vf` 2.0 and `terminals` mapping anode and cathode to pins `A` and `K`. Given a descriptor with an `extension` layer, When resolved, Then the layer is `none` with reason `extension-disabled`. Given a NAND table and inputs 1,1, When evaluated, Then output is 0 |
| | observability | `detail` strings are shown in the part page (T-B11-14) and the "not modelled yet" chip tooltip |
| | release blockers | Any path that resolves an `extension` layer to a runnable form |
| Delivery | definition of done | Section 4; `npx tsc -p tsconfig.portable.json` passes |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/models`; `npx tsc -p tsconfig.portable.json` |
| | docs | `docs/FIDELITY.md` (B8) gets a short "layer kinds" table with the Q1 mapping |
| | rollback | Revert the commit; nothing else depends on it until group 2 |
| | later tasks need | `resolveLayers`, `ModelEnv`, `BUILTINS`, `builtinRefsForImport`, `CODE_PARTS_ENABLED` (02a, 05b, 08, 09) |

---

### T-B11-06 Safe art: sanitiser, art selection, pin coverage

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-06 / Parts art, `src/parts` and `src/studio/art` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | Phases B2 (T-B2-11 `src/parts/fallback.ts`: `FallbackSpec`, `fallbackSpec`, `placeholderSpec`), B4 (T-B4-06 `src/studio/art/figure-art.ts` and `src/studio/art/fallback.ts`: `fallbackArt`), B1 (CSP, T-B1-13). No task in this phase |
| Intent | problem | A part from a buddy can carry artwork. Today a figure page is executable HTML in an iframe with no `sandbox` attribute (`src/components/figure/FigureFrame.tsx:351`, VERIFIED). Custom art must never reach the page as markup (SYS 7.2 item 3, ADR-0204) |
| | target user | Amar, and any friend whose pack he opens |
| | user story | As someone opening a buddy's part, I see its picture, and a planted script in that picture does nothing |
| | expected behaviour | SVG is parsed by a strict allow-list tokenizer and re-serialised from tokens; anything else is dropped or refused. PNG is checked, not decoded. Art is rendered only through `<img>` with a `data:` or `blob:` URL (allowed by the planned `img-src`, SYS 7.4). A part with no usable art draws with one of five generic renderers (B2 lays them out as a `FallbackSpec`, B4's `fallbackArt` draws them) whose pin positions are the wiring targets |
| | success metric | 0 of ~45 hostile samples leave a forbidden construct in the output; sanitiser is idempotent on every positive sample; 256 KiB SVG sanitised in under 50 ms (ESTIMATED); every example descriptor passes `pinsCovered` |
| Implementation | existing files | `src/components/figure/FigureFrame.tsx:351` (the one iframe; unchanged); `COMPONENT_SCHEMA.md` 4.13 (fallback contract, "pin falls outside the figure's bounds by more than `dimensions.accuracy`"); `src/parts/fallback.ts` (B2: `FallbackSpec`, `fallbackSpec`, `placeholderSpec`) and `src/studio/art/figure-art.ts` (B4: `createArtProvider`, `loadFigureArt`), both read first with their exports kept; `src/studio/art/fallback.ts` (B4: `fallbackArt(shape, lod)`, read only: it already draws the five renderers, so this task adds no drawing code) |
| | new files | `src/parts/art-sanitize.ts` |
| | edited files | `src/parts/fallback.ts` (extend B2's `FallbackSpec` with `bounds_mm` and add `pinsCovered` and `selectArt` over it; `fallbackSpec`'s layout code is unchanged); `src/studio/art/figure-art.ts` (render asset art through `<img>`, refuse a figure for non-core, build B4's `ResolvedPartShape` from the `FallbackSpec` in one function) |
| | modules and signatures | `art-sanitize.ts`: `export const ART_LIMITS: { readonly svgBytes: 262144; readonly pngBytes: 524288; readonly pngMaxPx: 2048; readonly depth: 32; readonly elements: 2000; readonly attributesPerElement: 24 }; export type ArtError = 'too-big' \| 'not-xml' \| 'doctype' \| 'entity' \| 'cdata' \| 'processing-instruction' \| 'depth' \| 'too-many-elements' \| 'root-not-svg' \| 'no-viewbox' \| 'empty' \| 'png-signature' \| 'png-header' \| 'png-too-large' \| 'png-truncated'; export type SanitizeSvgResult = { ok: true; svg: string; removed: { elements: string[]; attributes: string[] } } \| { ok: false; error: ArtError }; export function sanitizeSvg(input: string): SanitizeSvgResult; export type PngCheck = { ok: true; width: number; height: number } \| { ok: false; error: ArtError }; export function checkPng(bytes: Uint8Array): PngCheck; export function svgToDataUrl(svg: string): string;` `fallback.ts` (B2's `FallbackSpec`, `fallbackSpec` and `placeholderSpec` stay; this task adds `bounds_mm: { w: number; h: number }` to `FallbackSpec`, computed as the union of `body_mm` and the pin extents, and): `export type ArtChoice = { kind: 'figure'; figure: { kind: 'part' \| 'module' \| 'board'; id: string; path: string } } \| { kind: 'asset'; mediaType: 'image/svg+xml' \| 'image/png'; sha256: string; path: string } \| { kind: 'fallback'; spec: FallbackSpec }; export function pinsCovered(def: ComponentDescriptor, spec: FallbackSpec): { ok: boolean; outside: string[] }; export type HasAsset = (sha256: string) => boolean; export function selectArt(def: ComponentDescriptor, trust: Trust, hasAsset: HasAsset): ArtChoice;`. `hasAsset` is synchronous by design: the assets live in IndexedDB, so T-B11-16's `PartLibrary` loads the set of asset hashes in `init()` and exposes `hasAsset(sha256): boolean`; `figure-art.ts` passes `library.hasAsset`. There is no `FallbackGeometry` type |
| | data model | Reads `visual.fallback {renderer, label, body_colour, show_pin_labels}`, `visual.assets[] {path, media_type, sha256, license, attribution}`, `visual.breadboard.figure`, `pins[].position`, `dimensions.accuracy` (default 0.3 mm) and `FallbackSpec` (B2). Positions are millimetres in the part frame, origin bottom-left, +y up |
| | input and output schemas | `sanitizeSvg(string)` to result; `checkPng(bytes)` to result. Allowed SVG elements: `svg g path rect circle ellipse line polyline polygon text tspan title desc defs linearGradient radialGradient stop`. Allowed attributes: `viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill stroke stroke-width stroke-linecap stroke-linejoin opacity fill-opacity stroke-opacity offset stop-color stop-opacity gradientUnits id font-size font-family text-anchor`. Values must match a per-attribute pattern; `fill` and `stroke` accept a colour, `none`, or `url(#id)` with a local id only |
| | API contracts | None |
| | algorithm | Tokenize by scanning `<` to `>`; no regex over the whole input. Reject `<!DOCTYPE`, `<!ENTITY`, `<![CDATA[`, and any `<?` except a leading `<?xml ...?>`, which is dropped. Comments are dropped. Reject depth over 32, over 2,000 elements, over 24 attributes on one element. An element not on the allow-list is dropped with its whole subtree. An attribute not on the allow-list, or whose value fails its pattern, is dropped; `style`, `class`, every `on*`, `href`, `xlink:href` are always dropped. Unquoted attribute values are `not-xml`. Text is kept only inside `text tspan title desc`; the entities `&amp; &lt; &gt; &quot; &apos;` are decoded, any other `&...;` is `entity`. The result is built only from accepted tokens, with a fixed `xmlns` on the root, so no input byte is copied through. The root must be `svg` with a `viewBox`. A final self-check searches the output for `<script`, `\bon\w+=` (word boundary, so ordinary text such as "nonce=" inside a `<text>` node does not cause a `not-xml` refusal), `javascript:`, `foreignObject`, `<iframe`, `<object`, `<embed`, `<image`, `<use`, `<style`, `href`, case-insensitive; a hit is a defect and returns `not-xml`. `checkPng`: 8-byte signature, IHDR first chunk, width and height each at most 2,048, size at most 512 KiB, the stream ends with an IEND chunk; the bytes are not re-encoded. `fallbackSpec` (B2) already lays out the five renderers; this task only fills `bounds_mm`. `pinsCovered`: every descriptor pin id has a pin in the spec; a pin with an explicit `position` lies within `dimensions.accuracy` of the spec pin; every spec pin lies inside `bounds_mm` grown by `dimensions.accuracy`; pins that fail are returned by id. `selectArt`: `trust === 'core'` with `visual.breadboard.figure` gives `figure`; else the first `visual.assets[]` entry that is SVG or PNG and for which the synchronous `hasAsset(sha256)` is true gives `asset`; else `fallback`. A non-core descriptor never yields `figure`, even if the file claims one |
| | state transitions | None |
| | validation rules | Asset `sha256` must equal the hash of the bytes (checked by the caller, T-B11-08 and T-B11-13). `text/html` assets are refused for non-core (schema) and ignored here |
| | error conditions | `ArtError` values; the UI shows "this picture was refused: <reason>" and falls back to the generic drawing. A refused picture never blocks saving the part |
| | edge cases | RTL override characters inside `text` stay text. A `<text>` with 100,000 characters is cut at 2,000. SVG with `width` in `mm`: kept as a number pattern only. Gradient `id` collisions between two parts: ids are prefixed with the asset's first 8 hash characters when rendered |
| | permissions | None |
| | performance | Linear time and memory in input size. The renderer re-sanitises SVG at read time (cheap, and a second line of defence if the store was written by something else). Cache the data URL per sha256 |
| | migration | None |
| Verification | unit tests | `src/parts/art-sanitize.test.ts`: a table of about 45 hostile inputs, each must either return `ok: false` or an output with none of the forbidden constructs: `<script>`; script inside CDATA; `<ScRiPt>` mixed case; `onload`, `onclick`, `onerror` attributes; `<svg/onload=...>`; `javascript:` in `href`; `<a href>`; `<foreignObject>` with HTML; `<use href="http://...">`; `<image href="data:text/html,...">`; `<style>@import url(...)</style>`; `style="background:url(//evil)"`; `<animate attributeName="href" values="javascript:...">`; `<set>`; billion-laughs DOCTYPE; `<!ENTITY x SYSTEM "file:///etc/passwd">`; `&#x3C;script&#x3E;` numeric entities; `<?xml-stylesheet?>`; `xlink:href`; `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`; NUL bytes; unquoted attribute; unclosed tags; 10,000-deep nesting; 2,001 elements; 300 KiB input; `fill="url(http://evil/x)"`. Positive cases: a hand-inked style SVG with paths, gradients and text sanitises to an exact expected string; every positive is idempotent (`sanitizeSvg(sanitizeSvg(x).svg).svg` equals the first output). PNG: valid 1x1, bad signature, 4,096 px wide, truncated before IEND, 600 KiB. `src/parts/fallback.test.ts` (B2's tests stay): `bounds_mm` contains every pin for one fixture per renderer; `pinsCovered` is ok for all nine examples; a pin 2 mm outside a 0.3 mm accuracy is reported by id; `selectArt` with trust `imported` and a `visual.breadboard.figure` never returns `figure`; with trust `core` it does; `hasAsset` is called synchronously (a function returning a `Promise` fails the type check) |
| | integration tests | `src/studio/art/figure-art.test.ts` (jsdom): an asset choice renders one `<img>` with a `data:image/svg+xml` source and no inline `<svg>` in the DOM; the sanitiser runs on read even when the stored bytes are dirty |
| | Playwright | The AR-14 browser proof needs the editor and packs, so it is T-B11-10 (`e2e/csp.spec.ts` new case and `e2e/parts.spec.ts`). The roadmap row lists `E e2e/csp.spec.ts` here; this plan moves it to T-B11-10 because a custom part cannot be created until group 4 |
| | fixtures | `src/parts/testdata/svg/hostile.ts` (the table) and `positive.ts` |
| | acceptance | Given an SVG with `<script>window.__pwned=1</script>` and `onload`, When sanitised, Then the output contains neither and the shapes survive. Given a pack part claiming a breadboard figure, When art is selected, Then the choice is `asset` or `fallback`, never `figure`. Given any part, When drawn with the fallback, Then every pin lies within `bounds_mm` grown by the part's accuracy |
| | observability | `removed` lists (element and attribute names, never values) are shown in the pack dialog and written to the `errors` store only when the whole picture is refused |
| | release blockers | Any hostile sample whose output still matches the forbidden pattern; any code path that inserts art with `innerHTML` or `dangerouslySetInnerHTML` (add a lint-level grep to the test: `grep -rn "dangerouslySetInnerHTML" src/studio/art` prints nothing) |
| Delivery | definition of done | Section 4; the no-`innerHTML` grep is clean |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts src/studio/art`; `npx tsc -p tsconfig.portable.json` |
| | docs | `docs/ADD_A_PART.md` (T-B11-11) states the allowed SVG subset; this task writes the allow-list as a comment-free constant that the doc quotes |
| | rollback | Revert the commit. Core art is unaffected because core parts still select `figure` |
| | later tasks need | `sanitizeSvg`, `checkPng`, `selectArt`, `pinsCovered`, `bounds_mm`, `svgToDataUrl` (08, 04b preview, 10, 16) |
| | risk | R2 from the roadmap: sanitiser gaps. Mitigation is the allow-list design (nothing is copied through), the output self-check, the render-through-`<img>` rule and the e2e proof |

---

### T-B11-12 Spike RS-15: Worker-kill prototype for code parts

This is research, not product code. It changes no file under `src/`. It never enables code parts; CM-16 stays "cannot be enabled" in B11 whatever the verdict.

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-12 / Research spike RS-15 / B11 |
| | priority, size, status | P1, M, not started |
| | dependencies | None |
| Intent | problem | `COMPONENT_SCHEMA.md` 9.6 and `COMMUNITY.md` 3.8 call the Worker-kill sandbox prototype "an agent task in the Components phase". RS-15 never ran (`COMPONENT_ECOSYSTEM.md` 2: no `REPORT.md`). Until it does, F-102 and R-135 stay PENDING |
| | target user | Amar, deciding later whether to open a code-parts phase |
| | user story | As Amar, I read one report that says whether the sandbox design holds in Chromium and WebKit, with numbers |
| | expected behaviour | A throwaway prototype and a `REPORT.md` with a PASS, FAIL or INCONCLUSIVE verdict |
| | success metric | See the falsifiable question and exit condition below |
| Spike | falsifiable question | In Chromium and WebKit (Playwright builds installed locally), can a model file run in a dedicated Worker created inside an opaque-origin sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`), with a CSP that forbids network, so that against each of four attacks (A1 infinite loop; A2 2 GiB allocation by `new ArrayBuffer(2**31)` and by a growing array; A3 `postMessage` flood of at least 1,000,000 messages per second to the parent; A4 reading `document.cookie`, `localStorage`, `indexedDB`, `fetch` of the parent origin, `importScripts` of a parent URL, `new WebSocket`) the host page's `requestAnimationFrame` gap stays under 100 ms above its idle baseline at p99, and the Worker is gone within 2,000 ms of its step deadline, and no attempt in A4 returns data from the parent origin? |
| | exit condition | PASS: in both engines, 20 of 20 runs per attack meet all three clauses. FAIL: any run kills later than 2,000 ms, any frame gap above 250 ms, or any A4 attempt returns parent data. INCONCLUSIVE: an engine cannot run the harness. The report names which clause failed. The thresholds 100 ms and 250 ms are this plan's choice (ESTIMATED), the 2,000 ms and the four attacks are from R-135 and `PRODUCT_REQUIREMENTS.md` R-135 |
| Implementation | existing files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-13-physics-determinism/` (layout to copy: `REPORT.md` sections Question, Why it matters, Exit condition, Environment, Method, Results, Verdict, Caveats, What this means, How to reproduce, Independent check); installed Playwright browsers `chromium-1248` and `webkit-2370` under `~/Library/Caches/ms-playwright` (VERIFIED by `ls`) |
| | new files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-15-worker-kill/REPORT.md`; prototype under `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-15-worker-kill/src/` (host page, sandboxed frame page, supervisor worker, model files for A1 to A4, a Node static server, the runner `run.mjs`). The prototype lives only in that folder; nothing is written outside it, in the repo or elsewhere |
| | modules and signatures | Runner prints one JSON line per run: `{engine, attack, run, killMs, killMethod, maxFrameGapMs, p99FrameGapMs, baselineP99Ms, a4: {cookie, localStorage, indexedDB, fetchParent, importScripts, webSocket}}` where `killMethod` is `close-event` or `heartbeat` and each `a4` field is `blocked` or `leaked` |
| | data model | None |
| | input and output schemas | Output is the JSON lines plus the table in the report |
| | API contracts | A Node `http` server bound to `127.0.0.1` on a random port in 40000 to 49999, never 43117, never 3000. The frame is served from a second port so that "parent origin" is a real different origin. No external request |
| | algorithm | Host page runs a rAF loop recording gaps. It creates the sandboxed iframe with a model file. Inside the frame a supervisor Worker (a second Worker, so a busy model Worker cannot block it) posts a heartbeat to the host every 100 ms, and the frame creates the model Worker. The host sends `step` every 16 ms with a 50 ms deadline; if no reply arrives by the deadline it records `deadlineAt` (host `performance.timeOrigin + performance.now()`) and removes the iframe. **killMs** is measured two ways. Primary: the runner's timestamp of Playwright's `worker` `close` event for the model Worker, minus `deadlineAt` mapped to the runner clock (the runner reads the host clock with `page.evaluate` immediately before and after the run and prints the mapping error, which must be under 5 ms). Fallback where an engine emits no `close` event: the host time of the last supervisor heartbeat received minus `deadlineAt`, which has the 100 ms heartbeat period as its resolution; the report states which method each engine used. The heartbeat is not the model Worker's own, because an infinite loop (A1) stops its own heartbeat at once. 20 runs per attack per engine, each in a fresh page. Baseline: 20 idle runs measure idle p99. The last step is the independent check: a second agent re-runs `node run.mjs --runs 20` from the report's "How to reproduce" section only, and the report records whether its numbers agree within 2x |
| | state transitions | None |
| | validation rules | The prototype must not weaken the sandbox to pass (no `allow-same-origin`, no network allowed in the frame CSP). Any such change voids the verdict |
| | error conditions | A harness crash is INCONCLUSIVE for that engine, with the log attached |
| | edge cases | WebKit may not honour `sandbox` the same way for Workers created in the frame; record exactly what happens. A2 on a low-memory machine may kill the tab: record as FAIL for that run, not as an error |
| | permissions | Localhost only |
| | performance | Run time under 20 minutes (ESTIMATED) |
| | migration | None |
| Verification | unit tests | None (research) |
| | integration tests | The runner is the test. The report includes raw JSON lines |
| | Playwright | Used as the runner only; not added to `playwright.config.ts` and not part of `npm run check` |
| | fixtures | The four model files |
| | acceptance | Given the prototype and the exit condition, When the runner finishes, Then the report states a verdict and each clause with numbers per engine and attack |
| | observability | Raw output saved next to the report |
| | release blockers | None for B11. A FAIL or INCONCLUSIVE leaves code parts disabled, which is already the B11 state |
| Delivery | definition of done | `REPORT.md` follows the RS-13 layout; the "Independent check" section is filled by a second agent who re-runs the harness from the "How to reproduce" section only, and writes whether the numbers agree within 2x, as every other RS report does; no file exists outside the RS-15 folder |
| | verify commands | `cd docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-15-worker-kill/src && node run.mjs --runs 20` (the runner is `run.mjs`; the report names the same command under "How to reproduce"); then the independent check with the same command run by a second agent |
| | docs | `COMPONENT_SCHEMA.md` section 14 and `COMPONENT_ECOSYSTEM.md` section 11 get the verdict line (orchestrator edit after Amar's OK) |
| | rollback | Delete the folder |
| | later tasks need | A future code-parts phase reads the verdict. Nothing in B11 reads it |

---

### T-B11-13 `parts` IndexedDB store

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-13 / Local storage, `src/local` / B11 |
| | priority, size, status | P0, M, not started |
| | dependencies | Phase B3 (T-B3-02 database `iynk` and its 19 stores, T-B3-08 wipe and export). No task in this phase |
| Intent | problem | Custom parts need a durable home. Q2: the store `parts` is named in CS 4.1 and CE 5.4 but is not in the 19-store list |
| | target user | Amar and his friends |
| | user story | As someone who made a part, I close the browser, come back, and it is still in my library; "wipe local data" removes it |
| | expected behaviour | A `PartsRepository` stores part records by `id@version`, refuses to change bytes under an existing key, and writes a record and its files in one transaction |
| | success metric | Reload keeps 100 parts; a conflicting put writes nothing; `putMany` of 20 parts and 40 assets is all-or-nothing under an injected failure; wipe leaves 0 parts |
| Implementation | existing files | `src/local/db.ts`, `stores.ts` (T-B3-02: database `iynk` version 1 with 19 stores; `assets` is key sha256, value Blob, VERIFIED in `tasks/B3` line 314), `wipe.ts`, `export-all.ts` (T-B3-08). Read-only context, not edited here: `src/local/repository.ts` (types), `idb-repository.ts` and `memory-repository.ts` (T-B3-22) and the shared contract suite `repository.contract.ts`, whose pattern the new tests copy; `SYSTEM_ARCHITECTURE.md` lines 678-700 (store table); `ADR-0106`. Precondition: `STORES` lists `assets`; if it does not, stop and report |
| | new files | `src/local/parts-store.ts` |
| | edited files | `src/local/db.ts` (database version +1; `onupgradeneeded` creates `parts` with keyPath `key` and index `id` when absent), `src/local/stores.ts` (store name constant and the `assets` accessor type), `src/local/wipe.ts` (clear `parts`), `src/local/export-all.ts` (include library parts in the data export, descriptors and files, no keys) |
| | modules and signatures | `export interface PartRecord { key: string; id: string; version: string; descriptor: ComponentDescriptor; digest: string; trust: 'local' \| 'imported'; addedAt: string; files: Readonly<Record<string, string>>; source?: { sender?: string; packId?: string; packSha256?: string } } ; export type PutResult = 'added' \| 'same' \| 'conflict'; export type PutManyResult = { ok: true; results: ('added' \| 'same')[] } \| { ok: false; conflicts: { key: string; installedDigest: string; incomingDigest: string }[] }; export interface PartsRepository { list(): Promise<PartRecord[]>; get(id: string, version: string): Promise<PartRecord \| undefined>; put(rec: PartRecord): Promise<PutResult>; putMany(recs: readonly PartRecord[], files: ReadonlyMap<string, Blob>): Promise<PutManyResult>; remove(id: string, version: string): Promise<void>; getFile(sha256: string): Promise<Blob \| undefined> } ; export function createIndexedDbPartsRepository(db: IDBDatabase): PartsRepository; export function createMemoryPartsRepository(): PartsRepository; export function partKey(id: string, version: string): string;` |
| | data model | New store `parts`: key `id@version`, value `PartRecord`. `files` maps a descriptor-relative path (art, test fixtures) to a sha256; the bytes sit in the existing `assets` store (sha256 to Blob). `digest` is `sha256:` plus the hash of the RFC 8785 canonical JSON of `descriptor` (the helper is T-B2-09 `src/project/hash.ts`; callers compute it, this store compares) |
| | input and output schemas | As the interface. `putMany` returns `{ok: false, conflicts}` and writes nothing if any record is a conflict; otherwise it returns `{ok: true, results}` where each entry is `added` or `same`, never `conflict`. Callers (T-B11-08 `commitPack`) read the `ok` field |
| | API contracts | None |
| | algorithm | `put`: one transaction over `parts` and `assets`; read the existing key; none gives write and `added`; same digest gives `same` and no write; different digest gives `conflict` and no write. `putMany`: one `readwrite` transaction on both stores; compute all results first; if any `conflict`, abort the transaction and return `{ ok: false, conflicts }` with both digests per key; otherwise write and return `{ ok: true, results }`. `remove`: delete the record; files stay in `assets` (other parts may share a sha256); a later sweep is not built here |
| | state transitions | A record is immutable once written (ADR-0205). The only transitions are add and remove |
| | validation rules | `key === partKey(id, version)`; `descriptor.id === id` and `descriptor.version === version`; `trust` is never `core` (core parts are not stored) |
| | error conditions | `QuotaExceededError` surfaces as a thrown `StoreFullError` with the numbers the browser gives, and the library UI shows "storage is full"; the repository never leaves a half-written record |
| | edge cases | Two tabs writing the same new key: the second sees `same` or `conflict`. A part version removed while a project pins it: the project loads with the V6 warning (T-B11-07) and the placeholder (R-028). Private windows where IndexedDB is blocked: `createIndexedDbPartsRepository` throws at open and the app falls back to the memory repository with a visible "parts will not be saved" notice (wired in T-B11-16) |
| | permissions | The local person only |
| | performance | `list()` returns records without file bytes. 100 parts of 30 KB hydrate in under 200 ms (ESTIMATED) |
| | migration | Database version bump creates an empty store; no data migration. A user on the old version gets the store on next open. IndexedDB cannot downgrade, so rollback leaves an unused empty store that a re-apply reuses (same note as T-B3 rollback) |
| Verification | unit tests | `src/local/parts-store.test.ts` against the memory repository and, if T-B3-02 added `fake-indexeddb`, against the IndexedDB one: add, same, conflict leaves bytes unchanged; `putMany` 20 parts with one conflict returns `{ok: false, conflicts: [that key]}` and writes none; injected failure on the 21st write aborts all (memory implementation exposes a `failAfter(n)` test hook); `remove` then `get` is undefined; keys with `@` and dots; `list` order stable by key. `src/local/wipe.test.ts` (extend): wipe empties `parts`. `src/local/export-all.test.ts` (extend): export lists library descriptors and no `keys` entries |
| | integration tests | Reload test in jsdom with `fake-indexeddb`: write, close the database, reopen, read |
| | Playwright | Covered by T-B11-10 |
| | fixtures | The nine example descriptors as `PartRecord`s |
| | acceptance | Given a stored part, When the page reloads, Then `list()` returns it with the same digest. Given the same key with different bytes, When put, Then the result is `conflict` and the stored bytes are unchanged; a `putMany` that contains it returns `{ok: false}` with both digests. Given "Delete my local data", When it finishes, Then `parts` has 0 rows |
| | observability | `errors` store row `{where: 'parts.store', message: 'conflict' \| 'quota' \| 'blocked'}` |
| | release blockers | Any write path that replaces bytes under an existing key |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/local` |
| | docs | `SYSTEM_ARCHITECTURE.md` store table gets row 20 `parts` (orchestrator edit after OK); `docs/PROJECT_FILES.md` (B3) names the store |
| | rollback | Revert the commit (see migration note) |
| | later tasks need | `PartsRepository`, `PartRecord`, `partKey`, `createMemoryPartsRepository` (04b, 07, 08, 16, 10) |

---

### T-B11-18 i18n scaffold: three namespaces

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-18 / i18n, `src/i18n` / B11 |
| | priority, size, status | P0, S, not started |
| | dependencies | Phase B4 (T-B4-01 `studio` namespace and the six-language parity test T-B4-21) |
| Intent | problem | Several UI tasks in different groups add strings. Sharing one namespace file would make two agents edit it at once |
| | target user | The agents of tasks 04b, 05b, 08, 14, 15, 16 |
| | user story | As an agent, I own a namespace file for my group, so I never conflict with another |
| | expected behaviour | Three new namespaces exist with a minimal valid English file and the same keys in de, es, fr, hi, zh. Tasks add keys later |
| | success metric | `npx vitest run src/i18n` passes; the parity test sees three new namespaces |
| Implementation | existing files | `src/i18n/namespaces.ts:4` (the `NAMESPACES` array) and `:8-20` (the `Messages` type); `src/i18n/server.ts:5,18,31` (loads every namespace); `src/i18n/messages/<lang>/*.json`; `src/i18n/messages.test.ts` (parity test) |
| | new files | `src/i18n/messages/{de,en,es,fr,hi,zh}/parteditor.json`, `partpack.json`, `partinfo.json` (three sets) |
| | edited files | `src/i18n/namespaces.ts` (add `"parteditor"`, `"partpack"`, `"partinfo"` to the array and three lines to `Messages`) |
| | modules and signatures | None beyond the type additions |
| | data model | Each file: `{"title": "<English>"}` in `en`, and a translation of that one key in the others. Later tasks add nested keys |
| | input and output schemas | JSON, flat or nested objects of strings |
| | API contracts | None |
| | algorithm | Add the three names; create 18 files; keep key order identical across languages |
| | state transitions | None |
| | validation rules | Existing parity test: same key set in all six languages, no empty strings |
| | error conditions | `server.ts:18` throws if a language lacks a file |
| | edge cases | `src/i18n/server.ts:31` loads all namespaces on every request, so every added key costs bytes on every page; tasks keep strings short (ESTIMATED: under 6 KB per namespace per language at the end of the phase) |
| | permissions | None |
| | performance | Three small files added to every server render; measured as a bytes delta in the commit body |
| | migration | None |
| Verification | unit tests | `src/i18n/messages.test.ts` (existing) covers parity; add one case that fails if `NAMESPACES` and the `Messages` type disagree |
| | integration tests | `npm run build` keyless loads the namespaces (B0 behaviour) |
| | Playwright | None |
| | fixtures | None |
| | acceptance | Given the three files in six languages, When the parity test runs, Then it passes; Given a language file missing `partinfo.json`, Then the server load error names the namespace |
| | observability | None |
| | release blockers | None |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/i18n` |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | The namespace names `parteditor`, `partpack`, `partinfo` |
| | note | Translations of new keys are written by the agent for de, es, fr, hi, zh. Amar reviews them only if he asks; the roadmap's language rule (section 2.6) applies |

---

### T-B11-02a Registry additions, app registry, descriptor barrel, per-descriptor gates, `part-draft` tool, golden harness

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-02a / Parts registry, `src/parts`, `scripts` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-01, T-B11-05a. Phases B2 (T-B2-11 registry and descriptor, T-B2-12 builtin index, T-B2-22 `checkLibrary`), B3 (T-B3-16, T-B3-17 solver) |
| Intent | problem | 27 descriptors still have to be written by four agents. Without a shared tool, gate and harness they will differ in shape, invent sources, or claim models the engine does not run |
| | target user | The seven data agents (02b1 to 03b2), then every future contributor |
| | user story | As a contributor, I run `part-draft` on a figure file, fill in the `TODO` fields from the fact sheet, and a test tells me if my descriptor is wrong or dishonest |
| | expected behaviour | B2's one `PartRegistry` type gains removal and origin tracking (no second registry is created). A generated barrel loads every flat `src/parts/data/*.component.json` into `builtinRegistry()`, so adding a descriptor needs no edit to `builtin.ts`. A draft tool writes a descriptor skeleton with every unknown set to `TODO`. A test file checks every descriptor on disk |
| | success metric | After group 4 (T-B11-02d): 34 of 34 non-board items resolve by legacy id (the count itself is asserted by T-B11-19); 0 descriptors fail any per-descriptor gate; every `partly-modelled` part has a passing fixture |
| Implementation | existing files | `src/parts/registry.ts` (T-B2-11), `src/parts/builtin.ts` and `src/parts/browser/load.ts` (T-B2-12), `src/parts/data/*.component.json`, `src/parts/descriptor.ts`, `src/parts/library-check.ts` (T-B2-22); `figures/engine/testkit.mjs` (how tests load a built page); `figures/parts/led.js:11-12`, `figures/modules/l298n.js:232` (shapes the tool parses); `docs/facts/*.md` (35 fact sheets); `scripts/gen-content-index.mjs` (the generator pattern: write, `--check`) |
| | new files | `scripts/part-draft.mjs`, `src/parts/golden.ts`, `scripts/gen-parts-index.mjs`; generated and committed with its generator: `src/parts/data/index.generated.ts` |
| | edited files | `src/parts/registry.ts`, `src/parts/builtin.ts` (five source files; the barrel counts zero) |
| | modules and signatures | `registry.ts` (B2's exports stay; B2's `add(value, { origin })` is how a library part is registered, so there is no `registerParts`; added): `PartRegistry` gains `remove(ref: string, version: string): boolean; originOf(ref: string, version: string): 'core' \| 'local-user' \| 'imported-pack' \| undefined; removeByOrigin(origin: 'local-user' \| 'imported-pack'): number; onChange(fn: () => void): () => void;` and `export function descriptorForLegacy(reg: PartRegistry, legacyId: string): ComponentDescriptor \| undefined` (= `reg.latest(reg.resolveLegacy(legacyId))`, because B2's `resolveLegacy` returns a ref). `builtin.ts`: `BUILTIN_DESCRIPTORS` becomes `[...GENERATED_DESCRIPTORS]` from the barrel (it replaces the seven static imports); `export function getAppRegistry(): PartRegistry` returns one memoised `builtinRegistry()` that Studio, the orchestrator default (T-B11-09) and the library (T-B11-16) share. `gen-parts-index.mjs`: `node scripts/gen-parts-index.mjs [--check]` lists `src/parts/data/*.component.json` (flat, sorted, not `examples/` or `tests/`), writes `src/parts/data/index.generated.ts` with one static `import x from './<file>' with { type: 'json' }` per file (or the generated-TS form that spike T-B2-17 Q5 chose) and exports `GENERATED_DESCRIPTORS`; with `--check` it exits 1 when the committed file differs; afterwards it runs `scripts/gen-part-entries.mjs [--check]` when that file exists (T-B11-17). `golden.ts`: `export interface GoldenFixture { id: string; kind: 'golden-trace' \| 'conformance' \| 'datasheet-point'; shape: 'series2' \| 'npn-switch' \| 'none'; description: string; circuit?: { supply_v: number; series_ohm: number; base_ohm?: number; params?: Record<string, ParamScalar> }; expect?: { quantity: 'i_a' \| 'v_part_v' \| 'v_collector_v' \| 'state'; value: number \| string; tol: { abs?: number; rel?: number } }[]; checks?: ('layers-resolve' \| 'terminals-are-pins' \| 'ratings-have-slot' \| 'logic-rows' \| 'builtin-binds')[]; bind?: { className: 'Mpu6050' \| 'Pca9685' \| 'HcSr04'; i2c?: { write: number[]; read: number; expect: number[] } }; derivation: string }; export interface GoldenResult { ok: boolean; got: Record<string, number \| string>; failures: string[] }; export function runFixture(def: ComponentDescriptor, f: GoldenFixture, env: ModelEnv): GoldenResult;` (`ParamScalar` and `ModelEnv` come from `src/sim/models/kinds.ts`, T-B11-05a). `part-draft.mjs`: `node scripts/part-draft.mjs <part\|module> <legacy-id> [--out <dir>]` |
| | data model | Descriptor files are flat: `src/parts/data/<slug>.component.json`, with no subfolders, so B2's `schema:check` glob, B2's `data.test.ts`, B9's registry coverage test and B10's `registry-sweep.test.ts` all see them. Test fixtures sit in `src/parts/data/tests/<slug>.<testid>.json` (that name does not match `*.component.json`) and are referenced as `tests[].file = "tests/<slug>.<testid>.json"`. `src/parts/data/examples/` holds design samples that are never loaded into a registry, never read by `validate-part.mjs --all`, and never listed in the barrel |
| | input and output schemas | Fixture JSON as `GoldenFixture`. `part-draft` reads a figure file, runs it in a Node `vm` context with a stub `SL.bench` that records `B.part(name, def)` and `B.module(def)` calls and returns permissive proxies for everything else (figure `draw` functions are never called), reads `def.name`, `legs`, `span`, `params`, calls `def.elec` once with default parameters inside `try`, reads `faults`, `pcb`, `holes`, and opens `docs/facts/<match>.md` headings for the source list |
| | API contracts | None |
| | algorithm | `runFixture`: `series2` builds a supply, a series resistor and the part (via `resolveLayers` then the B3 solver) and reads the quantity; `npn-switch` adds a base resistor; `conformance` runs the named checks without a solver (`logic-rows` evaluates every row of a `logic` layer with `evalLogic` and compares); `builtin-binds` resolves the `builtin` layer with `resolveLayers`, calls `BUILTINS.get(ref).make(defaults)` (T-B11-05a), checks that the object's class name equals `bind.className` and, for an I2C device, calls `write(bind.i2c.write)` then `read(bind.i2c.read)` and compares with `bind.i2c.expect` (classes `Mpu6050` at `src/lib/interp/devices.ts:21` and `Pca9685` at `:104`; `HcSr04` at `:261` has no register file, so its check is the class name only, built with `new World(profile)` from `src/lib/interp/world.ts:137` and a board profile from `profiles.ts`). The expected bytes are read from the class source when the fixture is written and cited in `derivation`. Conformance fixtures use `shape: 'none'`; failures are strings naming the quantity, got and want. `part-draft`: writes a skeleton whose every unknown value is the literal string `TODO` (rationale, source, `loc`, datasheet `url`, `retrieved`, ratings values not found in the figure). It fills only what the figure states: ids, legs to `pins[]` (positions spaced 2.54 mm along x for breadboard legs), `visual.breadboard {figure, legs, span}`, `visual.fallback` renderer by leg count (2 gives two-lead, 3 to 8 gives dip, more gives header-module), enum and number parameters, the element layer kind from `elec`, injectable-fault `legacy_id`s from `faults`. It never invents a source or a number: a literal read from `elec` becomes a parameter with `rationale: "TODO"` |
| | state transitions | None |
| | validation rules | The per-descriptor gate (see tests) is the rule set. Status honesty (Q6) is checked in both directions |
| | error conditions | `part-draft` exits 1 with the line in the figure file it could not parse. A fixture that does not match the schema of `GoldenFixture` fails with its path |
| | edge cases | A figure whose `elec` reads `p.color` for a lookup table (LED): the draft records the keys as an enum parameter and writes `TODO` for each value. Figures with `elec` absent (`multimeter`, `lipo-2s`): no element layer, status `not-modelled-yet` by default. `uln2003.js` registers a part with three `type:` kinds inside `elec` (diode, npn, res): the draft emits a `subcircuit` skeleton |
| | permissions | None |
| | performance | The per-descriptor test reads about 41 JSON files and runs fixtures; under 10 s on the reference laptop (ESTIMATED) |
| | migration | `builtin.ts` switches from B2's seven static imports to the barrel in this task, and B2's `builtin.test.ts` assertion "has seven entries" becomes "has an entry for every flat file" (test file only). The barrel is regenerated by `npm run content`. Files added by group 3 are not in `builtinRegistry()` until T-B11-02d regenerates the barrel, and `npm run content:check` is red from the first conversion commit until then, so conversion tasks do not run it |
| Verification | unit tests | `scripts/part-draft.test.mjs`: draft for `led` has pins `A`,`K`, span `[1,3]`, enum parameter `color` with 5 values, `visual.breadboard.legs ["A","K"]`, fallback `generic-two-lead`; draft for `resistor` has number parameter `ohms` range `[1,10000000]`; draft for `l298n` module lists 7 injectable faults with their `legacy_id`s; every draft fails `validateDescriptor` and every diagnostic is `P-TODO` or a `P-SCHEMA` issue on a `TODO` string, never a different code; running twice gives byte-identical output. `src/parts/registry.test.ts`: `add` core then `local-user`, `get` by id and version, `descriptorForLegacy(reg, 'led')`, `removeByOrigin('imported-pack')` leaves core, `onChange` fires on add and remove. `scripts/gen-parts-index.test.mjs`: two runs are byte-identical, `--check` fails after a flat file is added, files in `examples/` and `tests/` are not listed. `src/parts/builtin.test.ts` (B2's file): every flat file is present. `src/parts/golden.test.ts`: `series2` on `core.resistor` (5 V, 1 kohm series, 1 kohm part) gives 2.5 mA; on red `core.led-5mm` (ideal 5 V, 220 ohm series, `vf` 2.0, `rd` 0.5) gives (5 - 2.0) / (220 + 0.5) = 13.6 mA within 0.1 mA (the 12.2 mA of the Uno blink adds the 25 ohm pin resistance and is pinned by `figures/engine/bench-solve.test.mjs:20-24`; T-B11-10 checks it end to end); a wrong expectation fails with a message naming got and want; `conformance` checks including `builtin-binds` on `Mpu6050` (WHO_AM_I-style read through `write`/`read`) |
| | integration tests | `src/parts/library.test.ts` (the per-descriptor gate, runs over every `src/parts/data/*.component.json` (flat, not recursive), so it is green with any number of descriptors, B2's seven and later ones; it is not a count gate, which is T-B11-19): 1) `validateDescriptor(d, { ctx: { trust: 'core', solverElements, builtinRefs, causeIds } })` with `solverElements` from the B3 solver, `builtinRefs` from `BUILTINS`, `causeIds` from `src/sim/faults/cause-ids.ts` (so S-10, S-15, S-17, `P-LICENSE`, `P-TODO`, `P-TRUST-ORIGIN` and `P-STATUS-LAYERS` all run); 2) `copyCheck` clean; 3) status honesty: `modelled` or `partly-modelled` requires `resolveLayers(...).runnable`, and `not-modelled-yet` requires every layer `none` (schema) and tier `none`; 4) tier is `none`, `T0` or `T1` only (no T2 or T3 in B11); 5) a non-`not-modelled-yet` part has at least one test whose `state` is not `to-write`, the fixture file exists, and `runFixture` passes; 6) `provenance.license` set, `third_party_content` is a boolean, and the test prints the list of parts with it true (D-017, For Amar item 2); 7) `pinsCovered(d, fallbackSpec(d))` is ok; 8) for parts, `visual.breadboard.legs` equals the `legs:` list parsed from `figures/parts/<legacy>.js`; 9) for modules, every string or first tuple element in the legacy `faults:` list is the `legacy_id` of an `injectable_faults` entry; 10) for parts with a legacy `elec` type the modelled layer's element kind equals that type; 11) every `cause_id` is in the registry or starts with `x-`; 12) a descriptor with a `builtin` layer has a `conformance` fixture whose `checks` include `builtin-binds` |
| | Playwright | None |
| | fixtures | Test fixtures per descriptor live in `src/parts/data/tests/` (written by 02b1 to 03b2). This task writes the missing fixtures for any flat descriptor that already exists and lacks one (B2's seven, B4's `breadboard`, B9's `bme280-module`; read first) |
| | acceptance | Given `node scripts/part-draft.mjs part led`, When it runs, Then it prints a skeleton and lists each `TODO` path. Given a descriptor claiming `partly-modelled` whose layers all resolve to `none`, When the gate runs, Then the test fails naming the part |
| | observability | The gate prints a summary table (id, status, tier, tests, third-party flag) to the test log |
| | release blockers | Any descriptor failing a gate at the end of group 3 |
| Delivery | definition of done | Section 4; the tool and the gate are documented in the commit body |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts scripts/part-draft.test.mjs`; `npx tsc -p tsconfig.portable.json`; `node scripts/gen-parts-index.mjs --check`; `node scripts/part-draft.mjs part led --out "$(mktemp -d)"` |
| | docs | `docs/ADD_A_PART.md` (T-B11-11) documents `part-draft` and the gate |
| | rollback | Revert the commit; B2's seven descriptors still load |
| | later tasks need | `getAppRegistry`, `descriptorForLegacy`, `PartRegistry.remove/originOf/removeByOrigin/onChange`, `GoldenFixture`, `runFixture`; the gate is what 02b1 to 03b2 must pass |
| | risk | The `vm` approach assumes the top level of a figure file only calls `B.part`/`B.module` and defines constants. `led.js` assigns `B.LED_COLORS` and `resistor.js` assigns `B.resBands`; both survive a permissive proxy. If a figure runs code that needs real engine objects at load, the tool reports the file and the agent writes that draft by hand (3 minutes of work, not a task) |

---

### T-B11-04a Part draft model

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-04a / Studio part editor, state, `src/studio/parts` / B11 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B11-01. Phases B2 (T-B2-11: `Descriptor` and its generated member types in `src/parts/descriptor.ts`), B4 (T-B4-02 store pattern) |
| Intent | problem | The editor form and the JSON view must edit one thing. A UI that holds its own copy of the descriptor invents a second source of truth |
| | target user | The editor UI (04b, 05b) and its tests |
| | user story | As someone making a part, what I type, what the JSON view shows and what is saved are always the same data |
| | expected behaviour | A pure reducer holds a `PartDraft`. `toDescriptor` always produces a candidate descriptor, valid or not. `draftIssues` returns live validation. `draftFromDescriptor` round-trips any existing descriptor without losing fields the form does not edit |
| | success metric | Round trip equality on all nine examples; 0 dropped fields; a 32-pin draft validates in under 50 ms |
| Implementation | existing files | `docs/MASTER_PLAN/04_ARCHITECTURE/COMPONENT_SCHEMA.md` 9.2 (beginner defaults and limits); `src/studio/stores/ui.ts`, `doc.ts` (B4 store style, DOCUMENTED); T-B11-01 `validateDescriptor(value, { ctx })`; `src/parts/descriptor.ts` (B2 types) |
| | new files | `src/studio/parts/draft.ts` |
| | modules and signatures | Type aliases at the top of `draft.ts`, taken from B2's generated types and not declared anywhere else: `type PinType = ComponentDescriptor['pins'][number]['type']; type PinClass = ComponentDescriptor['pins'][number]['class']; type Polarity = NonNullable<ComponentDescriptor['pins'][number]['polarity']>; type Category = ComponentDescriptor['identity']['category']; type Kind = ComponentDescriptor['identity']['kind']; type Tier = ComponentDescriptor['simulation']['tier']; type SimStatus = ComponentDescriptor['simulation']['status']; type FallbackRenderer = ComponentDescriptor['visual']['fallback']['renderer']; type Diagnostic` is imported from `src/core/result.ts`. `export const DRAFT_LIMITS: { readonly pins: 32; readonly parameters: 64; readonly tableRows: 256 }; export type TemplateId = 'resistor-like' \| 'switch' \| 'led-like' \| 'truth-table' \| 'analog-sensor' \| 'not-modelled'; export interface DraftPin { uid: string; id: string; name: string; designator: string; type: PinType; class: PinClass; polarity?: Polarity; x: number; y: number; z?: number } ; export interface DraftGroup { id: string; kind: 'internal-short' \| 'strip' \| 'plane'; pins: string[] } ; export interface PartDraft { mode: 'form' \| 'json'; baseKey?: string; slug: string; version: string; name: string; manufacturer: string; model: string; category: Category; kind: Kind; description: string; pins: DraftPin[]; groups: DraftGroup[]; body: { w: number; h: number; d: number; accuracy: number }; fallback: { renderer: FallbackRenderer; label: string; bodyColour: string; showPinLabels: boolean }; ratings: Record<string, unknown>; parameters: unknown[]; layers: unknown[]; simulation: { tier: Tier; status: SimStatus; whatItModels: string[]; notModelled: string[]; knownGaps: unknown[]; solverRequires: string[] }; tests: unknown[]; testFiles: Record<string, string>; assets: { path: string; mediaType: 'image/svg+xml' \| 'image/png'; sha256: string; license: string }[]; license: string; authors: string[]; sources: unknown[]; template: { id: TemplateId; params: unknown } \| null; extra: Readonly<Record<string, unknown>>; rawJson?: string } ; export type DraftAction = { type: 'setField'; field: keyof PartDraft; value: unknown } \| { type: 'addPin' } \| { type: 'removePin'; uid: string } \| { type: 'movePin'; uid: string; x: number; y: number } \| { type: 'setPinField'; uid: string; field: keyof DraftPin; value: unknown } \| { type: 'addGroup' } \| { type: 'removeGroup'; id: string } \| { type: 'setGroupPins'; id: string; pins: string[] } \| { type: 'setFallback'; patch: Partial<PartDraft['fallback']> } \| { type: 'applyPatch'; patch: Partial<PartDraft> } \| { type: 'switchMode'; mode: 'form' \| 'json' } \| { type: 'setRawJson'; text: string } \| { type: 'reset'; draft: PartDraft }; export function newDraft(nowIso: string): PartDraft; export function draftFromDescriptor(d: ComponentDescriptor): PartDraft; export function reduceDraft(s: PartDraft, a: DraftAction): PartDraft; export function toDescriptor(s: PartDraft, nowIso: string): ComponentDescriptor; export function draftIssues(s: PartDraft, ctx: Pick<ValidateContext, 'installed'> & { existingKeys: ReadonlySet<string> }): Diagnostic[]; export function slugFor(name: string, existing: ReadonlySet<string>): string;` `applyPatch` is how the template step (T-B11-05b) and the art upload (T-B11-04b) write `layers`, `ratings`, `simulation`, `tests`, `testFiles` and `assets` without the reducer knowing about templates |
| | data model | Produces `component.schema.json` fields: `schema: "iynk.component/1"`, `id: "local.<slug>"`, `version`, `identity {manufacturer, model, kind, category, description, generic: true, legacy_ids: [], tags: []}`, `sources`, `pins`, `groups`, `dimensions {body, accuracy}`, `ratings`, `behaviour.layers`, `simulation {tier: "none", status: "not-modelled-yet", what_it_models: [], not_modelled}` and `behaviour.layers [{ id: "main", domain: "analog", model: { kind: "none", reason } }]`, `visual.fallback`, `provenance {license, origin: "local-user", created, review {status: "unreviewed"}}`. Defaults per CS 9.2: `license` `LicenseRef-local-private`, `generic: true`, `not_modelled` pre-filled "Everything this form does not set" (English; other languages left out), `sources` one entry of kind `own-estimate`, reliability `unverified`. A fresh draft is `not-modelled-yet`, tier `none`, with one `none` layer, because Q6 and `P-STATUS-LAYERS` require every `none`-layer part to say so. `applyTemplate` (T-B11-05b) is the only code that writes a runnable layer, and it writes `partly-modelled` and `T1` in the same patch; `toDescriptor` copies `status` and `tier` from the draft and derives nothing |
| | input and output schemas | In: actions. Out: `PartDraft`, a descriptor, issues |
| | API contracts | None |
| | algorithm | `toDescriptor` is a total function: form mode maps fields and merges `extra` last-wins-never (fields in `extra` that the form owns are ignored); json mode parses `rawJson` and returns it, or the last good descriptor with an issue if the JSON does not parse. `switchMode` form to json serialises with 2-space indent; json to form calls `draftFromDescriptor` and refuses (stays in json mode, issue shown) if the JSON is not a valid object. `slugFor` lowercases, replaces runs of non-alphanumerics with one hyphen, trims to 40 characters, and appends `-2`, `-3` until unused. `draftIssues`: limits (32 pins, 64 parameters), pin id regex `^[A-Za-z][A-Za-z0-9_]{0,31}$`, duplicate pin ids and designators, a group naming a missing pin, `existingKeys` collision for `id@version`, then `validateDescriptor(toDescriptor(draft), { ctx: { trust: 'local', installed } })` (its `diagnostics`) |
| | state transitions | `form` <-> `json`; `dirty` flips on any action except `reset`. A saved draft keeps `baseKey` so Save can compute the version bump (T-B11-07) |
| | validation rules | As algorithm. Limits from CS 9.2 |
| | error conditions | Never throws; invalid input becomes issues |
| | edge cases | Pin moved outside the body: allowed with a `S-11` warning if a board outline exists, otherwise fine. Zero pins: schema issue `minItems`. Removing a pin that a group, a layer terminal or a rating scope names: the reducer removes the dangling references in the same action and lists them in `lastCascade` |
| | permissions | None |
| | performance | Reducer is O(pins) per action; `draftIssues` is called debounced by the UI (T-B11-04b) |
| | migration | None |
| Verification | unit tests | `src/studio/parts/draft.test.ts`: `draftFromDescriptor` then `toDescriptor` returns a deep-equal descriptor for all nine examples; `extra` carries `protocols`, `failure_modes`, `x_*` keys through; the cascade on pin removal; 33rd pin refused with the limit named; `slugFor` collisions; json mode with broken JSON keeps the last good descriptor; a fresh `newDraft` plus one name and two pins validates with no errors (status `not-modelled-yet`, tier `none`, one `none` layer); a patch that sets a runnable layer together with `partly-modelled` and `T1` still validates; a patch that sets a runnable layer but leaves `not-modelled-yet` fails with `P-STATUS-LAYERS` |
| | integration tests | None here |
| | Playwright | Covered by T-B11-10 |
| | fixtures | The nine examples |
| | acceptance | Given a new draft named "Pulse stretcher", When it is turned into a descriptor, Then `id` is `local.pulse-stretcher`, `provenance.license` is `LicenseRef-local-private`, `simulation.status` is `not-modelled-yet` and `tier` is `none` until a template is applied (T-B11-05b then writes `partly-modelled` and `T1`). Given an opened example, When I switch to JSON and back, Then nothing changes |
| | observability | None |
| | release blockers | Any dropped field in the round trip |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/studio/parts` |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | `PartDraft`, `reduceDraft`, `toDescriptor`, `draftIssues`, `DRAFT_LIMITS` (04b, 05b) |

---

### T-B11-07 Version rules, pinned lookup, upgrade plan

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-07 / Parts versioning and project interface, `src/parts`, `src/project` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-01. Phase B2 (T-B2-05 component ops, T-B2-07 dep ops, T-B2-08 validation, T-B2-09 canonical bytes and hash, T-B2-10 session, T-B2-11 `digestOf`, `versionCompare`, `interfaceOf`, `createRegistry`, T-B2-22 `checkLibrary`) |
| Intent | problem | A changed model must not change an old project (R-029: `led@1` keeps its version-1 behaviour). A friend's project that uses a part I do not have must still open (R-028). B2 already derives the pinned interface (`interfaceOf`), the digest (`digestOf`), the version order (`versionCompare`) and the V6 warnings (`checkLibrary`). What nobody provides yet is the version-bump rules, a pinned lookup that returns "unavailable" for a missing or tampered part, and an upgrade plan |
| | target user | Anyone who edits a part after using it; anyone who opens a buddy's project |
| | user story | As a person who changes my part's resistor model, I am told this is a major version, and my old projects keep their old numbers until I upgrade them |
| | expected behaviour | Versions follow the CS 4.16 rules. A project keeps loading the exact version it pinned. A missing or tampered part becomes a labelled placeholder with a warning. An upgrade is a reviewable plan, not a silent change |
| | success metric | 100 percent of a classification table of 30 change cases gives the right bump; the pinned `led@1.0.0` trace hash is unchanged after `1.1.0` is added to the library; the digest of the same descriptor is equal in Chromium and Node |
| Implementation | existing files | `COMPONENT_SCHEMA.md` 4.16 (rules); `ADR-0205`, `ADR-0107`; `PROJECT_DATA_MODEL.md` 5.3 and line 919 (V6 table); `04_ARCHITECTURE/schemas/project.schema.json` `$defs.ComponentDependency`, `InterfacePin`, `Op` kinds `dep.set`, `dep.remove`, `component.swap`; B2: `src/parts/descriptor.ts` (`digestOf`, `versionCompare`), `src/parts/pins.ts` (`interfaceOf`), `src/parts/registry.ts` (`PartRegistry`), `src/parts/library-check.ts` (`checkLibrary`, `placeholderFor`), `src/project/validate.ts` (T-B2-08) |
| | new files | `src/parts/versions.ts` |
| | edited files | `src/project/validate.ts` only if the loader does not already call B2's `checkLibrary` (read first; the hook may already exist); then one call site, counted as the second file |
| | modules and signatures | `versions.ts`: `export type Bump = 'patch' \| 'minor' \| 'major'; export function parseSemver(v: string): { major: number; minor: number; patch: number }; export function classifyChange(prev: ComponentDescriptor, next: ComponentDescriptor): { bump: Bump; reasons: string[] }; export function requiredNextVersion(prev: ComponentDescriptor, next: ComponentDescriptor): string; export function checkVersionBump(prev: ComponentDescriptor, next: ComponentDescriptor): Diagnostic[]; export interface DescriptorChange { path: string; change: 'added' \| 'removed' \| 'changed'; before?: unknown; after?: unknown; readsByModel: boolean } ; export function diffDescriptors(prev: ComponentDescriptor, next: ComponentDescriptor): DescriptorChange[]; export type Pinned = { found: true; def: ComponentDescriptor } \| { found: false; reason: 'missing' \| 'digest-mismatch' }; export function resolvePinned(reg: Pick<PartRegistry, 'get'>, dep: ComponentDependency): Pinned; export function buildDependency(def: ComponentDescriptor, origin: 'builtin' \| 'library' \| 'embedded'): ComponentDependency; export interface UpgradePlan { ref: string; from: string; to: string; bump: Bump; changes: DescriptorChange[]; removedPins: string[]; addedPins: string[]; wiresOnRemovedPins: { instance: string; pin: string }[]; instances: string[]; ops: Op[]; blocked?: 'pins-removed-in-use' \| 'not-newer' } ; export function planUpgrade(doc: Project, from: ComponentDescriptor, to: ComponentDescriptor, origin: 'library' \| 'embedded'): UpgradePlan;`. Nothing else is defined here: the digest is B2's `digestOf`, the version order is B2's `versionCompare`, the interface is B2's `interfaceOf`, and the V6 pass is B2's `checkLibrary`. `digestOf`, `compareSemver`, `deriveInterface` and `libraryPass` are not written because they would duplicate those |
| | data model | `ComponentDependency {ref, version, origin, digest?, interface {role, pins[], groups[], params[]}, definition?}` from `project.schema.json`. Role, pins, groups and params come from B2's `interfaceOf` (the role table is in `pins.ts`). `digest` is `digestOf(def)`, which is `sha256:` plus the hash of the RFC 8785 canonical JSON of the whole descriptor |
| | input and output schemas | As signatures |
| | API contracts | None |
| | algorithm | `classifyChange` returns the highest of: **major** if the pin set differs (ids, `type`, `class`), if any layer differs, if a rating slot named by the other side's `used_by_model` changes value, if any `failure_modes[].when` threshold or `effect.state` changes; **minor** if a parameter, test, optional block, protocol or rating that nothing reads is added; **patch** if only text, `sources`, `visual`, `changelog`, `tags`, `provenance.modified` change. `requiredNextVersion` bumps accordingly from `prev.version` using `parseSemver`. `checkVersionBump` returns a `P-VERSION-BUMP` diagnostic if `versionCompare(next.version, prev.version)` is not above 0, or if `next.version` is lower than `requiredNextVersion`. `resolvePinned(reg, dep)`: `reg.get(dep.ref, dep.version)`; absent gives `{found: false, reason: 'missing'}`; for origin `library` or `embedded` with a `digest`, `digestOf(def) !== dep.digest` gives `{found: false, reason: 'digest-mismatch'}` (ADR-0205's "digest mismatch blocks load" is read as: the part is unavailable and the project still opens). B2's `checkLibrary` reports the matching `V6-UNKNOWN-PART` or `V6-DIGEST` warning, and `placeholderFor` gives the R-028 drawing; this task adds no V6 rule. `buildDependency`: `ref` and `version` from the descriptor, `interface` from `interfaceOf(def)`, `digest` from `digestOf(def)` for `library` and `embedded` (none for `builtin`), `definition` set for `embedded`. `planUpgrade`: ops are `dep.set` for the new dependency, then one `component.swap` per instance of the old version, then `dep.remove` for the old; pins in `from` but not in `to` that have wires or net members are listed in `wiresOnRemovedPins` and set `blocked: 'pins-removed-in-use'` and `ops: []` |
| | state transitions | A dependency goes `pinned` to `drifted` (warning) or `unavailable` (placeholder). It returns to `pinned` only by an upgrade plan the person applies |
| | validation rules | Versions are exact semver; the document never says "latest" (ADR-0107). `core` descriptors in a project are `builtin` and carry no digest |
| | error conditions | `planUpgrade` for a version at or below the current one returns `ops: []` and `blocked: 'not-newer'` |
| | edge cases | Two versions of one part in one project (allowed, `dep.set` is keyed `{ref, version}`); a part whose new version renames a pin (major: the plan blocks if wired); embedded part whose `definition` hash differs from `digest`; an unpinned legacy reference from the B2 converter (treated as `1.0.0`, ADR-0205 migration plan) |
| | permissions | The local person applies a plan; the plan itself is pure |
| | performance | `digestOf` is measured by B2 (T-B2-11). `resolvePinned` is O(1) per dependency |
| | migration | None. The interface-drift CI test is B2's (T-B2-22) and is not repeated here |
| Verification | unit tests | `src/parts/versions.test.ts`: a 30-row table of changes (rename a pin: major; change `forward_current_continuous` read by the model: major; add an unused rating: minor; add a parameter with a default: minor; edit `description`: patch; edit a source `retrieved`: patch; change a failure threshold factor: major; add a test: minor; reorder `tags`: patch); `checkVersionBump` cases; `diffDescriptors` marks `readsByModel`; `resolvePinned` for a present, a missing and a tampered-digest dependency; `buildDependency(...).interface` deep-equals `interfaceOf(def)`. `src/parts/library-check.test.ts` (B2's file, one case added): a pinned `library` dependency whose digest differs from the registry's gives `V6-DIGEST` (B2 logic) and `resolvePinned` gives `digest-mismatch`. `planUpgrade` on a project with two LED instances gives 1 `dep.set`, 2 `component.swap`, 1 `dep.remove`; removing a wired pin blocks; a lower version gives `not-newer` |
| | integration tests | **Pinned versions load unchanged** (roadmap B11 testing line): run a project with `core.led-5mm@1.0.0` through `src/sim` headless (B3 harness `src/project/testing/harness.ts`), record the pin-trace hash, register `1.1.0` of the same part with a different `vf`, run again with the project unchanged: the hash is equal. After `planUpgrade` plus apply, the hash differs |
| | Playwright | Covered by T-B11-10 |
| | fixtures | `src/project/testdata/led-pinned.project.json` (two LED instances, one resistor, built by the B2 generator) |
| | acceptance | Given a project pinned to `led@1.0.0`, When `led@1.1.0` is added to the library, Then the run is identical until I choose Upgrade. Given a dependency whose digest does not match the library, When the project opens, Then the part shows as an "unknown part" placeholder with its real pins and a `V6-DIGEST` warning |
| | observability | V6 warnings appear in the Problems pane (T-B4-17) through the normal validation channel |
| | release blockers | A pinned version that changes behaviour without an explicit upgrade |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts src/project`; `npx tsc -p tsconfig.portable.json`; `npm run schema:check` |
| | docs | `docs/ARCHITECTURE.md`: one paragraph "parts are pinned; upgrades are plans" |
| | rollback | Revert the commit; `validate.ts` is unchanged if it was not edited |
| | later tasks need | `classifyChange`, `requiredNextVersion`, `checkVersionBump`, `resolvePinned`, `buildDependency`, `planUpgrade` (04b, 08, 09, 15, 16) |

---

### T-B11-09 Orchestrator runs the layer kinds

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-09 / Simulation orchestrator, `src/sim` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-05a, T-B11-07 (`resolvePinned`), T-B11-02a (`getAppRegistry`). Phases B3 (T-B3-11 orchestrator, T-B3-15 binding), B8 (T-B8-05 live analog, T-B8-09 phase order) |
| Intent | problem | After B3 and B8 the engine reads parts through whatever B2's seven descriptors needed. A part with a `logic` layer, a pinned subcircuit or an unknown builtin has no path. That is the engine edit B11 exists to remove |
| | target user | Anyone who makes a part with a truth table or a pwl element and presses Run |
| | user story | As someone who made a NAND-gate part, I place it, wire it and see its output change with its inputs, with no engine change |
| | expected behaviour | At run start every placed component is resolved with `resolveLayers`. `element` layers join the analog netlist; `logic` layers run as digital parts with integer-ns delays and a drive resistance; `builtin` layers bind through the existing device binder; `none` layers raise one "not modelled yet" event per instance |
| | success metric | A custom NAND part drives an LED in the headless harness with the same pin trace hash in 10 runs (SA-06); a part with only `none` layers runs the rest of the circuit and reports exactly one event |
| Implementation | existing files | `src/sim/orchestrator.ts` (T-B3-11, edited by T-B8-05 and T-B8-09), `src/sim/analog/live.ts` (T-B8-05), `src/sim/digital/pins.ts`, `src/sim/digital/nets.ts` (T-B3-15), `src/sim/mcu/bind.ts`, `src/sim/replay/record.ts` (T-B3-19, model key `<name>@<major>`, RC-54), `src/sim/models/kinds.ts` (T-B11-05a); `figures/engine/bench-solve.js:10` (`PIN_R = 25`) |
| | new files | `src/sim/digital/logic-part.ts` |
| | edited files | `src/sim/orchestrator.ts` (including `RunOptions` gaining `parts?: PartRegistry`), `src/sim/models/kinds.ts` (export `makeModelEnv(): ModelEnv` built from the solver's element set and `BUILTINS`), `src/sim/analog/live.ts` (accept resolved element layers from any descriptor) |
| | modules and signatures | `logic-part.ts`: `export interface LogicPart { instanceId: string; readonly inputs: readonly { pinId: string; netId: string; vil: number; vih: number }[]; readonly outputs: readonly { pinId: string; netId: string }[]; model: LogicModel } ; export function createLogicPart(instanceId: string, def: ComponentDescriptor, model: LogicModel, nets: ReadonlyMap<string, string>): LogicPart; export function stepLogic(p: LogicPart, nowNs: number, readV: (netId: string) => number, drive: (netId: string, v: number \| null, rOhm: number) => void, schedule: (atNs: number, fn: () => void) => void, diag: (code: 'logic-no-row' \| 'logic-input-floating', detail: string) => void): void;` `orchestrator.ts`: `RunOptions` (T-B3-11) gains `parts?: PartRegistry`, defaulting to `getAppRegistry()` from `src/parts/builtin.ts`, so no caller changes; `export type SimEvent = ... \| { kind: 'not-modelled'; instanceId: string; layerId: string; reason: NoneReason; detail: string }` (add the member) |
| | data model | Input thresholds by the input pin's `logic_family`: `ttl` low 0.8 V, high 2.0 V; `cmos-5v`, `lvcmos-3v3`, `lvcmos-1v8` low 0.3 and high 0.7 of the part's supply voltage (the first `power.inputs[].voltage` rating, else the family nominal 5, 3.3, 1.8 V); `analog`, `none`, `open-drain` as an input pin: refused with diagnostic `logic-family-unknown`. These numbers are iynk assumptions (HYPOTHESIS: typical values, not a datasheet) and are written into `docs/FIDELITY.md` |
| | input and output schemas | Events as above; replay record gains `{ref, version}` per instance (exact version, not major) |
| | API contracts | None |
| | algorithm | Run start: sort instances by id (determinism, SA-08); `pinned = resolvePinned(opts.parts, dep)` (T-B11-07); `found: false` (missing or digest mismatch) gives the R-028 placeholder and a `not-modelled` event with reason `declared` and detail "unknown part"; else `def = pinned.def` and `resolveLayers(def, instance.params, makeModelEnv())`. Tick: for each logic part, read input nets, threshold to bits (a voltage between `vil` and `vih` is "floating": hold the last bit and emit `logic-input-floating` once), `evalLogic`; if outputs changed, `schedule(nowNs + delayNs, ...)` the output update; an output of 0 or 1 drives the net as a source (Vdd or 0) behind `driveOhms`; `'z'` releases the net. Phase order (SA-08): a pin write and its node voltage share a timestamp; logic outputs apply in the `dc-event` phase after the analog solve of the same timestamp, ranked after MCU engines. How the parts reach the orchestrator: the Studio run host already builds the netlist with `buildSimNetlist(doc, reg)` (T-B3, `Pick<PartRegistry, 'get'>`); it passes the same registry instance as `RunOptions.parts`, and a caller that omits it gets the app registry |
| | state transitions | Per logic part: `idle` to `pending(outputs, atNs)` to `idle`. A new input change while pending replaces the pending update (inertial delay) |
| | validation rules | None new (validator T-B11-01 already ran) |
| | error conditions | A logic part whose output net is also driven by another source: the analog solver reports the existing contention state (T-B8-06); no new code |
| | edge cases | `delayNs` 0: output applies in the same timestamp, after the analog solve. A part with both an `element` and a `logic` layer. Two logic parts in a loop (an SR latch): settles by the delay; a zero-delay loop is caught by the existing per-timestamp iteration cap (T-B8-09) |
| | permissions | None |
| | performance | One logic part adds under 20 microseconds per tick (ESTIMATED). Resolution once per run |
| | migration | None. The seven B2 descriptors keep working because `element` layers take the same path |
| Verification | unit tests | `src/sim/digital/logic-part.test.ts`: thresholds per family; floating input diagnostic once; inertial delay; `'z'` releases. `src/sim/orchestrator.models.test.ts`: instances resolve in id order; a part with only `none` layers emits exactly one event and the rest runs; an unknown part emits "unknown part"; replay record holds exact `id@version` |
| | integration tests | `src/sim/models/custom-part.test.ts` (headless harness): a project with a descriptor-built NAND part, two push buttons and an LED: truth table over the 4 input combinations through the real solver; hash equal over 10 runs (SA-06); the pinned-version test from T-B11-07 using this path |
| | Playwright | Covered by T-B11-10 |
| | fixtures | `src/sim/models/testdata/nand-part.component.json`, `nand-project.json` |
| | acceptance | Given a NAND part from a truth table, When both inputs go high, Then the output pin goes low after the declared delay. Given a part whose layers are all `none`, When I run, Then the part shows "not modelled yet" once and the Uno still runs |
| | observability | `not-modelled` and `logic-*` events appear in the existing event channel (Problems pane and the part chip) |
| | release blockers | Any `Date.now`, `performance.now` or `Math.random` in `src/sim` (the T-B3-10 lint ban) |
| Delivery | definition of done | Section 4; SA-06 style repeat recorded in the commit body |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim`; `npx tsc -p tsconfig.portable.json` |
| | docs | `docs/FIDELITY.md`: logic thresholds table and the "not modelled yet" event |
| | rollback | Revert the commit |
| | later tasks need | `makeModelEnv`, `SimEvent` member `not-modelled`, `LogicPart` (T-B11-10) |

---

### T-B11-17 Registry entries and failure models from descriptors

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-17 / Fidelity registry and fault models, `src/sim/registry`, `src/sim/faults` / B11 |
| | priority, size, status | P1, M, not started |
| | dependencies | T-B11-01. Phases B8 (T-B8-03 fidelity registry and loader, T-B8-22 registry data), B10 (T-B10-02 `models.ts` and `failure-models.json`, T-B3-20 cause ids) |
| Intent | problem | ADR-0208: the descriptor is the authored source for `part-model` and failure-model entries. Written twice they drift. Custom parts also need a tier chip and "What it models" without a hand-written registry entry |
| | target user | Anyone reading a part's fidelity; the fault detectors of B10 |
| | user story | As someone who made a part, my part shows its tier and what it models, and I never edit the registry |
| | expected behaviour | A function turns a descriptor into a `FidelityEntry` and a list of `FailureModel`s. Core entries are written by `scripts/gen-part-entries.mjs` into `src/sim/registry/data/parts.generated.json` (committed, never hand-edited, checked by `npm run content:check`). Local and imported entries are generated at load into a runtime registry and capped at tier T1 |
| | success metric | Entries for all nine examples pass B8's tier rule (asserted tier not above computed tier, SA-17); the L298N example yields 7 injectable-fault references and its scripted thermal cut-out is listed under `mocked` |
| Implementation | existing files | `src/sim/registry/entries.ts`, `tiers.ts`, `data/*.json` (T-B8-03); `src/sim/faults/models.ts`, `data/*.json`, `cause-ids.ts` (T-B10-02, T-B3-20); `COMPONENT_SCHEMA.md` 4.17 (mapping table); `ADR-0208`; `SIMULATION_ARCHITECTURE.md` 13.3 and 16.2 |
| | new files | `src/sim/registry/from-descriptor.ts`, `src/sim/faults/from-descriptor.ts`, `scripts/gen-part-entries.mjs`; generated and committed with its generator: `src/sim/registry/data/parts.generated.json` |
| | edited files | `src/sim/registry/entries.ts` (accept runtime entries with an `origin`, and the `{ entries: [...] }` shape of the generated file if the loader reads one entry per file), `src/sim/faults/models.ts` (load descriptor models beside data models; descriptor wins on a duplicate). Five source files |
| | modules and signatures | `export function entryFromDescriptor(def: ComponentDescriptor, origin: Trust): FidelityEntry; export function registerPartEntries(reg: FidelityRegistry, defs: readonly ComponentDescriptor[], origin: Trust): void;` and `export function failureModelsFromDescriptor(def: ComponentDescriptor): FailureModel[]; export function injectableFaultsFromDescriptor(def: ComponentDescriptor): InjectableFaultRef[];` (type names follow B8-03 and B10-02; adapt). `scripts/gen-part-entries.mjs [--check]` reads every flat `src/parts/data/*.component.json`, calls `entryFromDescriptor(def, 'core')` (same Node type-stripping import and fallback as T-B11-01) and writes `parts.generated.json` as `{ entries: FidelityEntry[] }` sorted by id; the entry id is `part:<descriptor id>@<major>` (kind `part-model`, which matches B8's id shape); `--check` exits 1 when the file differs. `npm run content` runs it through `scripts/gen-parts-index.mjs` (T-B11-02a), and `npm run content:check` checks it. `models.ts`: `loadFailureModels()` merges `failure-models.json` with `failureModelsFromDescriptor` for every registered descriptor |
| | data model | Mapping (CS 4.17, RC-55): `what_it_models` to `implements`; `failure_modes[]` with `implemented_as: 'scripted'` to `mocked`; `not_modelled` to `unsupported`; `validity` to `operatingRange`; `known_gaps` to `knownFailureCases`; each rating to `parameterSources`: `manufacturer` slot gives type `datasheet`, `simulation` slot with `derived_from` gives `fit`, `simulation` without it gives `assumption`, `measured` gives `measurement`. `validation` is **not** written from the descriptor: CI writes it from `tests[]`. Failure model: `when[]` to the trigger text (LED: `peak(i(A)) > 2.5 * rating.forward_current_continuous`), `for` to `window`, `effect` to `outcome`, `derivation` and `source` to the record, `implemented_as` carried |
| | input and output schemas | As signatures |
| | API contracts | None |
| | algorithm | Pure mapping. Origin cap: `assertedTier = origin === 'core' ? def.simulation.tier : min(def.simulation.tier, 'T1')`. Entries from non-core origins go to a runtime map that is never written to disk and never merged into `data/*.json` (ADR-0208 security). Where a descriptor and a record in `failure-models.json` describe the same failure (same `causeId`, and an `appliesTo` entry equal to the descriptor id or one of its `legacy_ids`), the descriptor-made model wins, `models.ts` ignores the data record and writes one line naming both to the test log (T-B11-02d deletes those records). A `family:*` record is never a duplicate |
| | state transitions | None |
| | validation rules | S-17 cause ids are already checked by T-B11-01 |
| | error conditions | A descriptor missing `what_it_models` for a modelled status was rejected earlier; this code assumes valid input and throws on invalid input (programming error) |
| | edge cases | A part with no `failure_modes` gives an empty list. A `scripted` mode keeps its `hints[]`. Tier `T0` stays `T0` |
| | permissions | None |
| | performance | Build time only for core; at load for library parts, O(parts) |
| | migration | If B10-02 already wrote records for a part that B11 converts, they stay in `failure-models.json` and are ignored (see the algorithm) until T-B11-02d deletes them in one commit. No conversion task touches that file. If T-B8-22 wrote a hand-made entry for a descriptor id, the guard test below fails and this task deletes that entry; the commit body tells the owners of the T-B8-22 data: write no `part:` entries, because part-model entries for the 34 items come only from the generator (ADR-0208, one source of truth) |
| Verification | unit tests | `src/sim/registry/from-descriptor.test.ts`: the mapping for `led-5mm`; origin cap for an imported part claiming `T2` (schema allows the enum, the cap lowers it); `parameterSources` types for all three slots; B8's tier rule passes for the nine examples. `src/sim/faults/from-descriptor.test.ts`: LED trigger text equals the CS 4.17 example string; L298N scripted cut-out is `mocked`; a duplicate of a `failure-models.json` record is ignored in favour of the descriptor model and logged. `src/sim/registry/part-entries.guard.test.ts`: fails when any file in `src/sim/registry/data/` other than `parts.generated.json` holds an entry whose `id` equals `part:<descriptor id>@<major>` for a flat descriptor, or a `part-model` entry whose `id` contains a descriptor id; fails when `parts.generated.json` differs from the generator's output. |
| | integration tests | `src/sim/registry/part-entries.test.ts`: after registering the nine examples the "What it models" panel data (T-B8-04 selector) returns text for each |
| | Playwright | None |
| | fixtures | The nine examples |
| | acceptance | Given a local part with tier `T2` in its file, When registered, Then its chip shows `T1`. Given the L298N descriptor, When entries are built, Then the thermal cut-out appears as scripted |
| | observability | None |
| | release blockers | A non-core entry written into shipped registry data |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/registry src/sim/faults`; `node scripts/gen-part-entries.mjs --check` |
| | docs | `docs/FIDELITY.md`: one line "part entries are generated from descriptors" |
| | rollback | Revert the commit |
| | later tasks need | `registerPartEntries`, `failureModelsFromDescriptor`, the generated entries file (02d regenerates it; 14, 16) |

---

### Procedure C: how one figure becomes one descriptor

Tasks T-B11-02b1, 02b2, 02c1, 02c2, 03a, 03b1 and 03b2 all follow this procedure. It is written once here; each package lists only its items and what differs.

| Step | Do | Why |
|---|---|---|
| C1 | Run `node scripts/part-draft.mjs <part\|module> <legacy-id> --out <scratch dir>` and read the printed `TODO` list | The tool states what the figure knows; the person fills the rest |
| C2 | Read the figure file (`figures/parts/<id>.js` or `figures/modules/<id>.js`), the fact sheet in `docs/facts/` when one exists, and the lesson text that uses the part in `src/content/` | Sources must be real documents already in the repo or read in this task |
| C3 | **Sources.** List only documents that exist in the repo or that you read in this task, with `kind`, `reliability`, `retrieved`, `url`, `revision`. Cite page, table or `file:line` in each `loc`. A datasheet-class source is allowed only if you read the datasheet. Otherwise set `identity.generic: true` and use kinds `fact-sheet`, `lesson` or `own-estimate` with reliability `secondary` or `unverified`. Never write a source you did not read | R1 of the roadmap (constants with no source); BRIEF question 19 |
| C4 | **Numbers.** Every number is in one rating slot: `manufacturer` (stated, with `source`), `simulation` (assumed, with `rationale` and `confidence`) or `measured` (never used in B11: no bench data exists, For Amar item 3). A constant from the figure that has no source goes in the `simulation` slot with `confidence: low` and the rationale "constant in <file>:<line>, no source found" ("assumed" per the roadmap R1 mitigation). `used_by_model` names the slot the model reads | CS 4.6; R-132 |
| C5 | **Pins.** One `pins[]` entry per leg or header hole, with `designator` as printed, `type`, `class`, `polarity` where the leg has one, and `position` in millimetres in the part frame (origin bottom-left, +y up) read from the figure's geometry. Set `dimensions.accuracy` to 0.3 for values read from a photo-like figure and 1.0 where the figure file says plus or minus 1 mm. Put internally joined pins in `groups[]` | R-131; PDM 5.3 |
| C6 | **Layers.** Map the legacy `elec` to `element` layers (CS section 5 table): terminals to pin ids, parameters as `from_rating` or `by_parameter`. Where the legacy behaviour cannot be written in the schema (a lookup curve, a terminal swap by parameter, a power-tree rule in `figures/engine/bench.js`, a bridge model inside a module page), model the default case or use `{kind: "none", reason}` and write the gap into `simulation.known_gaps` with the `file:line` as evidence. Never drop it silently (R-FID-3). For module behaviour that lives only in the figure page, set the layer to `none`, add `x_legacy_model: [{ref, path, lines}]` and mark the part `not-modelled-yet` (Q6). A `builtin` layer is allowed only if its ref is a key of `BUILTINS` (T-B11-05a) | Q1, Q6 |
| C7 | **Faults.** Every legacy fault string (`cold:J2`, `missing:JPA`, `wrong-voltage:bench:36`, `reverse-polarity:bench`, `stall`, `addr-a0`, `bypass-5v`, `short:VCC:GND`) becomes an `injectable_faults[]` entry with `legacy_id` equal to the string, a `kind` from the schema enum, `target`, `cause_id` from `src/sim/faults/cause-ids.ts` (else `x-<slug>`, listed in the commit body), at least one `symptom_ids` entry, and up to 3 `hints` taken from the fact sheet or the fault label in the figure. No invented hint text. The test in T-B11-02a checks that every legacy string is present | CS 4.10; RC-43 |
| C8 | **Fidelity.** `simulation.tier` is `T1` for a part with a runnable element layer, otherwise `none`; never `T2` or `T3` in B11. `status` follows Q6. `what_it_models`, `not_modelled`, `known_gaps` are plain sentences, pass `copyCheck`, and say what is a datasheet figure, what is assumed. No sentence uses the banned words | R-132; D-007 |
| C9 | **Tests.** A part with a runnable `element` layer gets one `golden-trace` fixture where a shape fits (`series2` for a two-terminal element such as `res`, `led` or `diode`; `npn-switch` for an `npn`), with `expect` derived by hand from the descriptor's own ratings and written in `derivation`, run with `runFixture`; plus one `conformance` fixture (`layers-resolve`, `terminals-are-pins`, `ratings-have-slot`). A part whose element no shape fits (motor, servo, stepper, sensor) gets the `conformance` fixture only, and a `known_gaps` line says there is no numeric test. A device-backed module (a `builtin` layer: `pca9685-module`, `gy521-mpu6050`, `hc-sr04`) gets one `conformance` fixture with `shape: 'none'` and the `builtin-binds` check, and no golden-trace. A `not-modelled-yet` part needs no fixture. Files go in `src/parts/data/tests/` next to the data | CS 4.11; REF-6 |
| C10 | **Provenance.** `license: "LicenseRef-iynk-pending"` (D-017 is open), `origin: "core"`, `third_party_content` true when text, numbers or art came from a third-party page (list each in `attribution[]`), `review.status: "ci-checked"`, `created` today's date | R-138 |
| C11 | **Art.** `visual.breadboard.figure {kind, id, path, sha256}` with `path` the built page (`public/figures/parts/<id>.html` or `.../modules/<id>.html`), `legs` as the figure's leg order, `span` as in the figure. For the six items with both figures, name the **part** figure and add `x_module_figure` (Q4). `visual.fallback` is always present with the renderer from the leg count | CS 4.13; Q4 |
| C12 | **Touch only your own files.** Edit nothing outside your descriptors and their `tests/` fixtures: not `src/sim/faults/data/`, not `src/sim/registry/data/`, not the barrel, not `package.json`. Group 3 runs in parallel, so a shared file would conflict. T-B11-02d regenerates the barrel and the generated entries and deletes duplicate B10 failure-model records once all descriptors exist | Q9 |
| C13 | Run `node scripts/validate-part.mjs --trust core <file>` for each descriptor, then the gates in the package. Fix every issue. Do not edit any gate to make a descriptor pass | Section 4 |

Descriptor file names: `core.<slug>` is stored flat as `src/parts/data/<slug>.component.json` (no subfolder, so every glob in B2, B9 and B10 sees it). Slug rule: the legacy id, except modules named after a chip get `-module` (as the shipped examples `l298n-module`, `bme280-module` do), and the MPU-6050 keeps the example id `gy521-mpu6050`.

---

### T-B11-02b1 and T-B11-02b2 Convert 8 parts in two tasks

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-02b1 (rgb-led, ldr, fsr402, tmp36, diode-1n4007) and T-B11-02b2 (npn-2n2222, tip120, multimeter) / Part descriptors (data) / B11. Two tasks, two commits, run at once; both follow this package |
| | priority, size, status | P0, 02b1 L and 02b2 M, not started |
| | dependencies | T-B11-02a, T-B11-17 (both tasks). Not T-B11-09: the gates call `resolveLayers` and `runFixture`, not the orchestrator |
| Intent | problem | R-131: each of the existing parts needs a descriptor with pins, groups, art, model kind and fidelity |
| | target user | Anyone placing these parts in Studio; the fault detectors that read their thresholds |
| | user story | As someone building a circuit, I place a TIP120 and see what it is, which pins it has, and how far to trust its model |
| | expected behaviour | Descriptor files (5 in 02b1, 3 in 02b2) that follow Procedure C and pass every gate in `src/parts/library.test.ts` |
| | success metric | 8 of 8 (5 + 3) pass `validate-part.mjs`; 0 banned words; every non-`not-modelled-yet` part has a passing fixture |
| Implementation | existing files | See the item table. Shared: `figures/engine/bench-solve.js:88-113` (what the solver reads), `:102` (LED `rd: .5` fixed), `:104` (diode `vf: .7, rd: .2` fixed, ignoring the `vf 0.8` that `figures/parts/diode-1n4007.js:31` states), `:105-109` (npn reads `hfe`, `hfr`, `vbe`, `vcesat` only), `:176` and `:232` (`darlington` only matters after burn-out) |
| | new files | One descriptor per item, flat: `src/parts/data/<slug>.component.json` (02b1 writes 5, 02b2 writes 3; one data set each) and the fixtures `src/parts/data/tests/<slug>.*.json` |
| | edited files | None (C12) |
| | modules and signatures | None (data) |
| | data model | `iynk.component/1` |
| | input and output schemas | As schema |
| | API contracts | None |
| | algorithm | Procedure C per item. The item table lists what the figure already states |
| | state transitions | None |
| | validation rules | Gates of T-B11-02a |
| | error conditions | A gate failure blocks the commit |
| | edge cases | Listed per item |
| | permissions | None |
| | performance | Each descriptor under 32 KB minified (CS section 7); hard cap 256 KiB |
| | migration | The legacy ids stay resolvable through `identity.legacy_ids` |
| Verification | unit tests | `src/parts/library.test.ts` (T-B11-02a), unchanged; plus the new fixtures run by it |
| | integration tests | `src/sim/models/custom-part.test.ts` style check is not repeated; T-B11-10 places an LED-class part |
| | Playwright | None |
| | fixtures | `tests/<slug>.golden.json`, `tests/<slug>.conformance.json` per modelled part |
| | acceptance | Given each legacy id of the task, When `library.test.ts` builds a registry from the flat folder and calls `descriptorForLegacy(reg, id)`, Then a descriptor is returned and passes every gate (the shipped `builtinRegistry()` includes it only after T-B11-02d). Given `core.diode-1n4007`, When its page opens, Then it says the solver uses a fixed 0.7 V and 0.2 ohm and lists the 0.8 V of the figure as a known gap |
| | observability | The gate summary table |
| | release blockers | A banned word; a source the agent did not read |
| Delivery | definition of done | Section 4 plus Procedure C13 |
| | verify commands | 02b1: `node scripts/validate-part.mjs --trust core src/parts/data/{rgb-led,ldr,fsr402,tmp36,diode-1n4007}.component.json`. 02b2: `node scripts/validate-part.mjs --trust core src/parts/data/{npn-2n2222,tip120,multimeter}.component.json`. Both: `npm run typecheck && npm run lint`; `npx vitest run src/parts`; `npm run schema:check`. Neither runs `npm run content:check`, which is red until T-B11-02d |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | These ids in `getAppRegistry()` after T-B11-02d (T-B11-19 coverage, 10 e2e) |

Items (all from `figures/parts/`, VERIFIED by reading the lines cited). The first five rows belong to T-B11-02b1, the last three to T-B11-02b2:

| Descriptor id | Figure | Legs (pins) | Legacy model | Expected status and notes |
|---|---|---|---|---|
| `core.rgb-led` | `rgb-led.js:50-58` | `R, COM, G, B` (`rgb-led.js:51`) | Three `led` elements with `ch`; common cathode or anode by parameter `common` (`:53`, `:58`) | `partly-modelled` T1. The terminal swap by parameter cannot be written: model common cathode and record "common anode not represented" as a known gap |
| `core.ldr` | `ldr.js:37-44` | `1, 2` | `res` whose ohms follow lux (`ohmsAt(lux)`, `:44`) | `partly-modelled` T1 as a fixed resistor at the default lux; known gap: resistance does not follow light until a curve kind exists (Q1) |
| `core.fsr402` | `fsr402.js:45-52` | `1, 2` | `res` from force, open below `FMIN`, open when "tabs melted" (`:52`) | Same pattern as `ldr`; the melted-tabs fault becomes an `injectable_fault` of kind `open_pin` |
| `core.tmp36` | `tmp36.js:41-49` | `+VS, VOUT, GND` | `sensor` with `supply [0,2]`, `out 1`, `vout` = 0.5 V + 10 mV per degree C (`:49`), `vmin 2.7`, `vmax 5.5`, `vabs 7` | `partly-modelled` T1 if the B3 solver ports the `TS` element (`bench-solve.js:112`), else `none` and `not-modelled-yet`. A `physical_inputs` channel `temperature` with unit `degC` |
| `core.diode-1n4007` | `diode-1n4007.js:28-31` | `A, K` | `diode`; the solver fixes `vf .7, rd .2` (`bench-solve.js:104`) although the figure states `vf 0.8`, `n 1.808`, `rs`, `vrrm` by type | `partly-modelled` T1; **two** ratings: the figure's 0.8 V in the `simulation` slot with rationale, and the solver's 0.7 V recorded as a known gap with `bench-solve.js:104` as evidence. `used_by_model` names the value the solver really uses |
| `core.npn-2n2222` | `npn-2n2222.js:40-43` | `1, 2, 3` (pinout `EBC` or `CBE`, `reversed`) | `npn` with `pins` order from `ORDER[p.pinout]` | `partly-modelled` T1. Pin order is a parameter; the descriptor fixes the default `EBC` and lists the alternative as a build option that remaps terminals only if the schema allows it, otherwise as a known gap |
| `core.tip120` | `tip120.js:42-47` | `B, C, E` | `npn` with `darlington: true`, `vbe 1.3`, `vcesat .9`, `icmax 5`, `pmax 2`, `tjmax 150` (`:45-46`) | `partly-modelled` T1; the solver reads `hfe`, `vbe`, `vcesat` only (`bench-solve.js:109`); `icmax`, `pmax`, `tjmax` become ratings that no model reads (`used_by_model: none`) and failure modes with `implemented_as` per what the figure does |
| `core.multimeter` | `multimeter.js:34-35` | `COM, V` | None (an instrument figure; CE-09 keeps only this one as a part) | `not-modelled-yet`, tier `none`, kind `instrument`, category `instrument`; the Studio instrument is B8's `Multimeter.tsx` |

---

### T-B11-02c1 and T-B11-02c2 Convert 8 parts in two tasks

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-02c1 (dc-motor, fan, tt-motor, servo-sg90, stepper-28byj48) and T-B11-02c2 (nema17, lipo-2s, aa-holder-4) / Part descriptors (data) / B11. Two tasks, two commits, run at once; both follow this package |
| | priority, size, status | P0, 02c1 L and 02c2 M, not started |
| | dependencies | T-B11-02a, T-B11-17 (both tasks). Not T-B11-09: the gates call `resolveLayers` and `runFixture`, not the orchestrator |
| Intent | problem | R-131 for the actuators and power sources. Motor and servo numbers are constants in figure code with no source (roadmap R1) |
| | target user | Robotics and board-lab builders; the benches after B13 |
| | user story | As a builder, I see the SG90's 4.8 to 6 V window and that its current numbers are assumptions, not datasheet values |
| | expected behaviour | Descriptors (5 in 02c1, 3 in 02c2) that follow Procedure C. Mechanical numbers that the schema's `mechanics` block can hold (`motor.r_ohm`, `servo.stall_torque_nm`) are filled only where the figure states a value and a source exists; otherwise they are left out and the gap is stated |
| | success metric | 8 of 8 (5 + 3) pass the gates; every unsourced constant sits in a `simulation` slot with `confidence: low` |
| Implementation | existing files | See the item table. Shared: `figures/engine/bench-solve.js:110-111` (motor and servo elements read almost nothing from `elec`), `COMPONENT_SCHEMA.md` 4.18 (mechanics block, schema 1.1) |
| | new files | One descriptor per item, flat: `src/parts/data/<slug>.component.json` (02c1 writes 5, 02c2 writes 3; one data set each) and the fixtures `src/parts/data/tests/<slug>.*.json` |
| | edited files | None (C12) |
| | modules and signatures | None (data) |
| | data model | `iynk.component/1` including optional `mechanics` |
| | input and output schemas | As schema |
| | API contracts | None |
| | algorithm | Procedure C per item |
| | state transitions | None |
| | validation rules | Gates of T-B11-02a |
| | error conditions | Gate failure blocks the commit |
| | edge cases | `tt-motor.js`, `nema17.js`, `lipo-2s.js`, `aa-holder-4.js` have no `elec:` line in the figure (VERIFIED by grep), so they have no legacy model. They are `not-modelled-yet` unless the agent can cite a source for a simple model; a battery is a `voltage_source` element, which the solver does not provide yet (CS 4.9 second group), so the layer is `none` |
| | permissions | None |
| | performance | Under 32 KB each |
| | migration | Legacy ids resolve |
| Verification | unit tests | `src/parts/library.test.ts` and new fixtures |
| | integration tests | None new |
| | Playwright | None |
| | fixtures | `tests/<slug>.*.json` for modelled parts |
| | acceptance | Given `core.servo-sg90`, When validated, Then its voltage range 4.8 to 6 V is in a rating whose slot and source are named, and the current figures `iidle .008`, `imove .2`, `istall .7` are marked as assumed. Given `core.lipo-2s`, When its page opens, Then it says "not modelled yet" with the reason "no voltage source element in the solver" |
| | observability | Gate table |
| | release blockers | A rating from the figure presented as a datasheet number |
| Delivery | definition of done | Section 4 plus C13 |
| | verify commands | 02c1: `node scripts/validate-part.mjs --trust core src/parts/data/{dc-motor,fan,tt-motor,servo-sg90,stepper-28byj48}.component.json`. 02c2: `node scripts/validate-part.mjs --trust core src/parts/data/{nema17,lipo-2s,aa-holder-4}.component.json`. Both: `npm run typecheck && npm run lint`; `npx vitest run src/parts`; `npm run schema:check`. Neither runs `npm run content:check`, which is red until T-B11-02d |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | Ids for T-B11-19 and B13 (robotics benches), resolvable after T-B11-02d |

Items. The first five rows belong to T-B11-02c1, the last three to T-B11-02c2.

| Descriptor id | Figure | Legs (pins) | Legacy model | Expected status and notes |
|---|---|---|---|---|
| `core.dc-motor` | `dc-motor.js:67-73` | `+, -` | `motor` with `ohms R`, `ke`, `i0`, `iload`, `vstart`, `vstop`, `vrated [3,6]`, `vmax`, inductive (`:73`); the solver stamps `M` with only two nodes (`bench-solve.js:110`) | `partly-modelled` T1 with the load parameter (`prop`, `free`, `stalled`) as an enum; constants with no source are `simulation` slots, low confidence |
| `core.fan` | `fan.js:48-54` | `+, -` | `motor` with `brushless: true`, `polar`, `vrated`, `range [4,5.5]`, `rpm` (`:54`) | `partly-modelled` T1; reverse polarity as a failure mode only if the figure treats it (it sets `polar: true`) |
| `core.tt-motor` | `tt-motor.js:62-63` | `+, -` | No `elec:` line | `not-modelled-yet`; the robotics benches model it in their own figure code until B13 |
| `core.servo-sg90` | `servo-sg90.js:44-53` | `GND, V+, SIG` | `servo`, `vrange [4.8,6]`, `period .02`, pulse `[US0, US1]`, dead band, speed, `iidle .008`, `imove .2`, `istall .7` (`:53`) | `partly-modelled` T1; protocol `servo-pwm` on `SIG` with `status: modelled` only if the B3 binder drives it, else `not-modelled-yet` |
| `core.stepper-28byj48` | `stepper-28byj48.js:40-46` | `B, P, Y, O, R` | `stepper`, coils `B,P,Y,O`, common `R`, `ohms 50`, `vrated 5`, step tables (`:46`) | `partly-modelled` T1 as four coils to the common lead (`bench-solve.js:90-94`); step sequences stay in the figure and are noted as a gap |
| `core.nema17` | `nema17.js:46-47` | `BLK, GRN, RED, BLU` | No `elec:` line | `not-modelled-yet`. A `mechanics.stepper` block is filled only for values the figure states with a source |
| `core.lipo-2s` | `lipo-2s.js:24-25` | `+, -` | No `elec:` line | `not-modelled-yet` (see edge case); `mechanics.battery` `cells: 2`, nominal 7.4 V (the figure name states it) |
| `core.aa-holder-4` | `aa-holder-4.js:25-26` | `+, -` | No `elec:` line | `not-modelled-yet`; cells in series, nominal 6 V (4 x 1.5 V, stated by the figure name) |

---

### T-B11-03a Convert 5 modules: tb6612fng, l298n, a4988, uln2003, pca9685

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-03a / Module descriptors (data) / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-02a, T-B11-17. Not T-B11-09: the gates call `resolveLayers` and `runFixture`, not the orchestrator |
| Intent | problem | The motor-driver modules carry the most behaviour in figure code: bridge models, power-tree rules, seven fault strings on the L298N. They need descriptors that state honestly what the Studio runs |
| | target user | Robotics and board-lab builders |
| | user story | As a builder placing an L298N, I see its seven injectable faults and that its bridge model is "not modelled yet in Studio" until B12 |
| | expected behaviour | 5 descriptors; each module's legacy fault strings all appear as `injectable_faults[].legacy_id`; behaviour that lives in the figure page is `none` with `x_legacy_model` |
| | success metric | 5 of 5 pass gates; 7 + 1 + 2 + 2 + 4 legacy fault strings present (counts from section 1) |
| Implementation | existing files | See item table. Shared: `figures/engine/bench.js` power-tree rules (about lines 225 to 290, DOCUMENTED in `COMPONENT_SCHEMA.md` section 3, re-check the lines), `schemas/examples/components/l298n-module.component.json` (start here for the L298N), `docs/facts/l298n.md`, `tb6612.md`, `a4988.md`, `pca9685.md` |
| | new files | 5 flat files `src/parts/data/<slug>.component.json` (one data set) and fixtures `src/parts/data/tests/<slug>.*.json` |
| | edited files | None (C12) |
| | modules and signatures | None (data) |
| | data model | `iynk.component/1` |
| | input and output schemas | As schema |
| | API contracts | None |
| | algorithm | Procedure C. The L298N example's three `builtin` layers (`module:l298n-bridge@1`, `power:linear-regulator@1`, `thermal:series-steady@1`) are not in `BUILTINS`, so they become `none` layers with `x_legacy_model` entries (`figures/modules/l298n.js:40-60`, `figures/engine/bench.js` regulator rules) and the status becomes `not-modelled-yet`, tier `none` (Q6). `pca9685` binds to `device:pca9685@1`, which **is** registered, so it can stay `partly-modelled` with a `conformance` test |
| | state transitions | None |
| | validation rules | Gates of T-B11-02a |
| | error conditions | Gate failure blocks the commit |
| | edge cases | `uln2003` also has a part figure (legs `IN1..IN4, GND, VCC`, three element types inside one `elec`); the descriptor is one product with `x_module_figure` (Q4). The L298N example records that the bridge assumes a fixed 0.6 A motor and 3 ohm winding (`l298n.js:25-26`) and that the thermal cut-out is a timer (`l298n.js:56`); keep both as known gaps |
| | permissions | None |
| | performance | L298N example is 28.8 KB; keep each under 40 KB |
| | migration | Legacy ids resolve; `lm2596` is in 03b2 |
| Verification | unit tests | `src/parts/library.test.ts` (fault coverage check 9, status honesty check 3) |
| | integration tests | None new |
| | Playwright | None |
| | fixtures | `tests/<slug>.conformance.json` for `pca9685-module`, with `shape: 'none'` and the check `builtin-binds` (Procedure C9) |
| | acceptance | Given `core.l298n-module`, When validated, Then 7 injectable faults carry `legacy_id` `reverse-polarity:bench`, `stall`, `cold:J2`, `missing:JPA`, `missing:JP5`, `wrong-voltage:bench:6`, `wrong-voltage:bench:36` and status is `not-modelled-yet`. Given `core.pca9685-module`, When its `conformance` fixture runs, Then the `builtin-binds` check passes: `BUILTINS.get('device:pca9685@1').make(defaults)` returns a `Pca9685` (`src/lib/interp/devices.ts:104`) and a `write` then `read` of the register named in the fixture returns the bytes that its `derivation` cites from that file. |
| | observability | Gate table |
| | release blockers | A fault string missing; a `builtin` ref not in `BUILTINS` |
| Delivery | definition of done | Section 4 plus C13 |
| | verify commands | `node scripts/validate-part.mjs --trust core src/parts/data/{tb6612fng-module,l298n-module,a4988-module,uln2003-module,pca9685-module}.component.json`; `npm run typecheck && npm run lint`; `npx vitest run src/parts`; `npm run schema:check`. Does not run `npm run content:check`, which is red until T-B11-02d |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | `x_legacy_model` pointers for B12 and B13 (they register the bridge and regulator refs and flip the status) |

| Descriptor id | Figure | Legacy faults (VERIFIED count) | Fact sheet | Notes |
|---|---|---|---|---|
| `core.tb6612fng-module` | `tb6612fng.js` | `faults:` at `:151`, 2 | `docs/facts/tb6612.md` | Bridge model in the figure page; `not-modelled-yet` |
| `core.l298n-module` | `l298n.js` | `:232`, 7 | `docs/facts/l298n.md` | Start from the example; `not-modelled-yet` in Studio |
| `core.a4988-module` | `a4988.js` | `:225`, 1 (`missing:LINK`) | `docs/facts/a4988.md` | Microstepping logic in the figure; `not-modelled-yet` |
| `core.uln2003-module` | `uln2003.js` and `figures/parts/uln2003.js` | `:139`, 2 | none | Part figure shows array of diode, npn, res; a `subcircuit` of `npn` elements is possible; decide by what the solver provides, record the choice |
| `core.pca9685-module` | `pca9685.js` | `:214`, 4 | `docs/facts/pca9685.md` | `device:pca9685@1` registered, so `partly-modelled` T1 is possible |

---

### T-B11-03b1 and T-B11-03b2 Convert 6 modules in two tasks

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-03b1 (mpu6050, hc-sr04, qtr-8rc) and T-B11-03b2 (soil-moisture, traffic-light, lm2596) / Module descriptors (data) / B11. Two tasks, two commits, run at once; both follow this package |
| | priority, size, status | P0, M each, not started |
| | dependencies | T-B11-02a, T-B11-17 (both tasks). Not T-B11-09: the gates call `resolveLayers` and `runFixture`, not the orchestrator |
| Intent | problem | Sensors and the regulator module complete R-131 |
| | target user | Board-lab and robotics builders |
| | user story | As a builder I place an HC-SR04 and the Studio runs its device model |
| | expected behaviour | 6 descriptors (3 in 03b1, 3 in 03b2) following Procedure C. `mpu6050` and `hc-sr04` bind to registered devices and can be `partly-modelled` T1 with a conformance test; `qtr-8rc`, `soil-moisture`, `traffic-light`, `lm2596` follow what the Studio can run |
| | success metric | 6 of 6 pass gates; legacy fault strings all present (03b1: mpu6050 4, hc-sr04 4, qtr-8rc 5; 03b2: soil-moisture 1, traffic-light 1; `lm2596` has none; counts read from the `faults:` lines) |
| Implementation | existing files | See table. Shared: `schemas/examples/components/mpu6050-gy521.component.json` (start here; it names the module page, Q4 changes that), `src/lib/interp/devices.ts:21` (`Mpu6050`, constant gyro bias at `:30`), `:261` (`HcSr04`); `docs/facts/mpu6050.md`, `hcsr04.md`, `qtr8rc.md`, `lm2596.md` |
| | new files | One descriptor per item, flat: `src/parts/data/<slug>.component.json` (03b1 writes 3, 03b2 writes 3; one data set each) and the fixtures `src/parts/data/tests/<slug>.*.json` |
| | edited files | None (C12) |
| | modules and signatures | None (data) |
| | data model | `iynk.component/1` |
| | input and output schemas | As schema |
| | API contracts | None |
| | algorithm | Procedure C. The MPU-6050 example records 5 V on a 3.3 V logic pin as `not-implemented` (`docs/facts/mpu6050.md` section 3.6) and the noise, drift and DLPF as known gaps; keep those. `lm2596` is a buck regulator: the solver has no `regulator_linear` or switching element, so the layer is `none` with `x_legacy_model` and status `not-modelled-yet` |
| | state transitions | None |
| | validation rules | Gates |
| | error conditions | Gate failure blocks the commit |
| | edge cases | `mpu6050.js` exists as both a part (legs `LABELS`, `figures/parts/mpu6050.js:55`) and a module; keep the example id `core.gy521-mpu6050`. `traffic-light.js` is three LEDs on a header (category `display` for want of a better one, CE 3.3); model as three `led` elements if the solver accepts the shared-ground wiring, else `none` |
| | permissions | None |
| | performance | MPU example is 24 KB |
| | migration | Legacy ids resolve |
| Verification | unit tests | `src/parts/library.test.ts` |
| | integration tests | None new |
| | Playwright | None |
| | fixtures | `tests/<slug>.conformance.json` for `gy521-mpu6050` and `hc-sr04` with `shape: 'none'` and the check `builtin-binds` (`HcSr04` is checked by class name only, Procedure C9), and for any other module whose status is not `not-modelled-yet` |
| | acceptance | T-B11-03b1: given `core.gy521-mpu6050`, When validated, Then 4 injectable faults exist and 5 V on `VCC` logic is a `not-implemented` failure mode. T-B11-03b2: given `core.lm2596-module`, When its page opens, Then it says "not modelled yet" with the reason |
| | observability | Gate table |
| | release blockers | As 03a |
| Delivery | definition of done | Section 4 plus C13 |
| | verify commands | 03b1: `node scripts/validate-part.mjs --trust core src/parts/data/{gy521-mpu6050,hc-sr04,qtr-8rc}.component.json`. 03b2: `node scripts/validate-part.mjs --trust core src/parts/data/{soil-moisture,traffic-light,lm2596-module}.component.json`. Both: `npm run typecheck && npm run lint`; `npx vitest run src/parts`; `npm run schema:check`. Neither runs `npm run content:check`, which is red until T-B11-02d |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | Ids for T-B11-19 and B12, resolvable after T-B11-02d |

Items. The first three rows belong to T-B11-03b1, the last three to T-B11-03b2.

| Descriptor id | Figure | Legacy faults (VERIFIED) | Fact sheet | Notes |
|---|---|---|---|---|
| `core.gy521-mpu6050` | `mpu6050.js` | `:121`, 4 (`missing:C14`, `missing:R6`, `cold:H1.4`, `short:3V3:GND`) | `docs/facts/mpu6050.md` | `device:mpu6050@1` registered |
| `core.hc-sr04` | `hc-sr04.js` and `figures/parts/hc-sr04.js` | `:189`, 4 | `docs/facts/hcsr04.md` | `device:hc-sr04@1` registered; legs `VCC, TRIG, ECHO, GND` |
| `core.qtr-8rc` | `qtr-8rc.js` | `:218`, 5 (`bypass-5v`, `missing:R9`, `cold:J1.4`, `ambient-ir`, `missing:Q1`) | `docs/facts/qtr8rc.md` | Reflectance array read by RC timing; `not-modelled-yet` unless a timing element exists |
| `core.soil-moisture` | `soil-moisture.js` and `figures/parts/soil-moisture.js` | `:147`, 1 | none | Part legs `AOUT, VCC, GND` |
| `core.traffic-light` | `traffic-light.js` and `figures/parts/traffic-light.js` | `:120`, 1 | none | Legs `GND, R, Y, G` |
| `core.lm2596-module` | `lm2596.js` | none | `docs/facts/lm2596.md` | `not-modelled-yet` |

---

### T-B11-02d Serial regeneration after the conversions

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-02d / Generated data and fault-model cleanup / B11 |
| | priority, size, status | P0, S, not started |
| | dependencies | T-B11-02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2 and T-B11-17. It runs first in group 4; no other task in group 4 edits these files, and no group 3 task may still be open |
| Intent | problem | Group 3 adds 27 flat descriptors in parallel. None of those tasks may edit the barrel, the generated entries file or `src/sim/faults/data/failure-models.json`, because up to seven agents would edit the same file at once. Something has to regenerate and clean them once, after all descriptors exist |
| | target user | The orchestrator and every task after it that reads `getAppRegistry()` |
| | expected behaviour | `npm run content` rewrites `src/parts/data/index.generated.ts` (so `builtinRegistry()` loads every flat descriptor) and `src/sim/registry/data/parts.generated.json`. B10 records that duplicate a descriptor-made failure model are deleted from `failure-models.json`. `npm run content:check` is green again |
| | success metric | `descriptorForLegacy(getAppRegistry(), id)` returns a descriptor for all 27 new legacy ids; the `models.ts` test log lists 0 ignored B10 records; `npm run content:check` exits 0 |
| Implementation | existing files | `scripts/gen-parts-index.mjs` (T-B11-02a), `scripts/gen-part-entries.mjs` (T-B11-17), `src/sim/faults/data/failure-models.json` and `src/sim/faults/models.ts` (T-B10-02, T-B11-17; `models.ts` read only) |
| | new files | None |
| | edited files | `src/sim/faults/data/failure-models.json` (delete duplicate records). Regenerated and committed, counted zero: `src/parts/data/index.generated.ts`, `src/sim/registry/data/parts.generated.json` |
| | algorithm | 1) `npm run content`. 2) `npx vitest run src/sim/faults/models.test.ts`; for each B10 record the log says was ignored, delete that record from `failure-models.json`. A `family:*` record is never a duplicate and stays. 3) `npm run content:check`; repeat step 2 if it is red. 4) Commit once; the body lists the deleted record ids and the descriptors that replace them |
| | edge cases | A record whose `appliesTo` names a converted descriptor and other ids: remove only the converted id from `appliesTo` and keep the record. A record whose `causeId` no descriptor failure mode carries stays |
| | permissions, performance, migration | None. Data only |
| Verification | unit tests | `src/parts/builtin.test.ts` (B2 file, edited by 02a) passes with an entry for every flat file; `src/sim/faults/models.test.ts` logs zero ignored records; `src/sim/registry/part-entries.guard.test.ts` (T-B11-17) passes |
| | integration tests | `npx vitest run src/parts src/sim/faults src/sim/registry` |
| | Playwright | None |
| | acceptance | Given the repository after group 3, When `npm run content` and the cleanup are done, Then `npm run content:check` exits 0, `descriptorForLegacy(getAppRegistry(), 'l298n')` is defined, and `failure-models.json` holds no record that a descriptor also defines |
| | release blockers | A deleted record that no descriptor replaces |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run content:check && npm run typecheck && npm run lint`; `npx vitest run src/parts src/sim/faults src/sim/registry` |
| | docs | None |
| | rollback | Revert the commit; the barrel returns to its group 2 content and the deleted records come back (descriptor-made models still win) |
| | later tasks need | `getAppRegistry()` holding all 34 items (T-B11-14, T-B11-19, T-B11-10) |

---

### T-B11-04b Part editor shell: identity, pins, groups, footprint, JSON view, save

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-04b / Studio part editor UI, `src/components/studio` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-04a, T-B11-13, T-B11-18, T-B11-06, T-B11-07, T-B11-01, T-B11-02a (`getAppRegistry` and `PartRegistry.add`). Phase B4 (T-B4-01 router, `StudioEntry`) |
| Intent | problem | F-101, R-134: a person with no code adds a part the catalogue lacks |
| | target user | Amar and his friends; a beginner |
| | user story | As someone with a sensor the catalogue lacks, I name it, add its pins, set its size and save it, and it is in my library |
| | expected behaviour | Route `#/parts/new` and `#/parts/edit/<id>@<version>` open the editor. Tabs: Identity, Pins, Footprint, JSON. Live validation lists problems by field. Save writes a new immutable version to the library with the bump the version rules require. The pin table works from the keyboard |
| | success metric | A new part with 2 pins saves in under 10 actions; axe reports 0 serious or critical violations on the editor; keyboard-only add of 4 pins works |
| Implementation | existing files | `src/studio/router.ts` and `src/components/studio/StudioEntry.tsx` (T-B4-01); `src/components/studio/Inspector.tsx` (form style, T-B4-08); `UX_DESIGN_SYSTEM.md` row J-14 (line 1014: Part Maker, "Beginner mode, raw descriptor, test failing, test passing"); `COMPONENT_ECOSYSTEM.md` 5.2 to 5.6 (journey and error cases) |
| | new files | `src/components/studio/PartEditor.tsx`, `src/components/studio/PinTable.tsx` |
| | edited files | `src/studio/router.ts` (routes `parts/new`, `parts/edit/<key>`), `src/components/studio/StudioEntry.tsx` (mount through `next/dynamic` with `ssr: false`), `src/i18n/messages/*/parteditor.json` (keys under `identity`, `pins`, `footprint`, `json`, `save`, `issues`) |
| | modules and signatures | `export interface PartEditorProps { baseKey?: string; library: { existingKeys(): ReadonlySet<string>; get(id: string, version: string): ComponentDescriptor \| undefined; save(def: ComponentDescriptor, files: ReadonlyMap<string, Blob>): Promise<PutResult> }; onSaved(def: ComponentDescriptor): void; onClose(): void } ; export function PartEditor(props: PartEditorProps): JSX.Element;` `export function PinTable(props: { pins: DraftPin[]; dispatch: (a: DraftAction) => void; issues: Diagnostic[] }): JSX.Element;` Route type `type PartsRoute = { kind: 'parts-new' } \| { kind: 'parts-edit'; key: string }` |
| | data model | `PartDraft` (T-B11-04a). Art upload: `visual.assets[] {path, media_type, sha256, license, attribution}`; bytes in `files` (relPath to Blob) |
| | input and output schemas | UI only |
| | API contracts | None |
| | algorithm | Debounce `draftIssues` by 250 ms. Save: 1) `draftIssues` must have no errors; 2) new part: version `1.0.0`; edit of `baseKey`: `requiredNextVersion(prev, next)` is shown with the reasons ("Saved as 2.0.0 because pin A changed"), the person may pick a higher version, never a lower; 3) `digestOf(def)` (B2); 4) `library.save`; on `conflict` show both digests and keep the draft; 5) `onSaved` registers the part with `getAppRegistry().add(def, { origin: 'local-user' })` (T-B11-02a), which is what makes "the part is in the registry" true. Art upload: read the file; SVG goes through `sanitizeSvg`, PNG through `checkPng`; a refusal shows the reason and keeps the part without art; the asset needs a license (default: the part's license); a preview uses `svgToDataUrl` in an `<img>`; the fallback preview uses `fallbackSpec` (B2) and `pinsCovered`. Unsaved changes: `beforeunload` guard, and the draft is kept in `localStorage` key `iynk:part-draft:v1` as a per-viewer convenience (wrapped in try/catch; the editor works without it) |
| | state transitions | `editing` to `saving` to `saved` or `conflict`; `form` <-> `json` through `switchMode` |
| | validation rules | CS 9.2 limits: 32 pins, 64 parameters. Pin id rule and uniqueness from 04a |
| | error conditions | Quota (T-B11-13) shows "storage is full"; a refused picture shows the `ArtError` in words; conflict shows both digests |
| | edge cases | Open a core part for editing: Save As makes `local.<slug>` (a copy; core ids cannot be reused, S-15). A phone viewport shows the editor read-only with a note (phone layout is B5-13, LATER). Right-to-left languages are not in the six |
| | permissions | The local person |
| | performance | Typing does not block: validation is debounced and runs off the typing path (no worker needed; 32 pins validate in under 50 ms) |
| | migration | None |
| Verification | unit tests | `src/components/studio/PartEditor.test.tsx` (Testing Library, jsdom): fill name and two pins then Save calls `library.save` once with `id local.<slug>`, version `1.0.0`; editing a pin id offers `2.0.0`; a lower version is not selectable; conflict keeps the draft; JSON mode with broken JSON shows the parse error and does not lose the form; upload of a script-bearing SVG saves the part without script. `PinTable.test.tsx`: Tab order; Enter on the last row adds a row and moves focus; Delete asks confirmation; each cell has an accessible name; `aria-live` announcement text on add and remove |
| | integration tests | Router: `#/parts/new` mounts the editor; leaving with changes asks |
| | Playwright | The axe check and the keyboard path are in T-B11-10 |
| | fixtures | The nine examples as edit targets |
| | acceptance | Given the Add part route, When I enter name "Test LED" and pins A and K and press Save, Then a toast says "Saved as local.test-led@1.0.0" and the part is in the registry. Given I change a pin id and save, Then the version offered is 2.0.0 with the reason shown |
| | observability | `errors` store rows from T-B11-13 only |
| | release blockers | Any `dangerouslySetInnerHTML`; an axe serious violation |
| Delivery | definition of done | Section 4; strings exist in six languages |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/studio src/i18n`; `grep -rn dangerouslySetInnerHTML src/components/studio` prints nothing |
| | docs | None (T-B11-11 writes the guide) |
| | rollback | Revert the commit; routes disappear |
| | later tasks need | `PartEditor` tabs mount point for T-B11-05b; route table for T-B11-14 |

---

### T-B11-05b Ratings, sources, tier and model templates in the editor

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-05b / Studio part editor UI / B11 |
| | priority, size, status | P1, L, not started |
| | dependencies | T-B11-04b, T-B11-05a, T-B11-18, T-B11-02a. Phase B8 (tier chips) |
| Intent | problem | A part is only useful if it behaves and says how far to trust it. R-134 names four simple models; R-098/F-098 require the three-slot declaration |
| | target user | A beginner making a part with a simple model |
| | user story | As someone making an LED-like part, I pick "LED-like", type 2.0 V and 20 mA, and the part works, with a note saying these are my numbers |
| | expected behaviour | Two more tabs: Ratings (three slots per rating, with the slot the model reads) and Model (six templates). Choosing a template writes a valid layer, ratings in the `simulation` slot with the fixed rationale "set by you, not checked against a datasheet" and confidence `low`, a generated golden-trace test, `tier: T1`, `status: partly-modelled` and a `not_modelled` list |
| | success metric | Each of the 6 templates yields a descriptor that passes `validateDescriptor` and its own generated fixture; the part runs in the headless harness with no engine edit |
| Implementation | existing files | `COMPONENT_SCHEMA.md` 9.2 (steps 4 and 5, template table, defaults and limits); `src/components/studio/PartEditor.tsx` (T-B11-04b); `src/studio/parts/draft.ts` (T-B11-04a); `src/parts/golden.ts` (T-B11-02a); `src/sim/models/logic.ts` (T-B11-05a) |
| | new files | `src/components/studio/RatingsForm.tsx`, `src/components/studio/TruthTableEditor.tsx`, `src/studio/parts/templates.ts` |
| | edited files | `src/components/studio/PartEditor.tsx` (mount the two tabs), `src/i18n/messages/*/parteditor.json` (keys `ratings`, `model`, `templates`) |
| | modules and signatures | `templates.ts`: `export interface TemplateParams { 'resistor-like': { ohms: number }; switch: { momentary: boolean }; 'led-like': { vf: number; imaxA: number }; 'truth-table': { inputs: string[]; outputs: string[]; rows: LogicRow[]; delayNs: number; driveOhms: number }; 'analog-sensor': { channelUnit: Unit; min: number; max: number }; 'not-modelled': { reason: string } } ; export type TemplateChoice = { [K in TemplateId]: { id: K; params: TemplateParams[K] } }[TemplateId]; export function availableTemplates(env: ModelEnv): TemplateId[]; export function applyTemplate(d: PartDraft, t: TemplateChoice): Partial<PartDraft>; export function templateFixture(d: PartDraft, t: TemplateChoice): { file: string; fixture: GoldenFixture };` `RatingsForm`: `(props: { draft: PartDraft; dispatch: (a: DraftAction) => void; issues: Diagnostic[] }) => JSX.Element`. `TruthTableEditor`: `(props: { inputs: string[]; outputs: string[]; rows: LogicRow[]; onChange(rows: LogicRow[]): void; warnings: number[] }) => JSX.Element` |
| | data model | Template output: `behaviour.layers`, `ratings.*.simulation {value/min/typ/max, rationale, confidence: "low"}`, `used_by_model: "simulation"`, `simulation {tier: "T1", status: "partly-modelled", what_it_models[], not_modelled[], solver_requires[]}`, `tests[] {id, kind: "golden-trace", file, state: "present"}`, `parameters[]` as needed. A datasheet number pasted into the `manufacturer` slot needs a `sources[]` entry chosen in the form (CS 9.2 step 4); the form blocks Save until one exists. The `measured` slot is not offered in the form (JSON view only) |
| | input and output schemas | UI plus the template patch |
| | API contracts | None |
| | algorithm | `resistor-like`: `element res`, rating `resistance_nominal`, parameter `ohms` as `from_rating`. `switch`: `element button`. `led-like`: `element led` with `vf` and `imax` from ratings; the solver's fixed 0.5 ohm slope is a known gap line copied from `figures/engine/bench-solve.js:102`. `truth-table`: `logic` layer, at most 8 inputs, 8 outputs, 256 rows; the editor warns on shadowed rows (`compileLogic` warnings) and offers a "complete the table" action that adds missing input combinations with outputs `z`. `analog-sensor`: offered only if `env.solverElements` has `sensor` with documented terminals (check in the B3 element table); writes `element sensor` plus a `physical_inputs` channel. `not-modelled`: `none` layer with the reason; status `not-modelled-yet`, tier `none`, no test. `templateFixture`: `series2` fixture from the form's own example with `expect` computed in closed form (resistor: `I = V / (R + Rs)`; LED: `I = (V - vf) / (Rs + 0.5)` with relative tolerance 1 percent so the fixed slope does not matter; button closed: `I = V / Rs`); truth table: a `conformance` fixture with `checks ['layers-resolve','terminals-are-pins','logic-rows']`. `what_it_models` sentences are fixed per template and pass `copyCheck` |
| | state transitions | Changing the template replaces layers, test and the ratings it owns; ratings the person added by hand stay |
| | validation rules | Limits from 04a. Values must be finite and inside the unit's sanity range (for example `ohms` from 0.001 to 1e9) |
| | error conditions | A rating without a source in the `manufacturer` slot blocks Save with the field named |
| | edge cases | Sequential logic (flip-flop, counter) is not offered: a truth table has no memory (CS 9.2 stated limit); the form says so in one sentence. Truth table with an input also listed as an output is refused. Two templates on one part is not possible in this form; the JSON view allows several layers |
| | permissions | None |
| | performance | A 256-row table renders as a virtualised list of rows (only visible rows mounted); typing in a cell does not re-validate the whole table more than once per 250 ms |
| | migration | None |
| Verification | unit tests | `src/studio/parts/templates.test.ts`: each template output validates, its fixture passes `runFixture` through the real solver, and the NAND table passes `logic-rows`; `availableTemplates` hides `analog-sensor` when `sensor` is absent. `src/components/studio/RatingsForm.test.tsx`: the three labels read "Stated by the maker", "iynk's assumption", "Bench-measured" (the word "validated" never appears); pasting a manufacturer number without a source blocks Save; the slot the model reads is marked. `TruthTableEditor.test.tsx`: add row, `x` and `z` cells, shadow warning, 256-row cap with the limit named, keyboard operation |
| | integration tests | Editor flow in jsdom: choose LED-like, enter 2.0 V and 20 mA, Save, `resolveLayers` on the saved descriptor is runnable |
| | Playwright | Covered by T-B11-10 |
| | fixtures | None beyond generated ones |
| | acceptance | Given the LED-like template with 2.0 V and 20 mA, When saved, Then the saved descriptor has `simulation.tier` `T1` and `status` `partly-modelled`, holds the two values in the `simulation` slot with the rationale "set by you, not checked against a datasheet" and `confidence` `low`, and the generated fixture passes `runFixture`. The page text for these fields ("Teaching model", "iynk's assumption") is tested in T-B11-14, not here. Given a manufacturer value without a source, When I press Save, Then Save is blocked and the field is named |
| | observability | None |
| | release blockers | The banned words in any template sentence or any UI label (checked by test in all six languages for the English word list only; other languages by review in the test log) |
| Delivery | definition of done | Section 4; strings in six languages |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/studio/parts src/components/studio src/i18n` |
| | docs | None (T-B11-11) |
| | rollback | Revert the commit; the editor keeps Identity, Pins, Footprint and JSON |
| | later tasks need | `applyTemplate`, `templateFixture` (11 worked example, 10 e2e) |

---

### T-B11-08 Packs: trust ladder, import with hostile-input limits, export, dialog

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-08 / Sharing, `src/export`, `src/parts`, `src/components/studio` / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B11-01, T-B11-06, T-B11-07, T-B11-13, T-B11-18, T-B11-05a. Phase B3 (T-B3-05 archive reader and writer, hostile fixtures) |
| Intent | problem | F-220, R-137: share a part with a buddy without a marketplace. A pack is untrusted input: a zip bomb, a path trick, art with a script, a part claiming to be `core`, or code |
| | target user | Amar and a friend |
| | user story | As Amar, I export my pulse-stretcher part, my friend opens the file, sees what it is and what licence it carries, and adds it; a hostile file is refused and changes nothing |
| | expected behaviour | `.iynkpack` export is deterministic. Import validates everything before writing anything, shows one dialog per pack hash, refuses what it cannot trust with the limit named, never auto-updates, and stores a code-bearing part as disabled that cannot be enabled |
| | success metric | CM-16 and CM-17 pass; the 16 hostile archives numbered 1 to 16 in the unit tests are each refused with the code listed there and the library is unchanged, and the 4 format cases numbered 17 to 20 are refused too; export then import round-trips byte-equal descriptors; export twice gives identical bytes |
| Implementation | existing files | `COMPONENT_SCHEMA.md` 9.10 (pack format, limits, quality labels); `COMPONENT_ECOSYSTEM.md` 7.1 to 7.4 (routes, rules, dialog rows); `ADR-0207`; `COMMUNITY.md` 3.8 and rows CM-16, CM-17 (lines 593-594); `src/export/zip.ts` (T-B3-05: streaming reader and writer with limits) and `src/export/iynkz.ts` (the `.iynkz` container layer, which refuses `image/svg+xml` assets, B3 PD-14); `src/local/parts-store.ts` (T-B11-13) |
| | new files | `src/export/pack.ts`, `src/parts/trust.ts`, `src/components/studio/PackDialog.tsx` |
| | edited files | `src/export/zip.ts` only if its reader does not accept a limits object: add one optional `limits` parameter (the pack limits are stricter than the `.iynkz` limits of 1,000 entries, 16 MiB per entry, 128 MiB total and ratio 100; it counts as the fifth file; if the reader already takes limits, no edit is needed and `iynkz.ts` is not touched); `src/i18n/messages/*/partpack.json` |
| | modules and signatures | `trust.ts`: `export type TrustLevel = 'core' \| 'local' \| 'imported'; export interface QualityLabels { schemaValid: boolean; hasTests: boolean; testsRun: 'not-run' \| 'pass' \| 'fail'; hasReferenceTest: boolean; code: boolean; permissions: readonly string[]; thirdPartyContent: boolean } ; export function qualityLabels(def: ComponentDescriptor, issues: readonly Diagnostic[]): QualityLabels; export function hasCode(def: ComponentDescriptor): boolean; export type CodeGate = { state: 'disabled'; reason: 'no-sandbox-yet' }; export function codeGate(def: ComponentDescriptor): CodeGate \| null;` `pack.ts`: `export const PACK_LIMITS: { readonly compressedBytes: 8388608; readonly uncompressedBytes: 33554432; readonly ratio: 20; readonly files: 200; readonly descriptorBytes: 262144; readonly artBytes: 524288 }; export interface PackManifest { pack: 'iynk.pack/1'; id: string; version: string; components: { id: string; version: string; sha256: string }[]; files: { path: string; bytes: number; sha256: string }[]; license: string; authors: string[]; created: string } ; export type PackErrorCode = 'not-a-pack' \| 'newer-pack' \| 'too-big-compressed' \| 'too-big-uncompressed' \| 'ratio' \| 'too-many-files' \| 'path' \| 'duplicate' \| 'symlink' \| 'hash' \| 'manifest' \| 'schema' \| 'core-id'; export interface PackError { code: PackErrorCode; limit?: string; path?: string; detail: string } ; export interface PackItem { id: string; version: string; descriptor: ComponentDescriptor; digest: string; issues: Diagnostic[]; labels: QualityLabels; code: CodeGate \| null; artWarnings: string[]; files: ReadonlyMap<string, Uint8Array>; collision?: { installedDigest: string } } ; export type PackPlan = { ok: true; manifest: PackManifest; packSha256: string; sender: string; items: PackItem[] } \| { ok: false; error: PackError }; export interface ReadContext { sender: string; installed: ReadonlyMap<string, string>; builtinRefs: ReadonlySet<string>; causeIds: ReadonlySet<string> } ; export function readPack(bytes: Uint8Array, ctx: ReadContext): Promise<PackPlan>; export function planImportedParts(defs: readonly ComponentDescriptor[], files: ReadonlyMap<string, Uint8Array>, ctx: ReadContext): Promise<PackItem[]>; export interface CommitChoice { mode: 'library' \| 'project'; ids: readonly string[] } ; export type PackCommitResult = { ok: true; added: string[]; same: string[]; ops: Op[] } \| { ok: false; conflicts: { key: string; installedDigest: string; incomingDigest: string }[] }; export function commitPack(plan: Extract<PackPlan, { ok: true }>, choice: CommitChoice, repo: PartsRepository): Promise<PackCommitResult>; export function buildPack(parts: readonly { def: ComponentDescriptor; files: ReadonlyMap<string, Uint8Array> }[], meta: { id: string; version: string; license: string; authors: string[]; createdIso: string }): Promise<Uint8Array>;` `PackDialog`: `(props: { plan: PackPlan; onUse(ids: string[]): void; onAdd(ids: string[]): void; onCancel(): void }) => JSX.Element` |
| | data model | Pack zip: `pack.json`, `components/<id>/<version>/component.json`, `components/<id>/<version>/art/*`, `components/<id>/<version>/tests/*`. Manifest `components[].sha256` is the hash of that `component.json`; `files[]` lists every other entry. No model code ships in B11 packs except as the disabled files of a code part |
| | input and output schemas | As signatures. `PackPlan` is a pure description; nothing is written until `commitPack` |
| | API contracts | None. File in by `<input type="file">` or a room attachment (B7); the sender string is the file name or the room member name |
| | algorithm | **readPack**: 1) compressed size over 8 MiB gives `too-big-compressed`; 2) read the archive with the B3 reader in `src/export/zip.ts`, passing `PACK_LIMITS`. The checks run in this fixed order, so every hostile input has exactly one code: compressed size (step 1); entry count when the central directory is read, before any byte is inflated (`too-many-files`); the running uncompressed total after every inflated chunk (`too-big-uncompressed`, so a 33 MiB entry fails here even though its ratio is also high); then, only when an entry has finished inflating and once more for the whole archive at the end, the ratio over 20 (`ratio`); a declared size smaller than the bytes actually produced (`manifest`); 3) per entry: absolute path, any `..` segment, backslash, NUL, drive letter, leading `/` give `path`; a duplicate after Unicode NFC and lower-casing gives `duplicate`; a symlink or non-regular entry gives `symlink`; 4) parse `pack.json`: `pack` other than `iynk.pack/1` with a higher number gives `newer-pack`, other values `not-a-pack`; every `files[]` entry exists with equal `bytes` and sha256, and no file is missing from the manifest (`hash` or `manifest`); 5) per component: descriptor over 256 KiB gives `schema`; `planImportedParts`. **planImportedParts**: `validateDescriptorText(text, { ctx: { trust: 'imported', installed, builtinRefs, causeIds, candidateDigest } })` (T-B11-01); an id in the `core` namespace gives `core-id`; art: each `visual.assets[]` file must exist and match its sha256; `sanitizeSvg` or `checkPng` failure adds an `artWarnings` entry (the part still imports; the picture falls back, T-B11-06); `qualityLabels` computed from the issues and the descriptor; `code` set when `hasCode` (any `extension` layer). **commitPack**: all-or-nothing through `repo.putMany`; items with a `collision` (same `id@version`, different digest) make the call return `{ ok: false, conflicts }` with both digests, without calling the repository; otherwise `repo.putMany` is called and its `{ ok: false, conflicts }` result is returned unchanged, so a caller can tell a refusal from a success; mode `project` builds `dep.set` ops with origin `embedded`, digest and the definition (`buildDependency`, T-B11-07) and writes nothing to the library; mode `library` writes records with `trust: 'imported'`, `source {sender, packSha256}`. A code part may be committed only as stored data: `resolveLayers` already gives `extension-disabled`. **buildPack**: refuse a `core` part; sort entries by path; fixed timestamp 1980-01-01T00:00:00Z; no extra fields; manifest with sorted arrays; the `license` default is the strictest license among the parts. Dialog rows follow `COMPONENT_ECOSYSTEM.md` 7.3 (sender, parts with tier and status and pin count, license and sources with the third-party flag, code yes or no, conformance). For a code part the row reads "Code parts cannot be turned on in this version" and the only actions are Add as disabled data or Cancel. Exporting a part whose license is `LicenseRef-local-private` shows a warning before the file is made |
| | state transitions | Pack: `chosen` to `validated` (plan) to `committed` or `cancelled`. The library changes only at `committed`. Part trust: `local` or `imported`; an imported part is never promoted to `core` |
| | validation rules | Limits as above, all proposals nothing has tested (`COMPONENT_ECOSYSTEM.md` 7.3): the tests below are the first test. A pack never updates an installed part: a newer version arrives as a new `id@version` |
| | error conditions | Each `PackErrorCode` has a message that names the limit or the path ("refused: the pack unpacks to more than 32 MiB"). The dialog shows it; the library is unchanged; a row goes to the `errors` store with the code only |
| | edge cases | A pack holding two versions of one part (both importable). A pack whose `components[]` lists a part the zip lacks (`manifest`). A pack with only art changes (patch version). An empty pack (`manifest`: zero components). A part whose `subcircuit` pins `core.led-5mm@1.0.0` that is not installed (importable, warning `subcircuit-invalid` at run). A name with right-to-left override characters in `identity.model` (kept as text, never HTML) |
| | permissions | The local person chooses the file and the action. A room peer cannot commit anything on another machine (B7: each client runs the same dialog) |
| | performance | Reading a 7 MiB pack under 2 s on the reference laptop (ESTIMATED); memory bounded by the 32 MiB cap plus one entry |
| | migration | `iynk.pack/1` is new. The zip layer of the `.iynkz` reader is reused, not changed, apart from the optional `limits` parameter described under edited files. The pack reader accepts SVG art (it sanitises it with `sanitizeSvg`, T-B11-06) while `readIynkz` keeps refusing `image/svg+xml` assets (B3 PD-14: no sanitiser existed when B3 shipped). B11 does not lift PD-14 for project containers, so an embedded descriptor's SVG inside a `.iynk` or `.iynkz` is not loaded and the part falls back to the generic drawing, which is the safe direction |
| Verification | unit tests | `src/export/pack.test.ts`: **CM-17**, the 16 hostile archives, each refused with the one code named and the limit in the message, with `repo.list()` unchanged afterwards. 1) a 33 MiB-of-zeros entry: `too-big-uncompressed`. 2) a 20 MiB-of-zeros entry (under the byte cap, ratio far over 20): `ratio`. 3) `../evil`: `path`. 4) `/abs`: `path`. 5) `a/../../b`: `path`. 6) `a\..\b`: `path`. 7) `C:/x`: `path`. 8) NUL in a name: `path`. 9) two entries with the same path: `duplicate`. 10) two entries differing only in case: `duplicate`. 11) a symlink entry: `symlink`. 12) 201 entries: `too-many-files`. 13) an 8 MiB + 1 byte random archive: `too-big-compressed`. 14) manifest hash mismatch: `hash`. 15) a file not listed in the manifest: `manifest`. 16) a declared size smaller than the real size: `manifest`. Four format cases follow, numbered 17 to 20: 17) `pack: "iynk.pack/2"`: `newer-pack`. 18) not a zip: `not-a-pack`. 19) a truncated zip: `not-a-pack`. 20) a `core.led-5mm` descriptor: `core-id`. **CM-16**: a pack whose part has an `extension` layer yields an item with `code: {state: 'disabled', reason: 'no-sandbox-yet'}`, `commitPack` stores it, `resolveLayers` gives `extension-disabled`, and `codeGate` is the only API (no function enables a part). Round trip: `buildPack` then `readPack` returns deep-equal descriptors and byte-equal files; `buildPack` twice is byte-equal; export refuses `core`. Collision: second import of the same key with different bytes returns `{ok: false, conflicts}` with both digests and writes nothing; same bytes gives `same`. `commitPack` returns `{ok: false}` when `repo.putMany` does. Trust: an imported descriptor with `provenance.origin: "core"` gives `P-TRUST-ORIGIN`; unknown builtin gives a warning and a `none` layer. Atomic: injected failure on the third write leaves the library as before. SVG: a pack part with a script-bearing SVG imports with an `artWarnings` entry and falls back. `src/parts/trust.test.ts`: `qualityLabels` for the examples; no label text uses the banned words. `src/components/studio/PackDialog.test.tsx`: rows, license shown, third-party flag shown, code part shows no Enable button, hostile plan shows the refusal text, Esc cancels |
| | integration tests | Project route: a `.iynk` holding an `embedded` definition goes through `planImportedParts` and a tampered definition (digest mismatch) opens as a placeholder with `V6-DIGEST` |
| | Playwright | Covered by T-B11-10 (import and export through the real file chooser, hostile archives, a code pack) |
| | fixtures | `src/export/testdata/packs/` built in test code with the B3 zip helpers; no binary is committed except `ok-pulse.iynkpack` (a 2 KB good pack for e2e, generated by `buildPack` in a test and checked in with its hash in the test) |
| | acceptance | CM-16: Given a pack with a code-bearing part, When I import it, Then the part is disabled until I confirm and, before RS-15 has a verdict, cannot be enabled (the dialog offers no Enable). CM-17: Given a hostile pack (zip bomb, `../` path), When I import, Then it is refused with the limit named and nothing is written outside the store |
| | observability | `errors` store rows `{where: 'parts.pack', message: code}`; the dialog shows `removed` art element names only |
| | release blockers | Any import path that writes before validation completes; any function that turns `extension-disabled` into a runnable layer |
| Delivery | definition of done | Section 4; the 16 hostile cases listed in the commit body, numbered 1 to 16 as in the unit-test list, each with its code |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/export src/parts src/components/studio src/i18n`; `npx tsc -p tsconfig.portable.json` |
| | docs | `docs/ADD_A_PART.md` "Sharing" section (T-B11-11) |
| | rollback | Revert the commit; sharing returns to "send the project" |
| | later tasks need | `readPack`, `commitPack`, `buildPack`, `PackDialog`, `qualityLabels` (10, 14, 16) |

---

### T-B11-14 Part page: ratings in three slots, sources, validity, gaps

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-14 / Studio part page, `src/components/studio`, `src/parts` / B11 |
| | priority, size, status | P1, M, not started |
| | dependencies | T-B11-02a, T-B11-17, T-B11-04b, T-B11-18, T-B11-05a, T-B11-08 (`QualityLabels` and `qualityLabels` come from `src/parts/trust.ts`). Phase B8 (T-B8-04 `TierChips.tsx`, `ModelsPanel.tsx`) |
| Intent | problem | R-132 and R-133: "show the model's equations or table, parameter values with sources, validity range and known gaps"; "every number links to a source or is marked unsourced". B4/B8 show a tier chip and a short "What it models" panel; there is no page per part |
| | target user | Anyone who wants to check a claim against its source |
| | user story | As Amar, I open the page for the TIP120 and see which numbers are the maker's, which are my assumptions and which the model really reads |
| | expected behaviour | Route `#/parts/info/<id>@<version>` shows: name, tier chip and status, what it models, what it does not, ratings in three columns with the slot the model reads marked, sources with links, validity ranges, known gaps with evidence, layers with their kind and "not modelled yet" reasons, quality labels, the tests the part declares (AC-CE-09), license and third-party flag, other versions. Every simulation-slot number without a `source` carries the label "Assumed, no source" |
| | success metric | For all 34 descriptors the page shows the count of unsourced numbers and lists them; axe 0 serious; the page renders from `partFacts` alone (no second source of data) |
| Implementation | existing files | `src/components/studio/ModelsPanel.tsx`, `TierChips.tsx` (B4, B8); `src/studio/router.ts`, `StudioEntry.tsx` (T-B11-04b); `COMPONENT_SCHEMA.md` 4.6 reading rules 1 and 2; `figures/engine/bench-solve.js:88-113` (equations as the solver implements them) |
| | new files | `src/components/studio/PartPage.tsx`, `src/parts/facts.ts` |
| | edited files | `src/studio/router.ts` (route `parts/info/<key>`), `src/components/studio/StudioEntry.tsx` (mount, and compute `usage` from `DocStore` state when a project is open, `undefined` otherwise), `src/i18n/messages/*/partinfo.json` (keys include `tier.T1` = "Teaching model", `slot.manufacturer` = "Stated by the maker", `slot.simulation` = "iynk's assumption", `slot.measured` = "Bench-measured", `unsourced` = "Assumed, no source"; "teaching model" is the label SIMULATION 4.1 gives tier T1) |
| | modules and signatures | `facts.ts`: `export interface SlotFact { value: Quantity; sourceId?: string; sourceTitle?: string; loc?: string; url?: string; rationale?: string; confidence?: 'low' \| 'medium' \| 'high'; unsourced: boolean } ; export interface RatingFact { key: string; measure: string; role: string; slots: Partial<Record<'manufacturer' \| 'simulation' \| 'measured', SlotFact>>; usedByModel: 'manufacturer' \| 'simulation' \| 'measured' \| 'none' } ; export interface LayerFact { id: string; domain: string; kind: string; element?: string; ref?: string; noneReason?: NoneReason; detail?: string; equationKey?: string } ; export interface PartFacts { id: string; version: string; name: string; trust: Trust; tier: string; status: string; whatItModels: string[]; notModelled: string[]; knownGaps: { id: string; text: string; evidence?: string }[]; validity: string[]; ratings: RatingFact[]; layers: LayerFact[]; sources: { id: string; kind: string; reliability: string; title: string; url?: string; retrieved?: string }[]; unsourcedNumbers: string[]; tests: { id: string; kind: string; state: 'present' \| 'to-write'; file: string }[]; labels: QualityLabels; license: string; thirdPartyContent: boolean; versions: readonly string[] } ; export function partFacts(def: ComponentDescriptor, trust: Trust, env: ModelEnv, versions: readonly string[]): PartFacts; export const ELEMENT_EQUATIONS: Readonly<Record<string, string>>;` `PartPage`: `(props: PartPageProps) => JSX.Element` with `export interface PartUsage { instances: { id: string; label: string; version: string }[]; pinned: ComponentDependency[] }` and `export interface PartPageProps { facts: PartFacts; onOpenEditor?: () => void; usage?: PartUsage; onUpgrade?: (toVersion: string) => void }`. `usage` is present only when a project is open: `instances` are the placed components whose dependency `ref` equals `facts.id`, `pinned` are the matching `dependencies.components` entries. This task renders a "Used in this project" list from `usage` and only forwards `onUpgrade`; T-B11-15 adds the Versions section that uses them |
| | data model | Reads the descriptor only. `unsourced` is true for a `simulation` slot with no `source`, for a literal model parameter with no `source`, and for a `mechanics` sub-block with no `source` |
| | input and output schemas | As signatures |
| | API contracts | None |
| | algorithm | `partFacts` is pure. Equations are language-neutral strings per element kind, matched to the solver: `res` `V = I x R`; `led` and `diode` `I = (V - Vf) / rd for V above Vf, else 0`; `npn` `Ic = hfe x Ib until Vce = Vcesat`; and so on for the 12 kinds. A constant the solver fixes is flagged from the descriptor's `known_gaps` (for the LED `rd = 0.5 ohm`, `bench-solve.js:102`). URLs in sources render as `<a href rel="noopener noreferrer" target="_blank">` only when they start with `http://` or `https://`, otherwise as text; the app never fetches them (`COMPONENT_SCHEMA.md` section 8 item 2). All text is rendered as text. The edit button shows only for `local` parts |
| | state transitions | None |
| | validation rules | None |
| | error conditions | Unknown key: "no such part" with a link to the palette |
| | edge cases | Part with no ratings (`resistor`): the table shows "no ratings declared". `measured` slot present: label "Bench-measured" (never "validated"). A source `url` with `javascript:`: shown as text |
| | permissions | None |
| | performance | Pure render; under 16 ms for 60 ratings (ESTIMATED) |
| | migration | None |
| Verification | unit tests | `src/parts/facts.test.ts`: LED example gives 9 ratings all in the simulation slot, all `unsourced` false only where a `source` exists, `usedByModel` `simulation`; L298N gives ratings with manufacturer and simulation on one key; `unsourcedNumbers` list is exact for a fixture with 3 assumed numbers; the 12 equations exist. `src/components/studio/PartPage.test.tsx`: three column labels; a descriptor built like T-B11-05b's LED-like template output (inline fixture) shows "Teaching model" and, under "iynk's assumption", the rationale "set by you, not checked against a datasheet"; with `usage` listing two instances at `1.0.0` the page says so, and without `usage` it shows no project section; "Assumed, no source" label; `javascript:` URL not a link; no banned word in any label; edit button only for local |
| | integration tests | Router: `#/parts/info/core.led-5mm@1.0.0` mounts the page |
| | Playwright | Covered by T-B11-10 (axe on the page) |
| | fixtures | The nine examples |
| | acceptance | Given the TIP120 page, When it opens, Then ratings show their slot, sources have links or the label "Assumed, no source", and the model's equation is shown. Given a part with a `measured` slot, Then the label reads "Bench-measured" |
| | observability | None |
| | release blockers | A number shown without a slot label |
| Delivery | definition of done | Section 4; strings in six languages |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts src/components/studio src/i18n` |
| | docs | None |
| | rollback | Revert the commit |
| | later tasks need | `PartPage` and `partFacts` (15, 16, 10) |

---

### T-B11-19 Coverage gate for the 40 figure files, and `provenance:check`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-19 / Parts library gate (test only) / B11 |
| | priority, size, status | P0, S, not started |
| | dependencies | T-B11-02d (and through it the seven conversion tasks), T-B11-14 (`partFacts` for the unsourced count) |
| Intent | problem | R-131 says each existing part has a descriptor. Nothing counts them. T-B11-02a's per-descriptor gate is green with any number of descriptors, so a missing one passes |
| | target user | Amar at the phase stop |
| | user story | As Amar, I read one test log that says 34 of 34 and shows tier and status for each |
| | expected behaviour | A test lists `figures/parts/*.js` and `figures/modules/*.js`, resolves every legacy id (except `wire`) to a descriptor, and fails with the missing ids |
| | success metric | 40 figure files map onto 34 descriptors; 0 missing; the log prints the table |
| Implementation | existing files | `figures/parts` (29 files), `figures/modules` (12 files) (VERIFIED); `public/figures/parts/*.html`, `public/figures/modules/*.html`; `src/parts/registry.ts` |
| | new files | `src/parts/coverage.test.ts` (test only), `scripts/provenance-check.mjs` |
| | edited files | `package.json` (script `provenance:check` = `node scripts/provenance-check.mjs --informational`; not added to `check`) |
| | modules and signatures | None |
| | data model | None |
| | input and output schemas | Reads the file system |
| | API contracts | None |
| | algorithm | 1) Read directory names. 2) `wire` is exempt with the printed reason "a wire is a project object (CE 3.3)". 3) For each other file `descriptorForLegacy(getAppRegistry(), basename)` must return a descriptor; the set of distinct ids has size 34 (21 `PART_IDS` + `breadboard` + 12 modules, the 6 shared items counted once; assert the number, not a literal list, by also checking the 21 ids of `src/content/ids.ts:76-98` and the 12 of `:59-72`). 4) `visual.breadboard.figure.path` exists and, when `sha256` is set, equals the hash of the built page. 5) The six shared items have `x_module_figure`. 6) No descriptor contains the string `TODO`. 7) Every descriptor states fidelity: `what_it_models` non-empty, or for `not-modelled-yet` a `known_gaps` or `none` reason. 8) Prints a table: id, kind, tier, status, tests, unsourced count (from `partFacts`), third-party flag. `provenance-check.mjs` (AC-CE-20) reads every shipped descriptor, lists those with `third_party_content: true` or a source whose licence is missing, unknown or share-alike (`CC-BY-SA`, `GPL`, `AGPL`, `LGPL` prefixes), prints the list and takes one required flag: `--informational` always exits 0 and prints the list (a task runner can treat it as passing); `--strict` exits 1 while the list is not empty and is for the day before the repo is published; with neither flag it prints usage and exits 2. It is not part of `npm run check` |
| | state transitions | None |
| | validation rules | As algorithm |
| | error conditions | The test names every missing legacy id |
| | edge cases | A board id (`uno-r3`) is not a part or module; boards are B5's |
| | permissions | None |
| | performance | Reads about 80 files; a few seconds |
| | migration | None |
| Verification | unit tests | The file is the test |
| | integration tests | Same |
| | Playwright | None |
| | fixtures | None |
| | acceptance | Given the repository after group 4 (T-B11-02d), When `coverage.test.ts` runs, Then it passes and prints 34 rows. Given a deleted descriptor, Then it fails naming the legacy ids |
| | observability | The printed table is the R-131 evidence for Amar |
| | release blockers | Any missing id |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts/coverage.test.ts`; `node scripts/provenance-check.mjs --informational` (exit 0; the list is for Amar, For Amar item 2) |
| | docs | None |
| | rollback | Delete the test |
| | later tasks need | Nothing |

---

### T-B11-15 Upgrade preview dialog

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-15 / Studio part versions UI / B11 |
| | priority, size, status | P2 (cut first), M, not started |
| | dependencies | T-B11-07, T-B11-14 (`PartPageProps.usage` and `onUpgrade`), T-B11-02a (`golden.ts`), T-B11-18 |
| Intent | problem | AC-CS-06 and `COMPONENT_ECOSYSTEM.md` 5.4: "Upgrading is an explicit action that shows the descriptor diff and the golden-trace differences" |
| | target user | Someone who edited their own part and has older projects |
| | user story | As the author of a changed part, I see what would change in my old project, and I choose to upgrade or stay |
| | expected behaviour | The part page shows the versions in use by the open project and, for a newer version, an Upgrade button. The dialog shows the bump, the descriptor changes (behaviour-affecting ones marked), pins removed or added, wires that block the upgrade, and a table of golden-trace quantities old against new. Apply commits the plan as one undoable batch |
| | success metric | Applying a plan and undoing once restores the exact `stateHash`; a blocked plan cannot be applied |
| Implementation | existing files | `src/components/studio/PartPage.tsx` and `StudioEntry.tsx` (T-B11-14), `src/parts/versions.ts` (`planUpgrade`, T-B11-07), `src/parts/golden.ts` (`runFixture`, T-B11-02a), `src/studio/stores/doc.ts` (T-B4-02: `DocStore.commit(batch: Op[], opts: { label: string; author?: Author }): CommitResult`, the only writer; B4's `no-direct-writes.test.ts` forbids `session.apply(` outside the tool host) |
| | new files | `src/components/studio/UpgradeDialog.tsx` |
| | edited files | `src/parts/golden.ts` (add `goldenDelta`; pure logic stays in the portable `src/parts`, not in a React file), `src/components/studio/PartPage.tsx` (Versions section), `src/components/studio/StudioEntry.tsx` (mount `UpgradeHost` when `onUpgrade` fires), `src/i18n/messages/*/partinfo.json`. Five source files |
| | modules and signatures | `golden.ts` (added): `export interface GoldenDelta { fixtureId: string; quantity: string; before: number \| string \| null; after: number \| string \| null; changed: boolean } ; export async function goldenDelta(from: ComponentDescriptor, to: ComponentDescriptor, fixtures: ReadonlyMap<string, GoldenFixture>, env: ModelEnv): Promise<GoldenDelta[]>;`. `UpgradeDialog.tsx`: `export function UpgradeDialog(props: { plan: UpgradePlan; delta: GoldenDelta[]; onApply(): void; onCancel(): void }): JSX.Element; export function UpgradeHost(props: { from: ComponentDescriptor; to: ComponentDescriptor; origin: 'library' \| 'embedded'; doc: Project; fixtures: ReadonlyMap<string, GoldenFixture>; env: ModelEnv; commit(ops: Op[], opts: { label: string }): CommitResult; onClose(): void }): JSX.Element;` `UpgradeHost` builds the plan with `planUpgrade` and the delta with `goldenDelta`, renders `UpgradeDialog`, and on Apply calls the `commit` prop once. `StudioEntry` passes `DocStore.commit` as `commit` and `DocStore` state as `doc`. The new `PartPage` behaviour uses only the props T-B11-14 defines: for each version in `facts.versions` newer than a version in `usage.pinned`, an Upgrade button calls `onUpgrade(thatVersion)` |
| | data model | None new |
| | input and output schemas | As signatures |
| | API contracts | None |
| | algorithm | `goldenDelta` runs every `golden-trace` fixture of both versions through `runFixture` with the same circuit and lists each expected quantity. A fixture only in one version is listed with `null` on the other side. Apply calls `DocStore.commit(plan.ops, { label: 'Upgrade <part> to <version>' })` once, so undo is one step |
| | state transitions | `viewing` to `applied` or `cancelled` |
| | validation rules | `plan.blocked` disables Apply and names the pins |
| | error conditions | A fixture that throws is listed with the error text and `changed: true` |
| | edge cases | A part used by two instances with different parameters: both are swapped with their parameters kept (`component.swap` keeps `params` that still exist; others are listed as dropped) |
| | permissions | Local person |
| | performance | Under 200 ms for 10 fixtures |
| | migration | None |
| Verification | unit tests | `src/parts/golden.test.ts` (added case): `goldenDelta` for a `vf` change shows the current changing. `src/components/studio/PartPage.test.tsx` (added cases): project open (`usage` lists two instances pinned at `led@1.0.0`, `facts.versions` holds `1.1.0`) shows an Upgrade button that calls `onUpgrade('1.1.0')`; no project open (no `usage`) shows none. `src/components/studio/UpgradeDialog.test.tsx`: blocked plan disables Apply; dropped parameters listed. Integration in jsdom: apply then undo returns the same `stateHash` (B2 harness) |
| | integration tests | As above |
| | Playwright | Covered by T-B11-10 (version step) |
| | fixtures | Two LED versions built in the test |
| | acceptance | Given a project pinned to `led@1.0.0` and a `1.1.0` with another `vf`, When I open the upgrade, Then I see the `vf` change marked as read by the model and the current change in mA, and nothing changes until I press Apply |
| | observability | None |
| | release blockers | An apply that is not one undo step |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/i18n` |
| | docs | `docs/ADD_A_PART.md` "Versions" section (T-B11-11) |
| | rollback | Revert the commit; plans remain available to tests only |
| | later tasks need | None |

---

### T-B11-16 Library in the palette: Add part, Import pack, library parts searchable

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-16 / Studio palette and library, `src/parts`, `src/components/studio` / B11 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B11-13, T-B11-02a, T-B11-08, T-B11-04b, T-B11-17, T-B11-18. Phase B4 (T-B4-07 `Palette.tsx`, `src/parts/search.ts`) |
| Intent | problem | A saved part is useless if the palette cannot find it, and a buddy's pack needs an entry point |
| | target user | Amar and friends |
| | user story | As someone who saved "Pulse stretcher", I type "pulse" in the palette and place it; as someone who got a pack, I choose Import pack and see the dialog |
| | expected behaviour | At startup the library loads valid records from the `parts` store into the registry, the fidelity registry and the fault models; invalid or tampered records are skipped and reported. The palette lists core and library parts, labels library parts and "not modelled yet" parts, shows an Add part link when a search finds nothing (`STUDIO_EDITOR.md` line 748), and has Add part and Import pack buttons. If IndexedDB is blocked, parts live in memory and a notice says they will not be saved |
| | success metric | 100 library parts load in under 200 ms (ESTIMATED); a tampered record is skipped and named; search "pulse" finds the part |
| Implementation | existing files | `src/components/studio/Palette.tsx`, `src/parts/search.ts` (T-B4-07); `src/local/parts-store.ts` (T-B11-13); `src/parts/descriptor.ts` (`digestOf`), `src/parts/builtin.ts` (`getAppRegistry`); `src/sim/registry/from-descriptor.ts` (T-B11-17); `src/export/pack.ts`, `PackDialog.tsx` (T-B11-08) |
| | new files | `src/parts/browser/library.ts` |
| | edited files | `src/parts/search.ts`, `src/components/studio/Palette.tsx`, `src/i18n/messages/*/parteditor.json`, `src/i18n/messages/*/partpack.json` |
| | modules and signatures | `library.ts`: `export interface PartLibrary { readonly registry: PartRegistry; readonly persistent: boolean; init(): Promise<{ loaded: number; skipped: { key: string; reason: string }[] }>; subscribe(fn: () => void): () => void; existingKeys(): ReadonlySet<string>; save(def: ComponentDescriptor, files: ReadonlyMap<string, Blob>): Promise<PutResult>; remove(id: string, version: string): Promise<void>; hasAsset(sha256: string): boolean; assetUrl(sha256: string): string \| undefined } ; export function createPartLibrary(repo: PartsRepository, opts: { persistent: boolean }): PartLibrary; export function getPartLibrary(): Promise<PartLibrary>;` `hasAsset` is synchronous because T-B11-06's `selectArt` takes a synchronous callback: `init()` fills a `Set` of asset hashes from the `files` values of every record that passed validation, and `assetUrl` returns the data URL that `init()` cached for an SVG or PNG asset after `sanitizeSvg` or `checkPng` accepted it. `figure-art.ts` (T-B11-06) is wired to `library.hasAsset`. `search.ts` result row gains `{ trust: Trust; status: string; tier: string; sender?: string }` and a filter `{ source?: 'core' \| 'mine' \| 'buddies'; runnable?: boolean }` |
| | data model | None new |
| | input and output schemas | As signatures |
| | API contracts | None |
| | algorithm | `init`: `repo.list()`; per record recompute `digestOf(descriptor)` and compare with `record.digest` (mismatch: skip with reason `digest`); `validateDescriptor(descriptor, { ctx })` with the record's trust (invalid: skip with reason `schema`, diagnostic codes only); `getAppRegistry().add(descriptor, { origin: 'local-user' \| 'imported-pack' })` for each valid record; fill the asset-hash set and the data-URL cache (reading blobs with `repo.getFile`); `registerPartEntries` and failure models; emit `subscribe` callbacks. Skips are written to the `errors` store. `getPartLibrary` opens IndexedDB, falls back to `createMemoryPartsRepository()` with `persistent: false` on any error. `save` also calls `getAppRegistry().add` and adds the new asset hashes to the set, so the palette sees the part and its art at once. Search ranks name prefix, then id, tags, category, `mpn`; the empty result renders the Add part link with the query as the draft name |
| | state transitions | `library`: `loading` to `ready`; records are immutable |
| | validation rules | As algorithm |
| | error conditions | Blocked storage: notice "Parts will not be saved in this browser mode" (private windows) |
| | edge cases | Two tabs: `subscribe` is also fired by a `BroadcastChannel('iynk-parts')` message after a save (best effort; the page works without it). A removed part still pinned by an open project: the project shows the placeholder on next load (T-B11-07) |
| | permissions | Local person |
| | performance | `init` once per page load; `list()` excludes file bytes |
| | migration | None |
| Verification | unit tests | `src/parts/browser/library.test.ts` (memory repository): init loads valid records, skips a tampered one (digest) and an invalid one (schema) with reasons; `save` then search finds it; `hasAsset(sha256)` is true synchronously after `init()` for a stored asset and false for an unknown hash; persistent false when the repository factory throws. `src/parts/search.test.ts` (extend): "pulse" empty; library part found; filters. `src/components/studio/Palette.test.tsx` (extend): empty state link, badges, Import pack opens the dialog for a good pack and shows the refusal for a hostile one |
| | integration tests | Round trip: save through `PartEditor` props, reload `init`, place via the place tool in the headless harness |
| | Playwright | Covered by T-B11-10 |
| | fixtures | Records built from the examples |
| | acceptance | Given a saved part, When I reload and search its name, Then it appears labelled "Mine" and can be placed. Given a record whose bytes were edited in the store, When the app starts, Then the part is not listed and the errors log names the key |
| | observability | `errors` store rows `parts.library` with key and reason |
| | release blockers | A library part reaching the registry without passing `validateDescriptor` |
| Delivery | definition of done | Section 4; strings in six languages |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts src/components/studio src/i18n`; `npx tsc -p tsconfig.portable.json` |
| | docs | None |
| | rollback | Revert the commit; library parts exist in storage but are not listed |
| | later tasks need | `getPartLibrary()` (10) |

---

### T-B11-11 `docs/ADD_A_PART.md` and the worked example

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-11 / Documentation and example / B11 |
| | priority, size, status | P1, S, not started |
| | dependencies | T-B11-04b, T-B11-05b, T-B11-08 (and everything they need) |
| Intent | problem | The roadmap acceptance is "a documented custom part is added and simulated with no engine edit". There is no document, and `CONTRIBUTING.md` (B1) must say how to add a part (R-014) |
| | target user | A friend who clones the repo; Amar in a year |
| | user story | As someone who wants a part the catalogue lacks, I follow one page and have it in the palette within ten minutes |
| | expected behaviour | One page, plain English, shorter than 400 lines, with a worked example file that validates and has a passing fixture. `CONTRIBUTING.md` gets one pointer line |
| | success metric | A person who has not seen the repo adds the example part by following the page (checked in T-B11-10 by an agent that reads only this page, the "fresh eyes" pass of `CLAUDE.md` section 6) |
| Implementation | existing files | `docs/MASTER_PLAN/04_ARCHITECTURE/COMPONENT_SCHEMA.md` sections 4 and 9; `COMPONENT_ECOSYSTEM.md` 5; `PRODUCT_REQUIREMENTS.md` R-072 (line 687, "All boards": the checklist for a new board; read it and copy its list), R-136, R-014; `CONTRIBUTING.md` (T-B1-xx) |
| | new files | `docs/ADD_A_PART.md`, `src/parts/data/examples/custom-led.component.json` (with `tests/custom-led.golden.json` beside it) |
| | edited files | `CONTRIBUTING.md` (one line linking the page) |
| | modules and signatures | None |
| | data model | The example lives in `src/parts/data/examples/`, outside the flat folder on purpose: it is a `local` part (origin `local-user`), and the flat folder, `validate-part.mjs --all`, `schema:check`, the barrel and the gates are `core` only. It is `local.green-led-5mm@1.0.0`: a green 5 mm LED, `vf` 2.2 V (the figure's value for green, `figures/parts/led.js:9`), 20 mA, all in the `simulation` slot with the rationale "set by you, not checked against a datasheet", tier `T1`, `partly-modelled`, license `LicenseRef-local-private`, one golden fixture |
| | input and output schemas | As schema |
| | API contracts | None |
| | algorithm | Page outline: 1) What a part is (one JSON file, one schema). 2) Three ways in: Part Maker, hand-written JSON checked by `npm run parts:check`, or converting a figure with `scripts/part-draft.mjs`. 3) Part Maker step by step with the six tabs. 4) The three slots and why "assumed" is fine and a made-up datasheet number is not. 5) Model templates and their limits (Q1 mapping; no curves; no memory in a truth table). 6) Art: the allowed SVG subset, the generic drawing, why a buddy's picture never runs. 7) Versions and pins: the bump table of `COMPONENT_SCHEMA.md` 4.16 and the upgrade dialog. 8) Sharing: pack export and import, what the dialog shows, why code parts are off. 9) Adding a core part or board to the repo: the R-072 checklist, the gates in `src/parts/library.test.ts`, the sources rule (read the datasheet or mark the part generic). 10) Licences: `LicenseRef-local-private` for yours, `LicenseRef-iynk-pending` for core until D-017. Every command in the page is a command that exists |
| | state transitions | None |
| | validation rules | Plain words, no em dash, no marketing, no banned simulation words |
| | error conditions | None |
| | edge cases | The page names UNKNOWN items (code parts, curves) instead of hiding them |
| | permissions | None |
| | performance | None |
| | migration | None |
| Verification | unit tests | `src/parts/examples.test.ts`: the example validates as `local` (`trust: 'local'`), `node scripts/gen-parts-index.mjs --check` does not list it, its fixture passes `runFixture`, and `docs/ADD_A_PART.md` is checked for staleness: every `npm run <name>` in it exists in `package.json`, every path in backticks that starts with `scripts/`, `src/` or `docs/` exists |
| | integration tests | None |
| | Playwright | The fresh-eyes walk is in T-B11-10 |
| | fixtures | The example and its fixture |
| | acceptance | Given the page, When I follow section 3 with the values of the example, Then the part saved equals the example file apart from `created` and `id` |
| | observability | None |
| | release blockers | A command in the page that does not exist |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts/examples.test.ts`; `node scripts/validate-part.mjs --trust local src/parts/data/examples/custom-led.component.json` |
| | docs | This is the doc |
| | rollback | Delete the two files and the line in `CONTRIBUTING.md` |
| | later tasks need | Nothing |

---

### T-B11-10 End to end: add a custom part, wire it, simulate it, share it, hostile inputs

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B11-10 / Browser tests / B11 |
| | priority, size, status | P0, L, not started |
| | dependencies | All other tasks of this phase |
| Intent | problem | The phase exit is `e2e/parts.spec.ts` plus CM-16, CM-17 and AR-14. Unit tests do not prove a script in art stays inert in a real browser, nor that the user path works |
| | target user | Amar at the phase stop |
| | user story | As Amar, I run one spec and see a custom part made, wired and simulated, shared, and hostile files refused |
| | expected behaviour | The spec drives the real app on a production build, keyless, on a random port |
| | success metric | All cases pass in Chromium; axe finds 0 serious or critical violations on the editor, the part page and the pack dialog; 0 `securitypolicyviolation` events other than the one planted on purpose |
| Implementation | existing files | `playwright.config.ts:5` (random port 40000 to 49999; B0 skips 43117), `e2e/csp.spec.ts` (T-B1-13), `e2e/core.spec.ts` and `e2e/studio-m1.spec.ts` (B3/B4 helpers), `@axe-core/playwright` 4.13.0 (VERIFIED in `package.json:50`) |
| | new files | `e2e/parts.spec.ts`, `e2e/support/parts.ts` (helpers: open Studio, add pins through the table, import a file through the chooser, read the `parts` store through `page.evaluate`) |
| | edited files | `e2e/csp.spec.ts` (one new case: the custom-art case) |
| | modules and signatures | Helpers: `openStudioNewProject(page)`, `makePart(page, spec)`, `importPackBytes(page, name, bytes)`, `partsStoreKeys(page): Promise<string[]>`, `collectCspViolations(page): Promise<string[]>` |
| | data model | None |
| | input and output schemas | Hostile archives are built inside the spec with the same zip helper the unit tests use, written to a buffer and passed to `setInputFiles` |
| | API contracts | None |
| | algorithm | Cases, in order: **E1 make** (open Studio, new Uno project; Palette search "pulse" finds nothing and shows Add part; make "Test LED" with pins A (anode) and K (cathode) using the keyboard only, template LED-like with 2.0 V and 20 mA, Save: toast "Saved as local.test-led@1.0.0"). **E2 use** (place it with a 220 ohm resistor; wire D13 to the resistor, resistor to A, K to GND; run: the LED shows lit and the inspector current is 12.2 mA within 0.1 mA, the bench-solve anchor `bench-solve.test.mjs:20-24`; the tier chip says teaching model; "What it models" lists the sentences). **E3 version** (edit the part, change Vf to 3.0 V: Save offers 2.0.0 with the reason; the open project still pins 1.0.0 and reads 12.2 mA; open the upgrade dialog, see the `vf` change and the current change, apply, run: new value; undo once: 12.2 mA again). **E4 persist** (reload: the part is still in the palette; clear all site data via the settings wipe: 0 parts). **E5 share** (export a pack; delete the part; import the pack through the file chooser; the dialog shows license, third-party flag, pin count; Add to my library; the part is back with the same digest). **E6 CM-17** (hostile archives: a zip bomb, a `../` path, a path with a drive letter: each shows the refusal with the limit named, and `partsStoreKeys` is unchanged). **E7 CM-16** (a pack whose part has an `extension` layer: the dialog says code parts cannot be turned on, offers no Enable; after Add as disabled data the placed part reports "code part not approved" and does not run; the rest of the circuit runs). **E8 AR-14** (in `csp.spec.ts` and here: import a pack whose art is an SVG with `<script>window.__pwned=1</script>`, `onload`, `<foreignObject>` and an external `<image>`; place the part; assert `window.__pwned` is undefined, the DOM holds one `<img>` with a `data:` or `blob:` source and no inline `<svg>` for that part, no request to any external host was made, and zero `securitypolicyviolation` events; then write the unsanitised SVG straight into the `assets` store with `page.evaluate` and reload: the render still passes through the sanitiser and the result is the same; finally append an inline `<script>` element to the page on purpose: it does not run and exactly one violation is reported). **E9 existing parts** (place 6 core parts: LED, TIP120, SG90 servo, HC-SR04, MPU-6050 module, L298N module: every pin is a wiring target (count equals the descriptor), the L298N shows "not modelled yet" with its reason and the circuit around it still runs). **E10 offline** (after one online load, `context.setOffline(true)`, make a part: works; skipped with a named reason if the B3 offline shell spec is not green, because B3 recorded that as UNKNOWN). **E11 axe** on the editor, the part page and the pack dialog. **E12 fresh eyes**: an agent reads only `docs/ADD_A_PART.md`, then repeats E1 with the example values; the confusing steps it reports are listed in the PR |
| | state transitions | None |
| | validation rules | Section 4 |
| | error conditions | A failing case prints the page URL, the console log and the store keys |
| | edge cases | Chromium only for this spec; WebKit differences for art rendering are part of RS-15/T-B11-12's scope, not here |
| | permissions | None |
| | performance | Whole spec under 4 minutes on the reference laptop (ESTIMATED) |
| | migration | None |
| Verification | unit tests | None (this task is tests) |
| | integration tests | The spec is the integration test |
| | Playwright | `e2e/parts.spec.ts`, `e2e/csp.spec.ts` |
| | fixtures | `src/export/testdata/packs/ok-pulse.iynkpack` (T-B11-08) and hostile buffers built in the spec |
| | acceptance | CM-16, CM-17 and AR-14 as in section 7; "a documented custom part is added and simulated with no engine edit" (roadmap acceptance) |
| | observability | Playwright trace on first retry (existing config) |
| | release blockers | Any case failing; any violation count above the planted one |
| Delivery | definition of done | Section 4; the spec passes twice in a row (stability) |
| | verify commands | `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/parts.spec.ts e2e/csp.spec.ts` with `KL` written out as in section 4; then `npm run check` |
| | docs | The PR text lists E1 to E12 results and the numbers (12.2 mA reading, violation count) |
| | rollback | Delete the spec; nothing else depends on it |
| | later tasks need | The helpers in `e2e/support/parts.ts` for B12 and B13 |

---

## 7. Coverage of features, requirements and the exit gate

| Item | What it asks | Tasks | Proof |
|---|---|---|---|
| F-096 / R-131 | The 29 part figures and 12 module figures have descriptors; figures still render | 02a, 02b1 to 03b2 (seven data tasks), 02d, 06, 19 (7 already converted by B2 and B4) | `coverage.test.ts`: 40 figure files (28 + 12, `wire` exempt) map to 34 descriptors; `pinsCovered` for each; the figures themselves are untouched |
| F-098 / R-132 | Equations or table, values with sources, validity, known gaps | 14, 17, 01 (copy check), data tasks | `partFacts` tests; the part page; AC-CE-06, AC-CE-07 |
| F-099 / R-133 | Every number links to a source or says "unsourced" | 14, Procedure C3 and C4 | `unsourcedNumbers` list per part |
| F-101 / R-134 | Part Maker, beginner mode, four simple models, live validation, status "partly modelled" once a template adds a runnable layer (a fresh draft is "not modelled yet", tier none, Q6) | 04a, 04b, 05a, 05b, 09, 13, 16 | E1 to E3, E12; AC-CE-08, AC-CE-09, AC-CE-10 |
| F-104 / R-136 | New boards and parts follow the R-072 checklist | 11 (checklist and path), For Amar item 5 | The worked example is added with no engine edit (E1, E2) |
| F-220 / R-137 | Packs: validate, show licence and sources, refuse code (see Q10), never auto-update | 08, 16, 06, 13 | CM-16, CM-17, AC-CE-17, AC-CE-18 |
| R-138 | `provenance.license` required on every saved part | 01, 04a (default), 08 | `P-LICENSE` test; editor default `LicenseRef-local-private` |
| Roadmap testing line | Descriptor without `simulation.tier` fails CI | 01 | Test removes `tier` and expects a `P-SCHEMA` issue |
| Roadmap testing line | Pinned versions load unchanged | 07, 09 | Trace hash equal after `1.1.0` is added |
| CM-16 | Code-bearing part arrives disabled and cannot be enabled before an RS-15 verdict | 05a (`CODE_PARTS_ENABLED = false as const`), 08, 10 E7 | Unit test and E7 |
| CM-17 | Hostile archive refused with the limit named, nothing written | 08, 10 E6 | 16 cases and E6 |
| AR-14 | Zero CSP violations in e2e; planted inline script blocked; custom SVG with a script does not run | 06, 10 E8 | Sanitiser corpus (unit) and E8 (browser) |
| AC-CE-02, AC-CE-04 | Core parts show figure or fallback; `not-modelled-yet` parts place, wire and the rest runs | 06, 09, 10 E9 | E9 |
| AC-CE-13 | Art with a script is rejected with the reason; the part keeps the fallback | 06, 04b | Editor test (script SVG upload) |
| AC-CE-15 | Embedded code part: label "code part not approved", pins float, nothing ran | 05a (`detail` text), 09, 10 E7 | E7 |
| AC-CE-20 | `provenance:check` lists third-party content | 19 | `node scripts/provenance-check.mjs --informational` |
| AC-CE-23 | Works offline | 10 E10 | E10 (skipped with a named reason if B3 offline is not green) |
| AC-CS-06 | Project keeps `1.0.0`, upgrade shows a diff | 07, 15, 10 E3 | E3 |

## 8. Phase exit procedure

The orchestrator runs these in order after T-B11-10 is committed. Amar's OK comes after.

| Step | Command or check | Pass |
|---|---|---|
| 1 | `git status --short` | Clean |
| 2 | `npm run check` (content check, `parts:check`, typecheck, lint, test, e2e) | Exit 0 |
| 3 | `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/parts.spec.ts e2e/csp.spec.ts` | All cases pass, twice |
| 4 | `npx vitest run src/parts/coverage.test.ts` | Prints 34 rows, 0 missing |
| 5 | `npx tsc -p tsconfig.portable.json` | Exit 0 |
| 6 | `node scripts/provenance-check.mjs --informational` | Exit 0; prints the list of parts with third-party content for Amar. The `--strict` form exits 1 until For Amar item 2 is done and is not run here. Neither is in `npm run check` |
| 7 | Record in the PR | Coverage 34 of 34; tier and status counts; number of unsourced numbers; validation median ms; sanitiser ms for 256 KiB; CM-16, CM-17, AR-14 results; the 12.2 mA reading; the RS-15 verdict and its independent check |
| 8 | Tag | After Amar's OK the orchestrator makes the local tag `phase-B11`. Nothing is pushed |

## 9. For Amar

Work only a person can do. None of these is an agent task.

| # | Item | Why an agent cannot |
|---|---|---|
| 1 | Accept or overrule the defaults in section 2 (Q1 to Q10), especially Q4 (which figure a shared item names), Q6 (status follows what the Studio runs, so about 10 of the 27 new descriptors will read "not modelled yet" until B12 and B13; ESTIMATED), and Q10 (code pack arrives as disabled data under CM-16, or is refused whole as R-137 and AC-CS-10 read) | It changes what the phase promises |
| 2 | Review the third-party content before the repo is published (D-017): the LED brightness curve and colour table that come from the Learn Arduino lesson (`figures/parts/led.js:3-4`, `bench-bb.js:211`) and every descriptor that `provenance-check` lists. Decide rewrite or keep | A licence judgement |
| 3 | Optionally check simulated numbers on a real board with a multimeter, for example a 220 ohm resistor and red LED on D13 (the model says 12.2 mA), and enter `measured` slots yourself with method, samples and date. Agents leave `measured` empty | Needs hardware; a label of "bench-measured" must be true |
| 4 | Provide datasheets (or links you have read) for parts that agents marked `generic: true` for lack of one: 2N2222, TIP120, 1N4007, TMP36, FSR 402, SG90, 28BYJ-48, NEMA 17, HC-SR04 and others the commit bodies list. A later one-line task upgrades them to cited sources | Agents must not cite what they did not read |
| 5 | Choose which of the 39 proposed new parts (`COMPONENT_ECOSYSTEM.md` 3.5) or which boards to add, and in what order. Each becomes one descriptor task that follows `docs/ADD_A_PART.md` (F-104) | A product choice |
| 6 | Read the RS-15 report and decide whether a code-parts phase is ever worth opening | A scope call |
| 7 | Choose the licence (D-017). A later codemod replaces `LicenseRef-iynk-pending` | Not decided |
| 8 | Say whether the six-language strings need a native review | Taste and cost |
| 9 | Confirm the 5-file counting rule used here: a data set of one kind (descriptors, fixtures, one i18n namespace in six languages) counts as one file, and a descriptor task holds at most 5 descriptors (roadmap section 6 item 10) | Process |

## 10. Not in this phase

| Item | Reason |
|---|---|
| Marketplace, publisher identity, moderation | F-103 is out of scope (D-013) |
| Code-bearing parts and the SDK (F-102, R-135) | Blocked on RS-15; T-B11-12 produces a verdict only; `CODE_PARTS_ENABLED` stays false |
| A curve or table data kind for models | Not in the schema (Q1); needs a schema minor |
| Rewriting the `local.` namespace on export | CE 7.2 item 6 is a proposal; collisions are refused instead (Q7) |
| "Make a part from this placeholder" (AC-CE-11) and the list of projects that stay on an old version when a major version is saved (AC-CE-12, second half) | Not in R-131 to R-138; the second needs a dependency index over all projects. Candidates for a later task |
| A `parts/` folder mirrored into the project folder on disk | Named in CS 4.1; depends on File System Access work not planned here (UNKNOWN) |
| The 39 new parts and the 11 other boards beyond B5 | Boards are B5; new parts wait for Amar's choice (For Amar item 5) |
| Flipping `not-modelled-yet` modules to modelled | B12 and B13 register the bridge and regulator refs named in `x_legacy_model` |
| Phone layout of the editor | B5-13 is LATER class |
| New interface languages | Stay at six (R-136) |

## 11. Risks

| # | Risk | Label | Mitigation |
|---|---|---|---|
| 1 | Constants in figure code have no source (roadmap R1) | VERIFIED for the LED and diode (`bench-solve.js:102,104`) | Procedure C3 and C4: assumed slots with `confidence: low`; gate 6 lists third-party content; the part page counts unsourced numbers |
| 2 | The SVG sanitiser misses a construct (roadmap R2) | HYPOTHESIS | Allow-list tokenizer that copies nothing through; output self-check; render only through `<img>`; re-sanitise on read; 45-sample corpus; E8 in a real browser |
| 3 | Earlier phases (B2 to B10) are not built, so names here may differ | UNKNOWN | Precondition check in section 4; each task adapts to the real name and writes the difference in its commit body |
| 4 | `scripts/validate-part.mjs` importing TypeScript needs Node type stripping and `.ts` specifiers | UNKNOWN (SYS AX-03) | Fallback to a vitest-backed CLI named in T-B11-01 |
| 5 | The `vm` approach of `part-draft` fails on a figure that needs real engine objects at load | HYPOTHESIS | The tool reports the file; the agent writes that draft by hand |
| 6 | Seven conversion agents map legacy fault strings to different `x-` cause ids | HYPOTHESIS | Gate 11 limits ids to the registry plus `x-`; each commit body lists its `x-` ids; the orchestrator merges duplicates in review |
| 7 | Honest status leaves many modules "not modelled yet" | ESTIMATED about 10 of 27 | Intended (R-FID-3). Amar can relax Q6 at the stop; the cost of relaxing is that Studio would claim a model it does not run |
| 8 | IndexedDB database version bump (T-B11-13) cannot be rolled back in the browser | DOCUMENTED (platform behaviour) | The new store is empty and unused after a revert; a re-apply reuses it |
| 9 | Every added i18n key is loaded on every request (`src/i18n/server.ts:31`) | VERIFIED | Short strings; bytes delta in T-B11-18's commit body; a size note at the phase stop |
| 10 | Pack limits (8 MiB, 32 MiB, ratio 20, 200 files) were never tested against real parts | DOCUMENTED proposals | T-B11-08 tests them; a real pack is under 100 KB (ESTIMATED from 4.5 to 9 KB gzipped per descriptor) |
| 11 | The zip library is not chosen (none in `package.json`) | VERIFIED absence | T-B3-05 decides it; T-B11-08 reuses it and adds no dependency |
| 12 | Shipped descriptors and the design-time examples in `04_ARCHITECTURE/schemas/examples/components/` drift apart | HYPOTHESIS | The shipped files supersede the examples; `ADD_A_PART.md` says so; `examples.test.ts` keeps the examples valid |
| 13 | `npm run content:check` is red between the first conversion commit and T-B11-02d, because the barrel is regenerated once, after all descriptors exist | DOCUMENTED (plan design) | Conversion tasks do not run `content:check` (their verify lines say so); T-B11-02d regenerates and the check is green again before group 4 continues |
| 14 | The hand-written `part-model` entries of B8 T-B8-22 and the generated `part:` entries of T-B11-17 could drift into two sources of truth | HYPOTHESIS | The guard test in T-B11-17 fails on any hand-written entry with a descriptor's `part:` id; the T-B11-17 commit body tells the T-B8-22 owners to write none |

## 12. Research spikes

| Spike | Question | Task |
|---|---|---|
| RS-15 | Does an opaque-origin iframe plus Worker with no network survive the four attacks in Chromium and WebKit, with kill under 2 s? | T-B11-12 |

No other open question in this phase needs research: the schema, the registry, the packs and the sanitiser are design-complete in `COMPONENT_SCHEMA.md`; what is untested is stated as a risk or a measurement inside the task that makes it.

## Review fixes (2026-10-27)

Fifteen review issues were checked against the task files they cite (`tasks/B2`, `B3`, `B4`, `B8`, `B9`, `B10`) and against `negative.mjs` (run). Fourteen were applied as written or with a stated adjustment. One part of issue 1 was not applied, with the reason below. Task count is now 28 (was 24).

| # | Issue | Evidence checked | What changed | Where |
|---|---|---|---|---|
| 1 | Re-created B2 modules | B2 T-B2-11 defines `validateDescriptor(value, opts)`, `DescriptorCheck`, `BANNED_WORDS`, `digestOf`, `versionCompare`, `semanticChecks`, `createRegistry`, `interfaceOf`, `checkPinRules`, `FallbackSpec`, `fallbackSpec`, `placeholderSpec`; B2 T-B2-22 defines `checkLibrary`; B4 T-B4-06 defines `fallbackArt` | Section 1 and the precondition rule now read the B2, B3, B4, B8 and B10 files. T-B11-01 edits `descriptor.ts` and `semantic.ts` and adds only `ValidateContext`, `Trust`, the S-10 solver half, S-12, S-15 digest half, S-17 against `ctx.causeIds`, `P-LICENSE`, `P-TODO`, `P-TRUST-ORIGIN`, `P-BUILTIN-UNKNOWN`, `P-STATUS-LAYERS`, `P-TEST-TO-WRITE`. `PartIssue` is gone (use `Diagnostic`). T-B11-02a adds `remove/originOf/removeByOrigin/onChange` to B2's `PartRegistry` and `getAppRegistry()`; no second registry. T-B11-07 uses `digestOf`, `versionCompare`, `interfaceOf`, `checkLibrary`; `canonicalDigest`, `compareSemver`, `deriveInterface`, `libraryPass` are dropped. T-B11-06 extends `FallbackSpec` with `bounds_mm` and adds `pinsCovered` and `selectArt`; `FallbackGeometry` is dropped; B4's `fallbackArt` is named as read-only context. Not applied: the new code `NEWER-SCHEMA`. B2 already emits `P-NEWER` for that refusal, so adding a second code would duplicate it. All new codes use B2's `P-` prefix | sections 1, 4; T-B11-01, 02a, 06, 07 |
| 2 | Descriptor location and loading | B2 T-B2-12 and T-B2-04 glob `src/parts/data/*.component.json` flat; B4 T-B4-10 and B9 T-B9-04 add flat files; B9 and B10 sweeps glob it | New files are flat (`src/parts/data/<slug>.component.json`, fixtures in `src/parts/data/tests/`). T-B11-02a edits `builtin.ts` and writes `scripts/gen-parts-index.mjs`, which generates `src/parts/data/index.generated.ts`; conversion tasks never touch it. New serial task T-B11-02d (group 4) regenerates it. `schema-gen.mjs` and the B9/B10 globs need no edit because the folder stays flat | sections 3, 5; T-B11-02a, 02d, Procedure C |
| 3 | C12 and `failure-models.json` | B10 T-B10-02 ships one file `failure-models.json` plus an `entries.ts` edit | C12 now says touch only your own files. T-B11-17 gives the descriptor precedence and `models.ts` ignores same-id records. T-B11-02d deletes the duplicate records in one commit. The file is in the ownership table. "Delete that data file in its own commit" is gone | Q9, Procedure C, T-B11-17, 02d |
| 4 | `--all` and the examples folder | Flat glob is non-recursive | `--all` reads the flat folder only and `--root <dir>` is added so the test can prove that `examples/` and `tests/` are skipped. The example stays at `src/parts/data/examples/custom-led.component.json` | T-B11-01, 11 |
| 5 | Default draft status | Schema allows empty `what_it_models`; `none` layer is `{id, domain, model: {kind: "none", reason}}` | `newDraft` is `not-modelled-yet`, tier `none`, one `none` layer. `applyTemplate` writes `partly-modelled` and `T1`. The 04a acceptance, the F-101 row and the member types (now aliases of B2's generated types) are fixed | T-B11-04a, section 7 |
| 6 | Dependency edges | | 09 -> 07 and 02a (the library reaches the orchestrator as `RunOptions.parts`, default `getAppRegistry()`); 14 -> 08; 19 -> 14 and 02d; 04b -> 02a; 05b's page-text clause moved to 14's tests, so no 05b -> 14 edge; the index and the edge list are the same; groups re-cut (08 and 09 to group 3, 05b and 14 to group 4, 19 to group 5). The conversion tasks no longer depend on 09 because their gates call `resolveLayers` and `runFixture`, not the orchestrator. "Teaching model" is defined as the `partinfo` key `tier.T1` | sections 3, 5; 04b, 05b, 08, 09, 14, 19 |
| 7 | 5-file rule | | Seven data tasks of at most five descriptors: 02b1 (5), 02b2 (3), 02c1 (5), 02c2 (3), 03a (5), 03b1 (3), 03b2 (3) = 27. Rule 5 states the cap; For Amar item 9 asks for confirmation | sections 3, 4, 5; Procedure C packages |
| 8 | Sync asset callback and regex | | `PartLibrary` loads the asset-hash set in `init()` and exposes `hasAsset(sha256): boolean` and `assetUrl`; `selectArt` keeps the synchronous `HasAsset` callback; the self-check regex is `\bon\w+=` | T-B11-06, 16 |
| 9 | Pack reader | `tasks/B3` T-B3-05 and PD-14 | Check order is fixed (compressed size, entry count, running total, then ratio at entry end and archive end). The reader is `src/export/zip.ts`, edited only to accept `limits` if absent. The note on SVG vs PD-14 is added. Hostile cases are numbered 1 to 16, plus format cases 17 to 20, each with one code | T-B11-08 |
| 10 | RS-15 | | Runner is `cd docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-15-worker-kill/src && node run.mjs --runs 20`; prototype lives only in that folder; `killMs` is measured by Playwright's worker `close` event with the supervisor-heartbeat fallback; independent-check step added. Adjusted from the issue text: the issue asks for "last heartbeat minus deadline", but a model Worker stuck in A1 stops its own heartbeat at once, so the heartbeat comes from a separate supervisor Worker and is the fallback, not the primary | T-B11-12 |
| 11 | `putMany` | `tasks/B3` line 314 lists `assets` (sha256 to Blob); T-B3-22 files exist | `putMany` returns `{ok: true, results} \| {ok: false, conflicts}`; `commitPack` returns `PackCommitResult` with the same shape; B3's repository files are named as read-only context; precondition checks `STORES` for `assets` | T-B11-13, 08 |
| 12 | Generated registry entries | `tasks/B8` T-B8-22 writes `model:` ids by hand | `scripts/gen-part-entries.mjs` writes `src/sim/registry/data/parts.generated.json` (ids `part:<id>@<major>`), is run by `npm run content` and checked by `content:check`; the guard test fails on a hand-written entry with a descriptor's `part:` id; the commit body tells T-B8-22 owners to write none | T-B11-17 |
| 13 | Untestable device acceptance | `src/lib/interp/devices.ts:21,104,261`; `world.ts:137` | New check `builtin-binds` with a `bind` block (`Mpu6050`, `Pca9685` by `write` then `read`; `HcSr04` by class name through `new World(profile)`). C9 now says device-backed modules get a `conformance` fixture only, `shape: 'none'`; golden-trace only where a shape fits | T-B11-02a, 03a, 03b1, Procedure C |
| 14 | `provenance-check` exit code | | `--informational` always exits 0 and is the form used in verify and exit steps; `--strict` exits 1; no flag exits 2. Section 5 states that `library.test.ts` is green with any number of descriptors and `coverage.test.ts` (created in group 5) is the only count gate | T-B11-19, sections 5, 8 |
| 15 | `goldenDelta` and `PartPage` props | `tasks/B4` DocStore.commit; B4 no-direct-writes test | `goldenDelta` moved to `src/parts/golden.ts`. `PartPageProps` gains `usage?: PartUsage` and `onUpgrade?`, defined in T-B11-14. T-B11-15 adds `UpgradeHost`, which calls `DocStore.commit(plan.ops, { label })` once; project-open and no-project cases are tested | T-B11-14, 15 |

Also fixed while here: B2 says `negative.mjs` holds 34 mutations, but the run prints 44 (T-B11-01 asserts the union is 44); `ProjectDocument` is B2's `Project`; `resolveLegacy` returns a ref in B2, so tests use `descriptorForLegacy(reg, id)`.

