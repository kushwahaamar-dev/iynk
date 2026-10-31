# Browser walk: the product as a new user sees it

Label: validate:browser-walk. Run on 2026-10-27, 11:47 to 12:10 CDT, by a Sonnet 5.5 agent driving Playwright (Chromium) against the keyless production build in `.next-audit` (audited commit `bb546d6`). Nothing in the repo was changed except this file.

## Setup and honesty notes

| Item | Value |
|---|---|
| Servers | Keyless on port 47311 (steps 1 to 15). Keyed on port 47312 (step 16 only). Both killed afterwards (`lsof` on both ports empty, no Chromium left). |
| Keyless `/api/status` | `{"ai":false,"image":false,"voice":false,"search":false,"solana":false,"db":false,"realtime":false,"gemini":false}`. VERIFIED with curl before starting. |
| Keyed `/api/status` | `ai`, `image`, `voice`, `search`, `gemini` true; `solana`, `db`, `realtime` false. VERIFIED. |
| Machine load | 1-minute load average 3.6 at start, 2.1 at end (`uptime`). This was a quiet machine, unlike the e2e run (load about 110). Timings below are not under contention. |
| Browsers | Desktop 1440x900. Phone is Playwright's `devices["Pixel 7"]` (412x839 CSS px, dpr 2.625, touch). All of this is Chromium. A second pass in WebKit (Safari 26.0 engine) at desktop size and with the iPhone 14 descriptor is in "Gap fixes (2026-10-27)" at the end. |
| Scripts and shots | `/Users/amar/iynk-master-plan-scratch/audit/browser-walk/walk-2026-10-27/` (scripts `p*.mjs`, `k*.mjs`; 82 files in `shots/`). |
| Console and network | Every script recorded console errors, page errors, failed requests and HTTP 4xx/5xx. Across the whole keyless walk: **0 page errors, 0 failed requests, 0 console errors**. The only console output was one Chrome warning, "resource ... was preloaded using link preload but not used" for `_next/static/chunks/3ykmb02wbs_hw.css` (every lab page; harmless). Keyed run: the 429s in step 16. |
| "Time to interactive" | Not a lab metric. I report `domInteractive` and `load` from the Navigation Timing API, plus the time until the code editor or figure readout was usable. |
| Not tested | Cross-device sync through the relay (needs `NEXT_PUBLIC_REALTIME_URL`; the relay's own 39 tests are in `runs/COMMANDS.md`). Wallet, Solana, database leaderboards. Live prices (see step 16: the keyed check did not reach SerpApi). Screen readers. Firefox (not installed, see Gap fixes). A real iPhone or iOS Safari (the WebKit pass uses the macOS build). |

## Summary

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Landing, language redirect, theme, live figure | PASS | `/` gives 307 to `/en`; `Accept-Language: hi` gives 307 to `/hi`; light theme; live Uno figure in an iframe. `shots/01-landing.png` |
| 2 | Blink: run, serial, LED, checks, pass | PASS, with 2 gaps | Starter code already passes all 3 checks. No solution control in the Blink UI. Code is not kept on reload. `p4.mjs`, `p6.mjs` |
| 3 | Break it | PASS | "LED with no resistor" burns LED1 in the figure, explanation shown. `shots/03-break-first.png` |
| 4 | Unsupported code | PARTIAL | Pointers, undeclared names, type errors, missing loop: clear messages with line. Templates: generic "cannot run in this build" and the real reason is discarded. Unknown `#include` is silently accepted. `p9.mjs` |
| 5 | Infinite loop, no delay | PASS | UI stays responsive (stop in 47 to 77 ms, 60 frames per second). Nothing reported. `p10.mjs` |
| 6 | Robotics L298N bench | PASS | 24 steps (only the 15 build-and-upload ones done, plus fault), task passes with the reference solution, 36 V fault explained. `p13.mjs`, `p14.mjs` |
| 7 | Quad5 calculator, tests, Build it for real | PASS (keyless) | Numbers recalculate; 4 of 4 safety tests; keyless real build shows catalogue prices. `p16.mjs`, `p18.mjs` |
| 8 | Fly 20 to 30 s, crash, replay, rAF | PASS, with caveats | Armed, climbed, flew 25 s, crashed, replay and "Here's why" card. 60 rAF callbacks per second. `p21.mjs` |
| 9 | Together room, two pages, one browser | PASS | Code, run, serial, fault and chat sync between two pages. Relay not tested. `p24.mjs` |
| 10 | Partner keyless | PASS (graceful) | Says it is not set up and names the keys. `p18.mjs` output |
| 11 | es and hi on a lesson | PARTIAL | Prose and figure UI translated; 12 English figure-control labels and a few figure strings stay English. `p25.mjs`, `i18n-blink.json` |
| 12 | together, passport, verify, about | PASS (graceful) | Passport and verify are dead ends keyless, by design. `p26.mjs` |
| 13 | Phone | PASS, with notes | No sideways scroll on any page walked; touch sticks exist and work; the flight HUD is cut to four values. `p27.mjs`, `p28.mjs` |
| 14 | Save and share | FAIL (absent) | Only the room link and a "Copy code" button. Edited code is lost on reload. Progress ticks persist. `p6.mjs` |
| 15 | Something the catalogue does not offer | Not possible | No custom part, no free wiring, no blank project, no board without lessons. Details below. `p29.mjs`, `p31.mjs` |
| 16 | Keyed check | Partner PASS; live prices NOT shown | The Partner answered from the real bench state. The price check never reached SerpApi because the 12-search budget was spent by opening the dock on Blink. |
| - | `]` shortcut (e2e failure) | Works by hand, 5 of 5 | See the note after step 2. |
| 17 | Verilog, MicroPython, Python and ESP32 lessons: Run, checks, break a line | PASS (Chromium and WebKit) | basys3 `blink`, pico `blink`, pi4-pi5 `blink`, esp32-devkitc `blink`: each reaches "All checks pass", "Done 1/N", and shows a line-level error for broken code. Gap fixes, part 1. |
| 18 | Drone bench by hand (racer): build, safety tests, Betaflight CLI | PASS, with one silent refusal | 12 of 13 parts by hand, 5 of 5 tests Passed, props only after unplugging the pack, CLI rejects bad commands. Gap fixes, part 1. |
| 19 | WebKit (Safari engine), desktop and iPhone 14: Blink, L298N, Fly, rooms, phone layout | PASS, 0 console errors | Same results as Chromium. Fly differs in altitude and frame rate (see part 2). |
| - | Firefox | Known limit | Not installed. |

## Step 1: `/` with no cookie

- VERIFIED: `curl -sI localhost:47311/` returns `307 Temporary Redirect`, `location: /en`. With `Accept-Language: hi-IN,hi;q=0.9` it returns `location: /hi`. Browser with no cookies ended on `/en` in 217 ms; no cookie was set (`ctx.cookies()` empty).
- VERIFIED: `domInteractive` 36 ms, `load` 205 ms on `/en`. Title "iynk · Explore · Understand · Build". `<html lang="en">`, `data-theme="light"`, body background `rgb(242, 239, 231)` (warm paper). The headless browser reported `prefers-color-scheme: dark` false, so "light by default" is not tested against a dark-OS visitor.
- Content: H1 "Learn hardware by building it"; three lab cards (12 boards, 13 benches, 13 drones, matching the 12 / 13 / 13 I counted in steps 2, 6 and 7); "In every lab" four features; "Nobody has to build alone" (rooms, a lab partner, six languages); two calls to action.
- The live figure is an iframe `/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink&lang=en` titled "Arduino Uno R3 running Blink on a breadboard, live: drag to turn it". It renders the board and breadboard with labels LED1 and RES1 220 Ω. Evidence `shots/01-landing.png`.
- The landing page says Muse Spark finds "a build buddy". Keyless that feature is off (step 12).

## Step 2: Boards, Uno R3, Blink

| Action | Result |
|---|---|
| `/en/boards` | 12 board cards with lesson counts "0/16, 0/4, 0/7 ..." and "Assembly not done". `load` 70 ms. |
| `/en/boards/uno-r3` | Figure, 16 lessons, Assembly, Break it, Key facts tabs, pinout. `load` 140 ms. |
| `/en/boards/uno-r3/blink` | `load` 164 ms; CodeMirror editor usable 253 ms later; readout usable at once. |
| Before Run | Figure shows "ON LED on, L LED on, TX off, RX off, LED1: lit, 12.2 mA". The serial monitor says "Stopped. Your code isn't running yet." |
| Press Run | Status "Running" after 1.57 s (a scripted "Compiling... Uploading to Arduino Uno R3... Done uploading." sequence). |
| LED state | D13 and the readout toggle every 500 ms, sampled at 14 points: `D13=1 ... LED1: lit, 12.2 mA`, then `D13=0 ... LED1: dark`, alternating. The Uno's own L LED follows. |
| Serial monitor | Blink prints nothing; it shows only the three upload lines. |
| Checks | The starter code passes all three checks ("runs 8 s", "D13 toggles at least twice, 50 ms to 2 s per cycle", "LED_PIN is an output and the code turns it off") after about 8.5 s. The lesson then shows "Done 1/16". |
| Make checks pass | **The starter already passes**, so "make them pass" has nothing to fix. There is **no "show solution" control** on this lesson (`grep -i solution src/components/boardlab/*.tsx` finds nothing); the tabs are Overview, Pins, How the code works, Specifications, Hints. I made check 2 fail with `delay(5000)` (checks show "2 of 3 checks pass", the toggle check "Not yet"), then fixed it with `delay(300)` and all three passed. The check results are computed on a fixed virtual-clock script, not on the live run ("same code always gets the same result", panel text). |
| Pass state | Panel "All checks pass. Lesson done."; `localStorage["iynk:v1"]` gets `{"done":{"board:uno-r3:lesson:blink":true}}`; progress "Done 1/16". |

Whether it works: yes, the loop from code to pin to figure to check is real and fast. Merely present: the Break it list, the quiz and the hints were not exercised beyond opening them.

Small defects seen:
- Running a sketch that works leaves the status "Running" forever (no auto-stop); pressing Run again stops it. When I edited code while running, the run kept the old program until I stopped and pressed Run again. A learner can think the edit applied. (VERIFIED, `p5.mjs`: after my first "fix" the click stopped the run.)
- The checks panel shows "Not checked yet" until the run reaches about 8 s; mid-run it shows partial results "2 of 3 checks pass". Fine, but there is no hint that the third check needs the full 8 s.

### The `]` next-lesson shortcut (e2e failure)

I checked by hand, five times: (1) nothing focused, `]` goes to `/en/boards/uno-r3/button`; (2) click the editor, press Escape, `]` goes to `/button`; (3 to 5) the exact e2e sequence (blur, Space, Space, Run button Enter, Enter, blur, `?`, Escape, `]`) three more times: all three reached `/button`. After Escape closes the dialog `document.activeElement` is `BODY`, so the handler is not blocked by the editor. **Conclusion: the e2e failure at `e2e/boardlab.spec.ts:171` does not reproduce on a quiet machine (5 of 5 pass at load 3 to 4).** The e2e ran at load about 110. HYPOTHESIS: a lost keypress or a slow first hydration under load, not a logic bug. It is still a flaky test, because the test does not wait for anything between Escape and `]`.

## Step 3: Break it

Break it tab lists 15 faults ("LED with no resistor", "LED in backwards", then 13 more on the board: reverse polarity, 24 V on the barrel jack, motor on 5V, cold joint, missing resonator, 328P backwards, shorts and so on). I triggered "LED with no resistor" (`shots/03-break-first.png`).

- Figure: the readout changes to "LED1: burnt out"; the figure label reads "LED1 · burnt", and "RES1 · 1 Ω" (the resistor is removed in effect); a banner "LED1 burned out: 113 mA is far above its 20 mA". Damage is shown.
- Explanation card (verbatim): "What you see: The LED flashes very bright once, then stays dark for good. D13 may be weaker afterwards." "Why: Without a resistor, only the pin's own driver limits the current: about (5 - 2) V / 26 Ω = 115 mA, far past the LED's 20 mA and the pin's 40 mA maximum." "Fix: Put a 220 Ω resistor in series ... Pick 220 Ω again to clear it here." There is also a Repair button.
- Small inconsistency: 113 mA in the banner (computed) and "about 115 mA" in the prose (hand-written). Low.
- On the L298N bench the same pattern works (step 6).

## Step 4: Unsupported code

Each case typed into the Blink editor, Run pressed, result read after 2.8 s (`p9.mjs`).

| Code | What the UI said | Quality |
|---|---|---|
| `template<typename T> class Box {...}` | Serial: "This code cannot run in this build." No red code error, no line, no reason. | Poor. The parser knows why: `src/lib/interp/arduino/parser.ts:433` throws `unsupported('templates', ...)`, but `src/lib/boardlab/run.ts:176` replaces any `unsupported` error with the generic string and `src/components/boardlab/CodePanel.tsx:79` hides it from the error box. VERIFIED. |
| `int *p = a; p++; *(p+1)` | "Line 1: pointers (int*) are not supported, except const char* text and library objects" then hint "use an array and an index, or a reference parameter (int &x)". Serial shows "1:61 ..." | Good: says what, where, and what to do. (The line number is 1 because my code was on one line; the column is given in the serial copy.) |
| `String s; s.toUpperCase(); s.length(); s.substring(1,3)` | Runs. Output "HELLO", "5", "EL" (correct). | Works. String methods are supported (the task list asked if they might not be). |
| `#include <NoSuchLib.h>` | **Runs without any error**, prints "hi". | Poor: a real Arduino compile fails. The include is silently ignored. |
| `#include <Servo.h>` + `Servo s; s.attach(9)` | Runs, prints "servo ok". | Works. |
| `frobnicate(3);` | "Line 1: 'frobnicate' was not declared" | Good. |
| `int x = "text";` | "Line 1: expected a number but got text" hint "use atoi() or String(...).toInt()" | Good. |
| No `loop()` | "the sketch has no loop() function" hint "add void loop() { } even if it stays empty" | Good. |

Summary: 5 of 7 failure cases give a good message; the two bad ones are the ones a learner most needs to be told about (templates: an advanced feature the product silently refuses; unknown includes: the product accepts code a real board would reject, which teaches a wrong lesson).

## Step 5: Infinite loop without `delay()`

Three programs (`p10.mjs`), each run 2.5 s then measured for 3 s:

| Program | rAF frames in 3 s | Longest frame gap | Stop click | Reported |
|---|---|---|---|---|
| `loop(){ n++; if (n % 100000 == 0) Serial.println(n); }` | 181 | 17 ms | 77 ms, status "Stopped" | Serial prints 0.197, 0.393 ... as simulated seconds per 100000 iterations (so one iteration costs about 2 µs of simulated time). No warning. |
| `setup(){ ... while(true){} }` | 181 | 17 ms | 47 ms | Prints "start", then nothing. No hint that setup never returns. |
| `loop(){ digitalWrite(13,HIGH); digitalWrite(13,LOW); }` | 177 | 50 ms | 74 ms | Nothing printed. |

The UI stays responsive in all three (about 60 frames per second, stop works). It reports nothing: no "your loop never delays" or "stuck in setup" help. The earlier unit-test timeouts (`octo`, `basys3`) are about simulation speed on long scripted scenarios, not this.

## Step 6: Robotics L298N bench

`/en/robotics` lists 13 benches (VERIFIED by `a[href*='/robotics/']` count 13). `/en/robotics/l298n` loads in `load` 32 ms. It starts fully built and running ("Bench Running, 7.4 V, 380 mA, forward: IN1 H, IN2 L, IN3 H, IN4 L" in the serial monitor). Tabs: Steps 0/24, Break it, Status, Quiz 0/4.

- Assembly: "Do it" is a scripted performance, not a user build. Step 1 "Strip to the bare PCB" removes every part (status "Off, 0 mA", `shots/06-l298n-step1.png`). Each "Do it" then plays an animation that refits parts. Timings from my loop: step 2 about 4.6 s, step 3 about 25 s, step 5 about 4.6 s, the rest 0.5 to 1.7 s. Steps 1 to 15 completed (counter "15/24"; "Power the bench" brought the bench back to "Running, 380 mA" and also counted the Forward upload). The learner can do the steps by hand in the figure (Remove a part, Place a part, solder), but the walk used the "Do it" shortcut. Only one "Do it" button is visible at a time; a trap for scripts, since every row has a hidden button with the same label.
- Run the task: "Soft start on ENA" (starter code fails 4 of 8 checks, `Pass`/`Fail` per check). "Load the reference solution" is exposed, then "Run checks": "All 8 checks pass. Task done." in about 9 s total; header shows "1/2 tasks". Unlike Blink, this UI does expose the solution.
- Fault: Break it tab lists 8 faults. "36 V on +12V": status "Fault", banner "36.0 V on Nano on USB, 2S LiPo on +12V: 78M05 5 V regulator (logic supply) is damaged", battery "36 V, 60 mA", motors 0 rpm, figure text "Fault: unplug and repair", with a "Symptom ... Why it happens ... Repair" card (`shots/06-l298n-fault-36v.png`). Works and is clear.
- Step counter note: the header count "1/30" and the "0/24" tab count are different totals (steps, tasks, quizzes); nothing explains 30.

## Step 7: Quad5

`/en/drones` lists 13 crafts. `/en/drones/quad5` loads in `load` 53 ms. The Design tab has **three selects**, each with exactly three options: battery (6S 1100, 6S 1800, 4S 1500), motors (2306 1750KV, 2207 1950KV, 2306 2450KV), props (5x4.3x3, 5.1x2.5x3, 5x5x3).

| Change | All-up weight | Thrust:weight | Hover time | Max current | Checks |
|---|---|---|---|---|---|
| Default | 514 g | 12.5 : 1 | 12.3 min | 144 A | "Parts match. Good all-round build." |
| Battery 6S 1800 | 618 g | 10.4 : 1 | 16.8 min | 144 A | OK |
| Battery 4S 1500 | 518 g | 5.5 : 1 | 11.1 min | 96 A | OK, although 5.5:1 is weak for freestyle |
| Motors 2306 2450KV | 510 g | 24.6 : 1 | 12.4 min | 283 A | **Problem**: "2,450 KV on 6S spins the props far past what the motors and ESC can take"; **Warning**: "Each motor pulls about 71 A ... more than its 45 A ESC is rated for." |
| Props 5x5x3 | 523 g | 16.7 : 1 | 10.6 min | 224 A | Warning: 56 A per motor over the 45 A ESC |

The numbers move in sensible directions and the cost table follows (electrical $287 default, $295 with the 1800, $279 with 2450KV). Whether the values match reality is out of scope (it is a model; HYPOTHESIS that 24.6:1 and 283 A are only meaningful as a warning).

Build and tests: "Build it for me" fitted 12 of 12 parts in about 4 s. Safety tests: smoke stopper passed; motor direction check refuses until props are off ("PROPS OFF! Never spin motors on the bench with props on" and a "Take PROPS off" button), then passes; accelerometer calibration passes; failsafe test passes. "Tests 4/4" (`shots/07-quad5-tests-all.png`). The figure enforcing the order is the product's best teaching moment.

"Build it for real" (keyless), in Lab tools: "Live prices aren't set up on this deployment. The optimiser below works with the catalogue's prices instead." Parts list at catalogue prices, "Catalogue total $346.00" (matches the Design tab total, $346). Budget optimiser works offline: "Cheapest safe build: $330.00", "calculator checked 27 combinations", "For $8.00 more: thrust-to-weight 12.8 and 6.0 min of flight". Rendered in 3.0 s after clicking the tab. The dock shows three tabs here: Partner, Together, Build it for real (Passport and Hardware tabs from `common.json` are not shown on this page).

## Step 8: Fly

`/en/drones/quad5/fly` loads in `load` 56 ms. Options: flight mode select (altitude hold, angle, acro, gate race angle and acro, bando range, autopilot demo), Arm, Reset, FPV goggles, Wind, Gamepad, Controls; courses (Gate race, gold 10 s, Freestyle bando), a "Break it" list of 5 mistakes, 8 arming rules (8/8 OK on this page), a daily challenge, a leaderboard that says "Leaderboards aren't set up here ... your laps stay on your device".

Flight, desktop (`p21.mjs`): clicked the range, Space armed it ("Armed. Fly through the gates in order"), held `w` 2.5 s: altitude reached 24 m in the first run. I flew about 25 s with W, A, S, D and arrows. Messages seen: "Height limit for this field: 16 m", then "Out of the field: turn back or press R" (I flew away from the gates blind; no gate passed, lap time not started). Then `s` (throttle down) plus ArrowUp: "Crashed into the ground: props broken. Press R to reset" after 4.5 s, state "Crashed", crashes 1. A card "Here's why: It hit the ground at 12.4 m/s, and the frame and props take about 3 m/s. With a manual throttle you catch the fall yourself ..." with a button "Switch to Altitude hold (easy) and go again", and "REPLAY x1/3" and "Replaying in slow motion..." (`shots/08-fly-crash-1s.png`). The crash, explanation and replay all work.

requestAnimationFrame counts (wrapper installed with `addInitScript`, counting callbacks that ran):

| State | Page frame, callbacks per 5 s | Range iframe, callbacks per 5 s |
|---|---|---|
| Idle, disarmed | 300 (60 per s) | **0** |
| Armed and flying | 300 | 300 (60 per s) |
| Crash and replay window (3 s) | 180 | 180 |

So the page itself runs a 60 per second rAF loop even when nothing moves (HYPOTHESIS: HUD or a shared ticker; not traced to a source line). The range loop pauses when disarmed. `performance` implications are for PERFORMANCE_BASELINE.

Caveats: (a) keyboard flight without a camera that follows the craft is hard for a new user; I flew off the field twice. The field has a "16 m height limit" message, yet the phone run reached 33.6 m, so the limit is a warning, not a limit (VERIFIED in `13-phone-fly-drag.png`: HUD 33.6 m beside the banner). (b) I did not complete a gate. Gate race and bando medals were not tested.

## Step 9: Together, keyless

Without a relay URL the dock says "This deployment has no relay server, so rooms work between tabs of this browser only." (VERIFIED on the page.)

1. Page A on the Blink lesson: Lab tools, Together, "Start a room", enter a name, "Join the room". The URL becomes `/en/boards/uno-r3/blink?room=urbnaj`. Room panel: "Room urbnaj, This browser only", Invite, Change name, Leave room, role buttons (Wirer, Coder, Pilot, Watcher), "You have the keyboard", room chat. 2.6 s from click to joined name form.
2. Page B (same browser context) opened that URL: joined in 2.8 s, "2 people here", "Ann has the keyboard", "Ask for the keyboard".
3. A typed new code: B's editor showed it within 1.5 s. A pressed Run: both showed "Running" and the same serial lines ("from A"). A triggered a Break it fault: both figure readouts changed identically ("LED1: not connected"). A sent chat "hello from A": B showed it. B pressed "Ask for the keyboard": A saw "Ann wants the keyboard", "Pass the keyboard to Ann", "Pass" (the baton works).
4. **B edited code without the keyboard: the edit stayed local.** A's code did not change; B's did. The two screens silently diverge, with no warning near the editor (VERIFIED, `p24.mjs`). The room protocol says non-holders cannot change the build ("shared-actions.ts" header), so only the editing side shows the symptom.
5. Both tabs show the same name ("Ann") because identity is in shared localStorage; that is a limit of the single-browser fallback, not a bug.

Plainly: **cross-device sync through the relay was not tested here.** The relay's own 39 tests are in `runs/COMMANDS.md`.

## Step 10: Partner, keyless

Dock, Partner tab: "Lab partner. Muse Spark, hints first, friends first. The lab partner isn't set up on this deployment. Everything else in the lab works without it. The partner needs a Meta Model API key or a Gemini API key on the server." Graceful: no spinner, no broken chat box, the reason is named. The "Build Buddies and the Build Night planner need the AI service, which isn't set up on this deployment" note also appears on `/en/together`.

## Step 11: Spanish and Hindi on Blink

Method: collected all text nodes and `aria-label`, `title`, `placeholder` attributes from the page and the figure iframe in en, es and hi, and compared (`p25.mjs`, data in `i18n-blink.json`). Script text was filtered out.

- Titles: "Haz parpadear un LED", "LED ब्लिंक कराएँ". `<html lang>` is `es` and `hi`.
- Page: 367 (es) and 364 (hi) strings. Identical to English: code tokens (`const`, `int`, `pinMode`), brand and part names, language names, and **12 figure-control labels** that stay English in both languages: "Power", "Upload sketch", "Press RESET", "Strip to bare PCB", "Pick & place SMD", "Place a part", "Solder joints", "Remove a part", "Break it", "View", "See-through", "Labels". These appear in the page's "Figure controls" list (the accessible mirror of the figure's buttons). The figure itself shows them translated ("Alimentación", "Carga el sketch", "Deja la PCB desnuda", ...; "पावर", "स्केच अपलोड करें" ...). So it is the mirror that is not translated: an accessibility gap for non-English screen reader users.
- Hindi only: "ON LED (5 V)", "TX LED", "RX LED" and the baud list "300 baud ... 74,880 baud" stay English.
- Figure iframe: 108 strings, 29 identical to English. Most are board silkscreen (DIGITAL (PWM~), ANALOG IN, ARDUINO, ATMEGA328P-PU, pin names), which is correct. Real leaks: the toast "Powered: Blink starts" and the colour names "mustard, tomato, mint, cobalt, blush" (names in the colour chooser, likely), "Fig. 01 -".
- Lesson prose, steps, hints, checks, quiz labels and the code comments ("// how long it stays on") are translated.

