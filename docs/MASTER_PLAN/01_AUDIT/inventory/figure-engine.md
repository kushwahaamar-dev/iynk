# Figure engines, circuit solver, embed protocol, vendor core

**Paths:** `figures/engine/**`, `figures/vendor/colorfigures/**`, `figures/tools/{cfbuild,cfshoot}.py`, `docs/FIGURES.md`, `docs/FIGURES-BENCH.md`, `docs/FIGURES-DRONE.md`, `src/components/figure/**`
**Entry points:** `python3 -I figures/tools/cfbuild.py <kind>/<id>` (build), `figures/engine/embed.js` (figure side of the bridge), `src/components/figure/FigureFrame.tsx` (host side), `SL.bench.solveCircuit` (`figures/engine/bench-solve.js:249`), `figures/engine/probe.mjs` (CLI probe)
**LOC:** 10,998 lines in scope. Command: `cat figures/engine/*.js figures/engine/*.mjs figures/tools/*.py src/components/figure/* docs/FIGURES.md docs/FIGURES-BENCH.md docs/FIGURES-DRONE.md figures/vendor/colorfigures/{core.js,vendor.py,build.py,PATCHES.md,LICENSE} | wc -l` gives 10998. Engine only (`wc -l figures/engine/*.js figures/engine/*.mjs`) is 6,391 lines, of which tests are 1,462 (`ls figures/engine/*.test.mjs | xargs wc -l`). Solver: `wc -l figures/engine/bench-solve.js` is 431. `core.js` is 743 lines but 65,755 bytes (`wc -c`), so lines are long.
**Owner today:** docs/ARCHITECTURE.md §2 table (lines 114-121): `platform` owns `figures/vendor/**`, `figures/tools/**`, `embed.js`, `docs/FIGURES.md`; `shell-app` owns `src/components/figure/**`; `engine:bench` owns `bench*.js`, `sheets*.js`, `docs/FIGURES-BENCH.md`; `engine:drone` owns `drone*.js`, `docs/FIGURES-DRONE.md`. These are hackathon agent roles, not people. The repo has no human owner for the engine today (UNKNOWN who maintains it after the hackathon).

All statements below are VERIFIED (source read, or command run) unless another label is given.

## Purpose

Every illustrated, interactive object in the product (boards, parts, modules, robotics benches, drones, the flight range) is a self-contained HTML page in an iframe. A vendored third-party drawing core (Colorfigures, MIT) projects hand-inked isometric 3D. Two iynk engines sit on it: the Board Bench engine (`bench*.js`, `sheets.js`) draws boards and a breadboard, runs a "power tree" and a circuit solver, and reports electrical state; the Drone engine (`drone*.js`) is a build-flow and wiring-sheet engine for FPV craft. `embed.js` and `FigureFrame.tsx` are the two ends of a versioned postMessage protocol. `cfbuild.py` bakes core + engine + figure data into one HTML file per figure.

## Dependencies (imports in, imports out; third-party packages)

- **Imports in (who uses this):** the Board Lab, Robotics Lab and Drone Lab pages mount `FigureFrame` (`src/components/figure/index.ts:1`). Labs send `set` patches built by `figureState` (docs/ARCHITECTURE.md v1.8). The interpreter (`src/lib/interp`) is separate: it produces pin levels, the figure turns them into volts and currents. Flight range `public/figures/flight/range.html` uses `CF_BRIDGE.plain` (`embed.js:~190`).
- **Imports out:** engine files are plain browser scripts inlined in order, not modules. They share globals (`SL.bench`, `SL.drone`, core helpers such as `matOf`, `mix`, `CF_T`). `bench.list` (10 lines) fixes the order. Nothing is bundled by Node/webpack.
- **Third-party at runtime:** none besides the vendored core (no CDN, no fetch; `grep -n "fetch(" figures/engine/*.js figures/vendor/colorfigures/core.js` finds nothing).
- **Third-party at dev time:** Python 3 stdlib for `cfbuild.py`; `cfshoot.py` (screenshots; not read in depth, see Open questions); `jsdom` for engine tests (`testkit.mjs:9`); `jiti` for `probe.mjs:18`. `vendor.py:15` reads the upstream core from `~/.claude/skills/colorfigures`, a path on one developer's machine.

## Public interfaces (exported functions/types/components/messages, with path:line)

