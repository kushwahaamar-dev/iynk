# Flight range: renderer, host API, data formats

Owner: flight agent. Code: `src/lib/flight/**` (sim, types, data), `src/components/flight/**` (host UI),
`figures/flight/**` (range page sources and build), `public/figures/flight/range.html` (built page).
Strings: `src/i18n/messages/<lang>/flight.json` (all six locales complete).

## 1. Recommendation and measurements

**Physics in the host, drawing in the iframe.** The sim is plain TypeScript in `src/lib/flight` (fixed 10 ms
steps, dt clamp 100 ms, deterministic). The host steps it in `requestAnimationFrame`, and posts one small
`FlightFrame` per frame to the range page as `set {state:{frame}}` through FigureFrame (D11). The page only draws.
Why: one source of truth for physics (Vitest-tested, replayable for server verification, D14c), no TS bundling in
the figure, and the D14b seam: every input is a `dispatch(action)` on the flight session.

**Chase view: cached iso SVG with baked wobble.** The field is projected and depth-sorted once per view angle;
per frame only the craft group, its shadow, the labels and the `viewBox` (camera pan) change. The hand-inked wobble
is baked into the path geometry (seeded, so it is stable) and the paper grain is a static CSS background, because a
live SVG filter on a moving scene is the expensive part. **FPV: per-frame SVG string** with near-plane clipping.

Pre-event spike (Chromium software raster, desktop, fps / p95 frame ms / main-thread ms per frame):

| approach | 1x CPU | 4x CPU | 6x CPU | WebKit 1x |
|---|---|---|---|---|
| iso, SVG rebuilt each frame | 90 / 18 / 11.1 | 20 / 60 / 48 | 13 / 108 / 75 | - |
| iso, SVG rebuilt + live ink filter | 46 / 26 / 21.8 | 19 / 74 / 53 | 12 / 124 / 85 | 5 fps |
| iso, **SVG cached** | 120 / 10 / 1.4 | 118 / 10 / 5.0 | 114 / 10 / 8.1 | - |
| iso, SVG cached + live filter | 53 / 25 / 16.4 | 51 / 26 / 18.9 | 48 / 27 / 20.9 | 6 fps |
| iso, **SVG cached, baked wobble** | 120 / 10 / 2.0 | 114 / 16 / 6.2 | 113 / 15 / 8.3 | 30 (cap) |
| iso, canvas + filter | 11 / 93 / 7.0 | 11 / 93 / 30 | 11 / 94 / 44 | 8 fps |
| fpv, **SVG** | 119 / 10 / 2.4 | 96 / 18 / 9.7 | 81 / 26 / 11.8 | 30 (cap) |
| fpv, canvas | 120 / 10 / 6.0 | 40 / 40 / 24.6 | 28 / 58 / 35.8 | 30 (cap) |

With a GPU, canvas is 120 fps everywhere; without one (many school laptops, CI) the cached SVG wins, and WebKit
falls to 5-10 fps under any live filter. WebKit also paints a filtered layer blank once the world is 2-3x the view
unless the filter region is pinned to the view, and ignores canvas `ctx.filter` (spike `filter-region` study).
So the range uses no live filter at all.

Production page (`range.html`, Playwright Chromium headless, script + layout + style ms per frame):

| scene | 1x | 4x | 6x |
|---|---|---|---|
| 5-inch bando (27 prims), iso | 113-120 fps, 0.4 ms | 120 fps, 1.4 ms | - |
| 5-inch bando, FPV | 116-120 fps, 0.6 ms | 120 fps, 2.8 ms | - |
| stress: 250 prims (350 solids), iso | 120 fps, 0.5 ms | 120 fps, 1.9 ms | 100 fps, 3.1 ms |
| stress: 250 prims, FPV | 120 fps, 2.9 ms | 65 fps, 13.2 ms | 40 fps, 20.4 ms |