Verdict: translation is broad and real, with a small residue. No page showed a missing-key placeholder. The e2e test that expects "untranslated boards" skipped for the same reason (everything exists).

## Step 12: Together, Passport, Verify, About (keyless)

| Page | What it does with no keys |
|---|---|
| `/en/together` | Works as a launcher: pick Boards, Robotics or Drones, pick what to build (12 boards listed), "Open the room"; or paste a code to join. A note says Build Buddies and the Build Night planner need the AI service. |
| `/en/passport` | "Proof of Build is not set up on this deployment. This copy of iynk has no Solana program or issuer key, so it cannot write credentials." One link, "Back to the labs". No wallet prompt was shown and none was connected. |
| `/en/verify` | The same notice. The form "Paste a wallet or credential address" is **not rendered**; the page offers nothing to verify. |
| `/en/about` | Full content: how it works, "Progress and settings are saved in this browser's local storage. There are no accounts", the three originals ("iynk started as a rebuild of three teaching sites ... reuses their facts, formulas, timings and lessons, writes all of its own code"), built-with, licences. Three outbound links to the originals on vercel.app and one to the Colorfigures page. |

All four load in 15 to 53 ms.

## Step 13: Phone (Pixel 7)

| Step | Result |
|---|---|
| 1 landing | `scrollWidth` 412 = `clientWidth` 412: no sideways scroll. 2 interactive elements under 44 px (measured with `getBoundingClientRect`, `sr-only` excluded; not identified further). |
| 2 Blink | No sideways scroll. 0 targets under 44 px. Run button 86x44. Layout stacks: figure (380x274), Run and editor, tabs, serial, then lesson info. Tapping Run works: Running, and checks "All checks pass" after 8 s. The code editor is usable by touch. `load` 249 ms. `shots/13-phone-blink-full.png` |
| 6 L298N | No sideways scroll, 0 small targets. "Do it" by tap works (1/24). Break it tab and "Trigger: 36 V" by tap worked (the Fault card shows, `shots/13-phone-l298n-fault.png`). With the first "Do it" the bench shows "No power: Power terminal +12V / GND / +5V is missing". |
| 8 Fly | No sideways scroll. HUD collapses to one row: battery, altitude, speed, gate (current, used, crashes are not shown). Two touch sticks are drawn inside the range, labelled "THROTTLE . YAW" (left) and "PITCH . ROLL" (right). A CDP touch drag up on the left stick raised altitude (0 to 33.6 m in 2 s), so the sticks work. The "Gamepad" and "Controls" buttons are 0x0 (hidden) on the phone. The sticks overlay the scene at the bottom of the range and can hide the craft and gate labels. |