**Host to figure messages** (`src/components/figure/protocol.ts:17-37`, handled in `embed.js` object `H`): `hello`, `pause`, `resume`, `press {id, choice}`, `chrome {hide}`, `act {name, data}`, `set {state}`, `view`, `xr`, `labels`, `pal`, `locale {lang, strings}`, `theme`, `flash`, `query`. Envelope `{source:'iynk', v:1, type, ...}` (`protocol.ts:~108`).
**Figure to host** (`protocol.ts:50-68`): `ready`, `part`, `button`, `state`, `labels`, `flash`, `focus`, `error`, `sfx`, plus any other type passes through as `custom` (`protocol.ts:~275`). Envelope `{source:'iynk-figure', v:1}`.
**Figure-side API:** `window.CF_BRIDGE` (frozen) with `send`, `on`, `plain` (`embed.js:~182`). A figure opts into state with `cfg.embed = { accept(st, patch, ui), report(st) }`; without `accept`, every `set` is refused (`embed.js:~125`, "set: this figure takes no state").
**Host component:** `FigureFrame` (`src/components/figure/FigureFrame.tsx`, 427 lines) returns a `FigureHandle` with `send`, `sendCustom`, `observe`, `isReady`, `info`, `focus` (`protocol.ts:~100-115`). `CommandQueue` (`queue.ts`) holds up to 500 commands until `ready`, merges successive `set` patches and last-wins view/theme commands.
**Solver:** `B.solveCircuit(st, pl, dt)` (`bench-solve.js:249`) returns `{ meas, volts, load }`. `B.solveSound` (`bench-solve.js:~415`). `B.bbStep` (`bench-bb.js:109`) calls it every frame. `B.bbParams` (`bench-bb.js:135`) accepts part parameters from the host with a whitelist (`def.params`) and range checks.
**Part contract:** `B.part(name, { legs, params, elec(p), model, step, sound, draw, ... })`. `elec(p)` returns one element object or an array. The 12 element types the solver reads are listed in the next section.
**Build CLI:** `cfbuild.py` flags `--all`, `--kind`, `--out`, directives `@cf use|data|title|page` (`cfbuild.py:3-22`).

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Figure state lives only in the iframe's JS memory (`B.st`, `st.cparams`, `st.burnt`, `st.solverMem`). It is never persisted by the engine. `grep -n "localStorage" figures/engine/*.js figures/vendor/colorfigures/core.js` finds no use.
- The host owns persistence: Board Lab store, `src/lib/progress` (not in scope). The engine receives full state again through `set` after a reload.
- Burnt parts latch in `st.burnt` and clear only when the host changes that part's params (`bench-bb.js:146`, `delete st.burnt[id]`) or the circuit changes. A reload loses them unless the host replays the faults.
- No server state, no DB tables, no network from the figure. Built pages are static files served from `public/figures/**` with `Cache-Control: public, max-age=300, must-revalidate` (`next.config.ts:26-30`).

## Current functionality (what VERIFIED works, how you know)

- Ran `npx vitest run figures/engine src/components/figure`: 7 test files, 126 tests, all pass (67 s). VERIFIED.
- Counts (commands): 80 built figure pages (`find public/figures -name '*.html' | wc -l`), all committed to git (`git ls-files public/figures | wc -l` = 80). Rebuilding `boards/uno-r3` and `parts/tip120` to scratch gives byte-identical output to the committed files (`cmp`), so the build is deterministic and the committed copies are current for those two.
- Page sizes: total 24,669,406 bytes for 80 pages; largest `boards/uno-r3.html` 495,777 bytes (157,199 bytes gzipped); parts 8.9 MB over 29 files, boards 4.2 MB over 12, robotics 4.5 MB over 13, modules 3.8 MB over 12, drones 2.8 MB over 13, flight 72 KB (`du -sk` per kind).
- 46 circuits are defined in figure files on 12 boards plus robotics benches (`grep -c "wires:"`: uno-r3 15, nucleo 5, uno-r4 5, nodemcu/nano/pico/pi4 4 each, and so on).

### What the circuit solver is (the core question)

`figures/engine/bench-solve.js`, 431 lines. It is a **DC modified-nodal solver with piecewise-linear device models**, run on a netlist rebuilt every frame from the figure's circuit file.

