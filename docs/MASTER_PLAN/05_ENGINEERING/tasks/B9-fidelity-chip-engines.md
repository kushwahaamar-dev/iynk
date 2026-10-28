# B9 task packages: Fidelity, chip engines, buses, compile, debugger

Written 2026-10-27 for the build-plan step. Plan only: no file under `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed, and nothing was committed.
Phase card: `IMPLEMENTATION_ROADMAP.md` section B9 (lines 635 to 683). This file expands its 20 task rows to the BRIEF section 27 field set and splits the rows that were too big.
Labels: VERIFIED (I read it in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL (outside knowledge, not re-checked), ESTIMATED, HYPOTHESIS, UNKNOWN, PROPOSAL (my choice, Amar may overrule).

## 1. How to read this file

| Item | Meaning |
|---|---|
| Binding inputs | `DECISION_REGISTER.md` D-013 to D-017; `RECONCILIATION.md` (RC-28 switch names, RC-50 and RC-51 spike state, RC-55 range names, RC-56 avr8js role, RC-58 kill trigger, RC-59 compile limits, RC-60 tier names); `SIMULATION_ARCHITECTURE.md` (SIM) sections 5.4 to 5.6, 6.3, 7, 8, 9, 14, 16, 18; ADR-0013, 0303, 0304, 0305, 0307, 0310, 0315, 0404, 0427; the seven spike reports. |
| Proof shorthand | `TL`, `V <path>`, `E <spec>`, `KL`, `BUILD`, `SRV`, `LOAD` mean what `IMPLEMENTATION_ROADMAP.md` section 2.3 says. `PORTABLE` means `npx tsc -p tsconfig.portable.json` (made by T-B3-01; ADR-0014). |
| Task ids | `T-B9-01` to `T-B9-20` keep the roadmap ids and subjects. Where a roadmap row was too big for 5 source files, the remainder is a new id from `T-B9-21` up, and the roadmap row says what it keeps. Section 11 lists the roadmap edits. |
| 5-file rule | Counted as in roadmap section 2.2: tests count 0, deletions 0, a data set of one kind counts 1, `package.json` with its lockfile counts 1. Every task below is at most 5. |
| Branch and commits | `build/v1`, one commit per task, authored as Amar Kushwaha, no `Co-Authored-By`, no "Generated with" line, message `B9 T-B9-nn: <what>`. Never push. Never deploy. |
| Off limits | Production services, `.env.local`, ports 3000 and 43117. Tests run keyless (`KL`). The required proof of every task is offline: typecheck, lint and the vitest files. Downloads happen in these five steps only. Each goes to `node_modules`, the scratch directory (`/Users/amar/iynk-master-plan-scratch/buildplan/`), the Playwright browser cache or Docker's image store, never into the repo tree and never to production. (1) `npm install` in T-B9-07: the pinned engine packages `avr8js`, `@yowasp/yosys`, `yosys2digitaljs`, `digitaljs`, `eecircuit-engine` and `esbuild` (size UNKNOWN until measured). (2) `scripts/build-hex-fixtures.sh` in T-B9-08, T-B9-10 and T-B9-27: arduino-cli 1.5.1 and core `arduino:avr@1.8.8` (about 326 MB, RS-03) into the scratch directory; needed once to create fixtures, and again for `--check`. (3) The spike T-B9-18: `eecircuit-engine` and `playwright` into its scratch directory. (4) `npx playwright install firefox` in T-B9-20 (about 80 MB, browser cache). (5) `docker compose build` of the compile image in T-B9-14 (about 330 MB). A verify command that needs step (2) for `--check`, step (4) or step (5) is marked 'optional; skip and record NOT RUN if offline' in its task. Creating a fixture cannot be skipped: a task that must create hex files and cannot reach the toolchain stops and reports. T-B9-09, T-B9-19 verdict B, T-B9-32 and the `gen-ngspice-fixtures.mjs` scripts need no further download, because step (1) put their packages in `node_modules`. |
| Next.js | 16.4.3 (VERIFIED, `package.json`). A task that names a Next API reads the matching guide under `node_modules/next/dist/docs/01-app/` first (`AGENTS.md`). Only T-B9-09 and T-B9-33 touch Next-facing code, and they name no Next API beyond a client component. |

## 2. Scope check

| Item | Covered by |
|---|---|
| F-208 peripheral protocol models | T-B9-01, T-B9-23, T-B9-02, T-B9-03 |
| F-209 sensor and environment models | T-B9-04 (BME280), T-B9-06 |
| F-048 avr8js firmware mode | T-B9-07, T-B9-24, T-B9-25, T-B9-26 |
| F-049 sketch compile service | T-B9-37, T-B9-13, T-B9-14, T-B9-15, T-B9-28; hex import T-B9-08 |
| F-055 breakpoints and variable inspector | T-B9-11, T-B9-27, T-B9-36, T-B9-33, T-B9-12 |
| F-046 transient analysis | T-B9-18 (spike), T-B9-19 |
| F-182 software oracle suite | T-B9-10, T-B9-17, T-B9-31 |
| F-050 (R-110 Inspect), "only if time" in the roadmap | T-B9-09 (gate and elaboration), T-B9-32 (DigitalJS view, priority P3) |
| R-102 | T-B9-07, T-B9-24, T-B9-26 |
| R-103 | T-B9-08, T-B9-13, T-B9-14, T-B9-15 |
| R-105 | T-B9-18, T-B9-19 |
| R-106 | T-B9-11, T-B9-27, T-B9-36, T-B9-33, T-B9-12 |
| R-109 | T-B9-01, T-B9-23 |
| R-110 | T-B9-09, T-B9-32 |
| R-111 | T-B9-04, T-B9-06 |
| R-113 | T-B9-10 (CI differential), T-B9-17 |
| R-117 | T-B9-21, T-B9-22 (B9 engine areas only; the 15 hand-typed facts live in board and drone areas that other phases own, see T-B9-21) |
| Newton devices, G-T2 (ADR-0304) | T-B9-16, T-B9-34 |
| SA-03 | T-B9-17. SA-05: T-B9-18, T-B9-19. SA-09: T-B9-23. SA-12: T-B9-20. SA-14: T-B9-10, T-B9-31. SA-15: T-B9-27 (with T-B9-11, T-B9-33). SA-21: T-B9-09. SA-22: T-B9-08. SA-24: T-B9-04. |
| BA-18, FA-11 | BA-18: T-B9-14. FA-11: T-B9-09 (and T-B9-07 manifest entry) |
| Not in this phase | RP2040 emulation, Renode, QEMU, Xyce, browser avr-gcc, Rapier hash clauses of SA-12 (B16), a phone or Chromebook run (For Amar), SPICE-level device accuracy claims. |

## 3. Starting point (VERIFIED in this step unless marked)

| Fact | Evidence |
|---|---|
| `src/sim`, `src/sim-host`, `src/export`, `src/parts`, `src/project`, `src/components/studio`, `server/src` do not exist on `main` today. They come from B2 to B8. Every B9 path under them is "assumed from the roadmap task named in section 4". | `ls src` shows `app components content i18n lib` only |
| I2C costs zero virtual time; `Wire.begin` is a no-op; `beginTransmission`, `endTransmission`, `requestFrom` go straight to `world.i2cWrite` and `world.i2cRead` | `src/lib/interp/arduino/libs.ts:740-777` (`begin` at 745, `endTransmission` ~758, `requestFrom` ~766) |
| `SPI.transfer` returns 0 for any input | `src/lib/interp/arduino/libs.ts:779-790` (`transfer` at 787) |
| Library `begin()` attaches a device by itself | `libs.ts:1054` (SSD1306), `libs.ts:1117` (PCA9685) |
| The device list is closed: `I2CDevice` has `address`, `kind`, `write(bytes)`, `read(n)`; four built-in kinds plus `GenericI2C` | `src/lib/interp/devices.ts:4-11`, `:21` (Mpu6050), `:104`, `:173`, `:212`, `:242`, `:288-297` |
| `World.i2c` is a `Map<number, I2CDevice>`; `i2cWrite` returns false (NACK) with no device; `i2cRead` returns `[]` | `src/lib/interp/world.ts:142`, `:434-453` |
| `Exec.tick()` charges `opUs` per statement and has no line hook; statements carry a position `p: SourcePos` | `src/lib/interp/exec.ts:47-54`; `src/lib/interp/arduino/parser.ts:285-297`; `interp.ts:85` passes `world.profile.opUs` |
| Statement loop where a breakpoint check would go | `src/lib/interp/arduino/interp.ts:475-495` (`block` case, `rt.tick()` at 489) |
| `opUs` per board: Uno 1, R4 0.4, ESP32 0.1 | `src/lib/interp/profiles.ts:108, 124, 137` |
| Python `machine` has `I2C` and `SoftI2C` and no `SPI` or `UART` | `src/lib/interp/python/modules.ts:356, 388-389` |
| `LIBS` is a registry object (`Wire`, `SPI`, `Adafruit_SSD1306`, ...); `LibClass` is `{ headers, boards?, create, methods, statics?, props? }` | `libs.ts:35-42`, `:1408-1429` |
| No BME280 exists in the interpreter | `grep -ri bme280 src` returns nothing |
| The lesson reference check path is `runChecks` over every lesson and task | `src/lib/interp/lessons.test.ts:1-40` (SA-09 and SA-01 use it; 102 references per the roadmap, DOCUMENTED) |
| `avr8js` is not installed; neither are `arduino-cli`, `avr-gcc` or `ngspice` on this machine. Docker exists at `/usr/local/bin/docker` | `ls node_modules`, `which` |
| Playwright has Chromium and WebKit browsers cached; no Firefox | `ls ~/Library/Caches/ms-playwright` shows `chromium-*`, `webkit-*` only |
| `esbuild` is not a direct dependency; `typescript` is | `ls node_modules/esbuild` fails; `node_modules/typescript/package.json` exists |
| RS-03 toolchain: arduino-cli 1.5.1 (GPL-3.0), core `arduino:avr` 1.8.8, avr-gcc 7.3.0-atmel3.6.1-arduino7, avr8js `^0.21.1` | `08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md:24-25`, `src/package.json` |
| RS-08 ngspice came from npm `eecircuit-engine` `^1.9.0` (ngspice WASM); data files exist: `data/bench-circuits.json` (C01..C20), `data/random-stress.json` (60 circuits, 320 comparisons, worst relative 8.7e-13), `data/results.json`, `data/netlists/*.cir` (40) | `RS-08-mna-vs-ngspice/src/package.json`, `src/spice.mjs`, `data/` |
| RS-08 realistic model cards used generic parameters the author chose (`D1N4007 IS=7.03e-9 N=1.808 RS=0.0342`, `Q2N NPN IS=5e-15 BF=100 BR=5 VAF=100 RB=10 RC=0.5`) | `src/spice.mjs:47, 55` |
| Component schema: a part's model lives in `behaviour.layers[].model`, kinds `element`, `subcircuit`, `builtin`, `logic`; a builtin `ref` must match `^[a-z][a-z0-9]*:[a-z0-9][a-z0-9/_-]*@[1-9][0-9]*$`. A dot is not allowed, so `device:bme280.regs@1` (SIM 9.2.1) does not fit; the example uses `device:i2c/bme280@1`. The schema key is `behaviour` (British spelling), not `behavior` | `04_ARCHITECTURE/schemas/component.schema.json:752-830`; `schemas/examples/components/bme280-module.component.json` |
| The example BME280 part names its supply pin `VCC` (pins `VCC GND SCL SDA CSB SDO`); SIM 9.2.1 says `VIN` | `bme280-module.component.json` pins; `env-monitor-esp32.review-fixes.md:23` |
| `simulation.world.inputs[]` and `simulation.world.script[]` exist in the example project (`device.kind: "registry"`, `device.device: "bme280"`, `script: [{input, t, value}]`) | `schemas/examples/env-monitor-esp32.project.json` |
| Engines are files under `public/engines/<id>@<version>/` produced by `scripts/build-engines.mjs` and listed in `public/engines/manifest.json`; `loadEngine` is in `src/sim-host/engines/loader.ts` and reports `wireBytes` first | `FRONTEND_ARCHITECTURE.md:530-560`; ADR-0404 line 33. T-B3-09 writes `loader.ts` and says "no engines yet" (`FRONTEND_ARCHITECTURE.md:723`). No task before B9 writes `scripts/build-engines.mjs` (VERIFIED by grep of the roadmap), so T-B9-07 does. |
| `package.json` scripts: `typecheck` (`next typegen && tsc --noEmit`), `lint` (`eslint . --quiet`), `test` (`vitest run`), `e2e` (`playwright test`), `check` | `package.json:8-27` |

## 4. Interfaces assumed from earlier phases

B9 builds on names the roadmap gives earlier tasks. The agent reads the real file first; if a name differs, it adapts and does not rename the earlier file. "Assumed" is a HYPOTHESIS until the file exists.

| From | What B9 uses |
|---|---|
| T-B3-10 | `src/sim/core/clock.ts` (`SimTime`, `cyclesToNs`, `ClockRate`), `rng.ts` (seeded sfc32 streams by name), `hash.ts` (state hash), the lint ban on `Date.now`, `performance.now`, `Math.random`, `eval` under `src/sim` |
| T-B3-11 | `src/sim/engine.ts` (`Engine`, `EngineSnapshot`), `orchestrator.ts` (rank table, `SimEvent`), `digital/pins.ts` |
| T-B3-12 | `src/sim/mcu/arduino.ts`, `python.ts`, `verilog.ts`: interpreters wrapped as `McuEngine` (SIM 8.1) |
| T-B3-13, T-B3-14 | `src/sim-host/host.ts`, `protocol.ts` (`SimReq`, `SimEv`, every message `{ v: 1; id; t; run }`), `handler.ts` (all engine-side logic; `createSimHandler`), `sim.worker.ts` (a thin shell around the handler, B3 T-B3-13 "Interfaces"), `watchdog.ts` with `shouldYield()` and the 2 s kill (RC-58). SIM 17.2 already names `{ t: 'debug'; op: DebugOp }`; B3 leaves it out ("debug are added by B8/B9") |
| T-B3-15 | `src/sim/mcu/bind.ts` (binds pins, World and I2C devices to nets), `src/sim/digital/nets.ts` |
| T-B3-16, T-B3-17 | `src/sim/analog/types.ts`, `graph.ts`, `linsolve.ts`, `solve.ts` (`pwl` mode, convergence flag, structured results), `elements.ts` |
| T-B3-19 | `src/sim/replay/record.ts`, `trace.ts` (`ReplayRecord`, `versions.avr8js` as `<pkg>@<semver>+sha256:<hex>`) |
| T-B3-09 | `src/sim-host/engines/loader.ts` (`loadEngine`, `EngineManifestEntry`) |
| T-B4-12, T-B4-13 | `src/components/studio/CodeDock.tsx`, `RunBar.tsx`, `SerialPane.tsx`, `src/studio/run/session.ts` |
| T-B4-01 | `src/i18n/namespaces.ts` edited for a `studio` namespace; six message files per namespace |
| T-B6-01, T-B6-02, T-B6-07, T-B6-12, T-B6-17 | `server/src/main.ts`, `config.ts`, `app.ts` (`allRoutes(ctx)` is the single route registration point; `router.ts` only dispatches the list it is given), `http/server-info.ts` (hard-codes `features.compile: false`), `http/classes.ts` (`RouteClass`, `BucketName`; the union has no `compile` member, so T-B9-37 adds it), `http/limits.ts` (`createLimiter(deps, table?)`); `deploy/compose.yaml` with `web`, `server`, and a reverse proxy. Server tests are `server/test/*.test.ts` run by `node --test`; `server/tsconfig.json` typechecks them. Proof names: `SRVT` is `npm run server:typecheck`, `SRV` is `npm run server:test`, `SRV1 <file>` is `cd server && node --test test/<file>` (B6 section 4.1, DOCUMENTED; `server/` holds only `realtime/` today, VERIFIED) |
| T-B8-02 | include resolution with `file:line` source map in the interpreter |
| T-B8-14 | `SimHost.pause()`, `resume()`, `step(unit, n)`, `setSpeed()`, `status { state, speed, achievedSpeed, behindReal }` in `host.ts`; messages `{ t: 'speed' }`, `{ t: 'pause' }`, `{ t: 'resume' }` (B8 T-B8-14 "Modules and signatures"). There is no `holdAt` anywhere in the plan |
| T-B8-03, T-B8-04 | `src/sim/registry/entries.ts`, `tiers.ts`, `data/*.json`; `TierChips.tsx`, `ModelsPanel.tsx` |
| T-B8-05 to T-B8-09 | `src/sim/analog/live.ts`, `states.ts`, `rails.ts`; `src/sim/orchestrator.ts` phase order |
| T-B8-15 | `src/sim/replay/snapshot.ts`, `restore.ts` |

## 5. Choices made in this plan (PROPOSAL)

| # | Choice | Why |
|---|---|---|
| 1 | Roadmap ids 01 to 20 keep their subject; split-out parts are 21 to 35. | Ids in the roadmap and in commit messages must line up. |
| 2 | A new `fidelity` UI namespace with every B9 string is made once (T-B9-35, group 1). UI tasks read keys and do not edit message files. | One shared i18n set would otherwise be edited by five tasks, which forces five groups in a row. |
| 3 | The builtin `ref` for the BME280 is `device:i2c/bme280@1` (fits the schema pattern). The SIM registry id `device:bme280.regs@1` stays the fidelity-registry key. A device descriptor file holds both. | `component.schema.json` forbids a dot in `ref`. SIM 9.2.1 uses a dot. Neither document is edited here; RECONCILIATION should get a row (section 11). |
| 4 | The BME280 supply pin is `VCC`, as in the example part. The SA-24 "VIN at 1.0 V" case means the `VCC` pin. | The example descriptor and its review note chose `VCC` to match the real 6-pin breakout. |
| 5 | Register-map device data lives in `src/sim/devices/data/<name>.device.json`, keyed by the builtin ref. The component schema has no register-map field. | SIM 9.2 shows the format; the schema carries only `protocols[].params.address`. |
| 6 | An I2C START and a STOP each cost one bit time (`1e9 / speedHz` ns). A byte costs `9e9 / speedHz` ns (SIM 9.1 rule 1). | SIM says "plus start and stop" with no number. |
| 7 | The 50-sketch corpus (SA-14) is 50 original sketches written for this repo, not copied from the web. | Copying "public" sketches has licence cost under D-017. |
| 8 | Compiled `.hex` fixtures (3 + 5 + 50) are committed with a rebuild script. They contain Arduino core (LGPL-2.1, EXTERNAL) and avr-libc code. Amar confirms (section 10, item 3). | Tests must run with no toolchain installed. |
| 9 | The compile service is an HTTP service in the fourth compose container, reached over an `internal: true` network shared with `server`. The toolchain is downloaded at image build on the host's machine, pinned by sha256, never published. | ADR-0013 needs no egress, no volumes and nothing bundled. A container with `network_mode: none` cannot be called. |
| 10 | avr8js is loaded as a pinned engine file set through `loadEngine`; the engine function takes the module as an argument so Node tests import the npm package directly. | Keeps `avr8js.ts` testable and the browser path on the ADR-0404 route. |
| 11 | Results of the exit gate go to `docs/gates/B9-results.md` (T-B9-29). | The roadmap says "recorded" and names no place. |

## 6. Task index

Priority: P0 = needed for the exit gate; P1 = needed for a stated outcome; P2 = quality; P3 = only if time (roadmap: F-050 "only if time"). Status of every task: not started.

| Id | Task | Prio | Depends on (B9) | Files changed (source) | SA / BA gate |
|---|---|---|---|---|---|
| T-B9-01 | I2C, SPI, UART bus models with timing | P0 | none | 4 | feeds SA-09 |
| T-B9-02 | `Wire.begin` pin binding; devices from the netlist | P0 | 03, 23 | 4 (3 code files and 1 fixture set) | SA-23 step |
| T-B9-03 | Devices as data: loader, register map, closed expression grammar | P0 | 01 | 5 | none |
| T-B9-04 | BME280 model, `Adafruit_BME280`, part descriptor | P0 | 02, 03, 06, 20, 23 | 5 | SA-24 |
| T-B9-05 | Board power-model entries | P1 | none | 2 | feeds SA-23 |
| T-B9-06 | World script and environment sensors | P1 | 03, 23 | 4 | R-111 |
| T-B9-07 | avr8js engine behind `McuEngine`; build-engines script; all pinned engine packages; engine build in `prebuild`/`pretest` | P0 | none | 5 (`avr8js.ts`, manifest, `build-engines.mjs`, `.gitignore`, `package.json` with lockfile) | FA-11 (entry) |
| T-B9-08 | Hex and ELF import, DWARF lines, 1,000-file fuzz | P0 | none | 4 | SA-22 |
| T-B9-09 | Inspect gate: Yosys loader, sha256, memory rule | P2 | 07, 35 | 5 | SA-21, FA-11 |
| T-B9-10 | avr8js differential harness and 50-sketch corpus | P0 | 07, 08, 24 | 3 | SA-14 (part 1) |
| T-B9-11 | Interpreter `DebugPort`: breakpoints, step, `#line` map | P1 | none | 4 | SA-15 (part 1) |
| T-B9-12 | Variable inspection and watch for globals | P1 | 11, 27, 33 | 4 | SA-15 (globals) |
| T-B9-13 | Compile module on the server (needs Amar's licence answer) | P1 | 37 (gate: section 10 item 1) | 5 (`runner.ts`, `routes.ts`, `config.ts`, `server-info.ts`, `app.ts`) | none |
| T-B9-14 | Compile container and caps tests | P1 | 13 | 4 (3 new, `compose.yaml`) | BA-18 |
| T-B9-15 | Client `CompileService` and build status | P1 | 13, 26, 35 | 3 | none |
| T-B9-16 | Newton core and diode/LED in the solver | P0 | none | 4 | G-T2 junctions |
| T-B9-17 | Oracle gates against recorded ngspice output | P0 | none | 1 | SA-03 |
| T-B9-18 | Spike: transient backend verdict | P0 | none | 0 (docs and scripts) | SA-05 input |
| T-B9-19 | Transient backend per the verdict | P0 | 16, 18 | A: 4 (`transient.ts`, `companion.ts`, `backend.ts`, `orchestrator.ts`; 5 if a `solve.ts` hook is needed). B: 5 (`backend.ts`, `netlist.ts`, `ngspice-batch.ts`, `ngspice.manifest.json`, `build-engines.mjs`). C: 0 | SA-05 |
| T-B9-20 | `dmath` bit-identical across engines | P0 | none | 2 | SA-12 |
| T-B9-21 | Datasheet fixtures: buses, devices, MCU timing, sensors | P2 | 04, 10, 25 | 1 | R-117 |
| T-B9-22 | Analog device gates: ngspice and datasheet fixtures | P0 | 16, 17, 34 | 1 (script edit) | G-T2 junctions and BJT, R-117 |
| T-B9-23 | Interpreter on the bus models; fail loudly | P0 | 01 | 5 | SA-09 |
| T-B9-24 | avr8js pin, PWM and ADC adapter; assembly fixtures | P0 | 07 | 2 (`avr8js-pins.ts`, the `asm-*.json` fixture set) | SA-14 input |
| T-B9-25 | avr8js TWI and SPI bridge to the bus models | P1 | 07, 01 | 1 | none |
| T-B9-26 | Firmware mode switch and hex import entry | P0 | 07, 08, 24, 25, 35 | 4 | R-102 |
| T-B9-27 | avr8js debug adapter; SA-15 on both engines | P1 | 07, 08, 11 | 1 | SA-15 |
| T-B9-28 | `docs/COMPILE.md` and fidelity docs | P1 | 13, 14, 15, 26 | 2 docs | none |
| T-B9-29 | Exit gate: run everything and record results | P0 | all | 1 doc | all |
| T-B9-30 | Registry complete: every part has an entry | P1 | 04, 05, 34 | 2 | SA-17 re-run |
| T-B9-31 | Interpreter cost table, serial timing, ADC rule | P1 | 02, 10, 23, 24 | 4 | SA-14 (15 percent) |
| T-B9-32 | Inspect view with DigitalJS | P3 | 09 | 3 | none |
| T-B9-33 | Debug panel, gutter and host method | P1 | 11, 26, 35, 36 | 4 (`DebugPanel.tsx`, `CodeDock.tsx`, `host.ts`, `session.ts`) | SA-15 (UI) |
| T-B9-34 | BJT and MOSFET Newton devices with cited parameters | P0 | 16 | 4 | G-T2 BJT |
| T-B9-35 | `fidelity` UI namespace in six languages | P1 | none | 2 | none |
| T-B9-36 | Sim-side debug routing: `debug` request and `paused` event in the handler | P1 | 11 | 2 (`handler.ts`, `protocol.ts`) | SA-15 (host half) |
| T-B9-37 | `compile` rate-limit bucket | P1 | none | 2 (`classes.ts`, `limits.ts`) | BA-11 |

## 7. Parallel groups

Tasks in one group touch disjoint files (section 8 proves it) and can be built by separate agents at once. Groups run in order; a group starts after the previous group's tasks are committed. A task also waits for the tasks in its "Depends on" column, which are always in an earlier group. Compile tasks (T-B9-13, T-B9-14, T-B9-15) wait for Amar's answer to section 10 item 1; the rest of their group does not wait for them.

| Group | Tasks | Why this order |
|---|---|---|
| G1 | T-B9-01, T-B9-05, T-B9-07, T-B9-08, T-B9-16, T-B9-17, T-B9-18, T-B9-20, T-B9-35 | No B9 dependencies. Pure models, parsers, the spike, the oracle test, the string set. |
| G2 | T-B9-03, T-B9-09, T-B9-11, T-B9-23, T-B9-24, T-B9-25, T-B9-34 | Need G1 outputs: bus types, engine core, string set, Newton core. |
| G3 | T-B9-02, T-B9-06, T-B9-10, T-B9-19, T-B9-26, T-B9-27, T-B9-36, T-B9-37 | Need the loader (03), the interpreter on buses (23), the adapters (24, 25), the spike verdict (18), the interpreter debug port (11). T-B9-37 adds only a bucket name and its quota, so it does not wait for Amar's compile answer. |
| G4 | T-B9-04, T-B9-13, T-B9-22, T-B9-32, T-B9-33 | BME280 needs pin binding (02). Compile server needs Amar's answer and the bucket (37). Debug UI needs the sim-side routing (36). Inspect view needs the gate (09); it edits the engine build script after T-B9-19 may have. |
| G5 | T-B9-12, T-B9-14, T-B9-15, T-B9-21, T-B9-30, T-B9-31 | Need the BME280, the compile module, the debug UI, the corpus. |
| G6 | T-B9-28 | Docs after compile and firmware mode exist. |
| G7 | T-B9-29 | Exit gate runs last. |

Each task also needs a clean `build/v1` tree: an agent commits its task before the next agent in the group starts the final `TL`, or each agent works in its own `git worktree` and the orchestrator merges one commit per task in id order. Both are safe because files are disjoint (PROPOSAL).

## 8. File ownership

One owner per file per group. A file with two owners is edited by them in different groups, in the order shown. New files are marked N, edits E. Test files and fixture folders are owned by the task that names them and are not repeated here.

| File | Task (group) | Later editors (group) |
|---|---|---|
| `src/sim/bus/index.ts`, `i2c.ts`, `spi.ts`, `uart.ts` (N) | T-B9-01 (G1) | none |
| `src/sim/registry/power-models.ts`, `src/sim/registry/data/board-power.json` (N) | T-B9-05 (G1) | T-B9-30 reads, does not edit |
| `src/sim/mcu/avr8js.ts`, `src/sim-host/engines/avr8js.manifest.json`, `scripts/build-engines.mjs`, `.gitignore` (N, E), `package.json` and `package-lock.json` (E, once: engine devDependencies and the `prebuild`/`pretest` chain) | T-B9-07 (G1) | `scripts/build-engines.mjs`: T-B9-09 (G2), T-B9-19 (G3, only if the verdict is B), T-B9-32 (G4). `package.json`: no later B9 editor |
| `src/export/hex.ts`, `elf.ts`, `dwarf-lines.ts`, `scripts/build-hex-fixtures.sh` (N), fixtures `src/export/fixtures/` with `sketches.json` | T-B9-08 (G1) | none. The script is generic (`--set <name>` reads `<root>/sketches.json`), so T-B9-10 and T-B9-27 add only data |
| `src/sim/analog/newton.ts`, `devices/diode.ts`, `devices/index.ts` (N), `src/sim/analog/solve.ts` (E) | T-B9-16 (G1) | `devices/index.ts`: T-B9-34 (G2); `solve.ts`: T-B9-19 (G3) only if the verdict needs a hook |
| `src/sim/analog/oracle.test.ts`, `scripts/gen-ngspice-fixtures.mjs` (N) | T-B9-17 (G1) | `gen-ngspice-fixtures.mjs`: T-B9-22 (G4) |
| `src/sim/core/dmath.ts`, `e2e/dmath.spec.ts` (N), `playwright.config.ts` (E) | T-B9-20 (G1) | none |
| `src/i18n/messages/{en,de,es,fr,hi,zh}/fidelity.json` (N, one set), `src/i18n/namespaces.ts` (E) | T-B9-35 (G1) | none (a missing key is added by the task that needs it, alone in its group) |
| `src/sim/devices/loader.ts`, `register-map.ts`, `expr.ts`, `data/mpu6050.device.json` (N), `src/lib/interp/devices.ts` (E) | T-B9-03 (G2) | `devices.ts`: none |
| `src/sim-host/engines/inspect.ts`, `inspect.worker.ts`, `yosys.manifest.json`, `src/components/studio/InspectGate.tsx` (N), `scripts/build-engines.mjs` (E) | T-B9-09 (G2) | `InspectGate.tsx`: T-B9-32 (G4) mounts the graph via a prop, no edit |
| `src/sim/debug/breakpoints.ts` (N), `src/lib/interp/exec.ts`, `src/lib/interp/arduino/interp.ts`, `src/sim/mcu/arduino.ts` (E) | T-B9-11 (G2) | `interp.ts`: T-B9-12 (G5); `exec.ts`: T-B9-31 (G5) |
| `src/lib/interp/arduino/libs.ts`, `src/lib/interp/world.ts`, `src/lib/interp/errors.ts`, `src/lib/interp/python/modules.ts` (E), `src/sim/mcu/bus-port.ts` (N) | T-B9-23 (G2) | `libs.ts`: T-B9-02 (G3), T-B9-04 (G4), T-B9-31 (G5); `world.ts`: T-B9-06 (G3) |
| `src/sim/mcu/avr8js-pins.ts` (N) | T-B9-24 (G2) | none |
| `src/sim/mcu/avr8js-bus.ts` (N) | T-B9-25 (G2) | none |
| `src/sim/analog/devices/bjt.ts`, `mosfet.ts`, `params.ts` (N), `devices/index.ts` (E) | T-B9-34 (G2) | none |
| `src/sim/mcu/bind.ts` (E), `src/sim/mcu/i2c-bind.ts` (N) | T-B9-02 (G3) | none |
| `src/sim/env/world.ts`, `sensors.ts`, `index.ts` (N), `src/lib/interp/world.ts` (E) | T-B9-06 (G3) | `world.ts`: T-B9-31 (G5) |
| `src/sim/mcu/differential.ts`, `src/sim/mcu/corpus/` with its set file `corpus/sketches.json` (N) | T-B9-10 (G3) | none |
| Verdict A: `src/sim/analog/transient.ts`, `companion.ts`, `backend.ts` (N), `src/sim/orchestrator.ts` (E). Verdict B: `backend.ts`, `netlist.ts`, `ngspice-batch.ts`, `src/sim-host/engines/ngspice.manifest.json` (N), `scripts/build-engines.mjs` (E). Verdict C: none | T-B9-19 (G3) | none |
| `src/sim/mcu/firmware.ts`, `src/components/studio/FirmwareMode.tsx` (N), `src/components/studio/RunBar.tsx`, `src/studio/run/session.ts` (E) | T-B9-26 (G3) | `RunBar.tsx`: T-B9-15 (G5); `session.ts`: T-B9-33 (G4) |
| `src/sim/debug/avr8js-debug.ts` (N); set file `src/sim/debug/sketches/sketches.json` and `build/` hex and ELF (N) | T-B9-27 (G3) | `avr8js-debug.ts`: T-B9-12 (G5) |
| `src/sim-host/handler.ts`, `src/sim-host/protocol.ts` (E) | T-B9-36 (G3) | none in B9 (B8 T-B8-25 edits `sim.worker.ts`, not these two) |
| `server/src/http/classes.ts`, `server/src/http/limits.ts` (E) | T-B9-37 (G3) | none in B9 |
| `src/sim-host/engines/digitaljs.ts`, `src/components/studio/InspectGraph.tsx` (N), `scripts/build-engines.mjs` (E) | T-B9-32 (G4) | none |
| `src/sim/devices/bme280.ts`, `data/bme280.device.json`, `src/lib/interp/arduino/lib-bme280.ts`, `src/parts/data/bme280-module.component.json` (N), `libs.ts` (E) | T-B9-04 (G4) | none |
| `server/src/compile/runner.ts` (holds the caps and `checkRequest`), `routes.ts` (N), `server/src/config.ts`, `server/src/http/server-info.ts`, `server/src/app.ts` (E; `allRoutes` registers the three compile routes) | T-B9-13 (G4) | `runner.ts`: T-B9-14 reads, does not edit |
| `src/components/studio/DebugPanel.tsx` (N), `CodeDock.tsx`, `src/sim-host/host.ts`, `src/studio/run/session.ts` (E) | T-B9-33 (G4) | `DebugPanel.tsx`: T-B9-12 (G5). `protocol.ts` is T-B9-36's, read only here |
| `src/sim/debug/watch.ts` (N), `DebugPanel.tsx`, `interp.ts`, `avr8js-debug.ts` (E) | T-B9-12 (G5) | none |
| `deploy/Dockerfile.compile`, `deploy/compile/service.mjs` (N), `deploy/compose.yaml` (E) | T-B9-14 (G5) | none |
| `src/server-client/compile.ts`, `src/components/studio/CompileStatus.tsx` (N), `RunBar.tsx` (E) | T-B9-15 (G5) | none |
| `src/sim/fixtures.ts` (N) and fixture folders under `src/sim/bus`, `devices`, `mcu` | T-B9-21 (G5) | none |
| `src/sim/registry/entries.ts`, `src/sim/registry/data/*.json` (E) | T-B9-30 (G5) | none (T-B9-04 adds its device entry through its own `data/` file, not `entries.ts`) |
| `src/sim/mcu/cost-table.ts` (N), `libs.ts`, `exec.ts`, `src/lib/interp/world.ts` (E) | T-B9-31 (G5) | none |
| `docs/COMPILE.md`, `docs/FIDELITY.md` (E) | T-B9-28 (G6) | none |
| `docs/gates/B9-results.md` (N) | T-B9-29 (G7) | none |
| `src/sim/analog/fixtures/ngspice/junctions.json`, `bjt.json`, `src/sim/analog/fixtures/datasheet/`, tests; `scripts/gen-ngspice-fixtures.mjs` (E) | T-B9-22 (G4) | none |
| Fixture files under `src/sim/mcu/fixtures/`: `asm-blink.json` and `asm-pwm.json` (T-B9-24, G2, one data set), `asm-twi-write.json` (T-B9-25, G2), `mpu-bus.project.json` and `env-monitor.project.json` (T-B9-02, G3, one data set; T-B9-04 reads the second); `src/sim/debug/sketches/` (T-B9-11, G2) with `build/` hex and ELF added by T-B9-27 (G3) | as named | none |

Check: no row has two owners in the same group. `libs.ts` is G2, G3, G4, G5. `world.ts` (interp) is G2, G3, G5. `orchestrator.ts` is edited by B8 and then by T-B9-19 (G3). `session.ts` is G3 (T-B9-26), G4 (T-B9-33). `host.ts` is B8 then G4. `protocol.ts` and `handler.ts` are G3 only. `app.ts` is B6, B7, then G4. `classes.ts` and `http/limits.ts` are G3 only. `RunBar.tsx` is G3, G5. `exec.ts` is G2, G5. `interp.ts` is G2, G5. `scripts/build-engines.mjs` is G1, G2, G3 (verdict B only), G4. `DebugPanel.tsx` is G4, G5. `avr8js-debug.ts` is G3, G5. `devices/index.ts` is G1, G2.

## 9. Task packages

Every table has the BRIEF section 27 groups: identity, intent, implementation, verification, delivery. "n/a" always says why.

### T-B9-01 I2C, SPI and UART as bus models with timing

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-01. Subsystem: simulation layer L6, `src/sim/bus`. Phase B9, group G1. Priority P0. Depends on: T-B3-10 (`SimTime`), T-B3-11 (engine types). Status: not started. |
| **Problem** | I2C costs zero virtual time, `SPI.transfer` returns 0, UART is a print sink, so a wrong address, a missing pull-up or a swapped bus never shows (`libs.ts:740-790`; ADR-0307; interp defect D4). |
| **Target user** | A maker who wires a sensor and gets it wrong. |
| **User story** | As a maker, when I use the wrong address or leave out a pull-up, I want the bus to NACK or report a stuck line, so the circuit tells me what is wrong instead of returning plausible data. |
| **Expected behaviour** | Pure bus objects with timing, ACK and NACK, pull-up checks, mode and baud checks, and `NotModelled` results. Nothing in the interpreter uses them yet (T-B9-23 does). |
| **Success metric** | Byte cost at 100 kHz I2C is exactly 90,000 ns; SPI byte at 1 MHz is 8,000 ns; UART byte at 9,600 baud is 1,041,667 ns (rounded `10e9 / baud`); all unit cases below pass; 1,000,000 `transact` calls run under 1 s in Node (ESTIMATED budget). |
| **Existing files** | None edited. The behaviour being replaced is `src/lib/interp/arduino/libs.ts:740-790`; `src/lib/interp/world.ts:440-453` (`i2cWrite`, `i2cRead`). |
| **New files** | `src/sim/bus/index.ts` (types, `BusPort`, `NotModelled`, `StubPolicy`), `src/sim/bus/i2c.ts`, `src/sim/bus/spi.ts`, `src/sim/bus/uart.ts`. Tests `i2c.test.ts`, `spi.test.ts`, `uart.test.ts` beside them. |
| **Modules and signatures** | `index.ts`: `export type BusId = string; export type NetId = string; export interface NotModelled { notModelled: true; reason: string; causeId: 'bus-device-not-modelled' } export type BusOp = {kind:'i2c-start';addr7:number;read:boolean}\|{kind:'i2c-write';byte:number}\|{kind:'i2c-read';last:boolean}\|{kind:'i2c-stop'}\|{kind:'spi-transfer';cs:NetId;byte:number}\|{kind:'uart-byte';byte:number}; export interface BusResult { ack?: boolean; byte?: number; costNs: SimTime } export interface BusPort { transact(bus: BusId, op: BusOp): BusResult \| NotModelled } export type StubPolicy = 'fail' \| 'warn'; export interface BusEvent { atNs: SimTime; bus: BusId; kind: 'nack' \| 'stuck-low' \| 'no-pullup' \| 'rise-time' \| 'not-modelled' \| 'spi-mode' \| 'baud-mismatch' \| 'address-conflict'; detail: string }`. `i2c.ts`: `export function createI2cBus(cfg: I2cBus, o?: { stubPolicy?: StubPolicy; pullup?: 'assumed' | 'none'; onEvent?: (e: BusEvent) => void }): { ok: true; bus: I2cBusModel } \| { ok: false; error: string }`, with `I2cBusModel { attach(dev: I2cDevice): { ok: true } \| { ok: false; error: string }; detach(dev: I2cDevice): void; transact(op: BusOp, atNs: SimTime): BusResult \| NotModelled; state(): 'idle' \| 'busy' \| 'stuck-low'; riseTimeNs(): number \| null }`. `I2cBus` and `I2cDevice` exactly as SIM 9.1 (the `I2cBus` interface gets no `pullup` field: SIM 9.1 lists only `id, sda, scl, speedHz, pullupOhms?, capacitancePf?`, VERIFIED at `SIMULATION_ARCHITECTURE.md:978`). The pull-up case the netlist knows is an option of `createI2cBus`: `o.pullup` is `'assumed'` (default; no analog nets, so a pull-up is taken for granted) or `'none'` (the netlist has no pull-up on either line). T-B9-02 maps its `I2cBinding.pullup` to this option. `spi.ts`: `createSpiBus(cfg: SpiBus, o?): SpiBusModel` with `attach(dev: SpiDevice & { modes: (0\|1\|2\|3)[] })`. `uart.ts`: `createUartLink(cfg: UartLink, o?): UartLinkModel` with `attachDevice(d: { baud: number; receive(byte: number): void })`, `send(byte: number, atNs: SimTime): BusResult \| NotModelled`. |
| **Data model** | `I2cBus { id; sda: NetId; scl: NetId; speedHz; pullupOhms?; capacitancePf? }`, `SpiBus { id; sck; mosi; miso; mode: 0\|1\|2\|3; hz; bitOrder: 'msb'\|'lsb' }`, `UartLink { id; tx; rx; baud; format: '8N1'\|'8E1'\|'8N2' }`. Net ids are the `nets[].id` strings of `project.schema.json`. No stored fields are added to the project document. |
| **Input and output** | In: a `BusOp` and the caller's `atNs`. Out: `BusResult` with `costNs` or `NotModelled`. Events go to `onEvent`. |
| **API contract** | n/a: no HTTP. In-process module API above. |
| **Algorithm** | Cost (integer ns, `Math.round`): an I2C data byte `9e9 / speedHz`; an `i2c-start` op is the START condition (one bit time) plus the address byte (nine bit times), so `10e9 / speedHz`; an `i2c-stop` op is one bit time, `1e9 / speedHz` (PROPOSAL 6); SPI byte `8e9 / hz`; UART byte `bits * 1e9 / baud` with `bits` 10 for 8N1, 11 for 8E1 and 8N2. I2C pull-up rule (SIM 9.1 rule 4): with `pullupOhms` given, `riseTimeNs = 0.8473 * pullupOhms * (capacitancePf ?? 50) * 1e-3`; above 1,000 ns at `speedHz <= 100000` or above 300 ns at `speedHz > 100000` and `<= 400000`, emit `rise-time` and keep working (a warning, not a failure). With `pullupOhms` absent and `o.pullup` `'assumed'` (the default), state stays `idle`. With `o.pullup: 'none'`, `state()` is `stuck-low` and every `transact` returns `{ ack: false, costNs: 0 }` plus a `stuck-low` event. SPI: a device answers if `cs` is selected and `cfg.mode` is in `dev.modes`; a mode mismatch returns byte `0xFF` and a `spi-mode` event; no selected device returns `NotModelled`. UART: when `abs(txBaud - rxBaud) / rxBaud > 0.03` (EXTERNAL rule of thumb, HYPOTHESIS) the byte is replaced by `(byte * 167 + 13) & 0xff` and a `baud-mismatch` event fires; this is a pure function of the byte, so it is class B. `stubPolicy` only changes what a `NotModelled` carries: `'fail'` is the default; `'warn'` returns `{ byte: 0xFF, costNs }` with a `not-modelled` event. |
| **State transitions** | I2C: `idle` to `busy` on START (address ACKed or NACKed); `busy` to `idle` on STOP; a START while `busy` is a repeated start and is treated as STOP then START (clock stretching, arbitration: not modelled, ADR-0307 known limitations). `stuck-low` is terminal until `attach`/`detach` or config change. |
| **Validation rules** | `speedHz` integer 1,000 to 1,000,000; `hz` integer 1,000 to 50,000,000; `baud` integer 300 to 3,000,000; addresses 0 to 127; reserved addresses 0x00 to 0x07 and 0x78 to 0x7F always NACK; two devices on one address: `attach` returns `{ ok:false, error:'address-conflict' }` and emits the event. |
| **Error conditions** | Config out of range returns `{ ok:false, error }`, never throws. A `BusOp` of the wrong kind for the bus returns `NotModelled` with reason `wrong-bus-kind`. |
| **Edge cases** | Zero-length write to an address (MicroPython `I2C.scan()`, RS-06): returns ACK or NACK from `start` alone. Read with `last: true` sends NACK to the device. `i2c-write` before any START returns NACK. Two buses on the same nets are the caller's error and are not detected here. Timing never reads a wall clock. |
| **Permissions** | n/a: no data access, no network. |
| **Performance** | Under 1 s for 1,000,000 `transact` calls (Node); no allocation beyond the returned object; `costNs` is an integer below 2^53. |
| **Migration** | None: new module, unused until T-B9-23. |
| **Unit tests** | `i2c.test.ts`: byte cost at 100 kHz and 400 kHz; `i2c-start` (START plus address byte) and `i2c-stop` cost; ACK for a device at 0x76; NACK at 0x77; reserved address NACK; duplicate address refused; rise time at 4.7 kOhm and 100 pF is 0.8473 * 4700 * 100 pF = 398 ns, no event at 100 kHz; at 10 kOhm and 400 pF it is 3,389 ns and emits `rise-time`; a bus created with `o.pullup = 'none'` gives `stuck-low`, and one created with `o.pullup = 'assumed'` or no option stays `idle`; `o.pullup = 'none'` together with a `pullupOhms` value returns `{ ok:false, error:'pullup-conflict' }`; repeated start; zero-length write. `spi.test.ts`: byte cost; mode match and mismatch (`0xFF` plus event); no device gives `NotModelled` with cause `bus-device-not-modelled`; `stubPolicy: 'warn'` gives `0xFF`. `uart.test.ts`: byte cost for 8N1 and 8E1; baud within 3 percent passes the byte; 9,600 versus 115,200 garbles; garble is a pure function. Each file also asserts that no result depends on call order across two bus instances. |
| **Integration tests** | None here; T-B9-23 runs the 102 lesson references on top of these models. |
| **Playwright** | n/a: no UI. |
| **Fixtures** | None. Inline tables of expected numbers. |
| **Acceptance criteria** | Given an I2C bus at 100,000 Hz with one device at 0x76, When a START, one write byte and a STOP are sent, Then the three `costNs` values are 100,000 (START plus address byte), 90,000 and 10,000 and the write is ACKed. Given a UART link at 115,200 baud with a device expecting 9,600, When a byte is sent, Then the delivered byte differs and a `baud-mismatch` event is emitted. Given an SPI bus with no selected device, When a byte is transferred, Then the result is `NotModelled` with `causeId: 'bus-device-not-modelled'`. |
| **Observability** | `BusEvent` stream through `onEvent`. T-B10 turns events into diagnosis evidence. No logging, no telemetry. |
| **Release blockers** | Any import of a DOM or Node API (`PORTABLE` fails); a cost off by one ns in the tables above; a wall-clock read (lint ban from T-B3-10). |
| **Definition of done** | Four files and three test files committed; `PORTABLE` clean; tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/bus`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here (T-B9-28 writes the bus section of `docs/FIDELITY.md`). |
| **Rollback** | `git revert` the commit; nothing imports the module yet. |
| **Later tasks need** | T-B9-03 (`I2cDevice` and register devices), T-B9-23 (`BusPort`, `createI2cBus`, `createSpiBus`), T-B9-25 (avr8js TWI and SPI bridge), T-B9-21 (cost fixtures). |

### T-B9-05 Board power-model entries (3V3 rail, brown-out threshold)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-05. Subsystem: simulation registry, `src/sim/registry`. Phase B9, group G1. Priority P1. Depends on: T-B8-03 (registry types), T-B8-06 (rails and states). Status: not started. |
| **Problem** | The ESP32 DevKit 3V3 rail is a fixed 3.3 V today; the board figure already states the AMS1117 dropout and the MCU minimum, but nothing computes `min(3.3, vin - 1.1)` or the brown-out line (`figures/boards/esp32-devkitc.js:138-150`, VERIFIED by SIM 7.6.1). |
| **Target user** | A maker running the BRIEF 30 environment monitor on an ESP32 powered from a weak 5 V source. |
| **User story** | As a maker, when my 5 V input sags, I want the 3V3 rail to fall by the regulator rule and the board to reset below its minimum, so the reset has a stated cause. |
| **Expected behaviour** | A registry entry `board-power:esp32-devkitc@1` with sources, regulator and MCU minimum exactly as SIM 7.6.1 table, and a function that returns the rail voltage for a given input. Fields the figure does not state stay "not modelled at T1". |
| **Success metric** | For `vin` from 0 to 6 V in 0.1 V steps, `vout = min(3.3, vin - 1.1)` clamped at 0; `brownout` true below 2.43 V. SA-23 step c1 (3V3 between 3.2 and 3.4 V at 200 ms, DOCUMENTED SIM SA-23) reads this entry. |
| **Existing files** | `figures/boards/esp32-devkitc.js:138-150` (read only; sources `usb`, `pin5`, `pin3v3`, regulator U2, MCU U3 minimum 2.43). `src/sim/registry/entries.ts` (read, T-B8-03). |
| **New files** | `src/sim/registry/power-models.ts`; `src/sim/registry/data/board-power.json` (one data file, entries for the board). Test `src/sim/registry/power-models.test.ts`. |
| **Modules and signatures** | `export interface BoardPowerModel { id: string; sources: { id: 'usb' \| 'pin5' \| 'pin3v3'; nominalV: number; minV?: number; maxV?: number; dropV?: number; limitA?: number }[]; regulator: RegulatorModel; mcu: { part: string; rail: string; minV: number; requires: string[] }; brownout: BrownoutDetector; protection: { source: string; present: boolean }[]; notModelled: string[] } export function boardPower(id: string): BoardPowerModel \| undefined; export function regulatorOut(m: RegulatorModel, vin: number): number; export function mcuPowered(m: BoardPowerModel, railV: number): boolean`. `RegulatorModel` and `BrownoutDetector` are the SIM 7.6 types (import from `src/sim/analog/types.ts`, T-B3-16; if absent, define them there in this task and say so in the commit). |
| **Data model** | `board-power.json` holds `board-power:esp32-devkitc@1`: usb 5.0 V through J1 and D3 (drop 0.35 V, limit 0.5 A); `pin5` 4.75 to 5.25 V; `pin3v3` input 3.0 to 3.6 V bypassing the regulator; regulator `{ kind:'linear', voutVolts:3.3, dropoutVolts:1.1 }`; MCU U3 minimum 2.43 V needing U3 and R11; `protection: [{ source:'pin5', present:false }, { source:'usb', present:true }]`; `notModelled: ['regulator current limit', 'quiescent current', 'thermal shutdown']`. Brown-out `{ thresholdVolts, hysteresisVolts, minDwellNs, resetNs }`: threshold 2.43 from the figure; hysteresis, dwell and reset values are UNKNOWN until the ESP32 datasheet is cited, so the entry carries `parameterSources: [{ basis: 'assumed', note }]` and the Models panel says "assumed" (RC-60: never the word "validated"). |
| **Input and output** | In: board id, input voltage. Out: rail voltage, powered boolean. |
| **API contract** | n/a: no HTTP. |
| **Algorithm** | `regulatorOut`: `kind 'linear'`: `max(0, min(voutVolts, vin - dropoutVolts))`. `mcuPowered`: `railV >= mcu.minV`. Source selection when `usb` and `pin5` are both present is the higher after drops (PROPOSAL; the figure does not state diode-OR behaviour, UNKNOWN). |
| **State transitions** | n/a: pure functions. The brown-out state machine belongs to T-B8-06. |
| **Validation rules** | The JSON must carry a `parameterSources` row per number and a `source` string; the registry test (T-B8-03 SA-17) rejects an entry that asserts a tier above its computed tier. |
| **Error conditions** | Unknown board id returns `undefined`; callers show "not modelled yet". |
| **Edge cases** | `vin` below dropout gives 0 V rail, never negative; NaN input throws `RangeError` (numeric fault rule, SIM 6.4). |
| **Permissions** | n/a. |
| **Performance** | O(1) per call. |
| **Migration** | None. The old `bench.js` power tree stays for catalogue figures. |
| **Unit tests** | `power-models.test.ts`: the 61-point sweep of `regulatorOut`; `mcuPowered` at 2.42, 2.43, 2.44 V; entry loads and passes the registry validator; `notModelled` is non-empty; no field named `validated`. |
| **Integration tests** | None here; SA-23 (BRIEF 30 walk) runs in T-B9-29. |
| **Playwright** | n/a. |
| **Fixtures** | The JSON data file itself, with `figures/boards/esp32-devkitc.js` line numbers in each `parameterSources.note`. |
| **Acceptance criteria** | Given `vin` 5.0, When `regulatorOut` runs, Then it returns 3.3. Given `vin` 3.8, Then it returns 2.7 and `mcuPowered(m, 2.7)` is true. Given `vin` 3.4, Then it returns 2.3 and `mcuPowered` is false. |
| **Observability** | n/a: data only. |
| **Release blockers** | A number in the JSON with no `parameterSources` row. |
| **Definition of done** | Both files and the test committed; `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/registry`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-30 (every board has an entry), T-B9-29 (SA-23 walk). |

### T-B9-07 avr8js engine behind `McuEngine`, opt-in for compiled Uno and Nano firmware

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-07. Subsystem: simulation MCU engines and engine build, `src/sim/mcu`, `scripts`. Phase B9, group G1. Priority P0. Depends on: T-B3-09 (loader), T-B3-11, T-B3-12. Status: not started. This task makes the one `package.json` edit of the B9 engine work: every pinned engine package and the engine build step in `prebuild` and `pretest`. |
| **Problem** | The interpreters run a subset of Arduino C++. Libraries and sketches outside the subset cannot run. RS-03 showed avr8js 0.21.1 matches the interpreter on three sketches and runs 6.1 to 7.5 times real time on a desktop (ADR-0305). |
| **Target user** | A maker whose sketch uses a library or construct the interpreter does not model. |
| **User story** | As a maker, I want to run my compiled Uno sketch on a cycle-exact AVR so that any library works, knowing it is slower on a weak laptop. |
| **Expected behaviour** | `engine:avr@1.0.0` implements `McuEngine` with tier `T3`: load a hex, run in cycle batches, stop early at a pin write, a bus event or an ADC start, report serial bytes with USART timing, reset, hash its state. Pins, ADC, buses and debug attach through adapters made by T-B9-24, T-B9-25 and T-B9-27. |
| **Success metric** | In Node, blink runs at 3 times real time or faster (RS-03 measured 6.1 to 6.5; the 3 times floor is HYPOTHESIS for CI noise). A hand-assembled 12-instruction program that sets DDRB, toggles PORTB and loops produces the expected PORTB edge times to the cycle. |
| **Existing files** | `package.json` and `package-lock.json` (E, counted as one file; one edit). (a) `devDependencies`, exact versions, no `^`: `avr8js` `0.21.1` (RS-03 used `^0.21.1`, SIM 8.4 says 0.21.1), `@yowasp/yosys` `0.71.188-dev.1267`, `yosys2digitaljs` `0.10.3`, `digitaljs` `0.14.2` (RS-12 `REPORT.md:178`), `eecircuit-engine` `1.9.0` (RS-08 `REPORT.md:195`), `esbuild` `0.28.2` (RS-03 used `^0.28.2`; the build script bundles DigitalJS with it, T-B9-32). The agent runs `npm view <pkg>@<version> version` for each, and records any version that does not resolve instead of choosing another. These pins are why T-B9-09, T-B9-19 verdict B and T-B9-32 need no `package.json` edit and no download: they copy from `node_modules`. (b) scripts: add `"engines:build": "node scripts/build-engines.mjs --if-present"` and change `prebuild` (`package.json:13`) and `pretest` (`package.json:20`) from `npm run content` to `npm run content && npm run engines:build`. Today both run only `npm run content`, `public/engines/` is git-ignored, and `playwright.config.ts:14` runs `npm run build`, so without (b) `e2e/firmware-mode.spec.ts`, `inspect.spec.ts`, `inspect-graph.spec.ts` and `compile.spec.ts` fail on a clean tree (VERIFIED by reading `package.json` and `playwright.config.ts`). `.gitignore` (E: add `public/engines/`). `src/sim/mcu/arduino.ts` (read: the `McuEngine` wrapper to copy the shape from, T-B3-12). |
| **New files** | `src/sim/mcu/avr8js.ts`; `src/sim-host/engines/avr8js.manifest.json`; `scripts/build-engines.mjs`. Tests `src/sim/mcu/avr8js.test.ts`. |
| **Modules and signatures** | `avr8js.ts`: `export type Avr8js = typeof import('avr8js'); export interface AvrAdapter { readonly id: string; attach(ctx: AvrContext): void; beforeBatch?(ctx: AvrContext): void; afterBatch?(ctx: AvrContext): void } export interface AvrContext { cpu: import('avr8js').CPU; ports: Record<'B'\|'C'\|'D', import('avr8js').AVRIOPort>; usart: import('avr8js').AVRUSART; adc: import('avr8js').AVRADC; twi: import('avr8js').AVRTWI; spi: import('avr8js').AVRSPI; timers: import('avr8js').AVRTimer[]; clock: ClockRate; cyclesToNs(c: number): SimTime } export interface AvrEngine extends McuEngine { addAdapter(a: AvrAdapter): void; breakBitmap: Uint8Array \| null; onBreak: ((pc: number) => void) \| null; readonly cycles: number } export function createAvrEngine(avr: Avr8js, o: { board: 'uno-r3' \| 'nano'; baud?: number }): AvrEngine`. `build-engines.mjs`: `node scripts/build-engines.mjs [--check] [--only <id,id>] [--if-present] [--publish]` copies the pinned engine files from `node_modules` into `public/engines/<id>@<version>/`, computes sha256 and bytes, merges every `src/sim-host/engines/*.manifest.json` into `public/engines/manifest.json` (the shape of `EngineManifestEntry`, `FRONTEND_ARCHITECTURE.md:534-541`); `--check` exits 1 if the committed entry's id, version or licence differ from `node_modules`. `--if-present` (what `engines:build` passes) skips an engine whose package is not in `node_modules` and prints `SKIPPED <id>`; without it a missing package exits 1, and `--only <id>` always behaves that way for the named ids. The script does nothing and exits 0 when `process.env.VERCEL` is set (a production build must not receive tens of megabytes of engine files; whether Vercel's size limit would bite is UNKNOWN) unless `--only` names an id. `--publish` (for a deploy image) refuses any engine whose manifest has `license.reviewed: false`. Re-running is idempotent: a file whose sha256 already matches is not copied again. |
| **Data model** | `avr8js.manifest.json`: `{ id:'avr8js', version:'0.21.1', files:[], requires:{}, license:{ spdx:'MIT', reviewed:false }, budget:{ wireBytes: <measured>, rawBytes: <measured> } }`. `files` is filled by the build script; the committed file keeps `files: []` and the budget numbers from the first measured build (size UNKNOWN until measured, `FRONTEND_ARCHITECTURE.md:556`). The replay record's `versions.avr8js` is `avr8js@0.21.1+sha256:<hex>` of the entry file (T-B3-19 format). |
| **Input and output** | In: `load({ kind:'hex', hex, elf?, sourceMap? })` (ProgramImage, SIM 8.1), `advanceTo(horizon, budget)`. Out: `{ reached, stoppedEarly }`, serial bytes via `serial.onByte(cb)`, pin and bus events through adapters. |
| **API contract** | n/a: no HTTP. The browser path is `loadEngine('avr8js')` (T-B3-09) which returns file URLs; the worker imports the entry and passes the module to `createAvrEngine`. |
| **Algorithm** | Build script: for each `src/sim-host/engines/*.manifest.json` find the package named by its `source.npm` (or `id` for avr8js), copy the files, fill `files[]` with path, bytes and sha256 in the generated `public/engines/manifest.json`, and leave the committed manifest untouched. Engine: instruction loop is host-owned (SIM 8.4): `while (cpu.cycles < targetCycles) { avrInstruction(cpu); cpu.tick(); if (stop flag) break }`. A pin-write listener, a TWI or SPI event or an ADC start sets the stop flag, so the batch ends right after the instruction that caused it. If `breakBitmap` is set, a checking variant tests `breakBitmap[cpu.pc >> 3] & (1 << (cpu.pc & 7))` after each instruction and calls `onBreak`; without a bitmap the plain loop runs (SIM 8.7). Time: `ClockRate { num:125, den:2 }` (62.5 ns per cycle at 16 MHz); `cyclesToNs = floor(cycles * 125 / 2)`. USART0: byte callback stamps `cyclesToNs(cpu.cycles)`; baud timing comes from the peripheral. Flash load: Intel HEX bytes into `Uint16Array` program memory little-endian. `reset('power' \| 'button' \| 'brownout' \| 'watchdog' \| 'code')` zeroes SRAM and registers and reloads PC 0. |
| **State transitions** | `unloaded` to `loaded` (load ok) to `running` (advanceTo) to `paused` (breakpoint, T-B9-27) to `running`; `error` on invalid image or an illegal opcode (`avr-illegal-opcode` diagnostic with PC). |
| **Validation rules** | `board` must be `uno-r3` or `nano` (ATmega328P, 32 KiB flash, 2 KiB SRAM); any other board returns `{ ok:false, reason:'unsupported-board' }` from `load`. Image bigger than 32,768 bytes is rejected (T-B9-08 owns hex parsing and its named errors). |
| **Error conditions** | Illegal opcode, PC outside flash, stack pointer below SRAM start: the engine halts with a diagnostic naming the cycle, PC and a hint; it never throws across the worker boundary. NaN cannot arise (integer machine). |
| **Edge cases** | `advanceTo` with horizon below the current time is a no-op. Sleep instruction with interrupts off is an idle jump to the next timer event (cap 1,000,000 idle cycles per batch). Uno R4 and ESP32 are refused. |
| **Permissions** | n/a: runs in the sim worker with the same limits as the interpreters (400,000 statements per slice does not apply; the equivalent is a cycle budget per slice, `SliceBudget`, from T-B3-14). |
| **Performance** | Desktop Node at least 3 times real time (RS-03: 6.1 to 6.5 with listeners, DOCUMENTED); listeners cost under 3 percent (RS-03). Phone and Chromebook speed UNKNOWN; opt-in and desktop-first (roadmap risk R3). |
| **Migration** | None. A first-time `npm install` adds six dev dependencies (the packages in Existing files); their install size is UNKNOWN until measured, and the agent records it in the commit message. `scripts/build-engines.mjs` also serves T-B9-09, T-B9-19 verdict B and T-B9-32. |
| **Unit tests** | `avr8js.test.ts` (Node, imports the npm package): hand-assembled program (words listed in the test) toggles PORTB bit 5 every 8 cycles and the edge times equal `cyclesToNs(8 * k)`; USART byte stamped at baud time; `reset('power')` clears SRAM; `board: 'esp32-devkitc'` is refused; image over 32,768 bytes refused; `breakBitmap` stops at the chosen PC and `onBreak` receives it; two runs from the same image give the same `stateHash()`; illegal opcode halts with a diagnostic. `build-engines.mjs --check` is run as a test through `node:child_process` and must exit 0; a second case runs `--if-present` with a temporary `node_modules` path missing one package and expects `SKIPPED` and exit 0. The hand-assembled words are written inline in `avr8js.test.ts` (12 words, one comment per instruction); no fixture file is read, so this task owns no data file. |
| **Integration tests** | None here, so the G1 tasks stay independent. The blink hex integration (2 simulated seconds, PORTB.5 toggles 4 times at 500 ms, RS-03 blink) runs in T-B9-10 and T-B9-26, which depend on T-B9-08. |
| **Playwright** | n/a here (T-B9-26 owns the browser path). |
| **Fixtures** | None owned. The 12 hand-assembled words are inline in `avr8js.test.ts`; `src/sim/mcu/fixtures/asm-blink.json` (the same words as data) is created by T-B9-24, which is the first task that needs them as a file. |
| **Acceptance criteria** | Given the hand-assembled toggle program, When the engine runs 800 cycles, Then PORTB.5 has 100 edges at exactly 8-cycle spacing. Given an `esp32-devkitc` board, When `load` is called, Then it returns `unsupported-board`. Given the same image run twice, Then `stateHash()` is equal. |
| **Observability** | Engine counters `cycles`, `batches`, `stoppedEarlyBy` read by the host for the "behind real time" text (T-B8-14); no logging. |
| **Release blockers** | every engine package pinned to an exact version in `package.json` and the lockfile; `prebuild` or `pretest` that does not build the engines; manifest `license.reviewed` stays `false` until Amar reviews (D-017) and the build script refuses to copy an unreviewed engine into a published build; no import of Node APIs in `avr8js.ts` (`PORTABLE`). |
| **Definition of done** | Engine, manifest, script, `.gitignore`, `package.json` with lockfile committed; tests green; `node scripts/build-engines.mjs --check` exits 0; on a tree with `public/engines/` deleted, `npm run engines:build` recreates `public/engines/manifest.json`. |
| **Verify commands** | `npm install` (network; the pinned packages) then `npm run typecheck && npm run lint`; `npx vitest run src/sim/mcu/avr8js.test.ts`; `npx tsc -p tsconfig.portable.json`; `node scripts/build-engines.mjs --check`; `rm -rf public/engines && npm run engines:build && test -e public/engines/manifest.json`. |
| **Documentation** | Licence row for avr8js (MIT, RS-03) goes in the engine manifest; `docs/FIDELITY.md` is T-B9-28. |
| **Rollback** | `git revert`; `npm install` restores the lockfile. |
| **Later tasks need** | T-B9-24, T-B9-25, T-B9-27 (adapters), T-B9-26 (firmware mode), T-B9-10 (differential), T-B9-09, T-B9-19 verdict B and T-B9-32 (build script and the pinned packages). |

### T-B9-08 Hex and ELF import with limits and a 1,000-file fuzz (SA-22)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-08. Subsystem: export and import parsers, `src/export`. Phase B9, group G1. Priority P0. Depends on: T-B3-01 (portable config), T-B3-14 (`shouldYield`). Status: not started. |
| **Problem** | Hex import is the one compile path that always works (ADR-0013 option C). Imported files are untrusted: sizes, section tables and DWARF line programs can hang or exhaust memory. No parser exists (SIM 8.8: "no parser exists yet"). |
| **Target user** | A maker who compiled elsewhere, and the maintainer who must not be hurt by a hostile file. |
| **User story** | As a maker, I want to import a `.hex` (and an optional `.elf`) and get either a running image or a named error, so a bad file never freezes my tab. |
| **Expected behaviour** | `parseHex`, `parseElf` and `parseLines` return `{ ok:true, ... }` or `{ ok:false, error:{ kind, offset?, message } }` for every input, never throw, finish in under 2 s each, and count their buffers against a 64 MiB logical heap. |
| **Success metric** | 1,000 malformed files (500 hex, 500 ELF), seeded, never throw outside the parser, each under 2 s, heap under 64 MiB, every failure carries a `kind` from the list below (SA-22). |
| **Existing files** | None edited. Limits come from SIM 8.8. |
| **New files** | `src/export/hex.ts`, `src/export/elf.ts`, `src/export/dwarf-lines.ts`, `scripts/build-hex-fixtures.sh`. Data (one data set): `src/export/fixtures/` holding the three RS-03 sketches (blink, motor, knob) as `.hex` and `.elf`, and the set file `src/export/fixtures/sketches.json`. Tests `hex.test.ts`, `elf.test.ts`, `dwarf-lines.test.ts`, `fuzz.test.ts`. |
| **Modules and signatures** | `hex.ts`: `export interface HexImage { flash: Uint8Array; usedRanges: [number, number][]; bytes: number } export type ParseError = { kind: string; offset?: number; message: string } export type ParseResult<T> = { ok: true; value: T; workUnits: number } \| { ok: false; error: ParseError }; export function parseHex(text: string, o: { flashBytes: number; shouldYield?: () => boolean }): ParseResult<HexImage>`. `elf.ts`: `export interface ElfImage { flash: Uint8Array; symbols: { name: string; addr: number; size: number; section: string }[]; sections: { name: string; offset: number; size: number }[] } export function parseElf(bytes: Uint8Array, o: { flashBytes: number; shouldYield?: () => boolean }): ParseResult<ElfImage>`. `dwarf-lines.ts`: `export interface SourceMap { files: string[]; entries: { pc: number; file: number; line: number; column?: number; isStmt: boolean }[] } export function parseLines(debugLine: Uint8Array, o: { shouldYield?: () => boolean }): ParseResult<SourceMap>`. `SourceMap` is the SIM A.4 type; if T-B3 already exports it, import it instead. |
| **Data model** | None stored. The `.elf` and `sourceMap` ride with the project asset only when the user imports them (PROJECT_DATA_MODEL 12.2; sizes follow `IYNK_MAX_PROJECT_BYTES` elsewhere). |
| **Input and output** | In: text or bytes of an imported file. Out: `ParseResult` as above. |
| **API contract** | n/a: parsers run inside the SimWorker (SIM 8.8). |
| **Algorithm** | Hex (SIM 8.8 row): text length at most `flashBytes + 1_048_576`; each line at most 523 characters; record types 00, 01, 02, 04 handled, 03 and 05 read and ignored; checksum checked on every record; EOF record 01 required; every address inside flash; a second write to the same address is an error. Errors: `hex-too-large`, `hex-bad-record`, `hex-bad-checksum`, `hex-out-of-flash`, `hex-overlap`, `hex-no-eof`. ELF: file at most 8 MiB; 32-bit little-endian, machine 83 (AVR); at most 64 sections and 16 program headers; each section's offset plus size inside the file; size at most flash size (debug sections at most 16 MiB in total); compressed sections refused. Errors: `elf-too-large`, `elf-unsupported`, `elf-too-many-sections`, `elf-bad-section`. DWARF line program (`.debug_line`): at most 4,000,000 emitted rows; directory and file tables at most 4,096 entries each; every offset bounds-checked; every opcode adds one work unit. Errors: `dwarf-too-large`, `dwarf-bad-line-program`. Parse time: `shouldYield()` is polled every 64 KiB of hex text or every 4,096 DWARF opcodes and the work count is returned so the host can charge the slice budget (6.8); a parse still running after the 2 s grace is killed with the worker and reported by the host as `import-timeout`. The DWARF reader handles DWARF versions 2 to 4 line programs as emitted by avr-gcc 7.3 (EXTERNAL knowledge; the fixtures prove it). |
| **State transitions** | n/a: pure functions. |
| **Validation rules** | As above. All sizes use integer arithmetic; offsets above 2^32 are rejected before arithmetic. |
| **Error conditions** | Every bad input returns `ok:false`; an exception that escapes a parser is a bug and fails SA-22. |
| **Edge cases** | CRLF and LF line endings; lowercase hex digits; a hex with extended linear address (type 04) that stays inside flash; record length 0; an ELF with a `.debug_line` that claims 2 GiB; a DWARF opcode loop (advance_pc with zero step) that never emits rows; a section table pointing past EOF; empty file. |
| **Permissions** | n/a. |
| **Performance** | Each file under 2 s (budget from SIM 8.8, SA-22), heap under 64 MiB logical; the fixtures parse in under 50 ms each (ESTIMATED). |
| **Migration** | None. |
| **Unit tests** | `hex.test.ts`: each named error has one case; a valid blink fixture parses; the checksum of every record is verified; CRLF accepted. `elf.test.ts`: valid fixture lists symbols such as `main`; wrong machine, big-endian, 65 sections, section past EOF each give the named error. `dwarf-lines.test.ts`: fixture gives rows with `isStmt`; a hand-built loop program hits `dwarf-too-large` or the work limit; `.ino` file names appear after `#line` (checked on the real fixture compiled with `debug: true`, see T-B9-27). |
| **Integration tests** | `fuzz.test.ts` (SA-22): generates 1,000 cases from a fixed seed (the seed is in the test): 500 hex and 500 ELF made by seeded mutations of the three fixtures plus hand-made cases (bad checksum, overlapping records, out-of-flash addresses, 2 GiB section sizes, giant DWARF line tables, DWARF opcode loops, truncated headers). Per case: the call returns without throwing, finishes within 2,000 ms measured with the virtual work counter and a coarse real-time guard, and the sum of allocated buffer sizes stays under 64 MiB. A summary line prints counts per error kind. |
| **Playwright** | n/a here. |
| **Fixtures** | `src/export/fixtures/blink.hex`, `blink.elf`, `motor.hex`, `motor.elf`, `knob.hex`, `knob.elf`, built by `scripts/build-hex-fixtures.sh --set rs03` from `08_RESEARCH_SPIKES/RS-03-avr8js-differential/src/sketches/*.ino`. The script is generic and owns all sets, so T-B9-10 and T-B9-27 add data only. `--set <name>` maps a name to a root folder through a three-line table in the script (`rs03` is `src/export/fixtures`, `corpus` is `src/sim/mcu/corpus`, `sa15` is `src/sim/debug/sketches`) and reads `<root>/sketches.json`: `{ "toolchain": { "cli": "1.5.1", "core": "arduino:avr@1.8.8" }, "out": "<folder under root>", "sketches": [{ "id", "ino": "<repo-relative file or folder>", "fqbn", "flags": ["<extra --build-property>"], "elf": true }] }`. `--root <dir>` takes a folder directly, for a set not in the table. For each entry it compiles into the scratch directory and copies `<id>.hex` (and `<id>.elf` when `elf` is true) into `out`; `--check` rebuilds to scratch and diffs. The `corpus` and `sa15` entries of the table are written now so that the later sets need no edit. The script downloads arduino-cli 1.5.1 for macOS ARM64 or Linux into the scratch directory with a pinned sha256 (taken from the release page when the script is written; UNKNOWN until then), installs `arduino:avr@1.8.8` there and compiles with `--build-property compiler.cpp.extra_flags=-g -Og` for the ELF. It never writes outside the scratch directory and the fixtures folder. |
| **Acceptance criteria** | Given the 1,000-case corpus, When every file is parsed, Then no call throws, none runs over 2 s and heap stays under 64 MiB. Given a hex line with one wrong checksum byte, Then the result is `hex-bad-checksum` with the line offset. Given an ELF for machine 3 (x86), Then `elf-unsupported`. |
| **Observability** | The fuzz test prints a table of counts per error kind into the vitest output; the host (T-B9-26) reports `import-timeout` as a diagnostic. |
| **Release blockers** | Any case in the corpus that throws, hangs or exceeds 64 MiB. A fixture built with a different toolchain than RS-03 without a note in the script header. |
| **Definition of done** | Three parsers, script, fixtures, four test files committed; SA-22 passes; `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/export`; `npx tsc -p tsconfig.portable.json`; `bash scripts/build-hex-fixtures.sh --set rs03 --check` (verifies the committed fixtures match a rebuild; optional; skip and record NOT RUN if offline. Creating the fixtures in the first place needs the toolchain once and cannot be skipped). |
| **Documentation** | The script header documents the pinned tool versions. `docs/COMPILE.md` (T-B9-28) points to it. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-07 and T-B9-26 (image load), T-B9-10 (hex corpus), T-B9-27 (`SourceMap`, symbols), T-B9-13 (the server returns hex the same parser reads). |

### T-B9-16 Newton core and diode/LED in the solver

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-16. Subsystem: analog solver, `src/sim/analog`. Phase B9, group G1. Priority P0. Depends on: T-B3-16, T-B3-17 (pure solver with `pwl` mode and convergence flag), T-B8-06. Status: not started. |
| **Problem** | The solver has fixed piecewise-linear diode and LED rules (0.7 V and 0.2 ohm; LED `vf` with `rd = .5`, `figures/engine/bench-solve.js:100`, VERIFIED). RS-08: 10 of 20 realistic circuits missed 2 percent, with the diode, TIP120 and saturated 2N2222 off by 12 to 230 percent. The 1N4007 part file already holds Shockley numbers the solver ignores. |
| **Target user** | A maker whose LED current changes with the resistor and the supply. |
| **User story** | As a maker, I want the LED and diode to follow their real exponential curve, so the current I read matches a bench meter to a stated tolerance. |
| **Expected behaviour** | `mode: 'newton'` solves circuits with Shockley diodes and LEDs by Newton-Raphson with junction limiting, damping, `gmin` stepping and source stepping, and reports `converged: false` with the worst node when all fail. `mode: 'pwl'` stays as it is and keeps the catalogue numbers. |
| **Success metric** | LED/diode forward current within 2 percent of the analytic series solution from 0.3 mA to the rated current at 1e-9 relative on the reference solver; 3 constructed non-convergent circuits report `no-convergence` (reuses SA-04 corpus). The comparison to ngspice is T-B9-22. |
| **Existing files** | `src/sim/analog/solve.ts` (T-B3-17; edit: add `mode: 'newton'` dispatch; quote the `pwl` iteration entry you wrap at its real line when you open the file), `src/sim/analog/elements.ts` (read: element kinds `D`, `Q`, `M` as in SIM A.3 lines 618-620), `figures/engine/bench-solve.js:100` (read: the rule being replaced for `pwl`). |
| **New files** | `src/sim/analog/newton.ts`, `src/sim/analog/devices/diode.ts`, `src/sim/analog/devices/index.ts`. Tests `newton.test.ts`, `devices/diode.test.ts`. |
| **Modules and signatures** | `newton.ts`: `export interface NewtonOptions { reltol: number; vabstol: number; iabstol: number; maxIter: number; gmin: number } export const SPICE_DEFAULTS: NewtonOptions /* reltol 1e-3, vabstol 1e-6, iabstol 1e-12, maxIter 100, gmin 1e-12 */; export interface Limiter { pnj(vnew: number, vold: number, vt: number, vcrit: number): number } export function newtonSolve(g: AnalogGraph, o: Partial<NewtonOptions>, warm?: Float64Array): SolveResult`. `devices/index.ts`: `export interface NewtonDevice<E extends Element> { readonly kind: E['kind']; stamp(e: E, x: Float64Array, s: Stamper, lim: Limiter): void; currents(e: E, x: Float64Array): number[] } export const NEWTON_DEVICES: Map<string, NewtonDevice<Element>>`. `diode.ts`: `export const VT_300K = 0.025852; export const diodeDevice: NewtonDevice<DiodeElement>; export function ledParamsFromDatasheet(p: { vfVolts: number; ifAmps: number; n: number; rsOhms: number }): DiodeParams`. `DiodeParams`, `Stamper`, `SolveResult`, `AnalogGraph` come from T-B3-16/17 (types per SIM A.3). |
| **Data model** | `DiodeParams = { kind:'shockley'; isAmps; n; rsOhms; vbrVolts? }` (ranges: `isAmps` 1e-18 to 1e-3, `n` 0.5 to 5, `rsOhms` 0 to 1e3; SIM A.3). LED Is is derived: `Is = If / exp((Vf - If * Rs) / (n * VT))` (the same formula RS-08 used, `spice.mjs:46`, with `n = 2`, `Rs = 0.5` for a generic LED, VERIFIED there). The 1N4007 entry uses `isAmps 7.03e-9, n 1.808, rsOhms 0.0342` (`spice.mjs:47`; the cited source for these is the part file `diode-1n4007.js:31`, VERIFIED by SIM A.3, whose own source is UNKNOWN: the registry row says so). |
| **Input and output** | In: graph with diode elements, options, optional warm start. Out: `SolveResult` with node voltages, branch currents, `converged`, `iterations`, `strategy: 'newton' \| 'gmin-stepping' \| 'source-stepping'`, `worstNode`. |
| **API contract** | n/a: in-process. |
| **Algorithm** | SIM 7.5 verbatim: (1) warm start or zeros; (2) stamp linearised devices (`g = dI/dV`, `Ieq = I - g*V`) with `pnjlim`-style junction limiting, factor, solve; converged when every `abs(dv) <= reltol*abs(v) + vabstol` and every `abs(di) <= reltol*abs(i) + iabstol` and the KCL residual passes; (3) damp by 0.5 up to 4 times on a residual increase; (4) at `maxIter` do `gmin` stepping from 1e-2 down to the target in decades, then source stepping in 10 steps from 0 to full; (5) if all fail return `converged:false` with strategy and worst node id and its net name; other components keep their results. The diode current uses `Math.exp`, because the analog engine is class N (SIM 6.1, DOCUMENTED), so `dmath` is not required here. Exponent overflow guard: above `v/(n*VT) > 80` continue linearly (value and slope at 80), as SPICE does. |
| **State transitions** | `unsolved` to `converged` or `failed(strategy, worstNode)`. Warm start state is the last solution per connected component. |
| **Validation rules** | Parameter ranges above; reject `n <= 0`, `isAmps <= 0` with `invalid-device-params` naming the element. |
| **Error conditions** | `no-convergence`, `ill-conditioned` (SIM 6.4 the ratio of the largest off-diagonal to the smallest diagonal entry above 1e15), `numeric-fault` on NaN or infinity (names the element). None throws; all return in `SolveResult`. |
| **Edge cases** | Reverse bias (current about `-Is`); a diode across a stiff source; two LEDs in parallel; zero `rsOhms` (no internal node); LED with no series resistor (solver must report a huge current, matches `led-no-series-resistor` detector, not a crash); warm start from a different topology. |
| **Permissions** | n/a. |
| **Performance** | A 14-node circuit with 3 diodes under 1 ms per solve at 4 times throttle (BUD-07; measured by T-B8-08's bench, extended by one case here). Iteration count under 20 for the reference circuits. |
| **Migration** | `pwl` stays the default; a circuit opts into `newton` per part via the registry tier (T-B9-30). The catalogue figures keep the frozen old solver (ADR-0304). |
| **Unit tests** | `diode.test.ts`: Shockley current at 0.3 mA, 1 mA, 10 mA, 20 mA through a series resistor equals the analytic solution (bisection reference in the test) to 1e-9; reverse current about `-Is`; overflow guard continues; LED parameter derivation reproduces `If` at `Vf`. `newton.test.ts`: warm start uses fewer iterations; damping engages on a constructed overshoot circuit; `gmin` stepping rescues a circuit that fails plain Newton; a floating diode loop reports `converged:false` with a named node; `pwl` results unchanged on 5 existing circuits (calls T-B3-18's corpus helper). |
| **Integration tests** | Three constructed non-convergent circuits (from T-B3-17 SA-04) still report `no-convergence` in `newton` mode. |
| **Playwright** | n/a. |
| **Fixtures** | None committed; analytic references computed in the test. |
| **Acceptance criteria** | Given 5 V, 330 ohm and a red LED (Vf 2.0 V at 20 mA, n 2, Rs 0.5), When solved in `newton` mode, Then the current is within 1e-9 relative of the bisection solution. Given a diode loop with no DC path, Then `converged` is false and `worstNode` names a net. |
| **Observability** | `SolveResult.iterations` and `strategy` feed the Models panel "solver" line; counters only, no logging. |
| **Release blockers** | Any change in a `pwl` number on the equivalence corpus (SA-02 stays green); a `Math.random` or clock read. |
| **Definition of done** | Three new files, `solve.ts` edit, tests green, `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/analog`; `npx tsc -p tsconfig.portable.json`; `node figures/engine/bench-solve.test.mjs` still green. |
| **Documentation** | None here. |
| **Rollback** | `git revert`; `pwl` path untouched. |
| **Later tasks need** | T-B9-34 (BJT and MOSFET register in `NEWTON_DEVICES`), T-B9-19 (transient reuses `newtonSolve` per step), T-B9-22 (junction gate vs ngspice). |

### T-B9-17 Oracle gates against ngspice output (SA-03)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-17. Subsystem: software oracle suite (F-182, R-113), `src/sim/analog`. Phase B9, group G1. Priority P0. Depends on: T-B3-17, T-B8-05. Status: not started. |
| **Problem** | The linear solve matched ngspice on 20 of 20 matched circuits and 60 random networks (RS-08), but no test in the repo compares to ngspice, so a later solver change can drift unseen (TEST_COVERAGE: zero tests load third-party simulator output). |
| **Target user** | The maintainer, protecting the solver. |
| **User story** | As the maintainer, I want CI to fail when the linear solver departs from ngspice by more than 1e-6 relative, so a refactor cannot quietly change the numbers. |
| **Expected behaviour** | A vitest file loads committed ngspice results for C01 to C05, C18, C19 and 60 seeded random resistor networks and compares the live solver in `pwl` mode to them. No ngspice runs in CI. |
| **Success metric** | All 7 hand-made circuits and all 60 random networks within 1e-6 relative (RS-08 measured worst 7e-12 and 8.7e-13; SIM 4.2). |
| **Existing files** | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/data/results.json` (read: `matched_warm.rows[].solver` and `.spice` per circuit), `data/bench-circuits.json` (read: C01 to C20 definitions), `src/extra.mjs:7-20` (read: the seeded generator `seed = 12345`, LCG `1664525`, `1013904223`), `src/spice.mjs` (read: netlist generator). |
| **New files** | `src/sim/analog/oracle.test.ts`; `scripts/gen-ngspice-fixtures.mjs`. Data: `src/sim/analog/fixtures/ngspice/linear.json` (the 7 circuits copied from `results.json` plus the 60 networks with ngspice node voltages). |
| **Modules and signatures** | `scripts/gen-ngspice-fixtures.mjs`: `node scripts/gen-ngspice-fixtures.mjs --set linear --out src/sim/analog/fixtures/ngspice/linear.json [--engine-dir <scratch>/node_modules/eecircuit-engine]`. It regenerates the 60 networks with the RS-08 generator, runs ngspice through `eecircuit-engine` 1.9.0 (ngspice WASM, EXTERNAL; pinned in `package.json` by T-B9-07, so it is read from `node_modules`; `--engine-dir` still accepts a scratch copy), and writes `{ source, engine:'eecircuit-engine@1.9.0', generatedBy, networks:[{id, nodes, elements, expected:{node:volts}}] }`. `oracle.test.ts` has no exported API. |
| **Data model** | Fixture JSON as above. Every record carries `source` (spike path or script) and `revision` (the engine version string), as R-117 requires. |
| **Input and output** | In: fixture; out: pass or a failure message naming circuit id, node, solver value, ngspice value, relative error. |
| **API contract** | n/a. |
| **Algorithm** | For each record build an `AnalogGraph` through `src/sim/analog/graph.ts`, solve in `pwl` mode (resistive circuits have no junctions so `pwl` and `newton` agree), compare each node voltage: `abs(a-b) <= 1e-6 * max(abs(b), 1e-3)` (the 1e-3 floor avoids dividing by tiny voltages; RS-08 used a 5 mV floor for its relative figure, so the floor is a PROPOSAL and is printed). Rails for C01 to C05, C18, C19 come from the record's `rails` (for example `5V: 4.95`). |
| **State transitions** | n/a. |
| **Validation rules** | The test fails if the fixture has fewer than 7 hand-made circuits or fewer than 60 networks, or any record lacks `source` and `revision`. |
| **Error conditions** | Fixture missing: test fails and names the generator command. |
| **Edge cases** | Nodes at 0 V (compared absolutely); the 25 ohm pin source of C03; the 0.5 ohm rail source of C19. |
| **Permissions** | n/a. |
| **Performance** | 67 solves under 1 s. |
| **Migration** | None. |
| **Unit tests** | `oracle.test.ts` is the test: 7 named circuit cases plus a 60-case table. |
| **Integration tests** | The generator run is a manual step recorded in the commit message (needs network and the scratch install); CI never runs it. `node scripts/gen-ngspice-fixtures.mjs --set linear --check` re-generates to a temp file and diffs against the committed one, used by T-B9-29. |
| **Playwright** | n/a. |
| **Fixtures** | `src/sim/analog/fixtures/ngspice/linear.json` as above. |
| **Acceptance criteria** | Given the committed fixture, When the live solver runs, Then every node of all 67 circuits is within 1e-6 relative. Given a deliberately wrong resistor value in one record, Then the test fails and names the circuit. |
| **Observability** | The test prints the worst relative error per set (hand-made, random) so SA-03 is recorded with numbers. |
| **Release blockers** | A fixture without `source` and `revision`; a change to the 1e-6 threshold (Amar's decision). |
| **Definition of done** | Test, script and fixture committed; the worst errors are written in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/analog/oracle.test.ts`. |
| **Documentation** | Script header names the pinned package and the `--engine-dir` override. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-22 (the script grows more sets), T-B9-29 (SA-03 record). |

### T-B9-18 Spike: which transient backend (RS-08(b) and RS-07)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-18. Subsystem: research spike. Phase B9, group G1. Priority P0. Depends on: T-B3-16, T-B3-17 (the linear algebra to reuse). Status: not started. Type: SPIKE (falsifiable question and exit condition below). |
| **Problem** | RS-08 part (b) was never run and RS-07 has no report. The live transient backend cannot be chosen without them (ADR-0304; R-105; SIM 8.4 "Decision from the spikes"). |
| **Target user** | The maintainer and every later transient task. |
| **User story** | As the maintainer, I want a measured verdict on the transient backend, so T-B9-19 builds the right one and no waveform claim is made without a number. |
| **Expected behaviour** | A written verdict with data. No product code. |
| **Success metric** | `TRANSIENT.md` states, with numbers, which of three outcomes holds (below) and the commands to reproduce. |
| **Falsifiable question** | Q1: for an RC low-pass, a series RLC and a buck converter stage, does an in-house trapezoidal companion-model stepper (backward Euler for the first step after any switching event) match ngspice within 1 percent at a 1 us step? Error metric (PROPOSAL, because the plan text does not define "percent"): `max_t abs(v_inhouse(t) - v_ngspice(t)) / peak_to_peak(v_ngspice)` on every probed node, with both waveforms interpolated to the in-house time grid. Q2: what does one step cost in microseconds on this machine at no throttle, 4 times and 6 times CPU throttle, and what simulated time fits in a 16 ms frame? Q3 (RS-07, asked only if Q1 fails): is the `eecircuit-engine` ngspice WASM batch output byte-identical between Chromium and WebKit for the same netlist, and does a 1 s simulation finish in under 5 s wall? |
| **Exit condition** | Outcome A: Q1 true on all three circuits and the Q2 frame definition in `TRANSIENT.md` section 1 is met: T-B9-19 builds `mna-inhouse` transient (`capabilities.transient = true`). Outcome B: Q1 false on at least one circuit, Q3 true: T-B9-19 builds the `ngspice-batch` backend behind the "Analyse" button; no live transient. Outcome C: Q1 false and Q3 false: no transient backend is built; C and L parts stay "not modelled yet" in live mode; SA-05 is recorded as not met and the reason is written. The spike ends after one pass of each question; it does not tune the stepper beyond one backward-Euler step after a switching event. |
| **Existing files** | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/spice.mjs` (read: the ngspice runner pattern), `src/sim/analog/linsolve.ts` (read: dense LU to reuse), RS-03 `src/bench-browser.mjs` and `worker-throttle-probe.mjs` (read: how CPU throttle was applied; the probe showed CDP throttle does not reach dedicated workers, `REPORT.md:135`, so measure on the page main thread as RS-03 did and say so). |
| **New files** | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/TRANSIENT.md`; scripts under `08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/transient/`: `circuits.mjs` (the three netlists as data), `inhouse.mjs` (self-contained trapezoidal stepper using `linsolve.ts`), `ngspice.mjs` (runs `eecircuit-engine` and returns waveforms), `compare.mjs`, `bench.mjs`, `run-all.sh`. These are spike files, not product source. Scratch installs of `eecircuit-engine` and `playwright` go under `/Users/amar/iynk-master-plan-scratch/buildplan/B9-spike/`. |
| **Modules and signatures** | n/a (scripts). `run-all.sh` prints a results table and writes `data/transient-results.json` next to the report. |
| **Data model** | Circuits: RC low-pass 1 kOhm and 100 nF driven by a 0 to 5 V step; series RLC 10 ohm, 1 mH, 1 uF with a 5 V step; buck converter stage (5 V in to 3.3 V out target: switch, diode, 100 uH, 100 uF, 10 ohm load, 100 kHz, 50 percent duty). Component values are the spike's choice and are written in `circuits.mjs`; they are not claimed to match any lesson. |
| **Input and output** | Out: `TRANSIENT.md` with sections: workload definition, Q1 table (circuit, steps, max error, passes), Q2 table (throttle, us per step, simulated us per 16 ms frame), Q3 table (browser, hash of output, wall time), verdict A, B or C, reproduction commands, caveats. |
| **API contract** | n/a. |
| **Algorithm** | In-house: trapezoidal companion for C (`G = 2C/h`, history source) and L (`R = 2L/h`); switch and diode events use the `pwl` device state flipped between steps; the first step after a state change uses backward Euler (SIM 6.3, HYPOTHESIS that this suffices for the buck case: this spike tests it). Reference: ngspice `.tran` with `uic`, max step 1 us, trapezoidal method (the ngspice default). |
| **State transitions** | n/a. |
| **Validation rules** | The frame workload for Q2 is fixed before any number is read: a frame advances 100 us of simulated time (100 steps) and must cost under 16 ms at 6 times throttle. This is the plan's reading of R-105 and is a PROPOSAL: the requirement does not define the workload. The spike proceeds with this proposal; section 10 item 6 tells Amar he may change it later, and a change re-runs `bench.mjs` only. |
| **Error conditions** | If ngspice fails to load, Q1 is recorded UNKNOWN and the outcome is not A; do not report a pass without the reference. |
| **Edge cases** | Ringing after the buck switch edge (trapezoidal); a step size of 1 us against a 10 ns diode event; ngspice's own adaptive step must be pinned (`.options` max step) so the comparison grid is common. |
| **Permissions** | Network only to install two npm packages into the scratch directory. Nothing is written into the repo except the spike folder. |
| **Performance** | Report only; thresholds are in the exit condition. |
| **Migration** | None. |
| **Unit tests** | n/a: spike. `run-all.sh` exits non-zero if it cannot produce all three tables. |
| **Integration tests** | The Q3 browser leg runs `eecircuit-engine` in headless Chromium and WebKit through Playwright from the scratch install (Firefox is not installed, so it is not run and the report says so). |
| **Playwright** | Scratch script only. |
| **Fixtures** | `data/transient-results.json` (raw numbers). |
| **Acceptance criteria** | Given the three circuits, When `run-all.sh` finishes, Then `TRANSIENT.md` holds the three tables with numbers, names outcome A, B or C, and each claim carries a label (VERIFIED for what ran, UNKNOWN for what did not). |
| **Observability** | n/a. |
| **Release blockers** | A verdict without data; a pass claimed on a reference that did not run; any file changed under `src/`, `package.json` or lockfiles. |
| **Definition of done** | `TRANSIENT.md` and spike scripts committed; the verdict is one of A, B, C. |
| **Verify commands** | `bash docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/transient/run-all.sh` (needs the scratch install, network once; this is the task itself, so if offline the task stops and the outcome is recorded UNKNOWN, not guessed); `git diff --stat main -- src package.json package-lock.json` is empty for this commit. |
| **Documentation** | `TRANSIENT.md` is the document. T-B9-19 copies the verdict into `docs/FIDELITY.md` via T-B9-28. |
| **Rollback** | `git revert`; no product code depends on it. |
| **Later tasks need** | T-B9-19 reads the outcome letter and the measured step cost; T-B9-29 records SA-05 from it. |

### T-B9-20 `dmath`: bit-identical math across Node, Chromium, WebKit and Firefox (SA-12)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-20. Subsystem: simulation core determinism (ADR-0303), `src/sim/core`. Phase B9, group G1. Priority P0. Depends on: T-B3-10, T-B3-21 (WebKit project in `playwright.config.ts`). Status: not started. |
| **Problem** | Raw flight state differed by 1 ulp across Chromium and WebKit within 12 steps because `Math.sin`, `cos`, `atan2` and `exp` are engine-defined (A12, VERIFIED in SIM 6.1). Rooms and replay need class B math on replay-critical paths. |
| **Target user** | A buddy whose replay must equal the host's. |
| **User story** | As a buddy in a shared room, I want the host and me to compute the same bits, so our runs never drift apart for a reason nobody can see. |
| **Expected behaviour** | `dmath` exports `sin`, `cos`, `atan2`, `exp`, `log`, `pow` built only from `+ - * /`, `Math.sqrt`, `Math.floor`, `Math.abs`, giving the same Float64 bits in every engine. |
| **Success metric** | SA-12 dmath clauses: bit-identical results on 1,000,000 seeded inputs per function in Node, Chromium and WebKit; Firefox is a conditional leg (it must match when the browser is installed and is recorded NOT RUN with the reason when it is not); slowdown below 6 times `Math`. |
| **Existing files** | `playwright.config.ts` (E: add a `firefox` project next to the WebKit one T-B3-21 added; quote the `projects` array at its real line when you open it (today `playwright.config.ts:23-26` holds `chromium` and `phone`, VERIFIED); give the `firefox` project `testMatch: /(dmath|bme280-hash)\.spec\.ts/` so the plain `npm run e2e` does not run every spec in a browser that may not be installed; the file picks a random port at line 5, VERIFIED by the roadmap). |
| **New files** | `src/sim/core/dmath.ts`; `scripts/dmath-bench.mjs`. Tests `src/sim/core/dmath.test.ts`; `e2e/dmath.spec.ts`. |
| **Modules and signatures** | `export function sin(x: number): number; cos; atan2(y: number, x: number): number; exp; log; pow(x: number, y: number): number; export const DMATH_VERSION = 1`. Algorithms are ports of the fdlibm kernels (`__kernel_sin`, `__kernel_cos`, `__ieee754_rem_pio2` with `__kernel_rem_pio2`, `__ieee754_exp`, `__ieee754_log`, `__ieee754_pow`, `atan`, `atan2`), EXTERNAL source (FreeBSD msun, permissive licence); the licence notice is kept at the top of the file and the registry entry for `dmath` records the licence. `Float64Array`/`Uint32Array` views over one scratch buffer replace C union tricks. |
| **Data model** | None stored. The replay record notes `dmath` version through the engine version string `sim/core@<semver>` (T-B3-19). |
| **Input and output** | `number` in, `number` out; special values follow fdlibm (NaN, infinities, signed zero). |
| **API contract** | n/a. |
| **Algorithm** | `pow` and `exp` use the fdlibm splitting into high and low parts; `sin`/`cos` reduce with `rem_pio2` (full Payne-Hanek path for large arguments). No use of `Math.sin`, `Math.cos`, `Math.tan`, `Math.exp`, `Math.log`, `Math.pow`, `Math.atan*`, `Math.sinh`, `**`. An ESLint `no-restricted-syntax` rule is NOT added here (rule files belong to T-B3-10); the unit test greps the file for the banned names instead. |
| **State transitions** | n/a. |
| **Validation rules** | Test greps `dmath.ts` for `Math.(sin\|cos\|tan\|atan\|exp\|log\|pow)` and `**` and fails on a hit. |
| **Error conditions** | None thrown; NaN in, NaN out. |
| **Edge cases** | Arguments near multiples of pi/2; subnormals; `pow(0, -1)`; `pow(-8, 1/3)` is NaN; `atan2(±0, ±0)`; `exp(710)` overflow; `log(0)`. |
| **Permissions** | n/a. |
| **Performance** | Slowdown under 6 times `Math` per function (SA-12; ESTIMATED allowance). `scripts/dmath-bench.mjs` runs 5 rounds of 1,000,000 calls each for `Math` and `dmath`, uses the median ratio, prints a table, and exits 1 at 6 or above. The flight step is 0.5 microseconds (PERFORMANCE_BASELINE 5), so even 10 times would be invisible; the gate stays 6. |
| **Migration** | None in this task. Replay-critical callers switch to `dmath` when their phase lands (B16 and B19 for physics and flight); the analog engine is class N and keeps `Math.exp` and `Math.log` (SIM 6.1). |
| **Unit tests** | `dmath.test.ts`: known values (sin(pi/6) bit pattern, exp(1) = 2.718281828459045, log(10), pow(2, 0.5)); each function within 1 ulp of `Math` on 100,000 seeded inputs (a sanity check, not the determinism gate); special values; banned-name grep. A fixed-seed run over 1,000,000 inputs per function computes an FNV-1a hash over result bits and compares it to the constant `EXPECTED_HASH` stored in `dmath.hashes.json` (written by the first run on the author's machine, then frozen). |
| **Integration tests** | `e2e/dmath.spec.ts` (Playwright, no dev server): transpiles `src/sim/core/dmath.ts` with the installed `typescript` (`ts.transpileModule`, VERIFIED present; `esbuild` is not a direct dependency), loads it into a blank page with `page.addScriptTag`, runs the same 1,000,000-input loop and hash per function in Chromium, WebKit and Firefox, and expects each hash to equal Node's. |
| **Playwright** | Above. The Firefox project needs the browser binary. The task runs `npx playwright install firefox` once; if the download is impossible (no network) the Firefox case is marked `test.skip` with the reason AND the exit-gate record says "Firefox NOT RUN" (section 10 item 7). Under `CI=true` a missing browser fails, per roadmap rule R-001. |
| **Fixtures** | `src/sim/core/dmath.hashes.json` (seed, count, per-function hash). |
| **Acceptance criteria** | Given 1,000,000 seeded inputs per function, When run in Node, Chromium and WebKit, Then the six hashes are equal in all three. Given the Firefox leg, Then it passes with the same six hashes, or it is recorded NOT RUN with the reason (browser not installed, download impossible); a Firefox hash that differs fails the task. SA-12 is recorded as passed for the dmath clauses only when Chromium and WebKit pass and Firefox is passed or NOT RUN with a reason. Given the bench script, Then every ratio is below 6. |
| **Observability** | The e2e spec prints one line per engine and function with the hash prefix; the bench prints the ratio table. |
| **Release blockers** | A hash that differs in any engine that ran; a ratio of 6 or above; Firefox claimed without a run. |
| **Definition of done** | `dmath.ts`, config edit, bench script, tests and hash file committed; Chromium and WebKit pass; Firefox passes or is recorded NOT RUN. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/core/dmath.test.ts`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/dmath.spec.ts --project=chromium --project=webkit` (required proof); `npx playwright install firefox` then the same spec with `--project=firefox` (optional; about 80 MB download; skip and record Firefox NOT RUN if offline); `node scripts/dmath-bench.mjs`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`; no caller uses `dmath` yet. |
| **Later tasks need** | T-B9-30 (registry entry for `dmath`), T-B9-29 (SA-12 record), B16 and B19 (physics and flight adopt it). |

### T-B9-35 `fidelity` UI namespace in six languages

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-35. Subsystem: i18n. Phase B9, group G1. Priority P1. Depends on: T-B4-01 (`studio` namespace pattern). Status: not started. |
| **Problem** | Five B9 UI tasks need strings in six languages (K-I18N; roadmap 2.6). If each edits a shared file they can never run in one group. |
| **Target user** | Every user of the debugger, firmware mode, compile and Inspect UI. |
| **User story** | As a user who reads German or Hindi, I want every new label and error in my language from the first commit that shows it. |
| **Expected behaviour** | One new namespace `fidelity` in `en`, `de`, `es`, `fr`, `hi`, `zh` with the keys below. UI tasks read the keys by name. |
| **Success metric** | `src/i18n/messages.test.ts` (parity of keys across languages, VERIFIED to exist) passes with the new namespace; no value is empty; no value contains the word "validated". |
| **Existing files** | `src/i18n/namespaces.ts:4` (`NAMESPACES` array) and `:8-20` (`Messages` type): add `"fidelity"` and the matching `typeof import("./messages/en/fidelity.json")` line. `src/i18n/messages/en/hw.json` (read: file shape). |
| **New files** | `src/i18n/messages/{en,de,es,fr,hi,zh}/fidelity.json` (one set). |
| **Modules and signatures** | None. Keys (English text in the file): `inspect.title`, `inspect.intro`, `inspect.size` (with `{wire}` and `{raw}`), `inspect.memory` (with `{peak}`), `inspect.refuse` (device memory 4 GB or less), `inspect.unknown` ("this browser does not report device memory"), `inspect.load`, `inspect.cancel`, `inspect.loading`, `inspect.failed`, `inspect.result`, `inspect.lint.implicitWire`; `firmware.mode`, `firmware.interpreter`, `firmware.firmware`, `firmware.tier` ("Runs your firmware"), `firmware.desktopNote`, `firmware.onlyAvr`, `firmware.importHex`, `firmware.importElf`, `firmware.noImage`, `firmware.imageLoaded` (with `{bytes}`), `firmware.notModelled` ("not modelled yet"), `import.error.hex-too-large`, `.hex-bad-record`, `.hex-bad-checksum`, `.hex-out-of-flash`, `.hex-overlap`, `.hex-no-eof`, `.elf-too-large`, `.elf-unsupported`, `.elf-too-many-sections`, `.elf-bad-section`, `.dwarf-too-large`, `.dwarf-bad-line-program`, `.import-timeout`; `debug.toggle`, `debug.step`, `debug.over`, `debug.out`, `debug.continue`, `debug.pausedAt` (with `{file}` and `{line}`), `debug.running`, `debug.variables`, `debug.watch`, `debug.addWatch`, `debug.noSymbols`, `debug.inlineOnly`, `debug.gutter`; `compile.build`, `compile.building`, `compile.ok` (with `{ms}`), `compile.failed`, `compile.off` ("turned off by the operator"), `compile.tooLarge`, `compile.timeout`, `compile.size` (flash and RAM), `compile.cached`, `compile.tool`, `compile.importInstead`. |
| **Data model** | JSON objects, nested by the dot path above. |
| **Input and output** | n/a. |
| **API contract** | n/a. |
| **Algorithm** | Write English first; translate the other five with the same placeholders; keep hardware words (I2C, SPI, hex, ELF, DWARF) unchanged. |
| **State transitions** | n/a. |
| **Validation rules** | Placeholder names identical across languages (a test in `messages.test.ts` style checks `{name}` tokens; add the check to the new test file if the existing one lacks it). |
| **Error conditions** | A missing key in any language fails `messages.test.ts`. |
| **Edge cases** | Right-to-left is not needed (no RTL language in the six). Hindi and Chinese strings keep `{wire}` style tokens untranslated. |
| **Permissions** | n/a. |
| **Performance** | n/a (the namespace is loaded only by the Studio chunk that uses it; T-B4-01's loader pattern). |
| **Migration** | None. |
| **Unit tests** | `npx vitest run src/i18n` (existing parity tests pick up the new namespace). A new `src/i18n/fidelity.test.ts` checks placeholders and the banned word. |
| **Integration tests** | `npm run typecheck` proves `Messages` includes the namespace. |
| **Playwright** | n/a. |
| **Fixtures** | None. |
| **Acceptance criteria** | Given the six files, When parity tests run, Then all pass. Given the key list above, Then each key exists in all six files. |
| **Observability** | n/a. |
| **Release blockers** | A key used by a later task but absent here (the later task adds it alone in its group and says so in its commit). |
| **Definition of done** | Six files and `namespaces.ts` edited, tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/i18n`. |
| **Documentation** | None. A native read of the four non-Latin or non-English copies is For Amar (section 10 item 9). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-09, T-B9-15, T-B9-26, T-B9-32, T-B9-33 read these keys. |

### T-B9-03 Devices as data: loader, register map, closed expression grammar

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-03. Subsystem: peripheral devices (L6), `src/sim/devices`. Phase B9, group G2. Priority P0. Depends on: T-B9-01 (`I2cDevice`, `BusEvent`). Status: not started. |
| **Problem** | The device list is closed: four built-in kinds plus a generic ACK-only device (`src/lib/interp/devices.ts:21-253`). A new sensor needs code. F-097 and ADR-0307 want a device to be data plus a registered behaviour. |
| **Target user** | A maker who adds a part, and the maintainer who reviews a shared pack. |
| **User story** | As a maker, I want a sensor described by a register table to answer on the bus, so I can add a part without TypeScript and without running anyone's code. |
| **Expected behaviour** | A JSON descriptor of registers, inputs, state and builtin behaviours becomes an `I2cDevice`. The expression language is a closed grammar and never reaches JavaScript. The MPU-6050 is re-expressed as data to prove it, and the old classes keep working through an adapter. |
| **Success metric** | The data MPU-6050 gives the same bytes as the class `Mpu6050` for the 1 g Z read of `arduino.test.ts:293-308` (16384 after wake, zeros before); a fuzz of 1,000 random expression strings never throws and never evaluates JavaScript. |
| **Existing files** | `src/lib/interp/devices.ts:4-11` (`I2CDevice`), `:21-103` (`Mpu6050`), `:242-253` (`GenericI2C`), `:288-297` (`addStandardDevices`). `src/lib/interp/arduino/arduino.test.ts:293-308` (read: the MPU-6050 case). |
| **New files** | `src/sim/devices/loader.ts`, `src/sim/devices/register-map.ts`, `src/sim/devices/expr.ts`, `src/sim/devices/data/mpu6050.device.json`. Edit `src/lib/interp/devices.ts` (adapter). Tests beside each. |
| **Modules and signatures** | `expr.ts`: `export type ExprAst; export function parseExpr(src: string): { ok: true; ast: ExprAst } \| { ok: false; error: string; at: number }; export function evalExpr(ast: ExprAst, env: (name: string) => number \| undefined): number`. Grammar: numbers; names `[A-Za-z_][A-Za-z0-9_]*`; binary `+ - * /`; unary minus; comparisons `< <= > >= == !=` giving 1 or 0; parentheses; calls `min`, `max` (two or more arguments), `clamp(x, lo, hi)`, `round(x)`, `abs(x)`. Nothing else. Limits: source at most 200 characters, depth at most 16, at most 64 nodes. `round` is round-half-up, `Math.floor(x + 0.5)`. Division by zero yields `NaN`, which the register reader turns into the register's `reset` value and emits `expr-nan`. `register-map.ts`: `export interface RegisterDef { addr: number; name: string; width?: number; signed?: boolean; access: 'r' \| 'w' \| 'rw'; reset?: number; expr?: string; onWrite?: string; source?: 'datasheet' \| 'descriptor.calibration' \| 'measured' \| 'assumed' } export interface DeviceDescriptor { id: string; bus: 'i2c'; addresses: number[]; addressSelect?: { pin: string; low: number; high: number }; requires?: { pins?: Record<string, 'high' \| 'low'>; supply?: { pin: string; min: number; max: number } }; writeMode?: 'increment' \| 'pairs'; unmapped?: 'zero' \| 'ff' \| 'nack'; registers: RegisterDef[]; state?: { name: string; reset: number }[]; inputs: { name: string; unit: string; default: number; range: [number, number] }[]; behaviours: { id: string; kind: 'builtin'; ref: string }[]; calibration?: number[]; tier: 'T1' \| 'T2'; registry: string } export interface DeviceContext { pin(name: string): 'high' \| 'low' \| 'floating'; supplyV(pin: string): number \| undefined; nowNs(): number; onEvent?(e: BusEvent): void } export type BehaviourFn = (d: DeviceRuntime, ev: { kind: 'write'; addr: number; value: number } \| { kind: 'tick'; nowNs: number } \| { kind: 'input'; name: string }) => void; export interface DeviceRuntime { regs: Uint8Array; state: Record<string, number>; inputs: Record<string, number> } export function validateDescriptor(x: unknown): { ok: true; value: DeviceDescriptor } \| { ok: false; error: string }; export function createRegisterDevice(d: DeviceDescriptor, ctx: DeviceContext, behaviours: Record<string, BehaviourFn>): I2cDevice & { setInput(name: string, v: number): void; runtime: DeviceRuntime }`. `loader.ts`: `export const BEHAVIOURS: Map<string, BehaviourFn>; export function registerBehaviour(ref: string, fn: BehaviourFn): void; export function loadDevice(ref: string, ctx: DeviceContext): { ok: true; device: ReturnType<typeof createRegisterDevice> } \| { ok: false; error: string }` where `ref` is the builtin ref of the component schema, for example `device:i2c/mpu6050@1`, and the loader finds `data/<name>.device.json` by name. `devices.ts` adds `export function toLegacyDevice(d: I2cDevice, kind: string, address: number): I2CDevice` so `World.addDevice` can hold data devices. |
| **Data model** | The descriptor above is the SIM 9.2 format plus three fields this plan adds: `state` (named values behaviours set, needed so the MPU-6050 stays asleep after reset), `writeMode` and `unmapped`. The MPU-6050 file: `WHO_AM_I` 117 reset 0x68; `PWR_MGMT_1` 107 reset 64 `onWrite: wake`; `ACCEL_ZOUT_H` 63 width 2 signed `expr: round(clamp(accelZ, -2, 2) * 16384) * awake`; `awake` state reset 0; behaviour `wake` ref `mpu6050.wake` sets `awake = 1` when bit 6 of the written value is 0. Datasheet constants are those already checked by `arduino.test.ts:293-308`. |
| **Input and output** | Bus side: `start(addr7, read)`, `write(byte)`, `read(last)`, `stop()` as `I2cDevice` (SIM 9.1). Model side: `setInput(name, value)`. |
| **API contract** | n/a: in-process. |
| **Algorithm** | Address: if `addressSelect` is present, the device's address is `ctx.pin(pin) === 'high' ? high : low`; otherwise `addresses[0]`. `requires.pins` and `requires.supply` are checked on `start`: if not met the device returns `'nack'` and emits an event with cause `part-not-powered` (supply) or `open-connection` (pin). Write: the first byte after `start(write)` sets the register pointer; `writeMode: 'increment'` (default) writes following bytes to pointer++; `'pairs'` treats following bytes as (register, value) pairs. Read: bytes come from the pointer, incrementing; a register with `expr` is evaluated per byte with `env` resolving inputs, state, then register names (by current value). Multi-byte registers are big-endian; `signed` is two's complement. A burst read of a multi-register span is evaluated once at `start(read)` so it is one consistent sample (SA-24 needs this). `access: 'r'` registers ignore writes. `onWrite: 'behaviour:<id>'` calls the behaviour after the value is stored. Unmapped read: `zero` returns 0, `ff` returns 0xFF, `nack` returns NACK on the register select; the descriptor chooses; default `ff`. |
| **State transitions** | `idle` to `addressed` to `pointer-set` to `streaming`; `stop` returns to `idle`. Device state (registers, `state`) persists across transactions. |
| **Validation rules** | `validateDescriptor`: unique `addr`; `addr` 0 to 255; `width` 1 to 32; every `expr` parses and only references known names; every `onWrite` points at a declared behaviour; every behaviour `ref` is registered or the descriptor is `{ ok:false }`; `addresses` 7-bit; calibration length matches the `source: 'descriptor.calibration'` registers; `inputs[].default` inside `range`. No field may carry JavaScript text. |
| **Error conditions** | Unknown `ref`: `{ ok:false, error:'unknown-device' }`. Parse failure carries the offset. Expression NaN: event `expr-nan`, reset value returned. |
| **Edge cases** | Zero-length write (scan): `start` alone ACKs. Read before any pointer set reads from the pointer's reset 0. Two descriptors with the same address on one bus: refused by `I2cBusModel.attach` (T-B9-01). Expression referencing a register that references the first (cycle): detected at validation by a dependency walk, `{ ok:false, error:'expr-cycle' }`. |
| **Permissions** | A descriptor from a shared pack is untrusted: it may only select builtin behaviours already in `BEHAVIOURS`; it cannot add one (ADR-0307 security; RS-15 extension sandbox has no report). |
| **Performance** | A 16-register device answers a 14-byte burst in under 50 microseconds (ESTIMATED); parse once at load. |
| **Migration** | The four built-in device classes stay as they are. `toLegacyDevice` lets `World.addDevice` hold a data device; lessons are unchanged. |
| **Unit tests** | `expr.test.ts`: every operator, `min`/`max`/`clamp`/`round`/`abs`, precedence, limits (201 characters, depth 17, 65 nodes), division by zero, 1,000 random strings from a fixed seed never throw, `parseExpr('constructor')` and `parseExpr('x.y')` and `parseExpr('a=1')` fail. `register-map.test.ts`: validation rules one by one; increment versus pairs; signed 16-bit; burst read is one sample (input changes between two single-byte reads but not within a burst); address select from a pin; `requires.supply` below minimum NACKs with the event. `loader.test.ts`: the data MPU-6050 equals `Mpu6050` for WHO_AM_I, sleep reset, wake, Z accel; unknown ref. |
| **Integration tests** | `devices.test.ts` (new, in `src/lib/interp/`): `World.addDevice(toLegacyDevice(...))` makes the `arduino.test.ts:293-308` sketch print `16384\n2\n` against the data device. |
| **Playwright** | n/a. |
| **Fixtures** | `data/mpu6050.device.json`. |
| **Acceptance criteria** | Given the data MPU-6050 and a sketch that wakes it and reads ACCEL_ZOUT, When it runs, Then the value is 16384; before the wake write it is 0. Given an expression `constructor.constructor("return 1")()`, Then `parseExpr` returns `{ ok:false }`. |
| **Observability** | Device events through `ctx.onEvent` (`expr-nan`, `part-not-powered`). |
| **Release blockers** | Any path from descriptor text to `eval`, `Function` or dynamic `import` (the lint ban from T-B3-10 plus a grep test). |
| **Definition of done** | Four new files, the `devices.ts` edit, tests green, `PORTABLE` clean for `src/sim/devices`. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/devices src/lib/interp`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`; `devices.ts` regains its previous exports. |
| **Later tasks need** | T-B9-02 (netlist binding builds devices with `loadDevice`), T-B9-04 (BME280 descriptor and behaviours), T-B9-06 (inputs), T-B9-30 (device registry entries). |

### T-B9-09 Inspect gate: Yosys loader, sha256, memory rule, click required (SA-21, FA-11)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-09. Subsystem: engine loader and Inspect mode, `src/sim-host/engines`, `src/components/studio`. Phase B9, group G2. Priority P2. Depends on: T-B9-07 (`scripts/build-engines.mjs` and the pinned `@yowasp/yosys` package in `package.json`), T-B9-35 (strings), T-B3-09 (`loadEngine`). Status: not started. |
| **Problem** | Yosys WASM is 12.5 MB with Brotli q9, 79.7 MB raw, and 662 to 725 MB of renderer memory in Chromium (RS-12). It must never load by itself, and devices that report 4 GB or less must be refused. |
| **Target user** | A maker looking at a Verilog design as a circuit. |
| **User story** | As a maker with a Verilog file, I want to press Inspect and be told the cost first, so a heavy download never starts behind my back. |
| **Expected behaviour** | "Inspect circuit" opens a gate dialog. It refuses with a reason on devices reporting 4 GB or less, and otherwise shows download size and measured memory and waits for a real click. Only then does it load the engine in its own worker and elaborate the source into cell counts, a netlist JSON and a lint list. |
| **Success metric** | SA-21 three cases pass in Chromium: `deviceMemory` 4 refuses with the reason; 8 asks and loads only after a click; undefined asks with the extra sentence. FA-11: a file whose sha256 differs is rejected, an unmet `requires` is refused, `wireBytes` is reported before any fetch. |
| **Existing files** | `src/sim-host/engines/loader.ts` (T-B3-09; read: `loadEngine`, `EngineManifestEntry`), `scripts/build-engines.mjs` (T-B9-07; E: add the Yosys entry; `@yowasp/yosys@0.71.188-dev.1267` is already in `node_modules` from T-B9-07's `package.json` edit, so this task edits no `package.json`), `src/lib/interp/verilog/sim.ts` (read only; the 2-state simulator stays the source of truth, ADR-0315). |
| **New files** | `src/sim-host/engines/inspect.ts`, `src/sim-host/engines/inspect.worker.ts`, `src/components/studio/InspectGate.tsx`. Entry source `src/sim-host/engines/yosys.manifest.json`. Edit `scripts/build-engines.mjs`. That is 5 source files. Tests `inspect.test.ts` and `e2e/inspect.spec.ts`. |
| **Modules and signatures** | `inspect.ts`: `export type MemoryVerdict = { kind: 'refuse'; gb: number } \| { kind: 'ask'; gb: number } \| { kind: 'ask'; gb: null }; export function memoryVerdict(deviceMemory: number \| undefined): MemoryVerdict; declare const clickBrand: unique symbol; export type UserClick = { readonly [clickBrand]: true }; export function userClick(e: { isTrusted: boolean }): UserClick \| null; export interface InspectResult { ok: true; cells: Record<string, number>; nets: number; netlistJson: string; implicitWires: { line: number; name: string }[]; warnings: string[]; ms: number } \| { ok: false; error: string; log: string }; export interface InspectSession { elaborate(src: string, o?: { top?: string }): Promise<InspectResult>; dispose(): void } export function openInspect(click: UserClick, deps: { loadEngine: LoadEngine; now(): number }): Promise<{ ok: true; session: InspectSession } \| { ok: false; reason: 'device' \| 'integrity' \| 'network' \| 'unsupported'; detail: string }>`. `InspectGate.tsx`: client component, props `{ source: string; onResult(r: InspectResult): void; deviceMemory?: number }`; reads strings `fidelity.inspect.*`. Worker protocol: `{ type:'elaborate'; src; top? }` to `{ type:'result'; result }`. |
| **Data model** | `yosys.manifest.json`: `{ id:'yosys', version:'0.71.188-dev.1267', files:[], requires:{ wasm:['exnref'], desktopOnly:true }, license:{ spdx:'ISC', reviewed:false }, budget:{ wireBytes: 12500000, rawBytes: 79700000 }, source:{ npm:'@yowasp/yosys' } }`. Numbers are RS-12's (12.5 MB Brotli q9, 79.7 MB raw; `ADR-0315`); `minDeviceMemoryGb` is not set because the gate owns the memory rule (undefined must ask, not refuse). The package version is the one RS-12 ran (`REPORT.md:25`, which reports Yosys 0.70+188); its licence is ISC from npm metadata, and the review flag stays false until Amar reviews (D-017). |
| **Input and output** | In: Verilog source text. Out: `InspectResult`. The elaboration script is `read_verilog -sv in.v; hierarchy -auto-top; proc; opt; stat; write_json out.json`, with the source prefixed by `` `default_nettype none `` so an undeclared name is an error and shows as a lint row (SIM 8.6). |
| **API contract** | n/a: no HTTP. `loadEngine` fetches same-origin files with `integrity: 'sha256-...'`. |
| **Algorithm** | `memoryVerdict`: `d <= 4` refuse; `d > 4` ask; `undefined` ask with the unknown sentence. `openInspect` requires a `UserClick` argument, which only `userClick(event)` can mint and only for `event.isTrusted === true`; nothing in project open, share open or routing code can call it. Load order: `loadEngine('yosys')` returns sizes first; the dialog already showed them. Yosys runs in a dedicated worker created inside `openInspect`. `build-engines.mjs` copies the `gen/` files from `node_modules/@yowasp/yosys` (no download in this task), computes sha256, bytes, and Brotli q9 size, and writes the manifest entry. |
| **State transitions** | Dialog: `closed` to `gate` (refuse or ask) to `loading` (after click) to `ready` to `elaborating` to `result`; `failed` from any step; `cancel` returns to `closed` and disposes the worker. |
| **Validation rules** | Source at most 256 KiB (same cap as compile source); fewer than 4 GB check applies at gate time only. |
| **Error conditions** | Integrity mismatch: `reason:'integrity'` with the file name; `exnref` unsupported: `reason:'device'` with the sentence from `fidelity.inspect.refuse`; fetch failure: `reason:'network'`. Elaboration failure returns `ok:false` with Yosys log. |
| **Edge cases** | Safari and Firefox leave `deviceMemory` undefined: ask. A second click while loading is ignored. Opening a project that contains Verilog never calls `openInspect`. A share link never calls it. Firefox is not verified for `exnref` (RS-12 did not run Firefox): the loader reports `unsupported` if feature detection fails. |
| **Permissions** | n/a: client-side only; no keys. |
| **Performance** | First load 2.3 s at 50 Mbps, 5.3 s at 20 Mbps, 10.3 s at 10 Mbps, with Brotli served (RS-12, VERIFIED, Chromium). The 12.5 MB figure assumes Brotli; Next's `compress` option is gzip only (`FRONTEND_ARCHITECTURE.md:556` says engine files need Brotli served), so the dev and test server serve the pre-compressed `.br` files (the e2e test only checks behaviour, not speed). Memory 662 to 725 MB renderer in Chromium; WebKit and Firefox UNKNOWN. |
| **Migration** | None. `public/engines/` is git-ignored (T-B9-07). |
| **Unit tests** | `inspect.test.ts`: `memoryVerdict` for 0.25, 1, 2, 4, 8 and `undefined`; `userClick({isTrusted:false})` is null and `userClick({isTrusted:true})` is a token; `openInspect` with a stub `loadEngine` that returns `integrity` failure surfaces it; FA-11 trio against the real `loadEngine` with three tiny fixture files (bad hash rejected, unmet `requires` refused, `wireBytes` returned before fetch is called, asserted by a fetch spy). |
| **Integration tests** | Elaboration of `blink`-class Verilog from the lessons through the real engine runs only when `public/engines/yosys@*/` exists (built by `node scripts/build-engines.mjs --only yosys`); under `CI=true` the test fails if it is missing, per rule R-001; it asserts 10 of 10 shipped lessons give `ok: true` (RS-12 result, DOCUMENTED). |
| **Playwright** | `e2e/inspect.spec.ts`: three projects' worth of cases in Chromium with `Object.defineProperty(Navigator.prototype, 'deviceMemory', ...)` injected by `addInitScript` for 4, 8 and removed; asserts text, that no request to `/engines/yosys` happens before the click, that `dispatchEvent(new MouseEvent('click'))` (untrusted) does not start the load, and that a real `click()` does (for 8 and undefined). WebKit run for the undefined case. |
| **Fixtures** | None on disk. The three tiny engine files for the FA-11 trio are built in memory by `inspect.test.ts` (bytes, then `crypto.subtle` sha256), which keeps the task at 5 source files. |
| **Acceptance criteria** | Given `deviceMemory` 4, When I press Inspect, Then the dialog gives the reason and has no load button. Given 8, Then it shows 12.5 MB, 79.7 MB raw and the memory figure, and nothing downloads until I click. Given undefined, Then it shows the same plus "this browser does not report device memory" and asks first. |
| **Observability** | The dialog shows measured load ms and elaboration ms; no telemetry. |
| **Release blockers** | Any code path that loads Yosys without `UserClick`; a Yosys file served without sha256 integrity; claiming WebKit or Firefox memory numbers. |
| **Definition of done** | Files committed; SA-21 and FA-11 pass; manifest `license.reviewed` is false. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim-host`; `node scripts/build-engines.mjs --only yosys` (offline: copies from `node_modules`) then `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/inspect.spec.ts` (its `npm run build` runs `prebuild`, which runs `engines:build`; with `E2E_SKIP_BUILD=1` the `--only yosys` step must have run first). |
| **Documentation** | Licence row for Yosys and YoWASP in the manifest; `docs/FIDELITY.md` by T-B9-28. |
| **Rollback** | `git revert`; the entry disappears from the manifest. |
| **Later tasks need** | T-B9-32 (graph view reads `netlistJson`), T-B9-29 (SA-21 record). |

### T-B9-11 Interpreter `DebugPort`: breakpoints, step, `#line` mapping (SA-15 part 1)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-11. Subsystem: debugger, engine side for the interpreter, `src/sim/debug`, `src/lib/interp`. Phase B9, group G2. Priority P1. Depends on: T-B3-12 (`McuEngine` wrapper), T-B8-02 (include source map). Status: not started. |
| **Problem** | There is no breakpoint, no step and no line pause (F-055; SIM 8.7). Statements already carry a position (`parser.ts:285-297`), so the hook is cheap. |
| **Target user** | A maker whose code does the wrong thing and who wants to stop on a line. |
| **User story** | As a maker, I want to click a line, run, and have the program stop there with time frozen, so I can see what it did. |
| **Expected behaviour** | `McuEngine.debug` exists on the Arduino C++ interpreter engine. `setBreakpoints(file, lines)`, `step('line' \| 'over' \| 'out')`, `resume()`. When a statement at a breakpoint is about to run, the engine pauses before it, at the same `SimTime`, and reports `PauseEvent`. |
| **Success metric** | SA-15 interpreter half: breakpoints stop on the right line in 5 sketches (table in the test); step, over and out land on the expected lines; with no debugger attached the interpreter is not measurably slower (lesson reference run time within 2 percent, ESTIMATED budget). |
| **Existing files** | `src/lib/interp/exec.ts:23-54` (class `Exec`; add `dbg` field and a `PAUSE` sentinel next to `PREEMPT`, quote real lines when editing), `src/lib/interp/arduino/interp.ts:475-495` (`block` case: before running each statement `body[i]`, call the hook), `:76` (`depth`), `:105-112` (`program()`), `src/sim/mcu/arduino.ts` (T-B3-12: expose `debug`, handle `PAUSE`). `src/lib/interp/arduino/parser.ts:285-297` (read: `Stmt.p`). `src/lib/interp/errors.ts:2` (`SourcePos`). |
| **New files** | `src/sim/debug/breakpoints.ts`; data `src/sim/debug/sketches/` (5 `.ino` files plus `expected.json`). Tests `breakpoints.test.ts`, `interp-debug.test.ts`. |
| **Modules and signatures** | `breakpoints.ts`: `export interface DebugPort { setBreakpoints(file: string, lines: number[]): void; step(unit: 'line' \| 'over' \| 'out'): void; resume(): void; inspect(frame: number): FrameInfo; watch(addr: number, len: number): void; readonly paused: PauseEvent \| null; onPause(cb: (e: PauseEvent) => void): void } export type PauseReason = 'breakpoint' \| 'step' \| 'watch'; export interface PauseEvent { reason: PauseReason; file: string; line: number; column?: number; atNs: SimTime; depth: number } export interface FrameInfo { frame: number; function: string; file: string; line: number; locals: VarInfo[]; globals: VarInfo[] } export interface VarInfo { name: string; type: string; value: string; address?: number } export class BreakpointSet { set(file: string, lines: number[]): void; has(file: string, line: number): boolean; clear(): void; get size(): number } export class StatementDebugger implements DebugPort { constructor(map: (line: number) => { file: string; line: number }, now: () => SimTime); check(p: SourcePos, depth: number): boolean }`. In `exec.ts`: `export const PAUSE: unique symbol; dbg: StatementDebugger \| null = null`. In `interp.ts`: inside the `block` loop `if (rt.dbg !== null && rt.dbg.check(b.pos, rt.depth)) yield PAUSE;` where `b.pos` is the position of the statement being run (use `s.body[i].p`). |
| **Data model** | None stored in the project. Breakpoints live in `ui` store (T-B9-33); this task only keeps them in the engine. |
| **Input and output** | In: breakpoint list per file; step commands. Out: `PauseEvent`. The `FrameInfo` shape is filled by T-B9-12. |
| **API contract** | n/a: the `DebugPort` of SIM A.4 plus `resume`, `paused`, `onPause`, which that interface lacks and this plan adds (PROPOSAL; ask SIM to adopt). |
| **Algorithm** | `check(p, depth)`: map the combined-source line `p.line` to `(file, line)` with the include source map (T-B8-02); if the mode is `step-line` return true; `step-over` return true when `depth <= startDepth`; `step-out` return true when `depth < startDepth`; otherwise return true when `breakpoints.has(file, line)` and the statement is not the same one just resumed from (a `skipOnce` flag set by `resume`, so resuming on a breakpoint line does not stop on it again). A true result makes the generator `yield PAUSE`; the engine's `advanceTo` sees `PAUSE`, sets `paused`, returns `{ reached: now, stoppedEarly: true }` and does not run again until `resume()` or `step()`. Time is frozen because no tick runs while paused; the orchestrator holds the other engines at the same `SimTime` (R-106; the host message is T-B9-33). Breakpoints inside code run through `runSync` (interrupt handlers and functions called inside expressions) cannot pause, because `runSync` is not a generator (`exec.ts:116-133`); those statements are skipped and the engine emits a one-time `debug-skipped-in-isr` note with the line. |
| **State transitions** | Engine debug state: `running` to `paused` (breakpoint or step) to `running` (resume or step). Stepping modes are one-shot. `reset()` clears pause state but keeps breakpoints. |
| **Validation rules** | Lines are positive integers; at most 256 breakpoints per file and 1,024 per engine; a line with no statement is bound to the next statement line at or after it (`bound` list returned by `setBreakpoints` is not part of the SIM interface; the panel asks `breakpoints.resolve(file, line)`, a method this task adds). |
| **Error conditions** | `setBreakpoints` for an unknown file returns without error and the panel shows it unbound. `step` while running is ignored. |
| **Edge cases** | A breakpoint on a `for` header stops once per loop entry, not per iteration (the header statement runs once; the condition is an expression); a breakpoint in `loop()` stops every iteration; `delay()` inside the stopped line has not yet run; `setup()` entry. Idle-skip (`exec.ts:93-99`) does not run while paused. A breakpoint on a line produced by an included `.h` reports the header's file and line. Sketch edited while paused: engine is reset by the host, breakpoints reapplied. |
| **Permissions** | n/a. |
| **Performance** | One null check per statement when detached. Budget: the 102 lesson reference runs total time within 2 percent of the previous commit (measured by running `npx vitest run src/lib/interp/lessons.test.ts` three times before and after; ESTIMATED budget). |
| **Migration** | None. |
| **Unit tests** | `breakpoints.test.ts`: `BreakpointSet` rules; `check` for each step mode with a fake depth sequence; `skipOnce`. `interp-debug.test.ts`: the five sketches in `src/sim/debug/sketches/` (blink, button, serial counter with a function call, for-loop with a nested function, a two-`.ino` project with an included header) each with `expected.json` rows `{ breakpoint: {file, line}, stopsAt: {file, line}, hits: n }`; step line, over a function call, out of a function; ISR breakpoint is skipped with the note; virtual time at the pause equals virtual time at resume start. |
| **Integration tests** | Existing `src/lib/interp` suite stays green with the hook compiled in. |
| **Playwright** | n/a (T-B9-33). |
| **Fixtures** | `src/sim/debug/sketches/*.ino` and `expected.json`. The same five sketches serve T-B9-27 on avr8js. |
| **Acceptance criteria** | Given a breakpoint on line 8 of the blink sketch (`digitalWrite(LED_PIN, HIGH)`), When I run, Then the engine pauses before that statement with time unchanged, and `resume` pauses again after the next loop. Given step over on a call line, Then the next stop is the line after the call in the same function. |
| **Observability** | `PauseEvent` and the one-time ISR note. |
| **Release blockers** | A lesson reference run changing outcome; slowdown beyond budget; pausing inside `runSync` (would deadlock). |
| **Definition of done** | Four edited or new source files, five sketches with expectations, tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/debug src/lib/interp`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`; hook removed, interpreter as before. |
| **Later tasks need** | T-B9-27 (same `DebugPort` on avr8js), T-B9-33 (UI), T-B9-12 (variables). |

### T-B9-23 Interpreter on the bus models; fail loudly (SA-09)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-23. Subsystem: interpreter bus calls, `src/lib/interp`, `src/sim/mcu`. Phase B9, group G2. Priority P0. Depends on: T-B9-01. Status: not started. This is the part of roadmap row T-B9-01 that changes the interpreter ("102 reference runs still pass"). |
| **Problem** | `Wire` calls cost zero time (`libs.ts:741-777`), `SPI.transfer` returns 0 (`libs.ts:787`), and MicroPython has no `SPI` or `UART` class at all (`python/modules.ts:388-389`). Nothing says "not modelled". |
| **Target user** | A maker whose SPI display never works and who is told nothing. |
| **User story** | As a maker, when I call `SPI.transfer` and nothing answers, I want the program to stop at that line with a clear message, not get a zero. |
| **Expected behaviour** | I2C calls cost virtual time (`9 / speedHz` per byte plus START and STOP). `SPI.transfer` with no selected device halts the program at that statement with cause `bus-device-not-modelled`. `machine.SPI` and `machine.UART` raise a named "not modelled yet" error. All 102 lesson references still pass. |
| **Success metric** | SA-09: bus timing is on and 102 of 102 references pass; `SPI.transfer` with no device raises `bus-device-not-modelled` and prints nothing. |
| **Existing files** | `src/lib/interp/arduino/libs.ts:740-777` (`TWI`, `WireClass`: route `endTransmission` and `requestFrom` through `world.i2cTransfer`), `:779-790` (`SpiClass`: `transfer` at 787 calls `world.spiTransfer`), `src/lib/interp/world.ts:142` (`i2c` map), `:434-453` (`addDevice`, `i2cWrite`, `i2cRead`), `src/lib/interp/errors.ts:13-36` (`InterpError`: add optional `causeId`), `src/lib/interp/python/modules.ts:356, 388-389` (`I2C`, `machine` module). |
| **New files** | `src/sim/mcu/bus-port.ts`. Tests: `src/lib/interp/bus.test.ts`; additions to `src/lib/interp/arduino/arduino.test.ts` (existing file, test edits only). |
| **Modules and signatures** | `bus-port.ts`: `export function createInterpBus(o: { speedHz?: number; stubPolicy?: StubPolicy; onEvent?: (e: BusEvent) => void }): InterpBus; export interface InterpBus { attachLegacy(dev: I2CDevice): void; i2c(addr7: number, write: number[], readN: number): { ack: boolean; bytes: number[]; costUs: number; error?: 'nack-address' \| 'nack-data' \| 'stuck-low' }; spi(byte: number): { byte: number; costUs: number } \| NotModelled }`. `world.ts`: `readonly bus: InterpBus; deviceSource: 'library' \| 'netlist'; i2cTransfer(addr7: number, write: number[], readN: number): ReturnType<InterpBus['i2c']>; spiTransfer(byte: number): ReturnType<InterpBus['spi']>`; `i2cWrite` and `i2cRead` stay as thin wrappers so no other caller changes. `errors.ts`: `class InterpError { readonly causeId?: string }`, constructor gets a fifth optional argument; `toJSON` includes `causeId` when set. |
| **Data model** | `Diagnostic` (errors.ts:41) gains optional `causeId`. Nothing stored in the project. |
| **Input and output** | `Wire.endTransmission()` returns 0 (ok), 2 (NACK on address), 3 (NACK on data), 4 (other); `requestFrom` returns the number of bytes read. SPI result byte or a halting `InterpError('runtime', message, pos, hint)` with `causeId: 'bus-device-not-modelled'`. |
| **API contract** | n/a. |
| **Algorithm** | After a bus call, the library function advances virtual time: `rt.advance(rt.world.now + costUs)` so timers and interrupts fire on the way (`exec.ts:73-84`). Default bus: `speedHz` 100000 (`Wire.setClock` updates it at `libs.ts:746`), pull-up assumed (lessons have no netlist). In `deviceSource: 'library'` (lessons) a legacy device on `world.i2c` answers at its address as before; library `begin()` auto-attach (`libs.ts:1054, 1117`) is unchanged here. In `deviceSource: 'netlist'` (set by T-B9-02) only devices bound from nets answer, so a library call to an unwired device gets a NACK. SPI: the message is "SPI.transfer: no device is selected on this bus (SPI devices are not modelled yet)", the hint "add a chip-select pin and a part that has an SPI model, or use I2C"; the statement position is attached by the existing wrapper at `interp.ts:1236-1246`. Python: `machine.SPI(...)` and `machine.UART(...)` construct, then raise `NotImplementedError("SPI is not modelled yet")` through `pyErr`, with `causeId 'library-not-modelled'`; `machine.I2C.scan()` and `readfrom`/`writeto` go through `world.i2cTransfer` so they cost time. |
| **State transitions** | Interpreter run state `running` to `error` on an unmodelled SPI call, as for any runtime error. |
| **Validation rules** | `Wire.setClock(hz)` outside 1,000 to 1,000,000 is clamped to the nearest limit with a warning (`rt.warn`). |
| **Error conditions** | `bus-device-not-modelled` (SPI), `library-not-modelled` (machine SPI and UART), NACK codes above. |
| **Edge cases** | `Wire.beginTransmission` + `endTransmission` with no bytes (scanner) costs START + address byte + STOP and returns 0 or 2; `requestFrom` of 0 bytes; a sketch that calls `Wire.requestFrom` in a tight loop now advances time, so idle-skip (`exec.ts:93-99`) sees changed `world.now` and does not jump; I2C inside an interrupt handler (`runSync`) advances time through `advance`, which is already allowed there. |
| **Permissions** | n/a. |
| **Performance** | A bus call adds one object allocation; lesson reference runs within 2 percent of before (same measurement as T-B9-11). |
| **Migration** | `deviceSource` defaults to `'library'`, so all lessons behave as before except cost. If any reference run now times out a `delay`-calibrated check, the fix is to the check's tolerance in that lesson's content, listed in the commit message and approved by Amar before change (a threshold change is Amar's decision, roadmap 2.5). |
| **Unit tests** | `bus.test.ts`: `endTransmission` of 2 bytes at 100 kHz advances `world.now` by 290 us (START and address byte 10 bit times, two data bytes 18, STOP 1: 29 bit times at 10 us); `setClock(400000)` scales it; a missing address returns 2; SPI with no device throws `InterpError` with `causeId`; MicroPython `machine.SPI(1)` raises with the named message; `I2C.scan()` over a bus with the MPU-6050 at 0x68 returns `[104]`. `arduino.test.ts` existing MPU-6050 case (293-308) still prints `16384\n2\n`. |
| **Integration tests** | `npx vitest run src/lib/interp/lessons.test.ts`: 102 of 102 references pass and starters still fail at least one check (same assertion as SA-01). |
| **Playwright** | n/a. |
| **Fixtures** | None. |
| **Acceptance criteria** | Given a sketch that calls `SPI.transfer(0x55)` with no SPI model, When it runs, Then it stops at that line with the message above and the serial output has no `0`. Given the 102 lesson references, Then all pass. |
| **Observability** | `BusEvent`s are forwarded to the run's `warn` channel for non-fatal ones (`rise-time`, `spi-mode`) so the learner sees them. |
| **Release blockers** | Any lesson reference failing; any silent return of 0 from `SPI.transfer`. |
| **Definition of done** | Five source files edited or created, tests green, SA-09 numbers in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/lib/interp src/sim`; `npx tsc -p tsconfig.portable.json` (for `src/sim/mcu/bus-port.ts`). |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-02 (netlist devices, `deviceSource: 'netlist'`), T-B9-04 (the BME280 library uses `world.i2cTransfer`), T-B9-31 (serial timing), T-B9-29 (SA-09 record). |

### T-B9-24 avr8js pin, PWM and ADC adapter

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-24. Subsystem: avr8js adapters, `src/sim/mcu`. Phase B9, group G2. Priority P0. Depends on: T-B9-07. Status: not started. This is part of roadmap row T-B9-07 (R-102 items a to e). |
| **Problem** | avr8js emits port-change events and holds ADC channel values; the app needs pin modes, duty and frequency per pin, analog volts into ADC channels, input driving, and a snapshot at 30 Hz that figures, checks and the serial monitor read as if the interpreter had made it (R-102). |
| **Target user** | Anyone running Firmware mode with an LED on a PWM pin or a pot on A0. |
| **User story** | As a maker, I want my compiled sketch's PWM LED to dim and my pot to change `analogRead`, as with the interpreter. |
| **Expected behaviour** | The adapter reads DDR to set pin mode, turns edges into duty and frequency over the last 8 periods, sets `adc.channelValues[ch]` from the latest node voltage, drives inputs with `port.setPin`, and emits pin state to the orchestrator and a `Snapshot` at most 30 per simulated second when something changed. |
| **Success metric** | On the RS-03 `motor` (D6) and `knob` (D9) sketches the duty is within 2 percent of the interpreter at 30 Hz sampling (RS-03 measured worst 1.1 points, DOCUMENTED); ADC count equals `floor(V * 1024 / Vref)`. |
| **Existing files** | `src/sim/mcu/avr8js.ts` (T-B9-07; read: `AvrAdapter`, `AvrContext`), RS-03 `src/avr-core.mjs` (read: port listeners, `adc.channelValues`, `volts(counts)` helper) and `src/adapter-30hz.mjs` (read: the 8-period duty window), `src/sim/digital/pins.ts` (T-B3-11: `PinDriver` update API), `src/lib/interp/world.ts:40` (`Snapshot` type, read). |
| **New files** | `src/sim/mcu/avr8js-pins.ts`. Data set `src/sim/mcu/fixtures/asm-blink.json` and `asm-pwm.json` (hand-assembled words with a comment per instruction; one data set, counted once, so the task has 2 source files). Tests `src/sim/mcu/avr8js-pins.test.ts`. |
| **Modules and signatures** | `export interface PinSink { drive(net: NetId, level: 'high' \| 'low' \| 'z', strength: 'strong' \| 'weak', atNs: SimTime): void; mode(net: NetId, mode: 'in' \| 'in-pullup' \| 'out' \| 'pwm' \| 'analog', atNs: SimTime): void } export interface PinSource { level(net: NetId): 0 \| 1 \| null; volts(net: NetId): number \| null } export function createPinAdapter(o: { map: Record<string, { port: 'B' \| 'C' \| 'D'; bit: number }>; sink: PinSink; source: PinSource; vref: number; onSnapshot(s: PinSnapshot): void }): AvrAdapter; export interface PinSnapshot { atNs: SimTime; pins: Record<string, { mode: string; level: 0 \| 1; duty?: number; hz?: number }> }`. The default `map` for the Uno is D0 to D7 = PORTD 0 to 7, D8 to D13 = PORTB 0 to 5, A0 to A5 = PORTC 0 to 5 (Arduino numbering, VERIFIED by `avr-core.mjs` comment). |
| **Data model** | None stored. The net names come from the board descriptor pin map (T-B4 and T-B5). |
| **Input and output** | In: port change callbacks, DDR registers, net voltages from the orchestrator, input levels. Out: `PinSink` calls at `cyclesToNs(cpu.cycles)`, `PinSnapshot`. |
| **API contract** | n/a. |
| **Algorithm** | Per port `addListener((value, old) => ...)`; for each changed bit emit a `drive` at the exact cycle time. Mode from `port.pinState(bit)` (avr8js `PinState`: Input, InputPullUp, High, Low; EXTERNAL knowledge of the API, confirmed by reading `node_modules/avr8js` types at build). A pin on a timer output compare channel that toggles faster than every 16 ms and has seen at least 8 edges is labelled `pwm`; duty is the high time over the last 8 periods (window shrinks to what exists if fewer), `hz` is `1 / period` averaged over those periods. Snapshots: at most every 33,333,333 ns of simulated time and only if the pin set changed. ADC: before each batch (`beforeBatch`), for each channel in use set `adc.channelValues[ch] = source.volts(netOfChannel)` (clamped 0 to `vref`); the conversion formula is avr8js's own `floor(volts / vref * 1024)`, which can differ from the interpreter's `round(volts / 5 * 1023)` by one count (RS-03 caveat); the interpreter is changed to match in T-B9-31, not the other way round. Input pins: `source.level(net)` applied with `port.setPin(bit, level)`; a net that is `null` leaves the pin as the pull-up decides. |
| **State transitions** | Per pin: `unset` to `in`, `in-pullup`, `out`, `pwm` following DDR writes and edge statistics. |
| **Validation rules** | Reject a `map` entry with bit outside 0 to 7; an unknown port. |
| **Error conditions** | Net unknown to the sink: the sink reports; the adapter does not throw. |
| **Edge cases** | PWM at 0 percent or 100 percent (no edges): level shown with `duty` 0 or 1 only when the timer register says so is not available, so the adapter reports `out` with the level (RS-03: 780 to 980 edges per second per PWM pin means only static levels lack edges); Timer1 16-bit PWM on D9 and D10; `analogWrite(pin, 128)` (about 49 percent after rounding); input pin read while the pin is an output; a pin that changes mode mid-window. |
| **Permissions** | n/a. |
| **Performance** | Listener cost under 3 percent of run time (RS-03). Edge buffer is a ring of 64 edges per PWM pin. |
| **Migration** | None. |
| **Unit tests** | `avr8js-pins.test.ts`: hand-assembled programs from `src/sim/mcu/fixtures/asm-blink.json` and `asm-pwm.json` (both created here; the blink words are the 12 inline in T-B9-07's `avr8js.test.ts`): output toggle; a software-PWM loop with a known 25 percent duty gives 0.25 within 0.01; mode follows DDR; ADC channel value written equals expected counts for volts 0, 2.5, 4.999, 5; input drive visible on `PIN`. The compiled `motor` and `knob` fixtures from T-B9-08 run for 4 simulated seconds and the duty at 30 Hz samples is compared to expected tables stored from RS-03 `results-adapter.json` (read, DOCUMENTED: motor and knob, worst 0.011). |
| **Integration tests** | The differential test in T-B9-10 covers pins against the interpreter. |
| **Playwright** | n/a. |
| **Fixtures** | `src/sim/mcu/fixtures/asm-blink.json` and `asm-pwm.json` (this task); hex fixtures from T-B9-08. |
| **Acceptance criteria** | Given `motor.hex` on D6, When 4 s run, Then at least 95 percent of 30 Hz samples are within 2 percent duty of the interpreter trace and none is off by more than 3 points. Given 2.5 V on A0, Then `analogRead(A0)` in the compiled sketch prints 512. |
| **Observability** | `PinSnapshot` stream; per-pin edge count in the engine counters. |
| **Release blockers** | Any use of wall-clock time; duty computed with floating accumulation that differs run to run (all arithmetic in integer ns). |
| **Definition of done** | One adapter file, the two assembly fixtures and tests; `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/mcu/avr8js-pins.test.ts`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-26 (composition), T-B9-10 (differential on pins), T-B9-31 (ADC formula alignment). |

### T-B9-25 avr8js TWI and SPI bridge to the bus models

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-25. Subsystem: avr8js adapters, `src/sim/mcu`. Phase B9, group G2. Priority P1. Depends on: T-B9-07, T-B9-01. Status: not started. Part of roadmap row T-B9-07 and of ADR-0305 ("adapter binds ports, USART, ADC, TWI and SPI to the bus models"). |
| **Problem** | RS-03: "TWI peripheral exists, models need bridging"; not built. A compiled `Adafruit_BME280` sketch talks to the real TWI registers, so the bus models of T-B9-01 must see those transactions. |
| **Target user** | Anyone running a compiled sketch with an I2C sensor. |
| **User story** | As a maker, I want my compiled BME280 sketch to read the same simulated sensor the interpreter reads. |
| **Expected behaviour** | avr8js TWI events become `BusOp`s on the netlist's I2C bus; the result (ACK, NACK, data) returns through the TWI status register; byte time comes from the TWI bit rate. SPI events do the same for SPI devices, or `NotModelled`, and the engine reports `bus-device-not-modelled`. |
| **Success metric** | The compiled BME280 `begin` and `readTemperature` sketch gets the same register trace as the library model (SA-24 byte trace section 9.2.1), checked in T-B9-04's integration test; 100 percent of unit cases here. |
| **Existing files** | `src/sim/mcu/avr8js.ts` (read: `AvrContext.twi`, `.spi`), `src/sim/bus/index.ts` (T-B9-01), `node_modules/avr8js` (read: `AVRTWI` `eventHandler` with `start`, `stop`, `connectToSlave`, `writeByte`, `readByte`, `completeStart`, `completeStop`, `completeConnect`, `completeWrite`, `completeRead`; EXTERNAL recall, the task reads the installed typings first and adapts). |
| **New files** | `src/sim/mcu/avr8js-bus.ts`. Tests `avr8js-bus.test.ts`. |
| **Modules and signatures** | `export function createBusAdapter(o: { port: BusPort; i2cBus: BusId; spiBus?: BusId; cs?: NetId; onEvent?: (e: BusEvent) => void }): AvrAdapter`. It installs a TWI event handler class implementing avr8js `TWIEventHandler` and an `spi.onTransfer` callback. |
| **Data model** | None. |
| **Input and output** | TWI: `start(repeated)`, `connectToSlave(addr, write)`, `writeByte(value)`, `readByte(ack)`, `stop()` from avr8js; replies via `completeStart()`, `completeConnect(ack)`, `completeWrite(ack)`, `completeRead(value)`, `completeStop()` scheduled `costNs` later using `cpu.addClockEvent(fn, cycles)`. SPI: `spi.onTransfer = (value) => port.transact(...)` and `spi.completeTransfer(byte)`. |
| **API contract** | n/a. |
| **Algorithm** | Convert `costNs` to cycles with `ceil(costNs * 2 / 125)` (inverse of `cyclesToNs`) and schedule completion with `cpu.addClockEvent`; this puts the bus time into CPU time exactly, so a sketch that polls `TWINT` waits as long as hardware would. A NACK on address sets TWI status 0x20 (SLA+W NACK) or 0x48 (SLA+R NACK) by calling `completeConnect(false)`. `NotModelled` on SPI returns 0xFF and emits a `not-modelled` event; with `stubPolicy: 'fail'` the engine also halts with `bus-device-not-modelled` at the PC (T-B9-26 maps PC to line when an ELF was imported). |
| **State transitions** | Mirrors the I2C model: `idle`, `busy`. Reset clears. |
| **Validation rules** | The TWI bit rate is read from `TWBR` and `TWSR` prescaler: `SCL = F_CPU / (16 + 2 * TWBR * 4^prescaler)`; the bus model's `speedHz` is updated from that, so `Wire.setClock` in compiled code works. |
| **Error conditions** | Unknown bus id: adapter disabled with one event. |
| **Edge cases** | Repeated start; slave read with `last: true` (NACK on final byte); a sketch that never polls `TWINT`; interrupt-driven TWI (avr8js raises the TWI interrupt after `complete*`). |
| **Permissions** | n/a. |
| **Performance** | Event handler allocation-free except the `BusOp` object. |
| **Migration** | None. |
| **Unit tests** | `avr8js-bus.test.ts`: hand-assembled TWI write to 0x76 completes in the cycles that `costNs` implies; address NACK sets status 0x20; read of two bytes ends with NACK; `TWBR` change alters the cycle cost; SPI transfer with no device returns 0xFF and the event. |
| **Integration tests** | In T-B9-04 (compiled BME280 trace). |
| **Playwright** | n/a. |
| **Fixtures** | `src/sim/mcu/fixtures/asm-twi-write.json`. |
| **Acceptance criteria** | Given a program that sends START, SLA+W 0x76, one byte, STOP at TWBR 72 (100 kHz at 16 MHz), When run, Then the time from START to STOP completion equals the bus model's total within one CPU cycle. |
| **Observability** | `BusEvent`s as T-B9-01. |
| **Release blockers** | A bus completion that does not advance CPU time. |
| **Definition of done** | One file and tests; `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/mcu/avr8js-bus.test.ts`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-26, T-B9-04 (integration), T-B9-21. |

### T-B9-34 BJT and MOSFET Newton devices with cited parameters (G-T2 BJT)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-34. Subsystem: analog solver devices, `src/sim/analog/devices`. Phase B9, group G2. Priority P0. Depends on: T-B9-16. Status: not started. This is the BJT and MOSFET part of roadmap row T-B9-16. |
| **Problem** | The solver has a fixed BJT rule (`RBE 2`, `RSAT 0.01`; TIP120 hfe 1000, vbe 1.3, vcesat 0.9) and no PNP or MOSFET. RS-08 found the saturated 2N2222, TIP120 and diode circuits off by 12 to 230 percent against realistic models, and its model cards were chosen by the author, not cited (`spice.mjs:55`). |
| **Target user** | A maker driving a motor or LED through a transistor. |
| **User story** | As a maker, I want the transistor switch to saturate at a stated Vce and carry a computed collector current, so I can see why my motor is weak. |
| **Expected behaviour** | NPN and PNP Gummel-Poon (subset) and a switch-level and a level-1 MOSFET register in `NEWTON_DEVICES`. Each part's parameters carry a source (datasheet table or SPICE model page) and a revision. A part with no cited source keeps `kind: 'pwl'` and tier T1. |
| **Success metric** | G-T2 BJT: Ic within 5 percent, Vce(sat) within 20 mV or 5 percent, Vbe within 30 mV against ngspice using the same parameters (checked in T-B9-22). Here: bisection reference agreement at 1e-9 and convergence on the switch and active region cases. |
| **Existing files** | `src/sim/analog/devices/index.ts` (T-B9-16: register), `src/sim/analog/newton.ts` (read), SIM A.3 lines 2164-2173 (`BjtParams`, `MosParams`), `figures/engine/bench-solve.js` (read: the pwl BJT and the TIP120 numbers). |
| **New files** | `src/sim/analog/devices/bjt.ts`, `mosfet.ts`, `params.ts`. Edit `devices/index.ts`. Tests beside. |
| **Modules and signatures** | `bjt.ts`: `export const bjtDevice: NewtonDevice<BjtElement>` (NPN and PNP via `polarity`); `export function icVce(p: BjtParams, vbe: number, vce: number): { ic: number; ib: number }` for tests. `mosfet.ts`: `export const mosDevice: NewtonDevice<MosElement>` with `kind:'switch'` (smooth step on `vgs - vth` over 0.1 V to keep Newton happy, PROPOSAL) and `kind:'level1'` (square law with `lambda`; the doc says level1 is "not built before the transient slice", so it ships here, labelled T1 until a fixture passes). `params.ts`: `export interface CitedParams<P> { id: string; params: P; source: { kind: 'datasheet' \| 'spice-model' \| 'measured' \| 'assumed'; title: string; page?: string; revision?: string; url?: string }; operatingRange: { ic?: [number, number]; vds?: [number, number] } } export const BJT_PARAMS: Record<string, CitedParams<BjtParams>>; export const MOS_PARAMS: Record<string, CitedParams<MosParams>>; export function paramsFor(id: string): CitedParams<BjtParams \| MosParams> \| undefined`. |
| **Data model** | `BjtParams` gummel-poon: `isAmps, bf, br, nf?, vafVolts?, rbOhms?, reOhms?` (SIM A.3). Entries: `2n2222` (the RS-08 card `IS=5e-15 BF=100 BR=5 VAF=100 RB=10 RC=0.5` marked `source.kind:'assumed'` because no source was recorded; to become `spice-model` when a manufacturer model is read), `2n3904`, `bc547`, `tip120` (Darlington: stays `pwl`), `irlz44n` or the logic-level MOSFET the Robotics bench uses, `2n7000`. For each non-assumed entry the agent reads the manufacturer model or datasheet table, writes title, page and revision, and does not invent a number: if a number cannot be found, the entry stays `assumed` and the Models panel says "assumed" (RC-60). Which parts the benches use: `grep -n "2N2222\|TIP120\|2N3904\|IRL" figures/*.js figures/boards/*.js` is the first command of the task. |
| **Input and output** | As T-B9-16. |
| **API contract** | n/a. |
| **Algorithm** | Gummel-Poon in transport form with `Is`, forward and reverse `BF`/`BR`, `NF` default 1, Early effect with `VAF` (forward only), `RB` and `RE` as series resistances via internal nodes; junction limiting for BE and BC; `gmin` across each junction (SIM 6.4 1e-12 S). MOSFET switch: `Rds_on` when `vgs - vth > 0.05`, `rOff` when `< -0.05`, smooth in between. Level1: cutoff, triode `kp * ((vgs - vth) * vds - vds^2 / 2) * (1 + lambda * vds)`, saturation `kp / 2 * (vgs - vth)^2 * (1 + lambda * vds)`. All through `Math.exp` (class N). |
| **State transitions** | Device region (cutoff, active, saturation) is derived each iteration and reported in `SolveResult.states` for the Models panel; no stored state. |
| **Validation rules** | Parameter ranges: `isAmps` 1e-18 to 1e-9, `bf` 5 to 2000, `br` 0.01 to 100, `vafVolts` 10 to 1000; out of range gives `invalid-device-params`. A `CitedParams` with `source.kind !== 'assumed'` must carry `title` and `revision` (test enforces). |
| **Error conditions** | As T-B9-16. |
| **Edge cases** | PNP high-side switch; saturated switch with `Ic` limited by the load; reverse-active; floating base; MOSFET gate floating; BJT with `vbe` far above 0.8 V during a failed iteration (limiter). |
| **Permissions** | n/a. |
| **Performance** | A 6-node circuit with 2 BJTs under 1 ms per solve at 4 times throttle. |
| **Migration** | Parts without a cited entry keep `pwl`; no catalogue figure changes. |
| **Unit tests** | `bjt.test.ts`: active-region Ic against the closed form `Ic = Is * (exp(Vbe / Vt) - 1) * (1 + Vce / Vaf)` for 10 points; saturation Vce(sat) at Ib = Ic/10 stays below the datasheet bound stated in the entry; PNP mirror of NPN; convergence of the switch circuit in under 20 iterations. `mosfet.test.ts`: switch endpoints; level1 regions against hand calculations. `params.test.ts`: every non-assumed entry has title and revision; none uses the word "validated". |
| **Integration tests** | The ngspice comparison is T-B9-22. |
| **Playwright** | n/a. |
| **Fixtures** | None. |
| **Acceptance criteria** | Given 5 V, 1 kOhm base resistor from a 5 V pin and a 100 ohm collector load on a 2N2222 card, When solved, Then `Ic` is within 1e-9 of the bisection solution of the same equations and the region is `saturation`. |
| **Observability** | Region and iteration count in `SolveResult`. |
| **Release blockers** | A number in `params.ts` with `source.kind !== 'assumed'` and no title or revision. |
| **Definition of done** | Three new files, the index edit, tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/analog`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-22 (gate vs ngspice and datasheet), T-B9-30 (registry rows for transistor parts), T-B9-19 (switching in the buck). |

### T-B9-02 `Wire.begin` pin binding to nets; devices come from the netlist

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-02. Subsystem: interpreter to netlist binding, `src/lib/interp/arduino`, `src/sim/mcu`. Phase B9, group G3. Priority P0. Depends on: T-B9-03 (`loadDevice`), T-B9-23 (`world.bus`, `deviceSource`), T-B3-15 (`bind.ts`). Status: not started. |
| **Problem** | `Wire.begin` is a no-op (`libs.ts:745`) and library `begin()` calls attach a device by themselves (`libs.ts:1054, 1117`), so a sketch can talk to a sensor that is not wired. Swapped SDA and SCL, a missing pull-up or an unpowered sensor never show (ADR-0307). |
| **Target user** | A maker who wired the BME280 wrong. |
| **User story** | As a maker, I want my sketch's `Wire.begin(21, 22)` to mean the wires I drew, so a swapped or unpowered sensor fails the way it does on a bench. |
| **Expected behaviour** | In a Studio project (`deviceSource: 'netlist'`) the I2C bus is bound to the nets on the pins `Wire.begin` names (or the board default pins), devices exist only if their `SDA`, `SCL`, supply and address-select pins are on the right nets, and everything else gets a NACK. Lesson worlds keep the old behaviour. |
| **Success metric** | On the hand-written `mpu-bus.project.json` (MPU-6050 data device at 0x68, built by T-B9-03) the healthy project's `Wire.begin(21, 22)` scan lists 0x68; with a swapped-wire fault enabled the scan lists nothing and the event `swapped-pins` fires; with `VCC` at 1.0 V the device NACKs with `part-not-powered`; on the `env-monitor.project.json` copy `bindI2c` resolves GPIO21 and 22 to `net_sda` and `net_scl` and reports `swapped-pins` under `flt_swap` (bind level only; the BME280 case is T-B9-04); all lesson references still pass. |
| **Existing files** | `src/lib/interp/arduino/libs.ts:741-777` (`WireClass.begin` at 745, `setClock` at 746; changed after T-B9-23), `src/lib/interp/profiles.ts:108, 124, 137, 148` (`i2c: { sda, scl }` per board), `src/sim/mcu/bind.ts` (T-B3-15; read the real exports first), `04_ARCHITECTURE/schemas/examples/env-monitor-esp32.project.json` (`flt_swap`, `net_scl`, `net_sda`, runtime `rtm_esp`). |
| **New files** | `src/sim/mcu/i2c-bind.ts`. Edits: `libs.ts`, `bind.ts`. Data set (counted once): `src/sim/mcu/fixtures/mpu-bus.project.json` and `env-monitor.project.json`. Tests `src/sim/mcu/i2c-bind.test.ts`, additions to `src/lib/interp/bus.test.ts`. That is 4 source files. |
| **Modules and signatures** | `i2c-bind.ts`: `export interface I2cBinding { sdaNet: NetId; sclNet: NetId; speedHz: number; pullup: { kind: 'resistor'; ohms: number } \| { kind: 'onboard'; ohms: number } \| { kind: 'assumed' } \| { kind: 'none' } } export function bindI2c(project: ProjectView, runtime: RuntimeId, pins: { sda: number; scl: number }): { ok: true; binding: I2cBinding } \| { ok: false; reason: 'pin-has-no-net' \| 'pins-on-one-net' }; export function instantiateNetlistDevices(project: ProjectView, binding: I2cBinding, ctx: (inst: ComponentId) => DeviceContext): { devices: DeviceHandle[]; events: BusEvent[] }; export function findPullup(project: ProjectView, nets: [NetId, NetId]): I2cBinding['pullup']`. `ProjectView` is the read-only document view T-B2 and T-B3-15 expose; the agent reads its real name. `libs.ts`: `WireClass.begin` accepts `begin()`, `begin(sda, scl)` (ESP32 and ESP8266 forms) and calls `rt.world.bindI2c(sda, scl)`; `begin(addr)` (slave mode) raises `library-method-not-modelled` through the existing unsupported path. |
| **Data model** | No new document fields. The binding is derived state. A component descriptor can declare `protocols[].params.onboard_pullup_ohms` (PROPOSAL: a free-form key in `params`, which the schema permits; T-B9-04 sets it on the BME280 module). Fault `flt_swap` (`kind: wrong-connection`, `cause_id: swapped-pins`) is read from `simulation.faults[]` as the example shows. |
| **Input and output** | In: `Wire.begin` pin arguments, the project netlist, runtime id. Out: `world.bus` bound; devices attached; `BusEvent`s. |
| **API contract** | n/a. |
| **Algorithm** | (1) Resolve pins: no arguments means `profile.i2c`; two arguments are GPIO numbers; map each to the board pin and then to the net through the netlist (T-B3-15 map). (2) Collect components whose descriptor has a `protocols[]` entry `kind:'i2c'`, `status:'modelled'`, and a `behaviour.layers[]` `builtin` `ref` of the form `device:i2c/<name>@<major>`. (3) For each, check that its `sda` pin net equals `binding.sdaNet` and its `scl` pin net equals `binding.sclNet`; if they equal the opposite nets, emit `swapped-pins` (SIM 13.4 detector) and do not attach; any other mismatch: not attached, no event (the device is on some other bus). (4) `loadDevice(ref, ctx)` with `ctx.pin(name)` returning the logic level of the net on that part pin and `ctx.supplyV(pin)` the solved node voltage from the analog result (T-B8-05), or the rail value when the circuit has no analog nets. (5) Pull-up: search the netlist for a resistor between each bus net and a net at supply level; if none, use the largest `onboard_pullup_ohms` among the attached parts; if none and the project has analog nets, `none` (bus is `stuck-low`, event `i2c-missing-pullup`); with no analog nets `assumed` (SIM 9.1 rule 4). (6) Set `world.deviceSource = 'netlist'` for the runtime. The `pullup` result goes to `createI2cBus` (T-B9-01): `none` and `assumed` become `o.pullup`, and `resistor` and `onboard` become `cfg.pullupOhms`. |
| **State transitions** | Binding is rebuilt when the document hash changes or a fault toggles (the host restarts the run, T-B4-13). |
| **Validation rules** | The two pins must map to two different nets; a pin with no net gives `pin-has-no-net` and a runtime diagnostic "Wire.begin(21, 22): GPIO21 is not wired to anything". |
| **Error conditions** | As above; none throws. |
| **Edge cases** | A project with two I2C buses (second `TwoWire`): not modelled in the first release, `library-method-not-modelled`. A device with `addressSelect` pin floating: `ctx.pin` returns `floating`, the loader picks the low address and emits an event (PROPOSAL; real chips with a floating address pin are unpredictable, UNKNOWN). Two identical sensors on one bus with different select levels attach at different addresses; same address: second refused (T-B9-01). |
| **Permissions** | n/a. |
| **Performance** | Binding is O(parts + nets) once per run start. |
| **Migration** | `deviceSource` is `'library'` unless a project run sets `'netlist'`. No stored data changes. |
| **Unit tests** | `i2c-bind.test.ts`: default ESP32 pins bind to the nets on GPIO21 and 22; `Wire.begin(4, 5)` binds elsewhere; swapped nets emit `swapped-pins`; unpowered part (supply 1.0 V on `VCC`) is attached but NACKs with `part-not-powered`; a pull-up resistor of 4.7 kOhm is found; no pull-up with analog nets gives `none`; a part descriptor with `onboard_pullup_ohms: 10000`, supplied inline by the test (the BME280 module file arrives in T-B9-04), makes the bus healthy; `bindI2c` on the `env-monitor.project.json` copy and its `flt_swap` fault. `bus.test.ts` additions: in `netlist` mode a library call to an unwired device returns NACK. |
| **Integration tests** | `mpu-bus.project.json` (healthy, then with the swapped-wire fault) loaded through the project core and run with a scan sketch: `Wire.begin(21, 22)` finds 0x68; with the fault the scan returns empty and the evidence has `swapped-pins`. The BME280 at 0x76 is T-B9-04's case; it cannot run here because the BME280 is built in G4. |
| **Playwright** | n/a here. |
| **Fixtures** | `src/sim/mcu/fixtures/mpu-bus.project.json`: a small project written by hand, shaped like the example (one ESP32 runtime, nets `net_sda` and `net_scl`, a 4.7 kOhm pull-up pair, one MPU-6050 instance with builtin ref `device:i2c/mpu6050@1`, a `wrong-connection` fault that swaps the two nets; the part descriptor is supplied inline by the test, since B9 adds no MPU-6050 file under `src/parts`). `src/sim/mcu/fixtures/env-monitor.project.json`: a copy of `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/env-monitor-esp32.project.json`, valid JSON with no comment; its provenance is the top-level key `ext: { "x-source": "<that path>" }`, which the schema allows (`project.schema.json:125` makes `ext` a root property and `$defs.Ext` accepts keys of the form `x-name`, VERIFIED). T-B9-04 reads the copy. |
| **Acceptance criteria** | Given `mpu-bus.project.json` with the swapped-wire fault enabled, When the sketch scans I2C, Then no device answers and the evidence contains `swapped-pins`. Given the healthy project, Then the scan lists 0x68 and a read of the MPU-6050 `WHO_AM_I` register returns 0x68. Given `VCC` at 1.0 V, Then the address NACKs with `part-not-powered`. (The 0x76 and `flt_swap` criteria on the BRIEF 30 project move to T-B9-04.) |
| **Observability** | `BusEvent`s become evidence in the diagnosis record in B10. |
| **Release blockers** | A lesson reference changing result; attaching a device whose pins are not on the bound nets. |
| **Definition of done** | One new file, two edited, the fixture set, tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/lib/interp src/sim/mcu`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-04 (BME280 integration), T-B9-06 (inputs), T-B10 (swapped-pins evidence). |

### T-B9-06 World script and environment sensors (F-209, R-111)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-06. Subsystem: environment and sensors (L11), `src/sim/env`, `src/lib/interp/world.ts`. Phase B9, group G3. Priority P1. Depends on: T-B9-03, T-B9-23, T-B3-10 (seeded RNG). Status: not started. |
| **Problem** | Lesson worlds have fixed knobs; there is no environment model and no scripted inputs for a Studio project, although the example project already has `simulation.world.inputs[]` and `script[]`. Sensors read nothing in particular and have no noise. |
| **Target user** | A maker whose temperature sensor should follow the room and be a little noisy. |
| **User story** | As a maker, I want to script "room goes from 22 to 30 degrees at 2 s" and see my sketch react, with sensor noise it must cope with. |
| **Expected behaviour** | A world driver plays `script` entries as step changes, drives device inputs by id, and keeps an environment object (`environment.temperature`, `.pressure`, `.humidity`, `.light`, `.distance`, `.acceleration`, `.magnetic`). Sensor models turn those into the quantity a part outputs, with range clamp and seeded noise, and each model has a one-line transfer-function text for the Models panel. |
| **Success metric** | The example script moves `temp` 22, 30 at 2,000 ms, 18 at 4,000 ms at those exact virtual times; a sensor with noise sigma s has sample standard deviation within 10 percent of s over 10,000 samples; two runs with the same seed produce identical noise. |
| **Existing files** | `src/lib/interp/world.ts:100-108` (`WorldOptions`; add nothing there), `:137` (`World`; add `setEnv`, `getEnv`), `src/lib/interp/lesson-world.ts:21-33` (read: the LDR, FSR and thermistor formulas to match), `src/lib/interp/devices.ts:261-285` (read: HC-SR04 58.3 microseconds per cm and 38 ms timeout), `schemas/examples/env-monitor-esp32.project.json` (`simulation.world`). |
| **New files** | `src/sim/env/world.ts`, `src/sim/env/sensors.ts`, `src/sim/env/index.ts`. Tests beside. |
| **Modules and signatures** | `world.ts`: `export interface WorldInputSpec { id: string; component: string; device: { kind: 'registry'; device: string; address?: number } \| { kind: 'pin'; pins: string[] } ; min: number; max: number; default: number; step?: number; quantity: string; unit: string } export interface ScriptEntry { input: string; t: number; value: number } export interface WorldDriver { valueAt(id: string, tNs: SimTime): number; nextChangeAfter(tNs: SimTime): SimTime \| null; applyDue(tNs: SimTime, sink: (id: string, value: number, atNs: SimTime) => void): void; set(id: string, value: number, atNs: SimTime): void } export function createWorldDriver(inputs: WorldInputSpec[], script: ScriptEntry[]): { ok: true; driver: WorldDriver } \| { ok: false; error: string }`. `sensors.ts`: `export interface SensorModel { id: string; quantity: string; unit: string; range: [number, number]; noiseSigma: number; quantiseTo?: number; transfer(x: number): number; text: string } export const SENSORS: Record<string, SensorModel>; export function sample(m: SensorModel, x: number, rng: () => number): number; export function irwinHall(rng: () => number): number`. `world.ts` (interp): `setEnv(channel: string, value: number): void; getEnv(channel: string): number \| undefined`. |
| **Data model** | `script[].t` is milliseconds in the project (example: 2000, 4000); the driver converts to integer ns (`t * 1_000_000`). Inputs map to `simulation.world.inputs[]` fields as in the example (`id`, `component`, `device`, `min`, `max`, `default`, `step`, `quantity`, `unit`, `gesture`, `label`). `physical_inputs[].world_channel` on the part (for example `environment.temperature`) names the env channel. No schema change. |
| **Input and output** | In: spec and script. Out: values over time; sink callbacks that call `device.setInput(name, value)` or `world.setEnv`. |
| **API contract** | n/a. |
| **Algorithm** | Script semantics: step, not ramp: the value holds until the next entry (the example expects an immediate step; a ramp would need a `gesture` rule, not specified, so PROPOSAL). Entries are sorted by `t`; equal `t` keeps file order. `applyDue` is called by the orchestrator at P1 each time `nextChangeAfter` fires (T-B3-11 phase order). Sensors: temperature NTC `R = 10000 * exp(3950 * (1/T - 1/298.15))` (matches `lesson-world.ts:30-32`); light LDR `R = min(1e6, 10000 * (lux/10)^-0.7)` (matches `:23-25`); distance: HC-SR04 echo `us = 2 * d / 0.0343` for 2 to 400 cm else 38 ms timeout; motion: accelerometer in g clamped to the device range; magnetic: linear hall `V = Vcc/2 + S * B` with sensitivity S from the part (default parameter in the model text). Noise: `irwinHall(rng)` = sum of 12 uniform values from the seeded stream minus 6, times `noiseSigma`; only additions and multiplications, so it is class B (no `log`/`cos`). Stream name `sensor:<input id>` from T-B3-10's RNG. Quantisation: `Math.round(x / q) * q`. |
| **State transitions** | Driver: `ready` (valueAt/applyDue) with an internal cursor; `reset(seed)` rewinds. |
| **Validation rules** | Unique input ids; script `input` must exist; `value` inside `[min, max]` or the entry is clamped with a warning event; `t` integer ms, 0 to 86,400,000; at most 10,000 script entries; at most 64 inputs. |
| **Error conditions** | Unknown input in script: `{ ok:false, error:'script-unknown-input' }`. |
| **Edge cases** | Two entries at one time for one input (last wins); an input with no script entry holds its `default`; `valueAt` before the first entry returns default. Seeds: the project `simulation.seed` (7 in the example). |
| **Permissions** | n/a. |
| **Performance** | `valueAt` O(log n) by binary search; no per-tick allocation. |
| **Migration** | Lesson worlds keep their own path (`lesson-world.ts`); `drivesFor` is untouched. |
| **Unit tests** | `world.test.ts`: the example script at 1,999 ms, 2,000 ms, 3,999 ms, 4,000 ms; unsorted script; clamp warning; unknown input. `sensors.test.ts`: thermistor value at 25 degC equals 10,000 ohm; LDR and FSR equal the `lesson-world.ts` functions on 10 sample points (compare by calling `drivesFor` for the same input); HC-SR04 at 100 cm is 5,830 us; noise standard deviation within 10 percent over 10,000 samples at sigma 0.5; determinism of two seeded runs; `irwinHall` never calls `Math.log` (grep). |
| **Integration tests** | With T-B9-04: the BME280 sketch reads 30 degC after 2,000 ms of virtual time (T-B9-04 owns that test). |
| **Playwright** | n/a. |
| **Fixtures** | Inline. |
| **Acceptance criteria** | Given the example project's script, When 5,000 ms run, Then the `temp` input is 22 until 2,000 ms, 30 until 4,000 ms, then 18. Given sigma 0.5 and seed 7, Then two runs give identical samples. |
| **Observability** | The Models panel line per sensor: `SensorModel.text`, for example "temperature (degC) to NTC resistance (ohm): R = 10000 exp(3950 (1/T - 1/298.15)), range -40 to 125, noise 0.5". |
| **Release blockers** | A noise source that uses `Math.random` (lint ban) or a transcendental that is not class B. |
| **Definition of done** | Three new files, one edit, tests green, `PORTABLE` clean. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/env src/lib/interp`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-04 (script drives the BME280), T-B9-30 (sensor registry rows), T-B16 and T-B18 (robot and drone sensors reuse `SensorModel`). |

### T-B9-10 avr8js differential: 50 beginner sketches (SA-14, part 1)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-10. Subsystem: software oracle suite (F-182, R-113, REF-2), `src/sim/mcu`. Phase B9, group G3. Priority P0. Depends on: T-B9-07, T-B9-08, T-B9-24. Status: not started. Part 2 (the cost table) is T-B9-31. |
| **Problem** | RS-03 compared the interpreter with avr8js on three sketches. The cost table and the library subset have never met a corpus. R-113 wants the differential on every engine change. |
| **Target user** | The maintainer. |
| **User story** | As the maintainer, I want 50 beginner sketches run on both engines in CI, so a change to either engine that breaks equality fails the build. |
| **Expected behaviour** | A corpus of 55 original sketches (50 for the differential, 5 outside the interpreter's subset) with committed hex, a harness that runs both engines and compares serial text and PWM duty, and a probe that measures the `digitalWrite` loop ratio. |
| **Success metric** | On the 50 differential sketches: serial text equal (class B) and duty within 2 percent (class N). The outside-subset 5 give the named interpreter diagnostic `library-not-modelled` and run on avr8js. The digitalWrite loop ratio is printed; the 15 percent assertion belongs to T-B9-31. |
| **Existing files** | RS-03 `src/compare.mjs`, `src/run-avr.mjs`, `src/interp.test.ts` (read: how the spike compared), `src/sim/mcu/avr8js.ts`, `avr8js-pins.ts` (T-B9-07, T-B9-24), `src/sim/mcu/arduino.ts` (T-B3-12), `scripts/build-hex-fixtures.sh` (T-B9-08; used with `--set corpus`, read only: the script already maps `corpus` to `src/sim/mcu/corpus`). |
| **New files** | `src/sim/mcu/differential.ts`; data folder `src/sim/mcu/corpus/` (55 `.ino`, 55 `.hex`, 55 `.json` sidecars and the set file `corpus/sketches.json` that `build-hex-fixtures.sh --set corpus` reads: ids, `.ino` paths, `uno-r3`/`nano` fqbn and flags; all one data set). Tests `differential.test.ts`, `cost-probe.test.ts`. |
| **Modules and signatures** | `differential.ts`: `export interface SketchMeta { id: string; board: 'uno-r3' \| 'nano'; runMs: number; inputs: ({ t: number; pin: string; level: 0 \| 1 } \| { t: number; channel: number; counts: number })[]; compare: { serial: boolean; duty: string[]; toggleNets?: string[] }; subset: 'inside' \| 'outside'; note?: string } export interface RunSummary { serial: string; pinEdges: Record<string, { t: number; v: 0 \| 1 }[]>; dutyAt30Hz: Record<string, number[]> } export function runInterpreter(src: string, meta: SketchMeta): RunSummary; export function runAvr(avr: Avr8js, hex: string, meta: SketchMeta): RunSummary; export function compareRuns(a: RunSummary, b: RunSummary, meta: SketchMeta, tol: { dutyAbs: number }): { ok: boolean; serialEqual: boolean; worstDuty: number; firstDiff?: string }`. |
| **Data model** | Sidecar `corpus/<id>.json` as `SketchMeta`. Hex sources as built by the script. No project data. |
| **Input and output** | In: sketch, hex, inputs script. Out: `compareRuns` result; a table printed per sketch. |
| **API contract** | n/a. |
| **Algorithm** | Each sketch runs `runMs` (at most 2,000) of virtual time on each engine with the same inputs at the same times (button levels via `port.setPin` on avr8js and `run.input` on the interpreter, analog counts via the ADC adapter and the interpreter's analog input at the equal voltage `counts * 5 / 1024`). Serial text is compared after trimming trailing partial lines (avr8js lines drift up to 25 ms late, RS-03, so the cut is by line, not by time). Duty is the 8-period window at 30 Hz as in RS-03 `adapter-30hz.mjs`. A sketch the interpreter rejects but meta marks `outside` must produce `library-not-modelled` (or the named diagnostic of T-B8-02) and its avr8js run must produce non-empty output. |
| **State transitions** | n/a. |
| **Validation rules** | A test checks the corpus has 50 inside and 5 outside sketches, every `.ino` has a `.hex`, and every hex still matches `scripts/build-hex-fixtures.sh --set corpus --check` (optional, run by T-B9-29 when online, not by `npm test`, because it needs the network). |
| **Error conditions** | A mismatch prints sketch id, first differing line and values. |
| **Edge cases** | Sketches use only the 3 libraries both engines have (core, `Servo`, `Wire` for inside; outside ones use `EEPROM.h`, `SoftwareSerial.h`, `DHT`-style header, `OneWire`-style header, `Preferences`-style call). The `Servo` and `tone` and `attachInterrupt` sketches are the ones RS-03 never tested; they are included on purpose and may expose gaps, which become named `known-gap` rows in the sidecar, with an issue line in the commit message (not hidden). `random()` with a fixed `randomSeed`: the interpreter claims Park-Miller like avr-libc (`interp.ts:121-125`); two sketches test it. |
| **Permissions** | n/a. |
| **Performance** | Whole file under 30 s on the build machine (ESTIMATED: 100 runs of at most 2 s of virtual time, avr8js about 6 times real time). The vitest timeout for this file is 120,000 ms. If a `LOAD` run times out, the file is split into 4 shards by id range (one commit, no threshold change). |
| **Migration** | None. |
| **Unit tests** | `differential.test.ts`: iterates the corpus (`it.each`) and asserts `compareRuns(...).ok` for inside sketches and the diagnostic for outside ones. `cost-probe.test.ts`: the council's loop (`n++; digitalWrite(13,HIGH); digitalWrite(13,LOW);` for 1 s) on both engines; prints iterations and ratio; asserts only that both ran and avr8js count is in 50,000 to 150,000 (hardware ESTIMATE 90,000 to 110,000, DOCUMENTED SIM 8.3). |
| **Integration tests** | Same files. |
| **Playwright** | n/a. |
| **Fixtures** | The corpus. The 55 sketches are written for this repo (PROPOSAL 7). Inside set, 50: blink and timing 5, PWM and fade 5, buttons with `INPUT_PULLUP` and debounce 6, serial print formats and echo 8, `analogRead` with `map` and `constrain` 6, `millis()` state machines 5, arrays and loops 4, string and char handling 3, `Servo` 2, `tone` 2, `attachInterrupt` 2, `random` with a fixed seed 2. Outside set, 5: one each using `EEPROM.h`, `SoftwareSerial.h`, a `DHT`-style library header, a `OneWire`-style library header, and `Preferences`-style calls. The list is fixed in the first commit and not changed afterwards. Hex files are built by `scripts/build-hex-fixtures.sh --set corpus` (T-B9-08). |
| **Acceptance criteria** | Given the 50 inside sketches, When both engines run, Then serial text is equal and duty within 2 percent for all, or each exception is a named `known-gap` row and the task is reported incomplete (SA-14 not recorded). |
| **Observability** | A summary table in the vitest output: id, serial equal, worst duty, status. |
| **Release blockers** | A threshold change to make a sketch pass (Amar's decision); a hex that cannot be rebuilt by the script. |
| **Definition of done** | Harness, corpus and tests committed; a table in the commit message; known gaps listed. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/mcu/differential.test.ts src/sim/mcu/cost-probe.test.ts`; `bash scripts/build-hex-fixtures.sh --set corpus --check` (optional; needs arduino-cli, which is not installed on this machine (VERIFIED, `which`); skip and record NOT RUN if offline. The 55 hex files are first created with `--set corpus`, which cannot be skipped). |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-31 (fix the cost table until the probe is within 15 percent), T-B9-29 (SA-14 record), T-B9-21 (timing fixtures). |

### T-B9-19 Transient backend per the verdict (SA-05)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-19. Subsystem: analog backends, `src/sim/analog`. Phase B9, group G3. Priority P0. Depends on: T-B9-16, T-B9-18 (verdict), T-B3-17, T-B8-05. Status: not started. The contents depend on the verdict letter in `TRANSIENT.md`; the agent reads it first and builds exactly one branch below. |
| **Problem** | Capacitors and inductors have no live transient. R-105: within 1 percent of ngspice and a frame under 16 ms on the throttled setting. |
| **Target user** | A maker looking at an RC filter, an RLC ring or a buck converter. |
| **User story** | As a maker, I want to see the waveform of my RC filter, with a stated error, or be told plainly that the live view is not available. |
| **Expected behaviour** | Outcome A: `mna-inhouse` reports `capabilities.transient = true`; the orchestrator runs it in `transient` mode with a fixed step `h` (default 1000 ns, range 100 to 100,000 ns). Outcome B: `ngspice-batch` runs on an "Analyse" press and plays back the waveform; no live transient. Outcome C: nothing is built; live mode shows "not modelled yet" on C and L parts. |
| **Success metric** | A: RC, RLC and buck within 1 percent of ngspice by the metric in `TRANSIENT.md` and under the frame budget it defines, on the build machine at 6 times throttle. B: the same accuracy on the batch result with a 1 s simulation under 5 s wall. C: SA-05 recorded as not met with the reason. |
| **Existing files** | `src/sim/analog/solve.ts` and `newton.ts` (T-B3-17, T-B9-16: call per step), `src/sim/analog/elements.ts` (C and L element kinds), `src/sim/orchestrator.ts` (T-B3-11, T-B8-09: add the `transient` timing mode; E), `TRANSIENT.md` (read). |
| **New files** | Outcome A: `src/sim/analog/transient.ts`, `companion.ts`, `backend.ts`. Outcome B: `backend.ts` (`ngspice-batch`), `netlist.ts` (SimNetlist to SPICE text), `ngspice-batch.ts` (engine runner), plus an entry in `scripts/build-engines.mjs` (E, the only edit to that file in this task) and `src/sim-host/engines/ngspice.manifest.json`; the package `eecircuit-engine@1.9.0` is already pinned by T-B9-07, so the build script copies it from `node_modules` and `package.json` is not edited. File count: A is 4 (5 if a `solve.ts` hook is needed), B is 5, C is 0. Outcome C: none (docs only, edit under T-B9-28). Tests in each case. |
| **Modules and signatures** | Outcome A: `companion.ts`: `export function capacitorStamp(c: number, h: number, vPrev: number, iPrev: number, method: 'trapezoidal' \| 'backward-euler'): { g: number; ieq: number }; export function inductorStamp(l: number, h: number, iPrev: number, vPrev: number, method: ...): { r: number; veq: number }`. `transient.ts`: `export interface TransientState { tNs: SimTime; v: Float64Array; reactive: Float64Array; method: 'trapezoidal' \| 'backward-euler'; stepsSinceEvent: number } export function createTransient(g: AnalogGraph, o: { hNs: number }): { ok: true; state: TransientState } \| { ok: false; error: string }; export function stepTransient(s: TransientState, g: AnalogGraph, events: Change[]): AnalogStepResult`. `backend.ts`: `export const mnaInhouse: AnalogBackend` (SIM 7.4 interface, `kind:'mna-inhouse'`, `capabilities: { transient: true, coSimulate: true, interactive: true }`). Outcome B: `export const ngspiceBatch: AnalogBackend & { analyse(net: SimNetlist, o: { endNs: SimTime; maxStepNs: SimTime }): Promise<Waveforms> }` with `capabilities: { transient: true, coSimulate: false, interactive: false }`; `advanceTo` throws `not-interactive`. |
| **Data model** | `AnalogStepResult`, `Change`, `LoadReport`, `Waveforms` per SIM A.3 and the trace chunk type `TraceChunk` (A.4). No document fields. The project `simulation.solver.engine` string `iynk-mna` stays. |
| **Input and output** | A: graph in, voltages and branch currents per step. B: SimNetlist in, `Waveforms` out. |
| **API contract** | n/a. |
| **Algorithm** | A: trapezoidal companion models; the first step after any discontinuity (switch change, diode state flip, source change) and after a detected ringing event (sign alternation of the reactive current over 3 steps) uses backward Euler; Newton failure halves `h` for that solve, at most 8 halvings, then reports non-convergence (SIM 6.2). `h` never depends on wall time. B: build the netlist; run `.tran` with the pinned engine; no step-size adaptation beyond `maxStep`. |
| **State transitions** | A: `unprepared` to `prepared` to `stepping`; `discontinuity` forces one BE step; `failed(non-convergence)`. |
| **Validation rules** | `hNs` integer 100 to 100,000; C and L values positive finite; a capacitor or inductor with a zero value is rejected with `invalid-device-params`. |
| **Error conditions** | `no-convergence`, `numeric-fault` (names the element), B: `engine-unavailable`, `engine-integrity`. |
| **Edge cases** | Initial conditions (`uic`): all capacitors at 0 V unless the part states otherwise; an inductor in series with an open switch; very different time constants (buck 100 kHz against a 10 ms output filter); step size larger than the fastest time constant (the 5-step rule in SIM 6.4 emits a warning). |
| **Permissions** | n/a. B: the ngspice engine is an optional download behind `loadEngine`, not part of the base bundle (SIM 7.4 build constraints); licence review flag false until Amar reviews. |
| **Performance** | Per `TRANSIENT.md`. The frame definition is the one `TRANSIENT.md` section 1 records: the 100 us / 16 ms / 6x throttle proposal, unless Amar changed it (section 10 item 6). The task does not wait for an answer. |
| **Migration** | `mna-inhouse` DC behaviour is unchanged. C and L parts change from "not modelled yet" to computed only in outcome A or B. |
| **Unit tests** | A: `companion.test.ts` (RC step, RL step against closed forms to 1e-6 relative at h = 1 us); `transient.test.ts` (RC, RLC underdamped, buck; error against the committed reference from `TRANSIENT.md` data; first-step BE after a switch; halving on a constructed Newton failure; determinism: two runs equal bit for bit). B: `netlist.test.ts` (golden SPICE text), `ngspice-batch.test.ts` (runs only when the engine is built, fails under `CI=true` if missing). |
| **Integration tests** | The three circuits as projects through the orchestrator in `transient` mode. |
| **Playwright** | n/a here. |
| **Fixtures** | `src/sim/analog/fixtures/ngspice/transient.json` copied from the spike data with `source` and `revision` (spike path, engine version). |
| **Acceptance criteria** | Exactly one Given/Then applies, chosen by the outcome letter in `TRANSIENT.md`. Outcome A: Given the buck stage, When run for 1 ms at h = 1 us, Then each output node is within 1 percent of the reference by the spike's metric and one frame costs under the budget `TRANSIENT.md` defines. Outcome B: Given the RC low-pass, When Analyse is pressed, Then the played-back waveform is within 1 percent of the reference by the spike's metric, a 1 s simulation finishes in under 5 s wall, and `advanceTo` throws `not-interactive`. Outcome C: Given any circuit with a capacitor in live mode, Then the run shows "not modelled yet" for that part, `capabilities.transient` is false, and the commit message says "SA-05 not met, outcome C" with the reason. |
| **Observability** | `LoadReport` carries `method`, `hNs`, halving count. |
| **Release blockers** | A transient number shown with no recorded accuracy; building a branch other than the verdict's. |
| **Definition of done** | The branch's files committed; SA-05 result in the commit message, or "not met, outcome C". |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/analog`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | T-B9-28 writes the verdict into `docs/FIDELITY.md`. |
| **Rollback** | `git revert`; `capabilities.transient` returns false. |
| **Later tasks need** | T-B9-30 (registry rows for C and L), T-B9-29 (SA-05 record), B10 (faults on reactive parts). |

### T-B9-26 Firmware mode switch and hex import entry (R-102)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-26. Subsystem: Studio run UI and engine composition, `src/sim/mcu`, `src/components/studio`, `src/studio/run`. Phase B9, group G3. Priority P0. Depends on: T-B9-07, T-B9-08, T-B9-24, T-B9-25, T-B9-35, T-B4-13. Status: not started. |
| **Problem** | avr8js exists as an engine but a person cannot choose it, import a hex, or see the T3 label. Hex import must work with no server (ADR-0013 option C). |
| **Target user** | A maker with a compiled hex or a sketch outside the interpreter's subset. |
| **User story** | As a maker, I want to switch my Uno project to Firmware mode, import my `.hex`, and run it, knowing it is a heavier mode. |
| **Expected behaviour** | A run-bar control "Interpreter / Firmware" for Uno and Nano projects. Firmware needs an imported hex (and optionally an ELF); import errors are named and translated. Selecting it sets the runtime engine to `avr8js`, stores the hex as a `binary` asset, and shows tier T3 for the CPU and T1 for passive parts. |
| **Success metric** | M1-style flow: import `blink.hex`, press Run, LED toggles on D13 at 500 ms; switching back to Interpreter restores the previous behaviour; a corrupt hex shows the translated named error and nothing runs. |
| **Existing files** | `src/components/studio/RunBar.tsx` (T-B4-13; E: mount the control), `src/studio/run/session.ts` (T-B4-13, T-B8-14; E: engine choice), `src/sim/mcu/avr8js.ts`, `avr8js-pins.ts`, `avr8js-bus.ts`, `src/export/hex.ts`, `elf.ts`, `src/sim-host/engines/loader.ts`. |
| **New files** | `src/sim/mcu/firmware.ts`, `src/components/studio/FirmwareMode.tsx`. Tests `firmware.test.ts`, `FirmwareMode.test.tsx`; `e2e/firmware-mode.spec.ts`. |
| **Modules and signatures** | `firmware.ts`: `export interface FirmwareOptions { board: 'uno-r3' \| 'nano'; hex: string; elf?: Uint8Array; wiring: { pins: PinSink & PinSource; bus: BusPort; busId: BusId; vref: number } } export function createFirmwareEngine(avr: Avr8js, o: FirmwareOptions): { ok: true; engine: AvrEngine; image: { bytes: number; sourceMap?: SourceMap } } \| { ok: false; error: ParseError \| { kind: 'unsupported-board' } }`. `FirmwareMode.tsx`: exports `imageOps(rt: RuntimeView, name: string, hex: string, elf?: Uint8Array): ProjectOp[]` (also used by T-B9-15) and the client component `FirmwareMode(props: { runtime: RuntimeView; assets: AssetView[]; onChange(op: ProjectOp): void })` that emits `asset.add` (role `binary`, `mediaType: 'application/octet-stream'`, `path: 'firmware/<name>.hex'`, `bytes`, `sha256`) and `runtime.set` (`engine: 'avr8js'`, `options: { image: '<asset id>', elf?: '<asset id>' }`) operations; it never edits the document directly. |
| **Data model** | `Runtime.engine` is the open registry id `avr8js` (project schema `RegistryId`); `Runtime.options` carries asset ids (at most 32 keys); `Asset.role = "binary"`, `bytes` at most 16,777,216 (schema). |
| **Input and output** | In: picked file bytes. Out: ops, a loaded engine, or a named error shown with `fidelity.import.error.<kind>`. |
| **API contract** | n/a. |
| **Algorithm** | File pick (`<input type=file accept=".hex,.elf">`, keyboard operable) reads bytes; text for hex; parse in the sim worker through `parseHex`; on success emit the two ops; on `runtime.set` the session rebuilds the engine through `createFirmwareEngine`. Engine files come from `loadEngine('avr8js')` (T-B3-09). The control is disabled with the reason `fidelity.firmware.onlyAvr` for any other board. The tier chip row (T-B8-04) shows `T3` for the runtime layer when the engine is `avr8js`; passives stay at their own tier. The desktop note `fidelity.firmware.desktopNote` is shown when `navigator.hardwareConcurrency <= 4` (PROPOSAL: a coarse hint only, RS-03 had no device result). A PC-to-line map from an imported ELF is used by T-B9-27. |
| **State transitions** | `interpreter` to `firmware-no-image` (no hex) to `firmware-ready`; switching back is always allowed and keeps the hex asset. |
| **Validation rules** | Hex at most flash size plus 1 MiB of text (T-B9-08 errors); ELF at most 8 MiB; asset path unique; at most one hex per runtime. |
| **Error conditions** | All T-B9-08 error kinds mapped to strings; engine integrity failure from `loadEngine` shown as "engine file failed its check". |
| **Edge cases** | Importing a hex built for another board family cannot be detected from the hex (flash size only); a warning is shown if the image is larger than 32,768 bytes (error) or empty. Two runtimes on two Uno boards: each has its own hex. Undo of the import removes asset and runtime change as one batch. |
| **Permissions** | In a room, only a member who may edit the project (baton or editor) can change the runtime, as for any `runtime.set` (B7 permission matrix). |
| **Performance** | Engine load under 1 s on desktop (ESTIMATED; the avr8js size is UNKNOWN until measured by T-B9-07). |
| **Migration** | None. Projects with `engine: 'iynk-interp'` are untouched. |
| **Unit tests** | `firmware.test.ts`: engine built from the blink fixture; a bad checksum returns the named error; an `esp32-devkitc` board is refused. `FirmwareMode.test.tsx`: renders disabled for non-AVR; emits both ops on a good file; shows the translated error on a bad one; keyboard: the file button is focusable and Enter opens the picker. |
| **Integration tests** | The session test (T-B4-13 style) runs the blink image for 1.2 simulated seconds and sees two level changes on D13. |
| **Playwright** | `e2e/firmware-mode.spec.ts`: new Uno project, set the file input with `blink.hex` (fixture from T-B9-08), switch to Firmware, run, expect the pin D13 indicator to change and the tier text "Runs your firmware"; import a corrupted hex and expect the named error. Chromium. |
| **Fixtures** | `src/export/fixtures/blink.hex`, a corrupted copy made in the test. |
| **Acceptance criteria** | Given a Uno project with no hex, When I choose Firmware, Then the control asks for a file and nothing runs. Given `blink.hex`, When I press Run, Then D13 toggles every 500 ms of virtual time and the chip shows T3 for the CPU. |
| **Observability** | Run bar shows "behind real time" via the existing counter (T-B8-14); no telemetry. |
| **Release blockers** | Any path that loads the engine or parses a hex outside the sim worker; an untranslated error. |
| **Definition of done** | Two new files and two edits plus tests; the e2e spec passes in Chromium. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/mcu src/components/studio src/studio`; `node scripts/build-engines.mjs --only avr8js`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/firmware-mode.spec.ts` (the spec's `npm run build` runs `prebuild`, which runs `engines:build` from T-B9-07, so a clean tree works; with `E2E_SKIP_BUILD=1` the `--only avr8js` step must have run first). |
| **Documentation** | `docs/COMPILE.md` (T-B9-28) describes hex import. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-15 (Build button feeds this), T-B9-27 and T-B9-33 (debug in firmware mode), T-B9-10 (UI parity). |

### T-B9-27 avr8js debug adapter and SA-15 on both engines

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-27. Subsystem: debugger, avr8js side, `src/sim/debug`. Phase B9, group G3. Priority P1. Depends on: T-B9-07, T-B9-08 (ELF, line table), T-B9-11 (`DebugPort`). Status: not started. |
| **Problem** | R-106 asks for breakpoints on compiled firmware too. avr8js has no source awareness; the DWARF line table and the program counter must be joined. |
| **Target user** | A maker debugging a compiled sketch. |
| **User story** | As a maker, I want a breakpoint on a `.ino` line to stop my compiled sketch on that line. |
| **Expected behaviour** | `DebugPort` on `AvrEngine`: line breakpoints become a bitmap over flash words from the `SourceMap`; step by line; step over by stack pointer; the instruction loop uses its checking variant only while breakpoints exist. |
| **Success metric** | SA-15: breakpoints stop on the right line in 5 sketches on both engines (the same 5 as T-B9-11); `#line` mapping of `.ino` verified; global variables match known values is T-B9-12. |
| **Existing files** | `src/sim/mcu/avr8js.ts` (read: `breakBitmap`, `onBreak`), `src/export/dwarf-lines.ts`, `elf.ts` (T-B9-08), `src/sim/debug/breakpoints.ts` (T-B9-11: `DebugPort`, `PauseEvent`), SIM 8.7 table. |
| **New files** | `src/sim/debug/avr8js-debug.ts`. Tests `avr8js-debug.test.ts`, `sa15.test.ts`. Data (one data set): five `.hex`/`.elf` pairs built from the T-B9-11 sketches in `src/sim/debug/sketches/` with `scripts/build-hex-fixtures.sh --set sa15` into `src/sim/debug/sketches/build/`, and the set file this task creates, `src/sim/debug/sketches/sketches.json` (ids, `.ino` paths, `arduino:avr:uno`, flags `compiler.cpp.extra_flags=-g -Og` and `compiler.c.extra_flags=-g -Og`, `elf: true`). The script is T-B9-08's and is not edited here. |
| **Modules and signatures** | `export function createAvrDebugger(engine: AvrEngine, map: SourceMap): DebugPort & AvrAdapter; export function lineToPcs(map: SourceMap, file: string, line: number): number[]; export function pcToLine(map: SourceMap, pc: number): { file: string; line: number } \| null`. |
| **Data model** | `SourceMap` (T-B9-08). The map is stored with the imported ELF asset only in memory; it is rebuilt from the ELF on load, not saved in the document. |
| **Input and output** | In: breakpoint lines, step commands. Out: `PauseEvent` with `file`, `line`, `atNs = cyclesToNs(cpu.cycles)`. |
| **API contract** | n/a. |
| **Algorithm** | `setBreakpoints(file, lines)`: for each line collect the `pc` of entries with `isStmt` and the lowest `pc` per (file, line) (a line can have several ranges; stop at each range start); set bits in `breakBitmap[wordIndex >> 3]`; if no bit is set the loop uses the plain variant. `onBreak(pc)`: map to line; emit `PauseEvent`; the engine returns `stoppedEarly: true`. Resume steps one instruction without the check, then re-arms (`skipOnce`). Step line: run until the PC is the start of an entry with a different (file, line) and `isStmt`. Step over: record `SP`; run until a new line starts with `SP >= recorded`. Step out: run until `SP > recorded` return address popped. Time: frozen while paused; nothing advances. `.ino` mapping: arduino-cli inserts `#line` directives so DWARF names the `.ino` file and its own line numbers (EXTERNAL knowledge, verified here by SA-15 on a two-file sketch). |
| **State transitions** | `running`, `paused`; stepping modes are one-shot. |
| **Validation rules** | Breakpoints on lines with no code are bound to the next line that has code (reported to the panel). At most 1,024 breakpoints. |
| **Error conditions** | No ELF: `setBreakpoints` returns `{ ok:false, reason:'no-elf' }` and the panel says "import the .elf to debug firmware". |
| **Edge cases** | Inlined functions give several PCs for one line; optimised builds (`-Os`) reorder lines (the doc asks for `-g -Og` builds when `debug: true`, SIM 8.5); interrupts firing during step (the step ends in the ISR if it has a line entry: PROPOSAL, mark "in interrupt" in the pause event); `delay()` internals have no `.ino` line, so stepping over them runs through. |
| **Permissions** | n/a. |
| **Performance** | Checking variant costs at most 30 percent of throughput while breakpoints exist (ESTIMATED, measured and printed by the test); zero cost without breakpoints. |
| **Migration** | None. |
| **Unit tests** | `avr8js-debug.test.ts`: bitmap bits for a hand-built `SourceMap`; `lineToPcs` multi-range; step line, over and out on the hand-assembled call program. `sa15.test.ts`: the 5 sketches; for each, on the interpreter (T-B9-11) and on avr8js with the ELF, set the same breakpoint and assert the same `(file, line)` of the first stop, and the same number of stops in the first 2 simulated seconds (SA-15). The two-`.ino` sketch proves the `#line` mapping. |
| **Integration tests** | Same files. |
| **Playwright** | UI is T-B9-33. |
| **Fixtures** | Five hex/elf pairs. Global values for T-B9-12. |
| **Acceptance criteria** | Given `blink` compiled with `debug: true` and a breakpoint on the `digitalWrite(LED_PIN, HIGH)` line, When it runs, Then the engine stops with `PauseEvent` at that file and line and the interpreter stops at the same one. |
| **Observability** | `PauseEvent` and the measured loop throughput with and without breakpoints in the test output. |
| **Release blockers** | A mismatch of file or line between engines on any of the 5 sketches. |
| **Definition of done** | Adapter, two test files and fixtures committed; SA-15 table in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `bash scripts/build-hex-fixtures.sh --set sa15` (creates the five pairs; needs the toolchain download once; cannot be skipped the first time, and later runs of `--check` are optional); `npx vitest run src/sim/debug`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-33 (UI), T-B9-12 (globals from the ELF symbol table). |

### T-B9-36 Sim-side debug routing: the `debug` request and the `paused` event

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-36. Subsystem: sim host protocol and handler, `src/sim-host`. Phase B9, group G3. Priority P1. Depends on: T-B9-11 (`DebugPort` on `McuEngine.debug`), T-B3-13 (`protocol.ts`, `handler.ts`), T-B8-14 (pause state). Status: not started. Added in the review of 2026-10-27: without it no engine ever receives a debug message. |
| **Problem** | T-B9-11 and T-B9-27 give engines a `DebugPort`, and T-B9-33 shows a panel, but nothing carries a breakpoint from the host to an engine or a pause from an engine to the host. SIM 17.2 names `{ t: 'debug'; op: DebugOp }`; B3's `SimReq` leaves it out ("debug are added by B8/B9"). The engine-side logic lives in `handler.ts` (T-B3-13), and `sim.worker.ts` is a thin shell around it. |
| **Target user** | A maker who sets a breakpoint and presses Run. |
| **User story** | As a maker, I want my breakpoint to reach the engine and the pause to stop all engines at one time. |
| **Expected behaviour** | The handler routes `debug` requests to the `DebugPort` of the engine that runs the named runtime. When an engine pauses, the handler stops its pump, posts `state: paused` at the pause time and an `event` of kind `paused`. `continue` and `step` restart the pump. |
| **Success metric** | With two stub engines, one pausing at 500 us, no engine's time passes 500 us while paused (asserted on both), and a `continue` lets both advance. A `debug` request to an engine without `debug` answers `error` with kind `no-debug-port`. |
| **Existing files** | `src/sim-host/protocol.ts` (T-B3-13; E: add the request and the event kind), `src/sim-host/handler.ts` (T-B3-13; E: route and pause), `src/sim/debug/breakpoints.ts` (T-B9-11; read: `DebugPort`, `PauseEvent`), `src/sim/orchestrator.ts` (read only: the agent reads how `runUntil` treats an engine that returns `stoppedEarly`; HYPOTHESIS that the horizon drops to the earliest early stop, SIM 5.5), SIM 17.2 and A.4. `src/sim-host/sim.worker.ts` is not edited. |
| **New files** | None. Tests `src/sim-host/debug-route.test.ts`. That is 2 source files. |
| **Modules and signatures** | `protocol.ts`: `SimReq` gains `{ v: 1; id: number; t: 'debug'; run: number; runtime: string; op: DebugOp }`; `SimEv` `event` gains `{ kind: 'paused'; runtime: string; reason: 'breakpoint' \| 'step' \| 'watch'; file: string; line: number; atNs: number; bound?: { file: string; line: number }[] }`. `DebugOp` is imported from SIM A.4 (`set-breakpoints`, `continue`, `pause`, `step`, `inspect`, `watch`, `unwatch`); this task handles the first four, and `inspect`, `watch` and `unwatch` answer `error` kind `not-yet` until T-B9-12. `handler.ts`: the `debug` case of the request switch. |
| **Data model** | None stored. |
| **Input and output** | In: `debug` request with a run id. Out: `ack` or `error`, then `state` and `event` messages. |
| **API contract** | n/a: in-process worker messages. The protocol constant is not bumped; the messages are additive. |
| **Algorithm** | `set-breakpoints`: `engine.debug.setBreakpoints(file, lines)` and reply `ack`. `continue`: `engine.debug.resume()` then schedule the pump. `step`: `engine.debug.step(unit)` then schedule the pump for one slice. `pause`: use the T-B8-14 pause path. After each `runUntil` slice the handler checks every engine's `debug.paused`; the first non-null `PauseEvent` stops the pump, posts `state` `paused` with `at = event.atNs` and the `paused` event, and leaves the other engines where the slice left them. Wall time is read only through the handler's `wallMs` dep. |
| **State transitions** | `running` to `paused` on a `PauseEvent`; `paused` to `running` on `continue` or `step`. A `load`, `stop` or `reset` clears the pause and keeps nothing (breakpoints are re-sent by the host, T-B9-33). |
| **Validation rules** | `run` must be the current run id (stale ids are ignored, T-B3-13); `lines` at most 256 per file and 1,024 per engine; `unit` is one of `line`, `over`, `out`. |
| **Error conditions** | Unknown runtime: `error` kind `unknown-runtime`. Engine without a `debug` port: `no-debug-port`. |
| **Edge cases** | Two runtimes: a pause in one holds both; a request for the other runtime still routes. A `step` while running is ignored and answered with the current state. A pause during a slice that has already run other engines to the same horizon does not roll them back (they are at most one horizon ahead; the test fixes the horizon to the pause time). |
| **Permissions** | n/a here; room rules are T-B9-33 and B8 T-B8-18. |
| **Performance** | One null check per slice per engine. |
| **Migration** | None. |
| **Unit tests** | `debug-route.test.ts` (inline port, fake `wallMs` and `schedule`, two stub engines with a scripted `DebugPort`): set-breakpoints reaches the right engine; a pause stops both at the pause time; `continue` resumes both; `step` runs one slice; no-debug-port and unknown-runtime errors; stale run id ignored; the existing `handler.test.ts` stays green. |
| **Integration tests** | With T-B9-33's session test (interpreter engine, blink): a breakpoint on line 8 gives a `paused` event after setup. |
| **Playwright** | n/a. |
| **Fixtures** | Stub engines inside the test. |
| **Acceptance criteria** | Given two stub engines and a breakpoint that stops engine A at 500 us, When the run starts, Then a `paused` event arrives with `atNs` 500,000, `state` is `paused`, and neither engine's time exceeds 500 us. Given `continue`, Then both advance. |
| **Observability** | The `paused` event is the record. No telemetry. |
| **Release blockers** | A pause that leaves another engine running; a wall-clock read outside `wallMs`. |
| **Definition of done** | Two edited files and one test file; `handler.test.ts` and `host.test.ts` green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim-host`; `npx tsc -p tsconfig.portable.json`. |
| **Documentation** | `docs/FIDELITY.md` debugging section by T-B9-28. |
| **Rollback** | `git revert`; the debug port is unreachable again, nothing else uses it. |
| **Later tasks need** | T-B9-33 (host method and panel), T-B9-12 (`inspect`, `watch`). |

### T-B9-37 `compile` rate-limit bucket

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-37. Subsystem: server HTTP classes and limits, `server/src/http`. Phase B9, group G3. Priority P1. Depends on: T-B6-07. Status: not started. Added in the review of 2026-10-27. It carries no compile logic, so it does not wait for Amar's answer to section 10 item 1. |
| **Problem** | API 4.3 lists a `compile` bucket at 10 per minute per identity. T-B6-07's `BucketName` union ends at `read` and `write` and has no such member (VERIFIED in B6 T-B6-07 "Modules and signatures"), so a compile route could not be defined with the right bucket. |
| **Target user** | The operator. |
| **User story** | As the operator, I want compile jobs limited to 10 a minute per device so one device cannot fill the queue. |
| **Expected behaviour** | `BucketName` includes `compile`; the default limiter table has the rule `10 per minute, per identity`; `defineRoutes` accepts a route with that bucket. |
| **Success metric** | The 11th take in one minute for one identity is refused with `retryAfter` > 0; the 11th for another identity is allowed; `route-registry.test.ts` stays green. |
| **Existing files** | `server/src/http/classes.ts` (E: add `"compile"` to `BucketName`), `server/src/http/limits.ts` (E: add the rule to the default table; the agent reads the real table name first), API_CONTRACTS 4.3 (`API_CONTRACTS.md:213`, read). |
| **New files** | None. Additions to `server/test/limits.test.ts`. |
| **Modules and signatures** | `export type BucketName = ... \| "compile"`. Rule shape as the other rules in the file. |
| **Data model** | None. |
| **Input and output** | `limiter.take('compile', key)` returns the existing result shape. |
| **API contract** | API 4.3 `compile` row: 10/min/identity. |
| **Algorithm** | Same sliding window as the other identity buckets, keyed `dev:<deviceId>` after authentication. |
| **State transitions** | n/a. |
| **Validation rules** | n/a. |
| **Error conditions** | 429 `rate_limited` with `Retry-After`, as the router already does. |
| **Edge cases** | Fake clock at the window edge; two identities. |
| **Permissions** | n/a. |
| **Performance** | n/a: one table row. |
| **Migration** | None. |
| **Unit tests** | `limits.test.ts` additions: ten takes pass, the eleventh fails, a different key passes, the window refills with the fake clock. |
| **Integration tests** | None here; T-B9-13 uses the bucket. |
| **Playwright** | n/a. |
| **Fixtures** | None. |
| **Acceptance criteria** | Given 10 takes by one identity in a minute, When an 11th arrives, Then `ok` is false and `retryAfter` is positive. |
| **Observability** | n/a. |
| **Release blockers** | A bucket name that differs from API 4.3. |
| **Definition of done** | Two edits and the test additions. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npm run server:typecheck` (`SRVT`); `cd server && node --test test/limits.test.ts test/route-registry.test.ts`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-13. |

### T-B9-04 BME280 model and `Adafruit_BME280` library (SA-24)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-04. Subsystem: device models and library models, `src/sim/devices`, `src/lib/interp/arduino`, `src/parts`. Phase B9, group G4. Priority P0. Depends on: T-B9-03 (register devices), T-B9-23 (`world.i2cTransfer`), T-B9-02 (netlist binding), T-B9-20 (`dmath.pow`), T-B9-06 (inputs, for the scripted test). Status: not started. |
| **Problem** | The BRIEF 30 environment monitor needs a BME280 and `Adafruit_BME280`; neither exists (`grep -ri bme280 src` is empty). The example part descriptor says "planned, no such device" (`bme280-module.component.json`). |
| **Target user** | A maker building the ESP32 environment monitor. |
| **User story** | As a maker, I want `bme.begin(0x76)` to succeed only when the sensor is powered and wired right, and `readTemperature()` to return the room temperature I set. |
| **Expected behaviour** | A register-level BME280 (`device:i2c/bme280@1`) that answers at 0x76 or 0x77 by the `SDO` pin, only with `CSB` high and supply in range, returns raw ADC words made by inverting the datasheet compensation, and a library model that reads calibration and applies the datasheet integer formulas, so bus faults stay visible. |
| **Success metric** | SA-24: for 1,000 seeded inputs inside the declared ranges, `readTemperature`, `readHumidity`, `readPressure` return the input within 0.01 degC, 0.01 %RH, 1 Pa; a burst read of `0xF7..0xFE` is one consistent sample; `begin(0x76)` fails with `SDO` on supply, with `CSB` low, and with the `VCC` pin at 1.0 V; the `begin` byte trace equals the one in SIM 9.2.1; the same inputs give the same raw words in Node, Chromium and WebKit, and in Firefox when it is installed, else recorded NOT RUN with the reason (as T-B9-20); the browser legs use the e2e hash check below. |
| **Existing files** | `src/lib/interp/arduino/libs.ts:1408-1429` (`LIBS`: add `Adafruit_BME280` and `Adafruit_Sensor`; E), `:35-42` (`LibClass` shape), `:1050-1056` (the SSD1306 `begin` pattern to follow: header, `create`, `methods`), `src/sim/devices/loader.ts` (T-B9-03), `04_ARCHITECTURE/schemas/examples/components/bme280-module.component.json` (copy source), `src/sim/mcu/fixtures/env-monitor.project.json` (T-B9-02; read: the BRIEF 30 project). |
| **New files** | `src/sim/devices/bme280.ts`, `src/sim/devices/data/bme280.device.json`, `src/lib/interp/arduino/lib-bme280.ts`, `src/parts/data/bme280-module.component.json`. Tests `bme280.test.ts`, `lib-bme280.test.ts`, `e2e/bme280-hash.spec.ts`. |
| **Modules and signatures** | `bme280.ts`: `export function registerBme280(): void` (registers behaviours `bme280.measure`, `bme280.reset`, `bme280.config` in `BEHAVIOURS`); `export function invertCompensation(cal: Bme280Cal, t100: number, pPa: number, hPct: number): { adcT: number; adcP: number; adcH: number }`; `export function compensateT(cal, adcT): { t100: number; tFine: number }`; `compensateP(cal, adcP, tFine): number /* Pa, Q24.8 as integer */`; `compensateH(cal, adcH, tFine): number /* Q22.10 */`; `export interface Bme280Cal { digT: [number, number, number]; digP: number[]; digH: number[] }`; `export function parseCalibration(bytes: Uint8Array /* 26 + 7 */): Bme280Cal`. The 64-bit pressure formula uses `BigInt`. `lib-bme280.ts`: `export const Bme280Class: LibClass` (header `Adafruit_BME280.h`, methods `begin`, `readTemperature`, `readHumidity`, `readPressure`, `readAltitude`, `sensorID`; `setSampling`, `takeForcedMeasurement`, `getTemperatureSensor` and the `Adafruit_Sensor` event interface raise `library-method-not-modelled`) and `export const SensorClass: LibClass` (header `Adafruit_Sensor.h`, constant `SENSORS_PRESSURE_SEALEVELHPA` = 1013.25, `sensors_event_t` and `getEvent` not modelled). |
| **Data model** | `bme280.device.json` is the SIM 9.2.1 descriptor with `id: 'device:bme280.regs@1'`, `registry: 'model:bme280.regs@1'`, the builtin ref `device:i2c/bme280@1` (PROPOSAL 3), `addressSelect: { pin: 'SDO', low: 118, high: 119 }`, `requires: { pins: { CSB: 'high' }, supply: { pin: 'VCC', min: 1.71, max: 3.6 } }` (PROPOSAL 4), `writeMode: 'pairs'`, registers `ID 0xD0 = 0x60`, `RESET 0xE0`, `CTRL_HUM 0xF2`, `STATUS 0xF3 (expr measuring * 8)`, `CTRL_MEAS 0xF4`, `CONFIG 0xF5`, `PRESS 0xF7 (3 bytes, reset 0x80000)`, `TEMP 0xFA (3 bytes, reset 0x80000)`, `HUM 0xFD (2 bytes, reset 0x8000)`, calibration blocks `0x88` (26 bytes) and `0xE1` (7 bytes); inputs `temperatureC` (-40 to 85, default 22), `pressurePa` (30,000 to 110,000, default 101,325), `humidityPct` (0 to 100, default 45), quantised to 0.01 degC, 1 Pa, 0.01 %RH; optional `thermalTauS` default 0. The component file is the schema example with `protocols[0].status: "modelled"`, `params.onboard_pullup_ohms: 10000` marked assumed in a `parameters` note (UNKNOWN real value; common breakouts differ), the `behaviour` layer ref `device:i2c/bme280@1`, `simulation.status` updated, the three `physical_inputs` (temperature, pressure, humidity) with `world_channel` `environment.temperature`, `environment.pressure`, `environment.humidity`. Calibration source: temperature and pressure words use the compensation example values of the Bosch datasheet if the datasheet shows them (HYPOTHESIS: `dig_T1 27504, dig_T2 26435, dig_T3 -1000, dig_P1 36477, dig_P2 -10685, dig_P3 3024, dig_P4 2855, dig_P5 140, dig_P6 -7, dig_P7 15500, dig_P8 -14600, dig_P9 6000`, recalled from the BMP280 datasheet, not checked here; the agent confirms against the published page and cites it, or marks the set `synthetic`); the humidity words `dig_H1..H6` are a self-consistent synthetic set unless a published dump is found. The registry row records which (`parameterSources`). |
| **Input and output** | Bus: register reads and writes as in the descriptor. Library: C++ methods returning `float` (`readTemperature` in degC, `readHumidity` in %RH, `readPressure` in Pa) or `NaN` when the raw word is the skipped value `0x80000` or `0x8000`. |
| **API contract** | n/a. |
| **Algorithm** | Device: `bme280.measure` runs when an input changes or a conversion completes: `invertCompensation` bisects `adc_T` over `[0, 2^20 - 1]` on the monotone integer temperature formula to minimise `abs(T100(adc) - t100)` (at most 20 iterations, integer arithmetic only), keeps the resulting `t_fine`, then bisects `adc_H` over `[0, 65535]` and `adc_P` over `[0, 2^20 - 1]` with that `t_fine`. Conversion time: `1.25 + 2.3 * Ts + (2.3 * Tp + 0.575) + (2.3 * Th + 0.575)` ms (112.8 ms at x16 for all three, datasheet maximum, EXTERNAL); in normal mode a new sample after the standby time. Reads during a conversion return the previous sample and `STATUS` bit 3 is set. A write to `CTRL_HUM` takes effect at the next write to `CTRL_MEAS` (datasheet). A burst read of `0xF7..0xFE` is evaluated once at the first byte (T-B9-03). Library: `begin(addr)`: read `0xD0` (not `0x60` returns false), write `0xE0 = 0xB6`, wait 10 ms, poll `0xF3` bit 0 until clear, read 26 bytes at `0x88` and 7 bytes at `0xE1`, write the sampling registers with the library defaults (normal mode, x16 for T, P, H, filter off), wait 100 ms. Exact write order and values are taken from the published Adafruit library source when the model is written (EXTERNAL; BSD-licensed; read for the byte trace only, the model is written fresh from the datasheet) and recorded in `lib-bme280.test.ts`. `readTemperature`: burst-read `0xFA..0xFC`, `compensateT`, return `t100 / 100`; humidity and pressure follow with the stored `t_fine`; `readPressure` returns Pa (`P / 256`); `readAltitude(seaLevelHpa)` is `44330 * (1 - dmath.pow(P_hPa / seaLevelHpa, 0.1903))` using `dmath.pow` so serial text is class B. A missing device or NACK gives `begin` false and reads NaN. |
| **State transitions** | Device: `sleep` (mode 0), `forced`, `normal` (mode bits 1:0 of `CTRL_MEAS`); `measuring` flag during conversion; soft reset restores register resets. |
| **Validation rules** | Inputs outside the declared range are clamped and shown as "outside the range this model was checked over" (RC-55 wording, never the banned word); `thermalTauS` at most 3,600. |
| **Error conditions** | NACK on the address phase: `Wire.endTransmission()` returns 2 and `begin` returns false. SPI mode (`CSB` low), forced-mode detail beyond the formula, IIR filter, self-heating, sleep current: not modelled; each returns the named diagnostic, never a silent value. A sketch calling `bme.setSampling(...)` gets `library-method-not-modelled` at that line. |
| **Edge cases** | A BMP280 look-alike (chip ID 0x58) is not modelled (descriptor `known_gaps` already lists it). Address 0x77 with `begin(0x76)`: false. Two sensors with different `SDO`. Reading before `begin`. Input change during a conversion applies to the next one. |
| **Permissions** | n/a. |
| **Performance** | Inversion under 1 ms per input change (20 iterations times three words); 1,000-input SA-24 loop under 2 s. |
| **Migration** | The `Adafruit_BME280.h` angle include, which T-B8-02 reports as `library-not-modelled-yet`, now resolves. The example project's `known_gaps.device_missing` entry is obsolete; the component file in `src/parts/data` drops it. |
| **Unit tests** | `bme280.test.ts`: datasheet compensation example (the value the datasheet prints for its example words, read and cited by the agent); `invertCompensation` round trip for 1,000 seeded inputs (SA-24 tolerances); monotonicity sweep of the three formulas over the full ADC range; burst consistency; reset values `0x80000`/`0x8000`; `STATUS` bit 3 during conversion; `CTRL_HUM` applies only after `CTRL_MEAS`. `lib-bme280.test.ts`: `begin(0x76)` true on the healthy fixture, false with `SDO` high, false with `CSB` low, false with `VCC` at 1.0 V, false with no device; the `begin` byte trace equals the expected list; `readAltitude`; `setSampling` raises the named diagnostic; the 1,000 seeded values through the C++ methods. |
| **Integration tests** | The BRIEF 30 project (`env-monitor.project.json` fixture from T-B9-02): healthy, serial prints the scripted temperature after 2,000 ms of virtual time (30.00) and after 4,000 ms (18.00); with `flt_swap` enabled, `begin` fails and the sketch prints its failure line. The compiled variant (avr8js) is not part of this task. |
| **Playwright** | `e2e/bme280-hash.spec.ts`: runs the inversion for 1,000 seeded inputs (the pure functions in `bme280.ts`, transpiled with `typescript` as in T-B9-20) in Chromium and WebKit (Firefox if installed) and compares an FNV-1a hash of the raw words to the Node value. |
| **Fixtures** | Calibration set and datasheet example values in `src/sim/devices/data/bme280.device.json` with a `source` row each. |
| **Acceptance criteria** | Given the healthy BRIEF 30 project (`env-monitor.project.json`), When the sketch scans I2C after `Wire.begin(21, 22)`, Then the scan lists 0x76. Given the same project with `flt_swap` (SDA and SCL swapped) enabled, Then the scan lists nothing, `begin(0x76)` returns false and the evidence contains `swapped-pins`. Given the healthy project and a script that sets `temp` to 30 at 2,000 ms, When the sketch reads `readTemperature()` at 2,500 ms, Then it prints 30.00 and the I2C byte trace of `begin` matches the stored list. Given `SDO` wired to supply while the sketch calls `begin(0x76)`, Then `begin` returns false and the evidence contains an I2C NACK. |
| **Observability** | `BusEvent`s; device `events` for `part-not-powered` when `VCC` is below 1.71 V. |
| **Release blockers** | A calibration number with no `parameterSources` row; any formula typed from memory instead of the datasheet page (if the datasheet cannot be fetched, the task stops and reports UNKNOWN rather than guessing); the word "validated" in any string. |
| **Definition of done** | Four new files and one edit; SA-24 passes; byte trace stored; descriptor passes `npm run schema:check` (T-B4-10) if the script exists. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/devices src/lib/interp`; `npx tsc -p tsconfig.portable.json`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/bme280-hash.spec.ts`; `npm run schema:check` if present. |
| **Documentation** | None here. |
| **Rollback** | `git revert`; the include reverts to "not modelled yet". |
| **Later tasks need** | T-B9-21 (datasheet fixtures), T-B9-30 (registry rows), T-B9-29 (SA-23 and SA-24), B12 (labs using environment sensors). |

### T-B9-13 Compile module on the server: job runner, caps, off by default

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-13. Subsystem: server compile module, `server/src/compile`. Phase B9, group G4. Priority P1. Depends on: T-B6-01, T-B6-07, T-B6-17 (`app.ts`), T-B9-37 (the `compile` bucket). **Blocked until Amar answers section 10 item 1 (arduino-cli licence reading, RS-17).** Status: not started. |
| **Problem** | A sketch needs a hex for Firmware mode. Hex import always works; a compile service is the convenience on a self-hosted server (ADR-0013 A1). Off by default (RC-28). |
| **Target user** | Amar and friends on a server one of them runs. |
| **User story** | As the operator, I want compile to be off unless I turn it on, and when on, to cap what a hostile source can do. |
| **Expected behaviour** | With `IYNK_COMPILE_ENABLE=0` (default) both compile routes answer `501 feature_disabled` and the probe says `features.compile: false`. With `1` and a reachable compile service, `POST /v1/compile/jobs` accepts a request, runs it in the compile container, caches by input hash, and `GET` returns the job; the hex is served by a job-owner-only artifact route. |
| **Success metric** | Route-class test (BA-11) passes; the 501 body equals the openapi `FeatureDisabled` response; a request over 262,144 bytes of source or over 32 files gets 413 before any container call; the cache returns the same job for the same input; with the service unreachable the route gives 503. |
| **Existing files** | `server/src/config.ts` (T-B6-01; E: `IYNK_COMPILE_ENABLE` default `0`, `IYNK_COMPILE_URL` default `http://compile:8788`), `server/src/http/server-info.ts` (E: `features.compile = config.compile.enabled && reachable`; T-B6-17 hard-codes it to `false`), `server/src/app.ts` (E: `allRoutes(ctx)` is the single registration point (T-B6-17), so the three compile routes are mounted by adding `compileRoutes(ctx)` to that list; `router.ts` only dispatches the list and is not edited), `server/src/http/classes.ts` and `limits.ts` (read only: T-B9-37 added the `compile` bucket, 10 per minute per identity, API 4.3; T-B6-07's `BucketName` union had no such member), `04_ARCHITECTURE/schemas/openapi.yaml:2354-2440, 4527-4640` (read: request and job shapes). |
| **New files** | `server/src/compile/runner.ts` (also holds the caps and `checkRequest`; the former `limits.ts` is folded in so the task stays at 5 files), `server/src/compile/routes.ts`. Edited: `server/src/config.ts`, `server/src/http/server-info.ts`, `server/src/app.ts`. That is 5 source files. Tests `server/test/compile-routes.test.ts`, `server/test/compile-limits.test.ts` (B6 convention: `.test.ts`, `node:test`, typechecked by `server/tsconfig.json`). |
| **Modules and signatures** | `runner.ts`, caps part: `export const COMPILE_LIMITS = { sourceBytesTotal: 262144, files: 32, filesPerRequestSchema: 20, outputBytes: 1048576, wallMs: 30000, memoryBytes: 1073741824, cpus: 1, ttlMs: 900000 } as const; export function checkRequest(r: unknown): { ok: true; value: CompileRequest } \| { ok: false; status: 400 \| 413; code: string; message: string }`. `runner.ts`, runner part: `export interface CompileClient { run(job: { fqbn: string; files: { path: string; text: string }[]; libraries: LibraryRef[]; debug: boolean }, signal: AbortSignal): Promise<{ ok: boolean; hex?: string; elf?: Uint8Array; diagnostics: Diag[]; size: Size; tool: { name: string; version: string }; ms: number }> } export function createRunner(o: { client: CompileClient; now(): number; limits: typeof COMPILE_LIMITS }): { submit(device: DeviceId, req: CompileRequest, idempotencyKey?: string): CompileJob; get(device: DeviceId, id: string): CompileJob \| null; artifact(device: DeviceId, id: string): { bytes: Uint8Array; mediaType: string } \| null; sweep(): void }`. `routes.ts`: `export function compileRoutes(ctx: RouteDeps): RouteDef[]` (built with `defineRoutes`, T-B6-07) for `POST /v1/compile/jobs` and `GET /v1/compile/jobs/:jobId` plus `GET /v1/compile/jobs/:jobId/artifact`. |
| **Data model** | In-memory only (ADR-0011, roadmap "a `compile_jobs` table is NOT kept"): `Map<jobId, { owner: DeviceId, job: CompileJob, result?: ..., expiresAt }>` with a 15-minute TTL (`ttlMs`, PROPOSAL; "short TTL" has no number in the docs) swept by the `expire` timer. Job fields follow openapi `CompileJob`: `id` (`cmp_` prefix per openapi; API_CONTRACTS 88 says `job`, so the prefix is one constant in `runner.ts`), `status` (`queued`, `running`, `succeeded`, `failed`, `timed_out`), `createdAt`, `finishedAt`, `cacheHit`, `inputSha256`, `artifact { sha256, bytes, mediaType }`, `messages[]` (at most 200, text at most 500 characters). |
| **Input and output** | `CompileRequest { board, files[], libraries[] }` (openapi; `debug` is missing there, see section 12 item 3; this task accepts an optional `debug` boolean and answers 400 only for unknown keys other than `debug`). Output as above. |
| **API contract** | `POST /v1/compile/jobs`: bearer, header `Idempotency-Key`, 202 `CompileJob`, errors 400 `invalid_request`, 401, 413 `payload_too_large`, 426, 429, 501 `feature_disabled`, 503 `unavailable`. `GET /v1/compile/jobs/{jobId}`: owner only, 200 `CompileJob`, 404 (same for missing and not yours), 501. `GET /v1/compile/jobs/{jobId}/artifact` (PROPOSAL, not in openapi): owner only, 200 hex text `text/plain; charset=us-ascii` or ELF bytes with `?kind=elf`, `Cache-Control: private, no-store`, 404 otherwise. Route class `device` (bearer) for all three; bucket `compile` (T-B9-37) for the POST and `read` for the two GETs. |
| **Algorithm** | Validate (`checkRequest`): at most 20 files and total 262,144 bytes of text and 32 files is the larger bound, so the stricter 20-file schema cap applies on the wire and 32 is the container cap (RC-59 and openapi both kept); paths relative POSIX, no `..`, NFC, extension in `.ino .h .hpp .c .cpp`; library list only names from the vendored allow-list (the container's library directory; names not in it give 400 `library_not_allowed`). Compute `inputSha256 = sha256(canonical(files sorted by path + fqbn + libraries + toolchain version + debug))`; a live job with the same hash for the same device returns that job with `cacheHit: true`; the toolchain version is read once from the container's `/version` call. One concurrent job per device (a second POST while one runs returns the running job). The runner calls the container client with a 30 s `AbortSignal`; the container enforces memory, CPU and output (T-B9-14); on abort the job becomes `timed_out`. Output over 1 MiB: `failed` with a message. |
| **State transitions** | `queued` to `running` to `succeeded` or `failed` or `timed_out`; `expired` (removed) after TTL. |
| **Validation rules** | As above; board must map to an `fqbn` in a fixed table (`arduino:avr:uno`, `arduino:avr:nano`); anything else is 400 `board_not_supported` (only AVR runs on avr8js). |
| **Error conditions** | 400, 413, 429, 501, 503 as listed; compiler errors are `status: failed` with `messages`, not HTTP errors. |
| **Edge cases** | Server restart loses jobs (documented: a job lives 15 minutes in memory); duplicate `Idempotency-Key`; the container down mid-job; a source with `#include "/etc/passwd"` is a compile failure inside a container that has nothing to read (BA-18 covers the hostile cases in T-B9-14). |
| **Permissions** | Bearer token of an enrolled device; job visible only to its owner device; the compile route class limits 10 per minute per identity. |
| **Performance** | Compile time is the container's (RS-03: 0.33 to 1.40 s on a laptop). The route adds under 5 ms. |
| **Migration** | No database change. New config variables are documented in `docs/SELF_HOSTING.md` by T-B9-28. |
| **Unit tests** | `compile-limits.test.ts`: each cap's boundary (262,144 and 262,145 bytes, 20 and 21 files, bad path, bad extension, unknown library, unknown board). `compile-routes.test.ts` with a fake `CompileClient`: 501 when off; 202 then 200 `succeeded`; cache hit; idempotency; owner isolation (second device gets 404); timeout; TTL sweep; artifact route; BA-11 route-class check. |
| **Integration tests** | `SRV` (`npm run server:test`) full suite stays green including the 501 probe test of T-B6-17. |
| **Playwright** | n/a. |
| **Fixtures** | Fake client returning a 200-byte hex. |
| **Acceptance criteria** | Given `IYNK_COMPILE_ENABLE` unset, When I POST a job, Then I get 501 `feature_disabled` and the probe says `compile: false`. Given it set and a fake client, When I POST the same request twice, Then the second response has `cacheHit: true`. |
| **Observability** | Metrics counters `iynk_compile_jobs_total{status}` and a histogram of `ms` on the `/metrics` listener (T-B6-06 pattern); log lines carry job id and status, never source text (log redaction, BA-09). |
| **Release blockers** | Section 10 item 1 unanswered; any code path that spawns `arduino-cli` inside the server process (ADR-0013 A2 is rejected). |
| **Definition of done** | Five server files (two new, three edited) and tests; `SRVT` and `SRV` green. |
| **Verify commands** | `npm run typecheck && npm run lint` (root; `server/` has its own `tsconfig.json` and the root one excludes it, so this pair does not typecheck `server/src`; the root `eslint .` does lint it, as `eslint.config.mjs:8-27` ignores no `server` path, VERIFIED); `npm run server:typecheck` (`SRVT`, B6 T-B6-01); `npm run server:test` (`SRV`) or, for the two files, `cd server && node --test test/compile-routes.test.ts test/compile-limits.test.ts`. |
| **Documentation** | `docs/COMPILE.md` by T-B9-28. |
| **Rollback** | `git revert`; the routes disappear and `features.compile` is false. |
| **Later tasks need** | T-B9-14 (the real container behind `CompileClient`), T-B9-15 (client). |

### T-B9-22 Analog device gates: ngspice and datasheet fixtures (G-T2 junctions and BJT; R-117 analog)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-22. Subsystem: software oracle and hardware-oracle fixtures, `src/sim/analog`. Phase B9, group G4. Priority P0. Depends on: T-B9-16, T-B9-34, T-B9-17 (the generator script). Status: not started. |
| **Problem** | RS-08 found 10 of 20 realistic circuits missed 2 percent because the solver's device models were fixed rules. Newton devices need a gate with cited parameters (G-T2 junctions, G-T2 BJT), and R-117 wants at least 10 fixture-backed tests per engine area. |
| **Target user** | The maintainer. |
| **User story** | As the maintainer, I want the LED, diode and transistor models checked against ngspice and datasheet tables with their sources in the file, so a model change cannot drift unseen. |
| **Expected behaviour** | Two fixture sets and their tests. Set 1 (ngspice): for each entry in `params.ts` and the RS-08 realistic circuits, the same `.model` parameters are run in ngspice, the results stored, and the Newton solution compared. Set 2 (datasheet): at least 10 tests load a datasheet table (diode `Vf` at several `If`, BJT `Vce(sat)` and `hFE` rows) with title, page and revision. |
| **Success metric** | G-T2 junctions: forward current within 2 percent of ngspice from 0.3 mA to the rating. G-T2 BJT: `Ic` within 5 percent, `Vce(sat)` within 20 mV or 5 percent, `Vbe` within 30 mV. The datasheet set is reported as a table of deviations, not asserted tighter than the parameters allow. |
| **Existing files** | `scripts/gen-ngspice-fixtures.mjs` (T-B9-17; E: add `--set junctions` and `--set bjt`), `08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/spice.mjs:46-58` (read: model cards), `src/sim/analog/devices/params.ts` (T-B9-34). |
| **New files** | None in source besides the script edit. Data and tests: `src/sim/analog/fixtures/ngspice/junctions.json`, `bjt.json`; `src/sim/analog/fixtures/datasheet/*.json`; tests `src/sim/analog/gates.test.ts`, `datasheet.test.ts`. |
| **Modules and signatures** | Script: `node scripts/gen-ngspice-fixtures.mjs --set junctions\|bjt --out <file>`. Test helper (inside the test files): `loadFixture(path): Fixture` that fails if `source` or `revision` is absent. |
| **Data model** | Fixture record: `{ id, source: { kind: 'ngspice' \| 'datasheet', title, page?, revision, url? }, params, points: { inputs, expected }[] }`. Datasheet records carry the printed table values and the part's printed test conditions. |
| **Input and output** | In: fixtures. Out: pass or a failure naming part, point, solver value, expected value, relative error. |
| **API contract** | n/a. |
| **Algorithm** | Junction set: LED/diode forward current at 12 supply-and-resistor points that produce 0.3, 1, 3, 10, 20 mA and the rating for a red LED and the 1N4007 card; BJT set: common-emitter switch with `Rb` giving `Ib = Ic/10` for a 2N2222-class card at `Ic` of 1, 10, 100 mA, plus an active-region point at `Vce` 5 V. Datasheet set: for each cited part with a table in its datasheet, load at least 10 points across parts (diode forward voltage at 1, 10, 100 mA; BJT `Vce(sat)` at the datasheet's two `Ic/Ib` rows; `hFE` points). Where a part's parameters are `assumed`, its datasheet test is recorded as informative (deviation printed, no assertion) because the card was never fitted to that table (this is the finding RS-08 already made; the table makes it visible). |
| **State transitions** | n/a. |
| **Validation rules** | Every record has `source.title` and `source.revision`; the test fails otherwise. At least 10 datasheet points in total (R-117). |
| **Error conditions** | Generator cannot reach the engine: stops and prints the install steps. |
| **Edge cases** | Currents below 1 uA where relative error is meaningless: absolute error floor 1e-9 A; saturation `Vce(sat)` uses the "20 mV or 5 percent" rule. |
| **Permissions** | n/a. |
| **Performance** | Under 2 s for the file. |
| **Migration** | None. |
| **Unit tests** | `gates.test.ts` (ngspice sets) and `datasheet.test.ts` (informative and asserted rows). |
| **Integration tests** | Same. |
| **Playwright** | n/a. |
| **Fixtures** | The JSON files above, each with `source` and `revision`. The datasheet tables are read from manufacturer PDFs (EXTERNAL); the agent writes the title, page and revision it read, and any number it cannot read stays out. Amar spot-checks the cited pages (section 10 item 8). |
| **Acceptance criteria** | Given the committed fixtures, When the gates run, Then junction current is within 2 percent and BJT `Ic`, `Vce(sat)`, `Vbe` are within their bounds for every `cited` part, and `assumed` parts are listed as informative. |
| **Observability** | A deviation table printed by the test, copied into `docs/gates/B9-results.md` by T-B9-29. |
| **Release blockers** | A threshold changed to pass (Amar's decision); a datasheet number typed without page and revision. |
| **Definition of done** | Fixtures, tests and the script edit committed; deviation table in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/analog/gates.test.ts src/sim/analog/datasheet.test.ts`; `node scripts/gen-ngspice-fixtures.mjs --set junctions --check` (optional; it regenerates through `eecircuit-engine` from `node_modules`, installed by T-B9-07, with no further download; skip and record NOT RUN if the package is absent). The vitest files are the required proof. |
| **Documentation** | Script header lists the sets. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-30 (registry `validation` and `errorMetrics` rows are filled from these deviations), T-B9-29 (G-T2 record). |

### T-B9-33 Debug panel, gutter and host method

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-33. Subsystem: Studio debug UI and host method, `src/components/studio`, `src/sim-host`, `src/studio/run`. Phase B9, group G4. Priority P1. Depends on: T-B9-11, T-B9-35, T-B9-36 (the sim-side `debug` request and `paused` event), T-B4-12, T-B8-14 (pause state), T-B9-26 (`session.ts` edited earlier). Status: not started. |
| **Problem** | The engines can pause (T-B9-11, T-B9-27) but nothing shows it: no gutter, no step buttons, no message that freezes time and tells the other engines to hold (R-106). |
| **Target user** | A maker debugging a sketch. |
| **User story** | As a maker, I want to click the gutter, press Run, see the line highlighted and the clock stopped, and step with the keyboard. |
| **Expected behaviour** | Breakpoint markers in the code dock gutter (click or keyboard toggle), a debug panel with Continue, Step, Over, Out, a "paused at file:line" live-region announcement, and a `SimHost.debug(op)` method that sends the `debug` request of T-B9-36 and surfaces its `paused` event; the whole simulation holds at one `SimTime` through the pause state of T-B8-14. |
| **Success metric** | Keyboard path: toggle a breakpoint with F9 on the current line, Run, see the paused line announced (`aria-live="polite"`), press F10 (over), F11 (step), Shift+F11 (out), F5 (continue); an axe scan of the panel has zero serious or critical issues; time shown on the run bar stops while paused. |
| **Existing files** | `src/components/studio/CodeDock.tsx` (T-B4-12; E: gutter marker extension and current-line decoration; CodeMirror 6 is used, `package.json` lists `@codemirror/*`), `src/sim-host/host.ts` (T-B3-13, T-B8-14, which gave it `pause()`, `resume()`, `step(unit, n)` and `status`; E: add `debug(op)` and `onPause`), `src/sim-host/protocol.ts` (T-B9-36; read only), `src/studio/run/session.ts` (E: relay and state), `src/components/boardlab/CodeEditor.tsx` (read: the CodeMirror setup T-B4-12 reuses). |
| **New files** | `src/components/studio/DebugPanel.tsx`. Tests `DebugPanel.test.tsx`, `host-debug.test.ts`; `e2e/debug.spec.ts`. |
| **Modules and signatures** | Messages are T-B9-36's and follow SIM 17.2: request `{ v: 1; id; t: 'debug'; run; op: DebugOp }` with `DebugOp` from SIM A.4 (`set-breakpoints`, `continue`, `pause`, `step`), answered by `SimEv` `{ t: 'state'; state: 'paused'; at }` and `{ t: 'event'; event: { kind: 'paused'; reason: 'breakpoint' \| 'step' \| 'watch'; file; line; atNs; bound? } }`. This task adds to `host.ts`: `debug(op: DebugOp): Promise<void>` and `onPause(cb: (e: PausedEvent) => void): () => void` with `PausedEvent = { runtime: string; reason: 'breakpoint' \| 'step' \| 'watch'; file: string; line: number; atNs: number; bound?: { file: string; line: number }[] }`. `DebugPanel.tsx`: `DebugPanel(props: { state: 'running' \| 'paused' \| 'stopped'; at: { file: string; line: number } \| null; onStep(u: 'line' \| 'over' \| 'out'): void; onResume(): void; strings: ... })`. Gutter: a CodeMirror `gutter()` with a `GutterMarker` and a state field for breakpoints; the ui store (T-B4-01) holds `breakpoints: Record<string, number[]>` per project, not saved in the document. |
| **Data model** | Breakpoints live in the ui store, keyed by file path, not in the project document (no schema change, so collaborators do not see each other's breakpoints; PROPOSAL, because the project schema has no field for them). |
| **Input and output** | UI actions to messages; `debug.paused` to highlighted line and announcement. |
| **API contract** | n/a: in-process worker messages. Protocol version constant (`src/protocol/version.ts`, T-B3-01) is NOT bumped: T-B9-36's messages are additive; a worker that does not know them ignores them. |
| **Algorithm** | The sim-side handler (T-B9-36) stops its pump when an engine reports a pause and posts `state: paused` at the engine's `atNs`, so no other engine runs past that `SimTime` (R-106). There is no `holdAt`: the plan has no such name (searched SIM, ADRs and every roadmap file); the pause state is the one T-B8-14's `pause()` produces, and `host.status.state` becomes `paused` from the `state` event. Continue and the step buttons call `debug({ op: 'continue' })` and `debug({ op: 'step', unit })`, not `host.resume()`, so the engine and the pump restart together. Editing the sketch while paused restarts the run (T-B4-13 behaviour) and re-sends breakpoints. The announced text uses `fidelity.debug.pausedAt` with file and line. A breakpoint that cannot bind (no code on the line) is shown hollow with a tooltip from `bound`. |
| **State transitions** | `stopped` to `running` (Run) to `paused` to `running` (resume or step) to `stopped`. |
| **Validation rules** | At most 256 markers per file; line numbers inside the document. |
| **Error conditions** | `no-elf` from the avr8js debugger: panel shows `fidelity.debug.noSymbols`. Unsupported breakpoint inside an ISR (interpreter): `fidelity.debug.inlineOnly` note. |
| **Edge cases** | Multiple runtimes (two boards): breakpoints and pause are per runtime, but time freezes for all. Room: only the runner (baton holder) can step; other members see "paused at" read-only (B7 permission). Touch devices: markers toggle by tap on the gutter. |
| **Permissions** | In a room, `debug` requests are accepted only from the member who controls the run (T-B8-17 run channel rule). |
| **Performance** | Message round trip under one animation frame on desktop (ESTIMATED). |
| **Migration** | None. |
| **Unit tests** | `DebugPanel.test.tsx`: renders the three states; buttons disabled while running; live region content; focus order (Continue first). `host-debug.test.ts` (inline port): `host.debug({ op: 'set-breakpoints', ... })` sends one `t: 'debug'` request; a `paused` event reaches `onPause` and `host.status.state` is `paused`; `continue` clears it. The two-engine hold is tested in T-B9-36. |
| **Integration tests** | Session test with the interpreter engine and the blink sketch: set a breakpoint on line 8, run, receive `debug.paused` with line 8, resume, receive another after 1 simulated second. |
| **Playwright** | `e2e/debug.spec.ts` (Chromium): open a starter Uno project, press F9 on a line, Run, expect the highlighted line and the announcement text, expect the run-bar time not to change over 500 ms of wall time (real wait is only to show it stays; the assertion compares two reads of the virtual-time label, not a timing), press F10, F5; run axe on the panel. |
| **Fixtures** | Starter project from T-B4-16. |
| **Acceptance criteria** | Given a breakpoint on the `digitalWrite(LED_PIN, HIGH)` line, When I run, Then the line is highlighted, "Paused at sketch.ino line 8" is announced, the time label is frozen and the LED has not changed. Given I press Continue, Then it stops again at the next loop. |
| **Observability** | None beyond the UI; no telemetry. |
| **Release blockers** | Any keyboard action reachable only with a mouse; a pause that leaves another engine running. |
| **Definition of done** | One new component and three edits plus tests; the e2e spec passes in Chromium. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/sim-host src/studio`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/debug.spec.ts`. |
| **Documentation** | `docs/FIDELITY.md` debugging section by T-B9-28. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-12 (variables and watch in the panel), T-B9-29 (SA-15 UI part). |

### T-B9-32 Inspect view with DigitalJS (could)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-32. Subsystem: Inspect mode view, `src/sim-host/engines`, `src/components/studio`. Phase B9, group G4. Priority P3 (F-050 "only if time"). Depends on: T-B9-09 (and T-B9-07, whose `package.json` pins `digitaljs`, `yosys2digitaljs` and `esbuild`). Status: not started. |
| **Problem** | R-110 says Yosys elaborates and DigitalJS draws the netlist. RS-12 only exercised DigitalJS headless; "visualise is untested" (`REPORT.md:123`). |
| **Target user** | A maker looking at the gates a Verilog module makes. |
| **User story** | As a maker, I want to see my Verilog as a circuit of gates and registers after I press Inspect. |
| **Expected behaviour** | After a successful elaboration the result panel shows a DigitalJS drawing of the netlist (pan and zoom), with a text list as the accessible twin. It is a view only, never labelled a simulation tier. |
| **Success metric** | The 10 shipped Verilog lessons render without error in Chromium; the drawing is not started automatically; the text twin lists every cell type with counts. |
| **Existing files** | `src/sim-host/engines/inspect.ts`, `InspectGate.tsx` (T-B9-09; read), `scripts/build-engines.mjs` (T-B9-07, T-B9-09; E: add `digitaljs` 0.14.2 BSD-2 and `yosys2digitaljs` 0.10.3 BSD-2 as engine files, bundled with the pinned `esbuild`; all three packages are already in `node_modules`, so this task edits no `package.json` and downloads nothing), RS-12 `src/page-entry.js` and `iynk-entry.ts` (read: the bundling approach). |
| **New files** | `src/sim-host/engines/digitaljs.ts`, `src/components/studio/InspectGraph.tsx`. Tests `InspectGraph.test.tsx`, `e2e/inspect-graph.spec.ts`. |
| **Modules and signatures** | `digitaljs.ts`: `export function toDigitalJs(netlistJson: string): { ok: true; circuit: unknown } \| { ok: false; error: string }` (runs `yosys2digitaljs` in the inspect worker's result; the conversion takes 0.1 to 1.8 ms per RS-12); `InspectGraph(props: { result: InspectResult & { ok: true } })`. |
| **Data model** | None. |
| **Input and output** | In: `InspectResult.netlistJson`. Out: DOM drawing and a `<table>` of cells. |
| **API contract** | n/a. |
| **Algorithm** | Lazy `import()` of the DigitalJS bundle after the result exists and a second explicit click ("Draw circuit", reusing the gate's click rule); DigitalJS renders into a div it owns; the init-value problem RS-12 found (the blink design only matches after hand-patched initial values, bits never driven show `x`) is shown as a visible note "x means never driven", not hidden. |
| **State transitions** | `result` to `drawing` (click) to `drawn`. |
| **Validation rules** | Circuit size cap: more than 5,000 cells shows the text twin only (PROPOSAL; DigitalJS performance was not measured for large designs, UNKNOWN). |
| **Error conditions** | Conversion failure: text twin plus the error. |
| **Edge cases** | SystemVerilog constructs Yosys elaborates but DigitalJS cannot draw. Dark theme. Phone width: drawing scrolls inside its container; text twin is primary. |
| **Permissions** | n/a. |
| **Performance** | Draw under 1 s for the shipped lessons on desktop (ESTIMATED). |
| **Migration** | None. |
| **Unit tests** | `InspectGraph.test.tsx` with a stub circuit: draw button is required; table lists cells. |
| **Integration tests** | Needs the built engine files; under `CI=true` fails if missing. |
| **Playwright** | `e2e/inspect-graph.spec.ts`: after a trusted click on Inspect and Draw (deviceMemory forced to 8), the SVG exists for a lesson design and the table has rows. |
| **Fixtures** | One lesson design from `src/content`. |
| **Acceptance criteria** | Given a shipped lesson design and 8 GB device memory, When I click Inspect then Draw, Then I see a circuit and a table; nothing draws before the second click. |
| **Observability** | Draw ms shown in the panel. |
| **Release blockers** | Auto-loading DigitalJS; a missing licence row for `digitaljs` and `yosys2digitaljs` in the manifest (both BSD-2-Clause per npm metadata, EXTERNAL; `reviewed: false` until Amar reviews). |
| **Definition of done** | Two new files and the script edit; tests pass. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio`; `node scripts/build-engines.mjs --only yosys,digitaljs` (offline, copies and bundles from `node_modules`); `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/inspect-graph.spec.ts` (`npm run build` runs `prebuild`, which runs `engines:build`; with `E2E_SKIP_BUILD=1` run the `--only` step first). |
| **Documentation** | Licences in the manifest. |
| **Rollback** | `git revert`. |
| **Later tasks need** | none. |

### T-B9-12 Variable inspection and watch for globals

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-12. Subsystem: debugger variables, `src/sim/debug`, `src/lib/interp`, `src/components/studio`. Phase B9, group G5. Priority P1. Depends on: T-B9-11, T-B9-27, T-B9-33. Status: not started. |
| **Problem** | A pause without values is half a debugger. R-106 asks for locals and globals with types. The interpreter keeps variables in numbered slots (`interp.ts:329-347`: `VarSym { global, slot, t }`, globals in `rt.G[slot]`, locals in `f.v[slot]`) with no name table kept for the debugger. avr8js keeps raw SRAM. |
| **Target user** | A maker who wants to see what `count` is when the program stopped. |
| **User story** | As a maker, when the program is paused, I want to see my global variables with their types and add a watch that pauses when one changes. |
| **Expected behaviour** | `inspect(frame)` returns globals (both engines) and locals (interpreter, and avr8js only in `-Og` builds when simple, otherwise "locals not available"). A watch list in the debug panel shows values at each pause and can pause on change. |
| **Success metric** | SA-15 clause "global variables match known values": in the 5 sketches, after a stated number of loop iterations, named globals equal the values in `expected.json` on both engines. |
| **Existing files** | `src/lib/interp/arduino/interp.ts:329-347` (E: record `rt.varTable`), `:37-45` (`VarSym`), `src/sim/debug/avr8js-debug.ts` (T-B9-27; E: `inspect` from the ELF symbol table), `src/export/elf.ts` (symbols `{ name, addr, size, section }`), `src/components/studio/DebugPanel.tsx` (T-B9-33; E: variables and watch sections). |
| **New files** | `src/sim/debug/watch.ts`. Tests `watch.test.ts`, additions to `interp-debug.test.ts` and `sa15.test.ts`. |
| **Modules and signatures** | `watch.ts`: `export type WatchTarget = { kind: 'global'; name: string } \| { kind: 'mem'; addr: number; len: number }; export interface WatchValue { target: WatchTarget; type: string; text: string; raw?: string; changed: boolean; unavailable?: string } export class WatchList { add(t: WatchTarget, pauseOnChange?: boolean): number; remove(id: number): void; evaluate(dbg: DebugPort): WatchValue[]; changedSincePause(): number[] }`. `interp.ts`: `rt.varTable: { name: string; type: string; global: boolean; slot: number; scopeStartLine: number; scopeEndLine: number }[]` filled where `VarSym` is created. `avr8js-debug.ts`: `inspect(frame)` reads `engine` SRAM at `symbol.addr` for `symbol.size` bytes for each ELF symbol in `.data` or `.bss`; type text comes from the interpreter's declaration table for the same sketch when it parses (the sketch's global names and types), and otherwise "N bytes". |
| **Data model** | None stored. Watch expressions live in the ui store like breakpoints. |
| **Input and output** | In: frame index (0 only in this task: call stack walking is not built), watch targets. Out: `FrameInfo` and `WatchValue[]`. |
| **API contract** | n/a. |
| **Algorithm** | Interpreter: value text by type (`int`, `unsigned`, `float`, `char`, `bool`, arrays up to 16 elements then "... n more", `String` up to 64 characters), formatted with the same `fmtValue` the Serial path uses (`libs.ts:92`). avr8js: little-endian read of `size` bytes; 1, 2 and 4-byte integers shown signed and hex; 4-byte symbols shown as `float` only if the interpreter says `float`. Watch on change: interpreter compares the global's value after each statement via the same statement hook (cost only while a watch exists); avr8js uses `cpu.writeHooks[addr]` for the symbol's address range (SIM 8.7) and sets `breakBitmap` irrelevant; the pause reason is `watch`. Types from DWARF `.debug_info` are NOT parsed (SIM 8.7 says "C base types from DWARF"; this plan takes types from the interpreter's parse instead, because a `.debug_info` reader is a much larger parser to fuzz; PROPOSAL, recorded in section 11). |
| **State transitions** | Watches: `added` to `armed`; `triggered` pauses the engine as for a breakpoint. |
| **Validation rules** | At most 32 watches; `mem` length 1 to 64; address inside SRAM (0x100 to 0x8FF on the Uno). |
| **Error conditions** | Unknown name: `unavailable: 'no such global'`. Optimised-out local: "locals not available in this build" (`fidelity.debug.noSymbols`). |
| **Edge cases** | A global the compiler placed in registers or removed; arrays of structs; a local shadowing a global; `const` globals folded away by the compiler (no symbol): reported unavailable on avr8js and shown on the interpreter. |
| **Permissions** | n/a. |
| **Performance** | Inspection only while paused; the per-statement watch compare costs nothing when the list is empty. |
| **Migration** | None. |
| **Unit tests** | `watch.test.ts`: add, remove, change detection, limits. Additions to `interp-debug.test.ts`: global and local names, types and values at a pause; `sa15.test.ts`: the expected global values on both engines. |
| **Integration tests** | The debug e2e spec (T-B9-33) gains one assertion that the variables section lists `count`. |
| **Playwright** | Extend `e2e/debug.spec.ts` (test file only). |
| **Fixtures** | `src/sim/debug/sketches/expected.json` gets a `globals` block (name, value after n iterations). |
| **Acceptance criteria** | Given the serial-counter sketch paused after 5 loop iterations, When I open Variables, Then `count` shows 5 with type `int` on the interpreter and on avr8js. Given a watch on `count` with pause-on-change, When I resume, Then the engine pauses on the statement that increments it. |
| **Observability** | None. |
| **Release blockers** | A value shown that differs between engines in the SA-15 set. |
| **Definition of done** | One new file and three edits; tests green. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/debug src/lib/interp src/components/studio`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/debug.spec.ts`. |
| **Documentation** | `docs/FIDELITY.md` by T-B9-28. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-29 (SA-15 record). |

### T-B9-14 Compile container: fourth compose service, no network, read-only root (BA-18)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-14. Subsystem: deploy and server tests, `deploy`, `server/test`. Phase B9, group G5. Priority P1. Depends on: T-B9-13, T-B6-12 (`deploy/compose.yaml`). **Blocked until Amar answers section 10 item 1.** Status: not started. The routes it calls were mounted by T-B9-13 in `server/src/app.ts`. |
| **Problem** | A compiler reads files named by the source. Without a boundary a source could read the server's data directory (ADR-0013). |
| **Target user** | The operator. |
| **User story** | As the operator, I want the compiler in a box with no network, nothing mounted, a read-only root and hard caps, so a hostile sketch can do no harm. |
| **Expected behaviour** | A compose service `compile` built on the operator's machine, reachable only from `server` over an `internal: true` network, running a small HTTP service that compiles one job at a time and returns hex, ELF, messages and sizes. The tool chain is downloaded during the image build on the operator's machine and is never published. |
| **Success metric** | BA-18: a source with an infinite include loop, a 2 GB output and a fork bomb are each killed or refused within 30 s with the host unaffected (memory, disk, process count measured before and after). |
| **Existing files** | `deploy/compose.yaml` (T-B6-12; E: add the `compile` service and network), `docs/MASTER_PLAN/04_ARCHITECTURE/ADR/ADR-0013-compile-service-deployment-shape.md` (read: A1 requirements), `server/src/compile/runner.ts` (T-B9-13: the client calls `IYNK_COMPILE_URL`). |
| **New files** | `deploy/Dockerfile.compile`, `deploy/compile/service.mjs`, `deploy/compile/libraries.txt`. Test `server/test/compile-caps.test.ts`. |
| **Modules and signatures** | `service.mjs` (Node 24, no dependencies): `POST /job` with JSON `{ fqbn, files:[{path,text}], libraries:[{name,version}], debug }` returns `{ ok, hex?, elfBase64?, diagnostics:[{file,line,column,severity,message}], size:{flashBytes,flashMax,ramBytes,ramMax}, tool:{name,version}, ms }`; `GET /version` returns `{ tool:'arduino-cli', version, core:'arduino:avr@1.8.8' }`; `GET /health`. `libraries.txt`: one `Name@version` per line (the allow-list); first entries are the libraries bundled with the AVR core (`Wire`, `SPI`, `Servo`, `EEPROM`, `SoftwareSerial`) and then `Adafruit BME280 Library`, `Adafruit Unified Sensor`, `Adafruit BusIO` at exact versions the agent reads from the Arduino library index when writing the file (UNKNOWN until read). `Dockerfile.compile`: `ARG ARDUINO_CLI_VERSION=1.5.1`, `ARG ARDUINO_CLI_SHA256=<read from the release page when written>`, downloads the archive in a build stage, checks sha256, installs `arduino:avr@1.8.8` and the allow-listed libraries into `/opt`, copies only that tree and `service.mjs` into the final stage, runs as user 10001. |
| **Data model** | None. In-container state: `/tmp` (tmpfs, 64 MiB) with one directory per job, removed after the job. |
| **Input and output** | As `service.mjs` above. |
| **API contract** | Internal HTTP between `server` and `compile`, same compose network only. No public route, no published port. |
| **Algorithm** | Service: one job at a time (a second `POST` while one runs gets 429); write files under `/tmp/<job>/sketch/` with names checked (no `..`, no absolute paths); run `arduino-cli compile --fqbn <fqbn> --libraries /opt/libs --build-path /tmp/<job>/build --build-cache-path /tmp/cache --output-dir /tmp/<job>/out [--build-property "compiler.cpp.extra_flags=-g -Og" --build-property "compiler.c.extra_flags=-g -Og" when debug]` as a child in its own process group with a 30 s timer that kills the group; stdout and stderr captured to a 1 MiB cap; hex and ELF read after the run; result cap 1 MiB for the hex; the cache key is the server's (the service only keeps arduino-cli's own build cache in tmpfs). Compose (ADR-0013 A1): `read_only: true`, `tmpfs: ["/tmp:size=64m"]`, no `volumes`, `cap_drop: [ALL]`, `security_opt: ["no-new-privileges:true"]`, `pids_limit: 128`, `mem_limit: 1g`, `cpus: 1`, `networks: [compile-net]` with `compile-net: { internal: true }` and `server` joined to it, `restart: unless-stopped`, `profiles: ["compile"]` so the default `docker compose up` does not start it. |
| **State transitions** | Container: `stopped` (profile not enabled), `running`, `busy` (job), `killed` (cap hit) then restarted by Docker. |
| **Validation rules** | The service re-checks the same limits as T-B9-13 (it does not trust the server): 262,144 bytes total, 32 files, extensions, library names from `libraries.txt`. |
| **Error conditions** | Compiler errors return `ok:false` with diagnostics. Timeout returns `{ ok:false, diagnostics:[{message:'compile timed out after 30 s'}] }` and the group is killed. |
| **Edge cases** | `#include </etc/passwd>` and `#include "../../x"` fail inside a container with nothing to read; a source naming a library not on the list fails with the compiler's own "No such file" message; the tmpfs fills up (the 2 GB case) and the job fails with a disk message instead of taking the host disk. |
| **Permissions** | The service listens only on `compile-net`. It holds no secrets and no project data. |
| **Performance** | RS-03 laptop numbers: 0.33 to 0.56 s warm, 1.17 to 1.40 s cold. The caps test records click-to-hex for blink cold and warm inside the container (INFORMATION only; the formal local timing task is B20, per SIM 8.5 and BACKEND 12). |
| **Migration** | `docs/SELF_HOSTING.md` (T-B9-28) tells the operator to run `docker compose --profile compile build compile` once and to set `IYNK_COMPILE_ENABLE=1` and `IYNK_COMPILE_URL`. |
| **Unit tests** | `compile-caps.test.ts` (Node test runner, shells out to Docker; skipped with a loud message when Docker is absent, and under `CI=true` it fails if Docker is absent): (1) include loop: a source whose header includes itself, the job returns `ok:false` within 30 s; (2) 2 GB output: inline assembly `.fill 2000000000,1,0`, job fails within 30 s, `docker stats` memory stays at or under 1 GiB and host free disk space changes by under 100 MiB; (3) fork bomb: `docker compose run --rm --entrypoint sh compile -c ':(){ :\|:& };:'` under a 30 s timeout, the container is killed or refused new processes (`pids_limit`), and the host process count afterwards equals the count before plus or minus 5; (4) network: `wget`/`node -e fetch` from inside to an external address fails; (5) read-only root: writing `/opt/x` fails; (6) mounts: `docker inspect` shows no volume and no bind mount. |
| **Integration tests** | With the compose profile up: the T-B9-13 routes against the real service for blink (hex returned, size parsed). |
| **Playwright** | n/a. |
| **Fixtures** | Four hostile sources and blink inside the test file. |
| **Acceptance criteria** | Given the three BA-18 sources, When each is submitted, Then each ends within 30 s as failed or killed and the host measurements are unchanged within the stated bounds. Given blink, Then a valid Intel HEX comes back. |
| **Observability** | Container logs go to Docker's log driver without source text; the service writes job id, status, ms. |
| **Release blockers** | Any volume or bind mount; any published port; a pulled image that bundles the tool (the image is built locally only; the repo contains no arduino-cli binary); BA-18 not green (if Docker cannot run here, this is recorded as For Amar and the task reports "built, not run"). |
| **Definition of done** | Three new files, compose edit, test file; BA-18 green or recorded as For Amar with the exact command. |
| **Verify commands** | Required, offline: `npm run typecheck && npm run lint`; `npm run server:typecheck` (`SRVT`); `docker compose -f deploy/compose.yaml config`. Optional; skip and record NOT RUN if offline or Docker is absent: `docker compose -f deploy/compose.yaml --profile compile build compile` (about 330 MB of downloads into Docker's image store) and `cd server && node --test test/compile-caps.test.ts` (shells out to Docker; BA-18). Ports 3000 and 43117 are not used. |
| **Documentation** | `docs/COMPILE.md` (T-B9-28). |
| **Rollback** | `git revert`; the profile disappears. `docker compose down` and `docker image rm` are the operator's cleanup. |
| **Later tasks need** | T-B9-15 (client works end to end), T-B9-29 (BA-18 record). |

### T-B9-15 Client `CompileService`, build status, hex-import fallback

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-15. Subsystem: server client and Studio build UI, `src/server-client`, `src/components/studio`. Phase B9, group G5. Priority P1. Depends on: T-B9-13, T-B9-26 (`imageOps`), T-B9-35, T-B6-05, T-B6-11 (probe). Status: not started. |
| **Problem** | The compile route exists but the app cannot call it, show progress, or fall back when the server has it off. |
| **Target user** | A maker on a friend's server with compile turned on, or off. |
| **User story** | As a maker, I want a Build button that gives me a hex and the compiler's real messages, and when compile is off I want to be told so and offered hex import. |
| **Expected behaviour** | `CompileService` (SIM 8.5 interface) over the server routes; a status component with five states; on success the hex and ELF become the Firmware mode image; when the probe says `compile: false` the button is replaced by the import control. |
| **Success metric** | With a fake server: Build to hex in the project in one action; every message line appears with file and line; off and not-set-up states show different text; abort cancels polling. |
| **Existing files** | `src/server-client/client.ts`, `probe.ts` (T-B6-05, T-B6-11; read: authenticated fetch, `features`), `src/components/studio/RunBar.tsx` (T-B9-26; E: mount `CompileStatus`), `src/components/studio/FirmwareMode.tsx` (read: `imageOps`). |
| **New files** | `src/server-client/compile.ts`, `src/components/studio/CompileStatus.tsx`. Tests `compile.test.ts`, `CompileStatus.test.tsx`; `e2e/compile.spec.ts`. |
| **Modules and signatures** | `compile.ts`: `export interface CompileService { compile(r: CompileRequest, signal: AbortSignal): Promise<CompileResult> } export function createServerCompileService(c: ServerClient): CompileService; export function compileAvailable(probe: ServerProbe): 'yes' \| 'off' \| 'no-server'`. `CompileRequest` and `CompileResult` are the SIM 8.5 types (`fqbn`, `files`, `libraries`, `debug` in; `ok`, `hex`, `elf`, `sourceMap`, `diagnostics`, `size`, `tool`, `ms`, `cacheHit` out). The service maps them to openapi `CompileRequest` (`board` from the table `uno-r3 -> arduino:avr:uno`, `nano -> arduino:avr:nano`) and back; it calls `parseLines` on the fetched ELF to build `sourceMap`. `CompileStatus(props: { sources: SourceView[]; board: string; onImage(ops: ProjectOp[]): void; service: CompileService \| null; availability: 'yes' \| 'off' \| 'no-server' })`. |
| **Data model** | None stored; the hex becomes a `binary` asset through T-B9-26's `imageOps`. |
| **Input and output** | Sources in; a hex and messages out. |
| **API contract** | Calls `POST /v1/compile/jobs` with `Idempotency-Key` and polls `GET /v1/compile/jobs/{id}` no faster than once a second and by `Retry-After`; fetches `GET .../artifact` for the hex (and `?kind=elf` when `debug`). |
| **Algorithm** | Build: send all `sources[]` of the board (entry first, at most 20), poll until `succeeded`, `failed` or `timed_out`; abort via `AbortSignal` stops polling (the job continues server side and expires). Debug builds are requested when a breakpoint exists or the user chooses "Build for debugging". Messages map `severity`, `file`, `line`, `column`, `text` to editor markers (T-B4-12 diagnostics API). Size line uses `fidelity.compile.size`. |
| **State transitions** | `idle` to `building` to `ok` or `failed` or `timeout`; `off` and `no-server` are static states. |
| **Validation rules** | Client-side check of the same caps before sending (20 files, 262,144 bytes). |
| **Error conditions** | 501: state `off` with `fidelity.compile.off`; 503: "compile is turned on but not reachable" (`compile.failed` with detail); 413: `compile.tooLarge`; 429: wait and show the retry time. |
| **Edge cases** | Token expired mid-build (refresh then retry once); the user edits the sketch while building (result is attached to the hash it was built from; a mismatch shows "sketch changed since this build"); two Studio tabs. |
| **Permissions** | Needs enrolment (a bearer token); a visitor without a server sees `no-server` and the import control only. |
| **Performance** | Poll interval 1 s; no polling when the tab is hidden. |
| **Migration** | None. |
| **Unit tests** | `compile.test.ts` with a fake client: happy path, cache hit, failure messages, timeout, abort, 501, 503, 413, retry-after. `CompileStatus.test.tsx`: five states, keyboard (Build is a button, status in a live region), translated strings. |
| **Integration tests** | With the fake route handlers of T-B9-13's tests exposed through a tiny local server started by the e2e. |
| **Playwright** | `e2e/compile.spec.ts`: Studio with a stubbed server (`page.route`) returning a canned hex: Build, status shows size and time, Firmware mode is selected with the image; and with `features.compile=false`: the import control shows with `fidelity.compile.importInstead`. |
| **Fixtures** | Canned hex from T-B9-08 fixtures. |
| **Acceptance criteria** | Given a server with compile on, When I press Build on the blink sketch, Then I see "built in N ms, flash X of 32768 bytes" and Firmware mode holds the image. Given compile off, Then no Build button shows and the message names the operator switch. |
| **Observability** | Shows `ms` and `cacheHit` to the user; no telemetry. |
| **Release blockers** | Compile source sent anywhere but the user's own server; a build button shown when `compile` is false. |
| **Definition of done** | Two new files and one edit with tests; e2e passes in Chromium. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/server-client src/components/studio`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/compile.spec.ts`. |
| **Documentation** | `docs/COMPILE.md` (T-B9-28). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-28 (docs), T-B9-29. |

### T-B9-21 Datasheet fixtures: buses, devices and MCU timing (R-117)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-21. Subsystem: hardware-oracle fixtures, `src/sim`. Phase B9, group G5. Priority P2. Depends on: T-B9-04, T-B9-25, T-B9-10. Status: not started. |
| **Problem** | Zero tests load a datasheet table or a trace (TEST_COVERAGE finding 3). R-117 wants at least 10 per engine area, each with source and revision in the fixture. |
| **Target user** | The maintainer. |
| **User story** | As the maintainer, I want the bus, device and MCU models checked against numbers read from datasheets, with the page and revision in the file, so the tests stop checking themselves. |
| **Expected behaviour** | A fixture loader that refuses a file without source and revision, and at least 10 fixture-backed tests in each of three areas: buses and devices, MCU timing (the avr8js engine and interpreter cost), and sensors. |
| **Success metric** | At least 30 fixture-backed assertions in total, 10 or more per area, all passing; the loader fails a deliberately broken fixture. |
| **Existing files** | `src/sim/bus/*`, `src/sim/devices/*`, `src/sim/mcu/avr8js.ts` (read), `src/sim/env/sensors.ts` (read). The 15 hand-typed datasheet facts the audit counted live in board and drone tests (`esp32-devkitc.test.ts:36`, `pico.test.ts:84`, `nucleo-f401re.test.ts:122`, `esp32-s3-devkitc-1.test.ts:100`, `nodemcu.test.ts:133`, `quad5.test.ts:229`, `delivery.test.ts:45`, `cinewhoop.test.ts:27`; `TEST_COVERAGE.md:200-211`, `TECHNICAL_DEBT.md:320`). They are NOT moved here: those areas belong to B12, B13 and B18, which move them into fixtures when their content moves. |
| **New files** | `src/sim/fixtures.ts`. Data: `src/sim/bus/fixtures/*.json`, `src/sim/devices/fixtures/*.json`, `src/sim/mcu/fixtures/datasheet/*.json`. Tests `src/sim/fixtures.test.ts`, `src/sim/bus/datasheet.test.ts`, `src/sim/devices/datasheet.test.ts`, `src/sim/mcu/datasheet.test.ts`. |
| **Modules and signatures** | `fixtures.ts`: `export interface FixtureSource { kind: 'datasheet' \| 'bench' \| 'trace'; title: string; revision: string; section?: string; page?: string; url?: string } export interface Fixture<C> { id: string; area: string; source: FixtureSource; cases: C[] } export function loadFixture<C>(json: unknown): Fixture<C>` (throws a named error if `source.title` or `source.revision` is empty or `cases` is empty). |
| **Data model** | Fixture files as above. |
| **Input and output** | n/a. |
| **API contract** | n/a. |
| **Algorithm** | Cases (each a row of a table the source prints, which the agent reads and cites; where a document cannot be read the case is left out and the shortfall is reported, never filled from memory): Bus and device area: BME280 conversion-time table (oversampling combinations and the datasheet maximum), BME280 compensation example, BME280 address select, I2C timing limits table (UM10204 standard, fast, fast-plus rise times and bus capacitance), MPU-6050 accelerometer sensitivity per range (16384, 8192, 4096, 2048 LSB per g), MPU-6050 WHO_AM_I and sleep reset (the values the existing test already uses, now with a source), SSD1306 or PCA9685 register reset values where the existing model states them. MCU timing area (ATmega328P datasheet formulas, checked by running avr8js with small programs): fast PWM frequency `f / (N * 256)` for Timer0 at prescaler 64 (976.5625 Hz), phase-correct `f / (N * 510)`, USART `UBRR` and the resulting baud error at 16 MHz for 9600 and 115200 (with and without `U2X0`), ADC conversion 13 ADC clock cycles at the prescaled clock, TWI bit rate formula `F_CPU / (16 + 2 * TWBR * 4^prescaler)`, `millis()` tick, Timer1 16-bit overflow period. Sensor area: thermistor Beta equation points from the formula's printed datasheet constants, HC-SR04 58.3 microseconds per cm and 38 ms timeout (datasheet), LDR-style transfer points only if a datasheet table is read. |
| **State transitions** | n/a. |
| **Validation rules** | `loadFixture` rules above; a test lists all fixtures and asserts counts per area. |
| **Error conditions** | Bad fixture: named error. |
| **Edge cases** | A source whose table is a figure only (not numbers): left out and counted as a gap. Revision strings differ between document front page and footer: use the front page and say so. |
| **Permissions** | n/a. |
| **Performance** | Under 3 s for the files (several small avr8js runs). |
| **Migration** | None. |
| **Unit tests** | The four test files above. |
| **Integration tests** | Same. |
| **Playwright** | n/a. |
| **Fixtures** | The JSON files. Amar spot-checks the cited pages (section 10 item 8). |
| **Acceptance criteria** | Given the fixtures, When tests run, Then at least 10 assertions per area pass, each fixture names title and revision, and removing `revision` from one fixture makes `fixtures.test.ts` fail. |
| **Observability** | The test prints a table: area, fixtures, assertions, gaps. |
| **Release blockers** | A number typed without a read source; fewer than 10 per area without a recorded gap reason. |
| **Definition of done** | Loader, fixtures, tests committed; gap list in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim`. |
| **Documentation** | None here. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-30 (registry `validation[]` rows cite these fixtures), T-B9-29. |

### T-B9-30 Registry complete: every part has an entry

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-30. Subsystem: fidelity registry, `src/sim/registry`. Phase B9, group G5. Priority P1. Depends on: T-B9-04, T-B9-05, T-B9-34, T-B9-22, T-B9-20, T-B8-03. Status: not started. |
| **Problem** | ADR-0310 puts fidelity in a registry as data. B8 made the registry and first entries; the new engines, buses, devices and models of B9 need rows, and every part in the library needs one so the Models panel never shows a blank. |
| **Target user** | Anyone reading what a part models. |
| **User story** | As a maker, I want every part to say what it models, what it fakes and what it does not model, with its tier. |
| **Expected behaviour** | Registry entries for: `engine:avr@1.0.0`, `engine:mna-newton`, transient backend (per verdict), `bus:i2c@1`, `bus:spi@1`, `bus:uart@1`, `device:*` for each data device, `library:Adafruit_BME280@1`, `sensor:*` models, `board-power:esp32-devkitc@1`, `runtime:dmath@1`, and a row for each part in `src/parts/data` (a part with no model gets tier T0 "Illustration" with `not modelled yet`). Asserted tier never above the computed tier. |
| **Success metric** | A test enumerates `src/parts/data/*.component.json` and every `behaviour.layers[].model` builtin ref and fails when a part or ref has no entry; SA-17 (tier rule) stays green; no entry contains the word "validated". |
| **Existing files** | `src/sim/registry/entries.ts`, `tiers.ts` (T-B8-03; E: merge sources), `src/sim/registry/data/*.json` (E: add rows), `src/sim/devices/data/*.device.json` (read), `src/sim/analog/devices/params.ts` (read), `src/sim/registry/data/board-power.json` (read). |
| **New files** | None besides new rows in the data set. Test `src/sim/registry/complete.test.ts`. |
| **Modules and signatures** | `entries.ts` gains `export function allEntries(): FidelityEntry[]` that merges the registry data files with entries derived from device descriptors (`registry` field), parameter sets (`CitedParams`) and board power, so those files stay the single source (one source of truth). `FidelityEntry` is the SIM 16.2 type (`id`, `version`, `kind`, `title`, `tier`, `layers`, `implements`, `mocked`, `unsupported`, `parameterSources`, `validation`, `errorMetrics`, `operatingRange`, `knownFailureCases`, `performance`, `labels`, `status`; RC-55 names `operatingRange`, `evidenceRange`). |
| **Data model** | Entry rows with `validation[]` pointing at fixtures from T-B9-21 and T-B9-22 and `errorMetrics` filled from their printed deviations (numbers copied from the test output, not guessed). Tiers: T0 illustration, T1 teaching model, T2 calculated model, T3 runs your firmware (RC-60). |
| **Input and output** | n/a. |
| **API contract** | n/a. |
| **Algorithm** | Completeness test: for each part, find its entry by id or by its builtin refs; compute the part's tier as the lowest tier among layers; assert `asserted <= computed`. For `dmath`, `licence` row records the fdlibm origin. For the transient backend, the `knownFailureCases` list the circuits and errors in `TRANSIENT.md`. |
| **State transitions** | `status`: `active` for built items, `planned` for none (planned rows are not added here). |
| **Validation rules** | The registry validator of T-B8-03; plus: every `parameterSources` row has `basis` in `datasheet`, `measured`, `assumed`, `spec`; `assumed` rows show the word "assumed" in `labels.summary`. |
| **Error conditions** | A part without an entry fails the test and names the file. |
| **Edge cases** | A part with several layers of different tiers (a board: MCU T1 or T3, regulator T1, pin model T1); the BME280 module (device T1, library T1); a part added in B2 whose descriptor has a `simulation.tier` the registry disagrees with (the test prints both and fails). |
| **Permissions** | n/a. |
| **Performance** | Test under 1 s. |
| **Migration** | None. |
| **Unit tests** | `complete.test.ts` as above. |
| **Integration tests** | The Models panel test (T-B8-04) renders the new rows without error. |
| **Playwright** | n/a. |
| **Fixtures** | None. |
| **Acceptance criteria** | Given the library, When the completeness test runs, Then every part and builtin ref resolves to an entry and no asserted tier exceeds its computed tier. |
| **Observability** | The test prints counts per tier. |
| **Release blockers** | A tier raised to make a test pass (Amar's decision); a datasheet number in a row with no source. |
| **Definition of done** | Rows and test committed. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/sim/registry src/components/studio`. |
| **Documentation** | `docs/FIDELITY.md` (T-B9-28). |
| **Rollback** | `git revert`. |
| **Later tasks need** | B10 (fault models reference entries), B11 (custom parts), T-B9-29. |

### T-B9-31 Interpreter cost table, serial timing and ADC rule (SA-14 part 2)

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-31. Subsystem: interpreter timing, `src/lib/interp`, `src/sim/mcu`. Phase B9, group G5. Priority P1. Depends on: T-B9-10 (harness and probe), T-B9-23, T-B9-02, T-B9-24 (ADC rule). Status: not started. |
| **Problem** | The interpreter charges a flat `opUs` per statement (`exec.ts:47-54`; Uno 1 us, `profiles.ts:108`). The council's probe (`n++; digitalWrite(13,HIGH); digitalWrite(13,LOW);` for 1 s) gives 200,000 iterations in the interpreter against an ESTIMATED 90,000 to 110,000 on hardware (SIM 8.3). Serial output is delivered instantly (`libs.ts:686-691`). The interpreter's ADC count is `round(V / 5 * 1023)` against avr8js `floor(V / Vref * 1024)` (RS-03 caveat). |
| **Target user** | A maker timing a loop or reading a pot. |
| **User story** | As a maker, I want my sketch's timing to be close to a real Uno, so a loop that runs 100,000 times a second on hardware does not run 200,000 times in the simulator. |
| **Expected behaviour** | A small table of per-call costs for the calls whose real cost differs strongly from a statement (`digitalWrite`, `digitalRead`, `analogRead`, `pinMode`, `analogWrite`, `Serial` per byte), measured with avr8js, applied on top of the flat statement cost. Serial bytes leave at `10 / baud` with a 64-byte buffer on AVR so `Serial.print` can block. The AVR ADC rule matches avr8js. |
| **Success metric** | SA-14: the probe loop's iteration count is within 15 percent of avr8js on the same sketch compiled with the pinned toolchain; ADC counts are equal to avr8js for 0, 0.1, 2.5, 4.99, 5 V at Vref 5 V; all 102 lesson references still pass; the 50-sketch differential still passes. |
| **Existing files** | `src/lib/interp/exec.ts:47-54` (`tick`; E: add `chargeUs(us: number)` that does what `tick` does for the clock without the statement count), `src/lib/interp/arduino/libs.ts:235` (`digitalWrite`), `:247-263` (`analogRead`), `:682-694` (`SerialClass`; E), `src/lib/interp/world.ts` (E: `print(s, byteUs?)` stamping, `analogRead` AVR rule), `src/sim/mcu/differential.ts` and `cost-probe.test.ts` (T-B9-10; read and extend the test). |
| **New files** | `src/sim/mcu/cost-table.ts`. Tests `cost-table.test.ts`; the `cost-probe.test.ts` assertion added. |
| **Modules and signatures** | `cost-table.ts`: `export interface CostEntry { call: string; us: number; source: string } export const AVR_COST_TABLE: CostEntry[]; export function costUs(call: string, profileId: string): number`. `exec.ts`: `chargeUs(us: number): boolean` returns the same "yield to host" flag as `tick`. `libs.ts`: `digitalWrite` etc. call `rt.chargeUs(costUs('digitalWrite', rt.world.profile.id))`; `Serial.print` computes `byteUs = 1e7 / baud` (10 bits) and keeps `txFreeAt`; when 64 bytes are pending it advances time (`rt.advance`) until a byte has left. `world.ts`: `print(s: string, byteUs?: number)` stamps byte `i` at `now + i * byteUs` for the serial timeline when given. |
| **Data model** | None. |
| **Input and output** | Table values in microseconds as floats on the interpreter's microsecond clock. |
| **API contract** | n/a. |
| **Algorithm** | The numbers come from avr8js, not from forum figures: a script in `cost-table.test.ts` (and a regeneration command `npx vitest run src/sim/mcu/cost-table.test.ts -t regenerate` that prints the table) compiles one micro-benchmark per call with the pinned toolchain fixtures from T-B9-08's script, runs 10,000 iterations on avr8js and divides cycles by 16 per call; the committed table carries `source: 'avr8js 0.21.1, arduino:avr 1.8.8, 16 MHz'`. Boards other than Uno and Nano keep flat `opUs` (no oracle exists for them). Idle-skip (`exec.ts:93-99`) is unchanged and switched off when the program reads `micros()` (existing `fineClock`, `interp.ts:106-110`). ADC AVR rule: `min(1023, floor(V * 1024 / Vref))`; other boards keep their own formulas. |
| **State transitions** | n/a. |
| **Validation rules** | The table test fails if an entry has no `source` or a negative `us`. |
| **Error conditions** | None. |
| **Edge cases** | `delay()` and `delayMicroseconds()` keep their exact values (they are sleeps); `analogRead` charges the ADC conversion time (13 ADC cycles at 125 kHz = 104 us, datasheet formula, also checked by T-B9-21); `Serial.print` of a long string blocks only after the buffer fills; `Serial.flush()` waits for the buffer. |
| **Permissions** | n/a. |
| **Performance** | One table lookup per charged call; lesson reference runs within 2 percent of before. |
| **Migration** | Lessons that calibrate against `delay`-based timing are unaffected; any reference run that now fails is reported and its tolerance change goes to Amar (roadmap 2.5), not changed here. |
| **Unit tests** | `cost-table.test.ts`: provenance rules, regeneration reproduces the table within 1 percent. `cost-probe.test.ts` (extended): interpreter iterations within 15 percent of avr8js. ADC equality test for the five voltages. Serial: a 100-byte `Serial.println` at 9600 baud takes at least `(100 - 64) * 1.0417 ms` of virtual time to return. |
| **Integration tests** | `lessons.test.ts` (102 of 102) and `differential.test.ts` (50 inside sketches) stay green. |
| **Playwright** | n/a. |
| **Fixtures** | The micro-benchmark sketches (data folder of T-B9-10). |
| **Acceptance criteria** | Given the council's probe sketch, When both engines run it for 1 simulated second, Then the interpreter's iteration count is within 15 percent of avr8js's. |
| **Observability** | The probe prints both counts and the ratio. |
| **Release blockers** | Any reference lesson failing; a cost value not traceable to an avr8js measurement. |
| **Definition of done** | One new file, three edits, tests; ratio in the commit message. |
| **Verify commands** | `npm run typecheck && npm run lint`; `npx vitest run src/lib/interp src/sim/mcu`. |
| **Documentation** | `docs/FIDELITY.md` (T-B9-28). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B9-29 (SA-14 record). |

### T-B9-28 `docs/COMPILE.md` and fidelity documentation

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-28. Subsystem: documentation. Phase B9, group G6. Priority P1. Depends on: T-B9-13, T-B9-14, T-B9-15, T-B9-26, T-B9-19, T-B9-33. Status: not started. |
| **Problem** | The phase card requires `docs/COMPILE.md`: what is built, how to turn it on, licences of the toolchain. The new fidelity features need a user-facing page. |
| **Target user** | Amar, his friends, the operator, a contributor. |
| **User story** | As the operator, I want one page that tells me what compile does, what it costs, which licences apply and how to switch it on. |
| **Expected behaviour** | `docs/COMPILE.md` new; `docs/FIDELITY.md` (made in B8) extended; `docs/SELF_HOSTING.md` (made in B6) gets the compile section. |
| **Success metric** | A reader who has only the docs can import a hex (no server), turn on compile (`docker compose --profile compile build compile`, two env variables), and find the licence facts. Every number in the docs is labelled VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS or UNKNOWN. |
| **Existing files** | `docs/FIDELITY.md` (T-B8-07), `docs/SELF_HOSTING.md` (T-B6-14; E). |
| **New files** | `docs/COMPILE.md`. |
| **Modules and signatures** | n/a. |
| **Data model** | n/a. |
| **Input and output** | n/a. |
| **API contract** | The two routes plus the artifact route as built, with the 501 behaviour. |
| **Algorithm** | Content outline. `COMPILE.md`: (1) What is built: hex and ELF import always; Firmware mode; the optional compile service. (2) What is not built: browser avr-gcc, ESP32 compile, Pico. (3) Turn it on: variables `IYNK_COMPILE_ENABLE`, `IYNK_COMPILE_URL`; the compose profile; first build downloads arduino-cli 1.5.1 and the AVR core on your machine. (4) Limits (RC-59): 1 GiB, 1 CPU, 30 s, 1 MiB output, 256 KiB and 32 files of source; no network; read-only root. (5) Licences: arduino-cli GPL-3.0 (RS-03); AVR core LGPL; avr-gcc GPL; avr8js MIT; iynk does not bundle or publish any of them; what the licence allows on a server is RS-17 and is Amar's reading. (6) Timings: RS-03 laptop numbers, the container numbers from T-B9-14 (labelled), phone UNKNOWN. (7) Troubleshooting. `FIDELITY.md` additions: buses and timing, devices as data and the expression grammar, the BME280 and what it does not model, Firmware mode and its desktop-first speed (6.1 to 7.5 times real time on a desktop, about 1.7 times at 4x throttle, RS-03, UNKNOWN on phones), the debugger and its limits (no pause inside interrupt handlers on the interpreter), Newton devices and their gates, the transient verdict, `dmath`, the Inspect gate. |
| **State transitions** | n/a. |
| **Validation rules** | No em dashes; no "validated" in any shipped string; links checked by a grep for relative paths that do not exist. |
| **Error conditions** | n/a. |
| **Edge cases** | If compile was not built (Amar's answer was no) `COMPILE.md` says so and documents hex import only. |
| **Permissions** | n/a. |
| **Performance** | n/a. |
| **Migration** | n/a. |
| **Unit tests** | n/a. A check script step: `grep -c "validated" docs/COMPILE.md docs/FIDELITY.md` returns 0 outside the sentence that bans the word, and every `](path)` link target exists (`node` one-liner in the verify command). |
| **Integration tests** | n/a. |
| **Playwright** | n/a. |
| **Fixtures** | n/a. |
| **Acceptance criteria** | Given a clean checkout, When I follow `COMPILE.md`, Then I can build the compile image and compile blink, or I know compile is not built. |
| **Observability** | n/a. |
| **Release blockers** | A licence statement presented as legal advice; a number without a label. |
| **Definition of done** | Three docs edited or created. |
| **Verify commands** | `grep -n "validated" docs/COMPILE.md docs/FIDELITY.md`; `npm run lint` (docs are not linted; the command confirms nothing else changed). |
| **Documentation** | This is the documentation task. |
| **Rollback** | `git revert`. |
| **Later tasks need** | B20 (export and physical build links to it). |

### T-B9-29 Exit gate: run everything and record the numbers

| Field | Detail |
|---|---|
| **Identity** | Id T-B9-29. Subsystem: release gate, `docs/gates`. Phase B9, group G7. Priority P0. Depends on: every other B9 task. Status: not started. |
| **Problem** | The phase is done only when `npm run check` passes and SA-03, SA-05, SA-12, SA-14, SA-15, SA-21, SA-22, SA-24 are recorded, BA-18 green if compile was built. |
| **Target user** | Amar, at the stop. |
| **User story** | As Amar, I want one page that says what passed with numbers, what did not run and why, and what I need to do, so I can say yes or no to the phase. |
| **Expected behaviour** | `docs/gates/B9-results.md` with one row per gate: command, result, number, label, date. Nothing is rounded up. |
| **Success metric** | `npm run check` exit 0; three `LOAD` runs of `npx vitest run` green; the build succeeds; every gate row is filled or marked NOT RUN with the reason. |
| **Existing files** | All of the above; `docs/gates/` is new. |
| **New files** | `docs/gates/B9-results.md`. |
| **Modules and signatures** | n/a. |
| **Data model** | Table columns: Gate, Task, Command, Result, Number, Label, Notes. |
| **Input and output** | n/a. |
| **API contract** | n/a. |
| **Algorithm** | Run in this order and paste the real output lines: (1) `npm run check` (its `test` step runs `pretest` and its `e2e` step runs `npm run build` and so `prebuild`; both call `engines:build` from T-B9-07, so a clean tree builds `public/engines/` first; if the run uses `E2E_SKIP_BUILD=1`, run `node scripts/build-engines.mjs --if-present` before it; `npm run check` also runs `server:typecheck` and `server:test` after T-B6-01); (2) `LOAD` three times; (3) `BUILD`; (4) `SRVT` (`npm run server:typecheck`), `SRV` (`npm run server:test`) and `cd server/legacy && npm test` (39 tests); (5) gate commands: SA-03 `npx vitest run src/sim/analog/oracle.test.ts` plus `node scripts/gen-ngspice-fixtures.mjs --set linear --check` (optional; NOT RUN with the reason if the package is absent); SA-05 per `TRANSIENT.md` outcome; SA-09 `npx vitest run src/lib/interp/lessons.test.ts`; SA-12 `KL ... playwright test e2e/dmath.spec.ts` and `node scripts/dmath-bench.mjs` (recorded as: Chromium and WebKit pass; Firefox passes or NOT RUN with the reason, the same wording as T-B9-20); SA-14 `npx vitest run src/sim/mcu/differential.test.ts src/sim/mcu/cost-probe.test.ts` plus, optional when online, `bash scripts/build-hex-fixtures.sh --set corpus --check`; SA-15 `npx vitest run src/sim/debug`; SA-21 `playwright test e2e/inspect.spec.ts`; SA-22 `npx vitest run src/export/fuzz.test.ts`; SA-24 `npx vitest run src/sim/devices src/lib/interp/arduino`; SA-23 (BRIEF 30 walk) on the example project; BA-18 `cd server && node --test test/compile-caps.test.ts` (only if compile was built); FA-11; G-T2 deviation tables. (6) Greps: no `Math.random`, `Date.now`, `performance.now`, `eval` under `src/sim` (the lint rule proves it; the grep repeats it); no "validated" in `src/i18n/messages/*/fidelity.json` and docs. (7) `git status` clean, `git log --oneline` shows one commit per task authored as Amar Kushwaha with no `Co-Authored-By` line (`git log --format='%an %ae %b' build/v1 ^main`). (8) List "For Amar" items still open (section 10). |
| **State transitions** | n/a. |
| **Validation rules** | A gate that did not run is "NOT RUN" with the reason, never blank or green. |
| **Error conditions** | A failing gate stops the phase: the page says FAILED with the output; the orchestrator does not tag. |
| **Edge cases** | Firefox absent (SA-12 and SA-24 Firefox legs NOT RUN); Docker absent (BA-18 NOT RUN); the toolchain download blocked (hex fixtures cannot be rebuilt; committed ones are used). |
| **Permissions** | n/a. Ports 3000 and 43117 and `.env.local` are not touched. |
| **Performance** | n/a. |
| **Migration** | n/a. |
| **Unit tests** | n/a. |
| **Integration tests** | The commands above. |
| **Playwright** | The specs named above. |
| **Fixtures** | n/a. |
| **Acceptance criteria** | Given the finished phase, When the page is read, Then each of SA-03, SA-05, SA-12, SA-14, SA-15, SA-21, SA-22, SA-24 has a number and a label, and BA-18 is green or NOT RUN with the reason. |
| **Observability** | The page is the record. |
| **Release blockers** | Any FAILED row; `phase-B9` is tagged by the orchestrator only after Amar's OK. |
| **Definition of done** | The page committed on `build/v1`; the orchestrator stops and asks Amar. |
| **Verify commands** | The list in Algorithm. |
| **Documentation** | The page. |
| **Rollback** | `git revert`; or reset to `phase-B8`. |
| **Later tasks need** | B10 starts after Amar's OK. |

## 10. For Amar

These are not agent tasks. "Blocks" says what waits.

| # | Item | Why only Amar | Blocks |
|---|---|---|---|
| 1 | Read the arduino-cli licence (GPL-3.0, RS-03) for use on a server you run, and say whether the compile service may be built. The plan builds the tool into an image on the host's own machine and publishes nothing (ADR-0013). | A legal reading (RS-17, D-017) | T-B9-13, T-B9-14, T-B9-15 and the compile half of T-B9-28. Hex import and Firmware mode do not wait. |
| 2 | Run Firmware mode on a phone and a Chromebook and fill `docs/device-results.md` (Q-2). RS-03 measured about 1.7 times real time at 4 times throttle and 1.1 times at 6 times, below the 3 times line, on a main-thread proxy only. | Needs devices | Any claim that Firmware mode works on weak devices. Not a phase blocker (ADR-0305). |
| 3 | Say whether the committed compiled `.hex` and `.elf` fixtures (3 + 5 + 55 files) may live in the repo. They contain Arduino core code (LGPL-2.1, EXTERNAL) and avr-libc. The alternative is to build them at test time, which needs the toolchain on every machine. | A licence call (D-017) | Nothing blocks the build; it changes whether T-B9-08, T-B9-10 and T-B9-27 commit binaries. The plan assumes yes. |
| 4 | Review the engine and port licences and set `license.reviewed` to true in the manifests: avr8js (MIT), YoWASP Yosys (ISC), yosys2digitaljs and DigitalJS (BSD-2-Clause), ngspice WASM if outcome B (exact tag UNKNOWN), the fdlibm port in `dmath.ts` (notice kept). All are npm-metadata or recalled facts, EXTERNAL. | D-017 | A published build excludes engines with `reviewed: false`. |
| 5 | Time one compile on the machine that will host the server, and measure Firmware mode speed there. The container run in T-B9-14 is an agent number on the build machine only. | Needs the real host | None. |
| 6 | Proceed with the 100 us / 16 ms / 6x proposal for the SA-05 frame workload (a frame advances 100 us of simulated time and must cost under 16 ms at 6 times CPU throttle; R-105 does not define it). Amar may change it later; only `bench.mjs` re-runs and the SA-05 row is re-recorded. | A gate threshold is Amar's decision (roadmap 2.5), but the agents work to the proposal meanwhile | Nothing. T-B9-18 and T-B9-19 do not wait for an answer. |
| 7 | If the agent cannot install Firefox for Playwright (`npx playwright install firefox`, about 80 MB), run the Firefox legs of SA-12 and SA-24 himself or accept "NOT RUN". | Needs a download on his machine | SA-12 and SA-24 are recorded without Firefox until then. |
| 8 | Spot-check 10 cited datasheet pages and revisions in the fixtures of T-B9-21 and T-B9-22 against the PDFs. Agents read PDFs and may misread a table. | Judgement over documents | The R-117 fixtures stay labelled EXTERNAL until checked. |
| 9 | Read the German, Spanish, French, Hindi and Chinese `fidelity` strings for sense. | Native reading | None. |
| 10 | Optional bench check: one LED current and one transistor `Vce(sat)` with a multimeter, to turn `assumed` parameters into `measured` ones. The word "validated" stays banned (D-007). | Hardware and hands | None. |
| 11 | Make sure the Docker daemon runs on the build machine and allow the image build (about 330 MB of downloads, RS-03 measured 326 MB for the core). If not, run `cd server && node --test test/compile-caps.test.ts` himself. | Machine access | BA-18 shows NOT RUN until then. |

## 11. Where this plan departs from, or adds to, the design documents

The reconcile step decides these. Nothing here edits another document.

| # | Item | Documents in tension | What this plan did |
|---|---|---|---|
| 1 | The roadmap rows T-B9-01, -07, -10, -16, -20 each held more than 5 files of work | `IMPLEMENTATION_ROADMAP.md:664-683` | Split: 01 into 01 and 23; 07 into 07, 24, 25, 26; 10 into 10 and 31; 11 into 11, 27, 33; 16 into 16, 34 (and 22 for the gates); 20 into 20 and 30; added 21, 22, 28, 29, 32, 35. The roadmap table should list them. |
| 2 | T-B9-10 in the roadmap edits `src/lib/interp/run.ts` | roadmap row | Not needed; the harness is outside `run.ts`. |
| 3 | `scripts/build-engines.mjs` is described as existing in FRONTEND 8.3, but no earlier task writes it | `FRONTEND_ARCHITECTURE.md:530` against roadmap B3 | T-B9-07 writes it (first engine to need it). |
| 4 | The roadmap puts `avr8js.manifest.json` under `src/sim-host/engines/`; FRONTEND says `public/engines/manifest.json` is generated | roadmap, FRONTEND | Source entry in `src/sim-host/engines/*.manifest.json`, generated file in `public/engines/` (git-ignored). |
| 5 | Builtin `ref` pattern forbids a dot; SIM 9.2.1 uses `device:bme280.regs@1` | `component.schema.json:820-830`, SIM 9.2.1 | PROPOSAL 3. RECONCILIATION should add a row. |
| 6 | BME280 supply pin `VIN` (SIM) against `VCC` (example part and review note) | SIM 9.2.1, `bme280-module.component.json` | `VCC` (PROPOSAL 4). SIM text should follow. |
| 7 | SIM 8.7 says variable types come from DWARF | SIM 8.7 | Types come from the interpreter's parse of the same sketch; no `.debug_info` reader (T-B9-12). Smaller attack surface. |
| 8 | `DebugPort` lacks `resume`, `paused`, `onPause` | SIM A.4 | Added in T-B9-11. |
| 9 | Compile limits: RC-59 says 256 KiB and 32 files; openapi `CompileRequest` says 20 files of 262,144 characters; the data model allows 20 sources | RC-59, `openapi.yaml:4527`, PDM | Server enforces 20 files on the wire (stricter) and 262,144 bytes total; the container accepts up to 32 (T-B9-13). |
| 10 | `CompileRequest` has no `debug` field; SIM 8.5 needs `-g -Og` for the debugger | `openapi.yaml:4527`, SIM 8.5 | T-B9-13 accepts an optional `debug` boolean; openapi needs the field. |
| 11 | Job id prefix `cmp_` in openapi, `job` in API_CONTRACTS 88 | `openapi.yaml` `CompileJob`, `API_CONTRACTS.md:88` | One constant in `runner.ts`; openapi wins until reconciled. |
| 12 | openapi says the compile artifact is an asset fetched with `getAsset`, ADR-0011 and the roadmap say results live in memory with a short TTL, and `PUT /assets` is room-scoped (B7) | `openapi.yaml:2407`, ADR-0011, roadmap B9 card | Memory with a 15-minute TTL and a new owner-only route `GET /v1/compile/jobs/{jobId}/artifact` (T-B9-13). Needs an openapi row. |
| 13 | BACKEND 12 and the licence stance say the operator installs the tool and `IYNK_COMPILE_BIN` points at it; ADR-0013 A1 says a separate container | `BACKEND_ARCHITECTURE.md:570-600`, ADR-0013 | ADR-0013 wins: a container, `IYNK_COMPILE_URL`, tool downloaded at image build on the host. `IYNK_COMPILE_BIN` is not used. |
| 14 | SIM-0 lists the `opNs` migration; no B3 task does it | SIM 18, roadmap B3 | T-B9-31 adds cost classes on the existing microsecond clock and does not rename `opUs`. |
| 15 | SA-12 also covers Rapier hashes and flight raw state | SIM SA-12 | Only the `dmath` clauses are B9; Rapier is B16, flight B19. |
| 16 | SA-14 and F-182 say "50 public beginner sketches" | SIM SA-14, FC F-182 | 50 original sketches plus 5 outside the subset (PROPOSAL 7). |
| 17 | F-050 is "only if time" in the roadmap but R-110 is in the B9 scope list | roadmap line 641 and 636 | T-B9-09 at P2, T-B9-32 at P3. |
| 18 | The phase card says Yosys 0.70; RS-12 ran `@yowasp/yosys` 0.71.188-dev.1267, which reports Yosys 0.70+188 | RS-12 `REPORT.md:25` | The manifest pins the npm version. |
| 19 | Engine packages: nothing in the roadmap adds `@yowasp/yosys`, `digitaljs`, `yosys2digitaljs` or `eecircuit-engine` to `package.json`; RS-12 and RS-08 installed them in scratch folders | roadmap B9 card, RS-12 `REPORT.md:178`, RS-08 `REPORT.md:195` | T-B9-07 pins all of them (and `esbuild`) as devDependencies in its single `package.json` edit; later tasks copy from `node_modules`. T-B9-17 no longer says the engine is "never added to `package.json`". |
| 20 | `public/engines/` is git-ignored and `prebuild`/`pretest` run only `npm run content` | `package.json:13, 20`, `playwright.config.ts:14` | T-B9-07 adds `engines:build` to both hooks (`--if-present`, skipped on Vercel). |
| 21 | Debug messages: SIM 17.2 has `{ t: 'debug'; op: DebugOp }`; B3 omits it; the first draft of T-B9-33 invented `debug.set`, `debug.step`, `debug.resume` with a `type` key and an orchestrator `holdAt` | SIM 17.2 and A.4, B3 T-B3-13, B8 T-B8-14 | T-B9-36 adds the SIM 17.2 request and a `paused` event to `handler.ts` and `protocol.ts`; T-B9-33 uses `SimHost.debug(op)`. The engine-side logic is in `handler.ts` (T-B3-13), not `sim.worker.ts`, which is a shell. |
| 22 | Compile route mounting and quota: the first draft said routes go in `router.ts` and `classes.ts` had a `compile` class | B6 T-B6-07 and T-B6-17, API 4.3 | `app.ts` `allRoutes` registers routes; `BucketName` had no `compile`, so T-B9-37 adds it. API 4.3 lists `compile` at 10 per minute per identity. |
| 23 | Server tests are `server/test/*.test.ts`, not `.test.js` | B6 section 2 and 4.2 | T-B9-13 and T-B9-14 use `.test.ts` and name `SRVT` and `SRV`. |
| 24 | `I2cBus` has no `pullup` field | SIM 9.1 | `pullup?: 'assumed' \| 'none'` is an option of `createI2cBus` (T-B9-01); SIM A.4 or 9.1 may want a note. |
| 25 | `build-hex-fixtures.sh` is one generic script; each fixture folder carries its own `sketches.json` | roadmap B9 card, this plan's first draft | T-B9-08 owns the script and the table of set roots; T-B9-10 and T-B9-27 add data only. |

## 12. Open questions and unknowns

| # | Question | Label | Who or what settles it |
|---|---|---|---|
| 1 | Which B4 task wires `simulation.world.inputs[]` and `script[]` to run-bar sliders for Studio projects? T-B4-13 and T-B4-14 do not say. T-B9-06 provides the driver; the UI binding may be missing. | UNKNOWN | The agent for T-B9-06 reads T-B4-13's `session.ts`; if it is missing it reports, and a small task is added to B9 or B10. |
| 2 | Real pull-up values on common BME280 breakouts. The plan assumes 10 kOhm and labels it assumed. | UNKNOWN | Bench or a vendor schematic. |
| 3 | Calibration data for the BME280: whether the temperature and pressure words from the Bosch compensation example are in the datasheet, and whether a real humidity dump with a URL exists. | UNKNOWN (HYPOTHESIS for the values in T-B9-04) | T-B9-04 reads the datasheet and records which set it used. |
| 4 | ESP32 brown-out hysteresis, dwell and reset times. | UNKNOWN | ESP32 datasheet, cited in T-B9-05 when read; else `assumed`. |
| 5 | Whether the in-house trapezoidal stepper meets 1 percent and the frame budget; whether ngspice WASM batch output is identical across engines. | UNKNOWN | T-B9-18. |
| 6 | Firmware mode inside a room (lockstep, replay checkpoints): avr8js state serialisation is UNKNOWN (SIM 6.7); restore is by re-run. T-B8-15 and T-B8-18 do not cover avr8js. | UNKNOWN | Not built in B9. A room whose host uses Firmware mode should fall back to frame mode (T-B8-18 mismatch rule). A later task or Amar's decision. |
| 7 | UART between an MCU and a device: the model exists and a loopback is tested, but no first-release device uses UART; `SoftwareSerial` and `OneWire` report `library-not-modelled`. R-109 says "UART between two devices ... answers or fails with a named diagnostic"; the named-failure half is met, the answering half is not. | HYPOTHESIS that this meets R-109 | Amar, or a device model in a later phase. |
| 8 | SPI device models: none in the first release; `SPI.transfer` fails loudly with `bus-device-not-modelled`. | DOCUMENTED (ADR-0307: SPI "replaces the stub"; "a registered device is required") | Same. |
| 9 | Interpreter breakpoints inside interrupt handlers and functions called in expressions cannot pause (`runSync` is not a generator). | VERIFIED limitation (`exec.ts:116-133`) | Documented in `FIDELITY.md`; a generator-based ISR path is a later refactor. |
| 10 | DigitalJS drawing performance on large designs and in WebKit and Firefox. | UNKNOWN | T-B9-32 caps at 5,000 cells (PROPOSAL). |
| 11 | avr8js bundle size (manifest budget). | UNKNOWN until measured | T-B9-07. |
| 12 | Whether `arduino-cli` 1.5.1 and the AVR core 1.8.8 remain downloadable with the pinned sha256 when the build runs. | UNKNOWN | T-B9-08 and T-B9-14 record the sha256 they used. |

## 13. Exit gate (from the phase card)

`npm run check`; SA-03, SA-05, SA-12, SA-14, SA-15, SA-21, SA-22, SA-24 recorded (T-B9-29 writes them with numbers and labels; SA-09, G-T2, FA-11 are recorded as well); BA-18 green if compile was built (needs the answer to section 10 item 1). Then Amar's OK. The orchestrator tags `phase-B9` locally only after that. Nothing is pushed and nothing is deployed.

## Review fixes (2026-10-27)

Twelve review issues were checked against the repo, `package.json`, `playwright.config.ts`, `eslint.config.mjs`, SIM 9.1 and 17.2, API 4.3 and the B3, B6 and B8 task files. All twelve were applied. Three were applied with a different mechanism than the reviewer proposed. Two more problems found while fixing are listed at the end.

| # | Issue | Verdict | What changed | Evidence |
|---|---|---|---|---|
| 1 | No task adds the engine npm packages | Applied, option (a) | T-B9-07 pins `avr8js` 0.21.1, `@yowasp/yosys` 0.71.188-dev.1267, `yosys2digitaljs` 0.10.3, `digitaljs` 0.14.2, `eecircuit-engine` 1.9.0 and `esbuild` 0.28.2 as devDependencies in its one `package.json` edit. T-B9-09 no longer says `npm pack`; T-B9-09, T-B9-19 B and T-B9-32 copy from `node_modules`. T-B9-17's "never added to package.json" is removed. File counts: T-B9-09 5, T-B9-19 B 5, T-B9-32 3 | RS-12 `REPORT.md:178`, RS-08 `REPORT.md:195`, RS-03 `package.json` (`esbuild ^0.28.2`). Versions are DOCUMENTED; the agent checks `npm view` before pinning. `esbuild` is added because DigitalJS needs bundling (RS-12 used it) |
| 2 | `public/engines/` is not built on a clean tree | Applied | T-B9-07 adds `engines:build` (`--if-present`) and appends it to `prebuild` and `pretest`; skipped on Vercel. T-B9-26, T-B9-09, T-B9-32 verify rows and T-B9-29 step 1 say what builds the engines and what to run when `E2E_SKIP_BUILD=1` | VERIFIED: `package.json:13` and `:20` run only `npm run content`; `playwright.config.ts:14` runs `npm run build`; the new Vercel skip is a PROPOSAL, because a production build must not receive engine files |
| 3 | T-B9-07 changes 6 files | Applied | `asm-blink.json` moved to T-B9-24 (now 2 files: `avr8js-pins.ts` and the assembly fixture set). T-B9-07's words are inline in `avr8js.test.ts`; its blink integration case moved to T-B9-10 and T-B9-26 | Section 8 and the index updated |
| 4 | `--set corpus` and `--set sa15` have no owner | Applied | T-B9-08 makes the script generic: three set roots in a small table, each with a `sketches.json` descriptor, plus `--root`. T-B9-10 creates `corpus/sketches.json`; T-B9-27 creates `src/sim/debug/sketches/sketches.json`. The "later editor T-B9-10" entry is gone | The descriptor lives in each task's existing data set, so no file count rises |
| 5 | `debug.*` messages have no receiver; `holdAt` is invented | Applied, with one correction | New T-B9-36 (G3, `handler.ts` and `protocol.ts`). T-B9-33 drops `protocol.ts` and `holdAt` and uses `SimHost.debug(op)`. The reviewer named `sim.worker.ts`; the sim-side logic is in `handler.ts` and the worker is a shell. Messages now follow SIM 17.2 (`{ v:1, id, t:'debug', run, op }`), not the invented `type: 'debug.set'` | B3 T-B3-13 "Interfaces"; SIM 17.2 and A.4; B8 T-B8-14 gives `pause()`, `resume()`, `step()`. `src/sim-host` does not exist on `main`, so all names are DOCUMENTED, not VERIFIED in code |
| 6 | T-B9-13 changes 6 files | Applied, with corrections | `limits.ts` folded into `runner.ts`; mounting is in `server/src/app.ts` (`allRoutes`), not `router.ts`. `classes.ts` has no `compile` class, so a new T-B9-37 (G3, `classes.ts` and `http/limits.ts`) adds the bucket. T-B9-13 is `runner.ts`, `routes.ts`, `config.ts`, `server-info.ts`, `app.ts` | B6 T-B6-17 (`allRoutes` is the single registration point), T-B6-07 (`BucketName` has no `compile`), API 4.3 line 213 |
| 7 | Server tests and typecheck commands | Applied | `.test.js` became `.test.ts`; verify rows name `npm run server:typecheck` and `npm run server:test` | B6 sections 2, 4.1, 4.2 (DOCUMENTED). VERIFIED: `server/` holds only `realtime/` today; root `eslint.config.mjs` ignores no `server` path, so `npm run lint` lints it |
| 8 | T-B9-02 uses a BME280 built later | Applied | Criteria rewritten on a hand-written MPU-6050 project (0x68). 0x76 and `flt_swap` criteria moved to T-B9-04. Provenance is `ext["x-source"]`, not a comment | `project.schema.json:125` (`ext` root property), `$defs.Ext` key pattern. The reviewer said a top-level `x-source` key; the schema puts it under `ext` |
| 9 | `pullup: 'none'` has no field | Applied | `o.pullup?: 'assumed' \| 'none'` on `createI2cBus`; unit tests and T-B9-02 mapping updated | SIM 9.1 (`SIMULATION_ARCHITECTURE.md:978`) lists no such field |
| 10 | Section 1 contradicts the verify rows | Applied | Section 1 lists the five download steps and where each goes; the affected verify rows are marked optional | T-B9-08, T-B9-10, T-B9-14, T-B9-20, T-B9-22, T-B9-27, T-B9-29 |
| 11 | Firefox leg wording | Applied | Success metric, acceptance, T-B9-04 and T-B9-29 now say Chromium and WebKit pass; Firefox passes or is NOT RUN with the reason | T-B9-20 Definition of done already said so |
| 12 | Item 6 blocks T-B9-19 | Applied | Item 6 reworded to proceed with the proposal and no longer blocks. The T-B9-19 index row gives 4 (or 5), 5 and 0 files; Acceptance has one Given/Then per outcome | Section 10 item 6; T-B9-19 |

Found while fixing, not in the review:

| # | Problem | Fix |
|---|---|---|
| a | T-B9-09 listed three fixture files, a sixth file | Built in memory by `inspect.test.ts`; the task is 5 files |
| b | Adding a Firefox project to `playwright.config.ts` would run every spec in Firefox under `npm run e2e` and fail where the browser is absent | T-B9-20 gives the project a `testMatch` for `dmath` and `bme280-hash` only |
| c | T-B9-14 counted 3 source files but lists 4 | Index says 4 |
| d | T-B9-13 said the route class was `compile` | Route class is `device`; `compile` is the bucket |

Open after these fixes: the engine package versions are DOCUMENTED from spike reports and are checked with `npm view` only when T-B9-07 runs; the install size of the six dev dependencies is UNKNOWN until then; whether Vercel's static size limit would reject engine files is UNKNOWN (the build script skips them there, so it does not matter for this plan).