Unreachable controls: none found. The main nav is behind a hamburger.

## Step 14: Save and share

- VERIFIED in `localStorage`: only `iynk:v1` (done flags, quiz, best, settings including `theme`, `sound`, `labels`, `telemetry: true`) and `iynk:telemetry:v1` (a random session id). `sessionStorage` empty. **No code is stored.**
- Reload test (`p6.mjs`): after editing Blink to `delay(300)` and passing, a reload shows the starter code with `delay(500)` again; the "Done 1/16" tick is kept.
- Ways to keep work beyond localStorage: **none.** No account, no save, no export, no project list, no download of a sketch. "Copy code" (clipboard) and "Reset code" buttons exist in the code panel. i18n has no "save project" key (`grep` of `"save|export|download|share"` in `src/i18n/messages/en/*.json` finds only Solana key export, Build Story PNG sharing, daily-challenge share text and room save-name).
- Share links that exist: (a) a room link `?room=<code>` (copy via Invite); (b) a daily-challenge "Share the challenge" text; (c) a Build Story PNG (AI-only). A lesson URL itself is shareable but carries no edited code.
- Anonymous usage counts are on by default (`telemetry: true`); no telemetry request was sent keyless (network log shows only page, figure and `/api/status` requests).

## Step 15: Doing something the catalogue does not offer