| Question | Answer | Evidence |
|---|---|---|
| Analysis type | DC steady state only. No capacitor or inductor stamps, no time-domain transient, no AC. | No `C`/`L` element in `netlist()` (`bench-solve.js:44-114`); `grep -in "capacit" bench-solve.js` returns nothing. |
| Method | Nodal analysis, dense matrix `A x = b`, Gaussian elimination with partial pivoting (`linsolve`, `bench-solve.js:15-37`). A node with no pivot (`< 1e-18`) is set to 0 V. `GMIN = 1e-9` S added to every diagonal (`:136`). | Read. |
| Sources | Rails are Norton sources: voltage behind `RAIL_R = 0.5` ohm. Output pins are voltage behind `PIN_R = 25` ohm (`:11`, `:140-143`). Rail voltages come from the power-tree evaluator in `bench.js`, not from the solver. | Read. |
| Nonlinear devices | LED/diode: off, or `vf` plus series `rd` (LED `rd = .5`, diode `vf = .7`, `rd = .2`, `:98-100`). NPN: off / active (`IC = beta*IB`, via a controlled current `VC`) / saturated (`VCEsat` behind `RSAT = .01`); base modelled as `vbe` behind `RBE = 2` ohm; inverse mode uses `hfr`. | `:164-173`, `:187-211`. |
| Convergence | Fixed-point on device on/off/sat/inverse flags: re-solve until no flag changes, at most `ROUNDS = 40` (`:11`, `:213`). Outer loop: at most 6 passes to settle motor conductance (`:260-269`). The device-state array `S` is rebuilt cold each pass. No residual check, no failure flag: if it does not converge, the last iterate is returned silently. | `:213`, `:264`. |
| PWM | Sorted distinct duty levels split one period into slices; each slice is a separate DC solve; currents and volts are time-averaged (`:251-257`, `timeAvg`). Peak is used for burn-out checks. A tone pin is a 50 % square wave level. | Read. |
| Motors | `gm` conductance from the part's `model.steady(v, load)` (a lookup/curve function in the part file), iterated against the voltage actually seen. "Stalled" uses `1/ohms`. Brushless fan with `polar` blocks reverse. Not a back-EMF model in the solver; any back-EMF lives in the part's `steady` function. | `:243-247`, `:258-269`. |
| Servo | Draws a constant conductance from its last-frame current (`iidle`, `imove`, `istall`); signal read as `V > logic/2`; angle from average pulse width; dead-state rules. A rule table, not a mechanical model. | `:121-123`, `:318-328`. |
| Capacitors, regulators, MOSFETs, op-amps, inductors | **Not in the solver.** There is no element type for them. Regulators are rules in the power-tree evaluator `bench.js:~225-290` (`fd.reg`, `fd.dropout`, `fd.drop`, `ilim` fold-back). Capacitors exist only as drawings plus a polarity rule (`bench.js:~295`, backwards ecap "pops"). | Searched. |
| Brown-out | Two rule paths. (1) Breadboard load above the source's `ilim` sets `st.sag` for 0.6 s, which multiplies the MCU rail by 0.42 (`bench-bb.js:113-116`, `bench.js:~269`). (2) Rail below `mcu.min` gives status `brownout` and the chip resets (`bench.js:~312`). `ilim` is a per-source constant (e.g. USB 500 mA). It is not a Thevenin droop computed from the network. | Read; test `bench-solve.test.mjs:109-114` checks the message. |
| Damage ("burn") | Threshold rules on solved values, latched in `st.burnt`: LED burns above `2.5 * imax` peak (`:303`); diode above `imax` average or `isurge` peak; transistor above `tjmax` (150 C from `Tj = 25 + theta*P`) or `1.5*icmax` peak; pot above `pmax` for 2 s; temperature sensor above `vabs` or reversed for 3 s. Burnt Darlington fails short C-E (10 S), small transistor open. | `:301-345`. |
| Reporting | `meas[partId]` states are strings chosen by `if` chains: `ok/off/open/reverse/burnt/clamp/block/linear/on/hot/overdrive/spike/stall/over/jitter...`. The "textbook 12.2 mA" is `(5-2.0)/(220+25+0.5)`, which is the solver's own constants. | `:303-345`; ESTIMATED check: 3/245.5 = 12.2 mA. |