Phone viewport (390 x 430) matches desktop. World build for 350 solids: 19 ms (once per view turn).
The page is 61 KiB, self-contained (no network). Re-measure with the recipe in §9.

## 2. Module layout

| file | what |
|---|---|
| `src/lib/flight/types.ts` | every type below |
| `math.ts` | `bodyAxes(yaw,pitch,roll)`, clamp, wrap, expo, `G`, `DEG` |
| `battery.ts` | OCV curves per chemistry, IR sag, current model, cut-off, `voltageFactor` |
| `world.ts` | prims → collision solids (`buildSolids`), `collide`, `throughGate`, `passCheckpoint`, default colours |
| `sim.ts` | `createSim`, `dispatch`, `stepSim`, `advance`, `frameOf`, `replay`, `hoverCommand`; multirotor (tri tail servo, motor-out, desync), wing, VTOL transition, swarm followers, autopilots (loiter, RTL, mission), gates, checkpoints |
| `session.ts` | `createSession`: a `LabStore`-shaped store (`getState/subscribe/dispatch`) + `tick(seconds)`, `frame()`, `log()` |
| `input.ts` | keyboard/touch/gamepad → RC `Sticks`, `DEFAULT_PAD` (Mode 2), `padSticks`, `learnAxis` |
| `from-calc.ts` | `fromCalc(CalcResult, CalcBattery)` → `CalcOutputs` (src/lib/drone/calc) |
| `sfx.ts` | `sfxFor(event)` → `SfxName[]` from the figure sound vocabulary, for the host's sound engine (S10) |
| `crafts/quad5.ts`, `courses/quad5.ts` | the 5-inch craft record and its fixed "Freestyle bando" course |
| `flight.test.ts` | 25 Vitest tests (calc agreement, battery, physics, course reachability, determinism, other classes, input) |
| `src/components/flight/FlightRange.test.tsx` | 6 host tests (keys, arming refusals, toggles, legend, gamepad panel, design change) |
| `src/components/flight/FlightRange.tsx` | host component on FigureFrame: loop, keys, modes, stats, legend, live region |
| `TouchSticks.tsx`, `GamepadPanel.tsx` | on-screen sticks (coarse pointers); gamepad mapping UI with learning |
| `figures/flight/src/{ink,geo,iso,fpv,main}.js` | range page: palette + wobble, faces, chase view, FPV + OSD, bridge + input + loop |
| `figures/flight/build.mjs` | `node figures/flight/build.mjs` → `public/figures/flight/range.html` (embeds the 5-inch demo) |

## 3. Host API

```tsx
<FlightRange
  craft={quad5Craft} course={quad5Course}
  calc={fromCalc(calcResult, battery)}      // live: a change never wipes the flight
  faults={{ fcReversed, propsSwapped, motorDirUnchecked, accUncalibrated, servosReversed, tailHeavy, propBackwards }}
  t={messages.flight}                        // getMessages(lang, "flight") on the server
  courseText={{ title, labels: { "THE GAP": "…" } }}   // content translations of the course words
  initialMode="alt"
  onEvent={(e: FlightEvent) => …}            // progress, sound, the drone lab log
  onSession={(s: FlightSession) => …}        // store for LabDock / rooms / AI partner
  onFigure={(h: FigureHandle | null) => …}   // the range's FigureFrame handle, for LabDock
/>
```

Events out (`FlightEvent`, each with `t` = s since arming): `armed {mode}`, `disarmed`, `blocked {why: crashed|air|
throttle|battery|acc}`, `takeoff`, `landed {mah, belly?}`, `crash {why: HitKind|ground|groundWing|flipFc|flipProps|
flipMotor}`, `gate {index,total,split}`, `lap {time,best,splits}`, `checkpoint {index,total,label}`, `run {time,best}`
(range course done), `battery {level: low|empty, chemistry, perCell}`, `missionStep {index,total,label,action}`,
`missionDone`, `outOfField`, `farOut`, `ceiling {m}`, `desync {motor}`, `motorOut {motor}`, `stall`, `launch`,
`transition {to}`, `mode {mode}`. Progress keys (D7) for the consumer: `lap`/`run` best →
`best["drone:<id>:course:<courseId>"]` (lower is better; race laps and range runs are separate bests).