This is the key finding. What I tried and what happened:

| Attempt | What happened |
|---|---|
| Add a part not in the lesson (any lab) | **Not possible.** There is no parts palette. "Place a part" in the Uno figure is hidden (`isVisible()` false) until you "Strip to bare PCB" or "Remove a part"; its menu offers back the board's own removed parts only (reference designators ZU4, SK1, U3, Y1 ... C11, R1, RN1 ...; `p31.mjs`). It cannot add a new LED, sensor or module. |
| Wire a different pin | The breadboard LED is fixed to D13 by a drawn wire. The "Wire in" panel lists "Part pin A to D13, K to GND" as read-only information. I changed the code to use D12 (`LED_PIN = 12`): the interpreter drives D12 (pin readout "D12: LOW/HIGH") but the figure shows "LED1: not connected" and the LED never lights; check 2 fails ("D13 turns on and off ... Not yet"). The software does what a real wire would do (nothing), but the label "not connected" is misleading: the LED is connected, to D13. There is no way to move the wire. |
| Change the part values | Only what the lesson's Parameters tab offers: on/off times (50 to 2000 ms), resistor (220 Ω, 1 kΩ, 10 kΩ), LED colour (5 options). Quad5 Design: 3 batteries, 3 motors, 3 props. |
| Start a blank project | **Not possible.** No "new project" control anywhere. The nearest thing is replacing all the code in a lesson (a blank sketch runs, e.g. "only setup"), but the circuit stays the lesson's fixed circuit. |
| Use a board without a lesson | **Not possible.** All 12 boards have lessons (counts via `[data-testid=board-lessons] li`: uno-r3 16, nano 4, uno-r4 7, esp32-devkitc 5, esp32-s3-devkitc-1 4, nodemcu 4, pico 6, nucleo-f401re 5, microbit-v2 5, pi4-pi5 5, basys3 5, de10-lite 5). A board outside these 12 does not exist. `/en/boards/not-a-board` is a 404 (e2e). |
| Other code limits | C++ subset: templates and pointers refused (step 4); unknown includes ignored (step 4). |