**Provenance of thresholds.** Each part file carries its constants and cites the datasheet in the header comment, for example `figures/parts/tip120.js:7-10` (Fairchild: VCEO 60 V, IC 5 A, TJ 150 C, hFE >= 1000, VCE(sat) <= 2.0 V at 3 A, "typical curves give VBE 1.2-1.4 V and VCE(sat) 0.7-1.0 V" read off a plot) and `docs/facts/la-components.md` §11 (lines 205-214) with source URLs. The numbers that reach the solver are then hand-fitted: TIP120 uses `hfe: 1000, vbe: 1.3, vcesat: .9` (`tip120.js:45`); LED forward drops are a colour table (`led.js:9`, red 2.0 V ... white 3.1 V) with fixed `imax .02`. `RBE = 2` ohm, `RSAT = .01`, `RAIL_R`, `PIN_R = 25` (a typical AVR pin figure) are solver-wide constants with no cited source in the file. The 25 ohm pin resistance is applied to every board, even 3.3 V ARM/ESP parts (UNKNOWN if per-board values are set; the code reads one `PIN_R`). Fault thresholds are therefore *datasheet-informed, not datasheet-exact*. DOCUMENTED, not tested against hardware or SPICE.

**Diode inconsistency (VERIFIED).** `diode-1n4007.js:31` supplies `vf: 0.8, is, n: 1.808, rs`, a full Shockley parameter set, but the solver ignores them and hard-codes `vf: .7, rd: .2` (`bench-solve.js:100`). Only the displayed voltage can come from `model.vf(i)` (`:315`). So the part file and the solver disagree on the physics.

**Is the solver independent of the drawings? Partly.**
- A wire is a **modelled net**, not a picture: `uni()` is a union-find that merges breadboard strips, rails, board pins and part legs (`bench-solve.js:44-60`, `:63`). A jumper is a wire in `c.wires`, resolved through `B.hole(geo, ref)` to a strip node.
- But the netlist is built from the same object that draws the scene, `c.parts` with `holes` and `c.wires` in the circuit entry of the figure file, and from breadboard geometry (`bench-bb.js` `B.bbGeom`, `B.hole`). A part's electrical legs are its drawing's hole indices.
- Part behaviour (`elec`, `model`, `step`, `sound`) is defined in the same JS file as the part's drawing (`figures/parts/*.js`).

**Can it take an arbitrary netlist from outside a figure file? No, not today.** `accept({circuit: key})` looks up `MD.circuits[id]` (`bench.js:479`) and `bbParams` looks up `B.md.circuits[st.circuit]` (`bench-bb.js:136`). The circuit must exist in the figure's data at build time. The host can change per-part params (whitelisted by `def.params`, range-checked) and pins/power/faults, but cannot send parts or wires. `netlist(st, pl)` itself is pure in shape (`c.parts`, `c.wires` plus `pl.geo`) and could be fed a user object, but it depends on the breadboard geometry and on `B.md` (board metadata) being global. There is no netlist import, no SPICE, no schematic-first input (the schematic view `sheets.js` is drawn *from* the circuit, not the other way).

## Known defects (with repro or evidence)

