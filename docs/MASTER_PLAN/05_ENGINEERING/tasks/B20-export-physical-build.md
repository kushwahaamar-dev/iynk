# B20 Export and physical build: atomic task packages

Written 2026-10-27 for the build-plan step. Plan only: no file under `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Phase goal: a finished project becomes a real thing. A parts list, a wiring guide made from the nets, flashing steps, a hardware twin that compares simulation with a connected board, a reality gap page, substitute parts, and open-format export and import with loss reports.
Scope: F-090, F-091, F-154, F-155, F-157 to F-162, F-210 to F-212; R-181 to R-192 (CM-60 to CM-68 are the named gate; CM-69 to CM-72 deepen R-192, R-181, F-163 and D-011 and are built here too). Not in scope: affiliate links (F-164), a marketplace (F-103), gerber or any manufacturing file.
Exit: `npm run check`; CM-60 to CM-68 pass; `e2e/build-it.spec.ts` passes; Amar builds one project for real from the guide (For Amar item A1). Then Amar's OK.
Depends on phases B9 (hex parsing, compile), B11 (descriptors, library), B5 (all boards, `.ino`, views), B17 (URDF), B19 (drone parameter dump, wiring sheet). Through the roadmap chain it also needs B2 (document, netlist), B3 (storage, `.iynkz`, export-all), B4 (Studio shell), B8 (fidelity registry), B10 (diagnosis record) and B14, B15 (search through your key, proposals).
Labels: VERIFIED (read or run in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs read for this file: `00_EXECUTIVE/DECISION_REGISTER.md` (D-013 to D-017), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` R-181 to R-192 (lines 1053-1064), `03_PRODUCT/COMMUNITY.md` section 8 (lines 630-950: build inputs, BOM, datasheets, substitutions, budget, prices, wiring, flashing, checklist, reality gap, package, CM-60 to CM-72), `03_PRODUCT/FEATURE_CATALOGUE.md` (F-090, F-091, F-154 to F-162, F-210 to F-212), `04_ARCHITECTURE/PROJECT_DATA_MODEL.md` 5.16 and 12.2, `schemas/project.schema.json`, `schemas/component.schema.json`, `04_ARCHITECTURE/RECONCILIATION.md`, `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` B20 card (lines 1114-1157), and the task files B0 to B11, B14 to B16 in this folder. No task file exists yet for B12, B13, B17, B18 or B19; their names below come from the roadmap (DOCUMENTED) and each is checked by task T-B20-01.

## 1. What this phase starts from

`src/export`, `src/local`, `src/studio`, `src/parts`, `src/project`, `src/core`, `src/components/studio` do not exist in the repo today (VERIFIED, `ls src` shows `app components content i18n lib`). Phases B2 to B11 create them. Every path marked PLANNED is taken from an earlier task file or the roadmap (DOCUMENTED), not from code. Task T-B20-01 turns each PLANNED name into a test, so an agent stops and reports if a name moved.

