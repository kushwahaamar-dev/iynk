# Audit: Robotics Lab

Written 2026-10-24 15:20 CDT by the robotics auditor; read-only. tsc: 16 robotics errors (all esp32-s3-build.ts);
vitest robotics 58/59; eslint clean; every built robotics/module figure probed with Playwright via `SL.bench.actions`;
every task's reference solution and starter run through the app's `interpRunner`.

## Bottom line

No bench can be completed end to end today. Only esp32-s3-build has content and a built figure, and an engine bug
discards its bench definition, then it sticks at its first break step. The page UI is the most finished part. Most
benches depend on engine work that doesn't exist (things on the mat, a per-bench model hook, transistor/diode/motor
solver types). 6 of 13 benches have only research and fact sheets (all fact sheets exist in docs/facts).

## Per bench

| # | Bench | Bench figure | Needs | TS content | en JSON | In app |
|---|---|---|---|---|---|---|
| 01 | uno-r3-build | yes; strip → pick&place+reflow → low → tall → solder → chip → plug → upload → exploded all work; DIP-socket refusal fires | uno-r3 ok | **no**; pieces salvaged in `docs/audit/salvage/item-uno-r3-build/` (parts, faults, modes, steps; missing status, current, tasks, quizzes, export) | **yes, complete**: 25 steps, 13 faults, 2 tasks incl. reaction timer, 5 quizzes incl. DIP / pin 13 / 16U2 / brown-out | 404, card unlinked |
| 02 | led-resistor | yes; 220 Ω/1 k/10 k/bypass; meter 13.6/3.0 mA; Ohm's-law serial | none | no | no | no |
| 03 | transistor-switch | **no** | nano, tip120, diode ok; tt-motor, aa-holder-4 missing; solver lacks npn/diode/motor | yes (23 steps, 11 faults, 4 tasks, 8 quizzes) | yes | no figure |
| 04 | esp32-s3-build | yes, but **bench definition discarded** | esp32-s3-devkitc-1 ok | yes, **16 type errors** | yes (17 steps, 6 faults, 4 tasks, 6 quizzes) | steps 1–7 work, stuck at break-r17; upload-wifi/upload-sleep wait for tasks.wifi/asleep that never appear |
| 05 | tb6612fng | **no** | module figure yes (modes match); no Nano/motors/LiPo on the mat | yes (19, 7, 2, 4) | yes | 404 figure; 1 failing test; `levels.*` never reported |
| 06 | l298n | no | module figure yes | no | no | no |
| 07 | a4988 | no | module no; nema17, multimeter missing | no | no | never started |
| 08 | pca9685 | no | module no; servo-sg90 exists | no | no | never started (arm task home) |
| 09 | mpu6050 | no | module no | no | no | never started |
| 10 | hc-sr04 | no | module no | no | no | never started |
| 11 | qtr-8rc | no | module no | no | no | never started (line-follower home) |
| 12 | lm2596 | no | module no; lipo-2s, tt-motor missing | no | no | never started |
| 13 | pi5-ros2 | **no** | **no figures/boards/pi4-pi5.js** | yes (16, 10, 3, 7) | yes | no; 0/3 task solutions pass |

Brief coverage: build workflow works in the engine (Uno, ESP32, LED trainer) with sfx names; DIP rule works in the
figure but is unreachable (no uno-r3-build.ts); breaks trigger in figures (Uno brown-out loop, reversed ZU4, reversed
jack blocked by D1, ESP32 brown-out) but "part left out" faults are invisible to the page; status formats supported;
serial works for ESP32; current model in `src/lib/robotics/current.ts`; ESP32 reaction-timer task passes; **line
follower and simple arm missing**; quiz after each major step implemented; original quiz Qs: 2 present, 2 only in Uno
JSON; **no sound** (the sound agent wrote nothing; BenchWorkspace ignores figure sfx; flags exist without a toggle).

## UI (ui:robotics)