| # | Defect | Where | Evidence | Severity |
|---|---|---|---|---|
| 1 | Silent non-convergence: loop exits after 40 rounds / 6 passes with no flag or note | `bench-solve.js:213`, `:264` | No code path after the loop checks `changed`. A circuit that flips a junction state each round (e.g. an LED fed through a diode and a PWM pin near threshold) returns an arbitrary iterate. HYPOTHESIS that real lessons hit it; none seen in 126 tests. | medium |
| 2 | 1N4007 model parameters ignored by the solver (see above) | `diode-1n4007.js:31` vs `bench-solve.js:100` | Read. A 1 A diode reports `vf .7` in current maths, `model.vf(i)` only in the display. | low |
| 3 | `PIN_R = 25` ohm for every board, including 3.3 V and FPGA pins | `bench-solve.js:11`, `:142` | One constant, no per-board field read. LED current on a Pico or Basys 3 differs from hardware. ESTIMATED effect: a few percent to tens of percent depending on resistor. | medium |
| 4 | Dense `O(n^3)` solve with fresh allocation each round | `bench-solve.js:127-130` | Measured cheap today (below), but the netlist is rebuilt and re-solved every frame with no memo, so cost scales with strips touched. | low |
| 5 | Floating subcircuits solve to 0 V without a warning | `bench-solve.js:19-20` and `:34` | By design, but a floating base or open sensor shows 0 V, not "undefined". | low |
| 6 | Engine OOM when stepping the whole page in jsdom for 200 frames across circuits | my scratch run `t.mjs` (not repo code) | Node heap reached 4 GB on the third circuit using `advance()` (which includes drawing). The solver alone (`bbStep`) is cheap; the growth is in the draw/DOM path or jsdom. HYPOTHESIS: a leak in render under jsdom, or jsdom itself. Not reproduced in a real browser. | medium, needs validation |
| 7 | `vendor.py` default source is `~/.claude/skills/colorfigures` | `vendor.py:15` | Re-vendoring is impossible on a clean machine without that skill folder. | medium |
| 8 | Prefix handling: hand-written `B.note` messages are the only error channel for bad circuits; a typo in a hole name gives `null` end and the wire is silently skipped | `bench-solve.js:41-42`, `:55` (`uni` ignores null) | Read. | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Solver, part drawing and part physics co-located; global mutable `SL.bench` / `B.md` / `B.st` | `figures/engine/bench*.js`, `figures/parts/*.js` | Files wrap in IIFEs and read `SL.bench`; `solveCircuit` reads `B.md`, `B.st`, calls `B.sfx`, `B.say` (`bench-solve.js:250`, `:301`) | high | 3-5 weeks to extract a pure solver |
| Engines are order-dependent concatenated scripts, no modules, no TypeScript | `figures/engine/bench.list` | 10-line manifest; `cfbuild.py` reserves core globals by regex (`cfbuild.py:34-50`) | medium | 2-3 weeks |
| Very dense code style: long one-line functions, magic numbers inline | `bench-solve.js:63-110`, `:300-345` | Read; one-line `if` chains deciding states | medium | ongoing |
| Test infrastructure builds each page by shelling to Python, then jsdom | `testkit.mjs:16-19` | 67 s for 126 tests | low | 1 week |
| 80 built HTML files committed, 24.7 MB total, each embeds core+engine | `public/figures/**` | `git ls-files public/figures \| wc -l` = 80; ~330 KB of shared code repeated per page | medium | 1-2 weeks to split a shared engine bundle |
| `docs/FIGURES-BENCH.md` is 927 lines and is the only spec of `elec` | `docs/FIGURES-BENCH.md` §9 | Authority mixed with change log (lines 23-100) | low | 1 week |
| Hackathon-era agent roles in comments (`P2-engine-b`, `engine:bench`) | docs/ARCHITECTURE.md §2, FIGURES-BENCH.md | Read | low | cleanup |
| Core patched by script; ~7 iynk patches on a third-party file | `PATCHES.md`, `vendor.py` | P0-P6, B1-B2 | medium | needs upstream strategy |
| `cfshoot.py` (269 lines) not exercised by tests | `figures/tools/cfshoot.py` | no test references it (`grep -rn cfshoot --include=*.mjs --include=*.ts` not run in depth; UNKNOWN) | low | |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

| File | Tests | What it checks |
|---|---|---|
| `bench-solve.test.mjs` (196 lines, 16 `it`) | LED, RGB, TIP120+motor, PWM clamp, flyback, stall brown-out, ULN2003 stepper, pot, button, TMP36, servo, buzzer | **Mostly self-consistency.** Expected values are what the model constants give (12.2 mA = 3 V / 245.5 ohm; "motor near 4 V" matches the TIP120 vcesat/vbe fit). Ranges are loose (`>3.7`, `<4.2`). A few are physically meaningful: pot at 2.5 V, TMP36 `0.5 V + 10 mV/C`, servo 1500 us. None compare against a SPICE run or bench measurement. |
| `bench.test.mjs` (935 lines, 67 `it`) | board bench: build flow, power tree, faults, modes, bridge | Behavioural contract of the engine on real figure pages. Not run in detail by me beyond a pass. |
| `drone.test.mjs` (220 lines, 14 `it`) | drone build flow, tests | Rule/state machine behaviour. |
| `embed.test.mjs` (111 lines, 6 `it`) | bridge `ready`, `set`, origin handling | Protocol behaviour via `testkit` host stub. |
| `src/components/figure/protocol.test.ts` (6), `FigureFrame.test.tsx` (15), `FigureStill.test.tsx` (2) | parser and host component | Unit tests. |