Actions in (`FlightAction`): `arm`, `disarm`, `toggleArm`, `reset`, `mode {mode}`, `wind {on}`, `sticks {sticks}`,
`design {calc, faults}`. `session.log()` returns `{step, action}[]`; `replay(craft, course, calc, log, steps, opts)`
re-runs it bit-for-bit (tested), so a server can verify a lap from inputs alone.

Keys: W/S throttle (climb modes: springs to centre = hold; manual modes: integrates 0.32/s and stays), A/D yaw,
arrows pitch/roll (left arrow banks left), Space arm/disarm, R reset, V FPV. Inside the iframe the page forwards
the flight keys to the host as `part {act:"key", id: code, data:{down:"1"|"0", repeat}}` (an accepted D6 type) and
handles `[ ]` turn, `+ -` zoom, `0` reset view itself; drag turns, wheel/pinch zooms. Gamepad: Mode 2 default
(axes 1 inv throttle, 0 yaw, 3 inv pitch, 2 inv roll; buttons 9 arm, 3 FPV, 8 reset), learnable per channel, stored
per viewer in `localStorage["iynk:flight-pad:v1"]`. Touch sticks show on `(pointer: coarse)`: left = throttle/yaw
(throttle stays put in manual modes, touches start from the knob), right = pitch/roll (springs back).

## 4. Data formats (exact)

`FlightCraft` (one per drone id, `src/lib/flight/crafts/<id>.ts`):
`{ id, class: "multirotor"|"tricopter"|"wing"|"vtol"|"swarm", drag (1/m, 5-inch 0.045), ceiling (m), hitRadius (m,
real half-size), angleLimit (deg), acroRate (deg/s full stick), yawRate (deg/s), levelRate (1/s, 9), climbRate (m/s,
2.2), spool (1/s, 18), camTilt (deg), fov (deg, 105), fpvLevel?, fpvProps?, loiterSpeed? (m/s, 5), rtlAlt? (m, 15),
wing?: {vstall, vmin, cd, launchSpeed, bankLimit, pitchLimit, rollRate, pitchRate}, vtol?: WingParams +
{transitionS, hoverMotors}, tailServo?: {maxDeg, rateDegS}, swarm?: {count, spacing}, look: {arms, armLen, propR,
body:[l,w,h], palette, frame?: "x"|"plus"|"y"|"h", ducted?, span?, chord?, isoScale?}, modes: FlightMode[] }`.
The class picks the path: `wing` → wing model; `vtol` → multirotor with tilt until cruise, then wing; others →
multirotor. `tailServo` turns yaw into a servo-driven yaw (tricopter); `swarm` adds followers; motors come from calc.

`FlightMode`: `{ id (key under flight.modes), attitude: "angle"|"acro", throttle: "manual"|"climb", position?
(GPS/flow hold: sticks = velocity, centred = brake and hold), task: "free"|"race"|"range"|"rtl"|"mission"|
"figure8"|"swarm"|"motorfail"|"transition"|"qrtl"|"rth"|"yawdemo", angleLimit?, rateScale?, expo?, missionId? }`.
Mode titles for every craft in the brief already exist in `flight.json` (`alt angle acro race raceAcro range cine
rescue loiter althold rtl mission deliver spray manual rth qhover transition qrtl hover swarm figure8 yaw motorfail`).
Suggested mappings: gpscam `loiter`={angle,climb,position,free}, `althold`={angle,climb,free}, `rtl`={…,task:"rtl"},
`mission`={…,task:"mission"}; octo adds `motorfail`={angle,climb,position,task:"motorfail"}; wing `angle`={angle,
manual,free}, `manual`={acro,manual,free}, `rth`={angle,manual,task:"rth"}; vtol `qhover`={angle,climb,position,
free}, `transition`={angle,manual,task:"transition"}, `qrtl`={angle,climb,task:"qrtl"}; swarm `hover`={angle,climb,
position,free}, `swarm`, `figure8`={…,task:"figure8", missionId}; cinewhoop `cine`={angle,manual,free,angleLimit,
rateScale,expo}; longrange `rescue`={angle,climb,task:"rtl"}.