Where the UI stops you: at the figure. Each lesson ships a fixed circuit, a fixed bill of parts and a fixed pin map; the learner changes the program, a few numeric values and the faults. That matches the architecture findings in `TECHNICAL_DEBT.md` (A4, A5, A11). VERIFIED by trying.

## Step 16: One keyed check

Server on port 47312 with the AI and SerpApi keys kept, the database, Solana and relay emptied, `SERPAPI_MONTHLY_BUDGET=12`. `/api/status` as listed above.

### Partner

I broke the Blink lesson on purpose (`LED_PIN = 12` while the LED is on D13), ran it, and asked one question: "My LED is not blinking. What is wrong?" (8.1 s to the full answer.) The app sent two `POST /api/ai/chat` requests for that one question (984 and 1332 bytes): the second carries the first answer's `highlight_part` tool call result. So one question is two model round-trips.

Request body keys: `messages, lab, itemId, bench, locale, peers`. The `bench` field is a text dump of the real state: lesson `blink`, "run: running at 6206 ms", "the learner edited the lesson code", `PASS lesson check 1`, `FAIL lesson check 2: 0/2`, `FAIL lesson check 3`, the full code, the serial lines, "pin D12 (output): HIGH", and figure state. VERIFIED from the captured request (`k2-partner-request.json`).

Answer (verbatim): "Your pin's on but the LED's dark - I'll point at the culprit." with a highlight on LED1 ("Your LED shows 0 mA - open circuit?"), then "Your code *is* running - D12 is HIGH right now. But that LED shows 0 mA and `open`, so no current is flowing through it. Where is `LED1` wired - to D12, or to another pin like D13?"