Count command: `grep -c "^\s*\(it\|test\)(" <files>`. Total 126 passing. There is **no** regression harness comparing the solver to a reference simulator, and no property tests (KCL residual, passivity, monotonicity). No test checks a convergence failure. No test uses a datasheet value that is independent of the part file. Hardware-derived reference values: DOCUMENTED in `docs/facts/*.md` for part ratings, but tests do not read them.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- **Solver cost, MEASURED** (my scratch script, `bbStep` only, node 24 + jsdom, 300 calls per circuit, Uno R3 lesson circuits): blink 0.029 ms, servo 0.021 ms, heat (4 parts) 0.053 ms, rgb 0.052 ms, motor 0.071 ms, stepper (ULN2003, 4 channels, 0.282 ms). Negligible against a 16 ms frame.
- **Page weight, MEASURED:** 24.7 MB total, 495,777 bytes max (157 KB gzipped for uno-r3). The core is 65,755 bytes and the engine ~330 KB of source repeated in every bench page.
- **Load time:** UNKNOWN (not measured in a browser). 
- **Scaling, ESTIMATED:** dense `O(n^3)` per round, 40 rounds max, 6 passes, K slices. For a breadboard of 100 strips (n ~100) and 4 slices worst case about 100^3 * 4 * 40 * 6 = 10^9 flops per frame, too slow. At today's circuits (n ~ 10-30) it is fine. A real project would need sparse or LU reuse.
- **Drawing path** (jsdom): see defect 6. Unmeasured in a browser.

## Security risks

1. **No iframe sandbox.** `FigureFrame.tsx:351-357` renders `<iframe src=... title loading="lazy">` with no `sandbox`, `allow` or `referrerPolicy`. Figures are same-origin (`/figures/...`). Any script in a figure page runs with full access to the app's origin (cookies, localStorage, `/api` with credentials). Safe today only because all 80 pages are built by the team from trusted sources. **Blocker for user-authored figures** (see Reusability). Severity: high for the builder plan; low today.
2. **CSP covers framing only.** `next.config.ts:28` sends `Content-Security-Policy: frame-ancestors 'self'` for `/figures/*`. It sets no `script-src`, `connect-src` or `default-src`, and the pages use inline `<script>` blocks by design, so a strict CSP would need hashes or nonces per page. A figure can `fetch()` anything today. `X-Content-Type-Options: nosniff` is set.
3. **Message authentication is good for same-origin.** Host: accepts only `event.source === frame.contentWindow && event.origin === window.location.origin` (`FigureFrame.tsx:231`). Figure: only `ev.source === host` and origin equal to `hostOrigin` (`embed.js:~30-33`), and `type` must be own-property or registered (`embed.js` `handle`). `set` goes only through the figure's `accept`, which prevents the upstream `Object.assign(st, patch)` overwrite (PATCHES.md "Handled outside the core"). Prototype-pollution guards use `hasOwnProperty` (`own`).
4. **`?origin=` query** lets the page post to another http(s) origin (`embed.js:~20-23`). Exploitable only if a foreign site can frame the page; `frame-ancestors 'self'` blocks that in browsers that honour it. Severity: low.
5. **`locale` message injects host strings into `innerHTML`** (`core.js:432-540` use of `innerHTML`; PATCHES.md P2 says text goes through `CF_ESC`). The host is trusted. I did not trace every sink (UNKNOWN). Severity: low while host-only.
6. **Build-time injection checks exist** (`cfbuild.py:80-87`: rejects `</script` and `<!--` in scripts; JSON data escapes `</`). Good, but they stop accidental breakage, not a hostile author.
7. **`vendor.py` and the committed HTML** are the supply chain; there is no CI check that `public/figures/**` equals a fresh build (I confirmed two files by hand).
8. `core.js` `innerHTML` uses and `fetch` absence: no outbound network from the engine.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Only on catalogue items today.** Reasons, all VERIFIED:

1. **Circuits are data compiled into a figure page** (`MD.circuits[...]`), chosen by key. The host cannot upload parts or wires (`bench.js:479`, `bench-bb.js:136`). The host's `set` can only change whitelisted params, power, pins, faults, and select an existing circuit.
2. **Part physics is JavaScript inside part files** (`elec`, `model`, `step`), authored together with the drawing. A new part means a new `.js` file, a rebuild by Python, and a redeploy of a committed HTML. There is no data-only part definition.
3. **Netlist topology is coupled to breadboard geometry** (`holes: ['c14','c15']`, `B.hole`). A user project drawn as a schematic has no holes.
4. **The solver covers a narrow device set:** resistor, pot, push button, LED, diode, NPN (incl. Darlington), motor, servo, temperature-sensor chip, buzzer, stepper coils (12 element types, `bench-solve.js:76-107`). It has no capacitor, inductor, MOSFET, PNP, op-amp, regulator, Zener or logic gate, and no transient analysis. Real projects (decoupling, RC timing, boost converters, H-bridges, I2C pull-ups with bus capacitance) cannot be represented.
5. **The MCU side is separate:** pin levels come from the host interpreter, which is a different subsystem; the figure's built-in demo "modes" are canned.
6. **No sandbox** (security risk 1) rules out running user-supplied figure code.
7. **Drone engine** is a build-flow and wiring-sheet state machine: `smoke`, `motorOk`, `accOk` are booleans set by actions (`drone.js:168-241`), with no electrical solve; flight physics is elsewhere (`src/lib/flight`, out of scope).