`Course` (`src/lib/flight/courses/<id>.ts`): `{ id, title (English), brief, field (m, square), pad:[x,y], ground
(colour), ceiling? (m, overrides craft), camTilt?, wind: {speed m/s, from deg (0 = from the east), gust m/s},
prims: Prim[], gates: Gate[], checkpoints: Checkpoint[], missions?: Mission[] }`.
`Prim` (metres; `yaw`, `rot` in degrees; every prim has `x, y` and optional `col`, `kind`; `kind` is what a crash
names: tree roof wall pole gate building pillar tower barrel obstacle; every prim but a decal is solid and drawn):
`{type:"box", w, d, h, z?=0, yaw?}` (kind obstacle); `{type:"house", w, d, h, yaw?, roof?, roofCol?}` = walls (kind
building) + a 4-sided roof (kind roof) of radius hypot(w,d)/2·1.02 and height roof ?? 0.45·min(w,d);
`{type:"cyl", r, h, z?=0, r1?=r (top radius), n?=14 (sides; 4 = diamond footprint), rot?}`; `{type:"tree", h?=3}`
(trunk r 0.16 up to 0.35h, crown cone r max(0.5, 0.22h) from 0.3h to h; kind tree); `{type:"pole", h, r?=0.08}`;
decals, flat on the ground and never solid: `{type:"flat", w, d, yaw?, label?, ink?}`, `{type:"disc", r, label?}`.
The pad's H decal is always drawn. Draw order, shadows and the cutaway come from the solids, so they always agree.

`Gate {x, y, heading, w, h, z?, col?}`: two posts + a top bar (+ a bottom bar when z > 0), 0.07 m thick, solid
(kind gate); passed when crossed along `heading` with |lateral| < w/2 and z0 + 0.05 < z < z0 + h, in order.

`Checkpoint {label, x, y, z, r, heading?, land?}`: with `heading` a ring crossed along it within r of the centre;
without, a sphere touched (distance < r); `land` (no heading, z 0) = within r on the ground (z < 0.3 m, < 1.5 m/s).
Labels are English; `courseText.labels` translates them.

`Mission {id, waypoints: [{x, y, z, label, hold?, action?: photo|drop|spray-on|spray-off|land, speed?}], rtl?}`:
each waypoint is reached within 1 m, held `hold` s, then the next; `rtl` returns and lands at the end.

`CalcOutputs`: `{auw g, thrustPerMotor g (nominal 3.7 V/cell), motors, cells, mah, hoverThrottle, hoverAmps,
maxAmps, chemistry?: lipo|lihv|liion, overKv?}`. Wings: `hoverThrottle` = cruise throttle (RTH uses it).

`FlightFrame` (host → page, rounded to cm): pose `x y z yaw pitch roll` (deg; pitch nose-down +, roll left +, yaw
from +x CCW), `speed vz thr spin armed crashed launched volt amps mah cells low timer mode wind[2] windOn next{x,y,z,
kind,n,total,label} gate checkpoint servo motorsOut followers[[x,y,z,yaw]] spray`.
Bridge `set` keys the page accepts: `course` (+ `solids` from `buildSolids(course)`, so the drawing is the collision
geometry), `craft {fov, camTilt, fpvProps, fpvLevel, look}`, `frame`, `fpv` (bool), `strings` (merged). Also
`locale {strings}`, `theme`, `flash {text,ms}`, `pause`/`resume`, `view {yaw}`, `act {name}` (fpv chase turn-left
turn-right zoom-in zoom-out view-reset), `query`. Page → host: `ready`, `state {fpv, view, zoom, course}`, `part`
(keys), `focus`, `error`. Figure string keys: `figureTitle`, `osd.*`, `mode.<id>`, course labels by English text.