Verdict: **yes, the answer refers to the actual bench state** (pin D12 HIGH, LED1 at 0 mA, open). It points at the right part. It stops one step short: it asks the learner where the LED is wired instead of saying the lesson wires it to D13 (the lesson text and the check list, which it was given, say so). That is "hints first, friends first", as the UI promises. Evidence `shots/16-partner-answer.png`.

### Build it for real (quad5)

**Result: live prices were not shown, and no live total was measured.** Reason, VERIFIED:

1. Opening Lab tools on any page mounts all dock panels, and they fetch on mount. When I first opened the dock on the Blink lesson (`k1.mjs`), the page made `POST /api/search/offers` x2 and `POST /api/search/videos` without me asking. Each offers call prices every part of the item at three sources (`DEFAULT_SOURCES = google_shopping, amazon, ebay`, `src/lib/server/search/serpapi.ts:123,220`). This used the 12-search process budget (a second dock open for the Partner question made more offers calls).
2. When I then opened quad5's tab (`k3.mjs`), the server answered `POST /api/search/offers` four times and `/api/search/videos` once with HTTP 429 and body `{"error":{"code":"quota_exhausted","message":"This deployment's search budget is used up; cached results still work."}}` (files `k3-offers-*.json`). The panel showed every part "Catalogue price", total $346.00, "12 parts priced from the catalogue", settled in 3.4 s.
3. **The panel says the wrong thing:** it shows "Too many price checks in a row. Wait a minute, then try again." because `src/lib/search/client.ts:39` maps every HTTP 429 to `rate_limited`, including `quota_exhausted`. Waiting a minute would not help. VERIFIED.
4. Arithmetic (ESTIMATED): quad5 has 12 parts x 3 sources = 36 uncached searches for one price check. A cap of 12 can never complete one drone. The cap I was told to use is enforced by the app; I did not reset it by restarting, because that would have doubled the spend.

So the claim "live prices from Google Shopping, Amazon and eBay" is UNKNOWN from this walk (not shown working, not shown broken), and the cost behaviour is a finding: opening Lab tools spends search quota on its own, and a single check of a 12-part item needs 36 searches.

Other AI or search calls: the dock-open calls above (offers x2 and videos x1 on Blink; offers and videos again in the Partner run; offers x4 and videos x1 on quad5, all 429). I did not call any other AI route. SerpApi usage is not displayed anywhere, so the exact count is unknown, at most 12.

## What this means for the master plan

1. **The product is a guided simulator, not a workbench.** Everything I touched works, quickly (every page `load` under 260 ms on a quiet machine; Run to "Running" 1.6 s) and with zero errors. The catalogue is the limit: each lesson has a fixed circuit, a fixed part set and fixed pins. A learner cannot add a part, rewire, start blank or pick a board outside the 12 (step 15). Any plan that says "build your own project" starts with the project document and a part graph (D1 and D2 in `TECHNICAL_DEBT.md`), not with more lessons.
2. **Nothing the learner makes survives a reload.** Only done flags do (step 14). There is no save, no export, no share of work, no account. Keeping work and sharing it is the first thing a user will ask for and the first thing the data model cannot do (D3).
3. **The simulator is honest at the edges, with three gaps.** (a) Template errors hide their reason (`run.ts:176`); (b) unknown `#include` is silently accepted; (c) "LED1: not connected" for a wrong pin should say which pin the LED is on. Cheap to fix and they decide whether code feedback teaches or misleads.
4. **The e2e `]` failure is a flaky test, not a bug** (5 of 5 pass by hand at load 3 to 4). Do not spend plan time on the shortcut; fix the test (wait after Escape) and run CI on a quiet runner.
5. **Rooms work as designed in one browser.** Two pages stayed in sync on code, run, serial, faults and chat, and the keyboard baton works. The relay path is still untested here. A non-holder's edit is silently local, so the product will need a visible "you are not editing the shared copy" state before real classes use it.
6. **Keyed features have a cost problem that no keyless test shows.** The Partner works and reads the bench (it was given the real code, checks and pin state), at two model calls per question. Search is the concern: opening Lab tools triggers price and video searches by itself, a 12-part drone costs 36 searches per check, and quota exhaustion is shown to the user as a rate-limit message. A paid plan needs per-user rate limits, lazy fetching on tab open, a cache that survives restarts, and a correct error.
7. **Phone is acceptable but not designed for flying.** No sideways scroll, targets at 44 px, working touch sticks, but the flight HUD loses current, used mAh and crashes, and the sticks cover the scene. If the plan targets phones in classrooms, the flight range needs its own mobile pass.
8. **Translation is wide but the accessible layer lags.** The figure's own controls are translated; the page's "Figure controls" mirror stays English in es and hi, and a handful of figure strings (toasts, colour names) too. Worth one pass before claiming six languages for screen reader users.
9. **Failure teaching is the strongest part.** Break it on the Uno, the L298N and the flight range each shows damage in the figure and a "what you see, why, fix" card. This is the differentiator to protect when the data model is rebuilt.

## Method notes

- Server and browsers were killed at the end; `git status` shows only the files other agents added plus this file.
- `localStorage` was fresh in each script (new context), except within a script that reloaded the page on purpose.
- The main scripts are in `/Users/amar/iynk-master-plan-scratch/audit/browser-walk/walk-2026-10-27/`. Key ones: `p1` (step 1), `p4`, `p6`, `p7` (Blink and `]`), `p8` (break it), `p9` (unsupported code), `p10` (infinite loops), `p13`, `p14` (robotics), `p16`, `p18` (quad5), `p21` (flight and rAF), `p24` (rooms), `p25` (languages), `p26` (static pages), `p27`, `p28` (phone), `p29`, `p31` (catalogue limits), `k1`, `k2`, `k3` (keyed).

## Gap fixes (2026-10-27)

Run on 2026-10-27 by a Sonnet 5.5 agent, starting 12:34 CDT, against a fresh keyless server on port 47331 (same `.next-audit` build, `/api/status` all eight features false, VERIFIED with curl). The server was stopped afterwards (`lsof -i :47331` empty). Nothing in the repo was changed except this file and `REVIEW_GAPS.md`. Scripts, outputs and 60-odd screenshots are in `/Users/amar/iynk-master-plan-scratch/audit/browser-walk/gapfix/` (`walk.mjs` for code lessons, `drone.mjs` for the drone bench, `wk/` for the WebKit re-runs of `p4`, `p6`, `p13`, `p14`, `p21`, `p24`, `p27`, `p28`, outputs in `out/`).

