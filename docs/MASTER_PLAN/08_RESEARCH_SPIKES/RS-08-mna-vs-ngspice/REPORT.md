# RS-08 (a): iynk's in-house DC solver against ngspice

> Recovery note (orchestrator, 2026-10-27): the spike agent wrote this report, but a tool guard refused the file write ("Subagents should return findings as text"). The text below is restored unchanged from the agent's transcript.

Status: mixed, not a clean PASS. Linear solve PASS (20 of 20 against matched models). Device-model fidelity against realistic SPICE models FAIL (10 of 20 within 2 percent). Transient part (b) INCONCLUSIVE: not measured. No phone was tested. See Verdict.
Part (b) of RS-08 (trapezoidal RC, RLC and buck waveforms at a 1 us step) was not in this assignment and was not run.

## Question

Is iynk's in-house circuit solver (`figures/engine/bench-solve.js`) accurate for DC operating points, compared with ngspice, on the circuits the benches use?

## Why it matters

Decision D2 (circuit solver strategy) in `02_RESEARCH/TECHNICAL_RESEARCH.md`: keep a small in-house MNA engine for real-time pages, and use ngspice WASM for "run accurate analysis" and as the checker. This spike says whether the in-house engine can be trusted as the live solver, and what ngspice would need to check.

## Exit condition (copied from TECHNICAL_RESEARCH.md, spike 6, part a)

"DC solver against ngspice on 20 canonical circuits. Pass: within 2 percent on 18 of 20, failures explained; fail: more than 5 disagree."

I read "disagree" as "outside 2 percent". "Within 2 percent" means: every node voltage and branch current of the circuit is within 2 percent of ngspice, or within an absolute floor (5 mV, 5 uA) where the reference value is tiny.

## Environment

