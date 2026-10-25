# iynk

iynk is a hardware lab in the browser. You pick a real board, a robotics bench or a drone, and it is drawn as a
hand-inked figure you can turn all the way round and look inside. Then you build it part by part, write the code and
run it, break it on purpose and watch what really happens (magic smoke, a motor spinning backwards, a quad that flips
on take-off), and, for drones, size the parts with real numbers and fly it. The code runs in interpreters inside the
page (Arduino C++, MicroPython and Python, Verilog), lessons and tasks pass only when that run meets their checks, and
it all works in six languages, alone or with friends in a live room. It was built for HackTX 2026.

Everything below was checked against this tree at 02:00 CDT on 25 October 2026. The gate reports in `docs/verify/`
have the latest machine results.

## What's in it

38 items: 12 boards, 13 robotics benches and 13 drones. Every one has a figure, English prose, its own page in all six
languages, and a "Build it for real" parts list. Every board lesson and bench task has reference code that passes the
app's own check path while the starter (or an empty program) fails it: 102 of 102 in
`docs/verify/gate2-lessons.md` (71 lessons, 31 tasks).

### Boards (`/boards`)

Each board has board, breadboard, schematic and power views, an assembly sequence from the bare PCB, failures that
change the figure, a pinout, lessons with a serial monitor, and a quiz on most lessons.

| Board | Code | Lessons | Lessons with a quiz | Failures |
|---|---|---|---|---|
| Arduino Uno R3 | Arduino C++ | 16 | 16 | 14 |
| Arduino Nano | Arduino C++ | 4 | 4 | 15 |
| Arduino UNO R4 (Minima, WiFi) | Arduino C++ | 7 | 7 | 11 |
| ESP32-DevKitC V4 | Arduino C++ | 5 | 2 | 13 |
| ESP32-S3-DevKitC-1 (v1.1, v1.0) | Arduino C++ | 4 | 1 | 14 |
| NodeMCU (ESP8266) | Arduino C++ | 4 | 2 | 13 |
| Raspberry Pi Pico (Pico, Pico W, Pico 2, Pico 2 W) | MicroPython, Arduino C++ | 6 | 0 | 12 |
| STM32 Nucleo-F401RE | Arduino C++ | 5 | 5 | 14 |
| BBC micro:bit V2 | MicroPython | 5 | 5 | 10 |
| Raspberry Pi 5 / Pi 4 | Python (gpiozero, rclpy) | 5 | 5 | 10 |
| Digilent Basys 3 | Verilog | 5 | 5 | 9 |
| Terasic DE10-Lite | Verilog | 5 | 5 | 8 |

The FPGA boards simulate the Verilog you write, read the switches and light the LEDs and digits from it; they don't
synthesise a bitstream.

### Robotics benches (`/robotics`)

A bench is a build on the cutting mat: every step in a fixed order, faults you can switch on that change the readings
and the figure, practice tasks with code, and a quiz after the major steps. Benches describe their electrical
behaviour with small models (transistor saturation, H-bridge levels, buck output, stepper current), and breadboard
circuits go through the figure engine's nodal solver.

| Bench | Controller | Steps | Faults | Tasks | Quizzes |
|---|---|---|---|---|---|
| Build an Arduino Uno R3 | Uno R3 | 25 | 13 | 2 | 5 |
| LED + resistor | – | 19 | 8 | 2 | 5 |
| Transistor motor switch | Nano | 22 | 11 | 4 | 8 |
| Build an ESP32-S3-DevKitC-1 | ESP32-S3 | 17 | 6 | 4 | 6 |
| TB6612FNG driver | Nano | 22 | 7 | 2 | 4 |
| L298N driver | Nano | 24 | 8 | 2 | 4 |
| A4988 stepper driver | Nano | 22 | 7 | 2 | 5 |
| PCA9685 servo arm | Nano | 23 | 8 | 2 | 4 |
| MPU-6050 tilt alarm | Nano | 18 | 6 | 2 | 4 |
| HC-SR04 parking sensor | Nano | 19 | 6 | 2 | 4 |
| QTR-8RC line follower | Nano | 22 | 8 | 2 | 5 |
| LM2596 buck converter | – | 22 | 7 | 2 | 5 |
| Raspberry Pi 5 ROS 2 brain | Pi 5 | 17 | 11 | 3 | 7 |