What *does* transfer: the protocol (`FigureFrame` + `embed.js`), the build pipeline concept, the hand-inked rendering, `netlist()` union-find structure and `linsolve` as a seed for a solver.

## Required refactoring to get there

1. Extract the solver to a pure module with a typed netlist input `{ nodes, elements[], sources[] }`, no `B.*` globals, no `say/sfx`; return structured results (voltages, currents, per-element state, convergence flag). Run it in the host (or a worker) and send results to the figure, which then only draws.
2. Replace `holes`-based wiring with a schematic-level graph; make breadboard layout a *view* that is generated from or checked against that graph.
3. Add device models in data (JSON): `C`, `L`, MOSFET, PNP, Zener, regulator (LDO and buck as behavioural models), op-amp ideal. Add backward-Euler transient for RC/RL, or adopt an existing engine (ngspice-WASM or similar) behind the same interface (EXTERNAL option, not evaluated here).
4. Make `elec` declarative (`{ type: 'led', color: 'red' }`) so a part is data and its physics comes from a library with cited datasheet fields. Keep drawing code separate.
5. Make solver constants per-board/per-part: `PIN_R`, pin voltage, `ilim`, brown-out threshold from the existing board data (`docs/facts`), not file-wide constants.
6. Add convergence reporting, damping or gmin-stepping, sparse LU for larger nets.
7. Build golden tests: for a set of circuits, compare to ngspice or a hand calculation, and read ratings from `docs/facts`.
8. Sandbox the iframe: `sandbox="allow-scripts"` without `allow-same-origin`, move to `postMessage` with `'*'` target plus `ev.source` checks, serve figures from a separate origin (e.g. `figures.iynk.tech`), add a CSP with `connect-src 'none'`. Needed before any user-authored figure.
9. Ship one shared engine bundle (cacheable) and per-figure data, instead of 80 self-contained pages.
10. Replace `vendor.py`'s home-directory path by vendoring the upstream snapshot or a git submodule.

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend** for the protocol, build pipeline, rendering and the catalogue figures (they work, are tested and deterministic); **replace** the solver with a pure, data-driven one for the builder, reusing `netlist()` ideas and tests as a starting corpus. The current solver is adequate for fixed lessons and not adequate for arbitrary user circuits.

## Open questions

1. Who maintains the engine now that the hackathon agent roles are gone? (ARCHITECTURE.md §2 lists roles only.)
2. Do any shipped lessons hit the 40-round / 6-pass cap? No instrumentation exists; add a counter to find out.
3. Is the jsdom heap growth in defect 6 a real render leak in browsers? Needs a Chrome heap profile on `boards/uno-r3`.
4. Are the Pico, ESP32 and Basys 3 pin resistances and `ilim` values set per board or defaulted? I read the solver, not every board file.
5. What did the Colorfigures upstream license cover for the "skill" assets: `LICENSE` is MIT with three copyright lines (April Zhu, Tolga Cohce). It permits sublicensing and commercial use if the notice is kept. Is the notice shipped inside each built page? I did not find it in the inlined core header, only a pointer comment ("see LICENSE in this folder"), so a distributed page may not carry the notice. HYPOTHESIS, check `public/figures/*.html` heads.
6. `cfshoot.py` was not read in depth (screenshot tool, needs a browser). Does it run in CI?
7. Does production serve `/figures/*` from the same origin as authenticated app routes (so risk 1 is live)? `next.config.ts` implies yes; infrastructure not audited here.
8. Is a SPICE-class backend (ngspice-WASM, or a native service) acceptable in the browser bundle and license-wise for the builder? EXTERNAL, not evaluated.