Done: index (13 benches by month; links only loadable ones), bench page, BenchWorkspace, StepsPanel (strict order,
refusals), StatusPanel, SerialPanel (serial, notes or SSH), ModesPanel, QuizPanel, FaultsPanel, TasksPanel (plain
textarea), keyboard help, store/steps/checks/current/status/headless runner (`src/lib/robotics/headless.ts`; interp
still doesn't export runHeadless/evaluateChecks), e2e/robotics.spec.ts (6 tests, not run).
Problems: es/fr/de/zh/hi robotics strings are English copies (233 keys); fixture-preview route still present; dev log
showed `InvariantError: Route "/[lang]/robotics/[bench]" did not produce a static shell` (not checked vs next build);
no src/i18n/figures.

## Gaps

BLOCKER
- B1 esp32-s3-build.ts:176 `Omit<Check,'label'>` on a union keeps only `kind` → 16 errors. Fix:
  `type CheckNoLabel = Check extends unknown ? Omit<Check,'label'> : never`.
- B2 figures/engine/bench.js:808 applies the board variant patch after merging the bench; esp32-s3-devkitc-1.js:224
  `patch: () => build('v1.1')` returns a fresh board, wiping the bench (same will hit pi5-ros2). Apply the variant first.
- B3 `missing:<part>` faults remove the part and unplug power but never appear in state (bench.js:366); steps.ts
  `faultPresent` has no missing-part fallback. Freezes esp32 break-r17, Uno chip/resonator/fuse/bridge-missing,
  likely transistor-switch no-flyback/no-base-resistor.
- B4 uno-r3-build.ts missing (headline Uno build, DIP rule, 2 original quiz Qs, Uno reaction timer).
- B5 no bench figure for transistor-switch, tb6612fng, pi5-ros2.
- B6 engine lacks boards/parts on the mat with wires, one supply → several rails, a per-frame model/readings/tick hook
  (item-tb6612fng 1–4, item-pi5-ros2 1–2), solver types npn, diode, motor, servo, stepper (bench-bb.js:58–60).
- B7 8 of 13 benches without content; 6 module figures missing.
- B8 no Pi 4/5 board figure (needed for Fig 13 and Board Lab #10).
- B9 line-follower and simple-arm tasks missing. B10 no sound.

MAJOR
- M1 two check evaluators disagree (tb6612fng.test.ts:165 fails one-turn; app checks.ts passes it but fails
  five-speeds on 2 PWM checks). Unify on one.
- M2 reference solutions failing in the app runner: transistor-switch/pulse, esp32/web-led (3 serial), tb6612fng
  five-speeds (2 PWM), all 3 pi5 tasks (serial 0/19; `ImportError: no module named 'rclpy.executors'`).
- M3 status keys no figure reports (tb6612 levels.*, pi5 meas.U1/U4/FAN, transistor-switch meas.Q1/M1/BT1).
- M4 mat parts missing: tt-motor, lipo-2s, aa-holder-4, nema17, multimeter.
- M5 no bench text outside English; UI strings and figure strings untranslated.
- M6 esp32 `headers` step fits only j1 (J3 by hand). M7 possible prerender error on the bench route.

MINOR: tasks editor not highlighted; fixture-preview; prompt records missing (led-resistor, uno-r3-build,
esp32-s3-build, tb6612fng and l298n modules); Uno 20 V jack runs normally (check `jack-too-high`); leds.L/ON label
workaround pending; docs/requests/item-led-resistor.md referenced but missing.

## Open requests

ui-robotics (interp exports; worked around), engine-bench figure strings, item-tb6612fng 1–4, item-uno-r3-build
engine items 1–10 (Y1 as THT crystal, all-low/all-tall buttons, cap pick&place ~3 s, refuse upload when chip not
running, VIN reverse polarity burns the regulator, PC1 fault only when rail live, literal serial banner, missing
faults in state, fault labels in Break it, breadboard ids colliding with designators) plus its step-logic fix for
ui:robotics, item-pi5-ros2 1–5 (readings/tick, variants keep functions, Pi 5 ids, rclpy subset), parts-drivers §1–2
(solver types, mat bounds), parts-inputs §3 (buzzer/tone sound).

## Estimate (~60–65 agent-hours in full)

Types + one evaluator 0.75; B2 0.25; B3 0.25; model hook 1; mat + wires + multi-rail 2; solver types 2; 5 mat parts
2.5; uno-r3-build.ts 1.5; led-resistor 1.5; esp32 retest 0.5; transistor-switch figure 2; tb6612fng figure 1.5;
l298n 2.5; Pi 4/5 board 3; pi5-ros2 2.5; 6 new benches ~24 (≈4 h each); line follower + arm 2; sound 2.5; UI
translation 1; bench prose translation 4–6; prompts/temp route/e2e 1.
Suggested order: engine B2, B3, model hook first (~1.5 h); in parallel uno-r3-build, led-resistor, esp32 retest,
sound, UI translations; then tb6612fng and l298n on their module figures; last a minimal path for the 6 new benches
and pi5-ros2 (riskiest). Line follower on qtr-8rc, arm on pca9685; fallback: both on tb6612fng.

## Risks

One undetectable fault caps a bench below 100% (strict step order). The engine is the critical path (9 of 13 benches).
Two evaluators → a passing unit test doesn't prove the app accepts a task. Possible prerender error. Missing
translations 404 silently. Interpreter gaps (rclpy.executors, simulated Wi-Fi for web-led).