### Drones (`/drones`)

Each craft has a design calculator (342 golden rows across the 13 crafts), a build in figure order that refuses
wrong steps, a wiring sheet, bench tests, a CLI emulator for its firmware with real snippets, quizzes, and a flight
range where it flies with its own parameters on its own courses (gates, checkpoints, or an autopilot mission on eight
of the crafts), each with gold, silver and bronze par times.

| Craft | Firmware | Bench tests | Courses |
|---|---|---|---|
| 5-inch freestyle quad | Betaflight | 3 | 2 |
| Tiny Whoop 65 mm | Betaflight | 5 | 2 |
| 3-inch cinewhoop | Betaflight | 7 | 2 |
| 7-inch long-range quad | Betaflight | 6 | 3 |
| 5-inch racing quad | Betaflight | 5 | 1 |
| GPS camera drone | ArduCopter | 8 | 1 |
| Autonomous delivery quad | ArduCopter | 7 | 1 |
| Agricultural spray hexacopter | ArduCopter | 6 | 1 |
| 900 mm FPV flying wing | INAV | 8 | 2 |
| VTOL tiltrotor | ArduPlane (QuadPlane) | 6 | 2 |
| Crazyflie swarm drone | crazyflie-firmware, cflib (Python) | 5 | 1 |
| Tricopter | Betaflight | 5 | 2 |
| Heavy-lift octocopter | ArduCopter | 6 | 2 |

The bench tests are the smoke stopper (every craft but the Crazyflie), motor direction and accelerometer calibration,
plus the craft's own checks: radio link, failsafe, compass, GPS lock, servos, airspeed, CG, prop clearance, pre-arm.
The flight sim covers multirotors, fixed wings, the tiltrotor's transition, the tricopter's tail servo and the swarm;
fly with the keyboard (WASD and the arrows), the on-screen sticks on a phone, or a gamepad.

## Languages

English, Spanish, French, German, Simplified Chinese and Hindi, at `/en`, `/es`, `/fr`, `/de`, `/zh` and `/hi`.

- **Lesson and item prose:** all 38 items in all six languages (`src/i18n/content/<lang>/`, 228 files).
- **Interface:** 11 namespaces, 2021 strings, in every language (`src/i18n/messages/<lang>/`). Between 138 (Chinese)
  and 212 (German) of them stay identical to English on purpose: product names, units and code.
- **Figure text** (button names, labels, status lines inside the drawings): the 1866 strings in
  `src/i18n/figure-keys.json` are translated in every language (`src/i18n/figures/<lang>.json`). The figures built in
  the last wave added more: `node scripts/figure-strings.mjs --static` lists 1391 strings that aren't in the key list
  yet, and those show in English until it is regenerated and translated.
- **Kept in English everywhere:** code, pin names, part numbers, CLI commands, the serial output a check matches,
  firmware and OSD messages, flight mode names, and the names of third-party menus.

`npx vitest run src/i18n` checks that every language has exactly the English keys and placeholders, and that prose
is really translated.

## Run it

Node 24 (`.nvmrc`, `engines`), then:

```bash
npm ci
npm run dev        # http://localhost:3000, which redirects to /en
```

No environment variables are needed: every sponsor feature says "not set up on this deployment" and the labs work
without it. To turn features on, copy `.env.example` to `.env.local` and fill in the keys you have (never commit it).
A production build is `npm run build` then `npm start`. Both `dev` and `build` regenerate the content index
(`src/content/index.generated.ts`) first. Progress lives in this browser's `localStorage` under `iynk:v1`; there are
no accounts.

## Test it

```bash
npm run content:check   # every item has a data module and complete English prose
npm run typecheck       # next typegen, then tsc
npm run lint            # eslint --quiet
npm test                # vitest: unit, content, interpreter, figure-engine and script tests
npm run e2e             # Playwright against a production build (.next-e2e, random port)
npm run check           # all five, in that order
```

Playwright needs `npx playwright install chromium` once. `npm run e2e` builds the app itself; `E2E_SKIP_BUILD=1` serves
a build that already exists. The checks that go through the app's own paths, as the gates run them:

```bash
IYNK_LESSON_TABLE=/tmp/lessons.md npx vitest run src/lib/interp/lessons.test.ts   # every lesson and task: reference passes, starter fails
node figures/engine/probe.mjs tb6612fng          # plays a bench's steps in order through the figure bridge
python3 -I figures/tools/cfbuild.py drones/quad5  # builds one figure into public/figures/
python3 -I figures/tools/cfshoot.py drones/quad5  # shoots it from 7 angles, see-through, exploded, phone, inside an iframe; exit 1 on errors
node scripts/crawl-routes.mjs --base http://127.0.0.1:3420 --dist .next   # every page in 6 languages at 390 px, on a running production build
(cd server/realtime && npm test)                  # the room relay
```

`docs/verify/` holds the gate reports, the lesson table and the route crawl.

## How the figures are made

Every figure is one self-contained HTML page in the Colorfigures style: warm paper, heavy ink outlines, flat light, mid
and dark bands, a flat blue cast shadow. The Colorfigures core is
third-party (MIT, April Zhu); it is vendored in `figures/vendor/colorfigures/` with iynk's patches listed in
`PATCHES.md` (translation, the embed mode, the dark host).

- Sources are `figures/<kind>/<id>.js` (boards, parts, modules, robotics, drones), drawn on two engines of our own:
  `figures/engine/bench.js` and its circuit solver for boards, parts, modules and benches, and
  `figures/engine/drone.js` for the crafts. The flight range is `figures/flight/`, built by `node figures/flight/build.mjs`.
- `cfbuild.py` builds each source into `public/figures/<kind>/<id>.html` (80 pages, checked in and served as static
  files); `cfshoot.py` shoots and checks a built page.
- The app shows a figure in an iframe (`FigureFrame`) and drives it over `postMessage` through `figures/engine/embed.js`:
  presses, state patches, faults, pause and resume, and the state the lesson checks. `docs/FIGURES.md`,
  `docs/FIGURES-BENCH.md` and `docs/FIGURES-DRONE.md` are the contracts.
- Every figure was made from a written prompt: `figures/prompts/<id>.md`, 69 records for the 79 figure pages (a part
  and a module with the same id, or a bench and its module, share one unless the drawings differ: `-part` and
  `-bench` records), and `figures/flight/PROMPT.md` for the flight range.

## Sponsor tracks

What each track's judges can see, and what it does on a deployment with no keys. Solana and Best Hardware Hack are not
entered: that work (phase 4) was skipped, so their code stays in the repo but off.

| Track | In iynk | With no keys | Turned on by |
|---|---|---|---|
| Best Overall | The whole lab: 38 items, three interpreters behind one check path (run in a Web Worker), the circuit solver, the flight sim, six languages | All of it | – |
| SerpApi | **Build it for real** on every board, bench and drone: the parts list priced from Google Shopping, Amazon and eBay with the cheapest total; for drones a budget optimiser that swaps cells, motors and props and re-runs the calculator; nearby makerspaces, shops and flying fields (Google Maps), maker events, tutorial videos; the partner's datasheet search (Google and Extract); the MCP tool `price_parts`. Cached 6 h, with a search budget | The parts list (drones priced from their catalogue, boards and benches unpriced) and the drone optimiser on catalogue prices, under "Live prices aren't set up on this deployment" | `SERPAPI_KEY` |
| Most Entertaining | **Break it** on every board and bench (in the figure and the failure panel) and on every drone's fly page; the crash replay in slow motion with "here's why" and a one-click fix; par times and medals; your best-lap ghost and your friends' ghosts in a room; a daily challenge; sound (off by default) | All of it except the leaderboards, which say they aren't set up | `DATABASE_URL` (Tiger Data) for leaderboards and live counters |
| Meta | **iynk Together**: live rooms on every lab page and `/together` (cursors, chat, presence, a baton so one person builds at a time); Muse Spark translates chat and voice notes; the lab partner (Muse Spark with tools, and one that points you to a person in the room first); the Build Night planner; Build Stories with a Muse Image cover; buddy matching; the MCP connector at `/api/mcp` (7 tools, `/api/openapi.json`) so Muse can call iynk | Rooms work between tabs of one browser, and chat shows messages as written; the partner, translation, voice, images and the planner say they aren't set up; the MCP tools `search_catalog`, `get_item`, `drone_calc` and `create_room` answer, the others return `not_configured` | `META_API_KEY` (`GEMINI_API_KEY` stands in for text only), `NEXT_PUBLIC_REALTIME_URL` for rooms across devices, `DATABASE_URL` for buddies |