| Fact | Evidence | Label |
|---|---|---|
| No BOM export, wiring guide, flashing steps, reality-gap panel, schematic export, KiCad or SPICE or Wokwi converter, or substitute engine exists | `grep -rln "bom.csv\|reality\|kicad\|substitut" src` finds nothing relevant; FEATURE_CATALOGUE rows F-090, F-160 to F-162, F-210 to F-212 say NEW; FV section 6 | VERIFIED |
| Hand-written parts lists exist for 3 families: drones (`droneBom`), robotics benches (`roboticsBom`), boards (`boardBom`) | `src/lib/search/bom.ts:238` (`droneBom`), `:374` (`boardBom`), `:379` (`roboticsBom`); line type `BomLine` at `:19-36` | VERIFIED |
| Catalogue prices are USD floats on the drone content: fixed parts 39+45+39+25+30+18+4+8+4, batteries, motors, props | `src/content/drones/quad5.ts:93-101` (fixed), `:104-106` (batteries), `:109-111` (motors), `:114-116` (props). Tests assert `346` | VERIFIED |
| The quad5 default total is 346 | `src/lib/search/optimize.test.ts:154`, `:197` (`expect(result.current.cost).toBe(346)`) | VERIFIED |
| `sumMoney` rounds in cents; `lineCost` is `ceil(units / pack) * price` | `src/lib/search/cost.ts:8-20` | VERIFIED |
| Live prices come from `POST /api/search/offers` with `OfferPartInput {key, query, qty, pack?, sources?}`; one source per part when `sources` is `["google_shopping"]` | `src/lib/search/bom.ts:31-40` (`LIGHT`, `offerParts`), `src/lib/search/client.ts:43` | VERIFIED |
| The client turns every HTTP 429 into `rate_limited`, but the server answers 429 for a spent budget too, so a spent quota is labelled "rate limit" (audit C027) | `src/lib/search/client.ts:8` (`FailCode`), `:39`; `src/lib/server/search/route.ts:15` (`quota_exhausted: 429`); `src/lib/server/search/serpapi.ts:175`, `:198-199`; `src/components/search/RealBuildPanel.tsx:471` | VERIFIED |
| `OffersGap = "quota" \| "upstream"` and `SearchErrorCode` already carry `quota_exhausted` | `src/lib/search/types.ts:33`, `:81` | VERIFIED |
| Outbound links use `external = {target: "_blank", rel: "noopener noreferrer"}` and the listing URL as returned | `src/components/search/shared.tsx:88`; `RealBuildPanel.tsx` `OfferRow` (`<a href={offer.url} {...external}>`) | VERIFIED |
| The hardware twin mirrors pins over Firmata at 57600 baud for Uno, Nano, Uno R4; it does not flash code | `src/lib/hw/twin.ts:15` (`TWIN_BOARDS`), `serial.ts:23` (`FIRMATA_BAUD = 57600`), FC row F-159 | VERIFIED |
| `SerialPortLike` has `open`, `close`, `getInfo`, `readable`, `writable` and no `setSignals` | `src/lib/hw/serial.ts:7-15` | VERIFIED |
| The twin session owns one port; `connect` at `session.ts:77`, `disconnect` at `:117` | `src/lib/hw/session.ts:29-168` | VERIFIED |
| The twin still depends on the Board lab store: `twin.ts:8` imports `@/lib/boardlab/inputs`; `sim.ts:9-10` imports `@/lib/boardlab/engine` and `store`; `HardwareTwinPanel.tsx:63` takes `LabDockProps` and `:14` imports `boardLabSim` | `grep -rn "lib/boardlab" src/lib/hw src/components/hw` | VERIFIED |
| T-B13-11 deletes the robotics and dronelab stores only. The boardlab store stays: the old board pages, the hardware twin and the board AI adapter still use it, and `src/lib/hw/sim.ts` is one of its 25 importers. Deleting it waits for Amar to retire the old board pages (B13 finding F4 at line 28; section 9 item 5 at line 1493) | `B13-labs-robotics-drones.md:28` and `:1493`; roadmap lines 84-85 (T-B13-11) | DOCUMENTED |
| `parseHex` returns `HexImage {flash, usedRanges, bytes}` and never throws | T-B9-08 (`src/export/hex.ts`) | DOCUMENTED |
| `exportIno`, `wiringCsv` (header `part,pin,net`), `importIno`, `LossItem`, `LOSS` codes and the header marker line `// iynk export` are planned in `src/export/ino.ts`, `loss.ts`; B20 "extends `exportIno` into the full bundle" | T-B5-10 (`B5-studio-all-boards.md:327-364`) | DOCUMENTED |
| `.iynk`, `.iynkz`, zip reader and writer with hostile-input limits are planned in `src/export/zip.ts`, `iynk.ts`, `iynkz.ts`, `src/local/files.ts`; `export-all.ts` excludes the `keys` store | T-B3-05 (line 656 ff.), T-B3-08 (line 856 ff.) | DOCUMENTED |
| `netlist(doc): Netlist` with `NetlistNode {id, nets, names, pins}` reads only `nets`, `boards`, `components`, `dependencies` | T-B2-13 (`B2-core-document-netlist.md:734-782`) | DOCUMENTED |
| `holeToPin(kind, legacyRef)` and `surfaceInterface(kind)` exist for hole names; `Placement.legs` maps a pin id to a hole name such as `c19` | T-B2-13 (`holes.ts`); `project.schema.json` `$defs.Placement.properties.legs` | DOCUMENTED / VERIFIED |
| The project schema has 64 op kinds; none writes the root `ext` and none writes `exports[]`. `asset.add {asset}` and `asset.remove {id}` exist. `component.swap {id, definition, pinMap}` requires a `pinMap` | `node -e` over `project.schema.json` `$defs.Op.oneOf` (64 kinds listed) | VERIFIED |
| `ExportRecord {format, at, appVersion, sha256, revision, loss[]}` at most 32 per project; `LossItem {code, severity, path?, message}` | `project.schema.json` `$defs.ExportRecord`, `$defs.LossItem`; PDM 5.16 | VERIFIED |
| Descriptor fields the BOM needs: `identity.{manufacturer, model, mpn, generic, kind, category, lifecycle, tags, legacy_ids}`, `sources[].{kind, title, url, retrieved, revision, reliability}`, `dimensions.package`, `pins[].{designator, polarity, connector}`, `ratings`, `compatibility.rules[].kind`, `software.environments[].libraries[].{name, version, install, iynk_support}`, `simulation.{tier, status, what_it_models, not_modelled, known_gaps}` | `component.schema.json` `$defs.identity`, `source`, `dimensions`, `pin`, `rating`, `compatibility`, `software`, `simulation` | VERIFIED |
| Hazard tags are `identity.tags` strings `hazard:<kind>`; the schema allows 32 tags | COMMUNITY 8.12 (line 905 ff.); `$defs.identity.properties.tags.maxItems = 32` | DOCUMENTED / VERIFIED |
| Web Serial is allowed by `Permissions-Policy: serial=(self)` once T-B0-21 ships the headers; `usb=()` is blocked | `B0-foundation-green-safe.md:777` | DOCUMENTED |
| Six UI languages (de en es fr hi zh); a namespace is six files; the list is `src/i18n/namespaces.ts:4` | `ls src/i18n/messages`; `src/i18n/namespaces.ts:4` | VERIFIED |
| Vitest includes `src/**/*.test.{ts,tsx}`; Playwright `testDir: "e2e"`, random port 40000 to 49999. No `fake-indexeddb`, zip, PDF or sanitiser package is in `package.json` | `vitest.config.mts:12`; `playwright.config.ts:5`; `package.json` | VERIFIED |
| `scripts/copy-check.mjs` does not exist today; T-B1-20 creates it and B1's exit runs it | `ls scripts`; `B1-foundation-keys-oss-honest.md:199`, `:15` | VERIFIED / DOCUMENTED |
| This repo runs Next.js 16.4.3. This phase names only `next/dynamic` style lazy loading, read in `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (exists). No route, header or config API is named | `package.json`; `AGENTS.md` | VERIFIED |

## 2. Decisions this plan makes, and the questions it leaves

Where two design documents disagree, `RECONCILIATION.md` decides and the JSON schema is the contract. The rows below are places the documents are silent or still disagree. Each has a default so agents can proceed. Amar can overrule at the phase stop.

| # | Question | Sources | Default in this plan | Label |
|---|---|---|---|---|
| Q1 | ADR-0825 and COMMUNITY 8.2 put build inputs (budget, typed prices, `have`, `skip`, chosen parts, measurements) in `ext["iynk.build"]`. No op writes the root `ext` (64 ops, VERIFIED), so the app cannot change it after import | COMMUNITY 8.2, ADR-0825, schema `$defs.Op` | Store the same `BuildInputs` JSON as one project asset, path `build/inputs.json`, role `other`, media type `application/json`, written by a batch `[asset.add (new sha256), asset.remove (old id)]` so one edit is one undo step. No schema change. A bare `.iynk` file carries asset metadata but not bytes, so it loses the inputs with loss code `build.inputs-not-in-bare-file`; `.iynkz` and the build package keep them. A later schema minor with an `ext.set` op or `domains.build` (COMMUNITY O-6) replaces it; only `src/export/build-inputs.ts` changes | HYPOTHESIS |
| Q2 | No op writes `exports[]` either (64 ops, VERIFIED) | PDM 5.16; `B5-studio-all-boards.md:177` and `:308` | The writer is `ProjectSession.recordExport(r: ExportRecord): void`, given by T-B5-08 (B5 lines 177 and 308; T-B5-19 calls it). Build tasks only produce `ExportRecord` data (`build-record.ts`); the Studio callers (T-B20-36 dialogs through T-B20-37b) call `recordExport`. T-B20-01 makes it a required seam row. If the method is missing the seam fails, and the orchestrator adds a one-file task to the project session. B5 line 371 still calls B20's bundle `T-B20-10`; the bundle is T-B20-27 (a follow-up for the B5 file, listed in the Review fixes section) | DOCUMENTED |
| Q3 | IndexedDB store for price checks: COMMUNITY 8.7 names `priceChecks`; the 19-store list (B3-02) and the `parts` store added by T-B11-13 have none; other stores use snake case | COMMUNITY 8.7, T-B3-02, T-B11-13 | Add store `price_checks` (key `queryHash:region`, value `{listings, fetchedAt, searches}`) in one database version bump (T-B20-07). It is deleted by "Delete local data" and never exported | DOCUMENTED |
| Q4 | The roadmap says "Web Serial flashing for supported boards". RS-04, RS-05, RS-17 never ran; iynk produces no flashable binary by itself (COMMUNITY 8.9). A browser flash needs a hex from somewhere | roadmap T-B20-06; COMMUNITY 8.9; PDM 14.1 | Flash only an AVR hex that is already a project asset (role `binary`, imported by T-B9-26 or returned by the compile service T-B9-15). Boards: Uno R3 and Nano (Optiboot, STK500v1). Every other board gets steps only. Spike T-B20-02 must pass first. The real-board result is For Amar (A1, A2) | HYPOTHESIS |
| Q5 | The twin mirrors pins with StandardFirmata on the board. A board running the person's own sketch is not a Firmata board. "Measured traces" therefore come from two sources: Firmata pin readings, and plain serial text from the person's flashed sketch | F-159, R-188, roadmap T-B20-07 | `TraceSource = 'firmata-pins' \| 'serial-text'`. Both feed `compareTraces`. The panel says which source a trace has. No claim that the twin runs the person's code | DOCUMENTED |
| Q6 | The twin code imports the Board lab store (`twin.ts:8`, `sim.ts:9-10`, `HardwareTwinPanel.tsx:14`). B13 does not delete that store: it deletes the robotics and dronelab stores only, and keeps boardlab because the old board pages, the hardware twin and the board AI adapter still use it (B13 finding F4, `B13-labs-robotics-drones.md:28`; section 9 item 5, `:1493`). The old Lab Dock still mounts the Hardware tab and the parts-list tab (`LabDock.test.tsx:138-145`, `e2e/dock.spec.ts:29-32`, `e2e/dock-shared.ts:54`) | VERIFIED imports and tests; DOCUMENTED B13 | T-B20-14 writes `studio-sim.ts` (a `TwinSim` over `SimHost` frames) beside `sim.ts`. `twin.ts` and `HardwareTwinPanel.tsx` stop importing the lab store; the panel takes `{sim, boardId, inputsReady}`. `sim.ts` stays as the lab adapter and `LabDock.tsx` builds the props from the lab store (option a). `sim.ts` is deleted only if the T-B20-01 seam row `boardlab-store` shows the store gone (option b). `LabDock.test.tsx` is an edited test in both cases | HYPOTHESIS |
| Q7 | Substitutes are "reviewable `component.swap` proposals". The proposal types, diff card and one-undo accept live in B15 (AI) | roadmap T-B20-09; T-B15-01, T-B15-04, T-B15-05 | T-B20-23 builds a schema `Proposal` (no `author.model`) and hands it to the B15 accept path. If B15 is cut at an earlier stop, T-B20-01 fails and the orchestrator decides between "build B15 first" and a plain preview dialog | DOCUMENTED |
| Q8 | PDF export of the schematic and wiring diagram (R-186). No PDF library is in `package.json` | R-186, `package.json` | SVG is generated by iynk. PDF is the browser's "Save as PDF" through a print stylesheet that shows one SVG per page (no dependency). Label: PDF is made by the browser, not by iynk | HYPOTHESIS |
| Q9 | F-211 and R-187 say "pick one netlist format"; roadmap T-B20-10 says "Wokwi-style or KiCad-style". Formats and licences are UNKNOWN | F-211, R-187, PDM 12.2 | Spike T-B20-03 decides. Default if it passes: KiCad `.net` export and import, nothing else. Wokwi `diagram.json` import (T-B20-17) is built only if the spike finds the format free to read. SPICE is not built in this phase (no roadmap row; RS-08 oracle files stay in B9) | HYPOTHESIS |
| Q10 | Catalogue prices exist for the drone designs only (`src/content/drones/*.ts` `price` fields). The converted drone projects (B13, B18) are components; the map from old line key to descriptor is not defined in any task file | COMMUNITY 8.7; T-B13-05 (roadmap) | `catalogue-prices.ts` is keyed by descriptor `identity.legacy_ids` plus a `match` on parameters. CM-63 pins the quad5 total at 34600 minor units. T-B20-01 checks that the converted quad5 project has descriptors with legacy ids; if not, T-B20-21 stops and reports | HYPOTHESIS |
| Q11 | Roadmap rows are 15; this plan has 42. The 5-file rule, the split of BOM, guide, prices, flashing and UI, and two spikes need more rows. Ids T-B20-01 to T-B20-42 replace the roadmap ids; the mapping follows this table | roadmap 5.B20 | Effort ESTIMATED 7 / 10 / 15 weeks against the roadmap's 6 / 9 / 13. The orchestrator updates roadmap section 1 when Amar accepts this file | ESTIMATED |
| Q12 | A BOM or guide for a project with a `hazard:mains` part is refused (R-192). Which parts carry the tag is content | R-192, COMMUNITY 8.12 | T-B20-04 ships the tag list and the refusal. Tagging the shipped descriptors is a data edit to B11's files, which this phase must not widen into a 30-file change. T-B20-24 instead lists, in the reality gap, every part with no `hazard:` tag and a `kind` of `actuator`, a category `power`, or a name in a short fixed list (LiPo, charger, motor), under "check by hand". Tagging the shipped parts is For Amar item A5 | HYPOTHESIS |

Roadmap row to task map: roadmap T-B20-01 (BOM) -> T-B20-10, 19; 02 (prices) -> 21, 22, 32; 03 (guide) -> 11, 20, 20b, 33; 04 (BOM and guide UI) -> 31, 33, 37a, 37b; 05 (flash steps) -> 18, 33; 06 (Web Serial flash) -> 12, 25; 07 (twin) -> 13, 14, 35; 08 (reality gap) -> 24, 34; 09 (substitutes) -> 23, 31; 10 (`.ino` bundle, netlist) -> 15, 16, 27; 11 (import) -> 17, 28; 12 (leave with your work) -> 29; 13 (datasheets) -> 09; 14 (no affiliate, copy check) -> 39; 15 (end to end) -> 40.

## 3. Task index

Group = parallel group (section 5). P0 blocks the exit gate; P1 is in the gate but another task can proceed without it; P2 can be cut at the stop. Size is ESTIMATED focused agent time: S under 2 h, M 2 to 5 h, L over 5 h. "Files" counts source files under the 5-file rule of roadmap 2.2 (test files, a deleted file, a six-language set and a data set of one kind count as 0 or 1 as the rule says).

| ID | Task | Pri | Grp | Depends on (this phase) | Files | Size | Covers |
|---|---|---|---|---|---|---|---|
| T-B20-01 | Seam check: every earlier-phase name this phase uses (test only) | P0 | G0 | none | 0 | S | all |
| T-B20-02 | Spike: can a browser flash an Uno or Nano from a hex over Web Serial (STK500v1)? | P1 | G0 | none | 0 | M | F-159 flashing, Q4 |
| T-B20-03 | Spike: which open netlist format, and may Wokwi `diagram.json` be read? | P1 | G0 | none | 0 | M | F-211, R-187 |
| T-B20-04 | Shared types (incl. `BomResult`), CSV writer with injection guard, hazard tags and mains refusal | P0 | G1 | 01 | 3 | S | R-181, R-182, R-192, CM-69, CM-70 |
| T-B20-05 | Strings: namespace `buildit` in six languages | P0 | G1 | 01 | 2 | M | all UI |
| T-B20-06 | Search client: a spent quota is its own code | P1 | G1 | 01 | 2 | S | R-184, CM-65 |
| T-B20-07 | IndexedDB store `price_checks` | P1 | G1 | 01 | 4 | M | R-184, CM-64 |
| T-B20-08 | Build inputs and bench measurements stored as a project asset | P0 | G2 | 01, 04 | 1 | M | F-163, R-182, R-189 |
| T-B20-09 | Datasheet links, staleness, query for a missing one | P1 | G2 | 01, 04 | 1 | S | F-160 |
| T-B20-11 | Wiring guide core: ordered steps from the netlist | P0 | G2 | 01, 04, 05 | 2 | L | R-185, CM-61 |
| T-B20-12 | STK500v1 protocol client and a fake Optiboot | P1 | G2 | 01, 02 | 2 | M | Q4 |
| T-B20-13 | Trace types, capture and compare (pure) | P1 | G2 | 01, 04 | 2 | M | R-188 |
| T-B20-14 | Twin re-based on Studio sim frames; lab path kept through an adapter | P1 | G2 | 01 | 4 | M | F-159, R-188 |
| T-B20-15 | Netlist text and JSON, and SVG export of schematic and wiring diagram | P1 | G2 | 01, 04 | 2 | M | R-181, R-186, F-210 |
| T-B20-16 | KiCad `.net` netlist export and import with loss report | P2 | G2 | 01, 03, 04 | 1 | M | F-211, R-187 |
| T-B20-17 | Wokwi `diagram.json` import (built only if T-B20-03 says yes) | P2 | G2 | 01, 03, 04 | 1 | M | F-211, F-091 |
| T-B20-18 | Flashing recipes (data) and flash steps | P0 | G2 | 01, 02, 04 | 3 | M | R-185, F-161 |
| T-B20-10 | `bomKey` and BOM rows from the document | P0 | G3 | 01, 04, 05, 09 | 3 | L | R-182, CM-60, CM-62 |
| T-B20-20 | Assembly checklist, bench test steps, guide text formats | P0 | G3 | 01, 04, 05, 11 | 3 | M | R-185, F-161 |
| T-B20-25 | Web Serial flashing for Uno and Nano | P1 | G3 | 01, 02, 12 | 3 | L | Q4 |
| T-B20-35 | Twin panel: simulated and measured side by side, record as measurement | P1 | G3 | 01, 05, 08, 13, 14 | 2 | M | R-188 |
| T-B20-19 | BOM formats (CSV, Markdown, JSON) and the export record | P0 | G4 | 01, 04, 05, 10 | 2 | M | R-182, CM-69, CM-70 |
| T-B20-20b | Package text renderers: flash, checklist, tests, README | P0 | G4 | 01, 04, 05, 18, 20 | 1 | S | R-181, R-185, J-12 |
| T-B20-21 | Price model: kinds, totals, budget, catalogue prices | P1 | G4 | 01, 10 | 2 | M | R-183, CM-63 |
| T-B20-23 | Substitutes engine and the swap proposal | P1 | G4 | 01, 10 | 2 | L | R-190, CM-67 |
| T-B20-24 | Reality gap model: five sections, bench measurements | P0 | G4 | 01, 04, 05, 08, 09, 10 | 2 | M | R-189, CM-68, CM-71 |
| T-B20-26 | Drone and robot extras for the build package | P1 | G4 | 01, 04, 05, 10 | 1 | M | R-192, DA-19 |
| T-B20-33 | Build guide and flash panels | P0 | G4 | 01, 05, 18, 20 (25 if built) | 2 | M | R-185 |
| T-B20-22 | Price check logic: cost first, cache, matching, errors | P1 | G5 | 01, 06, 07, 19, 21 | 1 | M | R-184, CM-64, CM-65 |
| T-B20-27 | Build package: one deterministic zip | P0 | G5 | 01, 05, 15, 18, 19, 20, 20b, 24, 26 (16 only through an injected function) | 1 | L | R-181, J-12 |
| T-B20-31 | BOM panel and substitutes dialog | P0 | G5 | 01, 05, 19, 23 | 2 | M | R-182, R-190 |
| T-B20-34 | Reality gap page and measurements panel | P0 | G5 | 01, 05, 08, 24 | 2 | M | R-189, CM-68 |
| T-B20-28 | Import hub: `.iynk`, `.iynkz`, `.ino`, package, `.net` with loss reports | P1 | G6 | 01, 27 (16 and 17 only through injected readers) | 1 | M | R-181, F-091 |
| T-B20-29 | Leave with your work: whole library in open formats | P2 | G6 | 01, 27 | 2 | M | roadmap T-B20-12 |
| T-B20-30 | Export worker and the 500-part timing | P2 | G6 | 01, 27 | 3 | M | CM-72 |
| T-B20-32 | Prices panel and the check dialog | P1 | G6 | 01, 05, 21, 22 | 2 | M | R-183, R-184 |
| T-B20-36 | Export and import dialogs, project menu entries | P1 | G7 | 01, 05, 27, 28 (29, 30 if built) | 3 | M | R-181, R-186 |
| T-B20-37a | Build it tab shell: BOM, Guide, Flash and Reality gap, read-only data | P0 | G7 | 01, 05, 31, 33, 34 | 3 | M | R-185 |
| T-B20-39 | No-affiliate test and the copy check for generated text | P0 | G7 | 01, 19, 20, 20b, 24, 27, 32 | 1 | S | CM-66, CM-68 |
| T-B20-37b | Build it tab actions: inputs writes, substitutes accept, price check, Hardware, Nearby, Videos, dialogs | P0 | G8 | 01, 08, 14, 22, 23, 32, 35, 36, 37a | 5 | L | R-185, R-191 |
| T-B20-38 | Old parts-list panel: retire it if the lab pages are gone, else share the price code; remove the old Nearby and Video props | P1 | G9 | 01, 32, 37b | 5 | M | no ghosts |
| T-B20-41 | Documentation: BUILD_IT.md and the bench record sheet | P1 | G9 | 37b | 3 | S | roadmap Documentation |
| T-B20-40 | End to end: `e2e/build-it.spec.ts` | P0 | G10 | 37b, 38, 39 | 0 | L | CM-60 to CM-68 |
| T-B20-42 | Exit gate: run everything, record the numbers | P0 | G11 | all | 0 | M | exit |

Counts: 44 tasks (T-B20-01 to T-B20-42, plus 20b, and 37 split into 37a and 37b); 2 spikes (02, 03), 1 seam check, 1 conditional build (17), 2 gate tasks (40, 42). Source files created or edited: about 80.

Cancelled or unbuilt tasks. A task that depends on one of these never imports its file; it takes the function as an injected optional value, so everything else compiles.

| Task not built | When | What changes elsewhere |
|---|---|---|
| T-B20-12 and T-B20-25 | Spike T-B20-02 does not say `Verdict: PASS-model` | 18 writes no `webSerial` field and no `webSerialBoard`; 33 builds `FlashPanel` without `onFlash` and shows steps only; 37a passes no `onFlash`; 35 loses only the serial-text trace source; the seam row for `src/lib/hw/flash.ts` is `required: false` |
| T-B20-16 | Spike verdict A is not PASS-kicad, or Amar vetoes (A4) | 27 gets no `kicadNet` function and writes no `netlist.net`; 28 gets no KiCad reader; 36 does not offer `netlist-kicad`; 15 (JSON and text netlist) stays |
| T-B20-17 | Spike verdict B is not PASS-wokwi | 28 gets no Wokwi reader and `detectFormat` never returns `wokwi`; 36 does not name the format |
| T-B20-29, T-B20-30 | P2 cut at the stop | 36 omits the `library` kind; 37b calls the pure functions on the main thread (`host: null`) |

## 4. Rules every task obeys

| # | Rule | Source |
|---|---|---|
| 1 | One commit per task, message `B20 T-B20-nn: <what>` (spikes `B20 S-T-B20-nn: <what>`), authored as Amar Kushwaha, no `Co-Authored-By` line, no "Generated with" line, never pushed, branch `build/v1`. Reverting the commit restores the tree | roadmap 2.1 |
| 2 | Start by running `npx vitest run src/export/seam.test.ts` (after T-B20-01; every task except 02 and 03 lists T-B20-01 as a dependency). Every outside name a task uses is listed in that test. If it fails, stop and report the missing name. Do not invent the earlier phase's file | Section 1 |
| 3 | Everything new under `src/export/**` is portable: no DOM, no Node import, no `Date.now`, no `performance.now`, no `Math.random`, no `fetch`. Time comes in as an argument (`now: string` ISO), randomness as a seed. `npx tsc -p tsconfig.portable.json` (`PORT`) and the import matrix (`ARCH`) pass | roadmap 2.5, ADR-0014 |
| 4 | Text that ends up in a file or a panel is never built from a literal in `src/export`. A function takes `tr: Tr` (`type Tr = (key: BuilditKey, vars?: Record<string, string \| number>) => string`, defined in T-B20-04) and keys are in `src/i18n/messages/<lang>/buildit.json`, owned by T-B20-05. A task that needs a key the list lacks stops and reports; it does not edit that file | CLAUDE.md one source of truth |
| 5 | Never the word "validated" in copy, keys or generated files. The word list is enforced by T-B20-39 | CM-68, D-007 |
| 6 | No network request from any export function. A panel that calls search does so only on a button press, with the person's own key, after showing the cost | R-183, R-184, F-194 |
| 7 | Every list a person reads is an ordered or unordered list element, every control has a label, every table has a caption or an accessible name. Steps are keyboard operable | roadmap B20 Accessibility |
| 8 | Same project and same `now` give the same bytes (CSV, Markdown, JSON, zip entry order and timestamps). Zip entry dates are set from `now`, not the clock | PDM 6, COMMUNITY 8.13 |
| 9 | No secret enters an export: files are scanned with the T-B3-08 secret-shape scan before the package is returned; `keys` rows are never read | PDM 13 |
| 10 | Keyless: no `.env.local`, no port 3000 or 43117, no production service. Playwright runs with the `KL` prefix | roadmap 2.1 |
| 11 | Panels load lazily (dynamic import, `ssr: false`, same-height skeleton) so first-load JS does not grow. Guide: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` | BUD-05 |
| 12 | A deleted file is checked first: `grep -rn "<name>" src e2e scripts` shows no importer. Step 0 of CLAUDE.md: no ghosts | CLAUDE.md |

Shorthand used in the Verify rows:

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `PORT` | `npx tsc -p tsconfig.portable.json` (T-B2-01) |
| `ARCH` | `npx vitest run src/architecture.test.ts` |
| `I18N` | `npx vitest run src/i18n/messages.test.ts` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (roadmap 2.3) |
| `E <label> <specs>` | `KL NEXT_DIST_DIR=.next-<label> npx playwright test <specs>` (use `.next-b20` as the label) |
| `SEAM` | `npx vitest run src/export/seam.test.ts` |
| `BUILD <label>` | `KL NEXT_DIST_DIR=.next-<label> npm run build` (roadmap 2.3) |
| `SRV` | Before T-B6-01b: `cd server/realtime && npm test` (39 tests, VERIFIED, `runs/COMMANDS.md` row 9). From T-B6-01b: `npm run server:test` (roadmap 2.3) |
| `LOAD` | Three full runs of `npx vitest run` while 14 busy-loop processes run (`for i in $(seq 14); do node -e "const e=Date.now()+900000;while(Date.now()<e);" & done`, killed afterwards) (roadmap line 76) |
| `COPY` | `git add -N <new files>` then `node scripts/copy-check.mjs`. The check scans only files that `git ls-files` returns (T-B1-20, `B1-foundation-keys-oss-honest.md:898`), so an untracked new file is skipped and the check passes with nothing checked. Run it after `git add -N` or after the commit |

## 5. Parallel groups and file ownership

Groups run in order. Tasks in one group touch disjoint files and can be built by separate agents at once. A task starts only when every task it depends on is committed.

| Group | Tasks | What it makes | Why these can run together |
|---|---|---|---|
| G0 | 01, 02, 03 | Seam test, two spike reports | A test file and two report folders. Every later task except the spikes depends on 01, so 01 sits in a group of its own with the two spikes that depend on nothing |
| G1 | 04, 05, 06, 07 | Shared types (with `BomResult`), strings, search client code, price store | Four separate areas: `src/export` new files, i18n, search client, `src/local` |
| G2 | 08, 09, 11, 12, 13, 14, 15, 16, 17, 18 | Build inputs, datasheets, guide core, STK500, trace compare, twin re-base, netlist and SVG out, KiCad, Wokwi, recipes | `src/export` new files with distinct names; `src/lib/hw` new files; 14 alone edits `twin.ts`, the twin panel and `LabDock.tsx` |
| G3 | 10, 20, 25, 35 | BOM rows, checklist and bench steps, Web Serial flash, twin panel | 10 and 20 are distinct `src/export` files; 25 edits `serial.ts`, `session.ts`; 35 edits the twin panel (14 is done) |
| G4 | 19, 20b, 21, 23, 24, 26, 33 | BOM formats, package text renderers, price model, substitutes, reality model, domain extras, guide and flash panels | All new files; no shared edit |
| G5 | 22, 27, 31, 34 | Price check logic, build package, BOM panel, reality panel | New files only |
| G6 | 28, 29, 30, 32 | Import hub, library export, export worker, prices panel | 29 edits `src/local/export-all.ts`; 30 adds `src/local` files with different names |
| G7 | 36, 37a, 39 | Export and import dialogs, Build it tab shell, no-affiliate and copy checks | Different folders and files: `ProjectMenu`; `Workspace`, `commands`, `BuildTab`; one test and the copy script |
| G8 | 37b | Build it tab actions | Edits `BuildTab`, `commands`, Nearby and Video help |
| G9 | 38, 41 | Old panel and old props; docs | Different folders |
| G10 | 40 | End to end | One spec |
| G11 | 42 | Exit run | No files |

File ownership. N = new, E = edited, D = deleted. A file appears once per group; later groups edit files earlier groups made.

| File | Task | Later tasks that touch it |
|---|---|---|
| `src/export/seam.test.ts` N | 01 | none |
| `08_RESEARCH_SPIKES/RS-B20-1-stk500/REPORT.md` N | 02 | none |
| `08_RESEARCH_SPIKES/RS-B20-2-formats/REPORT.md` N | 03 | none |
| `src/export/build-types.ts` (incl. `BomResult`, `BomWarning`, `BomWarningCode`, `CompanionNote`), `csv.ts`, `hazards.ts` N | 04 | none |
| `src/i18n/messages/{de,en,es,fr,hi,zh}/buildit.json` N, `src/i18n/namespaces.ts` E | 05 | none |
| `src/lib/search/client.ts` E, `src/i18n/messages/*/search.json` E | 06 | none |
| `src/local/db.ts` E, `stores.ts` E, `wipe.ts` E, `price-checks.ts` N | 07 | none |
| `src/export/build-inputs.ts` N | 08 | none |
| `src/export/datasheets.ts` N | 09 | none |
| `src/export/bom-key.ts`, `bom.ts`, `bom-lines.ts` N | 10 | none |
| `src/export/guide.ts`, `pin-labels.ts` N | 11 | none |
| `src/lib/hw/stk500.ts`, `fake-optiboot.ts` N | 12 | none |
| `src/lib/hw/compare.ts`, `capture.ts` N | 13 | none |
| `src/lib/hw/studio-sim.ts` N, `src/lib/hw/twin.ts` E (one import line), `src/components/hw/HardwareTwinPanel.tsx` E, `src/components/dock/LabDock.tsx` E (thin adapter that builds the panel props). Tests edited: `HardwareTwinPanel.test.tsx`, `src/components/dock/LabDock.test.tsx` (and `twin.test.ts` only if it mocks the old import path). `sim.ts` is not edited; it is deleted only if seam row `boardlab-store` says the store is gone | 14 | `HardwareTwinPanel.tsx`: 35 (later group); `LabDock.tsx`: 38 |
| `src/export/netlist-out.ts`, `svg-out.ts` N | 15 | none |
| `src/export/kicad-net.ts` N | 16 | none |
| `src/export/wokwi-in.ts` N (conditional) | 17 | none |
| `src/export/flash-steps.ts`, `recipes.ts` N, `src/export/data/recipes.json` N | 18 | none |
| `src/export/checklist.ts`, `bench-tests.ts`, `guide-format.ts` N | 20 | none |
| `src/lib/hw/flash.ts` N, `serial.ts` E, `session.ts` E | 25 | none |
| `src/components/hw/TraceCompare.tsx` N, `HardwareTwinPanel.tsx` E | 35 | none |
| `src/export/bom-format.ts`, `build-record.ts` N | 19 | none |
| `src/export/package-text.ts` N | 20b | none |
| `src/export/prices.ts`, `catalogue-prices.ts` N | 21 | none |
| `src/export/substitutes.ts`, `substitute-proposal.ts` N | 23 | none |
| `src/export/reality.ts`, `measurements.ts` N | 24 | none |
| `src/export/domain-extras.ts` N | 26 | none |
| `src/components/studio/GuidePanel.tsx`, `FlashPanel.tsx` N | 33 | none |
| `src/export/price-check.ts` N | 22 | none |
| `src/export/bundle.ts` N (`ino.ts` is not edited: the folder name is `exportIno(...).folder`) | 27 | none |
| `src/components/studio/BomPanel.tsx`, `SubstitutesDialog.tsx` N | 31 | none |
| `src/components/studio/RealityGap.tsx`, `MeasurementsPanel.tsx` N | 34 | none |
| `src/export/import.ts` N | 28 | none |
| `src/export/library.ts` N, `src/local/export-all.ts` E | 29 | none |
| `src/local/export.worker.ts`, `export-host.ts`, `export-protocol.ts` N | 30 | none |
| `src/components/studio/PricesPanel.tsx`, `PriceCheckDialog.tsx` N | 32 | none |
| `src/components/studio/ExportDialog.tsx`, `ImportDialog.tsx` N, `src/components/studio/ProjectMenu.tsx` E | 36 | none |
| `src/export/no-affiliate.test.ts` N (test), `scripts/copy-check.mjs` E | 39 | none |
| `src/components/studio/BuildTab.tsx` N, `src/components/studio/Workspace.tsx` E, `src/studio/commands.ts` E | 37a | `BuildTab.tsx`, `commands.ts`: 37b (later group) |
| `src/components/studio/BuildTab.tsx` E, `src/components/studio/build-actions.ts` N, `src/studio/commands.ts` E, `src/components/search/NearbyPanel.tsx` E (additive: new export `NearbyPanelFor`), `src/components/search/VideoHelp.tsx` E (additive: new export `VideoHelpFor`) | 37b | `NearbyPanel.tsx`, `VideoHelp.tsx`: 38 (later group) |
| `src/components/dock/LabDock.tsx` E, `src/components/search/NearbyPanel.tsx` E (remove the old `{lab}` export), `src/components/search/VideoHelp.tsx` E (same), `src/components/search/index.ts` E. Then either (A) `RealBuildPanel.tsx` D and `RealBuildPanel.test.tsx` D (deletions do not count against the five-file limit), or (B) `RealBuildPanel.tsx` E and its test E. Edited tests: `NearbyPanel`/`VideoHelp` tests, `src/components/dock/LabDock.test.tsx` | 38 | none |
| `docs/BUILD_IT.md` N, `docs/BENCH_RECORD.md` N, `docs/STUDIO.md` E | 41 | 42 appends an exit record to `docs/BUILD_IT.md` |
| `e2e/build-it.spec.ts`, `e2e/build-it-helpers.ts` (request recorder, init-script installer), `e2e/stored-zip.ts` (inline stored-zip reader, no imports), `e2e/fake-optiboot-js.ts` (the JS source string of the fake, no imports) N; tests `src/lib/hw/optiboot-browser.test.ts`, `src/export/stored-zip.test.ts` N | 40 | none |

`src/components/dock/LabDock.tsx` is edited by 14 (G2) and 38 (G9); `HardwareTwinPanel.tsx` by 14 (G2) and 35 (G3); `BuildTab.tsx` and `commands.ts` by 37a (G7) and 37b (G8); `NearbyPanel.tsx` and `VideoHelp.tsx` by 37b (G8) and 38 (G9). Different groups, so no overlap. `src/export/ino.ts` is owned by T-B5-10 and is not edited here.

## 6. Task packages

Fields follow BRIEF section 27: identity, intent, implementation, verification, delivery. "Seam" means a name that T-B20-01 checks. Every acceptance line is Given / When / Then.

---

### T-B20-01. Seam check: every earlier-phase name this phase uses

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-01, export (all), B20 |
| | Priority, status, dependencies | P0, not started, none |
| Intent | Problem | Eleven earlier phases are planned and none is built. B12, B13, B17, B18 and B19 have no task file. If this phase guesses a path, one wrong guess breaks many tasks |
| | Target user | The agents building B20, and the orchestrator |
| | User story | As the orchestrator I want one red test that names every missing outside file or export before any B20 code is written |
| | Expected behaviour | `src/export/seam.test.ts` reads source files as text (`node:fs` is allowed in a test), and for each row of a table checks that the path exists and the named export is declared (`export (function\|const\|class\|type\|interface) NAME`). It prints a table (`console.info`) of found and missing names. It fails when any required name is missing |
| | Success metric | Every row below is found, or the failing names are the only output the orchestrator needs to re-plan |
| Implementation | Existing files | None edited. Reads the files named by earlier task files: `B2` T-B2-02/03/11/13 (`src/core`, `src/project/netlist.ts`, `holes.ts`, `src/parts/registry.ts`, `descriptor.ts`, `pins.ts`), `B3` T-B3-01/02/05/08/22 (`src/protocol`, `src/local/stores.ts`, `db.ts`, `src/export/zip.ts`, `iynk.ts`, `iynkz.ts`, `src/local/files.ts`, `export-all.ts`, `project-host.ts`), `B5` T-B5-05/08/10/19 (`ProjectSession.recordExport` of T-B5-08, `src/export/ino.ts` with `InoExport.folder`, `loss.ts`, schematic scene, `ProjectMenu`, `LossReport`), `B8/B9` (fidelity registry reader, `src/export/hex.ts`, `CompileService` of T-B9-15, `SimHost` frame type of T-B3-13), `B10` (`src/export/diagnosis.ts`), `B11` (`src/local/parts-store.ts`, `src/parts/data/`), `B13` (converted quad5 project and its descriptors' `legacy_ids`), `B14` (`src/lib/search/client.ts` `fetchOffers`, `withSearchAuth`), `B15` (`src/ai/proposals/types.ts` `Proposal`, accept path of T-B15-04, `DiffView`), `B17` (`src/export/urdf-out.ts`), `B19` (`src/export/drone-params.ts`, `wiring-sheet.ts`). Also today's files: `src/lib/hw/twin.ts:8`, `sim.ts:9-10`, `HardwareTwinPanel.tsx:14`, `LabDock.tsx:7,9,71,86` |
| | New files | `src/export/seam.test.ts` (test only; 0 source files) |
| | Signatures | `interface Seam { id: string; from: string /* task or phase */; path: string; names: readonly string[]; required: boolean; ifMissing: string }`. `const SEAMS: readonly Seam[]`. `function found(path: string, name: string): boolean`. Rows with `required: false` (`LabDock.tsx` and its mount, `src/content/drones/quad5.ts` prices) print `absent` and do not fail |
| | Data model | None |
| | Algorithm | The agent first reads each named task file for the exact export names (this plan gives the file, not always the name, because the task files give names in prose). Those names go into `SEAMS`. Special rows: (1) Q2, required: `ProjectSession.recordExport(r: ExportRecord): void` is declared (T-B5-08, `B5-studio-all-boards.md:177` and `:308`; file read from that task); (2) Q6 `boardlab-store`: print whether any file outside `src/lib/boardlab/` still imports `@/lib/boardlab` (`grep -rln "lib/boardlab" src`). B13 finding F4 says it stays, so the expected value is `present`; T-B20-14 and T-B20-38 read it; (3) Q6 `lab-dock`, `required: false`: `src/components/dock/LabDock.tsx` exists and is mounted by a page under `src/app` or `src/components` (`grep -rn "LabDock" src/app src/components`); T-B20-14 and T-B20-38 read it; (4) Q7: B15 accept path; (5) Q10 `quad5-project`, required: the converted quad5 project (project id `prj_drone-quad5`, `B13-labs-robotics-drones.md:77`) exists, its component descriptors carry `identity.legacy_ids`, and the row records the name of the loader that returns it (used by T-B20-21 and T-B20-40); (6) Q10 `drone-content-prices`, `required: false`: `src/content/drones/quad5.ts` still has the `price` fields at lines 93-116 (B13 or B18 may restructure drone content; B18 line 136 keeps those tests running); (7) `Permissions-Policy` contains `serial=(self)` in `next.config.ts` |
| | Validation, errors | A missing required row is one failure line: `T-B20-01 seam: <id> missing <name> in <path> (from <task>). If missing: <ifMissing>` |
| | Edge cases | A name exported through a barrel file: the test follows `export * from` and `export { X } from` one level |
| | Permissions, performance, migration | None; under 2 s |
| Verification | Unit tests | The seam test itself. Plus a self-test with a temp directory that proves `found()` handles `export const`, `export function`, `export type`, a re-export, and a name that is only in a comment (not found) |
| | Integration, Playwright, fixtures | None |
| | Acceptance | Given the tree after B19, When `SEAM` runs, Then it prints the table and exits 0. Given a renamed export, When it runs, Then the failing line names the seam id and the task that owns it |
| | Observability, release blockers | The printed table goes into the commit message body. A required row marked `found` by a comment match |
| Delivery | Definition of done | Test committed, run once, table in the commit body |
| | Verify commands | `TL`; `V src/export/seam.test.ts` |
| | Docs, rollback | None; revert the test |
| | Later tasks need | Every task runs `SEAM` first; T-B20-14 and T-B20-38 read the Q6 rows; T-B20-23 reads the Q7 row; T-B20-21 and T-B20-40 read the Q10 rows; T-B20-36 and T-B20-37b read the Q2 row |

---

### T-B20-02. Spike: can a browser flash an Uno or Nano from a hex over Web Serial?

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-02, spike (hardware link), B20 |
| | Priority, status, dependencies | P1, not started, none |
| Intent | Falsifiable question | Can code in `src/lib/hw` open a `SerialPortLike` at 115200 baud, pulse DTR to reset, speak the STK500v1 subset Optiboot understands, write a 1.5 KB and a 30 KB hex image page by page, read it back byte-equal, survive one dropped reply, and refuse a wrong device signature, all against a software model of Optiboot, with 0 bytes written outside the hex's `usedRanges`? |
| | Exit condition | PASS-model when all six hold on the model: (a) sync within 5 attempts; (b) signature read equals `1E 95 0F` (ATmega328P, EXTERNAL) before any write; (c) every page of the image is written with 128-byte pages and the model's flash equals the image on read-back; (d) one reply dropped in 30 pages is retried and the run still ends equal; (e) a model that answers signature `1E 95 14` stops with `wrong-device` and the model's flash is untouched; (f) an image larger than 32,256 bytes (32 KB minus the 512-byte Optiboot, EXTERNAL) is refused before sync. PASS-model changes nothing about the real board claim: whether a real Uno accepts it is For Amar A2. FAIL on any clause: T-B20-12 and T-B20-25 are cancelled, flashing stays "steps only" (T-B20-18, T-B20-33), and the report says which clause failed |
| | Why it needs research | The protocol bytes, the 128-byte page size, the 512-byte bootloader, the DTR reset timing and the Nano old-bootloader 57600 baud are EXTERNAL knowledge from memory. The spike reads the primary sources (Optiboot source and the AVR061 STK500 note, or the arduino-cli/avrdude protocol notes) and quotes each constant with a URL and a retrieval date. A constant without a quote is UNKNOWN and the report says so |
| Implementation | Existing files | `src/lib/hw/serial.ts:7-15` (`SerialPortLike`: no `setSignals` today), `:61-110` (`SerialTransport.open/close`), `src/lib/hw/testing.ts:20-30` (`FakeSerialPort`, `onHostWrite`), `src/lib/hw/usb.ts:26` (vendor ids) |
| | New files | `08_RESEARCH_SPIKES/RS-B20-1-stk500/REPORT.md` (the only repo file). Prototype code lives in the scratch folder `~/iynk-master-plan-scratch/build/B20/S02/` (outside the repo, untracked) and may import the repo's `FakeSerialPort` by relative path |
| | Algorithm | Write the model in the scratch folder: a state machine with `GET_SYNC 0x30` `EOP 0x20` -> `0x14 0x10`; `READ_SIGN 0x75`; `LOAD_ADDRESS 0x55` (word address, little endian); `PROG_PAGE 0x64` (length high, low, memtype `F`, data, EOP); `READ_PAGE 0x74`; `LEAVE_PROGMODE 0x51`. Run six cases (a to f). Time each in simulated baud time (bytes times 10 bits over 115200) |
| | Validation, errors | The report lists each constant, its source URL and retrieval date, and each exit clause with PASS or FAIL and the numbers |
| Verification | Tests | The prototype's run output is pasted into the report. No repo test |
| | Acceptance | Given the report, When read cold, Then it says PASS-model or FAIL with the clause, and says in one sentence that a real board was not tested |
| Delivery | Definition of done | Report committed with a verdict line `Verdict: PASS-model` or `Verdict: FAIL (clause x)` |
| | Verify commands | `ls 08_RESEARCH_SPIKES/RS-B20-1-stk500/REPORT.md`; `TL` unchanged |
| | Docs, rollback | None; delete the report |
| | Later tasks need | T-B20-12 reads the verdict and the constants; T-B20-25 and T-B20-33 depend on it |

---

### T-B20-03. Spike: which open netlist format, and may Wokwi `diagram.json` be read?

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-03, spike (interchange formats), B20 |
| | Priority, status, dependencies | P1, not started, none |
| Intent | Falsifiable question A | Can iynk write a KiCad legacy netlist (`.net`, S-expression with `components` and `nets`) from `netlist()` and read it back so that `pinSets(netlist)` of the original and of the re-imported project are equal as sets of sets, using only KiCad's public description of the file, with no KiCad source copied or linked? |
| | Exit condition A | PASS-kicad when: (a) a public description of the grammar exists and is quoted with URL and date; (b) a hand-written writer and reader, built in scratch from that description, round-trip 3 fixtures (the Uno blink example, the ESP32 monitor example, the line-follower example in `04_ARCHITECTURE/schemas/examples/`) with equal pin sets; (c) the reader refuses a 5 MB file and a nesting depth over 64 with a named error; (d) the report states the licence position as EXTERNAL and not legal advice. FAIL: F-211 ships only the iynk netlist JSON (T-B20-15) and T-B20-16 is cancelled |
| | Falsifiable question B | Does Wokwi's public documentation describe `diagram.json` (parts with `type`, `id`, `attrs`, and `connections` as `[from, to, color, route]`) and do its published terms allow a tool to read a diagram file the user supplies? |
| | Exit condition B | PASS-wokwi only if both are quoted from a page the agent fetched, with URL and retrieval date, and no clause forbids reading user-supplied files. UNKNOWN or FAIL: T-B20-17 is not built and the Import dialog does not offer the format. The agent must not rely on memory: no fetched quote means UNKNOWN |
| | Why it needs research | PDM 12.2 lists both as UNKNOWN (format, licence, test set). F-211 says "where the format and its licence allow" |
| Implementation | Existing files | `PROJECT_DATA_MODEL.md` 12.2 (lines 1262-1290); T-B2-13 `pinSets` |
| | New files | `08_RESEARCH_SPIKES/RS-B20-2-formats/REPORT.md`; scratch code in `~/iynk-master-plan-scratch/build/B20/S03/` |
| | Algorithm | A: fetch the KiCad documentation page that describes the netlist; write fixtures from the grammar, never from a KiCad-produced file; compare sets. B: fetch Wokwi docs and terms; copy the relevant sentences into the report |
| Verification | Acceptance | Given the report, When read, Then it has two verdict lines, one per question, each with the quotes that support it, and states what was not checked (opening the file in KiCad, which needs the program, is not done) |
| Delivery | Definition of done | Report committed with `Verdict A:` and `Verdict B:` lines |
| | Verify commands | `ls 08_RESEARCH_SPIKES/RS-B20-2-formats/REPORT.md` |
| | Docs, rollback | None; delete the report |
| | Later tasks need | T-B20-16 (verdict A and the grammar notes), T-B20-17 (verdict B), T-B20-28 (which formats the importer offers) |

---

### T-B20-04. Shared types, CSV writer with injection guard, hazard tags and mains refusal

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-04, export core types, B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01 (uses B2 `src/core` and the generated project types) |
| Intent | Problem | Nine tasks need the same row, step, measurement, BOM result and money types. A CSV cell starting with `=` runs as a formula in a spreadsheet. A mains project must be refused |
| | Target user | The tasks that follow, and Amar opening a CSV in a spreadsheet |
| | User story | As a builder I open `bom.csv` and nothing in it executes; as a person who tries a mains project I am told iynk does not write mains build instructions |
| | Expected behaviour | Types as below. `csvCell` quotes per RFC 4180 and prefixes `'` to a text cell that starts with `=`, `+`, `-` or `@` (and with tab or carriage return). `hazardsOf` maps `hazard:*` tags to a closed list. `mainsRefusal` returns the refused parts |
| | Success metric | CM-70 (a cell `=1+1` leaves as `'=1+1`); CM-69 refusal part (a `hazard:mains` part gives a refusal naming it); the same input gives the same bytes twice |
| Implementation | Existing files | None edited. Reads the generated project and descriptor types (T-B2-04), `src/core` `Result`, `Diagnostic` (T-B2-02). Schema facts: `identity.tags` max 32 items of 40 chars (`component.schema.json` `$defs.identity.properties.tags`), `ExportRecord`, `LossItem` (`project.schema.json`) |
| | New files | `src/export/build-types.ts`, `src/export/csv.ts`, `src/export/hazards.ts`; tests beside each |
| | Signatures | `build-types.ts`: `export type Tr = (key: string, vars?: Record<string, string \| number>) => string;` `export type PriceKind = 'user' \| 'catalogue' \| 'live';` `export interface BomPrice { amountMinor: number; pack?: number; currency: string; kind: PriceKind; asOf: string; source: string }` (`amountMinor` is the price of `pack` units, default 1; a line costs `ceil(quantity / pack) * amountMinor`, the rule of `src/lib/search/cost.ts:8-12`) `export type Hazard = 'lipo' \| 'motor' \| 'charger' \| 'high-current' \| 'heat' \| 'mains' \| 'laser';` `export type FidelityTier = 'T0' \| 'T1' \| 'T2' \| 'T3' \| 'none';` `export interface DatasheetLink { title: string; url: string; retrieved?: string; revision?: string; kind: 'datasheet' \| 'application-note' \| 'product-page' \| 'reseller-guide' }` `export interface BomRow { line: number; bomKey: string; refdes: string[]; partRef?: { ref: string; version: string }; description: string; value?: string; unit?: string; package?: string; manufacturer: string; model: string; mpn: string; generic: boolean; specification: string[]; quantity: number; purchasable: boolean; datasheet?: DatasheetLink; lifecycle: 'active' \| 'nrnd' \| 'obsolete' \| 'unknown'; fidelity: { tier: FidelityTier; status: 'modelled' \| 'partly-modelled' \| 'not-modelled-yet' }; hazards: Hazard[]; price?: BomPrice; alternatives: string[]; source: 'descriptor' \| 'user' \| 'derived'; notes?: string }` `export interface LineInput { chosenPart?: { ref: string; version: string }; priceMinor?: number; priceNote?: string; have?: number; skip?: boolean }` `export interface BenchMeasurement { id: string; at: string; by: string; target: { refdes?: string; net?: string; pin?: string }; quantity: 'voltage' \| 'current' \| 'resistance' \| 'frequency' \| 'duty' \| 'time' \| 'temperature' \| 'other'; value: number; unit: string; instrument?: string; conditions?: string; simulated?: { value: number; stateHash: string; at: string }; note?: string; photoAsset?: string }` `export interface BuildInputs { schemaVersion: '1.1'; currency: string; budgetMinor?: number; spares: { smallPassivesPercent: number }; region?: string; lines: Record<string, LineInput>; measurements: BenchMeasurement[]; notes?: string }` `export type StepPhase = 'prepare' \| 'mount' \| 'ground' \| 'signal' \| 'power' \| 'program' \| 'check';` `export interface PinLabel { refdes: string; designator: string; connector?: string; hole?: string }` `export interface BuildStep { n: number; phase: StepPhase; text: string; from?: PinLabel; to?: PinLabel; wire?: { color?: string; kind: 'jumper' \| 'solder' \| 'screw' \| 'plug' }; net?: string; expect?: string; hazards?: Hazard[]; source: 'netlist' \| 'descriptor' \| 'note' \| 'user' }` `export interface CompanionNote { forRefdes: string; text: string }` `export type BomWarningCode = 'no-mpn' \| 'lifecycle' \| 'no-datasheet' \| 'not-modelled' \| 'stale-datasheet' \| 'unknown-part';` `export interface BomWarning { code: BomWarningCode; bomKey: string; message: string }` `export interface BomResult { rows: BomRow[]; notPurchasable: BomRow[]; warnings: BomWarning[]; companions: CompanionNote[]; check: { ok: boolean; expected: number; got: number }; hazards: Hazard[] }` (these four are defined here and not in `bom.ts` or `bom-lines.ts`, so T-B20-11 and T-B20-20 import them without depending on T-B20-10) (COMMUNITY 8.2, 8.3, 8.8, 8.12; `phase` order is the guide order). `csv.ts`: `export type CsvColumn<R> = { key: string; kind: 'text' \| 'int' \| 'bool'; get(r: R): string \| number \| boolean \| undefined };` `export function csvCell(value: string): string;` `export function toCsv<R>(columns: readonly CsvColumn<R>[], rows: readonly R[]): string;` `hazards.ts`: `export const HAZARDS: readonly Hazard[];` `export function hazardsOf(tags: readonly string[]): Hazard[];` `export const HAZARD_NOTE_KEYS: Readonly<Record<Hazard, readonly string[]>>;` `export interface MainsRefusal { parts: { refdes: string; model: string }[] }` `export function mainsRefusal(rows: readonly Pick<BomRow, 'refdes' \| 'model' \| 'hazards'>[]): MainsRefusal \| null;` |
| | Data model | No document change. `Money` is integer minor units only; floats never appear (Rule: `sumMoney` cents rule from `cost.ts:19`) |
| | Algorithm | `csvCell`: text; if the first character is `=`, `+`, `-`, `@`, tab or CR, prepend `'`; then if the result contains `"`, `,`, CR or LF, wrap in `"` and double inner `"`. `toCsv`: header row from keys, `\n` line ends, no BOM, no trailing blank line; `int` columns are written with `String(n)` after `Number.isSafeInteger(n) && n >= 0` (a negative or unsafe value throws `RangeError` with the column name; a minus sign in an `int` column would be a formula); `bool` columns write `true` or `false`; undefined writes an empty cell. `hazardsOf`: keep tags `hazard:<kind>` where kind is in `HAZARDS`, sorted by the `HAZARDS` order, de-duplicated; an unknown `hazard:foo` is ignored here and reported by T-B20-24 as an unknown tag. `HAZARD_NOTE_KEYS`: `lipo` -> `['hazard.lipo.storage','hazard.lipo.charging','hazard.lipo.current']`, `motor` -> `['hazard.motor.current','hazard.motor.stall']`, `charger` -> `['hazard.charger.unattended']`, `high-current` -> `['hazard.highCurrent.wire']`, `heat` -> `['hazard.heat.touch']`, `laser` -> `['hazard.laser.eyes']`, `mains` -> `[]` (refused) |
| | Validation, errors | `toCsv` throws on a row cell that is an object. `mainsRefusal` returns null for no mains parts |
| | Edge cases | Cell `-5 V` text is prefixed; a cell that is only `+` is prefixed; a cell with a newline stays quoted and keeps the newline; a cell beginning with `'` is not double-prefixed; a Unicode cell is untouched |
| | Permissions, performance, migration | None; portable; `toCsv` of 5,000 rows under 50 ms (ESTIMATED) |
| Verification | Unit tests | `csv.test.ts`: the OWASP-style list (`=cmd`, `+1`, `-1+1`, `@SUM(A1)`, tab, CR), RFC 4180 quoting, determinism, `int` guard throws, empty cell. `hazards.test.ts`: tag filter, order, de-dup, unknown tag ignored, `mainsRefusal` with one mains row and with none, every `HAZARD_NOTE_KEYS` value is a string that T-B20-05 will define (checked against `en/buildit.json` once it exists; until then the test reads the key list from a constant and T-B20-05's key test closes the loop). `build-types.test.ts` (type-level `expectTypeOf`): `BuildInputs` matches COMMUNITY 8.2 field by field |
| | Integration, Playwright, fixtures | None; fixtures inline |
| | Acceptance | CM-70: Given a text cell beginning with `=`, When written, Then it starts with `'`. CM-69 (refusal half): Given a row with `hazards: ['mains']`, When `mainsRefusal` runs, Then it returns that refdes and model |
| | Observability, release blockers | None. Blocker: an `int` column that can write a leading minus |
| Delivery | Definition of done | Three modules, three tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/csv.test.ts src/export/hazards.test.ts src/export/build-types.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | JSDoc; revert (new files) |
| | Later tasks need | Every export task imports these types. `Tr`, `BomRow`, `BomResult`, `BomWarning`, `BomWarningCode`, `CompanionNote`, `BuildStep`, `BuildInputs`, `BenchMeasurement`, `csvCell`, `toCsv`, `hazardsOf`, `mainsRefusal` |

---

### T-B20-05. Strings: namespace `buildit` in six languages

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-05, i18n, B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01 |
| Intent | Problem | Eleven panels and the generated files need words in six languages. Rule 4 forbids literals in `src/export`. The English file defines the keys every other language must have (`src/i18n/namespaces.ts:1-2`) |
| | Target user | Amar and friends who use de, es, fr, hi or zh |
| | User story | As a builder I read the guide, the BOM headers and the reality gap in my language |
| | Expected behaviour | New namespace `buildit` with the key families below, in all six languages. The English file is the key source. A test fails if any language lacks a key, if a key is unused by the code (warning only), or if any `tr('...')` literal in `src/export/**` or `src/components/studio/{Bom,Guide,Flash,Prices,PriceCheck,RealityGap,Measurements,Export,Import,Build}*.tsx` is not in `en/buildit.json` |
| | Success metric | `I18N` passes; no key missing in any language; `COPY` (the check scans only git-tracked files, so run it after `git add -N` on the new files or after the commit) exits 0 on the new files (T-B1-20 bans `validated`, `verified against hardware`, `live prices`, `priced live`, `sponsor`, `credential`; so the tab is called "Prices", the dialog says "search", and `prices.live` reads "Listing found"); the word `validated` appears in none (CM-68, rule 5) |
| Implementation | Existing files | `src/i18n/namespaces.ts:4` (the `NAMESPACES` array; the `Messages` type below it lists each namespace), `src/i18n/messages/en/hw.json` (pattern), `src/i18n/messages.test.ts` (parity test, DOCUMENTED from B1 and B4) |
| | New files | `src/i18n/messages/{de,en,es,fr,hi,zh}/buildit.json` (one set, counts 1); `src/i18n/buildit-keys.test.ts` (test) |
| | Edited files | `src/i18n/namespaces.ts` (add `"buildit"` to `NAMESPACES` and its line to `Messages`) |
| | Key families (English names; text written by the task) | `tab.{build,bom,guide,flash,prices,reality,measurements,twin,nearby,videos,package}`; `bom.{title,caption,col.line,col.refdes,col.qty,col.description,col.value,col.package,col.maker,col.mpn,col.generic,col.spec,col.datasheet,col.lifecycle,col.fidelity,col.hazards,col.price,col.notes,generic,notPurchasable,warnings,warn.noMpn,warn.lifecycle,warn.noDatasheet,warn.notModelled,warn.staleDatasheet,totals.ok,totals.failed,have,skip,spares,sparesHint,exportCsv,exportMarkdown,exportJson,findDatasheet,lowerTier,companions,virtual,wireRow}`; `sub.{ask,title,none,dropIn,dropInWithChanges,needsRewire,differences,fidelityLower,apply,review,pinMap,whyNot}`; `guide.{title,caption,phase.prepare,phase.mount,phase.ground,phase.signal,phase.power,phase.program,phase.check,step.prepare.safety,step.prepare.powerOff,step.prepare.gather,step.mount.board,step.mount.part,step.ground.net,step.signal.wire,step.signal.pins,step.power.supply,step.power.polarity,step.power.limit,step.program.hex,step.program.source,step.check.continuity,wire.pinToPin,wire.hole,wire.noDrawn,source.netlist,source.descriptor,source.note,source.user,color.{red,black,orange,yellow,green,blue,white,purple,brown,grey},kind.{jumper,solder,screw,plug},print,exportMarkdown,exportText,done}`; `check.{title,powerOff,polarity,noShort,continuity,resistor,currentFirst,currentUnknown,noHot,jumper,libraryUnsupported}`; `bench.{title,pin,serial,node,current,servo,tone,omitted,none}`; `flash.{title,noFirmware,board,hexDownload,hexMissing,useIde,installLibrary,selectBoard,selectPort,upload,englishOnly,source,retrieved,webSerial,unsupportedBrowser,insecure,connect,choosePort,sync,erase,write,verify,done,failed,wrongDevice,noBootloader,busy,cancel,tooBig,firstPower,notTwin,experimental}`; `prices.{title,notLive,catalogue,yours,live,asOf,total,atLeast,unpriced,budget,overBudget,top3,add,check,needKey,usesServerKey,costDialog,searches,confirm,fromCache,lowest,titleMismatch,ad,otherCurrency,editPack,quota,rateLimited,invalidKey,timeout,failed,history,quotaCount,noNetwork}`; `reality.{title,lowestTier,unmeasured,s1.title,s1.empty,s2.title,s3.title,s4.title,s5.title,sev.mustRead,sev.check,sev.note,noPercent,generic,noDatasheet,noRating,lifecycle,unsupported,supplyMargin,polarity,logicLevel,notModelled,failedCheck,unknownHazardTag,untaggedByHand,mainsRefused}`; `meas.{title,add,target,quantity,value,unit,instrument,conditions,simulated,delta,tolerance,withinTolerance,outside,remove,limit500,measuredBy,saveFailed}`; `twin.{simulated,measured,source.firmata,source.serial,delta,record,recorded,noTrace,align,pinsOnly}`; `export.{title,package,bom,wiring,netlist,schematic,wiringDiagram,ino,project,print,lossTitle,lossNone,lossCount,sev.info,sev.warning,sev.error,confirm,cancel,readme.line1,readme.line2,readme.tiers,readme.date,readme.version,notice.t1,noBare}`; `import.{title,choose,formats,lossTitle,lossNone,create,cancel,unsupported,tooBig,notText,guessed}`; `hazard.{lipo.storage,lipo.charging,lipo.current,motor.current,motor.stall,charger.unattended,highCurrent.wire,heat.touch,laser.eyes,mains.refused}`; `drone.{massNotice,batteryNote,paramDump}`; `robot.{urdfNote}`; `nearby.{title}`; `a11y.{stepsList,tickStep,rowsCaption}` |
| | Signatures | `NAMESPACES` gains `"buildit"`. Variables use `{name}` placeholders as the other namespaces do (read `createTranslator` in `src/i18n/translate.ts`) |
| | Algorithm | Keys are nested JSON (`en/search.json` is nested), so a key cannot be both a leaf and a branch: `bom.sparesHint` and `prices.quotaCount` are siblings of `bom.spares` and `prices.quota`, not children. Write English first, short sentences, plain words, no marketing, no em dashes. Translate the other five with care: units, key names (`DTR`, `CSV`, `BOM`) stay Latin. `reality.noPercent` says there is no accuracy percentage. `flash.englishOnly` says the recipe text is English only. Hindi and Chinese strings use the same placeholders |
| | Validation, errors | The key test (`buildit-keys.test.ts`) lists unused keys as a table (info, not failure), fails on a used-but-missing key, and fails when any dotted key is both a leaf string and the prefix of another key |
| | Edge cases | Plurals: the existing namespaces use separate keys for singular and plural or `{count}` with ICU-less phrasing; follow `search.json` `real.listings`. Right-to-left languages are not in the six |
| | Permissions, performance, migration | None. The namespace loads on demand with the Build tab (T-B20-37a), not in the shell |
| Verification | Unit tests | `buildit-keys.test.ts` (as above). The existing parity test `messages.test.ts` runs on the new namespace |
| | Integration, Playwright | T-B20-40 switches to `de` once and reads the BOM heading |
| | Fixtures | None |
| | Acceptance | Given `en/buildit.json`, When parity runs, Then all six languages hold the same keys. Given a `tr('guide.nothere')` literal in `src/export`, When the key test runs, Then it fails naming the file and line |
| | Observability, release blockers | A language file with a copied English value for a key with a letter-based script is allowed (names, units); a missing key is a blocker |
| Delivery | Definition of done | Six files, namespace entry, key test green |
| | Verify commands | `TL`; `I18N`; `V src/i18n`; `git add -N src/i18n/messages/*/buildit.json src/i18n/buildit-keys.test.ts`; `COPY` |
| | Docs, rollback | None; revert |
| | Later tasks need | All UI tasks (31 to 37b) and the text-building export tasks (10, 11, 19, 20, 20b, 24, 26, 27) read these keys. A key they lack is reported, and the orchestrator adds a follow-up task after this one's group; no task edits these files in the same group |

---

### T-B20-06. Search client: a spent quota is its own code

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-06, search client (audit C027 fix), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 |
| Intent | Problem | The server answers HTTP 429 for both a spent search budget (`quota_exhausted`) and a per-minute limit. The client turns every 429 into `rate_limited` (`client.ts:39`) and the panels say "Too many price checks in a row" (`search.json` `real.rateLimited`, line 36) even when the key has no searches left. CM-65 needs the right words |
| | Target user | Amar with a search key that has run out |
| | User story | As a builder whose key is spent I read "the search key is out of searches", not "wait a minute" |
| | Expected behaviour | `FailCode` gains `"quota_exhausted"`. The error body's `error.code` is already parsed (`client.ts:33-37`); when the status is 429 and the code is `quota_exhausted` the result is `quota_exhausted`, else `rate_limited`. New string `real.quotaOut` in six languages |
| | Success metric | A fixture 429 with body `{error:{code:"quota_exhausted"}}` gives `quota_exhausted`; a 429 with no body gives `rate_limited` |
| Implementation | Existing files | `src/lib/search/client.ts:8` (`FailCode`), `:33-39` (status mapping), `:43-46` (calls); `src/lib/server/search/route.ts:15` (`quota_exhausted: 429`); `src/lib/search/types.ts:81` (`SearchErrorCode` has the code); `src/i18n/messages/en/search.json:36` (`rateLimited`). Seam: after B1 T-B1-03 and B14 the client may send the key header (`withSearchAuth`) and use `/v1/search`; this task edits whatever file the seam row names as the search client and keeps its other behaviour |
| | Edited files | `src/lib/search/client.ts`; `src/i18n/messages/*/search.json` (one set) |
| | Signatures | `export type FailCode = "not_configured" \| "rate_limited" \| "quota_exhausted" \| "invalid_key" \| "timeout" \| "failed";` (adds the three codes CM-65 and the Errors rule of COMMUNITY 8.7 name: quota gone, rate limited, invalid key, timeout; `invalid_key` for HTTP 401 and 403, `timeout` for `AbortError` caused by a timeout signal or HTTP 504) |
| | Algorithm | In `post`, after reading `code`: 429 with `quota_exhausted` -> `quota_exhausted`; 429 otherwise -> `rate_limited`; 401, 403 -> `invalid_key`; 504 or a `TimeoutError` -> `timeout`; 503 `not_configured` unchanged; everything else `failed`. Existing callers that compare `=== "rate_limited"` keep compiling |
| | Validation, errors, edge cases | A 429 whose body is not JSON: `rate_limited`. A caller abort still rethrows (`client.ts:24`) |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `src/lib/search/client.test.ts` (exists, 23 lines): add five cases with a stubbed `fetch` (quota, rate, invalid key, timeout, not configured) |
| | Integration, Playwright, fixtures | Covered by T-B20-40 (quota text) |
| | Acceptance | CM-65: Given the provider answers quota exhausted, When the panel shows the failure, Then the text says the key is out of searches and does not say "rate limited" |
| | Observability, release blockers | The `track("search.call", {engine})` call at `client.ts:14` stays and sends no key. Blocker: a key in any new log |
| Delivery | Definition of done | Codes added, tests green, six-language string added |
| | Verify commands | `TL`; `V src/lib/search src/i18n`; `I18N` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-22 maps codes to words; T-B20-37b maps `quota_exhausted` in Nearby and Video help (they test `code === "rate_limited"` at `NearbyPanel.tsx:202`, `VideoHelp.tsx:74`) |

---

### T-B20-07. IndexedDB store `price_checks`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-07, local storage, B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 (B3 stores, B11 database version) |
| Intent | Problem | CM-64: pressing "Check prices" twice within 6 hours must make zero calls the second time. COMMUNITY 8.7 keeps the person's own earlier checks 90 days. No store holds them |
| | Target user | Amar with a limited search key |
| | User story | As a builder I never pay twice for the same question |
| | Expected behaviour | A store `price_checks`, key `<queryHash>:<region>`, value `{queryHash, region, fetchedAt, searches, listings}`. `getFresh` returns a row younger than the ttl. `put` writes a row. `list` returns rows newer than 90 days. `prune` deletes older rows. Wipe clears it. It is never in an export |
| | Success metric | Put, then `getFresh` at 5 h 59 m returns the row; at 6 h 1 m returns undefined; prune at 91 days deletes it |
| Implementation | Existing files | PLANNED `src/local/db.ts` (T-B3-02; T-B11-13 bumped the version once for `parts`), `src/local/stores.ts` (`STORES`), `src/local/wipe.ts` (T-B3-08), `src/local/parts-store.ts` (T-B11-13: the pattern to copy), `src/local/memory-repository.ts` |
| | New files | `src/local/price-checks.ts` |
| | Edited files | `src/local/db.ts` (version +1; `if (old < N) createObjectStore('price_checks', {keyPath: 'key'})`, index `fetchedAt`), `stores.ts` (name and value type), `wipe.ts` (clear the store) |
| | Signatures | `export interface ListingRecord { source: string; title: string; seller?: string; price: number; currency: string; url: string; pack?: number; inStock?: boolean; sponsored?: boolean }` `export interface PriceCheckRow { key: string; queryHash: string; region: string; fetchedAt: string; searches: number; listings: ListingRecord[] }` `export interface PriceChecks { getFresh(key: string, now: string, ttlMs?: number): Promise<PriceCheckRow \| undefined>; put(row: PriceCheckRow): Promise<void>; list(now: string, maxAgeDays?: number): Promise<PriceCheckRow[]>; prune(now: string): Promise<number> }` `export const PRICE_TTL_MS = 6 * 3600_000;` `export const PRICE_HISTORY_DAYS = 90;` `export function priceChecks(repo: Repository): PriceChecks;` |
| | Data model | `listings` hold what the provider returned: title, seller, price in the listing's currency, URL exactly as returned (no tag appended, CM-66), `sponsored` only if the provider flags it. No key, no query text beyond the hash |
| | Algorithm | `getFresh`: read; compare `Date.parse(now) - Date.parse(fetchedAt) < ttl`. `put`: replace by key. `list`: all rows with `fetchedAt` within `maxAgeDays`, newest first. `prune`: delete rows older than the history window; returns count. All times are passed in (rule 3) |
| | Validation, errors | A row whose `listings.length > 100` is cut to 100; a row failing shape returns undefined and is deleted. A quota error from IndexedDB resolves `put` quietly with a console-free no-op and the panel works without a cache |
| | Edge cases | Two tabs write the same key: last write wins. The database upgrade runs once for a user who already holds the B11 version |
| | Permissions, performance, migration | Migration: version bump with an `old <` block; no data to move. Under 5 ms per call (ESTIMATED) |
| Verification | Unit tests | `src/local/price-checks.test.ts` against the memory repository and, if T-B3-02 added `fake-indexeddb`, the IndexedDB one: ttl edges, history edges, prune count, listing cap, malformed row. `src/local/db.test.ts` (exists from B3): upgrade from version N to N+1 keeps `parts` rows. `wipe.test.ts`: the store is empty after wipe |
| | Integration, Playwright | T-B20-40 asserts zero network calls on the second press |
| | Acceptance | Given a stored row 5 hours old, When I look up the same key, Then it is returned. Given 7 hours, Then undefined |
| | Observability, release blockers | None. Blocker: `price_checks` appearing in `export-all` output |
| Delivery | Definition of done | Store, wrapper, wipe, tests green |
| | Verify commands | `TL`; `V src/local`; `PORT` if `src/local` is portable in `tsconfig.portable.json` (seam) |
| | Docs, rollback | `docs/BUILD_IT.md` data section (T-B20-41); revert (the next version bump removes it) |
| | Later tasks need | T-B20-22 uses `PriceChecks`; T-B20-29 must not export it |

---

### T-B20-08. Build inputs and bench measurements stored as a project asset

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-08, project data (Q1), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04 |
| Intent | Problem | The document cannot derive a budget, a typed price, a number of parts already owned, an accepted substitute or a multimeter reading (COMMUNITY 8.2), and no op writes the root `ext` (Q1) |
| | Target user | Amar entering what he measured on the bench |
| | User story | As a builder I tick "I have 3 of these", type what I paid, and enter 5.02 V from my meter. They come back when I reopen the file and when a buddy gets my `.iynkz` |
| | Expected behaviour | `BuildInputs` is read from and written to one asset `build/inputs.json`. A write is a batch of ops (`asset.add` for the new file, `asset.remove` for the old one) plus the bytes to store. Limits: 500 measurements, notes 4,000 chars |
| | Success metric | Round trip: write, apply ops to a document, read back equals input (canonical JSON). Hash changes only through the asset entry |
| Implementation | Existing files | `project.schema.json` `$defs.Asset` (`id` `^ast_`, `path`, `mediaType`, `bytes` 0 to 16 MiB, `sha256`, `role` includes `other`, `license`, `origin`), `$defs.Op` (`asset.add {asset}`, `asset.remove {id}`). PLANNED `src/core` (`sha256Hex`, `canonicalize`, strict parse, T-B2-02/03), `src/project` apply (T-B2-07: asset ops) |
| | New files | `src/export/build-inputs.ts` |
| | Signatures | `export const BUILD_INPUTS_PATH = 'build/inputs.json';` `export const MAX_MEASUREMENTS = 500;` `export function emptyBuildInputs(currency?: string): BuildInputs;` `export function findBuildAsset(doc: Pick<Project, 'assets'>): Asset \| undefined;` `export function parseBuildInputs(bytes: Uint8Array): Result<BuildInputs, Diagnostic[]>;` `export function serializeBuildInputs(inputs: BuildInputs): Uint8Array;` `export interface BuildWrite { ops: Op[]; bytes: Uint8Array; sha256: string }` `export function planBuildWrite(doc: Pick<Project, 'assets'>, next: BuildInputs, newAssetId: string, origin: string): Result<BuildWrite, Diagnostic[]>;` `export function setLine(i: BuildInputs, bomKey: string, patch: Partial<LineInput> \| null): Result<BuildInputs, Diagnostic[]>;` `export function addMeasurement(i: BuildInputs, m: BenchMeasurement): Result<BuildInputs, Diagnostic[]>;` `export function removeMeasurement(i: BuildInputs, id: string): BuildInputs;` |
| | Data model | `BuildInputs` per T-B20-04. Asset: `{id: newAssetId, path: BUILD_INPUTS_PATH, mediaType: 'application/json', bytes, sha256, role: 'other', origin}`. The caller stores `bytes` in the `assets` store under `sha256` |
| | Algorithm | `serialize`: canonical JSON (RFC 8785) UTF-8. `parse`: strict parse (no duplicate keys, depth at most 8), then shape check: `schemaVersion === '1.1'` (a newer major is refused with `build.newer`), `currency` three upper-case letters, `budgetMinor` safe integer at least 0, `spares.smallPassivesPercent` integer 0 to 100, `region` two upper-case letters, `lines` at most 2,000 keys each 16 lower-case hex, `priceMinor`, `have` safe integers at least 0 (`have` at most 100,000), `priceNote` at most 200 chars, `chosenPart.ref` matching `DefRefName`, measurements per the limits (`id` `^msr_`, `at` UTC `Z`, `by` `usr_` id, `value` finite, `unit` at most 16 chars, `instrument` at most 80, `conditions` at most 300, `note` at most 500, `photoAsset` an `ast_` id), `notes` at most 4,000. Unknown keys are refused (not silently dropped). `planBuildWrite`: `asset.remove` the old id if present, then `asset.add`; both in order so the batch is valid when applied to the current document; size at most 262,144 bytes (`build.too-big`) |
| | State transitions | None |
| | Validation, errors | Diagnostic codes `build.syntax`, `build.shape`, `build.newer`, `build.too-big`, `build.measurements-limit`, `build.bad-id`. Messages are plain: they name the field and the limit |
| | Edge cases | No asset yet: `findBuildAsset` undefined, `emptyBuildInputs`. Two assets at the path (import oddity): the first by array order is used and the second is reported as `build.duplicate` |
| | Permissions, performance, migration | None. The bare `.iynk` loss code `build.inputs-not-in-bare-file` is raised by T-B20-27 and T-B20-36 when they write a bare file. Migration to `domains.build` later is a pure function of this file's output |
| Verification | Unit tests | `build-inputs.test.ts`: round trip; 501st measurement refused; each shape rule with one bad and one good case; unknown key refused; newer major refused; `planBuildWrite` ops apply to a fixture project through the real `apply` (T-B2-05/07) and the asset list ends with one entry at the path; canonical bytes stable across key order; no measurement with `value: NaN` |
| | Integration | `V src/export` with the project apply in the page-level test project |
| | Fixtures | A project from `04_ARCHITECTURE/schemas/examples/uno-blink-d12.project.json` |
| | Acceptance | Given a project with no inputs, When I add a measurement, Then the write plan holds one `asset.add` and no remove. Given an existing inputs asset, Then it holds one remove then one add |
| | Observability, release blockers | Diagnostics only. Blocker: a free-text field rendered as HTML anywhere (rule: text only) |
| Delivery | Definition of done | Module and tests green; `PORT` clean |
| | Verify commands | `TL`; `V src/export/build-inputs.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` (T-B20-41) explains where inputs live; revert |
| | Later tasks need | T-B20-10 (inputs in), T-B20-24, T-B20-34, T-B20-35 (measurements), T-B20-32 (typed prices) |

---

### T-B20-09. Datasheet links, staleness, query for a missing one

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-09, export (F-160), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-04 |
| Intent | Problem | A BOM row should link the maker's document and say when the link was last read. iynk cites datasheets and does not copy or fetch them (COMMUNITY 8.4) |
| | Target user | Amar choosing which exact module to buy |
| | User story | As a builder I click the datasheet link for the BME280 and see the date iynk last read it |
| | Expected behaviour | `datasheetOf` returns the best cited document of a descriptor. `staleness` says a link read over 365 days ago needs a check. `datasheetQuery` returns the text a person can search for, or null for a generic part (a red 5 mm LED has no maker datasheet) |
| | Success metric | For the nine example descriptors: BME280 has a link, LED returns undefined or a lesson source only, never a made-up URL |
| Implementation | Existing files | `component.schema.json` `$defs.source` (`kind`, `title`, `url` `^https?://`, `retrieved`, `revision`, `reliability`), `$defs.identity.properties.{primary_source, mpn, generic}`. PLANNED `Descriptor` type (T-B2-04/11) |
| | New files | `src/export/datasheets.ts` |
| | Signatures | `export function datasheetOf(d: Pick<Descriptor, 'sources' \| 'identity'>): DatasheetLink \| undefined;` `export function staleness(link: DatasheetLink, now: string): { stale: boolean; days: number \| null };` `export function datasheetQuery(d: Pick<Descriptor, 'identity'>): string \| null;` |
| | Algorithm | `datasheetOf`: candidate kinds in priority `datasheet`, `application-note`, `product-page`, `reseller-guide` (a refinement of COMMUNITY's "first entry of kind" so a product page never beats a datasheet; HYPOTHESIS); the `identity.primary_source` id wins if its kind is allowed; within a kind, `reliability` `primary` before `secondary` before `unverified`, then array order. Requires a `url`. `staleness`: days = whole days between `retrieved` and `now`; `stale` when above 365; no `retrieved` gives `{stale: true, days: null}`. `datasheetQuery`: `"<manufacturer> <mpn or model> datasheet"` when `generic` is false, else null. The function never fetches |
| | Validation, errors, edge cases | A `url` with a scheme other than `http` or `https` is skipped (the schema already forbids it; the guard stays). `retrieved` after `now`: days 0 |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `datasheets.test.ts` over the 9 example descriptors read from `04_ARCHITECTURE/schemas/examples/components/`: each result recorded as a golden; priority order case; stale at 365 and 366 days; query null for the LED |
| | Acceptance | Given the BME280 descriptor, When asked, Then `datasheetOf` returns the primary datasheet with its `retrieved` date. Given the 5 mm LED (generic), Then `datasheetQuery` is null |
| | Release blockers | Any URL not taken from a descriptor |
| Delivery | Definition of done | One module, tests green |
| | Verify commands | `TL`; `V src/export/datasheets.test.ts`; `PORT` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-10 (`datasheet` on the row), T-B20-24 (missing datasheet), T-B20-31 (link and stale chip) |

---

### T-B20-10. `bomKey` and BOM rows from the document

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-10, export (F-160), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-09 |
| Intent | Problem | A parts list must come from the document, group equal parts, never invent a part number, leave out what cannot be bought, and add up to a count the person can check by hand |
| | Target user | Amar buying parts for the Blink project and the sensor starter |
| | User story | As a builder I press Export BOM and read: Uno R3 x1, red 5 mm LED x1, 220 ohm resistor x1; supply and breadboard nets listed apart as not purchasable |
| | Expected behaviour | `buildBom` walks `boards` and `components`, resolves each instance's descriptor from the pinned `dependencies.components`, groups by `bomKey`, and returns purchasable rows, not-purchasable rows, warnings, companion notes and a totals check. Generic parts get `mpn: ""`, `generic: true` and a `specification` list. Jumper wires and boards follow section 8.3 of COMMUNITY |
| | Success metric | CM-60: Blink starter gives UNO 1, LED 1, resistor 1 and the check passes; the same for the 3 example projects (lesson-uno-r3-button, env-monitor-esp32, uno-blink-d12). CM-62: generic LED row has empty `mpn`, `generic: true`, and a `specification` with colour, size and the rating the project uses |
| Implementation | Existing files | `project.schema.json` `$defs.Board`, `$defs.Component` (`definition {ref, version}`, `refdes`, `params`), `$defs.Dependencies`, `$defs.View` (`kind`, `wires`, `placements`), `$defs.Wire.color`. `component.schema.json` `$defs.identity`, `dimensions.package`, `parameter` (`kind` variant / build-option / setting / environment), `simulation`, `connectors`. PLANNED `PartRegistry.get` (T-B2-11). Old lists to match for migrated items: `src/lib/search/bom.ts:238-390` |
| | New files | `src/export/bom-key.ts`, `src/export/bom.ts`, `src/export/bom-lines.ts`; tests beside each |
| | Signatures | `bom-key.ts`: `export function purchaseParams(d: Descriptor): string[];` `export function bomKey(ref: string, version: string, params: Readonly<Record<string, ParamValue>>, purchase: readonly string[]): string;` (16 hex, `sha256(ref + "@" + version + "\|" + canonical(picked params)).slice(0, 16)`). `bom-lines.ts`: `export function wireRows(doc: Pick<Project, 'views'>, tr: Tr): BomRow[];` `export function companionNotes(rows: readonly BomRow[], reg: Pick<PartRegistry, 'get'>): CompanionNote[];` (`CompanionNote` is defined in `build-types.ts`, T-B20-04). `bom.ts`: `export interface BomOptions { inputs: BuildInputs; registry: Pick<PartRegistry, 'get'>; tr: Tr; now: string }` (`BomWarningCode`, `BomWarning` and `BomResult` are defined in `build-types.ts`, T-B20-04, and imported here) `export function buildBom(doc: Project, opts: BomOptions): Result<BomResult, Diagnostic[]>;` |
| | Data model | `BomRow` from T-B20-04. `line` is 1-based after the stable sort: descriptor `identity.category`, then first refdes in natural order (`R2` before `R10`). `specification` for a generic part lists value, tolerance, package, voltage and power rating the project uses, colour (text from the descriptor and parameter values) |
| | Algorithm | (1) For each board and component find its pinned dependency and descriptor; none -> warning `unknown-part` and a row `description: tr('bom.virtual')`-style placeholder with `purchasable: false` (a missing part is never silently dropped). (2) `purchaseParams` (HYPOTHESIS, the schema has no purchase marker): every parameter of `kind: 'variant'`, plus, for category `passive`, every `kind: 'setting'` parameter whose `unit` is `ohm`, `F` or `H` (the value you buy). Build options, environment and other settings never split a row. (3) Group by `bomKey`; `refdes[]` in natural order. (4) `purchasable = identity.kind !== 'virtual' && identity.kind !== 'instrument'`. (5) Quantity per row: `instances`, plus spares when `inputs.spares.smallPassivesPercent > 0` and the descriptor tags include `resistor`, `capacitor` or `led` (`ceil(n * (1 + p / 100))`), minus `lines[key].have`, floor 0; `skip` makes it 0 and moves the row to the "skipped" note in `warnings`-free `notes`. (6) Wires: `wireRows` counts wires in views of kind `breadboard`, grouped by colour, as "jumper wires, <colour>, male-to-male"; a view without wires adds nothing; other kinds are not counted. Synthetic rows have `source: 'derived'`, `generic: true`, `partRef` absent. (7) `datasheet` from `datasheetOf`; `lifecycle`, `fidelity {tier, status}` from `simulation`; `hazards` from `hazardsOf(identity.tags)`. (8) A `chosenPart` in `lines[key]` changes the displayed alternative note only; the document is not read as if swapped. (9) Check: `expected` = count of purchasable instances (boards + components + wire count) adjusted by `have`, spares and `skip` per distinct key computed in a second pass over the raw instance list; `got` = sum of `row.quantity`. `ok` when equal; otherwise `buildBom` returns `ok` with `check.ok: false` and the caller refuses to export (CM-60) |
| | State transitions | None; pure |
| | Validation, errors | Warnings as in the type. Rows with `generic: false` and empty `mpn` get `no-mpn`; `lifecycle` `nrnd` or `obsolete` -> `lifecycle`; no link -> `no-datasheet`; `tier: 'none'` -> `not-modelled`; stale link -> `stale-datasheet`. Errors only for a malformed document (`Result` error) |
| | Edge cases | Two refdes on one part (never: refdes unique). A part with a purchase param missing from `params`: the descriptor default is used. `have` larger than instances gives 0 and a note. A resistor 220 and 220.0: values compare as numbers. A board's USB cable is a companion note, never a counted row (COMMUNITY 8.3). A project with no components gives an empty BOM and `check.ok` |
| | Permissions, performance | 500 components under 50 ms on the main thread in Node (ESTIMATED; CM-72 measures it in the worker, T-B20-30) |
| | Migration | The old lists in `src/lib/search/bom.ts` are not read. Migrated items' derived BOM must reproduce their quantities: a test compares the old `boardBom`, `roboticsBom` and `droneBom` quantities for 6 items (2 each) with the derived BOM of the converted projects, as a table in the test output, failing only on a count difference that is not explained by a documented exclusion (virtual parts, multimeter, companions) |
| Verification | Unit tests | `bom-key.test.ts`: same value same key; 10k vs 1k different; red vs green LED different; order of param keys irrelevant; a build option (jumper) does not change the key; `purchaseParams` table for the 9 examples. `bom-lines.test.ts`: wires by colour; none for a schematic-only view. `bom.test.ts`: CM-60 for the three example projects (hand counts written in the test); CM-62; supply row in `notPurchasable`; multimeter in `notPurchasable`; spares 10 percent on 5 resistors gives 6 (`ceil(5.5)`); `have` and `skip`; ordering `R2` before `R10`; missing dependency warning; totals mismatch forced by a hand-edited row |
| | Integration | `V src/export` with the converted example projects |
| | Fixtures | The three example projects plus inline small documents |
| | Acceptance | CM-60 and CM-62 as in Intent |
| | Observability, release blockers | Warnings. Blocker: an invented MPN; a virtual part counted as purchasable |
| Delivery | Definition of done | Three modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/bom-key.test.ts src/export/bom-lines.test.ts src/export/bom.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` BOM rules (T-B20-41); revert |
| | Later tasks need | T-B20-19 (formats), 21, 23, 24, 26, 27, 31 |

---

### T-B20-11. Wiring guide core: ordered steps from the netlist

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-11, export (F-161), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05 |
| Intent | Problem | The old assembly panel lists pin pairs from a lesson's text (`figures` lessons) and not from the circuit. A new builder needs steps made from the nets, in a safe order, each saying where it came from |
| | Target user | Amar at the bench with an Uno, a breadboard and a bag of parts |
| | User story | As a builder I read "Ground first: connect UNO GND to the blue rail" and "LED anode (long leg) to row 12, column e", and I tick each step |
| | Expected behaviour | `buildGuide` returns ordered steps: `prepare`, `mount`, `ground`, `signal`, `power`, `program`, `check`, per COMMUNITY 8.8. It never invents a wire the project lacks. With a breadboard view and placements it names holes; otherwise it is pin to pin |
| | Success metric | CM-61: every net with two or more pins appears in exactly one signal or power step group, and every step has a `source`; 100 random generated projects keep this |
| Implementation | Existing files | PLANNED `netlist(doc)` and `NetlistNode {id, nets, names, pins}` (T-B2-13), `holeToPin` / `surfaceInterface` (holes.ts), `project.schema.json` `$defs.Net.class` (`signal`, `power`, `ground`, `analog`), `$defs.Wire` (`color`, `from`, `to` as `WireEnd` pin / junction / hole), `$defs.Placement.legs`, `component.schema.json` `$defs.pin.designator`, `polarity`, `connector`, `$defs.connector` |
| | New files | `src/export/guide.ts`, `src/export/pin-labels.ts`; tests beside each |
| | Signatures | `pin-labels.ts`: `export function pinLabel(doc: Project, reg: Pick<PartRegistry, 'get'>, ref: PinRef, view?: View): PinLabel;` `export function labelText(l: PinLabel, tr: Tr): string;` `guide.ts`: `export interface GuideOptions { registry: Pick<PartRegistry, 'get'>; tr: Tr; bom?: BomResult; solverSupplyMaxMa?: number }` (`BomResult` is imported from `build-types.ts`, T-B20-04) `export interface Guide { steps: BuildStep[]; hazards: Hazard[]; netsCovered: string[] }` `export function buildGuide(doc: Project, opts: GuideOptions): Result<Guide, Diagnostic[]>;` |
| | Data model | `BuildStep` (T-B20-04). `PinLabel.designator` is the label printed on the part (`pin.designator`, falling back to the pin `name` then id), `connector` from the pin's connector id, `hole` such as `row 12, column e` from the first breadboard view's `legs` / hole ends when present. Net id goes in `step.net` |
| | Algorithm | (1) `prepare`: a safety step (source `note`), "power off", "gather parts" (source `descriptor` when a BOM is given). (2) `mount`: one step per board then per module/part with a breadboard placement (hole text) (source `descriptor`). (3) `ground`: for each net of class `ground`, one step naming its members in a stable order (source `netlist`). (4) `signal`: nets of class `signal` or `analog`: one step per drawn wire when the project has wires on that net (source `netlist`, `wire.color` from the wire), else one step "connect these pins together" listing the pins; grouped by part (the part with most pins on the net first, tie by refdes), then net id order. (5) `power`: nets of class `power`: each step names polarity (`pin.polarity` or `type` `power_in`) and the voltage when a supply source on the net states it (`param` `volts` of a `virtual` supply, else omitted, never guessed), then a polarity check `expect`. (6) `program`: a step naming the firmware source files and the hex (if the project has a binary asset) or the IDE path (source `descriptor`/`note`); libraries from `dependencies.libraries` with versions; a library with `iynk_support: 'unsupported'` is flagged. (7) `check`: one step "do the checklist" pointing at T-B20-20's list (source `note`). A net with more than two members expands to a tree only if the wires exist. A net whose members are all on one part (an internal short) gets no step. Steps are numbered 1.. at the end. `netsCovered` is every net id that has two or more pins after the part-internal groups of the netlist |
| | State transitions | None |
| | Validation, errors | A net member whose component is missing: step text uses the raw refdes and the step has `source: 'netlist'` plus a `Diagnostic` `guide.unknown-part` in the Result's warnings list. A hole name the surface does not have: the label has no `hole` and `guide.bad-hole` is logged |
| | Edge cases | Netlist-only project (no wires, no views): all steps are "connect these pins". Two supplies on one net: both listed. A project with only a board: prepare, mount, program, check. Pins with no designator: id used. A bus (I2C) is two signal nets, no special case |
| | Permissions, performance | Under 100 ms for 500 parts (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `pin-labels.test.ts`: designator vs id; hole from `legs`; connector. `guide.test.ts`: Blink (Uno + LED + resistor): order `prepare, mount, ground, signal, power?, program, check`; no `power` step when no power net other than board pins (document the rule: board 5V/3V3 nets count as power nets, so the Blink guide has a power step only if the project has such a net); property test: 100 projects generated by a seeded generator (random parts from the 9 examples, random nets) satisfy CM-61; the ground-first order; wire colours come from wires; an unwired net says "connect these pins together"; `source` on every step; deterministic (same input same steps) |
| | Integration | Run over the converted lesson projects of B12 (if present; else the three examples) and assert CM-61 for each |
| | Acceptance | CM-61. Given a project whose D13 net has the Uno pin and the resistor pin, When the guide builds, Then exactly one signal step names both pins and has source `netlist` |
| | Observability, release blockers | Warnings list. Blocker: a step with no `source`; a net covered twice |
| Delivery | Definition of done | Two modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/guide.test.ts src/export/pin-labels.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` guide rules; revert |
| | Later tasks need | T-B20-20 (checklist and formats), T-B20-27 (package), T-B20-33 (panel) |

---

### T-B20-12. STK500v1 protocol client and a fake Optiboot

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-12, hardware link (flashing), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-02 |
| Intent | Problem | The hex download always works, but a builder with an Uno wants to press a button. The protocol is small and can be tested without a board |
| | Target user | Amar with an Uno or Nano and a Chromium browser |
| | User story | As a builder I flash the Blink hex to my Uno from the page |
| | Expected behaviour | A pure client `flashHex(link, image, opts)` over a tiny `StkLink` interface (write bytes, read bytes with timeout). A fake Optiboot (`createFakeOptiboot`) answers the same bytes for tests. No `navigator.serial` here |
| | Success metric | The six clauses of T-B20-02 pass against the fake in unit tests |
| Implementation | Existing files | Spike constants from `RS-B20-1-stk500/REPORT.md`. `src/lib/hw/testing.ts:20` (`FakeSerialPort`) for the integration with a port in T-B20-25. PLANNED `HexImage {flash, usedRanges, bytes}` (T-B9-08) |
| | New files | `src/lib/hw/stk500.ts`, `src/lib/hw/fake-optiboot.ts` (test double, imported by tests only, like `testing.ts`) |
| | Signatures | `stk500.ts`: `export interface StkLink { write(bytes: Uint8Array): Promise<void>; read(n: number, timeoutMs: number): Promise<Uint8Array> /* rejects 'timeout' */ }` `export interface FlashDevice { name: string; signature: readonly [number, number, number]; pageBytes: number; flashBytes: number /* usable, bootloader excluded */ }` `export const DEVICES: Readonly<Record<'uno-r3' \| 'nano', FlashDevice>>;` `export type FlashPhase = 'sync' \| 'signature' \| 'write' \| 'verify' \| 'leave';` `export interface FlashProgress { phase: FlashPhase; done: number; total: number }` `export type FlashErrorCode = 'no-sync' \| 'wrong-device' \| 'too-big' \| 'timeout' \| 'verify-failed' \| 'protocol' \| 'aborted';` `export class FlashError extends Error { readonly code: FlashErrorCode; readonly detail?: Record<string, number \| string> }` `export function flashHex(link: StkLink, image: { flash: Uint8Array; usedRanges: readonly [number, number][] }, device: FlashDevice, opts?: { onProgress?(p: FlashProgress): void; signal?: AbortSignal; retries?: number }): Promise<void>;` `fake-optiboot.ts`: `export interface FakeOptiboot { link: StkLink; flash: Uint8Array; dropNextReply(): void; setSignature(s: readonly [number, number, number]): void; writes: number[] /* page addresses */ }` `export function createFakeOptiboot(device: FlashDevice): FakeOptiboot;` |
| | Algorithm | Constants from the spike report (EXTERNAL until quoted there). `flashHex`: refuse `usedRanges` beyond `device.flashBytes` (`too-big`) before touching the link; sync (up to 5 tries; flush input first); read signature, compare (`wrong-device` with expected and got); for each page that overlaps a used range: `LOAD_ADDRESS` (word address), `PROG_PAGE` with a full page padded with `0xFF`, check `INSYNC OK`; one retry per page on `timeout`; verify by `READ_PAGE` for the same pages and compare (`verify-failed` with the first bad address); `LEAVE_PROGMODE`. `signal.aborted` between pages throws `aborted` and leaves the bootloader in sync (no half-page write) |
| | State transitions | `sync -> signature -> write -> verify -> leave`; any error ends the run |
| | Validation, errors | `FlashError` codes above; `detail` carries addresses, never data |
| | Edge cases | Image smaller than one page; image with a gap (pages in the gap are skipped); last page partial; reply with extra bytes (resync); `retries` zero |
| | Permissions, performance | None; 30 KB at 115200 baud is about 4 s of line time (ESTIMATED from 10 bits per byte) |
| | Migration | None |
| Verification | Unit tests | `stk500.test.ts`: the six clauses; abort mid-run leaves the fake in sync; a gap image writes only used pages (`fake.writes`); partial last page padded with `0xFF`; wrong signature leaves `flash` all `0xFF`. `fake-optiboot.test.ts`: the model rejects a write without `LOAD_ADDRESS` |
| | Integration | T-B20-25 |
| | Fixtures | `blink.hex` and `knob.hex` from `src/export/fixtures/` (T-B9-08) parsed by `parseHex` |
| | Acceptance | Given the fake answers signature `1E 95 14`, When `flashHex` runs, Then it throws `wrong-device` and the fake's flash is unchanged |
| | Observability, release blockers | Progress callback. Blocker: any write before the signature check |
| Delivery | Definition of done | Both files, tests green |
| | Verify commands | `TL`; `V src/lib/hw/stk500.test.ts src/lib/hw/fake-optiboot.test.ts` |
| | Docs, rollback | Notes in `docs/BUILD_IT.md` flashing section; revert |
| | Later tasks need | T-B20-25 (port wiring), T-B20-40 (a JS copy of the fake for the browser test) |

---

### T-B20-13. Trace types, capture and compare (pure)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-13, hardware twin (F-159), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-04 |
| Intent | Problem | The twin shows pin states now. It keeps no history and cannot say how far the board and the model differ |
| | Target user | Amar comparing a real LED pin and the simulated one |
| | User story | As a builder I see the simulated D13 level and the real D13 level as two lines on one time axis and a number for how far apart they are |
| | Expected behaviour | `Trace` holds timestamped samples from the sim or the board. `compareTraces` aligns two traces and returns per-sample deltas and a summary. `TraceRecorder` collects samples with a clock passed in. A summary can become a `BenchMeasurement` |
| | Success metric | Two identical digital traces shifted by 40 ms give `lagMs: 40` and zero value delta; a 5 percent analog offset gives mean delta 0.05 of full scale |
| Implementation | Existing files | `src/lib/hw/twin.ts:20-24` (`OUTPUT_HZ`, `ANALOG_INPUT_MS`, `DIGITAL_INPUT_MS`, `ANALOG_DEAD_BAND`), `:28-46` (`SimFrame`, `TwinSim`), `:55-68` (`TwinPin`, `TwinReport`), `src/lib/hw/board.ts:42` (`InputListener`), `src/lib/interp/world.ts` `PinView` |
| | New files | `src/lib/hw/compare.ts`, `src/lib/hw/capture.ts` |
| | Signatures | `compare.ts`: `export type TraceSource = 'sim' \| 'firmata-pins' \| 'serial-text';` `export interface Sample { tMs: number; value: number }` `export interface Trace { id: string; label: string; source: TraceSource; unit: string; kind: 'digital' \| 'analog' \| 'event'; samples: Sample[] }` `export interface TraceDelta { atMs: number; sim: number; measured: number; delta: number }` `export interface CompareSummary { n: number; meanAbs: number; maxAbs: number; lagMs: number \| null; edgesSim: number; edgesMeasured: number; withinTolerance: boolean }` `export function compareTraces(sim: Trace, measured: Trace, opts: { toleranceAbs: number; maxLagMs: number; stepMs: number }): { deltas: TraceDelta[]; summary: CompareSummary };` `export function toMeasurement(summary: CompareSummary, ctx: { id: string; at: string; by: string; target: BenchMeasurement['target']; simulated?: BenchMeasurement['simulated']; unit: string; instrument?: string; conditions?: string }): BenchMeasurement;` `capture.ts`: `export interface TraceRecorder { start(nowMs: number): void; push(id: string, v: number, nowMs: number): void; stop(): Trace[]; readonly running: boolean }` `export function createRecorder(meta: Record<string, { label: string; source: TraceSource; unit: string; kind: Trace['kind'] }>, caps?: { maxSamples?: number; maxMs?: number }): TraceRecorder;` `export function serialLinesToTrace(lines: readonly { tMs: number; text: string }[], pattern: RegExp, id: string): Trace;` |
| | Data model | Samples in ms from the recorder's start; sim samples converted from simulated ns by the caller. No document change |
| | Algorithm | `compareTraces`: resample both onto a `stepMs` grid by zero-order hold (digital and event) or linear interpolation (analog). `lagMs`: for `digital` traces, the lag in `[-maxLagMs, maxLagMs]` that minimises mismatched samples (ties pick the smaller absolute lag); `null` for analog. `meanAbs`, `maxAbs` over the grid after removing the lag. `withinTolerance` when `maxAbs <= toleranceAbs`. Edge counts are level changes. `createRecorder`: ring caps default 20,000 samples and 120,000 ms; the oldest samples drop and `stop()` reports the cap in a trace `label` suffix of nothing (no hidden data loss: a flag `truncated` is added to the returned trace as `Trace.truncated?: boolean`). `serialLinesToTrace`: first capture group parsed as a finite number, lines that do not match are skipped and counted |
| | Validation, errors | Empty trace gives `n: 0`, `withinTolerance: false`, `lagMs: null`. NaN samples are dropped. Non-monotonic time is sorted |
| | Edge cases | One sample; identical timestamps (last wins); very different durations (compare the overlap); `stepMs` larger than the span |
| | Permissions, performance | Pure; 20,000 samples compared in under 30 ms (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `compare.test.ts`: shift cases, offset case, tolerance edge, empty, NaN, non-monotonic, overlap only, event traces; `toMeasurement` field mapping. `capture.test.ts`: caps and `truncated`, order, `serialLinesToTrace` with matching and non-matching lines |
| | Integration, Playwright | T-B20-35 and T-B20-40 |
| | Fixtures | Inline generated traces |
| | Acceptance | Given a 40 ms shifted digital trace, When compared, Then `lagMs` is 40 and `maxAbs` is 0 |
| | Observability, release blockers | None. Blocker: wall-clock reads inside these files |
| Delivery | Definition of done | Both files, tests green |
| | Verify commands | `TL`; `V src/lib/hw/compare.test.ts src/lib/hw/capture.test.ts` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-35 |

---

### T-B20-14. Twin re-based on Studio sim frames; lab path kept through an adapter

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-14, hardware twin (Q6), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 (seam rows `boardlab-store` and `lab-dock`) |
| Intent | Problem | The twin drives and senses the real board from the Board lab's store. Today `twin.ts:8` imports `drivesFor` from `@/lib/boardlab/inputs` (a re-export of `src/lib/interp/lesson-world.ts:46`, VERIFIED at `src/lib/boardlab/inputs.ts:7`); `sim.ts:9-10` imports `@/lib/boardlab/engine` and `store`; `HardwareTwinPanel.tsx:14` imports `boardLabSim`. B13 does not delete the boardlab store: finding F4 (`B13-labs-robotics-drones.md:28`) and section 9 item 5 (`:1493`) keep it for the old board pages, the hardware twin and the board AI adapter. So the old Lab Dock still mounts the Hardware tab, and `LabDock.test.tsx:138-145`, `e2e/dock.spec.ts:29-32` and `e2e/dock-shared.ts:54` expect it. The Studio needs the same panel on a different source without breaking the lab path |
| | Target user | Amar with an Uno on the desk |
| | User story | As a builder I open the Hardware tab in Studio, connect my Uno, and the simulated pins follow the project I am running. The Hardware tab in the old Lab Dock still works |
| | Expected behaviour | A `TwinSim` over the Studio `SimHost` frames (`pins`, `serial`) in `studio-sim.ts`. `twin.ts` imports `drivesFor` from `@/lib/interp` and no longer touches the lab store. `HardwareTwinPanel` takes `{sim, boardId, inputsReady}` and imports nothing from `lib/boardlab`. `sim.ts` stays as the lab adapter. `LabDock.tsx` gets a thin component that builds the `BoardLabSim` from the lab store (loading the lesson inputs with `lessonInputs`, as the panel did) and passes `{sim, boardId, inputsReady}` to the panel (option a). Option (b): when seam row `boardlab-store` says no file outside `src/lib/boardlab/` imports it, `sim.ts` and `sim.test.ts` are deleted after `grep -rn "hw/sim" src` shows no importer, and `LabDock.tsx` is edited only if it still exists |
| | Success metric | `grep -rn "lib/boardlab" src/lib/hw/twin.ts src/lib/hw/studio-sim.ts src/components/hw` prints nothing; `sim.ts` is the only file in `src/lib/hw` that imports the lab store (option a); `twin.test.ts` (233 lines), `HardwareTwinPanel.test.tsx` (168 lines), `LabDock.test.tsx` and the dock specs pass |
| Implementation | Existing files | `src/lib/hw/twin.ts:8` (the import), `:41-46` (`TwinSim`), `:99` (`drivesFor(input, value, logicV)`), `:105-134` (`inputValue`), `:136` (`TwinBridge`); `src/lib/hw/sim.ts:68-108` (`BoardLabSim`, `boardLabSim`, `lessonInputs`); `src/components/hw/HardwareTwinPanel.tsx:14` (import), `:63` (`HardwareTwinPanel({lab, itemId, store}: LabDockProps)`), `:64-95` (builds the sim in an effect); `src/components/dock/LabDock.tsx:7,9,71,86` (`:86` mounts `<HardwareTwinPanel {...lab} />`); `src/components/dock/LabDock.test.tsx:138-145` (expects the hardware tab). PLANNED `SimHost`, `SimEv` frame `{pins: Record<string, 0\|1\|'Z'\|'X'>, parts, serial}` (T-B3-13), `PartState` |
| | New files | `src/lib/hw/studio-sim.ts` |
| | Edited files | `src/lib/hw/twin.ts` (one import line); `src/components/hw/HardwareTwinPanel.tsx`; `src/components/dock/LabDock.tsx`. `sim.ts` is not edited in option (a). Edited tests: `src/components/hw/HardwareTwinPanel.test.tsx`, `src/components/dock/LabDock.test.tsx`; `twin.test.ts` only if it mocks the old import path. Source files: 4 |
| | Signatures | `studio-sim.ts`: `export interface StudioSimSource { subscribe(fn: () => void): () => void; frame(): { running: boolean; pins: Readonly<Record<string, 0 \| 1 \| 'Z' \| 'X'>>; atNs: number }; setWorldInput(id: string, value: number): void; netOfBoardPin(pin: number): string \| undefined; inputs(): readonly WorldInput[] }` `export function studioSim(src: StudioSimSource, boardId: BoardId): TwinSim;` `HardwareTwinPanel`: `export function HardwareTwinPanel(props: { sim: TwinSim; boardId: BoardId \| null; inputsReady: boolean }): JSX.Element;` `LabDock.tsx`: `function LabHardware(lab: LabDockProps): JSX.Element` (not exported; builds the props and renders the panel) |
| | Algorithm | `studioSim`: map each Studio pin net level to `PinView` for the board pin number via `netOfBoardPin`; `getFrame()` builds the same `SimFrame` shape (`boardId`, `running`, `pins`, `inputs`, `inputsReady`) so `TwinBridge` is unchanged. `Z` and `X` levels map to "not driven" (the twin leaves the real pin as input). `LabHardware`: the effect that was in the panel (`HardwareTwinPanel.tsx:64-95`) moves here: `boardLabSim(store, boardId, lessonId !== null)`, `lessonInputs(...)`, `setInputs`, `twinSession.attach`. The panel itself only reads `sim`, so Studio and the lab give it the same props |
| | State transitions | Unchanged: `idle -> connecting -> connected` (`session.ts:13`) |
| | Validation, errors | A board id outside `TWIN_BOARDS` (`twin.ts:15`) still yields `compatible: false` |
| | Edge cases | Studio project with two boards: the twin follows the board the person picked; an unconnected pin is `Z`. Lab path: a lesson page keeps outputs off until its inputs have loaded (`inputsReady` false) |
| | Permissions, performance | Serial permission is unchanged; frames arrive at most 30 per simulated second (T-B3-13) |
| | Migration | `session.ts` is untouched here (T-B20-25 edits it in a later group). If `src/lib/interp` no longer exports `drivesFor` when this runs, the seam row names the new home and `twin.ts` imports from there |
| Verification | Unit tests | `studio-sim.test.ts`: levels map; `Z` is not driven; subscribe/unsubscribe. `HardwareTwinPanel.test.tsx` updated to the new props (all existing cases kept; the lab cases build the sim through the same helper `LabDock` uses). `LabDock.test.tsx` (`:138-145`) still finds the hardware tab with the flag on |
| | Integration | `V src/lib/hw src/components/hw src/components/dock`; the `grep` line above; `E e2e/dock.spec.ts` |
| | Acceptance | Given a connected `FakeSerialPort` Uno and a Studio Blink run, When D13 toggles in the sim, Then the fake receives the matching digital write within one bridge tick. Given the old Lab Dock with the hardware flag on, When it opens, Then the Hardware tab shows exactly as before |
| | Observability, release blockers | Existing `track("hw.connect")` stays. Blocker: `LabDock.test.tsx` or a dock e2e spec failing; a `lib/boardlab`, `lib/robotics` or `lib/dronelab` import left in `twin.ts`, `studio-sim.ts` or `src/components/hw` |
| Delivery | Definition of done | Panel on props, lab adapter in `LabDock.tsx`, tests green, `sim.ts` still present (option a) or deleted with the grep proof (option b) |
| | Verify commands | `TL`; `V src/lib/hw src/components/hw src/components/dock`; `E e2e/dock.spec.ts`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` hardware section; revert restores the panel's own sim construction |
| | Later tasks need | T-B20-35 (panel UI), T-B20-37b (Studio mount), T-B20-38 (reads the lab adapter) |

---

### T-B20-15. Netlist text and JSON, and SVG export of schematic and wiring diagram

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-15, export (F-210), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-04 |
| Intent | Problem | A builder wants the netlist as text, the schematic and a labelled wiring diagram as files to print, put in a notebook or a repository. No export exists (F-210 row: "No export exists") |
| | Target user | Amar printing the diagram for the bench |
| | User story | As a builder I press Export schematic and get an SVG that opens in a browser and prints on one A4 or Letter page |
| | Expected behaviour | `netlistJson` returns the netlist as stable JSON; `netlistText` returns `refdes.pin` per net; `schematicSvg` and `wiringDiagramSvg` serialise the existing view scene (T-B5-05, T-B4-10) to standalone SVG with a title, a date line and a legend; no script, no external reference |
| | Success metric | The JSON equals the document's `nets` as sets of sets (PDM 12.2 acceptance); the SVG parses as XML, has no `<script>`, no `href` to a URL, no `foreignObject` |
| Implementation | Existing files | PLANNED `netlist()` (T-B2-13), the schematic scene model in `src/studio/views/schematic*.ts` and breadboard overlay (T-B5-05, T-B4-10; exact names from the seam), `wiringCsv` (T-B5-10). Rules for SVG assets: PDM 13 (SVG sanitised and rendered via `<img>`) |
| | New files | `src/export/netlist-out.ts`, `src/export/svg-out.ts` |
| | Signatures | `netlist-out.ts`: `export interface NetlistJson { version: 1; project: string; nets: { id: string; name: string; class: string; pins: string[] }[] }` `export function netlistJson(doc: Project): NetlistJson;` `export function netlistText(doc: Project): string;` (lines `NET <name>: R1.1 U1.D13`, sorted) `svg-out.ts`: `export interface SceneLike { widthMm: number; heightMm: number; nodes: SceneNode[] }` (the minimal read-only shape of the T-B4-03 draw list; the seam row maps it) `export function sceneToSvg(scene: SceneLike, opts: { title: string; date: string; legend: string[]; theme: 'print' }): string;` `export function schematicSvg(doc: Project, view: View, scene: SceneLike, tr: Tr, now: string): Result<string, Diagnostic[]>;` `export function wiringDiagramSvg(doc: Project, view: View, scene: SceneLike, tr: Tr, now: string): Result<string, Diagnostic[]>;` |
| | Data model | None stored. The export record is made by T-B20-19's helper |
| | Algorithm | `netlistJson`: pins as `refdes.designator` strings, sorted; net order by id. `sceneToSvg`: fixed `viewBox` from the scene, print theme (black lines, white ground, no colour dependence: wire colour is also a text label), a `<title>` and `<desc>`, text through a small XML escape; a table of refdes to part names in the legend; wire colour names in text next to each wire. No `style` import, no font file; the generic `sans-serif` family. The browser's "Save as PDF" prints it (Q8): the module also returns a one-page print stylesheet string `printCss` for the dialog to inject |
| | Validation, errors | A scene with more than 5,000 nodes: `svg.too-big` (error) rather than a huge file. Non-finite coordinates are dropped and counted in a loss item |
| | Edge cases | A view with no placements gives an empty drawing with the legend; text with `<`, `&`, quotes and emoji is escaped; very long labels are truncated at 60 chars with an ellipsis |
| | Permissions, performance | 500 parts under 100 ms (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `netlist-out.test.ts`: JSON vs `nets` as sets of sets for the 3 examples; text golden; deterministic. `svg-out.test.ts`: well-formed XML (parse with `DOMParser` in jsdom), no `script`, `foreignObject`, `href`, `on*` attribute; wire colour text present; label escaping; a 5,001-node scene refused |
| | Integration | Visual comparison with the editor view for the 3 examples is a manual check in T-B20-42 (PDM 12.2 lists "visual diff against the editor view"); an automatic check counts nodes drawn equals nodes in the scene |
| | Acceptance | Given the Uno blink example, When I export the schematic, Then the SVG has the Uno, LED and resistor labels and every net name, and no external reference |
| | Observability, release blockers | Loss items. Blocker: any `<script>` or external reference |
| Delivery | Definition of done | Two modules, tests green, `PORT` clean (the module uses `DOMParser` only in its test) |
| | Verify commands | `TL`; `V src/export/netlist-out.test.ts src/export/svg-out.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` export section; revert |
| | Later tasks need | T-B20-27 (package), T-B20-36 (dialog) |

---

### T-B20-16. KiCad `.net` netlist export and import with loss report

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-16, interchange (F-211, R-187), B20 |
| | Priority, status, dependencies | P2, not started, T-B20-01, T-B20-03 verdict A PASS-kicad (else cancelled), T-B20-04 |
| Intent | Problem | A builder who also uses KiCad wants the nets in a file KiCad can read, and wants to bring a KiCad netlist in |
| | Target user | Amar moving a circuit between tools |
| | User story | As a builder I export a `.net` and read it in another tool; I import one and see which parts were mapped and which became placeholders |
| | Expected behaviour | `exportKicadNet` writes components (reference, value, library part name from the descriptor id) and nets (name, member `ref` and `pin`). `importKicadNet` returns a `KicadImport` of parts and nets plus `LossItem[]`; mapping to iynk parts is by value and name through the registry, unmapped parts become placeholders (R-028) |
| | Success metric | Export then import gives `pinSets` equal on 3 examples (R-187 acceptance). Footprints, placements, drawn wires, simulation and sources are reported as lost |
| Implementation | Existing files | `PROJECT_DATA_MODEL.md:1262-1290` (the KiCad row: preserved and lost lists), the spike report grammar notes, PLANNED `netlist()`, `pinSets` (T-B2-13), `LossItem` and `LOSS` (T-B5-10 `loss.ts`), `PartRegistry.get/latest/list/resolveLegacy` (T-B2-11, `B2-core-document-netlist.md:721`: `list()` returns `PartSummary {ref, version, name, category, tier, status, bytes, digest}` rows, which carry no `identity.legacy_ids`; `resolveLegacy(legacyId)` returns a ref and `get(ref, version)` returns the full descriptor) |
| | New files | `src/export/kicad-net.ts` |
| | Signatures | `export const KICAD_LOSS = { footprints: 'kicad.footprints-lost', placements: 'kicad.placements-lost', wires: 'kicad.wires-lost', sim: 'kicad.simulation-lost', sources: 'kicad.sources-lost', unmapped: 'kicad.part-unmapped', badPin: 'kicad.pin-unknown', tooBig: 'kicad.size-limit', depth: 'kicad.depth-limit' } as const;` `export function exportKicadNet(doc: Project, reg: Pick<PartRegistry, 'get'>, opts: { now: string; appVersion: string }): { text: string; loss: LossItem[] };` `export interface KicadPart { reference: string; value: string; libpart?: string; pins: string[] }` `export interface KicadNet { name: string; nodes: { ref: string; pin: string }[] }` `export interface KicadImport { parts: KicadPart[]; nets: KicadNet[]; mapped: { reference: string; ref: string; version: string }[]; loss: LossItem[] }` `export function importKicadNet(text: string, reg: Pick<PartRegistry, 'get' \| 'latest' \| 'list' \| 'resolveLegacy'>): Result<KicadImport, Diagnostic[]>;` |
| | Algorithm | Follows the grammar in the spike report. Writer: stable order, strings quoted and escaped, header comment with `now` and app version. Reader: a small S-expression tokenizer with depth cap 64 and size cap 5 MB (`kicad.size-limit`, `kicad.depth-limit`), no evaluation. Mapping: (1) `libpart` equal to a descriptor id: `reg.latest(libpart)`; (2) else `reg.resolveLegacy(libpart)` gives a ref and `reg.latest(ref)` the descriptor; (3) else by `value`: the name table (`resistor`, `led`, `capacitor`) is built once from `reg.list()` summaries (by `name` and `category`) and each hit is then loaded with `reg.get(ref, version)` to read the parameter that holds the value; (4) else unmapped. Pins map by `pin.designator` first, then pin id; unknown pin -> `kicad.pin-unknown` warning and the node is kept on the placeholder |
| | Validation, errors | Malformed input returns an error `Diagnostic` with the line and column |
| | Edge cases | Net names with spaces or quotes; unconnected nets (`unconnected-(...)`) are dropped with an info item; duplicate references are refused |
| | Permissions, performance | 2,000 parts under 200 ms (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `kicad-net.test.ts`: round trip on the three examples (set-of-sets equal); depth and size limits; quoting; unmapped placeholder; every loss code has a case; no fixture copied from KiCad output (fixtures written from the grammar; the test header says so) |
| | Acceptance | R-187: Given a project, When I export then import the `.net`, Then the netlist pin sets are equal |
| | Observability, release blockers | Loss list. Blocker: a fixture copied from KiCad output |
| Delivery | Definition of done | One module, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/kicad-net.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` formats table with "round trip tested on 3 projects; opening in KiCad not tested" unless Amar tests it (For Amar A6); revert |
| | Later tasks need | T-B20-28 (import hub, through an injected reader), T-B20-27 (package option, through an injected writer); neither imports `kicad-net.ts`, so both compile when this task is cancelled |

---

### T-B20-17. Wokwi `diagram.json` import (built only if T-B20-03 verdict B is PASS-wokwi)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-17, interchange (F-211, F-091), B20 |
| | Priority, status, dependencies | P2, not started, T-B20-01, T-B20-03 verdict B PASS-wokwi (else not built), T-B20-04 |
| Intent | Problem | A friend sends a Wokwi diagram. The builder wants the circuit as a project with a list of what could not come across |
| | Target user | Amar and friends who use Wokwi |
| | User story | As a builder I drop a `diagram.json`, see "6 parts mapped, 2 unknown, positions dropped", and get a project |
| | Expected behaviour | `importWokwi` reads parts and connections, builds nets by union-find over the connections, maps part types to iynk descriptors by a fixed table, and reports every loss |
| | Success metric | 10 diagrams written by the task from the documented shape map with every unmapped part listed; no part definition of Wokwi is copied (only the name table of type to iynk id, our own data) |
| Implementation | Existing files | Spike report B (the quoted format and terms), PDM 12.2 Wokwi row, PLANNED registry and netlist, `LossItem` |
| | New files | `src/export/wokwi-in.ts` |
| | Signatures | `export const WOKWI_LOSS = { position: 'wokwi.positions-lost', unmapped: 'wokwi.part-unmapped', attrs: 'wokwi.attrs-lost', sketch: 'wokwi.sketch-libs-lost', route: 'wokwi.routes-lost', tooBig: 'wokwi.size-limit' } as const;` `export interface WokwiImport { board?: string; parts: { id: string; type: string; mapped?: { ref: string }; attrs: Record<string, string \| number \| boolean> }[]; nets: { name: string; pins: { part: string; pin: string }[] }[]; loss: LossItem[] }` `export function importWokwi(text: string, reg: Pick<PartRegistry, 'latest'>): Result<WokwiImport, Diagnostic[]>;` `export const WOKWI_TYPE_MAP: Readonly<Record<string, string>>;` (our data: e.g. `wokwi-arduino-uno` -> `core.uno-r3`, `wokwi-led` -> `core.led-5mm`, `wokwi-resistor` -> `core.resistor`, `wokwi-pushbutton` -> the push button id; only ids that exist in the registry, checked by a test) |
| | Algorithm | Strict JSON parse with size cap 1 MB and depth cap 16; `connections` entries `[from, to, ...]` where each end is `partId:pinName`; union-find into nets; pins named like the part's pin designators map directly, others are looked up in a per-type pin-name table in the same file. Attributes with a numeric `value` for resistors map to the `ohms` parameter |
| | Validation, errors | Unknown version or shape -> error with the field path |
| | Edge cases | A connection to a part not listed; a duplicate id; pins on `$serialMonitor` (ignored with info) |
| | Permissions, performance | 1,000 connections under 50 ms |
| Verification | Unit tests | `wokwi-in.test.ts`: the 10 task-written diagrams; map test (every `WOKWI_TYPE_MAP` value exists in the registry); loss list per case; size cap; union-find case with three parts on one net |
| | Acceptance | Given a diagram with an Uno, an LED and a resistor wired D13 to resistor to LED to GND, When imported, Then the nets equal the Blink example's as pin sets |
| | Observability, release blockers | Loss list. Blocker: any text copied from Wokwi's part definitions |
| Delivery | Definition of done | One module, tests green; if verdict B is not PASS the task is closed as "not built" with the reason in the commit |
| | Verify commands | `TL`; `V src/export/wokwi-in.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md`; revert |
| | Later tasks need | T-B20-28 |

---

### T-B20-18. Flashing recipes (data) and flash steps

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-18, export (F-161), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-02, T-B20-04 |
| Intent | Problem | The descriptor has no field for how to put code on a board (COMMUNITY 8.9, ADR-0826). Without it the guide cannot say what to install or click. iynk does not make a flashable binary, so the steps must be honest about the toolchain being the person's |
| | Target user | Amar with each of the 12 boards |
| | User story | As a builder with a Pico I read: hold BOOTSEL, plug in, copy the MicroPython file once, then copy `main.py` |
| | Expected behaviour | A data file with one recipe per board family, each step citing a source and retrieval date. `flashSteps` turns a recipe, the project's firmware sources and libraries into `BuildStep`s of phase `program` plus a hex/source download list |
| | Success metric | The 12 boards of B5 each resolve a recipe; every step has `source` and `retrieved`; no step says the app flashed anything for a board without Web Serial support |
| Implementation | Existing files | COMMUNITY 8.9 table (lines ~800-830); `project.schema.json` `$defs.Firmware` (`language`, `entry`, `sources`, `libraries`), `$defs.LibraryDependency` (`name`, `version`, `ecosystem`), `$defs.Asset.role` includes `binary`; `component.schema.json` `software.environments[].libraries[].install`, `iynk_support`; the 12 board ids from T-B5-15 (`BOARD_PART_IDS`) |
| | New files | `src/export/flash-steps.ts`, `src/export/recipes.ts`, `src/export/data/recipes.json` (data, counts 1) |
| | Signatures | `recipes.ts`: `export interface RecipeStep { text: string /* English */; source: string; retrieved: string }` `export interface Recipe { id: string; tool: string; boards: string[]; sourceKinds: ('ino' \| 'py' \| 'v' \| 'hex' \| 'uf2')[]; steps: RecipeStep[]; notes?: string; webSerial?: 'optiboot-stk500' }` `export function recipeFor(boardPartRef: string): Recipe \| undefined;` `export function validateRecipes(data: unknown): Diagnostic[];` `flash-steps.ts`: `export interface FlashPlan { steps: BuildStep[]; downloads: { path: string; kind: 'source' \| 'hex'; assetId?: string }[]; webSerialBoard?: 'uno-r3' \| 'nano'; unsupportedLibraries: string[] }` `export function flashSteps(doc: Project, opts: { registry: Pick<PartRegistry, 'get'>; tr: Tr }): Result<FlashPlan, Diagnostic[]>;` |
| | Data model | `recipes.json`: one entry per row of the COMMUNITY 8.9 table: Arduino family (Uno R3, Nano, Mega-like not in scope), Uno R4 / ESP32 / ESP32-S3 / NodeMCU / Nucleo (board package), Pico family (BOOTSEL + MicroPython UF2 + `mpremote` or Thonny), micro:bit V2, Basys 3 and DE10-Lite (Vivado / Quartus, no bitstream promised), Pi 4 and 5 (copy script, install libs). The agent writes each step from the vendor's current documentation, fetched in this task, and records URL and retrieval date. A step it cannot source is dropped, not guessed |
| | Algorithm | `flashSteps`: board from `boards[0].definition.ref` -> `recipeFor`; sources from `boards[0].firmware.sources` (language decides the extension); libraries from `firmware.libraries` and `dependencies.libraries` with `version` (an unpinned library gets the loss note `unpinned`); a library flagged `iynk_support: 'unsupported'` in any placed descriptor is named. Steps: `program` phase, one per recipe step plus (a) "first power-up on a current-limited supply or a USB port with nothing attached" before the first upload (COMMUNITY 8.9), (b) the hex download if a `binary` asset exists, (c) "the hardware twin does not flash code" never appears as a flashing step. `webSerialBoard` is set only for `uno-r3` and `nano` and only when `RS-B20-1-stk500/REPORT.md` reads `Verdict: PASS-model` (T-B20-02, a dependency); the `webSerial` field of `recipes.json` is written only in that case, and `validateRecipes` fails if a recipe has `webSerial` while the verdict is not PASS-model |
| | Validation, errors | `validateRecipes` checks every step has `source` (https URL) and `retrieved` (ISO date), every board id in a recipe is a known board id, no step text contains `flash` for a board whose `webSerial` is absent unless the text is a vendor instruction (the check is a keyword list in the test, reviewed by hand) |
| | Edge cases | Project with two boards: one `FlashPlan` per board (array in the panel); no firmware sources (an FPGA with `.v`): sources listed with their constraint file; recipe missing for a board: a single step "no recipe yet for this board" with source `note` |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `recipes.test.ts`: all 12 boards resolve; `validateRecipes` on the shipped file and on 5 broken copies. `flash-steps.test.ts`: Uno Blink gives `webSerialBoard: 'uno-r3'`; Pico gives the BOOTSEL steps; library unpinned note; unsupported library named; a hex asset adds a download |
| | Acceptance | Given the Uno Blink project, When flash steps build, Then they name the board package, the port selection and upload, each with a source and date, and offer the sketch download |
| | Observability, release blockers | None. Blocker: a recipe step with no source or date |
| Delivery | Definition of done | Three files, tests green, recipes dated |
| | Verify commands | `TL`; `V src/export/recipes.test.ts src/export/flash-steps.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` recipes section with the refresh rule (steps are EXTERNAL and age); revert |
| | Later tasks need | T-B20-27, T-B20-33 |

---

### T-B20-19. BOM formats (CSV, Markdown, JSON) and the export record

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-19, export (F-160), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-10 |
| Intent | Problem | The BOM must leave the app as a file a shop, a spreadsheet and a person can read, with the safety notes that go with it, and it must be recorded in `exports[]` with its hash and what it lost |
| | Target user | Amar sending a parts list to a friend |
| | User story | As a builder I export `bom.csv` and `bom.md` and see the LiPo storage note in the Markdown |
| | Expected behaviour | Three formats from a `BomResult`. A failed totals check or a mains part refuses the export with a plain reason. The record helper returns an `ExportRecord` |
| | Success metric | CM-70 in the CSV; CM-69 note in the Markdown; same project and `now` give identical bytes twice; `record.sha256` equals the sha256 of the bytes |
| Implementation | Existing files | COMMUNITY 8.3 (formats table: fixed column order, UTF-8 no BOM, `\n`, RFC 4180); `project.schema.json` `$defs.ExportRecord`; PLANNED `lossCodes` (T-B5-10 `loss.ts`), `sha256Hex` (`src/core`) |
| | New files | `src/export/bom-format.ts`, `src/export/build-record.ts` |
| | Signatures | `bom-format.ts`: `export const BOM_COLUMNS: readonly CsvColumn<BomRow>[];` (order: `line,refdes,quantity,description,value,package,manufacturer,mpn,generic,specification,datasheet_url,lifecycle,fidelity,hazards,price,currency,price_kind,price_as_of,notes`) `export type BomRefusal = { kind: 'totals'; expected: number; got: number } \| { kind: 'mains'; parts: MainsRefusal['parts'] };` `export function bomCsv(result: BomResult, now: string): Result<string, BomRefusal>;` `export function bomMarkdown(result: BomResult, ctx: { title: string; now: string; appVersion: string; tr: Tr; reality?: string[] }): Result<string, BomRefusal>;` `export function bomJson(result: BomResult, now: string): Result<string, BomRefusal>;` `export function currencyExponent(currency: string): 0 \| 2 \| 3;` `export function minorToText(amountMinor: number, currency: string): string;` `build-record.ts`: `export function exportRecord(format: string, bytes: Uint8Array, ctx: { at: string; appVersion: string; revision: number; loss: readonly LossItem[] }): ExportRecord;` `export function mergeRecords(existing: readonly ExportRecord[], next: ExportRecord): ExportRecord[];` (keeps the newest 32) |
| | Data model | `price` cell is `minorToText` (decimal text from integer minor units using `currencyExponent`, the exponent table for the currencies with 0 or 3 decimals: JPY, KRW, VND 0; KWD, BHD, OMR 3; others 2; T-B20-22 imports it too); `price_kind` and `price_as_of` carry the label; a row without a price has empty price cells. `specification` is the list joined by `; `. `hazards` joined by space |
| | Algorithm | Refuse first: `result.check.ok === false` -> `totals`; `mainsRefusal(rows)` non-null -> `mains`. CSV via `toCsv`. Markdown: title, "This was produced from a simulation. It is a teaching model." line, table, "Not purchasable" section, "Warnings" section (each warning code to a `tr` key), "Reality gap" summary lines if given, "Safety notes" section from `HAZARD_NOTE_KEYS` of every hazard present (deduplicated, stable order), companions list. JSON: `{rows, notPurchasable, warnings, totals, generatedAt}` canonical order |
| | Validation, errors | Throws never; refusals are values |
| | Edge cases | 0 rows (header only); a description with a newline (quoted, newline kept in CSV; collapsed to a space in Markdown); a very long specification; a price with `pack` > 1 shows the pack in `notes` |
| | Permissions, performance, migration | None; 5,000 rows under 80 ms |
| Verification | Unit tests | `bom-format.test.ts`: header exact; golden CSV and Markdown for the three examples; CM-70 with a description `=HYPERLINK(...)`; CM-69 note present for a LiPo fixture and refusal for a mains fixture; totals refusal; `minorToText` table (JPY, USD, KWD); determinism; no `validated` in output. `build-record.test.ts`: sha256, 32 cap, loss codes cut to 64 chars and at most 64 |
| | Integration, Playwright | T-B20-40 downloads `bom.csv` |
| | Fixtures | A LiPo part fixture (inline descriptor with `hazard:lipo`) and a mains fixture; the three examples |
| | Acceptance | CM-69: Given a project with a part tagged `hazard:lipo`, When I export a BOM, Then the Markdown carries the LiPo notes. Given `hazard:mains`, Then the export is refused with the explanation. CM-70 as above |
| | Observability, release blockers | `ExportRecord.loss` codes. Blocker: a CSV that starts a cell with `=` |
| Delivery | Definition of done | Both modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/bom-format.test.ts src/export/build-record.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` column table; revert |
| | Later tasks need | T-B20-27, T-B20-31, T-B20-36 |

---

### T-B20-20. Assembly checklist, bench test steps, guide text formats

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-20, export (F-161), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-11 |
| Intent | Problem | The step list is half a build guide. A builder needs checks (polarity, shorts, current at first power) and a bench version of the saved simulation checks, in a form that prints and exports as text |
| | Target user | Amar before applying power for the first time |
| | User story | As a builder I tick "no supply is shorted to ground: continuity reads open" before I plug in USB |
| | Expected behaviour | `buildChecklist` makes the 8.10 list. `benchSteps` maps saved `tests[].checks[]` of physical kinds to bench steps and counts the rest. `guideMarkdown` and `guideText` render guide, checklist and bench steps with `- [ ]` boxes, wire colour as text, A4 and Letter safe |
| | Success metric | A project with 3 supplies gets exactly the polarity and no-short items for each; the current item uses 1.5 times the solver worst case when given and says "unknown, watch for heat" when not (HYPOTHESIS: 1.5 is a sensible margin, COMMUNITY 8.10) |
| Implementation | Existing files | COMMUNITY 8.10, 8.11 (tables); `project.schema.json` `$defs.TestCase`, `$defs.Check` kinds (VERIFIED list: `runs`, `serial`, `pin-level`, `pin-toggles`, `pwm`, `tone`, `servo`, `responds`, `code`, `state`, `node-voltage`, `supply-current`); `component.schema.json` `pin.polarity`, `compatibility.rules[].kind = 'jumper_state'`, `software.environments[].libraries[].iynk_support` |
| | New files | `src/export/checklist.ts`, `src/export/bench-tests.ts`, `src/export/guide-format.ts` |
| | Signatures | `checklist.ts`: `export interface ChecklistItem { id: string; text: string; source: 'netlist' \| 'descriptor' \| 'note' \| 'bom' \| 'solver'; hazards?: Hazard[] }` `export function buildChecklist(doc: Project, ctx: { registry: Pick<PartRegistry, 'get'>; tr: Tr; bom: BomResult; guide: Guide; supplyMaxA?: number }): ChecklistItem[];` `bench-tests.ts`: `export interface BenchStep { testId: string; checkId: string; text: string }` `export function benchSteps(tests: readonly TestCase[], doc: Project, tr: Tr): { steps: BenchStep[]; omitted: number };` `guide-format.ts`: `export function guideMarkdown(g: { guide: Guide; checklist?: ChecklistItem[]; bench?: BenchStep[]; omitted?: number; title: string; now: string }, tr: Tr): string;` (a section whose input is absent is left out; the panel's combined export passes all three, the package's `wiring.md` passes the guide only) `export function guideText(sameArgs): string;` |
| | Algorithm | Checklist order: power off and nothing plugged in (note); polarity per polarised pin (`polarity`) of every placed part, text "stripe or long leg towards <net>" (descriptor); no two supply nets joined and each supply to ground continuity open (netlist; at most 20 net checks, power and ground first); resistor values: bands or meter against the BOM value (bom); first-power current: `supplyMaxA * 1.5` if given, else the board's `power.inputs[].current` rating if the descriptor has one, else "unknown, watch for heat" (solver / descriptor); no component hot after 10 seconds (note); build options: every `jumper_state` rule of the placed descriptors (descriptor); libraries flagged unsupported (descriptor). Bench steps: `pin-level`, `pin-toggles`, `pwm` -> "Measure pin <designator> with a multimeter or logic probe; expect <level, period or duty> after <t>"; `serial` -> "Open the serial monitor at <baud>; expect a line matching <pattern>" (baud from the sketch if known, else "the baud your sketch sets"); `node-voltage`, `supply-current` -> "Measure between <net> and ground; expect <min> to <max>"; `servo`, `tone` -> "Expect the servo at <deg> or a tone near <hz>"; `code`, `runs`, `state`, `responds` -> omitted and counted. `guide-format`: the numbered list with `n. [ ]` boxes, then the checklist, then the bench steps, then "N checks have no bench equivalent" |
| | State transitions | None |
| | Validation, errors, edge cases | A test whose pin is not in the netlist is skipped and counted as omitted with a warning in the Markdown. Zero polarised parts gives no polarity item. Mixed units: voltage in V, current in mA |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `checklist.test.ts`: the 3 examples; 3 supplies; current item three ways; jumper item from the L298N descriptor example; unsupported library item. `bench-tests.test.ts`: one case per mapped kind and one per omitted kind; omitted count. `guide-format.test.ts`: golden Markdown and text for the Blink example, once with all sections and once with the guide only; wire colour present as word; no `validated`; line width not relied on |
| | Acceptance | Given a project with an LED and two supplies, When the checklist builds, Then polarity of the LED and a no-short check for each supply appear, each with a source |
| | Observability, release blockers | None. Blocker: a bench step for a check kind that has no physical meaning |
| Delivery | Definition of done | Three modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/checklist.test.ts src/export/bench-tests.test.ts src/export/guide-format.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md`; revert |
| | Later tasks need | T-B20-20b, T-B20-27, T-B20-33 |

---

### T-B20-20b. Package text renderers: flash, checklist, tests, README

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-20b, export (R-181, R-185), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-18, T-B20-20 |
| Intent | Problem | T-B20-27 writes `flash.md`, `checklist.md`, `tests.md` and `README.md`. T-B20-18 returns `BuildStep[]` only, and T-B20-20's `guideMarkdown` makes one combined file. No task renders those four files, and the package task is already sized L |
| | Target user | Amar reading the package at the bench |
| | User story | As a builder I open `flash.md` and see each recipe step with its source and date, and `README.md` starts with the teaching-model sentence |
| | Expected behaviour | Four pure functions, each returns Markdown text. Every word goes through `tr`. Lists use `- [ ]` boxes where a person ticks |
| | Success metric | Golden output for the Blink example for each function; README line 1 exact; same input and `now` give the same bytes; the word `validated` never appears |
| Implementation | Existing files | None edited. Types: `FlashPlan`, `RecipeStep` (T-B20-18), `ChecklistItem`, `BenchStep` (T-B20-20, T-B20-04), `FidelityTier` (T-B20-04). Keys: `flash.*`, `check.*`, `bench.*`, `export.readme.*` (T-B20-05) |
| | New files | `src/export/package-text.ts`; `package-text.test.ts` |
| | Signatures | `export interface TextCtx { title: string; now: string; appVersion: string }` `export function flashMarkdown(plans: readonly { board: string; plan: FlashPlan }[], ctx: TextCtx, tr: Tr): string;` `export function checklistMarkdown(items: readonly ChecklistItem[], ctx: TextCtx, tr: Tr): string;` `export function testsMarkdown(bench: { steps: readonly BenchStep[]; omitted: number }, ctx: TextCtx, tr: Tr): string;` `export interface ReadmeInput { lowestTier: FidelityTier; files: readonly string[]; hasFirmware: boolean; hasTests: boolean }` `export function readmeText(input: ReadmeInput, ctx: TextCtx, tr: Tr): string;` |
| | Algorithm | `flashMarkdown`: heading `flash.title`; per board a heading, numbered steps each followed by `(source: <url>, retrieved <date>)`, the downloads list, unsupported libraries by name, the `flash.englishOnly` note; no plan or no firmware: the single line `flash.noFirmware`. `checklistMarkdown`: heading `check.title`, one `- [ ]` line per item with its source word, hazard note keys of the item's hazards. `testsMarkdown`: heading `bench.title`, numbered `- [ ]` steps, then `bench.omitted` with the count; no steps: `bench.none`. `readmeText`: line 1 is `tr('export.readme.line1')` (This was produced from a simulation. It is a teaching model. Read reality-gap.md before connecting power.), then `export.readme.line2`, `export.readme.tiers` with the lowest tier, `export.readme.date` with `now`, `export.readme.version` with `appVersion`, and the file list in the order given. Text from the project (step text, titles) is escaped at line start for `#`, `-`, `>`, `\|` and backticks by one internal `mdEscape` |
| | State transitions | None |
| | Validation, errors, edge cases | Empty lists give the empty-state line, never an empty heading. A title with a newline is collapsed to one line. A step source that is not an https URL is printed as text |
| | Permissions, performance, migration | None; portable; under 20 ms for 200 steps |
| Verification | Unit tests | `package-text.test.ts`: golden `flash.md` for the Uno Blink plan and the Pico plan; golden `checklist.md` and `tests.md` for the Blink example; empty cases; README line 1 exact and file list order; `mdEscape` cases (`# x`, `- x`, `\| x`); determinism; no `validated`; every `tr` key it uses is in `en/buildit.json` (the T-B20-05 key test) |
| | Acceptance | Given the Blink project, When `readmeText` runs, Then line 1 is the teaching-model sentence and the file list matches the argument. Given a plan with no firmware, Then `flash.md` says so |
| | Observability, release blockers | None. Blocker: a literal English string in the module |
| Delivery | Definition of done | One module, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/package-text.test.ts`; `PORT`; `ARCH`; `I18N` |
| | Docs, rollback | `docs/BUILD_IT.md` package contents; revert |
| | Later tasks need | T-B20-27, T-B20-39 |

---

### T-B20-21. Price model: kinds, totals, budget, catalogue prices

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-21, export (F-155), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 (seam rows `quad5-project` and `drone-content-prices`, Q10), T-B20-10 |
| Intent | Problem | Prices must have a kind and a date, never be live unless the person asked, and add up exactly. The catalogue estimates today live in drone content as floats. Money must be integer minor units |
| | Target user | Amar choosing a quad within a budget |
| | User story | As a builder I open Prices and read "catalogue estimate, not live, entered 2026-10-27, USD 346.00" without any network call |
| | Expected behaviour | `priceRows` attaches a price to each BOM row in the order typed, catalogue, then (separately shown) live. `budgetSummary` totals purchasable lines, counts unpriced rows, says "at least X, N lines unpriced", and names the amount over budget and the three most expensive rows |
| | Success metric | CM-63 (model half): the converted quad5 project's default build totals 34,600 minor units (346.00 USD) |
| Implementation | Existing files | `src/content/drones/quad5.ts:93-116` (prices), the 12 other `src/content/drones/*.ts` (same fields; present only while seam row `drone-content-prices` says so), the converted quad5 project `prj_drone-quad5` (seam row `quad5-project`, B13 output; the row names its loader), `src/lib/search/cost.ts:8-20` (`lineCost`, `sumMoney`), `src/lib/search/optimize.ts:157-186` (`priceLines`, `costRange`; drone optimiser stays in B19), COMMUNITY 8.6, 8.7 |
| | New files | `src/export/prices.ts`, `src/export/catalogue-prices.ts` |
| | Signatures | `catalogue-prices.ts`: `export interface CataloguePrice { match: { legacyId: string; params?: Record<string, string \| number \| boolean> }; amountMinor: number; pack?: number; currency: 'USD'; enteredOn: string; origin: string /* file:line of the old figure */ }` `export const CATALOGUE_PRICES: readonly CataloguePrice[];` `export const CATALOGUE_NOTE: 'catalogue estimate, not live';` `export function catalogueFor(d: Pick<Descriptor, 'identity'>, params: Readonly<Record<string, ParamValue>>): CataloguePrice \| undefined;` `prices.ts`: `export interface PricedRow { row: BomRow; price?: BomPrice; lineMinor?: number; offerNote?: string }` `export function priceRows(rows: readonly BomRow[], inputs: BuildInputs, catalogue: typeof catalogueFor, lookup: (r: BomRow) => Descriptor \| undefined, live?: ReadonlyMap<string, LiveOffer>): PricedRow[];` `export interface LiveOffer { amountMinor: number; pack?: number; currency: string; listingUrl: string; seller?: string; fetchedAt: string }` `export function lineMinor(quantity: number, price: Pick<BomPrice, 'amountMinor' \| 'pack'>): number;` `export interface BudgetSummary { totalMinor: number; unpriced: number; priced: number; atLeast: boolean; currency: string; overBy?: number; top3: { bomKey: string; lineMinor: number }[]; cannotJudge: boolean }` `export function budgetSummary(rows: readonly PricedRow[], inputs: BuildInputs): BudgetSummary;` |
| | Data model | Catalogue amounts are integers: `price * 100` from the old floats via the rule `Math.round(x * 100)`, written out as literals by the task and verified by the test against the old content. Entries keyed by `identity.legacy_ids` (Q10): `FRAME`, `ESC`, `FC`, `CAM`, `VTX`, `RX`, `XT60`, `TOP`, `STRAP`, and the battery, motor and propeller options. Props use `pack: 2` where the content says `propPrice === 'pair'` (quad5 default: 2 pairs at 4 USD = 800 minor) |
| | Algorithm | `priceRows`: for each purchasable row, `user` if `lines[bomKey].priceMinor` set (`pack` 1, `source` the `priceNote` or "your price"), else `catalogue` if `catalogueFor` finds an entry (`asOf` = `enteredOn`), else none. A live offer, if given, is attached as `offerNote` text and does not replace the price (follows COMMUNITY's order literally; open question OQ3). `lineMinor`: `Math.ceil(quantity / (pack ?? 1)) * amountMinor`. `budgetSummary`: integer sums only; rows in another currency are counted as `unpriced` (never converted); `atLeast` when any purchasable row is unpriced; `top3` by `lineMinor` descending, tie by `bomKey`; `cannotJudge` when fewer than half the purchasable rows are priced |
| | Validation, errors | A negative or non-integer amount in the catalogue fails the module's own test. A `catalogueFor` with two matches is a test failure (unique match) |
| | Edge cases | Quantity 0 (skip or have): `lineMinor` 0 and the row is priced but adds nothing; budget unset: no `overBy`; budget zero: over by the total |
| | Permissions, performance, migration | None. Old float data in drone content is left for B13's own cleanup; a note in the test explains the copy and that one of the two is deleted when the drone content is removed |
| Verification | Unit tests | `catalogue-prices.test.ts`: when seam row `drone-content-prices` is present, every drone content file's `price` fields equal the catalogue entry (reads `src/content/drones/*.ts` by a direct import list); when it is absent (B13 or B18 moved or removed the figures) the test reads the literals written in the test file instead: FRAME 39, ESC 45, FC 39, CAM 25, VTX 30, RX 18, XT60 4, TOP 8, STRAP 4 (fixed parts 212), battery `6s1100` 38, motor `2306-1750` 22 (times 4 = 88), prop `5x4.3x3` 4 per pair (2 pairs = 8), total 346 (VERIFIED against `quad5.ts:93-116` and `optimize.test.ts:154`, `:197`); entries unique by key; all integers; dates valid. `prices.test.ts`: order typed-over-catalogue; `lineMinor` with pack 2 and quantity 3; quad5 default total 34,600; unpriced count; "at least"; over-budget and top 3 with tie; other currency not converted; `cannotJudge` |
| | Integration | `V src/export` with the converted quad5 project `prj_drone-quad5`, loaded by the loader that seam row `quad5-project` names, and its BOM from `buildBom` |
| | Acceptance | CM-63: Given a migrated drone, When I open Prices without a key, Then catalogue prices show with date and "not live", and the quad5 total equals 346.00. (No-network half is in T-B20-40) |
| | Observability, release blockers | None. Blocker: a float anywhere in money code; a price shown without a kind |
| Delivery | Definition of done | Both modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/prices.test.ts src/export/catalogue-prices.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` price kinds; revert |
| | Later tasks need | T-B20-22, T-B20-32 |

---

### T-B20-22. Price check logic: cost first, cache, matching, errors

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-22, export (F-154), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-06, T-B20-07, T-B20-19, T-B20-21 |
| Intent | Problem | Audit C027: the key had 0 of 250 searches left, a cold view cost 32 to 54 searches, and the panel called a spent budget a rate limit. A price check must be a button, say its cost first, reuse results, and name failures correctly |
| | Target user | Amar with a limited search key |
| | User story | As a builder I tick 12 rows, read "This will use up to 12 searches", press Check, and a second press an hour later costs nothing |
| | Expected behaviour | `selectRows` picks the default rows (12 most expensive unpriced purchasable, cap 24). `costNotice` gives the number of searches. `runPriceCheck` takes the rows, reads the cache, calls search for the rest in batches of 5 (one source per row, `google_shopping`), stores results and returns listings, errors and counts |
| | Success metric | CM-64: 12 ticked rows -> notice says 12, calls are 12 or fewer; again within 6 hours -> 0 calls. CM-65: quota answer -> `quota_exhausted` outcome |
| Implementation | Existing files | `src/lib/search/client.ts:43` (`fetchOffers`; after T-B20-06 the codes), `src/lib/search/schema.ts:13-28` (`offerPartInput {key, query, qty, pack?, sources?}`), `src/lib/search/bom.ts:31-40` (`offerParts`, `LIGHT`), `src/lib/search/types.ts:8-35` (`Offer`, `PartOffers`, `OffersResponse`), `src/lib/search/cost.ts`, `src/components/search/RealBuildPanel.tsx:92-125` (`useOffers`: batches of 5, 2 in parallel, the pattern to keep) |
| | New files | `src/export/price-check.ts` |
| | Signatures | `export const MAX_SELECTED = 24; export const DEFAULT_SELECTED = 12; export const BATCH = 5;` `export function queryFor(row: BomRow): string;` `export function defaultSelection(rows: readonly PricedRow[]): string[];` `export function costNotice(selectedKeys: readonly string[], sourcesPerRow?: number): { searches: number };` `export type CheckOutcome = { kind: 'ok'; listings: Map<string, ListingRecord[]>; searches: number; fromCache: string[]; fetchedAt: string } \| { kind: 'error'; code: 'no_key' \| 'quota_exhausted' \| 'rate_limited' \| 'invalid_key' \| 'timeout' \| 'failed'; partial: Map<string, ListingRecord[]>; searches: number };` `export interface CheckDeps { fetchOffers(input: { parts: OfferPartInput[] }, signal?: AbortSignal): Promise<{ ok: true; data: OffersResponse } \| { ok: false; code: string }>; checks: PriceChecks; now: string; region: string; hasKey: boolean; sha256Hex(s: string): string }` `export function runPriceCheck(deps: CheckDeps, rows: readonly BomRow[], selectedKeys: readonly string[], signal?: AbortSignal): Promise<CheckOutcome>;` `export function titleMatches(listing: ListingRecord, row: BomRow): boolean;` `export function lowestListing(listings: readonly ListingRecord[], row: BomRow, quantity: number, currency: string): { listing: ListingRecord; lineMinor: number } \| undefined;` |
| | Data model | Cache key `sha256(queryText)` + `:` + region. Listing URL is kept exactly as returned (CM-66). Prices converted to minor units by `Math.round(price * 100)` (currency exponent from `currencyExponent`, exported by `bom-format.ts`, T-B20-19) |
| | Algorithm | `queryFor`: non-generic with `mpn` -> `"<manufacturer> <mpn>"`; generic -> `"<value><unit> <package> <description>"` trimmed to 160 characters (the schema limit `videosInput q` is 160; offers `query` limit per `offerPartInput`, read it). `defaultSelection`: purchasable rows without a `user` price, by `lineMinor` descending (rows with catalogue price first, then unknown price by quantity), cap 12. `runPriceCheck`: `hasKey` false -> `{error: 'no_key'}` and zero calls; for each selected row look up the cache (`getFresh`, ttl 6 h); for misses make batches of 5 with `sources: ['google_shopping']`; after each batch store rows (`put`); stop on the first error code but return the partial results and the codes `quota_exhausted` / `rate_limited` / `invalid_key` / `timeout` / `failed` unchanged. `titleMatches`: the title contains the `mpn` (case-insensitive, punctuation-insensitive) or, for a generic part, contains the value and the package word; otherwise the panel dims the listing. `lowestListing`: only listings in the project currency and with `titleMatches`; cost by `ceil(quantity / (listing.pack ?? 1)) * price`; ties by price then URL; never called "cheapest" |
| | State transitions | `idle -> costShown -> running -> done \| error` lives in the dialog (T-B20-32) |
| | Validation, errors | More than `MAX_SELECTED` selected: the first 24 and a flag in the outcome `capped: true`. Aborted signal: stops after the batch, returns partial, no error |
| | Edge cases | A row already priced by the user is not selected by default; the same query twice in one press is one search; zero selected -> no call; provider returns fewer parts than asked |
| | Permissions | Key is added by the client wrapper from B1/B14 (`withSearchAuth`); this module never reads it |
| | Performance, migration | Batches of 5, 2 in parallel as today (`RealBuildPanel.tsx:91-92`) |
| Verification | Unit tests | `price-check.test.ts` with a stub `fetchOffers` that counts calls and parts: CM-64 (12 rows -> at most 12 parts requested, second run 0 calls, fresh at 5 h 59 m, expired at 6 h 1 m); CM-65 (stub returns `quota_exhausted` -> outcome code, partial kept); no-key -> 0 calls; 30 selected -> capped at 24; `titleMatches` table; `lowestListing` with a pack of 4 and a foreign-currency listing; an `AbortSignal` mid-run |
| | Integration | T-B20-40 asserts zero calls without a key and zero on the second press |
| | Fixtures | A recorded-shape offers response in `src/lib/server/search/__fixtures__/` is read (not changed). The "sponsored" flag question is answered by a test that scans the SerpApi fixtures for an ad flag and prints `sponsored flag present: yes/no`; the panel shows the "ad" label only if the answer is yes (UNKNOWN until the test runs) |
| | Acceptance | CM-64 and CM-65 as in Intent |
| | Observability, release blockers | Returns `searches` so the dialog can show use. Blocker: a call on open, on a timer, or without the notice |
| Delivery | Definition of done | One module, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/price-check.test.ts src/lib/search`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` prices section (cost control table); revert |
| | Later tasks need | T-B20-32 |

---

### T-B20-23. Substitutes engine and the swap proposal

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-23, export (F-212), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 (seam rows Q7, static rules), T-B20-10 |
| Intent | Problem | A part is out of stock or over budget. The builder wants pin-compatible alternatives with the differences stated. The component schema has no `alternatives` field, so candidates are computed from descriptors and never asserted by hand (COMMUNITY O-7) |
| | Target user | Amar swapping an LED or a sensor breakout |
| | User story | As a builder I ask for substitutes for a 10 kohm resistor and see only parts that pass the five tests, each with its differences and fidelity tier, and I review the swap before it applies |
| | Expected behaviour | `findSubstitutes` returns candidates that pass tests 1 to 5 of COMMUNITY 8.5, with a result class and a list of differences in plain words. `substituteProposal` turns one into a schema `Proposal` (steps with `dep.set` then `component.swap`) for the B15 review and accept path. Nothing is applied by this module |
| | Success metric | CM-67: a resistor with a pinned part gives only candidates passing tests 1 to 5, each with differences and tier; applying one creates a reviewable `component.swap` proposal |
| Implementation | Existing files | COMMUNITY 8.5; `project.schema.json` `$defs.Op` `component.swap {id, definition, pinMap}` (pinMap required), `dep.set {dependency}`, `$defs.Proposal` (required `id, base, author, steps, status`; steps max 12, ops max 40); `component.schema.json` `pins`, `ratings`, `compatibility.rules`, `dimensions.package`, `software.environments`; PLANNED `PartRegistry.list/get`, `interfaceOf`, `digestOf` (T-B2-11), static rules runner (T-B10-17/T-B10-24; seam), `acceptProposal` and `DiffView` (T-B15-04, T-B15-05; seam) |
| | New files | `src/export/substitutes.ts`, `src/export/substitute-proposal.ts` |
| | Signatures | `substitutes.ts`: `export type SubstituteClass = 'drop-in' \| 'drop-in-with-changes' \| 'needs-rewire';` `export interface Substitute { candidate: { ref: string; version: string }; class: SubstituteClass; differences: string[]; fidelity: { tier: FidelityTier; status: string }; lowerTier: boolean; pinMap: Record<string, string>; passed: [boolean, boolean, boolean, boolean, boolean] }` `export interface SubstituteCtx { registry: Pick<PartRegistry, 'list' \| 'get'>; exercised?: { volts?: Record<string, number>; amps?: Record<string, number> }; margin?: number; staticRules(doc: Project): { errors: string[] }; apply(doc: Project, ops: Op[]): Result<Project, Diagnostic[]>; tr: Tr }` `export function findSubstitutes(doc: Project, componentId: string, ctx: SubstituteCtx): Result<{ shown: Substitute[]; rejected: { ref: string; failed: number[] }[] }, Diagnostic[]>;` `substitute-proposal.ts`: `export function substituteProposal(doc: Project, componentId: string, s: Substitute, ctx: { id: string; base: number; actor: string; interfaceOf(ref: string, version: string): InterfaceSnapshot; digestOf(ref: string, version: string): string }): Result<Proposal, Diagnostic[]>;` |
| | Data model | Proposal: `{id: 'prp_...' (caller), base: doc.revision, author: {actor}, status: 'open', rationale: 'Swap <refdes> ...' , steps: [{id: 's1', label, ops: [dep.set, component.swap]}]}`; no `author.model` (not AI). `dep.set` carries `{ref, version, origin: 'library' or 'builtin', digest, interface}` |
| | Algorithm | Candidates from the registry list (pinned dependencies, local library, shipped parts). Test 1: same `identity.kind` and `category`. Test 2: pin compatibility: build `pinMap` mapping every pin that is connected in the project to a candidate pin, by `designator` first, then by name, then by `{type, class}` unique match; fail if any connected pin has no target; `class` is `drop-in` only when the map is the identity and designators match; otherwise `needs-rewire`. Test 3: for ratings with `role: 'abs_max'` and `measure` `voltage` or `current` on the candidate, the exercised value times `(1 + margin)` (default 0.2) must not exceed the candidate's `manufacturer` value; with no exercised data the test passes and adds the difference "ratings not checked: no run" (honest, not a silent pass). Test 4: apply the swap on a copy with `ctx.apply`, run `ctx.staticRules` on both, fail if the copy has an error the original lacks. Test 5: equal `dimensions.package`, else pass with the difference listed. Differences also list: changed purchase parameters, different libraries (`software.environments[].libraries[].name`), different `compatibility.rules` ids, lower tier (`lowerTier` true when the tier order T0 < T1 < T2 < T3 puts the candidate below the current part; `none` is lowest). `drop-in-with-changes` when tests pass and any difference besides identical-package exists |
| | State transitions | None; proposal states belong to B15 |
| | Validation, errors | Component not found: error. More than 20 shown: the first 20 by (class order, fewer differences, ref) and a note |
| | Edge cases | The part is a board (role `board`): refused with `substitutes.boards-not-supported` in v1 (swapping a board moves the firmware; out of scope); virtual parts: no substitutes; a candidate equal to the current part is skipped |
| | Permissions, performance | 200 candidates under 300 ms (each test 4 applies a copy; ESTIMATED; applied lazily only to candidates passing 1 to 3) |
| | Migration | None |
| Verification | Unit tests | `substitutes.test.ts`: resistor 10k pinned: candidates are other resistor descriptors only (an LED is rejected at test 1); a candidate with different pin count rejected at test 2; a candidate with `abs_max` current below the exercised value rejected at test 3 (with `exercised`), and passes with the note when `exercised` is absent; a candidate whose rules raise a new error rejected at test 4; package difference listed; `lowerTier` flag; class assignment for three cases; deterministic order. `substitute-proposal.test.ts`: the proposal validates against the `Proposal` schema (Ajv from T-B2-04); ops apply to a copy and the netlist pin sets are equal except for the swapped part's mapped pins; `dep.set` precedes `component.swap` |
| | Integration | `V src/export` with the registry holding the 9 example descriptors plus 3 invented resistor variants written for the test |
| | Acceptance | CM-67 |
| | Observability, release blockers | `rejected` list with failed test numbers (the dialog can say "why not"). Blocker: a proposal that applies without review |
| Delivery | Definition of done | Both modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/substitutes.test.ts src/export/substitute-proposal.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` substitutions with the limits (cannot know stock); revert |
| | Later tasks need | T-B20-31 |

---

### T-B20-24. Reality gap model: five sections, bench measurements

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-24, export (F-162, F-163), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-08, T-B20-09, T-B20-10 |
| Intent | Problem | Over-trust is the danger of a build from a simulation. The page must say what was checked on a bench, what is simulated only, what was assumed, which specs are uncertain, and what risks remain, and must never say "validated" |
| | Target user | Amar before powering a real board |
| | User story | As a builder I read "Nothing in this project has been checked against hardware" and a list of the things I should check by hand |
| | Expected behaviour | `buildReality` returns five sections from the BOM, the descriptors, the fidelity registry, the project's inputs and an optional solver summary. `measurementRows` gives measured, simulated, delta and within-tolerance for each bench measurement. Top line: the lowest tier and the number of unmeasured things |
| | Success metric | CM-68: five sections always exist; an empty measurement list reads "not checked against hardware"; the word "validated" never appears. CM-71: a measurement with a simulated value shows its delta and nothing is sent anywhere |
| Implementation | Existing files | COMMUNITY 8.12 (five questions and the severity ladder), BRIEF 17.1 (via COMMUNITY), `component.schema.json` `simulation.{tier,status,what_it_models,not_modelled,known_gaps,validity}`, `ratings[].simulation` (`confidence`, `rationale` via `$defs.assumed`), `identity.{generic,lifecycle,tags}`, `compatibility.rules`; PLANNED fidelity registry reader (B8/B9; seam), `BenchMeasurement` (T-B20-04) |
| | New files | `src/export/reality.ts`, `src/export/measurements.ts` |
| | Signatures | `measurements.ts`: `export interface MeasurementRow { m: BenchMeasurement; delta?: number; deltaPercent?: number; tolerancePercent: number; within?: boolean }` `export function measurementRows(ms: readonly BenchMeasurement[], tolerancePercent?: number): MeasurementRow[];` (default 5 percent, PROPOSAL) `export function emptyMeasurement(id: string, at: string, by: string): BenchMeasurement;` `reality.ts`: `export type Severity = 'must-read' \| 'check' \| 'note';` `export interface RealityItem { text: string; severity?: Severity; partRef?: string; refdes?: string }` `export interface Reality { lowestTier: FidelityTier; unmeasured: number; s1Measured: MeasurementRow[]; s2SimulatedOnly: RealityItem[]; s3Assumptions: RealityItem[]; s4Uncertain: RealityItem[]; s5Risks: RealityItem[]; check: string[] /* parts the tags cannot classify */ }` `export interface RealityCtx { registry: Pick<PartRegistry, 'get'>; bom: BomResult; inputs: BuildInputs; tr: Tr; now: string; solver?: { supplyWorstCaseA?: number; supplyRatingA?: number; lastRunHash?: string }; fidelityOf(ref: string, version: string): { tier: FidelityTier; text: string[] } | undefined }` `export function buildReality(doc: Project, ctx: RealityCtx): Reality;` `export function realityMarkdown(r: Reality, tr: Tr): string;` |
| | Algorithm | S1 from `measurementRows`; if empty the section's empty text is `tr('reality.s1.empty')`. S2: every part with `status` not `modelled` or tier below `T3` for MCUs: "<part>: T1 teaching model, models X, does not model Y" taken from the registry text, not rewritten. S3: for each rating where `used_by_model` is `simulation`: "<name>: <value>, confidence <c>: <rationale>"; parameters the person set in the document marked "set by you, not checked against a datasheet". S4: `generic` parts; no datasheet; a rating the project uses with no `manufacturer` slot; `lifecycle` `nrnd`, `obsolete`, `unknown`; registry `unsupported` items. S5: supply margin (`solver.supplyWorstCaseA` against `supplyRatingA`; `must-read` above 80 percent, `check` above 50 percent; PROPOSAL thresholds), polarity-sensitive parts (one `check` item each), mixed logic levels from `compatibility.rules` kinds `logic_level_mismatch`, parts not modelled, failed or skipped saved checks (from `ctx.solver` absence: "no run since last change"), every `hazard:` tag (`must-read`), and a mains tag is refused (`reality.mainsRefused`). `check[]`: parts with no hazard tag and (`kind` `actuator`, category `power`, or `identity.model` containing `lipo`, `charger` or `motor`, case-insensitive): "tag missing, check by hand" (Q12). Unknown `hazard:foo` tags are listed there too. `lowestTier`: min over parts by order `none < T0 < T1 < T2 < T3`. `unmeasured`: count of purchasable rows with no measurement targeting their refdes |
| | State transitions | None |
| | Validation, errors | The module never throws; a part without a registry entry is an S4 item "unknown part" |
| | Edge cases | A project with no run: S5 says no run; a measurement with a `simulated` value but a changed state hash is flagged "simulated value is from an earlier version" (compare `simulated.stateHash` with the caller's current hash if given) |
| | Permissions, performance, migration | None; 500 parts under 100 ms |
| Verification | Unit tests | `measurements.test.ts`: delta, percent, tolerance edge, no simulated value gives no delta, CM-71 (a delta and no `fetch` called: the test stubs `fetch` to throw). `reality.test.ts`: five sections always present for an empty project and for the 3 examples; empty S1 text; lowest tier for a mixed project; generic LED in S4; stale simulated hash; thresholds; hazards in S5; `check` list; a golden Markdown; the string `validated` never in output (case-insensitive); no percentage of accuracy anywhere |
| | Acceptance | CM-68 and CM-71 as in Intent |
| | Observability, release blockers | None. Blocker: a green or "ok" state with unmeasured items; the word "validated" |
| Delivery | Definition of done | Both modules, tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/reality.test.ts src/export/measurements.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` reality gap; revert |
| | Later tasks need | T-B20-27, T-B20-34 |

---

### T-B20-25. Web Serial flashing for Uno and Nano

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-25, hardware link, B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-02 (PASS-model), T-B20-12 |
| Intent | Problem | The protocol client works on a model. A page needs a way to take a granted port, free it from the twin, pulse DTR, run the flash, and hand the port back |
| | Target user | Amar with an Uno and Chromium |
| | User story | As a builder I press Flash, choose my Uno in the browser's port list, and see sync, write, verify and done |
| | Expected behaviour | `flashBoard(port, image, device, opts)` opens the port at the device baud, pulses DTR/RTS (new `setSignals`), builds a `StkLink` from the transport, runs `flashHex`, closes the port. The twin session releases its Firmata connection first. Browser without Web Serial gets "not supported", the hex download stays |
| | Success metric | With `FakeSerialPort` wired to the fake Optiboot, the Blink image flashes and verifies; the port is closed in every path; the twin reconnects only when the person asks |
| Implementation | Existing files | `src/lib/hw/serial.ts:7-15` (`SerialPortLike`: add optional `setSignals`), `:23` (`FIRMATA_BAUD`), `:28-36` (`serialSupport`, `getSerial`), `:61-110` (`SerialTransport.open/write/close`), `src/lib/hw/session.ts:77` (`connect`), `:117` (`disconnect`), `:168` (`twinSession`), `src/lib/hw/usb.ts:26-39` (`identifyUsb`), `src/lib/hw/testing.ts:20-` (`FakeSerialPort`: add `setSignals` recording in the test double only via a subclass inside the test file) |
| | New files | `src/lib/hw/flash.ts` |
| | Edited files | `src/lib/hw/serial.ts` (interface gains `setSignals?(s: { dataTerminalReady?: boolean; requestToSend?: boolean; break?: boolean }): Promise<void>`; `SerialTransport.pulseReset(ms?)`), `src/lib/hw/session.ts` (`releaseForFlash(): Promise<void>` that ends the Firmata link and returns the granted port) |
| | Signatures | `flash.ts`: `export type FlashStatus = { phase: FlashPhase \| 'opening' \| 'resetting' \| 'closing'; done: number; total: number };` `export interface FlashRun { port: SerialPortLike; image: { flash: Uint8Array; usedRanges: readonly [number, number][] }; board: 'uno-r3' \| 'nano'; onStatus(s: FlashStatus): void; signal?: AbortSignal }` `export function flashBoard(run: FlashRun, deps?: { bauds?: readonly number[]; resetMs?: number; sleep?(ms: number): Promise<void> }): Promise<void>;` (throws `FlashError`, or a `HwError`-style `busy` when the port is open elsewhere) |
| | Algorithm | Bauds tried in order: Uno 115200; Nano 115200 then 57600 (old bootloader), only after `no-sync` (EXTERNAL; from the spike report). Steps: `session.releaseForFlash()`; open at baud; set DTR and RTS low, wait `resetMs` (default 250), raise (the reset pulse; EXTERNAL, from the spike); flush input; `flashHex`; always `transport.close()` in `finally`. Never calls `requestPort` (the UI does that on a click, so the browser's gesture rule is met) |
| | State transitions | `opening -> resetting -> sync -> signature -> write -> verify -> leave -> closing` |
| | Validation, errors | `FlashError` codes from T-B20-12 plus `busy` (port in use) and `lost` (disconnect event mid-run: the board is left in the bootloader, the message says unplug and replug). A port with `getInfo()` vendor id not in `BOARD_VENDOR_IDS` still works (clones) with a warning chip in the UI |
| | Edge cases | User denies the chooser (the UI handles); board reset by the bridge in the middle; second flash while one runs (refused); abort between pages |
| | Permissions | `Permissions-Policy: serial=(self)` (B0 T-B0-21); the call is made in a click handler; no outbound request |
| | Performance, migration | 30 KB in about 4 s of line time plus 1 s of reset and verify (ESTIMATED); none |
| Verification | Unit tests | `flash.test.ts`: `FakeSerialPort` + fake Optiboot adapter (a `StkLink` over the port's readable/writable, written in the test) flashes and verifies Blink; Nano falls back to 57600 after `no-sync`; DTR pulse recorded in order; the port is closed after success, after `wrong-device`, after abort and after a thrown read; `busy` when `open` rejects `InvalidStateError`. `session.test.ts` (exists as part of `twin.test.ts`; add cases): `releaseForFlash` stops the bridge and leaves the port granted |
| | Integration | T-B20-40 injects a JS fake `navigator.serial` and flashes through the UI |
| | Fixtures | `blink.hex` (T-B9-08 fixtures) |
| | Acceptance | Given a fake Optiboot Uno, When `flashBoard` runs on Blink, Then the model's flash equals the image and the port is closed. Given a model answering the wrong signature, Then `wrong-device` and nothing written |
| | Observability, release blockers | `onStatus`; an existing `track("hw.connect")` style event is not added (no new telemetry). Blocker: a write before the signature check; a port left open |
| Delivery | Definition of done | Tests green; real-board run is For Amar A2 and is recorded in `docs/BENCH_RECORD.md` |
| | Verify commands | `TL`; `V src/lib/hw` |
| | Docs, rollback | `docs/BUILD_IT.md` flashing; revert (edits are additive) |
| | Later tasks need | T-B20-33 |

---

### T-B20-26. Drone and robot extras for the build package

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-26, export (domains), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-04, T-B20-05, T-B20-10 (B17 and B19 files via seam) |
| Intent | Problem | A drone or robot project needs more than a BOM: the flight controller parameter dump with its loss list, the wiring sheet, the mass notice above 250 g, battery handling notes, and the URDF for a robot. B17 and B19 already write those files; the package must include them and the safety text |
| | Target user | Amar exporting the quad |
| | User story | As a builder I get `fc-params.txt`, `wiring-sheet.md`, `robot.urdf` where they apply, with the notices and the loss list beside them |
| | Expected behaviour | `domainFiles` inspects `domains.drone` and `domains.robotics`, calls the B19 and B17 exporters, adds the notices (mass above 250 g, battery hazard, "this is a teaching model") and returns files plus loss items |
| | Success metric | A drone fixture over 250 g carries the mass notice; a project with no domain data returns no files |
| Implementation | Existing files | PLANNED `src/export/drone-params.ts`, `src/export/wiring-sheet.ts` (T-B19-12), `src/export/urdf-out.ts` (T-B17-08); DRONE_ARCHITECTURE DB-C-13 (mass notice, line 404, EXTERNAL threshold), DA-19 (line 678); `project.schema.json` `$defs.Domains`; `04_ARCHITECTURE/schemas/examples/drone-quad.project.json`, `robot-line-follower.project.json` |
| | New files | `src/export/domain-extras.ts` |
| | Signatures | `export interface DomainFile { path: string; text: string; kind: 'fc-params' \| 'wiring-sheet' \| 'urdf' \| 'notice' }` `export function domainFiles(doc: Project, ctx: { tr: Tr; now: string; appVersion: string; massG?: number }): Result<{ files: DomainFile[]; loss: LossItem[]; hazards: Hazard[] }, Diagnostic[]>;` The exact names of the three imported exporters come from the seam rows |
| | Algorithm | If `doc.domains?.drone`: call the B19 parameter dump (iynk units, loss items for anything without an exact mapping, DA-19) and wiring sheet; add `hazard:lipo` and `hazard:motor` to the returned hazards when the BOM rows or the drone data show a LiPo or motors; mass notice when the all-up weight (caller's `massG` or the drone data's own) is above 250 g with the text "registration and Remote ID rules may apply where you fly" (not legal advice). If `doc.domains?.robotics`: call `exportUrdf` and keep its loss items. A `notice` file with the teaching-model line and the notices is always added when any domain file exists |
| | Validation, errors | A missing exporter (seam says absent) returns an error naming it; the package builder shows it as a skipped file with the reason |
| | Edge cases | A project with both domains; mass unknown (no notice, and a loss item `domain.mass-unknown`) |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `domain-extras.test.ts`: the drone example gives the three files and the notice; the line-follower example gives a URDF; a plain Uno project gives none; mass 249 g and 251 g edge; loss items are carried through |
| | Acceptance | DA-19 (carried): Given a drone project with FC parameters, When exported, Then the dump file exists and every parameter without an exact mapping is in the loss list |
| | Observability, release blockers | Loss list. Blocker: a notice missing for a 251 g build |
| Delivery | Definition of done | Module and tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/domain-extras.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md`; revert |
| | Later tasks need | T-B20-27 |

---

### T-B20-27. Build package: one deterministic zip

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-27, export (J-12, R-181), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01 (seam row Q2 is read by the callers, not by this module), T-B20-05, T-B20-15, T-B20-18, T-B20-19, T-B20-20, T-B20-20b, T-B20-24, T-B20-26. T-B20-16 only through the injected `kicadNet` function |
| Intent | Problem | One action should write everything a builder needs at the bench, the same bytes every time, with an honest README first |
| | Target user | Amar |
| | User story | As a builder I press Build package and get a zip with the README, BOM, wiring, flashing, checklist, tests, reality gap, diagrams, netlist, project and sources |
| | Expected behaviour | `buildPackage` collects the files of COMMUNITY 8.13, refuses on a failed BOM check or a mains part, runs the secret scan, writes a zip with fixed entry order and timestamps and returns bytes, the file list, the loss list and the `ExportRecord` |
| | Success metric | Two runs with the same project and `now` give identical zip bytes; the README's first lines carry the teaching-model sentence; `project.iynk` imports to the same `stateHash` (DET-3) |
| Implementation | Existing files | PLANNED `src/export/zip.ts` (writer; T-B3-05), `iynk.ts` (`writeIynk`/`readIynk`), `iynkz.ts`, `ino.ts` (`exportIno` returning `InoExport {folder, files, wiringCsv, loss}`, B5 line 349; `wiringCsv`; header marker `// iynk export`; T-B5-10), the secret-shape scan (T-B3-08), all B20 export modules above. This module only returns the `ExportRecord`; its callers store it with `ProjectSession.recordExport` (Q2, T-B5-08) |
| | New files | `src/export/bundle.ts` |
| | Signatures | `export interface PackageOptions { registry: Pick<PartRegistry, 'get' \| 'list'>; tr: Tr; now: string; appVersion: string; inputs: BuildInputs; scenes?: { schematic?: SceneLike; wiring?: SceneLike }; supplyMaxA?: number; format: 'zip'; include?: { svg?: boolean }; kicadNet?: (doc: Project) => { text: string; loss: LossItem[] } }` (`kicadNet` is passed by the caller as a closure over `exportKicadNet` of T-B20-16 when that task is built; `bundle.ts` never imports `kicad-net.ts`, so it compiles when T-B20-16 is cancelled) `export interface PackageFile { path: string; bytes: Uint8Array }` `export type PackageRefusal = BomRefusal \| { kind: 'secret'; path: string; sample: string };` `export interface PackageResult { zip: Uint8Array; files: PackageFile[]; loss: LossItem[]; record: ExportRecord }` `export function buildPackage(doc: Project, opts: PackageOptions): Result<PackageResult, PackageRefusal \| Diagnostic[]>;` |
| | Data model | Files: `README.md`, `bom.csv`, `bom.md`, `wiring.md`, `flash.md`, `checklist.md`, `tests.md`, `reality-gap.md`, `schematic.svg`, `wiring-diagram.svg`, `netlist.json`, `netlist.txt`, `project.iynk`, `sources/<folder>/...` (the `.ino` folder from `exportIno`), `wiring.csv`, domain files, optionally `netlist.net`. `build/inputs.json` travels in a `project.iynkz` instead of the bare `project.iynk`: the package writes both only if the inputs exist, and the bare file raises `build.inputs-not-in-bare-file` |
| | Algorithm | (1) BOM; refuse. (2) Guide, checklist, bench, flash plan, reality, domain files. (3) Render the files with the functions that already exist; this task writes no renderer: `wiring.md` = `guideMarkdown({guide, title, now}, tr)` (T-B20-20, guide only); `bom.md` = `bomMarkdown` (T-B20-19); `flash.md` = `flashMarkdown`, `checklist.md` = `checklistMarkdown`, `tests.md` = `testsMarkdown` (T-B20-20b); `reality-gap.md` = `realityMarkdown` (T-B20-24); domain files from `domainFiles` (T-B20-26); `netlist.net` = `opts.kicadNet(doc).text` when the function is given. (4) README: `readmeText` (T-B20-20b), called last with the file list of everything else (line 1 is the teaching-model sentence from `export.readme.line1`). (5) Secret scan over all text files; refuse on a hit. (6) Sort entries by path (UTF-16 order), store (no compression, so identical bytes), timestamps `now`. (7) `record = exportRecord('build-package', zip, ...)` with the merged loss codes. A scene is optional: with no scene the SVG files are skipped and a loss item `package.svg-skipped` says so |
| | State transitions | None |
| | Validation, errors | `PackageRefusal` kinds; zip size cap 64 MiB (the `.iynkz` limits of T-B3-05) -> error `package.too-big` |
| | Edge cases | A project with no firmware (flash.md says so); no tests (tests.md says none saved); empty reality gap sections still printed; non-ASCII file names are not used (all names ASCII; the folder name is `exportIno(...).folder`, which T-B5-10 already sanitises). With no `kicadNet` function no `netlist.net` is written and no loss item mentions it |
| | Permissions, performance | No network. 500 parts under 1 s (ESTIMATED); the worker wrapper is T-B20-30 |
| | Migration | None |
| Verification | Unit tests | `bundle.test.ts`: file list for the Blink example; README first line exact; determinism (two runs equal bytes); refusal on a mains fixture and on a failed check; a planted `sk-` string in a source triggers `secret`; zip entries sorted and stored; reading the zip back with the T-B3-05 reader gives the same bytes per file; `project.iynk` re-imported has the same `stateHash`; file count for the drone example includes the domain files; a stub `kicadNet` writes `netlist.net` and none writes no such entry; no `validated` in any text file |
| | Integration | T-B20-40 downloads the package and reads the entries |
| | Fixtures | The 3 example projects and a drone example |
| | Acceptance | Given the Blink project, When I build the package, Then the zip holds the files above, `bom.csv` quantities are UNO 1, LED 1, resistor 1, and importing `project.iynk` gives the same hash |
| | Observability, release blockers | `ExportRecord`. Blocker: a nondeterministic byte; a secret in a file |
| Delivery | Definition of done | Module and tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/bundle.test.ts`; `PORT`; `ARCH` |
| | Docs, rollback | `docs/BUILD_IT.md` package contents; revert |
| | Later tasks need | T-B20-29, 30, 36 |

---

### T-B20-28. Import hub: `.iynk`, `.iynkz`, `.ino`, package, `.net` with loss reports

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-28, import (F-091, R-181), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-27. T-B20-16 and T-B20-17 only through the injected `readers` |
| Intent | Problem | There are importers scattered across B3 and B5 (`.iynk`, `.iynkz`, `.ino`) and two more here. A person drops a file and does not know its type |
| | Target user | Amar and friends sharing files |
| | User story | As a builder I drop any file, see which kind it is and what will be lost, and confirm |
| | Expected behaviour | `detectFormat` sniffs bytes and name; `importAny` calls the right reader (KiCad and Wokwi only through `readers`) and returns a uniform `ImportPlan` (what project or sources would be created) with loss items. Nothing is written until the caller confirms |
| | Success metric | Each format the exporters write imports back: package zip -> its `project.iynk`; `.net` -> pin sets equal; `.ino` -> source equal; `.iynk`/`.iynkz` -> same hash (R-181: round trip of the project file keeps the hash, DET-3) |
| Implementation | Existing files | PLANNED `readIynk`, `readIynkz` (T-B3-05), `importIno` (T-B5-10), `src/core` limits. `importKicadNet` (T-B20-16) and `importWokwi` (T-B20-17) arrive as injected readers, so this module does not import their files and compiles when either is cancelled |
| | New files | `src/export/import.ts` |
| | Signatures | `export type ImportKind = 'iynk' \| 'iynkz' \| 'ino' \| 'package' \| 'kicad-net' \| 'wokwi' \| 'unknown';` `export function detectFormat(name: string, head: Uint8Array): ImportKind;` `export type ImportPlan = { kind: 'project'; project: Project; loss: LossItem[]; hash: string } \| { kind: 'sources'; board: string; sources: { path: string; text: string }[]; loss: LossItem[] } \| { kind: 'netlist'; nets: { name: string; pins: string[] }[]; parts: NetlistImport['parts']; loss: LossItem[] };` `export interface NetlistImport { parts: { reference: string; value: string; libpart?: string; pins: string[] }[]; nets: { name: string; nodes: { ref: string; pin: string }[] }[]; loss: LossItem[] }` `export function importAny(files: readonly { name: string; bytes: Uint8Array }[], deps: ImportDeps): Promise<Result<ImportPlan, Diagnostic[]>>;` `export interface ImportDeps { registry: Pick<PartRegistry, 'get' \| 'latest' \| 'list' \| 'resolveLegacy'>; analyse: InoAnalyser; maxBytes: number; readers?: { kicad?: (text: string) => Result<NetlistImport, Diagnostic[]>; wokwi?: (text: string) => Result<NetlistImport, Diagnostic[]> } }` (the caller sets `readers.kicad = (t) => importKicadNet(t, registry)` when T-B20-16 exists; `KicadImport` structurally satisfies `NetlistImport`) |
| | Algorithm | Sniff: zip magic `PK` -> `.iynkz` if it holds `project.json` / the `.iynkz` layout, `package` if it holds `README.md` and `project.iynk`; `{` JSON with `format: "iynk.project"` -> `.iynk`; `.ino`, `.h`, `.cpp`, `.py` text -> sources; `(export ` S-expression start -> KiCad; JSON with `parts` and `connections` -> Wokwi (only when `readers.wokwi` is given). Size cap before decoding (`maxBytes`, default 5 MiB bare, zip limits from T-B3-05). Unknown -> error "not a format iynk reads" listing the formats it does read. Every plan carries the loss list; a package import notes `build.inputs-not-in-bare-file` is not raised (the zip carries them) |
| | Validation, errors | Codes `import.unknown`, `import.too-big`, `import.not-text`, plus the readers' own |
| | Edge cases | Two files (`.ino` + `.h`): one sources plan; a zip with a path traversal entry: refused by the T-B3-05 reader; an `.iynk` with a newer schema: the reader's message |
| | Permissions, performance | No network; 5 MiB in under 300 ms (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `import.test.ts`: `detectFormat` table (10 cases); round trips with the real exporters on the 3 examples; hostile inputs (zip bomb sample, 6 MiB JSON, binary named `.ino`) all refused with codes; loss lists pass through |
| | Acceptance | Given the package from T-B20-27, When I import the zip, Then the plan holds a project with the original `stateHash` |
| | Observability, release blockers | Loss list. Blocker: any path that executes imported code |
| Delivery | Definition of done | Module and tests green, `PORT` clean |
| | Verify commands | `TL`; `V src/export/import.test.ts`; `PORT` |
| | Docs, rollback | `docs/BUILD_IT.md` import table; revert |
| | Later tasks need | T-B20-36 |

---

### T-B20-29. Leave with your work: whole library in open formats

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-29, export (local-first, D-015), B20 |
| | Priority, status, dependencies | P2, not started, T-B20-01, T-B20-27 |
| Intent | Problem | `export-all` (T-B3-08) writes the library as `.iynkz` files. A person leaving should also get files other tools read: sketches, BOM, netlist |
| | Target user | Amar and friends who want to leave |
| | User story | As a person I press Export everything and get one zip: for each project a `.iynk`, its sketch folder, `bom.csv`, `netlist.json`, and a README of what each file is and what it lost |
| | Expected behaviour | `libraryExport` runs the light parts of the package (no scenes, no price, no guide) for each project and nests them in one zip. Keys, price checks and AI data are never included |
| | Success metric | A library of 3 projects gives 3 folders; planting a `keys` row and a `price_checks` row in the repository leaves them out; the archive round trip returns each project's hash |
| Implementation | Existing files | PLANNED `src/local/export-all.ts` (T-B3-08: archive of every project plus the secret-shape warning, excludes `keys`), `zip.ts`, `bundle.ts` pieces, `src/local/price-checks.ts` (T-B20-07: never exported) |
| | New files | `src/export/library.ts` |
| | Edited files | `src/local/export-all.ts` (add a second mode `open-formats` that calls `libraryExport`) |
| | Signatures | `export interface LibraryProject { id: string; title: string; doc: Project }` `export function libraryExport(projects: readonly LibraryProject[], ctx: { registry: Pick<PartRegistry, 'get'>; tr: Tr; now: string; appVersion: string }): Result<{ zip: Uint8Array; loss: LossItem[]; skipped: { id: string; reason: string }[] }, Diagnostic[]>;` |
| | Algorithm | Folder per project `<NNN>-<safe title>` (ASCII, at most 40 chars, unique); inside: `project.iynk`, `sources/`, `bom.csv` (skipped with a note if the BOM check fails or a mains part exists), `netlist.json`, `README.txt`. A project that fails any piece is still exported with the pieces that worked and listed in `skipped` |
| | Validation, errors | Total size cap from the `.iynkz` limits; over the cap -> split by the caller (the dialog offers "export in parts") |
| | Edge cases | Zero projects (empty zip refused with a message); duplicate titles; a project with a secret-shaped string (warning list, same as T-B3-08) |
| | Permissions, performance, migration | None; 100 small projects under 5 s (ESTIMATED) |
| Verification | Unit tests | `library.test.ts`: folder naming, skip handling, determinism; `export-all.test.ts` (exists from B3) extended: the open-format mode excludes `keys` and `price_checks`; round trip hashes |
| | Acceptance | Given a library with a LiPo project and a mains project, When I export, Then the mains one is listed in `skipped` for its BOM and still has its `.iynk` |
| | Observability, release blockers | `skipped` list shown in the dialog. Blocker: a `keys` row in the archive |
| Delivery | Definition of done | Module, edit, tests green |
| | Verify commands | `TL`; `V src/export/library.test.ts src/local/export-all.test.ts`; `PORT` for `library.ts` |
| | Docs, rollback | `docs/BUILD_IT.md` "Leave with your work"; revert |
| | Later tasks need | T-B20-36 (menu entry) |

---

### T-B20-30. Export worker and the 500-part timing

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-30, runtime (D-011), B20 |
| | Priority, status, dependencies | P2, not started, T-B20-01, T-B20-27 |
| Intent | Problem | CM-72: a BOM of a 500-part project made in a worker must not block the main thread more than 50 ms (PROPOSAL; MEASURE). The BOM and package code is pure; it needs a worker host |
| | Target user | Amar with a large project |
| | User story | As a builder I press Build package on a big project and the page stays smooth |
| | Expected behaviour | A worker runs `buildBom`, `buildGuide`, `buildPackage` on a posted document and returns bytes. A host wraps it with the RPC port of B3. The main thread only posts and receives |
| | Success metric | A recorded number: longest main-thread task during a 500-component package build (Playwright `PerformanceObserver` `longtask`), reported against 50 ms. Missing the target is recorded, not hidden |
| Implementation | Existing files | PLANNED `src/protocol` `createRpcPort`, `createInlinePort` (T-B3-01), `src/local/project.worker.ts`, `project-host.ts` (T-B3-03: the pattern), `src/sim-host/host.ts` |
| | New files | `src/local/export-protocol.ts`, `src/local/export.worker.ts`, `src/local/export-host.ts` |
| | Signatures | `export type ExportReq = { v: 1; id: number; t: 'bom'; doc: Project; inputsBytes?: Uint8Array } \| { v: 1; id: number; t: 'package'; doc: Project; opts: Omit<PackageOptions, 'registry' \| 'tr'>; locale: string };` `export type ExportRes = { v: 1; id: number; ok: true; bom?: BomResult; package?: PackageResult } \| { v: 1; id: number; ok: false; error: string };` `export interface ExportHost { bom(doc: Project, inputs?: Uint8Array): Promise<BomResult>; buildPackage(doc: Project, opts: ...): Promise<PackageResult>; kill(): void }` `export function createExportHost(port?: RpcPort<ExportReq, ExportRes>): ExportHost;` The worker loads the registry and the `buildit` messages for the locale itself |
| | Algorithm | Handler calls the pure functions. The inline port (tests) runs the same handler in-thread. The page keeps one worker, created on first use, killed after 60 s idle |
| | Validation, errors | A worker error becomes a rejected promise with a plain message; a document over the limit is refused before posting |
| | Edge cases | Two calls in flight (queued, ids differ); the worker killed mid-call |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `export-host.test.ts` with the inline port: bom and package results equal direct calls; error path; kill. A Node timing line for the 500-part fixture (informational) |
| | Playwright | A measure test in T-B20-40's file `test('500 parts', ...)` marked as a recorded number |
| | Acceptance | CM-72 (recorded): Given a 500-component project, When the package is built in the worker, Then the longest main-thread task is reported; target 50 ms |
| | Observability, release blockers | The number goes into `docs/BUILD_IT.md` by T-B20-42. Blocker: none (PROPOSAL target) |
| Delivery | Definition of done | Three files, tests green |
| | Verify commands | `TL`; `V src/local/export-host.test.ts` |
| | Docs, rollback | `docs/BUILD_IT.md`; revert |
| | Later tasks need | T-B20-36 calls the host rather than the pure function |

---

### T-B20-31. BOM panel and substitutes dialog

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-31, Studio UI (F-160, F-212), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-05, T-B20-19, T-B20-23 |
| Intent | Problem | The BOM, its warnings, the "have" and "skip" inputs, the export buttons and the substitutes need a screen. The old panel (`RealBuildPanel.tsx`, 527 lines) is built on lab item ids, not on a project |
| | Target user | Amar |
| | User story | As a builder I see my parts, tick "I have 2", press Export CSV, and ask for substitutes of a resistor |
| | Expected behaviour | A presentational panel: caption table, one row per `BomRow`, controls for `have` and `skip` and spares, the warnings list, the not-purchasable list, the companions, three export buttons, and a "Find substitutes" button per row that opens the dialog. The panel holds no business logic: `BuildTab` (T-B20-37a, T-B20-37b) passes computed data and callbacks |
| | Success metric | axe: zero serious or critical findings; every control reachable by keyboard; the table has a caption and header cells with scope |
| Implementation | Existing files | `src/components/ui` (`Button`, `Callout`, `Chip`, `Icon`, `Stat`; imported at `RealBuildPanel.tsx:6` as the pattern), `src/components/search/shared.tsx:88` (`external`), `src/components/studio/Panel` patterns from T-B4-25; strings: `buildit` (T-B20-05) |
| | New files | `src/components/studio/BomPanel.tsx`, `src/components/studio/SubstitutesDialog.tsx`; tests beside each |
| | Signatures | `export function BomPanel(props: { rows: readonly PricedRow[]; notPurchasable: readonly BomRow[]; warnings: readonly BomWarning[]; companions: readonly CompanionNote[]; check: BomResult['check']; refusal: BomRefusal \| null; inputs: BuildInputs; readOnly: boolean; onLine(bomKey: string, patch: Partial<LineInput> \| null): void; onSpares(percent: number): void; onExport(format: 'csv' \| 'md' \| 'json'): void; onSubstitutes(bomKey: string): void; tr: Tr; locale: string }): JSX.Element;` `export function SubstitutesDialog(props: { open: boolean; part: BomRow \| null; result: { shown: readonly Substitute[]; rejected: readonly { ref: string; failed: number[] }[] } \| 'working' \| null; onReview(s: Substitute): void; onClose(): void; tr: Tr }): JSX.Element;` |
| | Algorithm | Money text through `Intl.NumberFormat(locale, {style: 'currency'})` from minor units / exponent. `have` and `skip` call `onLine`; the panel is disabled with a note when `readOnly`. A refusal (totals or mains) replaces the export buttons with the explanation. Datasheet cell: link with `external` attributes and a "check it still matches" chip when stale. A part with a lower-tier substitute shows the `lowerTier` chip |
| | State transitions | Dialog `closed -> working -> list \| empty` |
| | Validation, errors | `have` is a whole number from 0 to 100,000 (input `min`, `max`, `step`); invalid input is not sent |
| | Edge cases | Zero rows (empty state text); 500 rows (the table is not virtualised in v1; a note in the docs; the row component is memoised by `bomKey`); narrow width: the table scrolls inside its own container, not the page |
| | Permissions, performance, migration | Read-only chip when the project is read-only. No network |
| Verification | Unit tests | `BomPanel.test.tsx` (jsdom): rows render with caption; typing `have` calls `onLine`; skip toggles; refusal text replaces buttons; stale chip; lower-tier chip; `readOnly` disables. `SubstitutesDialog.test.tsx`: lists classes and differences; empty text; focus moves into the dialog and returns on close; Escape closes |
| | Playwright | T-B20-40 (axe and export download) |
| | Acceptance | Given the Blink BOM, When I open the panel, Then three rows show UNO 1, LED 1, resistor 1 and the totals check text says it matches |
| | Observability, release blockers | None. Blocker: a link without `rel="noopener noreferrer"`; a price shown without its kind label |
| Delivery | Definition of done | Both components and tests green; loaded lazily by T-B20-37a |
| | Verify commands | `TL`; `V src/components/studio/BomPanel.test.tsx src/components/studio/SubstitutesDialog.test.tsx` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-37a |

---

### T-B20-32. Prices panel and the check dialog

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-32, Studio UI (F-154, F-155), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-05, T-B20-21, T-B20-22 |
| Intent | Problem | Prices show with kind and date, never live unless the person pressed a button with their own key, and the cost is stated before the call |
| | Target user | Amar |
| | User story | As a builder I see "catalogue estimate, not live, entered 2026-10-27" next to each price, press "Check prices", read "This will use up to 12 searches", confirm, and see listings with the seller and time |
| | Expected behaviour | Panel: per-row price with its label, total with "at least X, N lines unpriced", budget field and over-budget banner, row ticks for the check, the "Check prices" button (reads "Add a search key to check prices" with no key, and "uses the server's key" when the operator's key is used). Dialog: the cost sentence, Confirm / Cancel, then progress, then results with source, time, "from cache", dimmed non-matching titles, and the quota or error text |
| | Success metric | CM-63 UI half (no network on open, verified in T-B20-40); CM-65 text; CM-66 link href equals the listing URL |
| Implementation | Existing files | `src/components/search/RealBuildPanel.tsx:140-190` (`OfferRow`, `LineItem`; the link pattern with `external`), `:471` (error callout), `src/components/search/shared.tsx` (`useSearchAvailability`, `StatusError`, `useFormat`), `src/lib/search/client.ts` |
| | New files | `src/components/studio/PricesPanel.tsx`, `src/components/studio/PriceCheckDialog.tsx`; tests beside each |
| | Signatures | `export function PricesPanel(props: { rows: readonly PricedRow[]; summary: BudgetSummary; inputs: BuildInputs; selected: ReadonlySet<string>; keyState: 'none' \| 'own' \| 'server'; offers: ReadonlyMap<string, { listing: ListingRecord; lineMinor: number; fromCache: boolean }>; onSelect(keys: string[]): void; onBudget(minor: number \| undefined): void; onTypedPrice(bomKey: string, minor: number \| undefined, note?: string): void; onCheck(): void; tr: Tr; locale: string; readOnly: boolean }): JSX.Element;` `export function PriceCheckDialog(props: { open: boolean; notice: { searches: number }; phase: 'confirm' \| 'running' \| 'done' \| 'error'; progress: { done: number; total: number }; outcome: CheckOutcome \| null; onConfirm(): void; onCancel(): void; onClose(): void; tr: Tr }): JSX.Element;` |
| | Algorithm | Each price shows `tr('prices.catalogue')` / `prices.yours` / `prices.live` plus the date. The offers column shows "lowest listing found" (never "cheapest" or "best price") and dims a non-matching title with `prices.titleMismatch`. A listing in another currency is shown in its currency with `prices.otherCurrency` and left out of the total. Quota error text is `prices.quota` ("the key is out of searches"); rate limited is a different string. The dialog's cost sentence is `tr('prices.costDialog', {n})` and the Confirm button is disabled until it is rendered. History button lists the person's own earlier checks from `priceChecks.list` (T-B20-07), labelled as their own |
| | State transitions | Dialog: `confirm -> running -> done \| error`; Cancel in `running` aborts the request |
| | Validation, errors | A budget field accepts a decimal in the project currency and converts to minor units without floats (string parse); a typed price likewise. Negative values refused |
| | Edge cases | Key removed while the dialog is open: the error text; zero rows ticked: Check disabled; a listing URL longer than 2,000 chars is truncated visually, not in `href` |
| | Permissions, performance, migration | No network until Confirm. Nothing is uploaded; text states that a search sends the query text and the region to the provider (F-008 data-handling note) |
| Verification | Unit tests | `PricesPanel.test.tsx`: labels per kind; total text with unpriced rows; over-budget banner with top 3; typed price calls the callback with an integer; no network (`fetch` stub throws) on render. `PriceCheckDialog.test.tsx`: cost sentence first; Confirm calls once; cancel aborts; quota text vs rate-limit text; link `href` equals the listing URL exactly and has `rel="noopener noreferrer"` (CM-66) |
| | Playwright | T-B20-40 |
| | Acceptance | CM-64 UI half: Given a search key and 12 ticked rows, When I press Check prices, Then the dialog first says "up to 12 searches" |
| | Observability, release blockers | None new. Blocker: a call before Confirm; the word "cheapest" or "best price"; an appended query parameter on a link |
| Delivery | Definition of done | Both components and tests green |
| | Verify commands | `TL`; `V src/components/studio/PricesPanel.test.tsx src/components/studio/PriceCheckDialog.test.tsx`; `git add -N src/components/studio/PricesPanel.tsx src/components/studio/PriceCheckDialog.tsx`; `COPY` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-37b, T-B20-38 (the old panel's pricing code is replaced once this works) |

---

### T-B20-33. Build guide and flash panels

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-33, Studio UI (F-161), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-05, T-B20-18, T-B20-20 (T-B20-25 only through the optional `onFlash` prop) |
| Intent | Problem | The steps and checklist must be readable at the bench, printable, keyboard operable, and the flash button must exist only where flashing can work |
| | Target user | Amar at the bench |
| | User story | As a builder I print the guide on A4, tick steps as I go, and press Flash only if my browser and board can |
| | Expected behaviour | GuidePanel: an ordered list (`ol`) grouped under phase headings, each step a labelled checkbox with its source chip; the checklist; the bench steps; Print and Markdown/text export buttons. FlashPanel: recipe steps with source and date, the hex and sketch downloads, an "English only" chip for recipe text, and a Flash section visible only for Uno or Nano with a hex asset in a browser that supports Web Serial in a secure context |
| | Success metric | axe zero serious or critical; the guide prints on one page per phase break without colour dependence (a print stylesheet class, checked in a Playwright `emulateMedia({media: 'print'})` screenshot size test) |
| Implementation | Existing files | `src/lib/hw/serial.ts:28-36` (`serialSupport`, `getSerial`), `src/lib/hw/usb.ts:32` (`identifyUsb` for the port label), `src/components/hw/HardwareTwinPanel.tsx:137-182` (the Setup/Connect pattern and messages for unsupported browsers), `ui` components |
| | New files | `src/components/studio/GuidePanel.tsx`, `src/components/studio/FlashPanel.tsx`; tests beside each |
| | Signatures | `export function GuidePanel(props: { guide: Guide; checklist: readonly ChecklistItem[]; bench: readonly BenchStep[]; omitted: number; storageKey: string; onExport(kind: 'md' \| 'text'): void; tr: Tr }): JSX.Element;` `export function FlashPanel(props: { plan: FlashPlan; hasHex: boolean; image: { flash: Uint8Array; usedRanges: readonly [number, number][] } \| null; onDownload(path: string): void; onFlash?(run: { port: SerialPortLike; board: 'uno-r3' \| 'nano'; onStatus(s: { phase: string; done: number; total: number }): void; signal?: AbortSignal }): Promise<void>; tr: Tr }): JSX.Element;` (`onFlash` is given by T-B20-37a only when `src/lib/hw/flash.ts` exists; without it the panel shows steps and downloads and no Flash section, so it compiles when T-B20-25 is cancelled) |
| | Algorithm | Ticks are component state plus `localStorage[storageKey]` inside try/catch (a per-viewer convenience; the page works without it). `FlashPanel`: `serialSupport()` -> `supported` shows the button; `insecure` and `unsupported` show the matching text and the steps-only path. Click: `getSerial().requestPort({filters})` inside the handler, then `props.onFlash` (which wraps `flashBoard`) with `onStatus` going to an `aria-live="polite"` region; errors map `FlashError.code` to `flash.*` strings (`wrongDevice`, `noBootloader`, `busy`, `tooBig`, `failed`); a visible "experimental: tested on a model, not yet on a real board" chip stays until Amar records a real result in `docs/BENCH_RECORD.md` and a later change removes it (For Amar A2) |
| | State transitions | Flash: `idle -> choosing -> flashing -> done \| failed`; Cancel aborts |
| | Validation, errors | A second click while flashing is ignored. The port chooser's `NotFoundError` (user cancelled) returns to `idle` quietly |
| | Edge cases | No hex asset: the Flash section explains to import or compile a hex and links the hex-import entry (T-B9-26); a board other than Uno or Nano: steps only; two boards: one section per board |
| | Permissions | Web Serial needs a click and a named port; no outbound request |
| | Performance, migration | None |
| Verification | Unit tests | `GuidePanel.test.tsx`: list semantics (an `ol` with `li`), each step has a checkbox with a name, source chip text, ticks persist through remount and survive a throwing `localStorage`, print button calls `window.print`. `FlashPanel.test.tsx`: states for supported / insecure / unsupported; no Flash button without a hex or without `onFlash`; status announcements; error mapping; experimental chip present |
| | Playwright | T-B20-40 (fake serial, print emulation) |
| | Acceptance | Given the Blink project in Chromium with a fake Uno, When I press Flash and choose the port, Then the status ends at done and the fake's flash equals the hex |
| | Observability, release blockers | None. Blocker: a Flash button for a board without Web Serial support |
| Delivery | Definition of done | Both components and tests green |
| | Verify commands | `TL`; `V src/components/studio/GuidePanel.test.tsx src/components/studio/FlashPanel.test.tsx` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-37a |

---

### T-B20-34. Reality gap page and measurements panel

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-34, Studio UI (F-162, F-163), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-05, T-B20-08, T-B20-24 |
| Intent | Problem | The five questions need a page that cannot turn green by itself, and the person needs a place to enter what they measured |
| | Target user | Amar |
| | User story | As a builder I open Reality gap and read the lowest tier on top, then five sections, and add my multimeter reading to the measured list |
| | Expected behaviour | `RealityGap` renders the model: top line (lowest tier and the number of unmeasured things), five headed sections, empty S1 text "nothing in this project has been checked against hardware", severity chips (`must read`, `check`, `note`), the "check by hand" list. `MeasurementsPanel`: a form (target, quantity, value, unit, instrument, conditions), the list with delta and within-tolerance, a tolerance input (default 5 percent), and remove. Promoting a measurement to a part's `measured` rating slot is not built (see section 11) |
| | Success metric | CM-68 UI: five sections exist for any project, empty measurement list reads "not checked against hardware", the word "validated" does not appear; CM-71 UI: a delta shows and no request is made |
| Implementation | Existing files | `src/export/reality.ts`, `measurements.ts` (T-B20-24), `src/export/build-inputs.ts` (T-B20-08), COMMUNITY 8.12 |
| | New files | `src/components/studio/RealityGap.tsx`, `src/components/studio/MeasurementsPanel.tsx`; tests beside each |
| | Signatures | `export function RealityGap(props: { reality: Reality; tr: Tr; onExport(): void }): JSX.Element;` `export function MeasurementsPanel(props: { rows: readonly MeasurementRow[]; tolerancePercent: number; targets: readonly { refdes: string; label: string }[]; nets: readonly { id: string; name: string }[]; simulatedFor(target: BenchMeasurement['target'], quantity: BenchMeasurement['quantity']): BenchMeasurement['simulated'] \| undefined; onAdd(m: BenchMeasurement): void; onRemove(id: string): void; onTolerance(p: number): void; readOnly: boolean; tr: Tr; locale: string }): JSX.Element;` |
| | Algorithm | No colour-only status: chips carry text. No green. The top line is plain text. The form validates number and unit before `onAdd`; ids and timestamps come from the caller. Delta text: "measured 5.02 V, simulated 4.98 V, difference +0.04 V (0.8 percent)". At 500 measurements the form is disabled with `meas.limit500` |
| | State transitions | Form: `empty -> editing -> invalid \| ready` |
| | Validation, errors | `value` finite; `unit` non-empty; text fields trimmed and limited as in T-B20-08 |
| | Edge cases | A measurement whose simulated value predates the current state hash: a note chip; very long notes wrap |
| | Permissions, performance, migration | Read-only disables add/remove |
| Verification | Unit tests | `RealityGap.test.tsx`: five section headings for an empty project; empty S1 text; severity chips; no `validated` in the rendered text; heading order. `MeasurementsPanel.test.tsx`: add calls `onAdd` with a well-formed measurement; delta text; tolerance edge; remove; `fetch` stub throws and is never called (CM-71) |
| | Playwright | T-B20-40 |
| | Acceptance | CM-68: Given any project, When I open Reality gap, Then the five sections exist, an empty measurement list reads "not checked against hardware", and the word "validated" does not appear |
| | Observability, release blockers | None. Blocker: any element styled as "passed" or "ok" |
| Delivery | Definition of done | Both components and tests green |
| | Verify commands | `TL`; `V src/components/studio/RealityGap.test.tsx src/components/studio/MeasurementsPanel.test.tsx`; `git add -N src/components/studio/RealityGap.tsx src/components/studio/MeasurementsPanel.tsx`; `COPY` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-37a (reality gap), T-B20-37b (measurements) |

---

### T-B20-35. Twin panel: simulated and measured side by side, record as measurement

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-35, hardware twin UI (F-159, R-188), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-05, T-B20-08, T-B20-13, T-B20-14 |
| Intent | Problem | R-188: simulated pins and real pins shown side by side, drive the real board from the project, and a "not supported" path for Firefox and Safari. Today the panel shows a pin table only (`HardwareTwinPanel.tsx:282` `PinTable`) |
| | Target user | Amar with an Uno running StandardFirmata |
| | User story | As a builder I connect my Uno, record 10 seconds, and see the simulated D13 and the real D13 as two lines with a number for how far apart they are, then save that as a measurement |
| | Expected behaviour | A new `TraceCompare` component under the existing pin table: record / stop, two traces on one time axis (SVG) with a table as its accessible twin, the summary from `compareTraces` (lag, mean and max difference, edge counts), and "Record as measurement" which builds a `BenchMeasurement` through `toMeasurement`. A chip says the source of the measured trace (`Firmata pins` or `serial text`). Firefox and Safari show "not supported in this browser" with the instructions-only path |
| | Success metric | A recording of 10 s at 30 Hz produces a comparison without freezing the page; keyboard operable; table twin lists the same numbers |
| Implementation | Existing files | `src/components/hw/HardwareTwinPanel.tsx:63-116` (panel body), `:117` (`Twin`), `:182` (`Connected`), `:282` (`PinTable`); T-B20-14's new props; `src/lib/hw/twin.ts:76-110` (`pinOfNet`, `pinLabel`, `inputValue`), `board.ts:134` (`onInput`) for measured samples; `compare.ts`, `capture.ts` (T-B20-13) |
| | New files | `src/components/hw/TraceCompare.tsx` |
| | Edited files | `src/components/hw/HardwareTwinPanel.tsx` |
| | Signatures | `export function TraceCompare(props: { sim: Trace \| null; measured: Trace \| null; summary: CompareSummary \| null; recording: boolean; onRecord(): void; onStop(): void; onSave(): void; canSave: boolean; tr: Tr; locale: string }): JSX.Element;` The panel creates the recorder with `createRecorder`, feeds sim samples from `TwinSim.subscribe` frames and measured samples from `FirmataBoard.onInput`, and calls `onMeasurement(m)` (new prop from T-B20-37b) |
| | Algorithm | Recording caps from `createRecorder` (20,000 samples, 120 s); sim ns to ms conversion in the panel; on stop `compareTraces` with `stepMs` 10, `maxLagMs` 500, tolerance 0.5 for digital and 3 percent of full scale for analog (PROPOSAL); the summary and chart update once. The chart is SVG with polylines; no animation |
| | State transitions | `idle -> recording -> stopped -> saved` |
| | Validation, errors | No trace data: "nothing recorded yet". A board disconnect while recording stops it and keeps what was captured |
| | Edge cases | Pin not sensed (output pin on the real board): measured trace unavailable with a reason chip; serial-text source is chosen only after a flash (T-B20-25), via a text input for the baud and a regular expression; the panel never claims the twin runs the person's code (Q5) |
| | Permissions | Same as the existing panel |
| | Performance, migration | Chart redraw once per stop; none |
| Verification | Unit tests | `TraceCompare.test.tsx`: renders two polylines and the table twin; buttons call back; summary text. Update `HardwareTwinPanel.test.tsx` (168 lines): existing cases kept, plus a record flow with `FakeSerialPort` and a stub sim that produces known samples, ending with a saved measurement whose fields equal the summary |
| | Playwright | T-B20-40 (Chromium only; the not-supported text in WebKit) |
| | Acceptance | R-188: Given a real Uno with Firmata and Chromium, When I connect and record, Then the simulated and real pins show side by side; Firefox and Safari show "not supported in this browser" with the instructions-only path |
| | Observability, release blockers | None. Blocker: a hardware-in-the-loop claim without Amar's bench record (the docs say "unit-tested against a fake board") |
| Delivery | Definition of done | Component, panel edit and tests green |
| | Verify commands | `TL`; `V src/components/hw src/lib/hw` |
| | Docs, rollback | `docs/BUILD_IT.md` hardware twin section; revert |
| | Later tasks need | T-B20-37b |

---

### T-B20-36. Export and import dialogs, project menu entries

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-36, Studio UI (F-090, F-091, F-210, F-211), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01, T-B20-05, T-B20-27, T-B20-28 (T-B20-29, 30 if built) |
| Intent | Problem | The exporters and the importer have no door. B5 added a project menu with `.ino` import and export; B20 adds the rest and shows the loss list before anything is written |
| | Target user | Amar |
| | User story | As a builder I choose Export > Build package, see what the package holds and what it loses, and save it; I choose Import, drop a file, see what will be lost, and confirm |
| | Expected behaviour | `ExportDialog`: choose one of package, BOM (csv / md / json), netlist (json / text / KiCad `.net` if built), schematic SVG, wiring diagram SVG (with a "Print or save as PDF" button, Q8), sketch folder, whole library (if T-B20-29 built); shows the loss list (`LossReport` from T-B5-19) and the refusal text for a failed check or a mains part; the download goes through `src/local/files.ts`. `ImportDialog`: file chooser and drop zone, `importAny`, plan summary, loss list, Create / Cancel. `ProjectMenu` gains the entries |
| | Success metric | Each entry produces a file whose `ExportRecord` is stored by the caller through `ProjectSession.recordExport` (Q2, T-B5-08); import of a package creates a project with the original hash |
| Implementation | Existing files | PLANNED `src/components/studio/ProjectMenu.tsx`, `LossReport.tsx` (T-B5-19: `LossReport(props: {loss, board?, onConfirm, onCancel, confirmLabel})`), `src/local/files.ts` (T-B3-05 save/open helpers), `src/local/export-host.ts` (T-B20-30, optional), `src/studio/commands.ts`; `ProjectSession.recordExport` (Q2). The dialogs are presentational and do not call it; T-B20-37b does |
| | New files | `src/components/studio/ExportDialog.tsx`, `src/components/studio/ImportDialog.tsx` |
| | Edited files | `src/components/studio/ProjectMenu.tsx` |
| | Signatures | `export function ExportDialog(props: { open: boolean; kinds: readonly ExportKind[]; busy: ExportKind \| null; loss: readonly LossItem[]; refusal: string \| null; onExport(kind: ExportKind): void; onPrint(kind: 'schematic' \| 'wiring'): void; onClose(): void; tr: Tr }): JSX.Element;` `export type ExportKind = 'package' \| 'bom-csv' \| 'bom-md' \| 'bom-json' \| 'netlist-json' \| 'netlist-text' \| 'netlist-kicad' \| 'schematic-svg' \| 'wiring-svg' \| 'sketch' \| 'library';` `export function ImportDialog(props: { open: boolean; plan: ImportPlan \| null; error: string \| null; busy: boolean; onFiles(files: File[]): void; onCreate(): void; onClose(): void; tr: Tr }): JSX.Element;` |
| | Algorithm | The dialogs are presentational; their callers (in `BuildTab`, T-B20-37b) run the exports through the worker host when present. Print: injects the `printCss` string of T-B20-15, calls `window.print()`, removes the style. The KiCad kind appears only if the caller lists `netlist-kicad` in `kinds`, which it does only when T-B20-16 exists (the dialog imports nothing from `kicad-net.ts`) |
| | State transitions | Export: `idle -> busy(kind) -> idle \| refused`; Import: `idle -> reading -> plan \| error` |
| | Validation, errors | A refusal shows its plain reason and offers nothing to download. Drop of more than 20 files is refused with the limit |
| | Edge cases | Focus trap and return; Escape closes unless busy; file chooser plus drag and drop plus paste of a file |
| | Permissions, performance, migration | Read-only projects can export; import creates a new project, never overwrites |
| Verification | Unit tests | `ExportDialog.test.tsx`, `ImportDialog.test.tsx`, updated `ProjectMenu.test.tsx`: entries present, keyboard, loss list shown before the download button is enabled, refusal text, `kinds` filtering |
| | Playwright | T-B20-40 |
| | Acceptance | Given a project with a mains part, When I choose Export > BOM, Then the dialog says iynk does not write build instructions for mains wiring and offers no file |
| | Observability, release blockers | None. Blocker: a download offered after a refusal |
| Delivery | Definition of done | Two components, the menu edit, tests green |
| | Verify commands | `TL`; `V src/components/studio` |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-37b |

---

### T-B20-37a. Build it tab shell: BOM, Guide, Flash and Reality gap, read-only data

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-37a, Studio shell (R-185), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-05, T-B20-31, T-B20-33, T-B20-34 (the modules those panels show come from T-B20-10, 11, 18, 19, 20, 20b and 24 through them) |
| Intent | Problem | Finished panels and pure modules are not reachable. The old version of this task also held six jobs in one `BuildTab`. This task makes the tab and the four read-only screens. Edits, prices, substitutes, hardware, Nearby and Video help are T-B20-37b |
| | Target user | Amar |
| | User story | As a builder I open the Build it tab and find Parts, Guide, Flash and Reality gap for the project I am editing |
| | Expected behaviour | `BuildTab` loads lazily with the `buildit` namespace. It reads the project from the session, reads the build inputs (`findBuildAsset` then `parseBuildInputs`, else `emptyBuildInputs`), computes the BOM, guide, checklist, bench steps, flash plan and reality, and mounts `BomPanel`, `GuidePanel`, `FlashPanel` and `RealityGap` as tabs. No edit callback is wired: `BomPanel` gets `readOnly: true`. `FlashPanel` gets `onFlash` only if `src/lib/hw/flash.ts` exists (checked with a dynamic import that is allowed to fail). The compute runs in the export worker when a host is given (T-B20-30), else on the main thread |
| | Success metric | Four screens open; first-load JS of the Studio route does not grow (the tab is a dynamic import); axe per tab zero serious or critical |
| Implementation | Existing files | PLANNED `src/components/studio/Workspace.tsx` (T-B4-25: right rail and bottom dock regions), `src/studio/commands.ts` (T-B5-21 pattern: `project.exportIno`, `project.importIno`), `BomPanel`, `GuidePanel`, `FlashPanel`, `RealityGap` (T-B20-31, 33, 34), export modules |
| | New files | `src/components/studio/BuildTab.tsx`; `BuildTab.test.tsx` |
| | Edited files | `src/components/studio/Workspace.tsx` (add the tab), `src/studio/commands.ts` (`build.open`, `build.bom`, `build.guide`, `build.reality`, `build.flash`). Source files: 3 |
| | Signatures | `export interface BuildCompute { bom(doc: Project, inputs?: Uint8Array): Promise<BomResult> }` (the `ExportHost` of T-B20-30 satisfies it structurally, so this task does not import that file) `export default function BuildTab(props: { session: ProjectSessionLike; registry: PartRegistry; locale: string; host: BuildCompute \| null }): JSX.Element;` |
| | Algorithm | On open: compute BOM, guide, checklist, flash plan, reality; recompute when the state hash changes (debounced 300 ms); never on a timer; no network. The inputs are read and never written here |
| | State transitions | Tab selection is UI state (T-B4-01 ui store) |
| | Validation, errors | A panel that throws is contained by a region error boundary (T-B4-25 pattern); the editor keeps working |
| | Edge cases | Read-only project; empty project (each tab shows its empty state); the project changes under the tab (collab edit): recompute |
| | Permissions | Follows the project's role |
| | Performance, migration | Lazy; recompute off the main thread when a host exists |
| Verification | Unit tests | `BuildTab.test.tsx` (jsdom with memory session): four tabs render for the Blink starter; Parts shows UNO 1, LED 1, resistor 1; a failed BOM check shows the refusal; no Flash section when `onFlash` is absent; commands registered |
| | Playwright | T-B20-40 |
| | Acceptance | Given the Blink starter, When I open Build it, Then Parts shows UNO 1, LED 1, resistor 1; Guide has steps with sources; Flash has the Uno recipe; Reality gap shows "not checked against hardware" |
| | Observability, release blockers | The `__iynkStudioDebug` `buildSummary()` hook is dropped from this phase: no task owned its file, and T-B20-40 reads the DOM instead. Blocker: any network request on tab open |
| Delivery | Definition of done | Tab mounted; three source files |
| | Verify commands | `TL`; `V src/components/studio src/studio`; `ARCH`; `I18N` |
| | Docs, rollback | `docs/BUILD_IT.md` (T-B20-41); revert (the tab disappears, panels remain unused) |
| | Later tasks need | T-B20-37b, 38, 40, 41 |

---

### T-B20-37b. Build it tab actions: inputs writes, substitutes accept, price check, Hardware, Nearby, Videos, dialogs

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-37b, Studio shell (R-185, R-191), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01 (seam row Q2), T-B20-08, T-B20-14, T-B20-22, T-B20-23, T-B20-32, T-B20-35, T-B20-36, T-B20-37a |
| Intent | Problem | The tab of T-B20-37a only shows data. A builder must also edit inputs, ask for substitutes, check prices, connect a board, export and import. Nearby makerspaces and Video help (F-157, F-158) still live in the Lab Dock with lab props |
| | Target user | Amar |
| | User story | As a builder I type "I have 2" on a resistor and undo it once; I press Check prices, read the cost, confirm; I connect my Uno; I find Nearby and Videos for the project |
| | Expected behaviour | `build-actions.ts` holds the logic as four small hooks: `useBuildInputs` (every edit goes `planBuildWrite` then `session.apply(ops)` plus the bytes stored in `assets`: one undo step), `useSubstitutes` (`findSubstitutes`, `substituteProposal`, then the B15 review UI and `acceptProposal`), `usePriceCheck` (`runPriceCheck` with `fetchOffers`, `priceChecks`, `now`, region from inputs), `useExports` (runs package, BOM, netlist, schematic through the host or direct calls, then calls `session.recordExport(record)`, Q2). `BuildTab` mounts `PricesPanel`, `PriceCheckDialog`, `MeasurementsPanel`, `SubstitutesDialog`, `HardwareTwinPanel` (with `studioSim(sim, boardId)`; the panel's `onMeasurement` goes to `useBuildInputs`), `ExportDialog`, `ImportDialog`, `NearbyPanelFor` and `VideoHelpFor`, and turns the read-only flag off for roles that may edit. `NearbyPanel.tsx` and `VideoHelp.tsx` change additively: the bodies move into new exports `NearbyPanelFor` and `VideoHelpFor`, and the old `NearbyPanel({lab})` and `VideoHelp({lab, itemId})` become one-line wrappers that compute their old defaults and call the new ones. So `LabDock.tsx:74-75` still compiles and `npm run typecheck` passes at the end of this task. The old props are removed in T-B20-38 |
| | Success metric | Every B20 screen opens; an input edit is one undo; Nearby and Videos fire only on their own button (T-B1-09); `npm run typecheck` is clean |
| Implementation | Existing files | `src/components/search/NearbyPanel.tsx:79` (`NearbyPanel({ lab }: LabDockProps)`), `:202` (`placeOutcome.code === "rate_limited" ? t("real.rateLimited") : t("nearby.failed")`); `src/components/search/VideoHelp.tsx:16` (`VideoHelp({ lab, itemId }: LabDockProps)`), `:74` (same shape), `:29-35` (the open-time search that T-B1-09 turns into a click); `src/components/dock/LabDock.tsx:74-75` (mounts both with `{...lab}`; untouched here); `src/studio/commands.ts`; T-B20-08 `planBuildWrite`, T-B20-22 `runPriceCheck`, T-B20-23, T-B15-04 `acceptProposal`, T-B5-08 `recordExport` |
| | New files | `src/components/studio/build-actions.ts`; `build-actions.test.ts` |
| | Edited files | `src/components/studio/BuildTab.tsx`, `src/studio/commands.ts` (`build.package`, `build.import`), `src/components/search/NearbyPanel.tsx`, `src/components/search/VideoHelp.tsx`. Source files: 5. Edited tests: `BuildTab.test.tsx`, the `NearbyPanel` and `VideoHelp` tests |
| | Signatures | `BuildTab` props gain `sim: StudioSimSource \| null` and `host` becomes `BuildCompute & { buildPackage(doc: Project, opts: Omit<PackageOptions, 'registry' \| 'tr'>): Promise<PackageResult> } \| null` (the `ExportHost` of T-B20-30 satisfies it; with `null`, `useExports` calls the pure functions on the main thread). `NearbyPanelFor(props: { context: { title: string; board?: string; kind?: NearbyKind } })` and `VideoHelpFor(props: { query: string })`. `build-actions.ts`: `export function useBuildInputs(session: ProjectSessionLike): { inputs: BuildInputs; edit(fn: (i: BuildInputs) => Result<BuildInputs, Diagnostic[]>): Promise<void> }` `export function useSubstitutes(...)` `export function usePriceCheck(...)` `export function useExports(...)` |
| | Algorithm | Inputs edit: `edit(i => setLine(i, key, patch))` and the other `build-inputs` functions, then `planBuildWrite(doc, next, newAssetId, origin)`, `session.apply(ops)`, store the bytes under `sha256`. Substitute review: `substituteProposal` -> B15 review UI -> `acceptProposal`; nothing applies before the review. Price check: the dialog shows `costNotice` first; Confirm calls `runPriceCheck`. Export: the result's `ExportRecord` goes to `session.recordExport`. Nearby and Videos receive a project-derived context (board name, part names) and fire only on their own button. The `quota_exhausted` branch uses `real.quotaOut` (T-B20-06) in both panels |
| | State transitions | Tab selection is UI state (T-B4-01 ui store) |
| | Validation, errors | A failed `planBuildWrite` shows its diagnostic and changes nothing. A panel that throws is contained by the region error boundary |
| | Edge cases | Read-only project: every edit control disabled; two edits in one tick queue in order; the project changes under an open dialog: the dialog keeps its snapshot and says so |
| | Permissions | Viewers see all tabs but cannot edit inputs, accept substitutes or import |
| | Performance, migration | Lazy; none |
| Verification | Unit tests | `build-actions.test.ts` (memory session): an input edit changes the hash by one asset entry and is one undo; read-only refuses; substitute accept goes through a stub `acceptProposal` and nothing applies earlier; price check makes zero `fetchOffers` calls on mount and shows the cost before Confirm; an export calls `recordExport` once with the record. `BuildTab.test.tsx` extended: all tabs render for the Blink starter. Nearby and Video tests: no search on open; quota text; the new props work and the old `{lab}` props still work |
| | Playwright | T-B20-40 |
| | Acceptance | Given the Blink starter, When I type "I have 2" on the resistor row, Then the BOM quantity drops and one undo restores it. Given a search key, When I tick 12 rows and press Check prices, Then the dialog says "up to 12 searches" before any request |
| | Observability, release blockers | None. Blocker: any network request on tab open (asserted in T-B20-40); `npm run typecheck` failing because an old caller of `NearbyPanel` or `VideoHelp` broke |
| Delivery | Definition of done | All screens mounted; five source files; old callers still compile |
| | Verify commands | `TL`; `V src/components/studio src/studio src/components/search`; `ARCH`; `I18N` |
| | Docs, rollback | `docs/BUILD_IT.md` (T-B20-41); revert (the tab goes back to read-only; the new exports vanish) |
| | Later tasks need | T-B20-38, 40, 41 |

---

### T-B20-38. Old parts-list panel: retire it if the lab pages are gone, else share the price code; remove the old Nearby and Video props

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-38, cleanup (CLAUDE.md step 0), B20 |
| | Priority, status, dependencies | P1, not started, T-B20-01 (seam rows `boardlab-store` and `lab-dock`), T-B20-32, T-B20-37b |
| Intent | Problem | `RealBuildPanel.tsx` (527 lines) prices lab items by id with its own fetch logic (`useOffers`, `RealBuildPanel.tsx:92-125`): a second pricing path next to T-B20-22. But B13 finding F4 (`B13-labs-robotics-drones.md:28`) keeps the old board pages and so the Lab Dock. `LabDock.test.tsx:138-145` and the dock specs (`e2e/dock.spec.ts:29-32`, `e2e/dock-shared.ts:54`) expect its tabs, and `LabDock.tsx:74-75` still mounts `NearbyPanel` and `VideoHelp` through the old props that T-B20-37b kept |
| | Target user | The maintainer |
| | User story | As a maintainer I want one pricing path and no old prop shapes left, without breaking the old lab pages |
| | Expected behaviour | Part 1, always: `LabDock.tsx` builds `context` and `query` from `lab` and `itemId` (the inputs the old components used: `DEFAULT_KIND[lab]`, `videoQuery(lab, itemId)`) and mounts `NearbyPanelFor` and `VideoHelpFor`; the old `{lab}` wrappers in `NearbyPanel.tsx` and `VideoHelp.tsx` are deleted; `index.ts` exports the new names. Part 2, variant A, only when seam row `lab-dock` says no page mounts `LabDock` (the old lab pages are retired): delete `RealBuildPanel.tsx` and its test, remove its export from `index.ts` and its mount and import at `LabDock.tsx:9,71`. Part 2, variant B (the default, HYPOTHESIS, because B13 F4 keeps the lab pages): keep `RealBuildPanel` and the lab's parts-list tab; replace its `useOffers` and batching with `costNotice`, `runPriceCheck` and the `priceChecks` store from T-B20-22 and T-B20-07, through a small `bomLineToRow` adapter in the same file, so the lab panel also shows the cost first, uses the cache and names a spent quota. Its hand-written lists in `src/lib/search/bom.ts` stay |
| | Success metric | Variant A: `grep -rn "RealBuildPanel" src e2e` prints nothing. Variant B: `grep -rn "useOffers" src` prints nothing. Both: `grep -rn "{...lab}" src/components/dock/LabDock.tsx` shows no mount of the old Nearby or Video props; `npm run typecheck` is clean; no old test is skipped |
| Implementation | Existing files | `src/components/dock/LabDock.tsx:9,71,74-75`; `src/components/search/NearbyPanel.tsx`, `VideoHelp.tsx` (wrappers from T-B20-37b); `src/components/search/index.ts:1-4`; `src/components/search/RealBuildPanel.tsx` and `RealBuildPanel.test.tsx` |
| | Edited files | Variant A: `LabDock.tsx`, `NearbyPanel.tsx`, `VideoHelp.tsx`, `index.ts` (4 source files); `RealBuildPanel.tsx` and `RealBuildPanel.test.tsx` are deleted (a deletion does not count against the five-file limit). Variant B: those four plus `RealBuildPanel.tsx` (5 source files). Edited tests in both: the `NearbyPanel` and `VideoHelp` tests, `src/components/dock/LabDock.test.tsx`; variant B also `RealBuildPanel.test.tsx` |
| | Algorithm | Step 0 (rule 12): `grep -rn "RealBuildPanel\|NearbyPanel\|VideoHelp" src e2e` and list every importer. If an importer other than `LabDock.tsx` and `index.ts` remains, edit it or stop and report. `src/lib/search/bom.ts` stays while `optimize.ts` imports `SLOTS` and `BomLine` from it (`optimize.ts:5`); the report lists what still uses it. One commit |
| | Validation, errors, edge cases | `NearbyPanelFor` and `VideoHelpFor` stay (T-B20-37b made them). A lab page whose item has no query gets the empty-query state the old component had |
| | Permissions, performance, migration | None |
| Verification | Unit tests | `npx vitest run src/components` passes. `LabDock.test.tsx` still finds the hardware tab and the parts tab. Variant B: a `RealBuildPanel.test.tsx` case checks that the cost sentence shows before any request and that a second press makes no request |
| | Playwright | `E e2e/dock.spec.ts` passes unchanged |
| | Acceptance | Given the repo, When I search for the old Nearby and Video prop use in `LabDock.tsx`, Then there is none. Variant A: Given a search for `RealBuildPanel`, Then there is no match. Variant B: Given the lab parts tab, When I press the price button, Then the cost shows first |
| | Release blockers | An e2e spec still using the deleted panel (`grep -rn "real-build\|RealBuild" e2e`); `LabDock.test.tsx` or a dock spec failing |
| Delivery | Definition of done | Old prop shapes gone; variant recorded in the commit body; checks pass |
| | Verify commands | `TL`; `V src/components`; `E e2e/dock.spec.ts`; `grep -rn "RealBuildPanel" src e2e` (variant A) |
| | Docs, rollback | `git revert` restores the old shapes |
| | Later tasks need | None |

---

### T-B20-39. No-affiliate test and the copy check for generated text

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-39, quality gate (CD-8, CM-66, CM-68), B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-19, T-B20-20, T-B20-20b, T-B20-24, T-B20-27, T-B20-32 (and B1's T-B1-20 copy check) |
| Intent | Problem | "No affiliate links, ever" and "never the word validated" must be tests, not intentions. The B1 copy check scans files; it does not scan text the export code generates |
| | Target user | The maintainer |
| | User story | As a maintainer CI fails if a link gets a tracking tag or a generated file says "validated" or "cheapest" |
| | Expected behaviour | `no-affiliate.test.ts` scans non-test source under `src` for tracking parameters in URL-shaped string and template literals (a literal that contains `://` or `?`), with the pattern `(^|[?&;\s])(tag|aff|affid|ref|utm_[a-z]+)=` (fixtures under `__fixtures__` excluded, since provider data holds `ref=`). The leading boundary class means `href=` in JSX or an HTML string, and `xref=`, do not match, and renders a listing link with a fixture URL through the real `PriceCheckDialog` and asserts `href` equals the input. `generated-copy.test.ts` builds `bomMarkdown` (T-B20-19), `guideMarkdown` (T-B20-20), `realityMarkdown` (T-B20-24), `flashMarkdown`, `checklistMarkdown`, `testsMarkdown` and `readmeText` (T-B20-20b) and the text files of `buildPackage` (T-B20-27) for the 3 examples in English and scans them with `scanText` from `scripts/copy-check.mjs`. The script gains the B20 phrases |
| | Success metric | CM-66 passes; CM-68's "validated" half passes on generated text; adding a literal such as `"https://example.com/p?utm_source=x"` to any source file fails the test |
| Implementation | Existing files | `scripts/copy-check.mjs` (T-B1-20: `scanText(file, text, exceptions)`, banned list including `validated`, `live prices`, `priced live`), `scripts/copy-exceptions.json`, `src/components/search/shared.tsx:88` (`external`), `src/components/studio/PriceCheckDialog.tsx` (T-B20-32) |
| | New files | `src/export/no-affiliate.test.ts`, `src/export/generated-copy.test.ts` (tests) |
| | Edited files | `scripts/copy-check.mjs` (add banned phrases `cheapest`, `best price`, `guaranteed to work`, `bench-ready`, `safe to power on`; keep exceptions format; add a unit case to `scripts/copy-check.test.mjs`) |
| | Algorithm | Tokenise each file into string and template literal pieces (single, double and backtick quotes, ignoring comments). Keep only pieces that look like URLs (contain `://` or `?`). Apply `(^|[?&;\s])(tag|aff|affid|ref|utm_[a-z]+)=` to those pieces. There is no allow-list: a hit fails the test and names `file:line`, and the agent fixes the code or reports a false positive for Amar. Negative cases in the test, each of which must pass the scan: `<a href="/x">`, a template `<a href="https://example.com/a">`, `xref=1`, `"https://example.com/p?q=1"`; positive cases that must fail: `"https://shop.example/p?ref=abc"`, `"?a=1&utm_source=x"`, `"https://shop.example/p?tag=k"`. Generated text scan: all English outputs concatenated per file and scanned |
| | Validation, errors, edge cases | Template literals with `${}` pieces are scanned on their literal pieces; the scan prints file:line |
| | Permissions, performance, migration | None; under 5 s |
| Verification | Unit tests | The two new tests (including the negative and positive pattern cases above); `copy-check.test.mjs` gains a case per new phrase |
| | Acceptance | CM-66: Given a fixture listing with a URL, When the app renders its link, Then the `href` equals the input and the repository contains no affiliate parameter literal |
| | Observability, release blockers | Problem list in test output. Blocker: an exception added without a reason |
| Delivery | Definition of done | Tests green, `COPY` exit 0 |
| | Verify commands | `TL`; `V src/export/no-affiliate.test.ts src/export/generated-copy.test.ts scripts/copy-check.test.mjs`; `git add -N src/export/no-affiliate.test.ts src/export/generated-copy.test.ts`; `COPY` |
| | Docs, rollback | CONTRIBUTING mention exists from B1; revert |
| | Later tasks need | T-B20-42 |

---

### T-B20-40. End to end: `e2e/build-it.spec.ts`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-40, e2e, B20 |
| | Priority, status, dependencies | P0, not started, T-B20-01, T-B20-37b, T-B20-38, T-B20-39 |
| Intent | Problem | The exit gate names this spec. It must prove the build path from a blink project to a BOM, a guide, flash steps and a package, offline, with no search key |
| | Target user | Amar, and CI |
| | User story | As Amar I run one command and see the Blink project become a parts list, a guide and a package, with zero outside requests |
| | Expected behaviour | Tests: (1) `blink to package`: open the Uno blink starter, open Build it, check BOM rows, open Guide and read steps with sources, open Flash and see the Uno recipe, build the package and read its entries from the download. (2) `no network without a key`: record every request; opening Prices, Reality gap and Build it triggers none to `/api/search`, `/v1/search`, or any non-origin host (CM-63 network half); the quad5 project's total reads 346.00 (CM-63). (3) `price check cost first`: with a stubbed search route (`page.route`) and a fake key in the keys store, 12 ticked rows show "up to 12 searches", at most 12 parts are requested, a second press makes zero requests (CM-64); a stubbed quota answer shows the key-out-of-searches text (CM-65). (4) `reality gap`: five sections, empty S1 text, no "validated" in the page text (CM-68). (5) `substitutes`: a resistor shows only valid candidates and applying one opens a review with a diff (CM-67). (6) `fake serial flash`: an init script installs a JS fake `navigator.serial` with a fake Optiboot; the Flash button runs to done. (7) `bom csv guard`: a part named `=SUM(1)` exports with a leading `'` (CM-70). (8) `mains refused`: a mains part refuses the export (CM-69). (9) `axe`: zero serious or critical on each tab. (10) `500 parts`: records the longest long task (CM-72, not a gate). (11) `de`: the BOM heading reads in German |
| | Success metric | All tests pass keyless, three runs in a row, with `LOAD` (14 busy-loop processes) |
| Implementation | Existing files | `playwright.config.ts:5` (random port 40000 to 49999), `e2e/dock-shared.ts` (`watchErrors` pattern), `e2e/studio-a11y.spec.ts` (T-B4-20 axe pattern), PLANNED starters (`src/studio/starters.ts`, T-B5-01) and the converted quad5 project `prj_drone-quad5` (seam row `quad5-project`, B13) |
| | New files | `e2e/build-it.spec.ts`; `e2e/build-it-helpers.ts` (request recorder, init-script installer); `e2e/stored-zip.ts` (`readStoredZip`, no imports); `e2e/fake-optiboot-js.ts` (exports `FAKE_OPTIBOOT_JS`, one string constant of JS source, no imports). Tests under `src/`: `src/lib/hw/optiboot-browser.test.ts`, `src/export/stored-zip.test.ts`. The one source file, if `ARCH` forbids a test in `src` importing from `e2e/`: `src/lib/hw/optiboot-browser.ts` holding the constant, imported by the e2e helpers |
| | Algorithm | The fake serial is the string `FAKE_OPTIBOOT_JS`, injected with `page.addInitScript`. It implements `requestPort`, `getPorts` and a port whose `readable` and `writable` streams run a JS copy of the fake Optiboot of T-B20-12. The copy is tested in a vitest file, `src/lib/hw/optiboot-browser.test.ts`: it evaluates the string with `new Function` against a Node `ReadableStream` and `WritableStream` pair, runs the same STK500v1 conversation as `fake-optiboot.ts` on the Blink image (sync, signature, load address, page write, page read, leave), and requires the same replies and the same final flash bytes from both models. The spec then asserts the final flash bytes equal the hex |
| | Validation, errors, edge cases | Downloads are read with `page.waitForEvent('download')`. The zip is parsed by `readStoredZip(bytes): { path: string; bytes: Uint8Array }[]` in `e2e/stored-zip.ts`, a small inline reader of about 40 lines for stored entries only: it finds the end-of-central-directory record, walks the central directory and returns each entry's bytes. The package writer uses no compression (T-B20-27, rule 8), so no inflate is needed, and a compressed entry throws. No app test hook is added. `src/export/stored-zip.test.ts` checks the reader against a zip made by the T-B3-05 writer. Tests clean up IndexedDB per test |
| | Permissions, performance | Port 3000 and 43117 are never used; `KL` prefix |
| Verification | Playwright | The spec itself |
| | Acceptance | Given a clean build, When `E e2e/build-it.spec.ts` runs, Then all eleven tests pass |
| | Observability, release blockers | Failure artifacts (trace on first retry). Blocker: a request to a non-origin host |
| Delivery | Definition of done | Spec green three times |
| | Verify commands | `TL`; `V src/lib/hw/optiboot-browser.test.ts src/export/stored-zip.test.ts`; `E e2e/build-it.spec.ts`; `LOAD` (three full runs of `npx vitest run` under 14 busy-loop processes, for the unit side) |
| | Docs, rollback | None; revert |
| | Later tasks need | T-B20-42 |

---

### T-B20-41. Documentation: `docs/BUILD_IT.md` and the bench record sheet

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-41, docs, B20 |
| | Priority, status, dependencies | P1, not started, T-B20-37b |
| Intent | Problem | The roadmap names `docs/BUILD_IT.md`. Amar must be able to follow it on the day he builds a project, and the result of that day must have a place to be written down |
| | Target user | Amar and friends |
| | User story | As a builder I read one page: what Build it does, what it cannot do, how to build the Blink project, how to flash, and where to record what I measured |
| | Expected behaviour | `docs/BUILD_IT.md`: (1) what the tab makes; (2) honesty: teaching model, tiers, "not checked against hardware"; (3) BOM rules (grouping key, generic parts, spares, `have`, `skip`, not purchasable); (4) prices (kinds, cost first, cache, your key, no affiliate); (5) guide order; (6) flashing and the Web Serial limits (Chromium, Uno and Nano, the hex must already exist); (7) hardware twin (Firmata, not your sketch); (8) reality gap sections; (9) substitutes and what they cannot know; (10) formats table with what is lost; (11) leave with your work; (12) safety notes (LiPo, motors, no mains); (13) recipe refresh rule. `docs/BENCH_RECORD.md`: a sheet to fill in on the day (project hash, parts bought, price paid, steps that were wrong, measured values with the tool and conditions, flash result, photo notes), plus the exact steps for entering the numbers in Measurements. `docs/STUDIO.md` gets a short "Build it" pointer (edit) |
| | Success metric | `COPY` (the check scans only git-tracked files, so run it after `git add -N` on the new files or after the commit) exits 0 on the new docs (no banned phrase); every relative link resolves |
| Implementation | Existing files | `docs/STUDIO.md` (T-B5-23), the copy check (T-B1-20) |
| | New files | `docs/BUILD_IT.md`, `docs/BENCH_RECORD.md` |
| | Edited files | `docs/STUDIO.md` |
| | Algorithm | Written from the final code; every claim carries a label word (VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN) in the notes column of the formats table; no claim that a format opens in another tool unless T-B20-42 or Amar tested it |
| Verification | Acceptance | Given the page, When a new reader follows "Build the Blink project", Then every step names a control that exists in the tab |
| | Release blockers | The words "validated", "live prices", "priced live" |
| Delivery | Definition of done | Docs committed; copy check green |
| | Verify commands | `git add -N docs/BUILD_IT.md docs/BENCH_RECORD.md`; `COPY`; `TL` |
| | Docs, rollback | Revert |
| | Later tasks need | T-B20-42 appends the exit record |

---

### T-B20-42. Exit gate: run everything, record the numbers

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B20-42, gate, B20 |
| | Priority, status, dependencies | P0, not started, all other B20 tasks |
| Intent | Problem | The phase ends with a stop for Amar. He needs one list of numbers, not a feeling |
| | Expected behaviour | Run in order and paste the real output lines into an "Exit record" section of `docs/BUILD_IT.md`: (1) `npm run check`; (2) `LOAD` three times; (3) `BUILD`; (4) `SRV` (`npm run server:test`); (5) `E e2e/build-it.spec.ts` three times; (6) the CM table below with the test name and result for each of CM-60 to CM-68, and CM-69 to CM-72; (7) the recorded CM-72 long task number; (8) the SVG visual check: open the Uno blink schematic export next to the editor view and write one sentence on any difference (PDM 12.2 asks for a visual diff on 3 examples; do all 3 by eye); (9) the open items: not tested in KiCad, not flashed on a real board, recipes dated; (10) the list of tasks cancelled by spike verdicts. The orchestrator then stops for Amar's OK |
| | Success metric | Every gate line is green or has a named, honest reason |
| Implementation | Edited files | `docs/BUILD_IT.md` (append) |
| | Algorithm | CM table to fill: CM-60 `bom.test.ts`; CM-61 `guide.test.ts`; CM-62 `bom.test.ts`; CM-63 `prices.test.ts` and `build-it.spec.ts` test 2; CM-64 `price-check.test.ts` and spec test 3; CM-65 `client.test.ts` and spec test 3; CM-66 `no-affiliate.test.ts`; CM-67 `substitutes.test.ts` and spec test 5; CM-68 `reality.test.ts`, `RealityGap.test.tsx`, spec test 4; CM-69 `bom-format.test.ts`, spec test 8; CM-70 `csv.test.ts`, spec test 7; CM-71 `reality.test.ts`; CM-72 spec test 10 |
| Verification | Acceptance | Given the branch, When the record is read, Then it shows the commands run, their output lines and the CM table |
| Delivery | Definition of done | Record committed; `phase-B20` tag is Amar's call after his OK |
| | Verify commands | The ten steps above |
| | Docs, rollback | Revert the record |
| | Later tasks need | None. This is the last phase |

## 7. Coverage of features, requirements and the exit gate

| Item | What it asks | Task(s) |
|---|---|---|
| F-090 Export `.ino`, wiring table, project file | Download sketch, wiring table, project file; T1 banner | T-B20-27 (package), T-B20-36 (menu); `exportIno` and `wiringCsv` from T-B5-10 |
| F-091 Import project file or `.ino` with losses | Open a file, list unsupported constructs | T-B20-28, T-B20-36 |
| F-154 Prices with the user's own key | Button only, cost first, cache | T-B20-06, 07, 22, 32 |
| F-155 Catalogue BOM with "not live" label | Dated catalogue prices, no call | T-B20-21, 32 |
| F-157, F-158 Nearby, video help | On request only, own key | T-B20-37b (mount), T-B20-06 (quota text) |
| F-159 Hardware twin over Web Serial and Firmata | Side by side; not supported text | T-B20-13, 14, 35 |
| F-160 BOM export | CSV with MPN and datasheet where known; Markdown | T-B20-04, 09, 10, 19, 31 |
| F-161 Wiring instructions, flashing steps, checklist | Steps from the netlist with sources | T-B20-11, 18, 20, 20b, 25, 33 |
| F-162 Reality-gap panel | Five sections | T-B20-24, 34 |
| F-163 (support) bench measurements | Own measurements with delta | T-B20-08, 24, 34, 35 |
| F-210 Schematic, wiring diagram and netlist export | SVG, PDF by print, netlist text and JSON | T-B20-15, 36 |
| F-211 Interchange formats | One chosen netlist format; Wokwi import if allowed | T-B20-03, 16, 17, 28 |
| F-212 Compatible substitutions | From descriptors, tests 1 to 5, as proposals | T-B20-23, 31 |
| R-181 | `.iynk`, `.ino`, wiring table CSV, netlist JSON; import `.ino`; round trip keeps hash | T-B20-15, 20b, 27, 28 |
| R-182 | BOM columns incl. fidelity; CSV and Markdown | T-B20-04, 10, 19 |
| R-183 | Catalogue prices with date, no call | T-B20-21, 32, 40 |
| R-184 | Prices with own key, quota shown, nothing unprompted | T-B20-06, 07, 22, 32 |
| R-185 | Step list from netlist with hole names, flashing, checklist, sources | T-B20-11, 18, 20, 20b, 33, 37a |
| R-186 | SVG and PDF of schematic; labelled wiring diagram; netlist JSON | T-B20-15, 36 |
| R-187 | One open netlist format round trip | T-B20-03, 16 |
| R-188 | Twin side by side; unsupported browsers text | T-B20-13, 14, 25, 35 |
| R-189 | Reality gap five sections, "not checked against hardware" | T-B20-24, 34 |
| R-190 | Pin-compatible alternatives with differences | T-B20-23, 31 |
| R-191 | Nearby and video help via own key, never unprompted | T-B20-37b |
| R-192 | Safety notes in packages; mains refused | T-B20-04, 19, 24, 26, 27 |
| CM-60 to CM-68 | The named gate | tests in T-B20-10, 11, 19, 21, 22, 23, 24, 06, 39; spec T-B20-40; table in T-B20-42 |
| CM-69 to CM-72 | Deepen R-192, R-181, F-163, D-011 | T-B20-19, 04, 24, 30 |

Features in the phase card that have no task of their own: F-164 (affiliate) is out of scope and guarded by T-B20-39. Gerber and manufacturing files are not planned.

## 8. Phase exit procedure

1. All tasks except T-B20-42 (T-B20-01 to T-B20-41, with 20b, 37a and 37b) committed on `build/v1`, one commit each, no push.
2. T-B20-42 run; its record is the evidence.
3. The orchestrator stops. Amar reads `docs/BUILD_IT.md`, does the items in section 9 that he chooses, and says OK or asks for changes.
4. Only then the local tag `phase-B20` (Amar's call). Merging to `main` deploys production on Vercel (DOCUMENTED, `HANDOFF.md`), so it is his decision, not a build task.

## 9. For Amar

These are not agent tasks. An agent can prepare the sheets; only a person can do the work.

| # | Item | Why only Amar | When |
|---|---|---|---|
| A1 | Build one project for real from the guide: the Blink starter on an Uno, then (if he wants) the one-sensor starter. Fill in `docs/BENCH_RECORD.md`: parts bought and price paid, every step that was wrong or unclear, multimeter readings with the tool and conditions, the result. Enter the readings in Measurements | Hardware and hands (roadmap section 6 item 14) | After T-B20-41; before the OK |
| A2 | Flash a real Uno and a real Nano from the page with a hex he trusts, in Chromium. Record the result. Then say whether the "experimental" chip may go | Needs a board; the model test cannot show a real Uno accepts the sequence | After T-B20-25 |
| A3 | Run the hardware twin against a real Uno with StandardFirmata and compare one recording with what he sees on the board | No hardware-in-the-loop test exists (F-159 row) | After T-B20-35 |
| A4 | Read the KiCad file-format terms, the Wokwi terms (T-B20-03 quotes them) and, from roadmap item 4, the arduino-cli licence, and say whether each use is acceptable | A legal reading, not legal advice from an agent | Before T-B20-16, T-B20-17 are accepted |
| A5 | Review the hazard tags on the shipped descriptors (LiPo, motors, chargers, high current, heat, laser). T-B20-24 lists parts with no tag under "check by hand" | Safety judgement on real components | Before relying on R-192 |
| A6 | Open an exported KiCad `.net` in KiCad and import one from KiCad (if he uses it) | Needs the program; the docs say "not tested in KiCad" until he does | Optional |
| A7 | Check the flashing recipes against the vendors' pages now and each time a tool changes (menus and file names change) | Vendor pages are EXTERNAL and age | After T-B20-18, then yearly |
| A8 | Print the guide on A4 and on Letter paper and check it is readable | Needs a printer | After T-B20-33 |
| A9 | Choose between the defaults in section 10 (OQ1 to OQ7) | They are orchestrator choices | At the phase stop |
| A10 | Decide the hackathon, production and merge questions (roadmap section 6 items 9 and 12) before merging anything | Only he knows | Before merging |

## 10. Open questions and defaults

| # | Question | Default | Cost of changing later |
|---|---|---|---|
| OQ1 | Where do build inputs live, given no op writes the root `ext` (Q1)? | A project asset `build/inputs.json` | One file (`build-inputs.ts`) plus a migration if a schema minor adds `ext.set` or `domains.build` |
| OQ2 | Which descriptor parameters split a BOM row? | `variant` parameters, and the `ohm`, `F`, `H` setting of passives (T-B20-10). The schema has no purchase marker | One function (`purchaseParams`); a schema minor with a marker is cleaner |
| OQ3 | Which price shows when a typed, a catalogue and a live price all exist? | COMMUNITY's order: typed, catalogue; the live listing is shown beside it as "lowest listing found" and is not added to the total unless the person types it | One function (`priceRows`) |
| OQ4 | Substitutes use B15's proposal review. B15 is not in B20's roadmap dependencies | Use it. If B15 is cut, fall back to a plain preview dialog | One component |
| OQ5 | Numeric defaults that are PROPOSAL: tolerance 5 percent, price cache 6 hours, history 90 days, default 12 rows and cap 24, substitute margin 20 percent, supply caution at 50 and 80 percent, first-power current 1.5 times | Keep | Constants in the named modules |
| OQ6 | PDF is made by the browser's print, not by iynk (Q8) | Keep; no PDF library | A later dependency decision |
| OQ7 | Recipe text is English only | Show an "English only" chip in other languages | Translation task |

## 11. Not in this phase

| Item | Why |
|---|---|
| Affiliate or commerce links (F-164) | Out of scope (D-013); T-B20-39 guards it |
| Marketplace (F-103), shared evidence programme | Out of scope; measurements stay the person's own |
| Gerber, footprints, manufacturing files, PCB layout | No footprints exist; not planned |
| SPICE netlist export and import (RS-08 oracle writer stays in B9) | No roadmap row; F-211 says KiCad or SPICE, and the spike picks one |
| Fritzing, Eagle, Altium | Heavy and licence UNKNOWN (PDM 12.2) |
| Flashing boards other than Uno and Nano from the page; flashing without an existing hex | Needs the compile path decision (RS-04, RS-05, RS-17) and Amar's licence reading |
| Bitstreams for Basys 3 and DE10-Lite | Not promised (PDM 12) |
| Live stock, delivery time, or a claim that a part is available | UNKNOWN unless a listing states it; the panel never fills the gap |
| Cheaper-choices optimiser for generic projects | F-156 for drones is in B19; the generic engine is not built |
| Currency conversion | Each listing keeps its own currency |
| Promoting a bench measurement to a part's `measured` rating slot | B11 never uses that slot (B11 C4, `B11-components.md:660`), and no task owns the descriptor edit. The Measurements panel has no promote button, no `onPromote` or `canPromote`, and no `meas.promote*` keys. A later phase adds it with the library edit ops |
| The `__iynkStudioDebug` `buildSummary()` hook | No task owned its file; T-B20-40 reads the DOM |

## 12. Risks

| Risk | Likelihood | Effect | Mitigation |
|---|---|---|---|
| An earlier phase names a file differently than planned | high | A task stops | T-B20-01 turns every outside name into a test before work starts |
| A later change retires the boardlab store or the Lab Dock while the twin or the parts tab still depend on them. B13 itself keeps the store (finding F4, `B13-labs-robotics-drones.md:28`) | medium | Typecheck fails, or `LabDock.test.tsx:138-145` and the dock specs fail | T-B20-14 keeps `sim.ts` and a thin `LabDock` adapter until seam row `boardlab-store` says the store is gone; T-B20-38 deletes `RealBuildPanel` only when seam row `lab-dock` says the old lab pages are retired |
| STK500 timing differs on a real Uno (reset pulse, bootloader wait) | medium | Flash fails on hardware | The "experimental" chip stays until A2; the hex download and steps always work |
| Part data coverage: generic parts have no MPN | high | BOM less useful | `generic: true` and a `specification` list; a datasheet search button with the person's key |
| Catalogue prices go stale | high | Wrong budget | Dates on every price; label "not live"; user prices override |
| Recipes age | high | Wrong steps | Dated sources; A7 |
| An exported KiCad file does not open in KiCad | medium | A broken promise | Docs say "not tested in KiCad" until A6; the spike builds from the public grammar only |
| Guide steps wrong for a real bench | medium | Wasted time or a damaged part | Checklist with power-off and current checks; A1 records every wrong step; fix before OK |
| The word "validated" or a banned phrase slips into generated text | medium | Over-trust | T-B20-39 scans generated English output; T-B20-05 key test |
| Asset-stored inputs are lost in a bare `.iynk` | medium | A friend loses typed prices | Loss code `build.inputs-not-in-bare-file`; `.iynkz` and the package keep them |

## Review fixes (2026-10-27)

Each issue was checked against the files named. All 14 were right in substance. One line number was off, noted in row 1.

| # | Issue | Evidence checked | Change made |
|---|---|---|---|
| 1 | B13 does not delete the boardlab store, so deleting `sim.ts` and the LabDock mounts breaks the lab path | `B13-labs-robotics-drones.md:28` (finding F4: "The boardlab store stays") and the "For Amar" row at `:1493` (the issue said `:1463`; line 1463 is the risk row R2, the For Amar item is at 1493). `LabDock.test.tsx:138-145`, `e2e/dock.spec.ts:29-32`, `e2e/dock-shared.ts:54` read in the repo. `twin.ts:8` imports `drivesFor` only as a re-export (`src/lib/boardlab/inputs.ts:7` from `src/lib/interp`) | Section 1 row, Q6 and risk row 2 rewritten. T-B20-14 rewritten: option (a) keeps `sim.ts` and adds a `LabHardware` adapter in `LabDock.tsx`, the panel takes `{sim, boardId, inputsReady}`, `twin.ts` imports `drivesFor` from `@/lib/interp` (so no `DriveModel` is needed); option (b) deletes `sim.ts` only when seam row `boardlab-store` says the store is gone. `LabDock.test.tsx` is an edited test. T-B20-38 now has variants A (delete `RealBuildPanel` only when seam row `lab-dock` shows the lab pages retired) and B (default: keep it and replace its `useOffers` with `runPriceCheck`) |
| 2 | T-B20-37 changed the Nearby and Video props before `LabDock` was edited, so typecheck failed | `LabDock.tsx:74-75` mounts both with `{...lab}`; `NearbyPanel.tsx:79` is typed `({ lab }: LabDockProps)`; `VideoHelp.tsx:16` likewise | T-B20-37b is additive: new exports `NearbyPanelFor` and `VideoHelpFor`, the old components become wrappers. T-B20-38 edits `LabDock.tsx`, removes the old wrappers, edits `index.ts`; its budget is `LabDock.tsx`, `NearbyPanel.tsx`, `VideoHelp.tsx`, `index.ts` (plus `RealBuildPanel.tsx` in variant B); deletions are not counted |
| 3 | `buildSummary()` was a sixth file; BuildTab held six jobs | Original T-B20-37 text | `buildSummary()` dropped (section 11). Split into T-B20-37a (shell: BOM, Guide, Flash, Reality, read-only; 3 files) and T-B20-37b (inputs writes, substitutes accept, price check, Hardware, Nearby, Videos, dialogs; 5 files), each with its own test. Index, groups (37a in G7, 37b in G8) and ownership table updated |
| 4 | T-B20-20 and T-B20-11 imported `BomResult` from T-B20-10, a later group | `BomResult` in the original T-B20-10 signatures; T-B20-11 `GuideOptions.bom`; T-B20-20 `buildChecklist` | `BomResult`, `BomWarning`, `BomWarningCode`, `CompanionNote` now live in `build-types.ts` (T-B20-04); T-B20-10 imports them. T-B20-05 added to the dependencies of 10, 11, 19, 20, 24, 26 and 27 |
| 5 | Dependency columns incomplete | Rule 2 | T-B20-01 added to every task but 02 and 03. T-B20-01 moved to a new group G0 so 04 to 07 can depend on it. 02 added to 18, 19 to 22, 16 to 27 and 28 as an injected optional function (`PackageOptions.kicadNet`, `ImportDeps.readers`), so the modules compile when 16 or 17 is cancelled. 33 takes `onFlash` as an optional prop so it compiles without 25. The index has a table of what changes when 12, 16, 17, 25 are cancelled |
| 6 | Wrong task ids in Q3, Q6, Q7, Q9, Q10 | Task headings in this file | Q3 -> T-B20-07, Q6 -> T-B20-14, Q7 -> T-B20-23, Q9 -> T-B20-17, Q10 -> T-B20-21 |
| 7 | Q2 left the record writer unnamed; `ino.ts` edit | `B5-studio-all-boards.md:177` and `:308` name `recordExport(r: ExportRecord): void` (T-B5-08); `:349` shows `InoExport {folder, ...}` | Q2 names `ProjectSession.recordExport`, a required seam row in T-B20-01, called by T-B20-37b. T-B20-27 no longer edits `ino.ts` and uses `exportIno(...).folder`; the "second file" remark is gone. Follow-up outside this file: `B5-studio-all-boards.md:371` still says "(T-B20-10)" and should say T-B20-27. I did not edit the B5 file |
| 8 | `importKicadNet` registry type too narrow | `B2-core-document-netlist.md:721`: `list()` returns `PartSummary` rows without `legacy_ids`; `resolveLegacy(legacyId): string \| undefined` exists | T-B20-16 and T-B20-28 use `Pick<PartRegistry, 'get' \| 'latest' \| 'list' \| 'resolveLegacy'>`; the mapping steps (id, `resolveLegacy`, name table from `list()` then `get()`) are written out |
| 9 | Leaf and branch key collisions; copy-check scans only tracked files | `en/search.json` is nested; `B1-foundation-keys-oss-honest.md:898` ("A file git does not track is never scanned") | `bom.sparesHint`, `prices.quotaCount`; the key test also fails on any leaf that is a prefix of another key. New shorthand `COPY` (`git add -N` first); used in 05, 32, 34, 39, 41 |
| 10 | Package files with no renderer | T-B20-18 returns steps only; T-B20-20 `guideMarkdown` is one combined file | New task T-B20-20b (`flashMarkdown`, `checklistMarkdown`, `testsMarkdown`, `readmeText`, golden tests). `guideMarkdown` sections are optional so `wiring.md` is the guide alone. T-B20-27 step (3) names the renderer of every file and writes none |
| 11 | `ref=` matches `href=`; missing dependencies | Original pattern text | Pattern `(^|[?&;\s])(tag|aff|affid|ref|utm_[a-z]+)=` on URL-shaped literals, no allow-list, negative cases for `href=` and `xref=`. Dependencies now 01, 19, 20, 20b, 24, 27, 32 |
| 12 | `LOAD`, `BUILD`, `SRV` undefined; self-contradicting fake serial test; zip reader hook | Roadmap lines 74-76 | Rows added to the shorthand table. `FAKE_OPTIBOOT_JS` in `e2e/fake-optiboot-js.ts`, compared with `fake-optiboot.ts` in `src/lib/hw/optiboot-browser.test.ts`. Inline stored-zip reader `e2e/stored-zip.ts` (about 40 lines, tested in `src/export/stored-zip.test.ts`); no app test hook |
| 13 | Catalogue test depends on drone content that B13 or B18 may restructure | `quad5.ts:93-116` read; per-line sum 212 + 38 + 88 + 8 = 346 | T-B20-01 gains seam rows `quad5-project` (id `prj_drone-quad5`, `B13-labs-robotics-drones.md:77`, with loader name) and `drone-content-prices` (`required: false`). T-B20-21's test falls back to literals listed in the task. Integration row names the loader |
| 14 | Promotion has no implementation | `B11-components.md:660` (C4: `measured` "never used in B11") | Promotion dropped: no button, `onPromote`, `canPromote` or `meas.promote*` keys. Listed in section 11 |

Follow-ups for the orchestrator: (1) change `B5-studio-all-boards.md:371` from T-B20-10 to T-B20-27; (2) roadmap section 1 effort and the roadmap-to-task map now include 20b, 37a and 37b (44 tasks); (3) seam rows `boardlab-store`, `lab-dock`, `quad5-project` and `drone-content-prices` are new inputs to T-B20-01 and need real names when that task runs.