| Gap | Result |
|---|---|
| 1. Verilog, MicroPython, Python and a drone bench were never run in a browser | Closed for one lesson of each language and one drone. Still one lesson per language, not all (see "What this does not cover"). |
| 2. Only Chromium was tested | Closed for WebKit at desktop size and iPhone 14. Firefox is a **known limit**: it is not installed (`ls ~/Library/Caches/ms-playwright` shows only chromium, chromium_headless_shell, ffmpeg and webkit-2248). |

### Part 1: other languages and a drone

Method for each lesson (`walk.mjs`): open the lesson, read the starter code from the editor, press Run, poll status and checks for 14 s, read serial, readout and progress, then replace the code with a broken version, press Run, read the error. For Python and MicroPython a second broken version (only a bad `import`) was run, because the first one hit a syntax error before anything else.

| Lesson | Language | Starter run | Checks | Progress | Broken code: what the UI said |
|---|---|---|---|---|---|
| `/en/boards/basys3/blink` | Verilog | Status "Running" within 2 s. Serial "Compiling... Uploading to Digilent Basys 3... Done uploading." Readout shows LD0, LD12 and LD15 lit at the sample time, so the counter and the blink both move. | 4 of 4 Passed ("runs for 4 s", "LD0 blinks (0.15 to 1.1 s)", "LD12 counts the blinks", "counts on posedge clk and times with CLK_HZ") by the 2 s sample | "Done 1/5" | Removed `endmodule`: "Line 2: module top is missing 'endmodule'". Checks go back to "Not checked yet". The second planted fault (an undeclared net in `assign`) was not isolated, because the missing `endmodule` stops the compile first. |
| `/en/boards/pico/blink` | MicroPython | "Running", serial "Uploading to Raspberry Pi Pico...". Readout "LED LED on, LED1: lit, 3.7 mA", later "LED off, LED1: dark". | 3 of 3 Passed ("runs 3 s", "GP15 toggles once a second", "Uses Pin(\"LED\"), not Pin(25)") | "Done 1/6" | Stray indented line: "Line 3: unexpected indent: this line is indented but nothing above opens a block", hint "remove the spaces at the start of the line". Bad import: "Line 1: ImportError: no module named 'nosuchmodule_xyz'" (no hint). |
| `/en/boards/pi4-pi5/blink` | Python (gpiozero style) | "Running", serial "Uploading to Raspberry Pi 5 / Raspberry Pi 4...". Readout "PWR / ACT LED on, D1: lit, 3.7 mA". | 3 of 3 Passed ("keeps running", "GPIO17 blinks with a steady period", "Uses LED(17), not RPi.GPIO") | "Done 1/5" | Same two messages as pico: indent error with hint, ImportError without hint. |
| `/en/boards/esp32-devkitc/blink` | Arduino C++ on ESP32 | "Running"; serial adds "Blink on GPIO23" (the sketch's own `Serial.println`). | 3 of 3 Passed ("GPIO23 blinks steadily", "prints its greeting", "output without LED_BUILTIN") | "Done 1/5" | Inserted `undeclaredThing(3);`: "'undeclaredThing' was not declared" with line and column (5:16 in Chromium). |

What is real here: all four run the learner's code in an interpreter in the page, show serial output and pin state in the figure readout, grade with the same panel as Arduino, and tell the learner the line of a mistake. VERIFIED by running them. Commands: `node walk.mjs <path> <lang> chromium desktop`, output files `out_*_chromium.txt`. Browser console: 0 page errors and 0 failed requests on all four; the only message is the same CSS preload warning as before.

Two small observations. (a) On the two Python lessons the "bad import" message has no hint line, while the indent error has one. Low. (b) The Verilog lesson was checked with one plausible mistake only; Verilog is the language where learners make the most varied errors (width mismatch, latches, blocking vs non-blocking), and none of those was tried. UNKNOWN how good the messages are for them.

#### Drone bench (no code lessons exist for drones)

Drones have no editor and no lessons: the drone `DroneContent` type in `src/content/schema.ts:792` has parts, build steps, wiring, tests, firmware snippets and courses. The nearest thing to a lesson is the bench: Build, Tests and the Betaflight CLI tab. I walked the `racer` drone (`/en/drones/racer`, tabs Design, Build, Wiring, Tests, CLI, Quiz) by hand, not with "Build it for me" (`drone.mjs`).

| Step | What happened |
|---|---|
| Build, by hand | Started at "Parts 0/13". Clicking "Add the next part" 12 times (5.5 s in total) fitted FRAME, MOTORS, 4-IN-1 ESC, MOTOR WIRES, XT60 + CAP, FLIGHT CTRL, VTX, CAMERA, RECEIVER, LED STRIP, TOP PLATE, BATTERY: "Parts 12/13". The 13th, PROPS, did not go on. |
| Props refusal | With the pack still plugged in after the tests, clicking "Add the next part: PROPS" a second time leaves the count at "Parts 12/13" and shows only a toast in the figure, "Unplug the battery first: never work on a live quad". Before the tests the toast is "Props go on LAST: run the smoke stopper test and the motor direction check first" (rule in `figures/engine/drone.js:176-194`, VERIFIED). After "Unplug the battery" the PROPS click gives "Parts 13/13". The rule is good teaching. Defect (low): the Build tab itself says nothing, the button stays enabled and the reason lives only in a toast; a learner who misses the toast sees a button that does nothing. |
| Tests | All five run and reach "Passed": smoke stopper ("The lamp only blinked: no short..."), motor direction check (M3 first spins the wrong way and is reversed, then "The props can go on"), accelerometer calibration, receiver test, failsafe test ("after 1.5 s the motors stopped and the quad disarmed"). Counter "Tests 5/5". The motor check was still "Running..." 4 s after the click. I did not measure per-test times reliably (my script waited about 30 s each), so no timing is claimed. |
| CLI | `help` lists 15 commands. `frobnicate`: "Unknown command, try 'help'". `set motor_poles = 14`: "motor_poles set to 14". `set motor_poles = 999`: "###ERROR IN set: INVALID VALUE### Allowed range: 4 - 255". `set nosuchvar = 1`: "###ERROR IN set: INVALID NAME: nosuchvar###". `get motor_poles` echoes value, range and default. `save`: "saving ... Rebooting". These are the Betaflight CLI's own wording. |
| Fly | `/en/drones/racer/fly` loads in 22 to 53 ms with one range iframe, "STATE Disarmed ... NEXT Gate 1/6". Not flown again; flight was walked on quad5 in step 8. |

Not done for drones: the other 12 crafts, the Wiring tab, the quiz, and a flight with the hand-built craft.

### Part 2: WebKit (Safari engine), desktop and iPhone 14

How it was run. The repo's Playwright is 1.64.0 and wants `webkit-2370`, which is not installed; only `webkit-2248` is (`ls ~/Library/Caches/ms-playwright`). Pointing 1.64.0 at the 2248 binary hung at launch. `playwright-core@1.58.0` lists exactly `webkit` 2248 and `chromium` 1208 in its `browsers.json` (VERIFIED), so I installed it into the scratch folder (`gapfix/pw/`, outside the repo; `npm i` there only) and drove WebKit through it. `browser.version()` returns 26.0. The iPhone 14 descriptor in that version is 390x664 CSS px, dpr 3, touch, with an iOS user agent string. The engine itself is the macOS WebKit build, not iOS Safari (see known limits).

Scripts re-run: `p4` (Blink), `p6` (save and `]`), `p13` and `p14` (L298N), `p21` (Fly), `p24` (rooms) at desktop size; `p27`, `p28`, `p4` with the iPhone 14 descriptor; plus the four language lessons (all four at desktop, pico and basys3 on iPhone) and the racer bench (desktop and iPhone).

| Check | WebKit desktop | WebKit iPhone 14 | Chromium (original walk) |
|---|---|---|---|
| Console errors, page errors, failed requests | 0, 0, 0 (one CSS preload warning, worded differently) | 0, 0, 0 (one request for the L298N figure iframe was cancelled by navigation, harmless) | 0, 0, 0 |
| Sideways scroll | not measured | `scrollWidth` 390 = `clientWidth` 390 on landing, Blink, L298N and Fly | none |
| Targets under 44 px | not measured | landing 2, Blink 0, L298N 0 (Fly buttons all 44 high; the same 2 on landing as with Pixel 7) | same |
| Blink: Run to "Running" | 1474 ms | 1553 ms | 1570 ms |
| Blink: D13 and LED1 toggle | alternates every 500 ms, 14 samples, "LED1: lit, 12.2 mA" then "dark" | same | same |
| Blink: serial | 3 upload lines only | same | same |
| Blink: 3 checks, lesson done | All three Passed at about 8 s, "Done 1/16" | same | same |
| Break `delay(5000)` then fix (`p6`) | "2 of 3 checks pass" then "All checks pass", code resets on reload, progress kept | not run | same |
| `]` next-lesson shortcut | goes to `/button` with nothing focused and after the editor and Escape | not applicable (no keyboard) | same |
| L298N: 14 "Do it" steps | 15 of 24 reached, same status line sequence, "Running / 380 mA" after power | tapped step 1: "1/24"; break it tab and 36 V fault by tap: "36 V on +12V Active" with Repair button (screenshot `shots/wk-iphone/13-phone-l298n-fault.png`); the fault regex in `p27` printed "undefined", which was my regex, not the page | same |
| L298N task | starter fails, reference solution passes all checks, "1/2 tasks" | not run | same |
| Fly: arm, climb, crash, replay | armed, climbed, crashed after 4.5 s of descent, "Crashed into the ground: props broken", replay and "Switch to Altitude hold (easy)" button shown | arm works; HUD shows battery, altitude, speed, gate only; two on-screen sticks "THROTTLE . YAW" and "PITCH . ROLL" drawn (screenshot `shots/wk-iphone/13-phone-fly-armed.png`) | same |
| Rooms, two pages in one context | code, run, serial, fault sync; non-holder edit stays local (A and B code differ); baton request visible | not run | same |
| Language lessons (Run, checks, error) | all four pass | pico and basys3 pass | all four pass |
| Racer bench | 12 of 13, 5 of 5 tests, props after unplug 13 of 13, CLI messages identical | same | same |

Differences found (WebKit against Chromium):
- Fly, altitude and frame rate. HYPOTHESIS, one run each. In WebKit the craft hit the "Height limit for this field: 16 m" message at about 2 s and stayed at 15 to 19 m for the whole 25 s; in the Chromium walk the same keys reached 24 m. The page's `requestAnimationFrame` callbacks ran at 100 per second in headless WebKit (501 in 5.00 s idle, 500 while flying, 301 in 3 s) against 60 per second in Chromium (300 per 5 s). Both engines pause the range iframe's loop when disarmed (0 callbacks). The two engines ran on the same Mac, so the rate is the engine's, not the page's choice. If the flight sim steps once per frame rather than by elapsed time, flight would differ per display; I did not read `figures/flight/` to settle it. Worth one look before the plan promises the same flight everywhere.
- Blink idle state. Before pressing Run the readout showed "L LED on, LED1: lit" in WebKit desktop and "L LED off, LED1: dark" on iPhone WebKit; both are the figure's idle demo caught at different moments. No bug, but a test that reads the idle readout is timing dependent.
- Error column. The ESP32 broken-code error was "Line 4" in WebKit and "Line 5" in Chromium. That is my script (`innerText` of the editor returns a different number of blank lines in each engine, so the pasted code differs). Not a product difference.
- Nothing else differed: no layout break, no overflow, no console error, editor typing works (CodeMirror accepted `insertText` and a tap on the iPhone descriptor), checks and rooms identical.

### Known limits that remain (and why)

| Limit | Reason |
|---|---|
| Firefox not tested | Not installed (VERIFIED by `ls`). Installing it means a download into the shared Playwright cache; the task said to record it as a limit. |
| Not real iOS Safari | The WebKit used is the macOS Playwright build (Safari 26.0 engine) with the iPhone 14 viewport, dpr, touch flag and user agent. It does not reproduce the iOS address-bar and `100vh` behaviour, the on-screen keyboard resizing the page, safe-area insets, or iOS audio and gesture rules. A real iPhone was not available. |
| Touch-drag on the flight sticks in WebKit | Playwright has no CDP in WebKit (`p28` stops with "CDP session is only available in Chromium"); `page.touchscreen` only taps. The sticks are drawn and the Arm button works by tap; whether a finger drag flies the craft in Safari was not tested (it does in Chromium, step 13). |
| One lesson per language | 5 lessons walked in a browser of 71 (16+4+7+5+4+4+6+5+5+5+5+5 per the step 15 counts): Uno Blink, pico Blink, pi4-pi5 Blink, basys3 Blink, esp32-devkitc Blink. The other 66 are covered only by the unit and e2e suites in `E2E.md`. The 10 Verilog lessons (basys3 and de10-lite) and 10 MicroPython lessons (pico and microbit-v2): 1 of each 10 walked. Count: `grep -h "language: 'verilog'" src/content/boards/*.ts \| grep -v test \| wc -l` gives 10, same for `micropython`. |
| Robotics: 15 of 24 steps | Not closed; the remaining 9 steps were not walked in this fix (it was not one of the two gaps). |
| Drones: 1 of 13 by hand | Racer by hand, quad5 by "Build it for me" (step 7). The flight of a hand-built craft was not done. |
| Verilog error variety | One mistake type tried (see part 1). |
| Per-test timing on the drone bench | My script's wait was not tied to the test finishing, so no times are given. |