Not entered, and hidden: the Solana Proof of Build program (`solana/`, Anchor, devnet, never deployed) with its
Passport tab and nav entries, which appear only once the program's config account exists (`/passport` and `/verify`
say "not set up"); and the Hardware tab (Web Serial to a real Uno), which stays off. Usage telemetry is anonymous,
needs `DATABASE_URL`, and can be turned off at the bottom of any lab page.

## Deploy

Nothing is deployed yet. `docs/hacktx/DEPLOY.md` is the runbook: Vercel with Node 24 from `package.json`, which
variables to set (`NEXT_PUBLIC_SITE_URL` before the build), what `.vercelignore` leaves out, and a local production
build and smoke. The room relay (`server/realtime/`, Node and `ws`) ships as Docker plus Caddy from `deploy/realtime/`
with `scripts/realtime-deploy.sh` (`docs/hacktx/REALTIME.md`); the database tables are `db/migrations/`, applied by
`node scripts/db-migrate.mjs`.

## Where things are

| Path | What |
|---|---|
| `src/app/[lang]/` | Pages: dashboard, the three labs, item and lesson pages, `/drones/<id>/fly`, `/together`, `/about` |
| `src/app/api/` | AI (Muse Spark, Image, Voice), search (SerpApi), telemetry, leaderboard, buddies, MCP, status |
| `src/content/` | One typed data module per item (`ids.ts`, `schema.ts`); the text lives in `src/i18n/content/` |
| `src/lib/interp/` | The interpreters (`arduino/`, `python/`, `verilog/`) and the one check path (`runHeadless`, `evaluateChecks`) |
| `src/lib/drone/`, `src/lib/flight/` | The design calculator and the flight sim |
| `figures/` | Figure sources, engines, tools, prompts |
| `server/realtime/`, `db/`, `solana/` | The room relay, the Tiger Data migrations, the (undeployed) Solana program |
| `docs/` | `SPEC.md` (the brief), `ARCHITECTURE.md` (contracts and owners), `DECISIONS.md`, `hacktx/` (plan, pitch, deploy), `facts/` (datasheet fact sheets), `verify/` (gate reports) |

## Built during HackTX 2026

HackTX 2026 requires every line of project code to be written during the hacking period, 11:30 CDT on 24 October to
11:30 CDT on 25 October. Before 11:30 on 24 October we had the product brief (`docs/SPEC.md`), research notes
(`docs/research/`), the first datasheet fact sheets (`docs/facts/`) and an earlier iynk prototype. Those were used as
knowledge only. The prototype is not in this repository's history, and nothing from it, from the morning's
prototypes or from the code blocks in `docs/research/` was copied. Every line of code here was written during the
event, by Claude Code agents that the two of us drove. The history starts at 15:30 on 24 October, when the build moved
to this repository; `docs/audit/history.md` has the timeline before that. Third-party code is the npm dependencies and
the vendored Colorfigures core (MIT), credited on the About page. `HANDOFF.md` and `docs/handoff/CONTEXT.md` log every
step, decision and request since.

## Known gaps

Scope decisions are in `docs/DECISIONS.md` ("Build night"). What each part of the build left undone is in
`docs/requests/*-gaps.md`. The ones a judge might notice:

- 14 board lessons have no quiz yet (Pico 6, ESP32-DevKitC 3, ESP32-S3 3, NodeMCU 2), and the 5-inch freestyle quad
  has only the three safety tests, no craft test of its own.
- Some figure text still shows in English in the other five languages (see Languages).
- The Verilog simulator has no `inout`, UART or ADC; the micro:bit's radio has no peer to talk to.
- Rooms across two devices, live prices, the AI partner and leaderboards need the relay and the keys above.