| Item | Value |
|---|---|
| Machine | Apple M4 Pro, arm64, 14 cores, macOS 27.0.1 (Darwin 27.0.0) |
| Node | v24.8.0 |
| Solver under test | `figures/engine/bench-solve.js` (431 lines), unmodified for timing. Accuracy runs use a copy with two added lines that expose raw node voltages (`src/bench-solve.patch`) |
| ngspice | ngspice-45.2 compiled to WASM, inside `eecircuit-engine` 1.9.0 (npm, published 2026-10-25), licence MIT for the wrapper. Package is 20.3 MB unpacked per file (5.7 MB gzip). ngspice itself is BSD-3-Clause per the ngspice project; I did not re-check that in the package |
| Page harness | jsdom 30.1.2 (the repo's own test kit, `figures/engine/testkit.mjs`, imported read-only) running the real Uno R3 figure page |
| Browsers (timing) | Chromium 156.0.8078.4 and WebKit 27.2 via Playwright 1.64.0 (Apache-2.0) |
| Load during timing | `uptime` 1-minute load 6.1 to 6.3 (below the limit of 10) |

No sudo, no brew, no global installs. Nothing outside this folder in the repo was touched.

## What the solver actually is

Read from the source before writing any test. This decides what "matched" means.

- Nodal analysis with dense Gaussian elimination and partial pivoting. GMIN of 1e-9 S to ground on every node.
- Rail sources: the rail voltage behind 0.5 ohm. Output pin: 5 V or 0 V behind 25 ohm. Rail voltages come from a separate power model (`bench.js`), not from the MNA. Regulators, dropout, current limits and brownout sag are in that power model.
- Every nonlinear part is piecewise linear, re-solved until the junction states agree (up to 40 rounds):
  - LED: off, or on as `I = (V - Vf) / 0.5 ohm`. Vf is fixed per colour (red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1).
  - Diode (1N4007): off, or `I = (V - 0.7) / 0.2 ohm`. The part file's exponential fit is used only for the label.
  - NPN: base is `Vbe` (0.7 for the 2N2222, 1.3 for the TIP120) behind 2 ohm. Collector current is `beta * Ib` (100 and 1000), or saturated at `Vce(sat)` (0.2 and 0.9 V) plus 0.01 ohm.
  - DC motor: a conductance `gm = I(V) / V`, where `I(V)` comes from the motor part's steady-state model, updated across up to 6 passes until it moves less than 1 percent.
- Types the solver does not have: MOSFET, PNP, capacitor, inductor, op-amp, regulator, switch-mode converter. No transient analysis. A circuit with a MOSFET or a buck converter cannot be expressed, so "MOSFET switch" and "buck DC equivalent" from the brief are reported as not modelled, not as passes.
- The 2N2222 part exists in `figures/parts/npn-2n2222.js` but no board or module figure includes it (no `@cf use`). I added its script to the test page ahead of the TIP120 script. In the shipped figures only the TIP120 is reachable.

## Method

1. Twenty circuits are described once in `src/cases.mjs` (neutral JSON: parts, nodes, power, pins). Both sides are generated from that one description, so they cannot drift.
2. Bench side: each free node becomes one breadboard column strip, each board net (5V, 3V3, VIN, D13, GND) comes in by a jumper wire, parts use the repo's real part definitions (`resistor`, `led`, `diode-1n4007`, `tip120`, `npn-2n2222`, `dc-motor`, `potentiometer`). The circuits are injected as extra lesson circuits into the Uno R3 page and solved with the page's own `solveCircuit`. Generated circuits are in `data/bench-circuits.json`.
3. Rail and pin values are read from the page's power model at solve time and given to SPICE unchanged (for USB: 5V rail 4.95 V, 3V3 rail 3.3 V; for the 9 V jack: VIN 8.3 V), so the power model is not under test.
4. SPICE side, two flavours per circuit (`data/netlists/Cnn-matched.cir` and `-realistic.cir`):
   - Matched: each device is the solver's own piecewise-linear model written as an ngspice behavioural (B) source. LED: `I = max(V - Vf, 0) / 0.5`. Diode: Vf 0.7, 0.2 ohm. NPN: `Ib = max(Vbe_in - Vbe, 0) / 2`, `Ic = max(min(beta * Ib, (Vce - Vcesat) / 0.01), 0)`. Motor: the part's steady-state current as a `pwl` table of V (0.02 V steps, 0 to 10 V). Rails and pins are the same Thevenin sources, and a 1e9 ohm gmin resistor sits on every node. This measures solver error only.
   - Realistic: LED as an exponential diode model anchored at the part's Vf at 20 mA (N = 2, RS = 0.5 ohm). 1N4007 as the part file's own Shockley fit (IS 7.03e-9, N 1.808, RS 0.0342). Transistors as generic Gummel-Poon (2N2222: IS 5e-15, BF 100, VAF 100, RB 10, RC 0.5; TIP120 as two stacked NPN with BF 31.6 each). Motor as in matched. These BJT cards are my own generic choices, not a vendor model, so BJT results are indicative only.
5. Compared: every node voltage, every branch current (resistors, LEDs, diodes, base and collector currents, motor, pot halves) and the total current drawn from the sources. Relative error against ngspice; a quantity passes if `|solver - spice| <= max(2% of |spice|, floor)` with floor 5 mV or 5 uA. A circuit passes if all its quantities pass.
6. Each circuit was solved cold (fresh solver memory) and warm (6 further frames). The two agree for every circuit.
7. Extra: 60 random resistor networks (3 to 8 nodes, 4 to 12 resistors from 10 ohm to 1 Mohm), solver against ngspice, to check the linear algebra beyond hand-picked circuits.
8. Timing: ms per `solveCircuit` call (netlist build plus solve, the per-frame cost) averaged over 400 calls after 50 warm-up calls, in Chromium at 1x, 4x and 6x CPU throttle (CDP `Emulation.setCPUThrottlingRate`) and in WebKit at 1x. Also in Node/jsdom for all 79 lesson circuits in the repo, to find the largest one.

## Results

### 1. Accuracy, the 20 circuits

Matched worst error is the largest relative error over all voltages and currents of that circuit, in percent. Realistic worst names the quantity that is furthest from a realistic SPICE model.

| ID | Circuit | Matched worst error % | Realistic worst error % (quantity) | Realistic within 2% |
|---|---|---|---|---|
| C01 | Divider 10k/10k from 5V | 7e-10 | 0.0 | yes |
| C02 | Three-resistor divider 1k/2.2k/4.7k, two taps | 2e-13 | 0.0 | yes |
| C03 | Divider 1k/1k from a pin (25 ohm source), 1k load on the tap | 5e-13 | 0.0 | yes |
| C04 | Potentiometer 10k at 30 percent, 2.2k load on the wiper | 1e-14 | 0.0 | yes |
| C05 | Wheatstone bridge 1k/2k/2k/3.3k, 10k bridge | 2e-13 | 0.0 | yes |
| C06 | Red LED, 220 ohm, from D13 | 4e-12 | 1.7 (V node A) | yes |
| C07 | Red LED, 100 ohm, from D13 | 2e-12 | 0.0 | yes |
| C08 | Red LED, 10k, from D13 (dim) | 1e-12 | 12.5 (V node A) | no |
| C09 | Blue LED, 220 ohm, from 5V rail | 2e-11 | 2.5 (LED current) | no |
| C10 | Red LED straight on D13, no resistor (first solve, before it burns) | 1e-13 | 3.7 (V D13) | no |
| C11 | Two red LEDs in parallel, one shared 150 ohm | 1e-11 | 2.7 (V node A) | no |
| C12 | Red and blue LEDs in parallel, one shared 150 ohm | 1e-11 | 0.8 | yes |
| C13 | Diode clamp: D13 through 1k, 1N4007 to the 3V3 rail | 7e-11 | 12.3 (diode current) | no |
| C14 | 1N4007 in series with 1k from 5V | 1e-11 | 12.4 (V node A) | no |
| C15 | TIP120 low-side motor switch, 1k base, motor on 5V, flyback diode | 0.26 | 20.8 (V base) | no |
| C16 | 2N2222 saturated, 1k base, 100 ohm load | 1e-11 | 229.6 (Vce, 0.20 V against 0.06 V) | no |
| C17 | 2N2222 active region, 220k base, 1k load | 3e-10 | 2.5 (collector current) | no |
| C18 | 9 V battery (VIN rail) with 2 ohm internal resistance into 47 ohm | 2e-12 | 0.0 | yes |
| C19 | 3V3 rail (0.5 ohm source) into 22 ohm | 0 | 0.0 | yes |
| C20 | Brownout: stalled motor through a TIP120 on the 5V rail | 3e-13 | 41.1 (V base) | no |

Matched models: 20 of 20 within 2 percent. The worst error anywhere is 0.26 percent (C15, the motor current). It comes from the solver's 1 percent stopping rule on the motor conductance, not from the linear algebra. Everything else agrees to 10 digits or more.

Realistic models: 10 of 20 within 2 percent. 14 of 20 are within 5 percent. The six above 5 percent are C08 (LED at 0.3 mA), C13 and C14 (1N4007 at 1 to 4 mA), C15, C16 and C20 (transistor base and saturation voltages).

Key values, solver against matched ngspice (mA):

| Circuit | Quantity | Solver | ngspice (matched) | ngspice (realistic) |
|---|---|---|---|---|
| C06 | LED current | 12.220 | 12.220 | 12.43 |
| C07 | LED current | 23.904 | 23.904 | 23.9 |
| C08 | LED current | 0.299 | 0.299 | 0.321 |
| C10 | LED current, no resistor | 117.65 | 117.65 | 114.46 |
| C15 | Motor and collector current | 193.30 | 193.81 | not printed here, see `data/results.json` |
| C20 | Total load, stalled motor | 2091.2 | 2091.2 | 1791.7 |

C20 matters for the brownout lesson. The solver reports 2091 mA drawn, which is also what the page shows in its brownout message ("2091 mA, more than USB cable gives (500 mA)"). Matched ngspice gives the same number. A realistic TIP120 gives about 1792 mA. Both are far above the 500 mA USB limit, so the brownout verdict is the same.

Cases of interest:

- C10, "no resistor" damage case. First solve: 117.6 mA, and the part flags `burnt`. Next solve: the LED is open, 0 mA. Realistic SPICE gives 114.5 mA before failure. The verdict (far over 20 mA) agrees; the exact number is off by 2.8 percent.
- C11 and C12, parallel LEDs. Two identical red LEDs split the current 50/50 in the solver (8.56 mA each). In reality identical-looking LEDs differ by tens of mV and one hogs the current; the solver cannot show this because every LED of a colour has the same Vf. Red plus blue: the solver switches the blue one off completely (0 mA), which matches the realistic model to within 0.8 percent on the node voltage.
- Battery with internal resistance (C18) and rail under load (C19) are plain resistive and agree exactly. The solver models a rail as an ideal voltage behind 0.5 ohm, so it has no load regulation of its own beyond that 0.5 ohm.

### 2. Random networks

60 random resistor networks, 320 node voltages (280 above 1 mV): 0 mismatches over 2 percent. Largest absolute difference 4.3e-12 V, largest relative difference 8.7e-13. The linear algebra is right, including 5 orders of magnitude of resistor spread.

### 3. Time per solve

ms per `solveCircuit` call (netlist build and solve together). Chromium 156 and WebKit 27.2, 400 calls after 50 warm-up calls. Load 6.1 to 6.3.

| Circuit | Chromium 1x | Chromium 4x | Chromium 6x | WebKit 1x |
|---|---|---|---|---|
| C01 | 0.0095 | 0.0335 | 0.0458 | 0.0075 |
| C02 | 0.0055 | 0.0210 | 0.0343 | 0.0075 |
| C03 | 0.0080 | 0.0245 | 0.0420 | 0.0075 |
| C04 | 0.0067 | 0.0250 | 0.0422 | 0.0075 |
| C05 | 0.0070 | 0.0265 | 0.0395 | 0.0050 |
| C06 | 0.0085 | 0.0265 | 0.0423 | 0.0075 |
| C07 | 0.0055 | 0.0207 | 0.0315 | 0.0075 |
| C08 | 0.0053 | 0.0200 | 0.0322 | 0.0050 |
| C09 | 0.0055 | 0.0210 | 0.0307 | 0.0050 |
| C10 | 0.0048 | 0.0167 | 0.0243 | 0.0050 |
| C11 | 0.0088 | 0.0285 | 0.0447 | 0.0075 |
| C12 | 0.0070 | 0.0242 | 0.0360 | 0.0075 |
| C13 | 0.0105 | 0.0330 | 0.0560 | 0.0100 |
| C14 | 0.0070 | 0.0305 | 0.0418 | 0.0075 |
| C15 | 0.0182 | 0.0675 | 0.1047 | 0.0175 |
| C16 | 0.0120 | 0.0458 | 0.0705 | 0.0150 |
| C17 | 0.0095 | 0.0357 | 0.0512 | 0.0150 |
| C18 | 0.0047 | 0.0160 | 0.0250 | 0.0050 |
| C19 | 0.0032 | 0.0155 | 0.0238 | 0.0050 |
| C20 | 0.0107 | 0.0432 | 0.0615 | 0.0100 |
| Largest repo circuit (`uno-r3` "stepper": 14 nodes, 17 elements, 4 parts) | 0.0715 | 0.2917 | 0.4463 | 0.0575 |

The largest of the 79 lesson circuits in the repo (boards and robotics pages, scanned in Node/jsdom with 200 calls each) is the Uno R3 `stepper` circuit: 14 nodes, 17 elements, 0.088 ms in Node. The median circuit takes 0.013 ms, the slowest 0.088 ms. At the 6x throttle the largest circuit takes 0.45 ms, which is under 3 percent of a 16 ms frame. `data/scan.json` has all 79.

Scaling of the elimination alone (copied from the source, dense, random sparse matrices), Node: n = 14: 0.004 ms, 30: 0.006, 60: 0.032, 120: 0.18, 240: 1.2 ms. That is O(n^3). One solve repeats the elimination once per junction round, per PWM slice, per pass (up to 40 rounds, 6 passes), so a 240-node circuit with several rounds is in the range of tens of ms. The repo's circuits are nowhere near that size.

## Verdict

Three parts. The spike is not a clean PASS.

| Part | Result | Evidence |
|---|---|---|
| Linear solve and junction iteration (matched models) | PASS | 20 of 20 within 2 percent, worst 0.26 percent (C15), zero disagree. 0 of 320 mismatches on 60 random resistor networks. |
| Device-model fidelity against realistic SPICE models | FAIL | 10 of 20 within 2 percent, 14 of 20 within 5 percent, 6 off by more than 10 percent (C16 229.6, C20 41.1, C15 20.8, C08 12.5, C14 12.4, C13 12.3). Under the fail line (more than 5 disagree) this is a FAIL. The failures are not explained away: they come from fixed-Vf LEDs, a single-slope diode, a saturating-switch BJT and the motor stall model, and the BJT cards are my own generic choices. |
| Transient accuracy, part (b) | INCONCLUSIVE | Not measured. No transient script exists in `src/`. Trapezoidal RC, RLC and buck waveforms at a 1 us step are untested. |
| Phone timing | NOT TESTED | Only Chromium 4x and 6x CPU throttle and unthrottled WebKit. Largest repo circuit is 0.45 ms at 6x against a 16 ms frame. |

How to read it:

- "Matched" means ngspice was given the solver's own piecewise-linear models, with a gmin shunt on every node (`src/spice.mjs`). The same equations are solved twice, so 20 of 20 at around 1e-10 percent proves the linear algebra, the junction-state iteration and the source models are implemented correctly. It does not show the device models are accurate.
- Applying the exit condition (within 2 percent on 18 of 20, fail if more than 5 disagree) to realistic models gives FAIL, because 10 disagree.
- The 2N2222 is not reachable in any shipped figure (see above), so C16 and C17 test a part that no lesson uses today.
- Consequence for the architecture: keep the in-house engine for real-time DC on lesson-size circuits, but do not claim SPICE-level device accuracy. Keep part (b) and the device-model decision open (see "What this means for the architecture").

## Caveats

- Not tested: MOSFET switch, buck converter, linear regulator (the Uno regulator lives in the power model, not the solver), PWM-averaged slices, servo, TMP36, buzzer, stepper driver, reverse-biased and inverted-transistor modes, thermal burn-out logic. The solver has no MOSFET or buck model, so those cannot be expressed.
- The realistic BJT cards are my own generic choices, not a vendor SPICE model. The realistic LED card is anchored at 20 mA with N = 2, also a choice. A different anchor shifts the realistic errors by a few percent. Read the realistic column as "how far a typical exponential model is", not as ground truth.
- The motor current in matched SPICE is a `pwl` table of the part's own steady-state function. Negative voltage is crude (a straight line from -10 V), unused in these tests.
- Rails come from the page's power model. For C20 I reset the rails and pin states to nominal for the solve, because the page browns out after its first frame and then scales the 5V rail by 0.42. The first-frame 2091 mA matches the page's own brownout message.
- Phones and Chromebooks were not available. 4x and 6x CPU throttling in Chromium is an approximation, and WebKit was not throttled. The device question stays open, though the headroom is large (largest circuit 0.45 ms at 6x against a 16 ms frame).
- Timing is for one solve with the netlist rebuilt each call, the way the app runs it. It does not include rendering, the bench report, or the power model.
- Another spike lane was running; load was 6.1 to 6.3 for the browser timings, 2.6 to 3.7 for the earlier runs.
- The first stage of this spike used the Uno R3 breadboard layout only. The `half` breadboard strips limit a node to five part legs, which constrained the random-network generator to at most three resistor ends per node.
- RS-08 part (b), transient accuracy of trapezoidal RC, RLC and buck waveforms, was not run. The independent check confirmed no transient script exists in `src/`; the only hits for "tran" are in `spice.mjs` and `scan.mjs`, and the scan times DC solves only.
- Convergence: ngspice printed "gmin stepping failed" on some realistic circuits and finished with source stepping. Realistic results needed convergence help.
- The independent check did not re-run `timebrowser.mjs`, so the browser timings are unchecked by a second party. The accuracy counts were reproduced exactly (`matched pass 20 realistic pass 10`, and the committed `data/results.json` recomputes to the same counts, at load average 3.66).

## What this means for the architecture

HYPOTHESIS, except where the numbers above settle it.

Settled: the in-house MNA engine is arithmetically correct for DC (10 digits against ngspice on 80 circuits, hand-made and random) and is fast enough that frame time is not a concern at lesson scale (0.45 ms for the largest circuit under 6x throttle). That supports D2's "keep a small in-house MNA engine for real-time pages". Not settled: accuracy against real components. The piecewise-linear LED, diode and transistor models differ from realistic SPICE by 12 to 21 percent in the low-current LED, 1N4007 and TIP120 base cases (C08, C13, C14, C15) and by up to 41 percent on the stalled-motor brownout (C20), although the verdicts (lit, dim, clamped, brownout) stay the same. The hypothesis is that D2's "ngspice as the checker" split is right in this form: use ngspice WASM on demand to cross-check each lesson circuit, with a per-circuit tolerance (say 5 percent for resistor and LED lessons, wider for transistor and motor lessons), rather than spend effort on exponential models inside the real-time engine. If the product wants to claim "within 2 percent of SPICE" for LED and diode lessons, the cheapest fix is a Shockley diode in the existing iteration loop (the part file already has the fit), which the junction-state loop could host with a Newton step. Parallel LEDs and parts that differ unit to unit are a limit of fixed-Vf models and would need per-part variation, not a better solver. MOSFETs, PNPs, capacitors and inductors would be new solver work (RS-08 part b covers the transient side).

## How to reproduce

Needs Node 24, python3, the repo at `/Users/amar/Codes/ak/simlab` (read-only) and the scratch folder.

```sh
mkdir -p /Users/amar/iynk-master-plan-scratch/spikes/RS-08 && cd /Users/amar/iynk-master-plan-scratch/spikes/RS-08
npm init -y && npm i eecircuit-engine@1.9.0 && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.64.0
mkdir -p src netlists && cp /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/*.mjs src/
cp /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/run-all.sh src/
sh src/run-all.sh
```

Headline measurement alone (accuracy, 20 circuits): `node src/compare.mjs` after the patched solver copy exists (the first lines of `run-all.sh` create it). Expected last line: `matched pass 20 realistic pass 10`.

Files in this folder: `src/` (scripts, `bench-solve.patch`), `data/netlists/` (40 SPICE netlists), `data/bench-circuits.json` (the 20 circuits in bench format), `data/results.json` (every compared quantity), `data/scan.json`, `data/timing-browser.json`, `data/random-stress.json`.

## Independent check (2026-10-27)

- Reproduced: yes. `node src/compare.mjs` printed `matched pass 20 realistic pass 10`. Tolerance: 2 percent relative with floors of 5 mV and 5 uA.
- The checker did not accept the original PASS verdict; the Verdict section above is the corrected form. The checker's findings are folded into the Verdict and Caveats.
- Realistic worst errors as re-run: C16 229.60%, C20 41.12%, C15 20.84%, C08 12.53%, C14 12.41%, C13 12.31%, C10 3.72%, C11 2.66%, C09 2.48%, C17 2.45%.
- Method is otherwise sound for the DC question: one case description feeds both the solver (the repo's own `bench-solve.js`, patched read-only to expose raw voltages) and the netlist generator, and cold and warm solves agree.

## Review fixes (2026-10-27)

| Issue | What I did |
|---|---|
| 1 [high]: Verdict said PASS while the Independent check said it does not hold; stale text about REPORT.md not existing | Applied. Rewrote the Verdict into the three-part form (linear solve PASS; device fidelity FAIL, 10 of 20 within 2 percent; transient (b) INCONCLUSIVE, not measured; no phone tested). Updated the Status line at the top to match. Deleted the two stale sentences about REPORT.md not existing and not being created, and the Problems list that repeated them. Folded the remaining findings (part (b) has no script, convergence help needed, timings not re-run, phone question open) into Caveats. Checked against `02_RESEARCH/TECHNICAL_RESEARCH.md` spike 6 exit condition quoted in this report. |