## 5. Physics (one model per class, all in `sim.ts`)

Multirotor: thrust fraction f = u² (u = spooled command), thrust = f·n·T/1000·g·(V/Vnom)²·ceiling fade (linear to
zero over the top 3 m); angle mode tracks stick·angleLimit at levelRate; acro integrates stick·acroRate (with expo);
yaw −stick·yawRate. Climb modes: vz target = climb·climbRate, need = m(g + 3(vzt − vz))/(Tmax·kV)/max(.4, up_z).
Drag on air-relative velocity `a −= drag·(v − w)(|v − w| + 1)`. Ground crash: vz < −3.2, or tilt > 55° at > 1.5 m/s,
or > 6 m/s, once airborne. Collisions: sphere of hitRadius against the solids. Faults on take-off: FC reversed /
props swapped / motor direction unchecked flip it (crash reason names the cause); `accUncalibrated` blocks arming.
Over-KV: heat += f·1.6/s, cools 0.35/s; at 9 a 0.4 s desync drops a motor (lurch, yaw, sink), heat −3.
Tricopter: tail servo slews at rateDegS to stick·maxDeg; yaw rate follows the servo angle; a small side force.
Motor-out (`motorfail`): n ≤ 4 → no spare, uncontrollable spin and fall (tested); n ≥ 6 → (n−1)/n thrust, the
hover command rises by √(n/(n−1)) (octo +6.9 %, tested), slow yaw drift.
Wing: airspeed S along the nose, hand launch at throttle > .25 (launchSpeed, 1.6 m, 14° nose up), angle = bank/
pitch targets (3° trim), manual = rates + nose drop in a bank, stall below vstall (nose drop + wing rock), lift
(S/vmin)², coordinated turn, belly landing rules, RTH orbit. VTOL: motors tilt over transitionS once above 2 m,
wing lift grows with forward speed, cruise (wing model) once tilt = 1 and speed > 1.1·vmin; `qrtl`/hover modes
drop back to the multirotor model. Swarm: followers hold formation slots around the leader (first-order).
Battery: OCV(SoC) per chemistry, sag = I·R_cell (R = 6.6 mΩ·Ah/capacity LiPo, 80 mΩ·Ah Li-ion), current
I = hoverA·(T/W)^e·(Vnom/V) + 0.4 A with e = ln(maxA/hoverA)/ln(T:W), so hover draws calc's hoverAmps and full
throttle calc's maxAmps. LOW at 3.5 V/cell (LiHV 3.55, Li-ion 3.1); ESC cut-out after 0.5 s under 3.2 V/cell
(LiHV 3.25, Li-ion 2.9) or at once when the pack is flat. Wind: mean + two-sine gust + crosswind, deterministic in sim time.
Agreement with `src/lib/drone/calc` (tested on the real calc and catalogue): `hoverCommand(calc, 3.7·cells) ===
calc.hoverThr` exactly; altitude hold settles on `hoverCommand` for the live voltage (a full pack hovers ~12 %
lower); hover current 0.85-1.25 × hoverA; hover-to-cut-out time between 0.9 × the hover time on 80 % of the pack
and 1.1 × the hover time on all of it.

## 6. Original defects fixed (drone-lab-a §10 numbers)

2 design change mid-flight never nulls the flight: `design` applies on the ground, otherwise queues until reset
(`pendingDesign`, message shown). 3 alt-hold → manual mid-air keeps the hover power (tested). 4 each message has its
own timer (OSD and toast). 5 the 5-inch gate race: five visible solid gates on a loop that crosses nothing (tested
leg by leg); an acro race mode added for the practice task. 6 the range is completable: ceiling 16 m on this field,
BANDO ring moved into a pillar bay, DIVE ring 1.7 m off the tower face, LAND is a real landing (reachability
tested). 7 battery cuts out at hover; thrust follows voltage; sag scales with capacity; Li-ion has its own curve
and message. 8 wind is airspeed with gusts of several m/s, a wind indicator in the chase view and `W` on the OSD.
9 desync drops a motor and heat cools. 10 AHI: nose down moves the bar up, bank rotates with the world (screenshots
checked). 13 crash messages name the solid kind. 14 the craft never vanishes: solids in front of it turn
see-through and an x-ray outline is drawn on top. 15 hitRadius is the real size (5-inch 0.16 m); the drawing scale
is separate (`isoScale`). 16 camera follow is frame-rate independent (1 − e^(−6dt)). 17 unknown modes fall back to
the first mode. 18 keyboard throttle syncs with touch and gamepad. 19 arming restarts an autopilot task from its first phase.
20 best lap and best range run are separate; laps, crashes and splits are shown. 21 the range clock starts at
take-off. 22 numbers are rounded for display.
24/25 camera tilt, angle limit and rates live in the craft record next to the CLI values they must match.
28 the craft casts its shadow and drops a height line in the field.

## 7. Budgets

Per frame on a 4x-throttled CPU: chase view ≤ 2 ms, FPV ≤ 14 ms at 250 prims (keep courses ≤ 300 prims; FPV cost
is linear in visible faces). Bridge: one `set` per animation frame while anything moves, nothing when idle.
Physics: 100 steps/s at 0.6 µs a step on the bando (45 solids, Node 24). Collision is a linear scan: 14 µs per
test at 1000 solids, so 1.4 ms of physics a second; add a grid only past that. Page ≤ 100 KiB.

## 8. Adding a craft (for the drone-lab agent)

Source numbers: drone-lab-b §2 (per craft: modes with the default first → `modes[0]`, field, pad, ceiling, motors)
plus each figure's "Flight modes" and "Range" sections; drone-lab-a §7.2 and §7.6 for the original four crafts.
1. `src/lib/flight/crafts/<id>.ts`: a `FlightCraft` with the class blocks it needs and its modes (§4).
2. `src/lib/flight/courses/<id>.ts`: its `Course`; give solids a `kind`, keep checkpoints reachable below
   `ceiling − 1.8 m`, gates clear of scenery. Copy the reachability tests in `flight.test.ts` for it.
3. Export both from `src/lib/flight/index.ts` (owned by flight: send a request) or import the files directly.
4. Render `<FlightRange craft course calc={fromCalc(result, battery)} t={flight} … />` on `/drones/<id>/fly`.
Then `node figures/flight/build.mjs` only if the page sources change (courses are sent at runtime).

## 9. Verification recipe

`npx vitest run src/lib/flight src/components/flight` (31 tests). `node figures/flight/build.mjs`. Serve `public/` on a random port and
open `/figures/flight/range.html`: standalone it flies a demo lap of the 5-inch gates; `window.__range.set({...})`,
`.setFpv(true)`, `.act("turn-left")` drive it. A host harness (transpile `src/lib/flight` to `.mjs`, iframe the page,
post `hello` then `set`) exercised the full bridge: ready → course → frames at 60 Hz, keys forwarded back.
`FlightRange` itself was bundled with Vite (StrictMode, real `FigureFrame`) and driven in Chromium: the course
arrives (45 solids), Arm + W climbs, V typed inside the frame toggles FPV in the host, R resets, no console errors;
in a phone emulation the touch sticks show and fly it. `src/components/flight/FlightRange.test.tsx` covers the rest.

## 10. Gaps

Courses and craft records exist for the 5-inch only; the other twelve follow §8. No React page renders
`FlightRange` yet (the drone lab owns `/drones/[drone]/fly`). Sound is a mapping (`sfxFor`), not playback.
