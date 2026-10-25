# Drone Lab (original), part B: the nine drones of Figs 05 to 13

Research notes for the iynk rebuild. This file covers the original Drone Lab's figures 05 to 13
(source scripts `09-*.js` to `17-*.js`). The engine (`03-*.js`) and the flying range (`04-.js`) are
documented by another agent; this file only describes the engine where a figure depends on it.

Companion file: `docs/research/drone-lab-b-calc-matrix.md` lists every battery x motor x prop
combination of all nine drones with the numbers the original computes (234 rows: 8 crafts x 27, the
Crazyflie x 18). Treat it as golden test
data for the rebuild's design calculator.

## 0. Sources and how this was verified

- Source copies: `scratchpad/orig/drone/09-fig05-5-inch-racing-quad.js` ... `17-fig13-heavy-lift-octocopter.js`.
  File references below use the short form `09:123` (file prefix : line). `03:` is the engine, `04:` the range.
- The live site (https://drone-engineer.vercel.app) was downloaded and its 19 inline scripts compared with the
  local copies: all 19 are byte-identical, so every line reference matches what is deployed.
- Everything marked **[live]** was run on the live site with Playwright: a harness hooked `dlog`, `sfx` and
  `dsay`, then stepped the page's own `dtick()` at 60 Hz, so the original autopilots flew the missions and the
  original `calc()` produced the numbers. After about 250 page loads Vercel started serving a "Vercel Security
  Checkpoint" page to the headless browser; the last two batches (injected faults and the definition dump) were
  run against the downloaded page, whose scripts are identical.
- Screenshots (bench, exploded view, wiring, one flight moment, two FPV views per selected drone) are in
  `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/drone-lab-b/`.
- Raw run data (JSON): `scratchpad/dlb-live/{combos,flights,bench,faults,world,defs}.json`; scripts in
  `scratchpad/dlb-scripts/`.

Conventions used by all nine figures: bench units are millimetres and grams, the field is in metres and
kilograms, `z` is up, `+x` is the craft's nose and `+y` is its LEFT. Headings are degrees from `+x`
counter-clockwise (so 90 = toward `+y`). "Stick" values run from -1 to 1.

## 1. Engine behaviour these figures lean on

The other agent owns the engine; these are the parts every figure below assumes, with the constants the
rebuild must keep so the per-drone numbers stay right.

**Stock design maths** (`03:43-58`, used as-is by Fig 05 and Fig 12; the other seven override it):

```
V        = cells * 3.7
krpm     = KV * V / 1000
thrust   = kThrust * pf * krpm^2                 grams per motor at full throttle (kThrust default 1.06)
AUW      = sum(fixed grams) + n*motor.g + n*prop.g + battery.g
T:W      = n * thrust / AUW
hoverA   = (AUW / (gPerW * prop.eff)) / V        (gPerW default 5.4 g of thrust per watt)
hoverMin = (mAh/1000 * 0.8) / hoverA * 60        80 % usable capacity
flyMin   = hoverMin * 0.42                       "Freestyle time"
maxA     = n * thrust / (2.0 * prop.eff) / V
over     = KV * cells > (maxKvCells || 1750*6*1.15 = 12075)
weak     = T:W < (minTW || 5)
hoverThr = sqrt(AUW / (n * thrust))
cost     = fixed prices by category; Electrical += n*motor.price + battery.price; Mechanical += prop.price * ceil(n/2)
```

The six design tiles default to "All-up weight", "Thrust : weight", "Hover throttle", "Max current",
"Hover time", "Freestyle time" (`03:617-618`); a figure can replace them with `calcRows`. The cost table always
shows Electrical parts = (fixed electrical count + 2) and Mechanical = (fixed mechanical count + 1) (`03:623`).
The bench stats strip shows "Parts n/N", "Weight", "Thrust : weight" (1 decimal) and "Flight time" = `~flyMin`
(`03:666-667`), even where a figure's own tiles say something else (see Fig 09).

**Stock multirotor flight model** (`03:153-206`), which the autopilots of Figs 06, 07, 08, 10 (hover), 11, 12
and 13 drive by writing `D.stick` and then calling `multirotor()`:
- Altitude-hold modes: vertical-speed target = `stick.thr * 2.2` m/s. Angle-type modes: tilt target =
  `stick * 38 deg`, first-order with `k = min(1, 9*dt)`. Acro: `540 deg/s` per unit stick. Yaw: `200 deg/s`
  per unit stick, sign `yaw += -stick.yaw * ...`. So an autopilot that wants acceleration `a` sets
  `stick = atan(a/g) / 38deg`.
- `+pitch` tilts thrust forward (nose down), `+roll` tilts thrust toward `+y` (left).
- Throttle: `thrEff += (thr^2 - thrEff) * min(1, 18*dt)`; thrust = `thrEff * n * thrust * g`, faded linearly
  to zero between `ceiling - 3` and `ceiling` (soft geofence).
- Drag: `a -= drag * (v - wind) * (|v| + 1)` with `drag = DR.drag || 0.045`; wind (Fly menu "Wind on / off") =
  `[sin(0.7t)*1.2, cos(0.5t)*0.8, 0]` m/s.
- Faults: FC reversed / PROPS swapped / motor direction unchecked flip the craft after 0.25 s
  ("Flipped on take-off: the flight controller is mounted the wrong way round", "... the props are on the wrong
  motors", "... motor direction was never checked (bench: Check motor direction)"); `c.over` heats the ESC
  (`heat += dt*thrEff*1.6`, desync at `heat > 9`: message `Desync! ${KV}KV on ${cells}S overheats: the ESC lost a
  motor`, log `ESC desync: motor 3 overtemp`, then `thrEff *= 0.985` per step and a `120 deg/s` roll).
- Ground crash if `vz < -3.2`, or tilt > 55 deg at > 1.5 m/s, or speed > 6 m/s.

**Battery** (`03:208-219`, all nine): `amps = hoverA * (thrEff / max(0.05, hoverThr^2))^1.25 + 0.4`;
`volt = cells*(3.3 + 0.9*soc^0.7) - amps*0.012*(cells/6)`; "LOW BATTERY: land now (3.5 V per cell)" once at
3.5 V/cell; at 3.2 V/cell the ESCs cut out ("Battery empty: the ESCs cut out. Never fly a LiPo this low").

**Autopilot contract**: when a figure sets `D.auto = true`, `readKeys()` stops writing throttle, but it still
eases yaw/pitch/roll toward the keys (`03:340-348`); the figure must overwrite them each step. Switching mode in
the Fly menu while airborne keeps the same flight (`03:455`), which is how "switch to RTL / QRTL / RTH" works.

**World** (`04:24-46`): when a craft has `range.prims`, that scenery is built for EVERY mode, not just the range
run. The range mode only adds the checkpoints (`Range: <title>` in the Fly menu, created at `03:645`).
`range.field` and `range.pad` override the craft's own `field` / `pad`, so several crafts carry dead
`pad` / `trees` / `gates` values (noted per figure). Checkpoints: rings (with `heading`) must be crossed along the
heading within radius `r`; spheres are touched. Messages: `${label} done`, and at the end
`${title} done: ${t.toFixed(1)} s` + ` (best!)`. Collision radius 0.14 m ("Hit a tree", "Hit a roof",
"Hit an obstacle", or "Hit " + `name`).

**Gate race** (`03:221-232`): gates crossed along their heading, lateral offset < 0.8 m (`GATE_W/2`),
0.05 m < z < 1.6 m; the timer starts at gate 1; message `Lap ${lap.toFixed(2)} s` + ` (best!)`; the stats tile
shows `gate n/N` and "Best lap".

**FPV view** (`04:111-215`): camera = craft attitude tilted up by `camTilt` deg (range value wins), or only the
yaw when `fpvLevel` is true (a gimbal); `fpvFov` default 105 deg; `fpvProps` draws two prop blurs at the top
corners. The OSD shows volts (red below 3.5 V/cell), amps + mAh, a mm:ss timer, `ALT x.xm`, km/h, the mode name,
"LOW BATTERY" flashing, and an arrow + distance to the next checkpoint, gate or `HOME`.

**Flight stats panel** (`03:660-665`): "Mode", "Battery" (V/cell), "Altitude", "Speed" (km/h), "Armed" /
"Disarmed" / "Crashed" with value `GO` / `SPACE` (or `gate n/N` in race), "Throttle" (sqrt of thrEff, %), "Best
lap", then the figure's own `flyStats`.

**Arming** (`03:351-360`): blocked when airborne, when the accelerometer is uncalibrated ("Arming blocked: ACC not
calibrated. Run Calibrate accelerometer on the bench") and, in non-altitude modes, when throttle > 8 % ("Arming
blocked: throttle not at zero (that is a safety rule, not a bug)"). On arm the flight message is the mode's
`hint`, or the engine default ("Fly through the gates in order" in race, "Hold W to climb, arrows to fly" in alt,
"W/S throttle, arrows to fly" otherwise).

**Bench flow** (`03:364-426`), confirmed per drone **[live]**: "Add next part" refuses a part whose `after`
parts are missing (`${short} goes on after ${missing short, lower case}`); PROPS are refused until the smoke
test and motor check are done ("Props go on LAST: run the smoke stopper test and the motor direction check
first"); nothing can be fitted while plugged ("Unplug the battery first: never work on a live quad"). The motor
check plugs the battery itself and leaves it plugged, so you must unplug before fitting props. Fitting WIRES marks
the motor direction unchecked; the check then always finds `wrongMotor` reversed: `${M} spun the wrong way:
reversed it in the ESC configurator. They all spin right now`. Plugging with the XT60 cap reversed and no smoke
test: "POP: the capacitor was in backwards and vented. A smoke stopper would have caught it. Unplug, replace it".
The smoke test with the cap reversed: "The smoke stopper lamp lit up: something is shorted. The cap is in backwards:
flip it before you plug in for real" (`buzz`, `03:312`). The motor check with props fitted: "PROPS OFF! Never spin
motors on the bench with props on"; without a battery fitted: "Plug in a battery (USB alone can’t spin motors)"
(`03:417-418`).
Calibrating with the FC reversed: "Calibrated level. Note: the arrow on the FC points backwards...".

## 2. The nine drones at a glance

| Fig | key | name / sub (nav) | palette | firmware log | modes (default first) | range | field (m) | pad | motors | ceiling (m) |
|---|---|---|---|---|---|---|---|---|---|---|
| 05 | `racer` | Racing quad / gates + rates | mustard | betaflight | race*, angle, acro, alt | MultiGP track | 34 | 15, 15 | 4 | 12 |
| 06 | `gpscam` | GPS camera drone / ArduPilot, gimbal | cobalt | ardupilot | loiter*, althold, rtl, mission | Roof + tower inspection | 60 | 15, 15 | 4 | 30 |
| 07 | `delivery` | Delivery drone / Pixhawk + companion | mustard | ardupilot | deliver*, loiter, rtl | Suburb deliveries | 90 | 24, 45 | 4 | 18 |
| 08 | `agrihex` | Agri hexacopter / spray + RTK | mint | ardupilot | spray*, loiter, rtl | Farm spray run | 90 | 38, 45 | 6 | 10 |
| 09 | `wing` | FPV flying wing / INAV, elevons | blush | inav | angle*, manual, rth | Airfield pylon race | 200 | 100, 100 | 1 (pusher) | 60 |
| 10 | `vtol` | VTOL tiltrotor / hover to cruise | cobalt | ardupilot | qhover*, transition, qrtl | Coastal inspection | 180 | 50, 50 | 3 (2 tilt) | 45 |
| 11 | `swarm` | Crazyflie swarm / Crazyflie, mocap | mint | cflib | hover*, swarm, figure8 | Robotics lab cage | 10 | 3.5, 4.5 | 4 (brushed) | 4 |
| 12 | `tricopter` | Tricopter / servo yaw | mint | betaflight | alt*, angle, acro, race, yaw | City park | 46 | 23, 6 | 3 + tail servo | 12 |
| 13 | `octo` | Heavy-lift octocopter / redundancy | cobalt | ardupilot | loiter*, althold, motorfail, rtl | Desert film set | 120 | 22, 18 | 8 | 24 |

Every craft also gets "Range: <title>" in the Fly menu, plus "FPV view on / off (V)", "Wind on / off" and
"Back to the bench". The sidebar nav (`03:546-549`) lists each craft as "Fig. NN", its `name` and its `sub`.
The `DRONE_ROSTER` texts at `03:480-482` (for example "FPV fixed wing" / "INAV, flaps") only appear for a figure
that is missing ("Fig. NN · soon"), so with all 13 present they are never shown.

Default-design headline numbers **[live]**:

| Fig | AUW | T:W | hover throttle | max A | hover / cruise time | flight time tile | cost |
|---|---|---|---|---|---|---|---|
| 05 | 443 g | 13.8 : 1 | 27 % | 217 A | 7.1 min hover | 3.0 min freestyle | $342 |
| 06 | 1600 g | 2.5 : 1 | 63 % | 80 A | 20.0 min hover | 16.0 min | $657 |
| 07 | 5177 g (with 1 kg parcel) | 1.9 : 1 | 72 % | 126 A | 19.6 min hover | 16.6 min | $1742 |
| 08 | 33265 g (with 10 L) | 2.0 : 1 | 72 % | 458 A | 12.7 min hover | 10.1 min | $5230 |
| 09 | 825 g | 1.30 : 1 | cruise 36 % | 33 A | 31 min cruise | stats strip says ~24.4 min | $295 |
| 10 | 1585 g | 2.8 : 1 | 60 % | 116 A | 25.1 min hover | 76 min cruise | $669 |
| 11 | 28 g | 1.9 : 1 | 73 % | 5 A | 6.9 min hover | 6.3 min | $388 |
| 12 | 655 g | 5.1 : 1 | 44 % | 113 A | 16.2 min hover | 6.8 min | $320 |
| 13 | 15486 g | 2.3 : 1 | 66 % | 193 A | 20.9 min hover | 16.3 min | $6550 |

---

## Fig 05. Racing quad (`racer`), file `09-fig05-5-inch-racing-quad.js`

Identity (`09:49-55`): name "Racing quad", sub "gates + rates", hint "build it light, set your rates, then race
the 8 gates", noun "racer" (lesson heading "Meet the racer"), palette `mustard`, bench mat 280 mm, `benchH` 110,
`flyScale` 4, `flyVB` 8000, log "betaflight", CLI panel "Betaflight CLI", log panel "Betaflight log", calibrate
button "Calibrate accelerometer". Default mode `race`. `fpvProps: true`, `camTilt: 38`.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `4s1300` * | 4S 1300 mAh (race) | 4 | 1300 | 152 | 28 | `#2b2a28` | 4S 1300 |
| `4s1500` | 4S 1500 mAh | 4 | 1500 | 178 | 30 | `#d9a520` | 4S 1500 |
| `6s1000` | 6S 1000 mAh | 6 | 1000 | 164 | 36 | `#2f5fa8` | 6S 1000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `2207-2500` * | 2207 2500KV (4S) | 2500 | 31 | 21 | 4 |
| `2306-2700` | 2306 2700KV (4S) | 2700 | 30 | 20 | 4 |
| `2207-1950` | 2207 1950KV (6S) | 1950 | 32 | 22 | 6 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `5x4.8x3` * | 5x4.8x3 race tri-blade | 1.05 | 0.95 | 3.8 | 4 |
| `5.1x3.6x3` | 5.1x3.6x3 (smooth) | 0.95 | 1.05 | 3.9 | 4 |
| `5x5.2x3` | 5x5.2x3 (top speed) | 1.12 | 0.88 | 4.2 | 4 |

Fixed parts (`09:19-24`):

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | 5" stretched-X race frame | 95 | 45 | Mechanical |
| `ESC` | 45A 4-in-1 ESC | 7 | 45 | Electrical |
| `FC` | F7 flight controller | 6 | 39 | Electrical |
| `CAM` | Nano low-latency camera | 5 | 25 | Electrical |
| `VTX` | 25-200 mW race VTX | 5 | 28 | Electrical |
| `RX` | ELRS 2.4 GHz receiver | 2 | 18 | Electrical |
| `LED` | Addressable LED strips | 4 | 8 | Electrical |
| `XT60` | XT60 pigtail + low-ESR cap | 10 | 4 | Electrical |
| `TOP` | Thin top plate + standoffs | 14 | 6 | Mechanical |
| `STRAP` | Battery strap + grip pad | 4 | 4 | Mechanical |

Fixed parts total: **152 g**, $167 electrical + $55 mechanical (before the motors, battery and props are added).

### Design maths

Stock `calc()` (section 1) with `kThrust 1.06`, `gPerW 3.6`, `minTW 9`, `n = 4`, default `maxKvCells` 12075
(`09:53`). So 2500 KV and 2700 KV motors are `over` on 6S (15000 and 16200 > 12075); 1950 KV is fine on 6S
(11700) and `weak` on 4S (T:W 7.1 to 8.8).

Design tiles for the default build (as rendered): "All-up weight" 443 g; "Thrust : weight" 13.8 : 1; "Hover throttle" 27%; "Max current" 217 A; "Hover time" 7.1 min; "Freestyle time" 3.0 min. Cost table: Electrical $279, Mechanical $63, total $342. Verdict line: "Race-ready: 13.8:1 and about 3.0 minutes of racing per pack."

Across all 27 combinations T:W ranges 7.08 to 37.68. `over` in 6: `6s1000/2207-2500/5x4.8x3`, `6s1000/2207-2500/5.1x3.6x3`, `6s1000/2207-2500/5x5.2x3`, `6s1000/2306-2700/5x4.8x3`, `6s1000/2306-2700/5.1x3.6x3`, `6s1000/2306-2700/5x5.2x3`. `weak` in 6: `4s1300/2207-1950/5x4.8x3`, `4s1300/2207-1950/5.1x3.6x3`, `4s1300/2207-1950/5x5.2x3`, `4s1500/2207-1950/5x4.8x3`, `4s1500/2207-1950/5.1x3.6x3`, `4s1500/2207-1950/5x5.2x3`.

Warnings (`09:103-105`), verbatim templates:
- over: `${KV} KV on ${cells}S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV.`
- weak: `Thrust to weight ${tw.toFixed(1)}:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup.`
- ok: `Race-ready: ${tw.toFixed(1)}:1 and about ${flyMin.toFixed(1)} minutes of racing per pack.`

### Frame and proportions (drawing, `09:133-201`)

- Stretched X: motors at (+-86, +-70) mm, so 221.8 mm motor-to-motor diagonal, 172 mm front-to-back, 140 mm
  side-to-side. Centre plate 120 x 32 x 3 mm carbon; four arms from 18 mm out to 117 mm, 12 mm wide, 4 mm thick.
- Motors: 27-28 mm bell, 17 mm tall, shaft to 22 mm; three stator spokes spin with the motor.
- Props: 5" (drawn radius 63 mm for every prop choice), tri-blade; when spinning (> 12 % rpm) a translucent disc.
  Two adjacent props clear each other by about 14 mm side-to-side.
- ESC 30 x 30 board with four MOSFET blocks; F7 FC 30 x 30 with a white nose arrow and a blue power LED; RX at
  the rear with two antenna wires running back to the rear arms; VTX with an angled antenna and red LED.
- Camera between two side plates at the nose, lens tilted 48 deg.
- LED strips: four segments on each rear arm; lit `#43c25c` when powered (only the arm facing the viewer glows,
  so the glow never shows through the battery).
- Top plate 92 x 34 x 2 mm on four 20 mm standoffs; battery 68 mm (1300) or 76 mm (1500 and up) long, 32 x 30 mm,
  with its label printed on top; the red battery lead loops to the XT60 at the tail when plugged.
- Bench tags: FC, ESC, CAM, VTX, XT60, MOTORS, BATT, LED.

Motor order and spin (`09:40`): M1 (-86,-70) rear-right CW, M2 (86,-70) front-right CCW, M3 (-86,70) rear-left
CCW, M4 (86,70) front-left CW (Betaflight order, props in). The motor check spins M1..M4, 1.2 s each, and reports
M3 reversed.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Stretched-X race frame | FRAME |  | 0 |  |
| 2 | `MOTORS` | 4 race motors (2207) | MOTORS | FRAME | 1 |  |
| 3 | `ESC` | 45A 4-in-1 ESC | ESC | FRAME | 2 |  |
| 4 | `WIRES` | Motor wires, cut short | MOTOR WIRES | MOTORS, ESC | 2 |  |
| 5 | `FC` | F7 flight controller | FLIGHT CTRL | ESC | 3 | `arrow forward` / `arrow backward` |
| 6 | `XT60` | XT60 pigtail + low-ESR capacitor | XT60 + CAP | ESC | 2 | `stripe to minus` / `stripe to plus` |
| 7 | `CAM` | Nano low-latency camera | CAMERA | FRAME | 2 |  |
| 8 | `RX` | ELRS receiver | RECEIVER | FC | 4 |  |
| 9 | `VTX` | 25-200 mW race VTX | VTX | FC | 4 |  |
| 10 | `LED` | LED strips on the rear arms | LED STRIP | FRAME, FC | 3 |  |
| 11 | `TOP` | Thin top plate + standoffs | TOP PLATE | FC, CAM, RX, VTX | 5 |  |
| 12 | `BATT` | 4S race LiPo + strap | BATTERY | TOP, XT60 | 6 |  |
| 13 | `PROPS` | Race propellers | PROPS | MOTORS, TOP | 7 | `props in (correct)` / `swapped CW/CCW` |

What each part teaches (paraphrased from `what`):
- FRAME: longer than wide so the rear props stay out of the front props' dirty air and the quad tracks straight at
  full pitch; thin arms, nothing on top to catch wind.
- MOTORS: 2207 means a 22 mm x 7 mm stator, enough for instant response; ~2500 KV on 4S and lower KV on 6S give
  similar prop speed, 6S with less current.
- ESC: four ESCs on one board running DShot600 with bidirectional DShot, so the FC sees each motor's rpm and
  filters noise at the prop frequency.
- WIRES: trimmed short (weight, snagging); swapping two wires reverses a motor and the fix is in software.
- FC: F7 running the PID loop at 8 kHz plus the LED strip and race-timer OSD; arrow to the nose or it flips.
- XT60: hundreds of throttle punches per lap put spikes on the battery lead; the low-ESR cap soaks them; stripe to
  minus or it vents.
- CAM: tiny, tilted 40-50 deg up because racers fly fast and nose-down; every millisecond of latency counts.
- RX: ExpressLRS at 500 Hz; antennas zip-tied along the rear arms, away from props.
- VTX: boots in pit mode so it never stomps on other pilots' video; race control assigns a channel and 25 mW.
- LED: one FC pad drives addressable LEDs; each pilot gets a colour so spotters and timers can tell quads apart at
  120 km/h.
- TOP: 2 mm carbon on short 20 mm standoffs keeps the quad low.
- BATT: light 1300 mAh packs, 2-3 minute heats, land at 3.5 V per cell, swap every heat.
- PROPS: stiff high-pitch tri-blades, two CW two CCW, fitted last.

Build order the dependencies force **[live]**: FRAME, MOTORS, ESC, WIRES, FC, XT60, CAM, RX, VTX, LED, TOP, BATT,
then PROPS after the smoke test and motor check. Fitting PROPS first: "PROPS goes on after motors".

Real mistakes modelled: FC "arrow backward" (flips on take-off), XT60 "stripe to plus" (pops on first plug
without a smoke test), PROPS "swapped CW/CCW" (flips on take-off), motor direction never checked (flips), and an
over-KV design (desync in flight).

### Bench safety tests

Buttons **[live]**: "Take it apart", "Add next part", "Build it for me", "Smoke stopper test", "Check motor
direction", "Calibrate accelerometer", "Plug / unplug battery", "Fly", "Arm / disarm", "Reset", "Exploded view".
No craft-specific buttons. Smoke test result "No short: the lamp only blinked. Safe to plug in"; motor check
"M3 spun the wrong way: reversed it in the ESC configurator. They all spin right now".

### Wiring diagram (`09:204-222`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 238 | BATTERY | 4S 1300 mAh (race) | `#e2483d` |
| `XT60` | 190, 238 | XT60 + CAP | 1000 uF 35 V | `#e2483d` |
| `ESC` | 360, 238 | 4-IN-1 ESC | 45 A x 4, bidir DShot | `#e2483d` |
| `FC` | 360, 70 | FLIGHT CTRL | F7, 8 kHz loop | `#3e86d9` |
| `RX` | 140, 30 | RECEIVER | ELRS 500 Hz | `#8c4bd1` |
| `LED` | 140, 120 | LED STRIP | WS2812 x 8 | `#43a35a` |
| `CAM` | 600, 14 | CAMERA | nano, 48 deg tilt | `#43a35a` |
| `VTX` | 600, 116 | RACE VTX | 25-200 mW, pit mode | `#8c4bd1` |
| `MOTORS` | 600, 238 | MOTORS x4 | 2207 2500KV (4S) | `#f08a2b` |

Connection labels drawn on the lines: "14.8V", "3-phase x4", "DShot + rpm", "VBAT", "UART2 + 5V", "LED pad + 5V", "video in", "video + SmartAudio".

Legend: engine default (`#e2483d` power, `#43a35a` data / signal, `#f2c230` video, `#f08a2b` motor phases).

### Flight modes

**`race` - "Gate race (8 gates)"** (default mode). Arm hint: "W raises throttle and it stays: race the gates in order". Controls: absolute throttle (W/S ramps it).

```
# race setup: 8 gates, the timer starts at gate 1
set osd_timer_1 = ON
set osd_stat_max_spd = ON
# race rates (Actual): a bit less than freestyle,
# more precision around centre stick
set rates_type = ACTUAL
set roll_rc_rate = 7       # centre sensitivity
set roll_srate = 67        # max rate: 670 deg/s
set roll_expo = 40         # softer around centre
```

**`angle` - "Angle mode"**. Arm hint: "W/S throttle, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: absolute throttle (W/S ramps it).

```
# self-levelling: release the stick, it levels
# good for learning the track, slow on the clock
set angle_limit = 45
set p_level = 50
```

**`acro` - "Acro (rate) mode"**. Arm hint: "W/S throttle, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: absolute throttle (W/S ramps it), acro: sticks = rotation rate.

```
# what racers actually fly: stick = rotation RATE
# expo makes small corrections gentle and big ones fast
set rates_type = ACTUAL
set roll_rc_rate = 7
set roll_srate = 67
set roll_expo = 40
set pitch_srate = 67
set yaw_srate = 45
```

**`alt` - "Altitude hold (easy)"**. Arm hint: "Hold W to climb, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: altitude-hold sticks.

```
# beginner helper: the FC holds height for you
set alt_hold_throttle_deadband = 15
aux 1 ANGLE   ...
aux 2 ALTHOLD ...
```


Notes: none of the four modes is marked `alt` except `alt`, so race, angle and acro use the absolute throttle
(W/S ramps it at 0.32 per second and it stays put). Race mode flies angle-style (38 deg self-levelling) even though
its code block shows acro rates. With hover throttle at 27 %, half stick is far above hover: **[live]** a 0.5
throttle took the default racer from the pad to 19 m in 2 s, overshooting the 12 m soft ceiling.

### The 8-gate track

`TRACK` (`09:43`) = (19, 15), (23, 17.5), (23.5, 22), (19.5, 25), (14, 24.5), (10, 21), (10, 16), (13.5, 12) m.
Each gate faces along the racing line: `heading_i = atan2(next.y - prev.y, next.x - prev.x)` (`09:44-45`).
Computed headings **[live]**: 30.07, 57.26, 115.02, 165.26, -157.17, -115.2, -68.75, -6.34 deg. Gates are
1.6 x 1.6 m, built as solid posts plus a top bar (`04:29-32`), and stay in the world for every mode
(`keepGates: true`). Lap verified **[live]**: passing all eight in order gives "Lap 14.00 s (best!)" (time from the
teleport run). `trees` at `09:46` is dead config (the range prims replace it). `pad: [15, 15]` matches the range pad.

### Range: "MultiGP track" (`09:56-102`)

Brief "8 gates, under the hurdle, over and down the dive gate, through the finish arch"; field 34 m, pad
(15, 15), ground `#dde3cc`, `alt: false` (absolute throttle on the range), camTilt 38. Scenery: a start grid of four
0.8 m white squares at y 16.8; a checkered start/finish line of six 0.3 x 0.6 m tiles under the arch; the timing
arch (two red 3 m posts 4 m apart, a top beam and a yellow banner) at (18, 14.45), facing 29.84 deg; the dive
tower at (15.6, 13.05): four 3.5 m scaffold legs and a 1.9 m orange square frame at 3.42 m; the hurdle at
(12, 22.75): two blue 1.3 m posts 2.4 m apart with a bar at 1.2 m, facing -138.81 deg; five flags (2.6 m poles with
non-solid cloth panels in red, blue, yellow, green, purple); the pit area (two 2.6 m tents with red and blue roofs,
a 2 x 0.8 m table); four trees.

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | GATE 1 | 19 | 15 | 0.8 | 0.7 | ring, crossed heading 30.07 deg |
| 2 | GATE 2 | 23 | 17.5 | 0.8 | 0.7 | ring, crossed heading 57.26 deg |
| 3 | GATE 3 | 23.5 | 22 | 0.8 | 0.7 | ring, crossed heading 115.02 deg |
| 4 | GATE 4 | 19.5 | 25 | 0.8 | 0.7 | ring, crossed heading 165.26 deg |
| 5 | GATE 5 | 14 | 24.5 | 0.8 | 0.7 | ring, crossed heading -157.17 deg |
| 6 | HURDLE | 12 | 22.75 | 0.6 | 0.55 | ring, crossed heading -138.81 deg |
| 7 | GATE 6 | 10 | 21 | 0.8 | 0.7 | ring, crossed heading -115.2 deg |
| 8 | GATE 7 | 10 | 16 | 0.8 | 0.7 | ring, crossed heading -68.75 deg |
| 9 | GATE 8 | 13.5 | 12 | 0.8 | 0.7 | ring, crossed heading -6.34 deg |
| 10 | DIVE GATE | 15.6 | 13.05 | 3.1 | 0.8 | sphere (touch) |
| 11 | FINISH | 18 | 14.45 | 1.2 | 1.4 | ring, crossed heading 29.84 deg |

Range run verified **[live]**: "MultiGP track done: 15.0 s". Range code panel:

```
# MultiGP-style lap: 8 gates + hurdle + dive gate + finish arch
# timer starts at gate 1, stops at the arch
set osd_timer_1 = ON
set osd_stat_max_spd = ON
set vtx_channel = 1      # race band, assigned per heat
set vtx_power = 1        # 25 mW in the heat
```

### Failure scenarios **[live]**

- FC "arrow backward": "Flipped on take-off: the flight controller is mounted the wrong way round. Press R to
  reset" at about 1 s.
- PROPS "swapped CW/CCW": "Flipped on take-off: the props are on the wrong motors. Press R to reset".
- 2500 KV on 6S, hovering: "Desync! 2500KV on 6S overheats: the ESC lost a motor" after 35 s.
- Low battery and cut-off as in section 1.

### Controls, stats, FPV

Controls panel: `W S` "throttle (alt hold: climb / descend)" / `A D` "yaw" / `arrows` "pitch + roll" / `Space` "arm / disarm" / `R` "reset to the pad" / `V` "first-person (FPV) view"; then the line "or drag the two sticks on the figure". Source: the engine default list, since this craft defines no `controls`. Flight stats add nothing beyond the engine list (race mode shows
`gate n/N` and "Best lap"). FPV: 38 deg camera uptilt, prop blurs at the top corners, the OSD arrow points at the
next gate (`GATE n/8`).

### Lesson text

"Meet the racer" (summary): a race quad is a light, low 5-inch built only to get round a gate track fastest, about
420 g with a pack and 12-14:1 thrust to weight. The setup that matters most is software: rates (rotation speed at
full stick) and expo (softness around centre stick); too high overshoots gates, too low misses turns; consistent
laps beat one lucky lap.

Build code panel ("Betaflight CLI · build"):

```
# Betaflight CLI after the build
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON            # rpm filter: motors report rpm
set align_board_yaw = 0         # 180 if the arrow points back
# VTX table: race band, pit mode on boot
vtxtable bands 1
vtxtable band 1 RACEBAND R CUSTOM 5658 5695 5732 5769 5806 5843 5880 5917
set vtx_band = 1
set vtx_channel = 4
set vtx_power = 1               # 25 mW at a race
set vtx_pit_mode_freq = 5584
# LED strip on the LED pad, race colour = green
led 0 0,0::C:6
set ledstrip_race_color = 6
save
```

Practice task (summary): fly the 8 gates in angle mode until you manage 3 clean laps in a row, then switch to acro;
note your best lap; then cut max rate by 10 % and add 10 points of expo, fly 5 more laps and compare the spread
between best and worst lap.

### Quiz ("Check yourself")

1. "Why does a race VTX boot in pit mode?" Options: To save the battery; **So it never blasts other pilots' video while you plug in** (correct); Pit mode has better range.
2. "What does adding expo do to your rates?" Options: Raises the max rotation speed; **Makes small stick moves gentler without lowering the max rate** (correct); Reduces video latency.
3. "Why a stretched-X frame for racing?" Options: It is cheaper; **The rear props stay out of the front props' dirty air at speed** (correct); It carries a bigger battery.
4. "Your 4S race quad feels sluggish with 1950 KV motors. Why?" Options: **1950 KV is a 6S motor: on 4S the props spin too slowly** (correct); The props are on backwards; Rates are too high.

### Defects and inaccuracies to fix in the rebuild

- The overview says about 420 g; the default build computes 443 g.
- Thresholds disagree: the weak warning says "aim for 12:1+" but `minTW` is 9, so builds between 9:1 and 12:1 are
  called "Race-ready".
- `set osd_timer_1 = ON` is not a valid Betaflight value (the timer is a packed number; the element is enabled with
  `osd_timer_1_pos`). The `vtxtable` excerpt also omits the `vtxtable channels` / `powerlevels` lines.
- Race mode self-levels at 38 deg while its code block describes ACTUAL acro rates; either make race fly acro or say
  so in the panel (the engine default race code says "(angle mode here; real racers fly acro)", this craft's
  doesn't).
- The drawn prop size never changes with the prop choice.

---

## Fig 06. GPS camera drone (`gpscam`), file `10-fig06-gps-camera-drone.js`

Identity (`10:118-122`, `10:168`): name "GPS camera drone", sub "ArduPilot, gimbal", noun "camera drone" (heading
"Meet the camera drone"), hint "build it, calibrate the compass, then let it fly itself", palette `cobalt`,
mat 600, `benchH` 280, `benchZ` 125 (frame origin 125 mm above the mat, on its landing gear), `flyScale` 2.4,
`flyVB` 11000, `camZ` 0.6, `arrowZ` 96, `ceiling` 30 m, `fpvLevel: true` (gimbal-stabilised FPV), `camTilt` -20
(camera 20 deg down). Panels: "ArduPilot params", "MAVLink log"; calibrate button "Calibrate accel + compass".
Default mode `loiter`. An F450 / X500-class quad on a Pixhawk 6C.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `4s5000` * | 4S 5000 mAh | 4 | 5000 | 500 | 55 | `#2b2a28` | 4S 5000 |
| `4s3300` | 4S 3300 mAh | 4 | 3300 | 340 | 38 | `#2f5fa8` | 4S 3300 |
| `3s5000` | 3S 5000 mAh | 3 | 5000 | 410 | 40 | `#d9a520` | 3S 5000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `2212-920` * | 2212 920KV | 920 | 58 | 18 | 4 |
| `2216-880` | 2216 880KV | 880 | 72 | 24 | 4 |
| `2212-1400` | 2212 1400KV | 1400 | 56 | 16 | 3 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `1045` * | 10x4.5 two-blade | 1 | 1 | 13 | 8 |
| `1147` | 11x4.7 two-blade | 1.18 | 1.08 | 16 | 10 |
| `9450` | 9.4x5.0 two-blade | 0.82 | 0.94 | 11 | 7 |

Fixed parts (`10:20-25`):

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | F450-class frame: plates + 4 arms | 270 | 35 | Mechanical |
| `GEAR` | Landing gear (4 legs + skids) | 60 | 12 | Mechanical |
| `ESC` | 4x 30 A ESCs | 112 | 48 | Electrical |
| `XT60` | Power module + XT60 + cap | 22 | 18 | Electrical |
| `FC` | Pixhawk 6C flight controller | 40 | 165 | Electrical |
| `GPS` | M10 GPS + compass on a mast | 52 | 45 | Electrical |
| `TELEM` | 915 MHz telemetry radio | 24 | 40 | Electrical |
| `RX` | ELRS receiver | 4 | 18 | Electrical |
| `GIMBAL` | 2-axis gimbal + camera | 190 | 120 | Electrical |
| `TOP` | Top plate + standoffs + screws | 30 | 8 | Mechanical |
| `STRAP` | Battery straps | 12 | 5 | Mechanical |

Fixed parts total: **816 g**, $454 electrical + $60 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `10:171-180`)

```
V = cells*3.7;  krpm = KV*V/1000
thrust   = 5.4 * pf * krpm^2                 g per motor
AUW      = fixed + 4*motor.g + 4*prop.g + battery.g
hoverA   = AUW / (9 * prop.eff) / V          9 g/W at hover (big slow props)
hoverMin = (mAh/1000*0.8) / hoverA * 60;   flyMin = hoverMin * 0.8
maxA     = 4 * thrust / (3.4 * prop.eff) / V
over     = KV * cells * pf > 920*4*1.3 (= 4784)       prop size counts
weak     = T:W < 1.8
cost     = Mechanical += prop.price * 2;  hoverThr = sqrt(AUW / (4*thrust))
```

Design tiles for the default build (as rendered): "All-up weight" 1600 g; "Thrust : weight" 2.5 : 1; "Hover throttle" 63%; "Max current" 80 A; "Hover time" 20.0 min; "Freestyle time" 16.0 min. Cost table: Electrical $581, Mechanical $76, total $657. Verdict line: "Parts match: 2.5:1 is plenty for a camera drone, and the low hover current gives long flights."

Across all 27 combinations T:W ranges 1.08 to 7.58. `over` in 5: `4s5000/2212-1400/1045`, `4s5000/2212-1400/1147`, `4s3300/2212-1400/1045`, `4s3300/2212-1400/1147`, `3s5000/2212-1400/1147`. `weak` in 6: `3s5000/2212-920/1045`, `3s5000/2212-920/1147`, `3s5000/2212-920/9450`, `3s5000/2216-880/1045`, `3s5000/2216-880/1147`, `3s5000/2216-880/9450`.

Warnings (`10:181-186`):
- over: `${KV} KV on ${cells}S with ${prop name} props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low KV on 4S is the camera-drone recipe.`
- weak: `Thrust to weight ${tw.toFixed(1)}:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more.`
- ok: `Parts match: ${tw.toFixed(1)}:1 is plenty for a camera drone, and the low hover current gives long flights.`

### Frame and proportions (`10:187-262`)

- X quad, motors at (+-159.1, +-159.1) mm: 450 mm motor-to-motor, adjacent motors 318 mm apart. Props drawn
  2-blade at radius 127 mm (10") for every prop choice, so 64 mm clearance between neighbours.
- Hub: two 120 x 120 mm carbon plates, the top one on four 30 mm metal standoffs at (+-52, 0) and (0, +-52).
- Arms 45 to 238 mm from the centre, 22 mm wide, 24 mm tall; the two FRONT arms are the palette colour, the rear
  ones white (the orientation cue the part text teaches).
- Four blue 30 A ESCs (36 x 16 x 7 mm) on the arms at 104-140 mm, in the propwash.
- Landing gear: per side two legs from (+-40, +-38, -2) to (+-62, +-64, -116) and a 176 mm skid at z -120: the body
  sits 12 cm up.
- Battery slung under the body between the legs: 128 mm long for 5000 mAh packs, 104 mm otherwise, 48 x 40 mm,
  two straps.
- Pixhawk case 60 x 44 x 14 mm on the top plate with "PIXHAWK" printed, a black nose arrow and a green LED.
- GPS mast 86 mm tall at x = -44 (behind the FC), puck radius 28 mm with a forward arrow and blue LED.
- 915 MHz telemetry radio with a 52 mm whip; ELRS RX with two antenna wires.
- Gimbal under the nose at x = 72: mount plate, post, roll motor, arm, pitch motor, camera box pitched 20 deg down
  with a blue lens. In flight the gimbal frame stays level and only follows yaw (`10:194-204`): "the body leans, the
  camera does not".
- Bench tags: FC, GPS, GIMBAL, BATT, MOTORS, TELEM.

Motor order (`10:27-28`, ArduCopter QUAD/X): M1 front-right (159.1, -159.1) CCW, M2 rear-left CCW, M3 front-left
CW, M4 rear-right CW. The motor check reports M3 reversed.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `GEAR` | Landing gear | LANDING GEAR |  | 0 |  |
| 2 | `FRAME` | Frame: plates + 4 arms | FRAME | GEAR | 1 |  |
| 3 | `MOTORS` | 4 brushless motors, 920KV | MOTORS | FRAME | 2 |  |
| 4 | `ESC` | 4 separate 30 A ESCs | ESCs | FRAME | 2 |  |
| 5 | `WIRES` | Motor + power wiring | WIRING | MOTORS, ESC | 2 |  |
| 6 | `XT60` | Power module + XT60 + low-ESR cap | POWER MODULE | ESC | 1 | `cap stripe to minus` / `cap stripe to plus` |
| 7 | `TOP` | Top plate + standoffs | TOP PLATE | WIRES, XT60 | 3 |  |
| 8 | `FC` | Pixhawk 6C flight controller | PIXHAWK | TOP | 4 | `arrow forward` / `arrow backward` |
| 9 | `GPS` | M10 GPS + compass on a mast | GPS + COMPASS | TOP | 6 |  |
| 10 | `TELEM` | 915 MHz telemetry radio | TELEMETRY | FC | 5 |  |
| 11 | `RX` | ELRS receiver | RECEIVER | FC | 5 |  |
| 12 | `GIMBAL` | 2-axis brushless gimbal + camera | GIMBAL | GEAR | 0 |  |
| 13 | `BATT` | LiPo battery + straps | BATTERY | GEAR, XT60 | 0 |  |
| 14 | `PROPS` | 10-inch propellers | PROPS | MOTORS, TOP | 7 | `props on the right motors` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- GEAR: lifts the body 12 cm so the gimbal camera never touches the grass.
- FRAME: 450 mm motor to motor; coloured front arms vs white rear arms tell you which way it points from 50 m.
- MOTORS: low KV on 4S with 10" props: slow, efficient, quiet; a camera drone wants hover time, not punch.
- ESC: one 30 A ESC zip-tied on each arm in the propwash, PWM or DShot from MAIN OUT 1-4.
- WIRES: motor to ESC per arm, ESC power to the plate; reverse a motor in the ESC, not with the iron.
- XT60 (POWER MODULE): between battery and everything; gives the Pixhawk a clean 5.3 V and measures voltage and
  current so ArduPilot knows the mAh used.
- TOP: carries the electronics as far as possible from the high-current bottom plate.
- FC (PIXHAWK): ArduCopter's EKF fuses gyro, accelerometer, barometer, compass and GPS into one position; arrow to
  the nose or AHRS_ORIENTATION must say otherwise.
- GPS: on a mast because battery current bends the magnetometer; the puck's arrow must point forward too.
- TELEM: MAVLink on TELEM1 to Mission Planner or QGroundControl: live map, battery, missions uploaded mid-air.
- RX: when the RC link is lost, FS_THR_ENABLE makes ArduPilot fly home (RTL).
- GIMBAL: two brushless motors (roll, pitch) with their own IMU keep the camera level while the drone tilts.
- BATT: hangs near the centre of gravity; 5000 mAh at 4S is about 74 Wh, roughly 20 minutes of hover.
- PROPS: two CW, two CCW; on ArduCopter X, M1 front-right and M2 rear-left spin counter-clockwise; fitted last.

Build order **[live]**: GEAR, FRAME, MOTORS, ESC, WIRES, XT60, TOP, FC, GPS, TELEM, RX, GIMBAL, BATT, PROPS.
Mistakes: "cap stripe to plus" (pop), "arrow backward" (flip), "swapped CW/CCW" (flip), over-KV (desync).

### Bench safety tests

Standard buttons with "Calibrate accel + compass" (its toast still says "Accelerometer calibrated on a flat
surface"). No extra buttons. Motor check spins M1, M2, M3, M4 and fixes M3.

### Wiring diagram (`10:265-285`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 250 | BATTERY | 4S 5000 mAh | `#e2483d` |
| `XT60` | 190, 250 | POWER MODULE | V + I sense, 5.3 V | `#e2483d` |
| `ESC` | 370, 250 | ESC x4 | 30 A, DShot | `#e2483d` |
| `MOTORS` | 590, 250 | MOTORS x4 | 2212 920KV | `#f08a2b` |
| `FC` | 370, 100 | PIXHAWK 6C | ArduCopter 4.5 | `#3e86d9` |
| `GPS` | 130, 100 | GPS + COMPASS | M10, GPS1 + I2C | `#43a35a` |
| `TELEM` | 130, 10 | TELEMETRY | 915 MHz, MAVLink | `#8c4bd1` |
| `RX` | 590, 100 | RC RECEIVER | ELRS, RCIN | `#8c4bd1` |
| `GIMBAL` | 590, 10 | GIMBAL + CAM | 2-axis, MNT1 | `#43a35a` |

Connection labels drawn on the lines: "14.8V", "3-phase x4", "POWER1", "MAIN 1-4", "GPS1 + I2C", "TELEM1", "RCIN", "AUX / MNT1".

Legend: `#e2483d` power, `#43a35a` data / signal, `#f08a2b` motor phases.

### Flight modes

**`loiter` - "Loiter (GPS hold)"** (default mode). Arm hint: "W climbs. Let go: it brakes + holds". Controls: altitude-hold sticks.

```
# LOITER: the sticks ask for a velocity, the GPS holds position
FLTMODE1  5        # Loiter
LOIT_SPEED 500     # cm/s at full stick
LOIT_BRK_ACCEL 250 # how hard it brakes when you let go
LOIT_BRK_DELAY 1.0 # s before the brake kicks in
```

**`althold` - "AltHold (no GPS)"**. Arm hint: "Holds height, not position". Controls: altitude-hold sticks.

```
# ALT_HOLD: the barometer holds height, nothing holds position
# turn the wind on and watch it drift
FLTMODE2  2        # AltHold
PILOT_SPEED_UP 250 # cm/s climb at full throttle
ANGLE_MAX 3000     # 30 deg max lean (centi-degrees)
```

**`rtl` - "RTL (return to launch)"**. Arm hint: "RTL: climb, fly home, land". Controls: altitude-hold sticks.

```
# RTL: climb, fly home, land, disarm. Also what the failsafes do
FLTMODE6  6        # RTL
RTL_ALT   1200     # cm: climb to 12 m (above the roof) before coming home
RTL_SPEED 0        # 0 = use WPNAV_SPEED
FS_THR_ENABLE 1    # radio lost   -> RTL
BATT_FS_LOW_ACT 2  # battery low  -> RTL
```

**`mission` - "Auto mission (4 waypoints)"**. Arm hint: "AUTO: fly the square, come home". Controls: altitude-hold sticks.

```
QGC WPL 110
# seq cur frame cmd             ...   alt
0  1  0  16  home
1  0  3  22  TAKEOFF                   5
2  0  3  16  WAYPOINT  +5 m E, -3 m N  5
3  0  3  16  WAYPOINT  +5 m E, +4 m N  5
4  0  3  16  WAYPOINT  -2 m E, +4 m N  5
5  0  3  16  WAYPOINT  -2 m E, -3 m N  5
6  0  3  20  RETURN_TO_LAUNCH
```


### Autopilot (`10:48-116`)

Constants: `RTL_ALT = 12` m ("RTL clears the house roof (9 m)"), `MISSION_ALT = 5` m, waypoints
`WPS = (20,12), (20,19), (13,19), (13,12)` (a 7 x 7 m square east of the pad (15, 15)).

- `tiltFor(ax, ay)`: limit the requested world acceleration to 4.5 m/s^2, rotate into the body frame
  (`af = ax cos(yaw) + ay sin(yaw)`, `aleft = -ax sin(yaw) + ay cos(yaw)`), stick = `atan2(a, g) / 38deg`, clamped.
- `goTo(tx, ty, vmax = 4)`: velocity target = 0.8 x position error, capped at `vmax`; acceleration =
  1.6 x velocity error.
- `climbTo(z)`: throttle stick = `clamp(0.8 * (z - alt), -1, 1)` (so at most 2.2 m/s).
- `faceTo`: yaw stick = `clamp(-1.5 * bearing error)` when more than 1.5 m away, else 0.
- `landStep`: throttle stick -0.7 above 1.5 m, -0.25 below (about 1.5 and 0.55 m/s); after 0.6 s on the ground it
  disarms ("Landed: disarmed", log "LAND complete, disarmed", sound `unplug`).
- Loiter: full stick asks for 5 m/s (`LOIT_SPEED 500`); with sticks centred (|pitch| and |roll| <= 0.05) it holds
  the point it would reach in 0.4 s (`pos + vel*0.4`) at up to 3 m/s. Below 0.1 m it never holds.
- AltHold: stock angle flight with height hold; nothing holds position.
- RTL: phase 0 climbs to 12 m while braking, until above 11.6 m (or within 0.6 m of home), log
  `RTL: heading home, ${d} m`; phase 1 holds 12 m, flies home at up to 5 m/s facing home; within 0.5 m and below
  0.6 m/s, log "RTL: over home, landing"; phase 2 lands.
- Mission: phase 0 climbs to 5 m, log "TAKEOFF done: 5 m"; phase 1 visits each waypoint at 4 m/s facing it, within
  0.8 m logs `reached WP ${n}` with a `chime`; after WP 4 logs "RETURN_TO_LAUNCH"; phase 2 flies home at 5 m;
  phase 3 lands: "Mission complete: landed at home" with `ding`. Arming in RTL or mission logs
  "RTL: climbing to RTL_ALT 12 m" or "AUTO: mission start, 4 waypoints".
- The autopilot builds its own stick copy, flies `multirotor()`, then restores the pilot's sticks.

Verified **[live]**:
- Mission: takeoff done 2.6 s, WP1 5.1 s, WP2 8.0 s, WP3 10.8 s, WP4 13.7 s, landed and disarmed 22.0 s, 75 mAh.
  Sounds: whoosh, power, four chimes, unplug + ding.
- Loiter, then RTL from 12 m east at 4 m: climbs, "RTL: heading home, 11.9 m" at 12.9 s, "over home, landing" at
  17.5 s, landed 27.7 s.
- Loiter brake: 4 s of full forward carried it to x = 27, it stopped within about 1 s of release and held to 0.25 m.
- Gusty wind for 23 s: Loiter stayed within 3 cm of its spot; AltHold drifted 3.3 m.
- RTL started at 20.6 m above the tower: it skips the climb and descends to 12 m while flying home (real ArduPilot
  keeps the current altitude when it is already above RTL_ALT).

Field drawing in mission mode (`10:315-324`): a dashed route pad, WP1..WP4, pad on the ground; a 0.26 m ring with
its number at each waypoint (the current one filled with the accent colour) and a short post.
Flight stats (`10:325-329`): mission "Waypoint" `n/4` (or "takeoff"); RTL "Home" `x.x m`; every other mode a
static "GPS" "3D fix, 14 sats".

### Range: "Roof + tower inspection" (`10:123-167`)

Brief "Photograph the roof from 4 sides, check the tower antennas, come home"; field 60 m, pad (15, 15), ground
`#dde3cc`, altitude-hold sticks, camTilt -20. Scenery: a 4 x 60 m road at x 28 and a driveway; the house to
photograph at (36, 32), 10 x 8 x 6 m with a 3 m roof and a porch; a red barn 8 x 12 x 5 m at (48, 14); a cell
tower at (18, 46): 3.6 m concrete pad, an 18 m lattice pole (r 0.35 m), four antenna panels at 15.2-17 m and an
equipment shed; a 13 x 10 m parking lot with red, blue, yellow and white cars; a solar array of three panel rows on
legs at x 6-11, y 30; seven trees. The mission square and pad are kept clear of every solid.

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | PHOTO WEST | 26 | 32 | 8 | 1.8 | sphere (touch) |
| 2 | PHOTO SOUTH | 36 | 22 | 8 | 1.8 | sphere (touch) |
| 3 | PHOTO EAST | 46 | 32 | 8 | 1.8 | sphere (touch) |
| 4 | PHOTO NORTH | 36 | 42 | 8 | 1.8 | sphere (touch) |
| 5 | TOWER TOP | 18 | 46 | 20.6 | 1.8 | sphere (touch) |
| 6 | LAND | 15 | 15 | 0.8 | 1.8 | sphere (touch) |

Run verified **[live]**: "Roof + tower inspection done: 7.5 s (best!)" (teleport timing). Range code:

```
# the inspection as an ArduPilot mission (QGC WPL 110)
# photo points around the roof at 8 m, camera on the gimbal
# DO_SET_ROI points the camera at the house the whole time
DO_SET_ROI    36 32 4        # look at the roof
WAYPOINT      26 32 8   +  DO_DIGICAM_CONTROL
WAYPOINT      36 22 8   +  DO_DIGICAM_CONTROL
WAYPOINT      46 32 8   +  DO_DIGICAM_CONTROL
WAYPOINT      36 42 8   +  DO_DIGICAM_CONTROL
WAYPOINT      18 46 20       # tower antennas, above the mast
RETURN_TO_LAUNCH
```

### Failure scenarios **[live]**

- "arrow backward" FC: "Flipped on take-off: the flight controller is mounted the wrong way round" at 0.9 s.
- 1400 KV motor on 4S (over): "Desync! 1400KV on 4S overheats: the ESC lost a motor" after 33 s of hover.
- AltHold in wind drifts (the lesson of the mode); Loiter holds.
- Radio-loss and low-battery failsafes are explained in the params (`FS_THR_ENABLE 1`, `BATT_FS_LOW_ACT 2`) but not
  simulated: the battery only warns at 3.5 V/cell and cuts at 3.2 V/cell.

### Controls and FPV

Controls panel: `W S` "climb / descend (every mode holds height)" / `A D` "yaw" / `arrows` "fly (Loiter: let go to brake)" / `Space` "arm / disarm" / `R` "reset to the pad"; then the line "or drag the two sticks on the figure". Source: the craft's own `controls`. FPV is gimbal-level (only yaw follows the drone) and pitched 20 deg
down.

### Lesson text

"Meet the camera drone" (summary): the drone most people picture, a GPS quad with a gimbal camera running
ArduPilot on a Pixhawk; an EKF fuses gyro, accelerometer, barometer, compass and GPS into one position so it can
hold still in wind, fly home and run missions. Same motor/prop idea as the racer but opposite priorities: low KV,
big props, long flights, smooth footage. It suggests Loiter, then AltHold with the wind on, then the mission and RTL.

Build code panel ("ArduPilot params · build"):

```
# Mission Planner > Config > Full Parameter List
FRAME_CLASS      1     # quad
FRAME_TYPE       1     # X
SERVO1_FUNCTION  33    # motor 1 .. SERVO4_FUNCTION 36
MNT1_TYPE        1     # servo gimbal on AUX (SERVO9 = tilt)
BATT_MONITOR     4     # power module: voltage + current
BATT_CAPACITY    5000
AHRS_ORIENTATION 0     # 4 (yaw 180) if the arrow points back
FS_THR_ENABLE    1     # radio lost -> RTL
BATT_FS_LOW_ACT  2     # low battery -> RTL
RTL_ALT          1200  # cm: above the tallest roof
```

Practice task (summary): install ArduPilot SITL (`sim_vehicle.py -v ArduCopter`) and QGroundControl, plan and fly
a 4-waypoint mission in simulation, pull the "radio" to watch the failsafe trigger RTL, and only then fly for real
over an empty field with RTL_ALT above the tallest tree.

### Quiz

1. "You let go of the sticks in a breeze. Loiter vs AltHold?" Options: Both drift the same; **Loiter holds the spot with GPS, AltHold only holds height and drifts** (correct); AltHold holds the spot, Loiter drifts.
2. "Why is the GPS + compass up on a mast?" Options: Better view of the sky only; **The compass is a magnetometer: current in the power wires bends its reading** (correct); So the props don’t hit it.
3. "With FS_THR_ENABLE = 1, the radio link drops. ArduPilot..." Options: cuts the motors; hovers until the battery dies; **switches to RTL and flies home** (correct).
4. "What keeps the footage level when the drone leans to fly forward?" Options: The flight controller tilts the props; **The gimbal’s own motors and IMU counter-rotate the camera** (correct); The camera crops the picture.

### Defects and inaccuracies

- "GPS: 3D fix, 14 sats" is a constant string; there is no GPS model (no loss of fix, no satellite count).
- The calibrate toast ignores the compass named on the button.
- RTL from above RTL_ALT descends instead of holding altitude.
- Weak threshold 1.8 while the text asks for "about 2:1 or more".
- The `QGC WPL 110` panel writes east/north offsets instead of the file's real lat/lon columns (fine as teaching
  shorthand, but it is not a loadable file).
- Failsafes are described but never triggered by the simulator.

---

## Fig 07. Autonomous delivery drone (`delivery`), file `11-fig07-autonomous-delivery-drone.js`

Identity (`11:242-248`, `11:287-288`): name "Delivery drone", sub "Pixhawk + companion", noun "delivery drone",
hint "build it, smoke-test it, then send it on a delivery", palette `mustard`, mat 960, `benchH` 420, `benchZ` 210,
`flyScale` 2 (`FS`), `flyVB` 16000, `camZ` 0.78, `ceiling` 18 m, `arrowZ` 110, `fpvLevel: true`. Panels:
"ArduPilot + companion", "MAVLink log"; calibrate "Calibrate accel + compass". Default mode `deliver`. A 690 mm
folding quad with a Pixhawk 6C, a Raspberry Pi 5 companion, a depth camera, GPS, LTE, 15" props and a winch.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `6s10000` * | 6S 10000 mAh | 6 | 10000 | 1350 | 160 | `#2b2a28` | 6S 10000 |
| `6s16000` | 6S 16000 mAh | 6 | 16000 | 2050 | 245 | `#2f5fa8` | 6S 16000 |
| `4s10000` | 4S 10000 mAh | 4 | 10000 | 880 | 110 | `#d9a520` | 4S 10000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `4114-400` * | 4114 400KV | 400 | 140 | 58 | 6 |
| `5010-360` | 5010 360KV | 360 | 118 | 46 | 6 |
| `2814-700` | 2814 700KV | 700 | 105 | 32 | 4 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `15x5.5` * | 15x5.5 carbon 2-blade | 1 | 1 | 28 | 32 |
| `14x4.8` | 14x4.8 (lighter load) | 0.82 | 1.06 | 24 | 26 |
| `16x5.4` | 16x5.4 (heavy lift) | 1.18 | 0.95 | 34 | 38 |

Fixed parts (`11:21-29`); note the 1 kg parcel is part of the all-up weight:

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | 690 mm folding carbon frame + skids | 1100 | 189 | Mechanical |
| `ESC` | 4 x 40 A ESCs | 180 | 120 | Electrical |
| `FC` | Pixhawk 6C | 60 | 245 | Electrical |
| `COMP` | Raspberry Pi 5 (8 GB) + fan | 55 | 95 | Electrical |
| `DEPTH` | Stereo depth camera | 75 | 289 | Electrical |
| `GPS` | M10 GPS + compass + mast | 60 | 59 | Electrical |
| `LTE` | 4G/LTE USB modem + antennas | 35 | 69 | Electrical |
| `RX` | Backup RC receiver | 5 | 22 | Electrical |
| `TEL` | SiK telemetry radio | 25 | 49 | Electrical |
| `XT60` | PDB + XT90 + 1000 uF cap + BECs | 70 | 35 | Electrical |
| `TOP` | Top plate + standoffs + straps | 160 | 25 | Mechanical |
| `CARGO` | Servo winch + cargo bay | 330 | 89 | Mechanical |
| `PARCEL` | Parcel (payload) | 1000 | 0 | Mechanical |

Fixed parts total: **3155 g**, $983 electrical + $303 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `11:63-77`)

```
thrust   = 32 * pf * krpm^2                  g per motor ("15-inch class")
AUW      = fixed (incl. 1000 g parcel) + 4*motor.g + 4*prop.g + battery.g
hoverA   = AUW / (9.5 * prop.eff) / V        big slow props: ~9.5 g/W
hoverMin = (mAh/1000*0.8) / hoverA * 60;   flyMin = hoverMin * 0.85
maxA     = 4 * thrust / (3.6 * prop.eff) / V
over     = KV * cells > 600*6*1.15 (= 4140)
weak     = T:W < 1.6
cost     = Mechanical += prop.price * 2;  hoverThr = sqrt(AUW / (4*thrust))
```

`maxKvCells` and `minTW` are also passed to `defineDrone` (`11:248`) but unused, because the craft has its own calc.

Design tiles for the default build (as rendered): "All-up weight" 5177 g; "Thrust : weight" 1.9 : 1; "Hover throttle" 72%; "Max current" 126 A; "Hover time" 19.6 min; "Freestyle time" 16.6 min. Cost table: Electrical $1375, Mechanical $367, total $1742. Verdict line: "Parts match: 1.9:1 with the parcel aboard, about 17 min of delivery flying."

Across all 27 combinations T:W ranges 0.65 to 7.21. `over` in 6: `6s10000/2814-700/15x5.5`, `6s10000/2814-700/14x4.8`, `6s10000/2814-700/16x5.4`, `6s16000/2814-700/15x5.5`, `6s16000/2814-700/14x4.8`, `6s16000/2814-700/16x5.4`. `weak` in 10: `6s10000/5010-360/14x4.8`, `6s16000/4114-400/14x4.8`, `6s16000/5010-360/15x5.5`, `6s16000/5010-360/14x4.8`, `4s10000/4114-400/15x5.5`, `4s10000/4114-400/14x4.8`, `4s10000/4114-400/16x5.4`, `4s10000/5010-360/15x5.5`, `4s10000/5010-360/14x4.8`, `4s10000/5010-360/16x5.4`.

Warnings (`11:249-251`):
- over: `${KV} KV on ${cells}S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S).`
- weak: `Thrust to weight ${tw.toFixed(2)}:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery: add voltage or prop.`
- ok: `Parts match: ${tw.toFixed(1)}:1 with the parcel aboard, about ${Math.round(flyMin)} min of delivery flying.`

### Frame and proportions (`11:139-223`)

- X quad, motors at (+-244, +-244) mm: 690 mm motor-to-motor, neighbours 488 mm apart; props drawn 2-blade carbon
  at radius 190 mm (15") whatever is selected, so about 107 mm clearance.
- Hub 240 x 220 x 5 mm; arms are 22 mm carbon tubes from (+-80, +-80) to 94 % of the motor position, each with a
  palette-coloured fold hinge block at (+-92, +-92).
- Landing skids: legs from (+-80, +-100, -5) down to (+-80, +-150, -205) and two 350 mm skids at z -205.
- Winch and cargo bay: four rods down to a 208 x 172 mm bay plate at z -182; winch drum radius 18 mm, 84 mm long,
  at z -32; cardboard parcel 168 x 136 x 120 mm with a tape strip, visible on the bench and until it is lowered.
- Motors: 52 x 52 mm mount block, 47 mm bell, 34 mm tall, shaft to 42.
- ESCs (`#2f4f7a`) 44 x 24 x 9 mm halfway out each arm; PDB board with the capacitor (stripe shows orientation)
  and a yellow XT90 on the battery lead.
- Pixhawk 6C (82 x 44 x 14 mm) on a black damping plate, red side stripe, "PIXHAWK" text, red nose arrow, green LED.
- Nose: stereo depth camera 22 x 92 x 26 mm with two blue lenses and a purple IR projector.
- Top plate 250 x 224 mm on 40 mm standoffs carrying the battery (176 mm long, 200 mm above 12000 mAh; 76 x 61 mm),
  the green Pi 5 board with two USB blocks and a fan ("Pi 5"), and the LTE board with two 65 mm antennas.
- GPS mast 129 mm (carbon) at x = -100 with a 72 mm puck and arrow; telemetry radio with a long angled antenna; RC
  receiver with two antennas.
- Bench tags: FC, COMP, GPS, DEPTH, CARGO, MOTORS, BATT, XT60.

Motor order (`11:50-52`): M1 front-right CCW, M2 rear-left CCW, M3 front-left CW, M4 rear-right CW (ArduPilot quad
X). Motor check reports M3 reversed.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Carbon frame: hub, folding arms, landing skids | FRAME |  | 0 |  |
| 2 | `MOTORS` | 4 x 4114 400KV motors | MOTORS | FRAME | 3 |  |
| 3 | `ESC` | 4 x 40 A ESCs on the arms | ESCs | FRAME | 2 |  |
| 4 | `WIRES` | Motor + power wiring | WIRING | MOTORS, ESC | 2 |  |
| 5 | `XT60` | Power distribution board + XT90 + capacitor | PDB + CAP | FRAME | 2 | `stripe to minus` / `stripe to plus` |
| 6 | `FC` | Pixhawk 6C flight controller | PIXHAWK 6C | XT60 | 4 | `arrow forward` / `arrow backward` |
| 7 | `RX` | Backup RC receiver | RC BACKUP | FC | 4 |  |
| 8 | `TEL` | Telemetry radio (SiK 433 MHz) | TELEMETRY | FC | 4 |  |
| 9 | `DEPTH` | Stereo depth camera | DEPTH CAM | FRAME | 4 |  |
| 10 | `TOP` | Top plate + standoffs | TOP PLATE | FC, RX, TEL | 7 |  |
| 11 | `COMP` | Raspberry Pi 5 companion computer | COMPANION | TOP | 10 |  |
| 12 | `LTE` | 4G/LTE modem | LTE MODEM | TOP | 10 |  |
| 13 | `GPS` | GPS + compass on a mast | GPS MAST | TOP | 12 |  |
| 14 | `CARGO` | Servo winch + cargo bay | WINCH | FRAME | -5 |  |
| 15 | `BATT` | 6S LiPo + straps | BATTERY | TOP, XT60 | 10 |  |
| 16 | `PROPS` | 15" carbon propellers | PROPS | MOTORS, TOP | 14 | `props in (correct)` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- FRAME: carbon hub, four 25 mm carbon tube arms that fold for transport, skids; arm latches must click home or the
  drone drops like a stone.
- MOTORS: low-KV outrunners swinging big props slowly are far more efficient; each lifts about 2.5 kg flat out on 6S
  (the calc gives 2523 g).
- ESC: four separate 40 A ESCs out on the arms, cooled by prop wash, driven with DShot.
- WIRES: long power leads add inductance, so throttle changes kick voltage spikes back down them.
- XT60 (PDB + CAP): splits power to the four ESCs, makes clean 5 V and 12 V (BECs); the 1000 uF capacitor soaks up
  the spikes; stripe to minus.
- FC: Pixhawk 6C with three IMUs, a barometer, EKF3 and the mission logic, on damping balls, arrow to the nose.
- RX: a backup radio so a human can always take over (Loiter or Stabilize); most aviation rules require it.
- TEL: SiK 433 MHz MAVLink to the ground-station laptop over a few km; losing it triggers the GCS failsafe home.
- DEPTH: two cameras and an IR projector measure distance per pixel; the companion uses it for obstacle avoidance
  and SLAM on the final approach, where GPS is only good to a couple of metres.
- TOP: carries battery, companion and modem close to the centre.
- COMP: the Pi 5 runs MAVSDK or ROS 2, the depth pipeline and the 4G link, and sends MAVLink to the Pixhawk over a
  UART, but every bit of real-time control stays on the Pixhawk.
- LTE: a cellular link on the Pi's USB lets it be commanded anywhere with coverage; beyond visual line of sight
  needs permission.
- GPS: on a mast because tens of amps in the battery leads bend the compass.
- CARGO: the winch lowers the parcel on a line so the props never come near people; AUX output with
  `SERVOn_FUNCTION = 88`.
- BATT: never below 3.5 V/cell under load, store at 3.8 V, never charge unattended.
- PROPS: two CW and two CCW cancel torque; a prop strike at this size cuts to the bone; fitted last.

Build order **[live]**: FRAME, MOTORS, ESC, WIRES, XT60, FC, RX, TEL, DEPTH, TOP, COMP, LTE, GPS, CARGO, BATT,
PROPS. Note CARGO has `z: -5`: in the exploded view it drops below the frame.

### Bench safety tests

Standard buttons with "Calibrate accel + compass"; no extra buttons. The plug log prints the full float:
"battery plugged: 25.200000000000003 V" (should be 25.2 V).

### Wiring diagram (`11:346-371`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `CARGO` | 20, 14 | WINCH + BAY | servo PWM from AUX1 | `#f08a2b` |
| `LTE` | 190, 14 | LTE MODEM | 4G, USB to the Pi | `#8c4bd1` |
| `COMP` | 360, 14 | RASPBERRY PI 5 | companion, MAVSDK | `#3e86d9` |
| `DEPTH` | 590, 14 | DEPTH CAMERA | USB3, SLAM | `#43a35a` |
| `RX` | 20, 130 | RC RECEIVER | backup, CRSF | `#8c4bd1` |
| `TEL` | 190, 130 | TELEMETRY | SiK 433 MHz | `#8c4bd1` |
| `FC` | 360, 130 | PIXHAWK 6C | ArduCopter, 3 IMUs | `#3e86d9` |
| `GPS` | 590, 130 | GPS + COMPASS | M10, UART + I2C | `#43a35a` |
| `BATT` | 20, 250 | BATTERY | 6S 10000 mAh | `#e2483d` |
| `XT60` | 190, 250 | PDB + CAP | XT90, 5 V + 12 V BEC | `#e2483d` |
| `ESC` | 360, 250 | ESCs x4 | 40 A, DShot | `#e2483d` |
| `MOTORS` | 590, 250 | MOTORS x4 | 4114 400KV | `#f08a2b` |

Connection labels drawn on the lines: "22.2V", "3-phase x4", "DShot", "5 V", "5 V 5 A", "MAVLink", "UART + I2C", "CRSF", "USB3", "USB", "winch PWM".

Legend: `#e2483d` power, `#43a35a` data / MAVLink / USB, `#f08a2b` motors + winch.

### Flight modes

**`deliver` - "Deliver a parcel (auto)"** (default mode). Arm hint: "Autopilot: take off, fly to the drop zone, winch the parcel down". Controls: altitude-hold sticks.

```
# companion computer (Raspberry Pi 5), MAVSDK-Python
import asyncio
from mavsdk import System

async def deliver():
    drone = System()
    await drone.connect(system_address="serial:///dev/ttyAMA0:921600")
    await drone.action.set_takeoff_altitude(12)   # above roofs + wires
    await drone.action.arm()
    await drone.action.takeoff()
    await drone.action.goto_location(DROP_LAT, DROP_LON, ALT_AMSL, 0)
    # descend to 3.5 m, then MAV_CMD_DO_WINCH: lower, release, retract
    await drone.action.return_to_launch()

asyncio.run(deliver())
```

**`loiter` - "Loiter (GPS hold)"**. Arm hint: "Let go of the arrows: the GPS holds position". Controls: altitude-hold sticks.

```
# Loiter: sticks move it, centred sticks = hold position
LOIT_SPEED 500        # cm/s max horizontal speed
LOIT_ACC_MAX 250      # gentle with a parcel on a line
PILOT_SPEED_UP 150    # cm/s climb
EK3_SRC1_POSXY 3      # GPS for position
```

**`rtl` - "Return to launch"**. Arm hint: "Climbs to 12 m (above the roofs), flies home, lands". Controls: altitude-hold sticks.

```
# what the failsafes do: climb, fly home, land
RTL_ALT 1200          # cm: climb to 12 m, above roofs and power lines
RTL_SPEED 300         # cm/s
FS_GCS_ENABLE 1       # telemetry lost -> RTL
FS_BATT_ENABLE 2      # low battery -> RTL
BATT_LOW_VOLT 21.0    # 3.5 V per cell
```


### Autopilot: the delivery mission (`11:57-136`, `11:335-343`)

Constants (`11:59-61`): depot pad `PADP = (24, 45)`, drop zones `DZ = (38, 65), (66, 25), (78, 66)`, the auto
mission uses only `DROP = DZ[0]`; `CRUISE = 12` m ("cruise clears roofs (7 m) and power poles (9 m)"),
`HOVER = 3.5` m, `PAYLOAD = 1000` g, `FS = 2` (the craft is drawn 2x life size in the field).
Phase names (`PHASES`): "takeoff", "to drop zone", "descend", "lowering", "release", "winch up", "climb",
"flying home", "landing", "delivered".

`goTo(tx, ty, tz, vmax = 3, face = true)`: speed = `min(vmax, 0.7 * distance)` toward the target, acceleration =
1.4 x velocity error, converted to sticks with `k = 1 / (9.81 tan 38deg)` and clamped to +-0.5 (so the autopilot
tilts at most about 19 deg); yaw stick = `clamp(-1.2 * heading error, +-0.5)` when more than 2.5 m away; throttle
stick = `clamp(0.9*(tz - z) - 0.25*vz, +-1)`.

| phase | what it does | exit condition | message on entry (log is always `mission: <phase>`) |
|---|---|---|---|
| 0 takeoff | climb over the pad to 12 m, 1 m/s horizontal limit | z > 11.6 m | (arm hint) |
| 1 to drop zone | fly to DZ 1 at 12 m, up to 5 m/s, facing it | < 0.6 m and < 0.6 m/s | "Flying to the drop zone" |
| 2 descend | descend to 3.5 m over the zone | within 0.2 m of 3.5 m and 1.5 s in phase | |
| 3 lowering | line pays out at 0.9 m/s until it reaches the ground (altitude + 0.1 m) | line on the ground | "Holding position, lowering the parcel" |
| 4 release | 0.6 s later the parcel is released: AUW -1000 g, `hoverThr` recomputed; log "payload released: AUW -1000 g, hover throttle drops" | 1.4 s in phase | "Parcel on the ground: releasing" + sound `snap` |
| 5 winch up | line retracts at 1.2 m/s | line = 0 | |
| 6 climb | climb back to 12 m over the zone | z > 11.6 m | "Winch stowed, climbing" |
| 7 flying home | fly to the depot at 12 m, up to 5 m/s | < 0.4 m and < 0.5 m/s | "Returning to launch" |
| 8 landing | hold over the pad, throttle stick -0.7 above 1.2 m, -0.35 below | on the ground, abs(vz) < 0.3 m/s, 1 s in phase | "Landing" |
| 9 delivered | disarm, sound `ding` | | "Delivered! Landed back on the pad" |

Arming in Deliver calls `startMission`: if a parcel was already dropped it reloads it ("New parcel loaded: off we
go") and recomputes `calc()` (`11:94-98`). RTL armed on the pad climbs to 12 m in place, flies home, lands: "Home.
Motors stopped". Loiter (`loiterAssist`, `11:128-136`): any arrow key or stick means plain angle flight; hands off
holds the current spot with `goTo(hold, current height, vmax 2)` while keeping the pilot's throttle and yaw.

Verified **[live]** (default build):
- Delivery: "Flying to the drop zone" 6.1 s, descend 14.0 s, "Holding position, lowering the parcel" 18.7 s,
  "Parcel on the ground: releasing" 22.7 s, released 23.3 s (AUW 5177 to 4177 g, hover throttle 0.716 to 0.643),
  winch up 24.1 s, "Winch stowed, climbing" 27.2 s, "Returning to launch" 31.6 s, "Landing" 39.5 s, "Delivered!
  Landed back on the pad" 48.4 s; 337 mAh. Cruise about 4.2 m/s. Gusty wind changes nothing (same 48.4 s).
- RTL armed on the pad: "Landing" at 6.1 s, "Home. Motors stopped" at 14.9 s.
- Loiter arrows fly full angle mode (38 deg, 11.5 m/s seen), hands-off holds position (3 cm drift in wind).
- **Defect**: switching from Loiter to RTL in the air does nothing. `fl.mis` was never created (the arm happened in
  Loiter), so `rtl()` never runs, but `D.auto` is true so the pilot's sticks are ignored: the drone hovers until R.
- **Gap**: a build with T:W below 1 (for example 4S 10000 + 5010 360KV, 0.79:1) arms and sits on the pad in
  "takeoff" for ever, with no message.

Field drawing (`11:226-240`): at drop zone 1 a cream disc (r 0.9 m) with a red ring (r 0.56 m) and a red X; the
winch line from the belly down by `line` metres, the parcel box hanging on it until release, then a metal hook; the
dropped parcel stays on the lawn (drawn at 2x). Flight stats: "Mission" `<phase>` and "Parcel" "aboard" /
"delivered".

### Range: "Suburb deliveries" (`11:290-333`)

Brief "Hover over the three drop zones in order (4 m), then back to the depot"; field 90 m, pad (24, 45), ground
`#dbe3c6`, altitude-hold sticks, camTilt -15. Scenery: two 6 m streets crossing at (58, 45) with white centre
lines; the depot yard and depot (10 x 16 x 6 m at (12, 45)) with a loading-bay door and two parcel crates; eight
houses (8 x 7 x 4 m with 3 m roofs, four colour pairs) at x 38, 50, 66, 78 on both sides of the main street;
10 x 10 m backyard lawns; 1.2 m fences round each lot; drop-zone discs r 2 m labelled 1, 2, 3; six 9 m power poles
along x = 54 with non-solid wires at 8.6 m; a school (16 x 9 x 5 m with a roof slab), a playground and a hexagonal
corner shop; twelve trees. (`trees` at `11:334` is dead config.)

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | ADDRESS 1 | 38 | 65 | 4 | 2.2 | sphere (touch) |
| 2 | ADDRESS 2 | 66 | 25 | 4 | 2.2 | sphere (touch) |
| 3 | ADDRESS 3 | 78 | 66 | 4 | 2.2 | sphere (touch) |
| 4 | BACK TO DEPOT | 24 | 45 | 1 | 2 | sphere (touch) |

Run verified **[live]**: all four labels pass in order. Range code:

```
# a multi-drop route: climb above roofs, then each drop zone in turn
WPNAV_SPEED 500       # cm/s between drops
WP_YAW_BEHAVIOR 1     # face the next waypoint (the nav camera looks ahead)
FENCE_ENABLE 1        # geofence the neighbourhood
FENCE_ALT_MAX 30
RTL_ALT 1200          # 12 m clears every roof and wire
```

### Failure scenarios **[live]**

- PROPS swapped: "Flipped on take-off: the props are on the wrong motors" at 0.8 s.
- 2814 700KV on 6S: "Desync! 700KV on 6S overheats: the ESC lost a motor" after 34 s.
- The arm-latch failure and the GCS-link failsafe are taught in text only.

### Controls and FPV

Controls panel: `W S` "throttle (alt hold: climb / descend)" / `A D` "yaw" / `arrows` "pitch + roll" / `Space` "arm / disarm" / `R` "reset to the pad" / `V` "first-person (FPV) view"; then the line "or drag the two sticks on the figure". Source: the engine default list, since this craft defines no `controls`. FPV is gimbal-level, 15 deg down on the range.

### Lesson text

"Meet the delivery drone" (summary): two computers in one airframe. The Pixhawk does everything real-time
(stabilisation, EKF fusion, GPS navigation, failsafes); the Raspberry Pi companion does mission logic, the depth
camera and the 4G link and talks MAVLink. It never lands at the door: it hovers a few metres up and winches the
parcel down, keeping props far from people; watch the hover throttle drop when the parcel lets go.

Build code panel ("ArduPilot + companion · build"):

```
# ArduCopter parameters (Mission Planner / MAVProxy)
FRAME_CLASS 1          # quad
FRAME_TYPE 1           # X
AHRS_ORIENTATION 0     # 4 (yaw 180) if the arrow points back
SERIAL2_PROTOCOL 2     # MAVLink2 to the Raspberry Pi
SERIAL2_BAUD 921       # 921600 baud
SERVO9_FUNCTION 88     # winch on AUX1
WINCH_TYPE 1           # PWM winch
MOT_PWM_TYPE 6         # DShot600
FS_GCS_ENABLE 1        # lose telemetry -> RTL
```

Practice task (summary): in ArduPilot SITL plan a three-waypoint mission with a DO_WINCH command at the drop point,
fly it from a MAVSDK script on a laptop, cut the telemetry link mid-flight to check the GCS failsafe triggers RTL,
and note how far it flew before turning back.

### Quiz

1. "Why lower the parcel on a winch instead of landing at the door?" Options: It is faster; **The props stay high above people, pets and fences** (correct); A winch saves battery.
2. "Which board does the real-time stabilisation?" Options: The Raspberry Pi; **The Pixhawk** (correct); The LTE modem.
3. "Why is the GPS up on a mast?" Options: Only for a better view of the sky; **To keep the compass away from the magnetic field of the power wiring** (correct); It is easier to plug in.
4. "The parcel is released. What happens to the hover throttle?" Options: It goes up; **It drops: the drone is 1 kg lighter** (correct); It stays the same.

### Defects and inaccuracies

- Loiter to RTL mid-air is a dead mode that also locks the pilot out (above).
- The auto mission only ever flies to drop zone 1; zones 2 and 3 exist only as range checkpoints.
- The over warning always says 15" props, whatever prop is chosen.
- No in-flight feedback when the build cannot lift off.
- `FS_BATT_ENABLE` is the pre-3.6 name; current ArduPilot uses `BATT_FS_LOW_ACT`.
- The MAVSDK snippet uses placeholders (`DROP_LAT`, `DROP_LON`, `ALT_AMSL`) and leaves the winch as a comment
  (MAVSDK's `action` plugin has no winch call; it needs a raw `MAV_CMD_DO_WINCH` command).
- Plug log prints an unrounded voltage.

---

## Fig 08. Agricultural spray hexacopter (`agrihex`), file `12-fig08-agricultural-spray-hexacopter.js`

Identity (`12:102-110`, `12:320`): name "Agri hexacopter", sub "spray + RTK", noun "hexacopter", hint "design it,
build it, then let the mission spray the field", palette `mint`, mat 640, `benchH` 400, `benchZ` 125
(`500 * SC`), `flyScale` 5.6 (`1.4 / SC`), `flyVB` 9000, `ceiling` 10 m, `drag` 0.035 (lower than the 0.045
default), `nMotors` 6, `arrowZ` 60, `fpvLevel: true`, `camTilt` -10. Bench test requirements: `motorNeeds`
MOTORS + ESC + FC, `smokeNeeds` XT60 + ESC, `plugNeeds` BATT + XT60. Panels "ArduPilot params", "MAVLink log";
calibrate "Calibrate accelerometer + compass". Default mode `spray`.

The craft is modelled in real millimetres and drawn at `SC = 0.25` on the bench so a 2 m machine fits the mat;
`flyScale` undoes it in the field (drawn 1.4x life size).

Module constants (`12:6-12`): `TANK_L = 10` L (1 L = 1 kg), `FLOW = 0.42` L/s while spraying ("time-compressed so
a tank lasts one mission"), `SWATH = 2.4` m per pass, spray block `FIELD_R = (44, 38) to (54, 52)` (10 x 14 m),
`LANES` at x = 45.2, 47.7, 50.2, 52.7, launch pad `PADXY = (38, 45)` beside the barn; whole crop field
`CROP = (43.6, 36.5) to (62.5, 53.5)`.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `12s22` * | 12S 22000 mAh smart pack | 12 | 22000 | 5600 | 620 | `#3a3f46` | 12S 22000 |
| `12s16` | 12S 16000 mAh (2 x 6S) | 12 | 16000 | 4300 | 480 | `#2b2a28` | 12S 16000 |
| `14s30` | 14S 30000 mAh smart pack | 14 | 30000 | 9800 | 1150 | `#2f5fa8` | 14S 30000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `8120-100` * | 8120 100KV (sealed) | 100 | 760 | 180 | 12 |
| `10025-80` | 10025 80KV (14S) | 80 | 980 | 260 | 14 |
| `6215-180` | 6215 180KV | 180 | 520 | 120 | 6 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `30x9.9` * | 30x9.9 folding carbon | 1 | 1 | 160 | 70 |
| `28x9.2` | 28x9.2 folding (efficient) | 0.86 | 1.08 | 140 | 60 |
| `32x11` | 32x11 folding (heavy lift) | 1.14 | 0.93 | 190 | 85 |

Fixed parts (`12:53-60`); the 10 kg of liquid is added in `calc`:

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | Carbon centre frame + 6 folding arms | 5200 | 650 | Mechanical |
| `SKIDS` | Landing skids | 1100 | 110 | Mechanical |
| `ESC` | 6 x 80 A FOC arm ESCs | 1800 | 480 | Electrical |
| `FC` | Cube Orange+ flight controller | 75 | 400 | Electrical |
| `RTK` | Dual-antenna RTK GNSS | 350 | 700 | Electrical |
| `RADAR` | mmWave terrain radar | 250 | 300 | Electrical |
| `RX` | 900 MHz RC + telemetry | 120 | 250 | Electrical |
| `XT60` | AS150 anti-spark lead + caps | 150 | 40 | Electrical |
| `TANK` | 10 L spray tank (empty) | 1300 | 90 | Mechanical |
| `PUMP` | Diaphragm pump + driver | 900 | 180 | Electrical |
| `BOOM` | Spray boom + 4 nozzles | 900 | 120 | Mechanical |

Fixed parts total: **12145 g**, $2350 electrical + $970 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `12:62-76`)

```
thrust   = 550 * pf * krpm^2                 g per motor
AUW      = fixed + 6*motor.g + 6*prop.g + battery.g + TANK_L*1000      (full tank)
hoverA   = AUW / (9 * prop.eff) / V          ~9 g/W at hover
hoverMin = (mAh/1000*0.8) / hoverA * 60;   flyMin = hoverMin * 0.8
maxA     = 6 * thrust / (3.2 * prop.eff) / V
over     = KV * cells > 1500
weak     = T:W < 1.6
cost     = Mechanical += prop.price * 3;  hoverThr = sqrt(AUW / (6*thrust))
```

Design tiles for the default build (as rendered): "All-up weight" 33265 g; "Thrust : weight" 2.0 : 1; "Hover throttle" 72%; "Max current" 458 A; "Hover time" 12.7 min; "Freestyle time" 10.1 min. Cost table: Electrical $4050, Mechanical $1180, total $5230. Verdict line: "Parts match: 1.96:1 with 10 L aboard, enough margin to fight wind while full."

Across all 27 combinations T:W ranges 1.04 to 9.03. `over` in 9: `12s22/6215-180/30x9.9`, `12s22/6215-180/28x9.2`, `12s22/6215-180/32x11`, `12s16/6215-180/30x9.9`, `12s16/6215-180/28x9.2`, `12s16/6215-180/32x11`, `14s30/6215-180/30x9.9`, `14s30/6215-180/28x9.2`, `14s30/6215-180/32x11`. `weak` in 8: `12s22/10025-80/30x9.9`, `12s22/10025-80/28x9.2`, `12s22/10025-80/32x11`, `12s16/10025-80/30x9.9`, `12s16/10025-80/28x9.2`, `12s16/10025-80/32x11`, `14s30/10025-80/30x9.9`, `14s30/10025-80/28x9.2`.

Warnings (`12:124-126`):
- over: `${KV} KV on ${cells}S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank.`
- weak: `Thrust to weight ${tw.toFixed(2)}:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy.`
- ok: `Parts match: ${tw.toFixed(2)}:1 with 10 L aboard, enough margin to fight wind while full.`

### Frame and proportions (real mm, `12:127-205`)

- Hexa X: motors every 60 deg starting at 30 deg on R = 900 mm, so 1.8 m motor to motor and 900 mm between
  neighbours. Props 2-blade carbon drawn at radius 381 mm (30") for every choice: 138 mm clearance (87 mm with 32").
- Spin (`12:96`): M1 30 deg CW, M2 90 deg CCW, M3 150 deg CW, M4 210 deg CCW, M5 270 deg CW, M6 330 deg CCW.
  Motor check spins M1..M6 and reports M3 reversed.
- Hub: 480 x 420 x 20 mm carbon plate under a palette-coloured 460 x 400 x 130 mm shell with a darker band; arms are
  30 mm carbon tubes from 200 mm to the motor, each with a fold block at 300 mm.
- Motors: 132 mm bells, 70 mm tall.
- Landing skids: legs from (+-170, +-150, -10) to (+-250, +-420, -480), 940 mm skids at z -482.
- Under the hub: the tank 400 x 340 x 350 mm with a blue sight window whose level tracks `tank / 10`; the pump block
  behind it with a blue hose; a 1640 mm spray boom at z -470 with four nozzles at y = +-300 and +-720; the mmWave
  radar (80 x 120 x 70 mm) at the nose facing down.
- On the hub: an orange Cube Orange+ box at the nose with its arrow and LED, the red AS150 anti-spark plug and
  capacitor at the rear, the 900 MHz radio with a 180 mm antenna, two RTK masts 200 mm tall at x = +-170, y = 150
  (340 mm baseline) with ceramic caps, and the 260 x 220 x 200 mm smart battery with a carry handle.
- Bench tags: FC, RTK, TANK, BOOM, RADAR, BATT, MOTORS, PUMP.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Carbon centre frame + 6 folding arms | FRAME |  | 4 |  |
| 2 | `SKIDS` | Landing skids | SKIDS | FRAME | 0 |  |
| 3 | `MOTORS` | 6 sealed outrunner motors | MOTORS | FRAME | 7 |  |
| 4 | `ESC` | 6 x 80 A FOC ESCs on the arms | ESCs | FRAME | 5 |  |
| 5 | `FC` | Cube Orange+ flight controller | FLIGHT CTRL | FRAME | 6 | `arrow forward` / `arrow backward` |
| 6 | `XT60` | AS150 anti-spark lead + capacitors | AS150 + CAPS | ESC | 6 | `stripe to minus` / `stripe to plus` |
| 7 | `RX` | 900 MHz RC + telemetry radio | TELEMETRY | FC | 8 |  |
| 8 | `RTK` | Dual-antenna RTK GNSS | RTK GPS | FC | 9 |  |
| 9 | `RADAR` | mmWave terrain radar | RADAR | FC | 3 |  |
| 10 | `TANK` | 10 L spray tank | TANK | SKIDS | 2 |  |
| 11 | `PUMP` | Diaphragm pump + driver | PUMP | TANK | 1 |  |
| 12 | `BOOM` | Spray boom + 4 nozzles | BOOM | PUMP, SKIDS | 1 |  |
| 13 | `BATT` | 12S smart battery | BATTERY | FRAME, XT60 | 10 |  |
| 14 | `PROPS` | 6 folding carbon props | PROPS | MOTORS, ESC | 11 | `CW/CCW correct` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- FRAME: 30 mm carbon tubes on a sandwich hub, 1.8 m motor to motor; the arms fold for the truck and each fold has a
  locking sleeve; an unlocked arm flips the drone on take-off.
- SKIDS: tall legs keep tank, pump and boom off wet ground and give the downwash room to spread the spray.
- MOTORS: 80-100 KV on 12-14S; big props turning slowly are much more efficient; sealed bells because pesticide mist
  eats bearings.
- ESC: one 80 A field-oriented-control ESC per arm, in the prop wash; FOC runs the big motors quietly at low rpm.
- FC: Cube Orange+ running ArduCopter (attitude and position loops, mission, sprayer, failsafes), triple IMUs on a
  damped mount, arrow to the nose.
- XT60 (AS150 + CAPS): at 50 V a normal plug sparks and pits; the anti-spark plug pre-charges through a resistor;
  the caps absorb ESC spikes; stripe to minus.
- RX: long-range 900 MHz link for the remote and the ground station, showing mission, tank and battery live.
- RTK: base-station corrections give about 2 cm instead of 2 m; two antennas a known distance apart give heading
  without a magnetometer, which steel farm sheds would fool.
- RADAR: measures height above the crop rather than above take-off, so it follows slopes at a constant 2-3 m; sees
  through dust and mist where sonar or lidar would not.
- TANK: 10 L is 10 kg, a third of take-off weight; as it empties the drone needs less throttle.
- PUMP: the FC sets pump rate from ground speed (`SPRAY_PUMP_RATE`) so the dose per square metre stays the same
  when it slows for a turn.
- BOOM: nozzles under the props so the downwash pushes droplets into the canopy; too high or too windy and the mist
  drifts onto the neighbour's field.
- BATT: two 6S packs in series or one smart pack at about 50 V: less current for the same power, thinner wires,
  cooler ESCs.
- PROPS: alternate CW and CCW round the ring so torques cancel; a 30" prop at full power is lethal: last, and
  nobody stands under the drone.

Build order **[live]**: FRAME, SKIDS, MOTORS, ESC, FC, XT60, RX, RTK, RADAR, TANK, PUMP, BOOM, BATT, PROPS. There is
no WIRES part, so only "Take it apart" makes the motor check necessary again. Mistakes: FC "arrow backward" (flip),
AS150 "stripe to plus" (pop), PROPS "swapped CW/CCW" (flip), over-KV (desync).

### Bench safety tests

Standard buttons, "Calibrate accelerometer + compass". Motor check log "$ motors tab: spin M1, M2, M3, M4, M5, M6 one
at a time". Plug log "battery plugged: 50.400000000000006 V" (unrounded).

### Wiring diagram (`12:211-231`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 238 | 12S BATTERY | 12S 22000 mAh | `#e2483d` |
| `XT60` | 190, 238 | AS150 + CAPS | anti-spark, 63 V caps | `#e2483d` |
| `ESC` | 360, 238 | ESC x6 | 80 A FOC, on the arms | `#e2483d` |
| `MOTORS` | 600, 238 | MOTORS x6 | 8120 100KV (sealed) | `#f08a2b` |
| `FC` | 360, 110 | CUBE ORANGE+ | ArduCopter, 3 IMUs | `#3e86d9` |
| `RTK` | 130, 30 | RTK GNSS | 2 antennas, 2 cm | `#8c4bd1` |
| `RADAR` | 130, 130 | TERRAIN RADAR | mmWave, 0.1-30 m | `#43a35a` |
| `RX` | 600, 20 | RC + TELEMETRY | 900 MHz, MAVLink | `#8c4bd1` |
| `PUMP` | 600, 120 | PUMP DRIVER | PWM, rate x speed | `#3e86d9` |

Connection labels drawn on the lines: "44V", "3-phase x6", "PWM x6", "power", "UART + CAN", "I2C", "MAVLink", "pump PWM", "pump power from the 12S bus".

Legend: `#e2483d` power, `#43a35a` data / signal, `#f08a2b` motor phases.

### Flight modes

**`spray` - "Spray mission (auto)"** (default mode). Arm hint: "Press Space to arm: the mission flies and sprays by itself". Controls: altitude-hold sticks.

```
# ArduCopter sprayer + an AUTO lawn-mower mission
SPRAY_ENABLE    1
SPRAY_PUMP_RATE 10      # % pump per m/s of ground speed
SPRAY_SPEED_MIN 100     # cm/s: below this the pump stops
RNGFND1_TYPE    32      # mmWave radar on CAN / serial
RNGFND1_ORIENT  25      # pointing down
WPNAV_SPEED     400     # 4 m/s along the rows
TERRAIN_FOLLOW  1       # hold 2.5 m above the crop
```

**`loiter` - "Loiter (GPS hold)"**. Arm hint: "W/S climb, arrows move: let go and RTK holds it in place". Controls: altitude-hold sticks.

```
# LOITER: let go of the sticks and it parks in the air
# with RTK the hold is good to a few centimetres
LOIT_SPEED   800
LOIT_ACC_MAX 300
GPS_TYPE     17         # RTK base / rover pair
EK3_SRC1_YAW 2          # yaw from the two GPS antennas
```

**`rtl` - "Return to launch"**. Arm hint: "Press Space: it climbs, flies home and lands". Controls: altitude-hold sticks.

```
# RTL: what failsafes trigger (lost link, low battery,
# empty tank with a resume point saved)
RTL_ALT      500        # climb to 5 m first
RTL_SPEED    600
FS_BATT_ENABLE 2        # low battery -> RTL
SPRAY_ENABLE 1          # pump stops automatically
```


### Autopilot: the lawn-mower spray mission (`12:256-300`)

State created on the first physics step: `tank = 10`, `dry = AUW - 10000`, `sprays = []`, `ap = { wp: 0, phase:
'takeoff' }`, `area = 0`. Each step `AUW = dry + tank*1000`, so the altitude hold needs less throttle as it empties
(`hoverThr` itself is not recomputed).

- Velocity-to-stick: `a = 1.6 * (v_target - v)`, tilt = `clamp(atan(a / g), +-25 deg) / 38 deg` (max 25 deg);
  throttle stick = `clamp(0.9 * (z_target - z), +-1)`; in auto modes the yaw stick is `clamp(2 * yaw)` (it always
  turns to face +x).
- `goTo(x, y, vmax)`: speed `min(vmax, 0.9 * distance)` toward the point.
- Waypoints: for lane i, start `(x_i, i odd ? 52 : 38)` with the pump off, end `(x_i, i odd ? 38 : 52)` with the pump
  on: 8 waypoints, lanes alternating north and south.
- takeoff: climb to 2.5 m; above 2.2 m log "AUTO: mission start, 8 waypoints".
- mission: fly to each waypoint at 2.5 m, 6 m/s on transits and 4 m/s on spray legs. It sprays while on a spray leg,
  the tank is not empty and it is within 1.2 m of the lane line: `tank -= 0.42 * dt`, `area += speed * 2.4 * dt`, and
  the strip it covered is recorded. Reaching a waypoint (0.5 m) after a spray leg logs
  `row ${n} sprayed, tank ${tank.toFixed(1)} L`. After the last: "Field done: returning to launch" + `chime`.
- Tank empty mid-mission: "Tank empty: RTL to refill (the mission resumes from here)", log "tank empty -> RTL,
  resume point saved", sound `error`.
- RTL (mode or end of mission): climb to 5 m (until 4.6 m), fly home at 6 m/s at 5 m, land (throttle stick -0.6
  above 1.5 m, -0.25 below, 1 m/s position hold); on the ground disarm with "Landed at home" (tank > 0.05 L) or
  "Landed: refill the tank and battery", log "RTL complete, disarmed", `ding`.
- Loiter (armed, above 0.3 m): sticks centred (both below 0.06) hold the spot at up to 3 m/s; otherwise the velocity
  target is `(pitch*5, roll*5)` in WORLD axes, not relative to the heading.

Verified **[live]** (default build): mission start 1.4 s; rows done at 9.3 s (8.0 L), 15.8 s (6.0 L), 22.4 s
(4.0 L), 28.9 s (2.1 L), about 2 L per 14 m row; "Field done: returning to launch" 29.0 s; "Landed at home" 40.0 s.
133 m2 sprayed (4 x 14 m x 2.4 m = 134), 2.05 L left, AUW 33265 g to 25316 g, displayed throttle 73 % to 63 %,
791 mAh. With 1.5 L loaded the tank ran dry during row 1 at 8.0 s, RTL, "Landed: refill the tank and battery" at
17.6 s. Re-arming then immediately logs "RTL complete, disarmed" again: there is no refill and no resume; only R
(a new flight with a full tank) starts over from row 1. RTL from the pad takes 8 s. Loiter in wind holds to 2 cm.

Field drawing (`12:301-316`): the block outline (dashed, pale green) labelled "SPRAY BLOCK 10 x 14 m", sprayed
strips in translucent blue 2.4 m wide, and while spraying a translucent mist cone under each of the four nozzles
with animated droplets (`#9fd0f0`). Flight stats: "Tank" `x.x L`, "Sprayed" `n m²`.

### Range: "Farm spray run" (`12:14-36`, `12:111-123`)

Brief "Fly the corners of the spray block at 2.5-3 m, then land on the refill pad"; field 90 m, pad (38, 45),
ground `#d7e0c2`, altitude-hold sticks, camTilt -10. Scenery: 18 crop rows (alternating greens, 1.05 m wide) over
the whole crop field; a dirt road on the south edge, a farmyard track and gravel barnyard; the REFILL disc (r 1.5 m)
at (40.8, 36.6); a farmhouse 8 x 10 x 5 m; the red barn 10 x 14 x 6 m (3.6 m roof); a 10 m grain silo with a cone
cap; the blue water tank on two 2.6 m legs south of the pad; a windbreak of 6-8 m trees every 4.5 m along y = 63
plus three by the house; and the classic agri hazard, a power line on the field's east edge (five 9 m poles at
x = 66 and two wires at 8.15 m and 8.55 m that are SOLID here, unlike the delivery range's wires).

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | BLOCK SW | 44 | 38 | 2.8 | 1.8 | sphere (touch) |
| 2 | BLOCK NW | 44 | 52 | 2.8 | 1.8 | sphere (touch) |
| 3 | BLOCK NE | 54 | 52 | 2.8 | 1.8 | sphere (touch) |
| 4 | BLOCK SE | 54 | 38 | 2.8 | 1.8 | sphere (touch) |
| 5 | REFILL PAD | 40.8 | 36.6 | 0.8 | 1.5 | sphere (touch) |

Range code:

```
# a manual spray-block rehearsal: what the auto mission flies
# corners of the block at 2.5-3 m (radar holds height over the crop)
# then land on the refill pad: swap the battery, top up the tank
WPNAV_SPEED     400
RNGFND1_TYPE    10      # radar altimeter
SPRAY_ENABLE    1
```

### Failure scenarios **[live]**

- FC "arrow backward": flip at 0.7 s. AS150 reversed: pop on plug. PROPS swapped: flip.
- 6215 180KV on 12S: "Desync! 180KV on 12S overheats: the ESC lost a motor" after 37 s.
- Tank empty: RTL (above). Power-line wires on the range are solid ("Hit an obstacle").
- Not simulated although taught: losing one of six motors, spray drift in wind, radar terrain following (the field is
  flat), RTK versus plain GPS.

### Controls and FPV

Controls panel: `W S` "throttle (alt hold: climb / descend)" / `A D` "yaw" / `arrows` "pitch + roll" / `Space` "arm / disarm" / `R` "reset to the pad" / `V` "first-person (FPV) view"; then the line "or drag the two sticks on the figure". Source: the engine default list, since this craft defines no `controls`. FPV gimbal-level, 10 deg down.

### Lesson text

"Meet the hexacopter" (summary): a spray drone is a flying tank; 10 L is a third of its take-off weight, so it needs
six big slow props, and six can also survive losing a motor. ArduCopter flies a lawn-mower pattern and ties the pump
to ground speed so every square metre gets the same dose. RTK holds the rows to centimetres, the radar keeps it
2-3 m above the crop on slopes, the downwash drives droplets into the leaves; too high or in wind the mist drifts
onto the next field, the real failure of the job.

Build code panel ("ArduPilot params · build"):

```
# Mission Planner / MAVProxy, after the build:
FRAME_CLASS   2         # hexa
FRAME_TYPE    1         # X
MOT_SPIN_ARM  0.08
BATT_MONITOR  4         # analog voltage + current
BATT_LOW_VOLT 42.0      # 3.5 V x 12S
GPS_TYPE      17        # RTK rover
SPRAY_ENABLE  1
RNGFND1_TYPE  32        # terrain radar
SERVO9_FUNCTION 22      # sprayer pump
```

Practice task (summary): in ArduPilot SITL set `FRAME_CLASS 2`, plan a lawn-mower survey in Mission Planner, fly it
at 4 m/s and at 7 m/s with `SPRAY_PUMP_RATE` fixed, work out how the litres per hectare changed, then turn on
simulated wind and watch the track error.

### Quiz

1. "Why six motors instead of four on a spray drone?" Options: It looks more serious; **More lift for the heavy tank, and it can still land if one motor fails** (correct); Six is required by law.
2. "As the tank empties during the mission, the flight controller..." Options: needs more throttle; **needs less throttle: the drone gets kilograms lighter** (correct); keeps exactly the same throttle.
3. "What does RTK add over normal GPS?" Options: **Centimetre position from a base station's corrections** (correct); Faster video; A longer radio link.
4. "Why is the pump rate tied to ground speed?" Options: To save battery; **So each square metre gets the same dose, even when it slows for a turn** (correct); The pump overheats otherwise.

### Defects and inaccuracies

- "the mission resumes from here" / "resume point saved" is not implemented, and nothing can refill the tank.
- The pump is a constant 0.42 L/s, so the simulator does NOT keep the dose per square metre constant, which is
  exactly what the lesson and quiz teach (`SPRAY_PUMP_RATE`). The rebuild should scale flow with ground speed.
- `RNGFND1_TYPE 32` is MSP and `RNGFND1_TYPE 10` is MAVLink in ArduPilot, and the craft uses both for the same
  radar; radar drivers are types such as 11 (uLanding), 33 (Ainstein US-D1 on CAN) or 39 (NRA24 on CAN).
- `TERRAIN_FOLLOW` is an ArduPlane parameter; Copter terrain/surface following uses `WPNAV_RFND_USE`,
  `TERRAIN_ENABLE` or `SURFTRAK_MODE` (4.5+).
- `GPS_TYPE 17` is the u-blox moving-baseline BASE (dual-antenna yaw needs `GPS_TYPE 17` + `GPS2_TYPE 18`); it is
  not "RTK rover".
- `FS_BATT_ENABLE` is the old name for `BATT_FS_LOW_ACT`.
- The drawn tank (400 x 340 x 350 mm, about 48 L) is nearly five times too big for 10 L.
- Loiter moves in world axes, not relative to the nose.
- The mission lands on the launch pad, not the REFILL pad the range teaches.
- Weak threshold 1.6 while the warning text asks for 1.8.

---

## Fig 09. FPV flying wing on INAV (`wing`), file `13-fig09-fpv-flying-wing-on-inav.js`

Identity (`13:275-282`, `13:318`): name "FPV flying wing", sub "INAV, elevons" (the unused roster placeholder says "FPV fixed
wing" / "INAV, flaps"), noun "wing", hint "balance it, check the elevons, hand-launch it, bring it home", palette
`blush`, mat 960, `benchH` 200, `benchZ` 16, `explode` 22 mm per layer, `flyScale` 7, `flyVB` 30000, `ceiling`
60 m, `field` 200 m, `camZ` 0.5, log "inav", panels "INAV CLI", "INAV log", calibrate "Calibrate accelerometer (wing
level)". One motor (`mpos = [[-200, 0, 'M1', 'CW']]`, `wrongMotor: 0`). Default mode `angle`. Own `calc`
(`wingCalc`) and own `physics` (`wingPhysics`); `gates: []`.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack | CG |
|---|---|---|---|---|---|---|---|---|
| `4s2200` * | 4S LiPo 2200 mAh | 4 | 2200 | 235 | 34 | `#d9a520` | 4S 2200 | ok |
| `4s3000li` | 4S Li-ion 3000 mAh | 4 | 3000 | 270 | 45 | `#2f5fa8` | 4S LI-ION | nose |
| `3s1300` | 3S LiPo 1300 mAh | 3 | 1300 | 115 | 20 | `#e2483d` | 3S 1300 | tail |

**Motors** (`motors`):

| key | name | KV | g | $ |
|---|---|---|---|---|
| `2212-1400` * | 2212 1400KV | 1400 | 55 | 18 |
| `2810-1100` | 2810 1100KV | 1100 | 80 | 28 |
| `2306-2400` | 2306 2400KV (quad motor) | 2400 | 33 | 20 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `8x6` * | 8x6 pusher | 1 | 1 | 12 | 3 |
| `7x5` | 7x5 pusher | 0.75 | 1.05 | 9 | 3 |
| `9x6` | 9x6 pusher | 1.25 | 0.95 | 15 | 4 |

The battery's `cg` field drives the CG check and the tail-heavy flight behaviour.

Fixed parts (`13:21-26`):

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | 900 mm EPP wing + pod | 380 | 55 | Mechanical |
| `ESC` | 40A ESC with 5 V BEC | 30 | 22 | Electrical |
| `FC` | F405 wing flight controller | 10 | 45 | Electrical |
| `GPS` | M10 GPS + compass | 15 | 22 | Electrical |
| `CAM` | Analog FPV camera | 12 | 22 | Electrical |
| `VTX` | 5.8 GHz VTX + antenna | 10 | 25 | Electrical |
| `RX` | ELRS 2.4 GHz receiver | 3 | 18 | Electrical |
| `SERVOS` | 2 x 9 g metal-gear servos | 20 | 16 | Electrical |
| `XT60` | XT60 + low-ESR cap | 12 | 4 | Electrical |
| `TOP` | Hatch, pushrods, horns, screws | 25 | 8 | Mechanical |
| `WIRES` | Motor bullets + wiring | 6 | 3 | Electrical |

Fixed parts total: **523 g**, $177 electrical + $63 mechanical (before the motors, battery and props are added).

### Design maths: one motor, cruise and stall (`wingCalc`, `13:224-238`)

```
V       = cells*3.7;  krpm = KV*V/1000
thrust  = 2.5 * pf * krpm^2            g (one motor; "an 8x6 on 2212 1400KV / 4S = ~1.1 kg")
AUW     = fixed + motor.g + prop.g + battery.g;  kg = AUW/1000;  T:W = thrust / AUW
vmin    = 9.5 * sqrt(kg / 0.85)        m/s, minimum flying speed (full lift at and above it)
vstall  = 0.82 * vmin
vc      = 1.55 * vmin                  cruise speed
dragN   = kg*9.81 / 6                  lift-to-drag about 6 for a foam wing
cd      = dragN / vc^2                 drag = cd * S^2 (newtons)
Tn      = thrust/1000 * 9.81
cruiseEff = min(1, dragN / Tn);  hoverThr = sqrt(cruiseEff)      the "cruise throttle"
cruiseW = kg*9.81*vc / 6 / 0.36 / prop.eff                     36 % prop + motor efficiency
hoverA  = cruiseW / V                  cruise current
hoverMin = (mAh/1000 * 0.85) / hoverA * 60;  flyMin = 0.8 * hoverMin
maxA    = thrust / (2.2 * prop.eff) / V
vmax    = sqrt(Tn / cd)                top speed
over    = maxA > 45                    (the ESC is 40 A)
weak    = T:W < 0.45
cost    = Electrical += motor + battery; Mechanical += prop
```

Worked default (4S 2200, 2212 1400KV, 8x6): 1073 g thrust, 825 g AUW, vmin 9.36 m/s, stall 7.67 m/s (28 km/h),
cruise 14.51 m/s (52 km/h), drag 1.35 N, top 40.5 m/s (146 km/h), cruise throttle 36 %, 3.67 A, 30.6 min.

Design tiles (`calcRows`, `13:319-320`): "All-up weight", "Thrust : weight" (2 decimals), "Cruise speed",
"Stall speed", "Top speed" (km/h), "Flight time" `${round(hoverMin)} min cruise`.

Design tiles for the default build (as rendered): "All-up weight" 825 g; "Thrust : weight" 1.30 : 1; "Cruise speed" 52 km/h; "Stall speed" 28 km/h; "Top speed" 146 km/h; "Flight time" 31 min cruise. Cost table: Electrical $229, Mechanical $66, total $295. Verdict line: "Parts match. Cruise throttle ~36%, 4 A."

Across all 27 combinations T:W ranges 0.39 to 4.89. `over` in 9: `4s2200/2306-2400/8x6`, `4s2200/2306-2400/7x5`, `4s2200/2306-2400/9x6`, `4s3000li/2306-2400/8x6`, `4s3000li/2306-2400/7x5`, `4s3000li/2306-2400/9x6`, `3s1300/2306-2400/8x6`, `3s1300/2306-2400/7x5`, `3s1300/2306-2400/9x6`. `weak` in 1: `3s1300/2810-1100/7x5`.

Warnings (`13:321-327`), shown in this order:
- ok (only when not over, not weak and not tail-heavy): `Parts match. Cruise throttle ~${round(hoverThr*100)}%, ${round(hoverA)} A.`
- over: `${round(maxA)} A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it.`
- weak: `Thrust only ${tw.toFixed(2)}x the weight: launches will sink. Aim for 0.5-0.8.`
- tail (battery `cg: 'tail'`): `This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check.`

### Frame and proportions (`13:30-151`)

- Planform (`13:31-33`), +x nose, +y left: root at y = 40 (pod side) with leading edge x = 125 and trailing edge
  x = -175 (300 mm chord); tip at y = 450 with LE -95 and TE -250 (155 mm chord); inner panel to y = 120. Span
  900 mm; leading-edge sweep about 28 deg. Thickness tapers: top 12 to 6 mm, bottom -6 to -3 mm.
- Elevons from y = 120 to 450, chord 55 mm (hinge 55 mm ahead of the TE), slightly darker than the wing; they rotate
  about the hinge line (Rodrigues rotation, `13:49-52`). Servos at y = +-175 with pushrods and horns.
- Winglets at both tips, about 118 mm tall, from x -150 to -262.
- Centre section 275 x 80 mm; pod x -70 to 235 (305 mm), 84 mm wide, 54 mm tall. On the bench (hatch off or exploded
  view) the pod is an open tub showing ESC, FC, VTX, XT60, RX and the 130 x 56 x 34 mm battery; with the hatch on it
  is drawn closed (`13:96-100`).
- Nose cone to x 258 with the FPV lens rotated 80 deg (about 10 deg from level). GPS (40 x 40 mm) on top behind the
  pod. VTX antenna and two RX antennas stick out of the top.
- Pusher motor on a mount at the trailing edge (x -168 to -146), facing -x; 2-blade pusher prop at x -198, radius
  102 mm (8") for every prop choice. "mounted backwards" flips the blade pitch.
- Elevon deflection (`13:54-62`): bench check animation for 3 s, `a = 22 deg * sin(5t)`: first 1.5 s both surfaces
  move together (stick back), then opposite (stick right). In flight: left = `rev*(-pitch*20 + roll*15)` deg,
  right = `rev*(-pitch*20 - roll*15)` deg.
- Painter's order is computed from the rotated geometry (which wing half and whether the motor is nearer,
  `13:145-150`): a reusable trick for drawing a flat wing from any angle.
- Bench tags: CAM, GPS, SERVOS, MOTORS, TOP.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | EPP foam wing, pod and winglets | WING |  | 0 |  |
| 2 | `SERVOS` | Elevon servos, horns and pushrods | SERVOS | FRAME | 1 | `direction checked` / `reversed (untested)` |
| 3 | `MOTORS` | Pusher motor + mount | MOTOR | FRAME | 1 |  |
| 4 | `ESC` | 40 A ESC with 5 V BEC | ESC | FRAME | 2 |  |
| 5 | `WIRES` | Motor bullets to the ESC | MOTOR WIRES | MOTORS, ESC | 2 |  |
| 6 | `FC` | F405 wing flight controller (INAV) | FLIGHT CTRL | ESC | 3 | `arrow to the nose` / `arrow backwards` |
| 7 | `XT60` | XT60 lead + low-ESR capacitor | XT60 + CAP | ESC | 2 | `stripe to minus` / `stripe to plus` |
| 8 | `GPS` | M10 GPS + compass | GPS | FC | 3 |  |
| 9 | `RX` | ELRS receiver | RECEIVER | FC | 4 |  |
| 10 | `CAM` | FPV camera in the nose | CAMERA | FRAME | 2 |  |
| 11 | `VTX` | 5.8 GHz VTX + antenna | VTX | FC | 4 |  |
| 12 | `BATT` | Battery (sets the balance) | BATTERY | XT60, FC | 4 |  |
| 13 | `TOP` | Hatch | HATCH | BATT, RX, VTX | 5 |  |
| 14 | `PROPS` | Pusher propeller | PROP | MOTORS, TOP | 6 | `printed side forward` / `mounted backwards` |

What each part teaches (paraphrased):
- FRAME (WING): 900 mm swept EPP wing with no tail; sweep and slightly reflexed elevons give pitch stability; EPP
  bends instead of breaking, which is why it survives belly landings.
- SERVOS: elevons are elevator and ailerons in one surface (both up = nose up, one up one down = roll); a reversed
  servo makes the stabiliser push the wrong way, the classic first-launch crash.
- MOTORS (MOTOR): a bigger, slower motor than a quad's; a wing needs only about half its weight in thrust because
  the wing makes the lift.
- ESC: one ESC plus a BEC powering FC and servos; stalled servos pull amps and a weak BEC browns out the FC mid-air.
- WIRES: three bullet connectors; a pusher spinning backwards pushes the wing into your hand.
- FC: F405 wing board running INAV (self-level, GPS navigation, RTH, loiter); S1/S2 drive the elevons, S3 the motor;
  arrow to the nose.
- XT60: battery lead with a spike-calming capacitor, stripe to minus.
- GPS: position, ground speed and heading; no return-to-home without it; mount away from ESC and power wires.
- RX: ELRS on a UART; wings fly far, so antennas out of the pod, away from carbon and wires.
- CAM: tilted only a few degrees because a wing flies nose-level.
- VTX: video plus the INAV OSD (altitude, speed, home arrow); antenna vertical out of the pod.
- BATT: the battery is ballast; slide it until the wing balances at the CG mark; tail-heavy wings are unflyable.
- TOP (HATCH): tape or magnets; a hatch that opens in flight takes the battery with it.
- PROPS (PROP): pusher props are mirror images of tractor props; mounted backwards it spins but makes a fraction of
  the thrust: weak, dangerous launches.

Build order **[live]**: FRAME, SERVOS, MOTORS, ESC, WIRES, FC, XT60, GPS, RX, CAM, VTX, BATT, TOP, PROPS.
Mistakes: SERVOS "reversed (untested)", FC "arrow backwards", XT60 "stripe to plus", PROPS "mounted backwards",
a tail-heavy pack, a quad motor (over-current).

### Bench safety tests and extra buttons **[live]**

Buttons: "Take it apart", "Add next part", "Build it for me", "Smoke stopper test", "Check motor direction",
"Calibrate accelerometer (wing level)", "Check elevons", "CG check", "Plug / unplug battery", "Fly", "Arm /
disarm", "Reset", "Exploded view". Motor check spins M1 only: "M1 spun the wrong way: reversed it in the ESC
configurator. They all spin right now".

"Check elevons" (`13:329-336`): needs SERVOS and FC ("Fit the servos and the flight controller first"), bench only
("Do this on the bench"). Logs "$ INAV Outputs tab: stick back, then stick right", animates 3 s, then:
- correct: "Stick back: both elevons up. Stick right: right elevon up, left down. Correct" (`ding`)
- reversed: "Stick back should lift BOTH elevons. Yours went DOWN: reversed. Fix it: Add next part, SERVOS: direction checked" (`error`)

"CG check" (`13:337-343`): needs the battery ("Put the battery in first: in a wing the battery IS the balance"):
- `4s2200` (ok): "Balanced: it hangs level on your fingertips at the CG marks (about 25% of the wing chord)" (`ding`)
- `4s3000li` (nose): "Slightly nose-heavy: the nose dips a little. That is the safe side: stable, just needs a bit more speed" (`ding`)
- `3s1300` (tail): "Tail-heavy: the tail drops when you balance it on two fingers at the CG marks. It will pitch up and stall. Move the pack forward or add nose weight" (`error`)

### Wiring diagram (`13:355-375`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 238 | BATTERY | 4S LiPo 2200 mAh | `#e2483d` |
| `XT60` | 190, 238 | XT60 + CAP | 470 uF 25 V | `#e2483d` |
| `ESC` | 360, 238 | ESC + BEC | 40 A, 5 V BEC | `#e2483d` |
| `MOTORS` | 600, 238 | PUSHER (S3) | 2212 1400KV | `#f08a2b` |
| `FC` | 360, 70 | FLIGHT CTRL | F405 wing, INAV | `#3e86d9` |
| `RX` | 140, 30 | RECEIVER | ELRS on UART1 | `#8c4bd1` |
| `GPS` | 140, 120 | GPS + COMPASS | UART2 + I2C | `#43a35a` |
| `CAM` | 600, 10 | CAMERA | analog, nose | `#43a35a` |
| `VTX` | 600, 90 | VTX | 5.8 GHz + OSD | `#8c4bd1` |
| `SERVOS` | 600, 166 | ELEVONS | S1 left, S2 right | `#f08a2b` |

Connection labels drawn on the lines: "14.8V", "3-phase", "5V BEC", "S3", "UART1", "UART2", "video in", "video + OSD", "S1 S2".

Legend: `#e2483d` power, `#43a35a` data / signal, `#f2c230` video, `#f08a2b` motor + servos.

### Flight modes

**`angle` - "Angle (self-level)"** (default mode). Arm hint: "Throttle up (W) to hand-launch, then fly". Controls: absolute throttle (W/S ramps it).

```
# INAV: the FC levels the wing when you let go
aux 0 0 0 1300 2100      # ARM
aux 1 1 1 900 1300       # ANGLE
set fw_level_pitch_trim = 0
set max_angle_inclination_rll = 450   # 45 deg bank
```

**`manual` - "Manual (rates)"**. Arm hint: "Throttle up to launch. No self-levelling!". Controls: absolute throttle (W/S ramps it), acro: sticks = rotation rate.

```
# MANUAL: sticks drive the elevons directly,
# nothing levels the wing for you
set manual_roll_rate = 100
set manual_pitch_rate = 100
set fw_turn_assist_pitch_gain = 0
```

**`rth` - "Return to home (RTH)"**. Arm hint: "RTH: climbing to 15 m and circling home". Controls: absolute throttle (W/S ramps it).

```
# GPS return to home: climb, fly home, loiter
set nav_rth_altitude = 1500          # cm
set nav_fw_loiter_radius = 2200      # cm
set failsafe_procedure = RTH
set nav_rth_allow_landing = NEVER    # wings circle, you land
```


None of the wing modes uses altitude hold: W/S ramps an absolute throttle. The RTH mode is `D.auto` and sets its own
throttle.

### Fixed-wing physics (`wingPhysics`, `13:154-221`)

A point mass flying along its nose with airspeed `S`:

1. Throttle: `thr = armed ? clamp(stick.thrAbs) : 0`; `thrEff += (thr^2 - thrEff) * min(1, 8*dt)`. In RTH the
   autopilot sets `thrAbs = min(0.8, 1.25*hoverThr + (alt < 13 m ? 0.15 : 0))`.
2. Hand launch: until launched the wing is held level at z = 0. When armed and throttle > 0.25: `S = 10.5` m/s,
   altitude 1.6 m, nose up 14 deg, "Hand launch!" (`whoosh`), log `hand launch, ${vc.toFixed(0)} m/s cruise`.
3. Attitude targets:
   - Angle: bank `roll_stick * 45 deg`, pitch `pitch_stick * 28 deg - 3 deg` (3 deg nose-up trim); roll follows with
     `min(1, 3.5*dt)`, pitch with `min(1, 3*dt)`.
   - Manual: rates `220 deg/s` roll and `140 deg/s` pitch per unit stick, plus the nose drops in a bank:
     `pitch += (1 - cos(roll)) * 25 deg/s`. Nothing levels it.
   - RTH: R = 22 m; heading = bearing to the pad, plus inside 2.2 R a turn onto a circle:
     `+ pi/2 - clamp((dist - R)/R, -1, 1) * pi/3`; bank = `clamp(1.4 * heading error, +-0.6 rad)`; pitch =
     `clamp(-0.05 * (15 - alt), -0.35, 0.3)` rad (climb to 15 m). Message "RTH: climbing to 15 m, circling the pad",
     log "NAV RTH engaged".
4. Faults: SERVOS or FC reversed: `roll += (2*roll + 25deg)*dt`, `pitch += 55 deg/s` (a dive), message "It dives the
   wrong way: elevons reversed. Check them on the bench", log "control surfaces move the wrong way". Tail-heavy
   pack: `pitch -= 10 deg/s` plus a `14 deg/s * sin(5t)` porpoise. Above `ceiling - 5` (55 m): `pitch += 30 deg/s`.
5. Stall: below `vstall`: `pitch += 55 deg/s` (nose drops), `roll += 40 deg/s * sin(4t)` (wing rock), "STALL: too
   slow, the nose drops" (`error`), re-armed once speed is back above `vstall + 3`.
6. Limits: roll +-1.4 rad, pitch +-1.3 rad.
7. Coordinated turn: `yaw += g * tan(clamp(roll, +-1.2)) / max(S, 6) * dt`.
8. Speed: `T = thrEff * thrust * g / 1000` (x 0.4 if the prop is backwards);
   `S += ((T - cd*S^2)/m - g * nose_z) * dt` (climbing trades speed, diving gains it).
9. Lift: `lift = min(1, (S/vmin)^2)`; sink rate eases toward `(1 - lift)*6 + (manual ? S*(1 - cos roll)*0.15 : 0)`
   m/s with `min(1, 2*dt)`.
10. Velocity = `nose * S + wind - (0, 0, sink)`; wind = `(2 sin(0.4t), 1.2 cos(0.3t), 0)` when on.
11. Ground: a touchdown with `S < 13.5`, bank < 25 deg, -30 < pitch < 25 deg and `vz > -3.5` is a belly landing
    ("Belly landing on the grass. Press R to go again", `place`, log `landed, ${mAh} mAh used`, disarmed, back in the
    hand); anything else: "Hit the ground too fast or too steep".
12. More than 90 m from the pad: "A long way out: switch to RTH, or R to reset" (once per excursion). There is no
    field boundary.

Verified **[live]**:
- Angle at 60 % throttle: hand launch at 0.2 s, accelerates from 10.5 to 22.9 m/s (82 km/h) climbing 1.2 m/s on the
  trim, 13.8 A. Throttle cut at 30 s: decelerates, "STALL" at 37.6 s (8.3 m/s), then a stable mush at 7.7 m/s
  sinking 2.3 m/s, belly landing at 55 s (117 mAh, 870 m away).
- Full up elevator with the throttle cut at 10 s: zooms to 27 m, stalls at 12.4 s, falls at 6 m/s and crashes
  ("Hit the ground too fast or too steep") at 18.4 s.
- Manual with a 0.3 roll input for 2 s: spirals in and "Hit a tree" at 9.5 s.
- RTH armed on the pad: it launches itself (RTH throttle 0.6 > 0.25), climbs to 15 m and orbits at 18.1 m/s on
  44.7 % throttle (6.8 A), but 40-57 m from the pad, not 22 m: a 0.6 rad bank at 18 m/s turns on a ~49 m radius.
- Angle flight then RTH 226 m out: turns back, crosses the pad at about 36 s, settles into the same orbit.
- SERVOS reversed: the dive message at launch, crash at 1.25 s. FC reversed: the same elevon message, crash at 1.05 s.
- 3S 1300 (tail-heavy): flies, porpoising between 4 and 9 deg nose-up, 14.6 m/s.
- Prop backwards: only 13 m/s, climbs slowly.
- 2306 2400KV (over, 97 A): no in-flight effect at all.

Field extras (`13:346-352`): 14 translucent clouds at 38-50 m. Flight stats: "Airspeed" km/h, and "Warning" "STALL"
while launched below stall speed.

### Range: "Airfield pylon race" (`13:283-317`)

Brief "Throttle up to launch, fly outside all 4 pylons in order, then belly-land on the runway"; field 200 m, pad
(100, 100), ground `#d7e3bf`, absolute throttle (`alt: false`), camTilt 3. Scenery: a 90 x 14 m mown runway strip at
(110, 100) with nine centre dashes; a "PILOTS" box; a car park with three cars; a pilot shelter; a hangar
14 x 10 x 6 m; a windsock (6 m pole, orange sock); four pylons (orange 9 m poles r 0.35 with white cone tops) at
(140, 75), (140, 125), (60, 125), (60, 75); tree lines on all four edges (8-11.5 m).

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | PYLON 1 | 149 | 66 | 12 | 7 | sphere (touch) |
| 2 | PYLON 2 | 149 | 134 | 12 | 7 | sphere (touch) |
| 3 | PYLON 3 | 51 | 134 | 12 | 7 | sphere (touch) |
| 4 | PYLON 4 | 51 | 66 | 12 | 7 | sphere (touch) |
| 5 | LAND | 118 | 100 | 1 | 6 | sphere (touch) |

The pylon checkpoints are 7 m spheres at 12 m height, offset 9 m in x and 9 m in y (12.7 m diagonally) outside each
pylon, so "fly outside the pylon" is enforced only by where the sphere sits. Range code:

```
# INAV pylon race: fly outside every pylon, then land
set nav_fw_cruise_speed = 1500      # cm/s
set fw_turn_assist_yaw_gain = 1
set osd_stats_page = ON             # lap time + mAh after landing
```

### Controls and FPV

Controls panel: `W S` "throttle (throttle up to hand-launch)" / `arrows` "pitch + roll (the elevons)" / `A D` "nothing: no rudder, it turns by banking" / `Space` "arm, then W to throw it" / `R` "reset to the pad"; then the line "or drag the two sticks on the figure". Source: the craft's own `controls`. FPV: attitude-following camera tilted 3 deg up.

### Lesson text

"Meet the wing" (summary): no tail; two elevons do elevator and aileron work and the sweep keeps it stable. The wing
makes the lift, so one motor with about half the weight in thrust is plenty and it flies 20 to 40 minutes. It needs
speed: lift grows with the square of airspeed and below stall speed it simply stops lifting. Balance it at the CG
mark, check the elevons move the right way, throw it level into the wind.

Build code panel ("INAV CLI · build"):

```
# INAV CLI after the build
set platform_type = AIRPLANE
mmix 0 1.000 0.000 0.000 0.000      # one motor on S3
smix 0 1 0  50 0 -1                 # S1 left elevon: roll
smix 1 1 1  50 0 -1                 #                 pitch
smix 2 2 0 -50 0 -1                 # S2 right elevon: roll (opposite)
smix 3 2 1  50 0 -1                 #                  pitch
servo 1 1000 2000 1500 -100         # -100 = reversed: check on the bench!
set nav_rth_altitude = 2000
save
```

Practice task (summary): balance the wing on two fingertips at the CG marks; check the elevons with the sticks and
in angle mode by tilting the wing by hand (they should fight the tilt); do three hand launches in angle mode, fly a
figure-eight, then switch to RTH and watch it come home.

### Quiz

1. "What do elevons do?" Options: Only steer left and right; **Act as elevator and ailerons at once** (correct); Brake the wing for landing.
2. "When does a wing stall?" Options: When it flies too fast; **When the airspeed drops too low (angle of attack too high)** (correct); When the battery is low.
3. "The wing is tail-heavy at the CG check. In the air it will..." Options: fly more efficiently; **pitch up, stall and be hard to recover** (correct); turn better.
4. "Why check elevon direction on the bench before the first launch?" Options: To save battery; **A reversed servo makes the stabiliser push the wrong way: it dives straight in** (correct); The radio needs it to bind.

### Defects and inaccuracies

- A reversed FC produces the elevon message: the cause is misattributed.
- The RTH orbit is about twice the configured 22 m (`nav_fw_loiter_radius 2200`) because the bank limit is too low
  for the speed; RTH never lands (by design, `nav_rth_allow_landing = NEVER`).
- `nav_rth_altitude` is 1500 in the RTH panel and 2000 in the build panel; the sim uses 15 m.
- The bench stats strip shows "~24.4 min" (flyMin) while the tile says "31 min cruise" (hoverMin).
- The over-current design (quad motor) and the brown-out risk described for the BEC have no flight consequence;
  tail-heavy is only a porpoise, while the CG text calls it unflyable.
- The weak threshold is 0.45 but the text says "aim for 0.5-0.8"; the default build (1.30:1) is above that range
  and still says "Parts match".
- `osd_stats_page` is not a setting I can confirm in INAV; check before reusing.
- No field boundary: the wing happily flies a kilometre away.
- The unused roster placeholder says "INAV, flaps" (this wing has no flaps); harmless while the figure exists.

---

## Fig 10. VTOL tiltrotor (`vtol`), file `14-fig10-vtol-tiltrotor.js`

Identity (`14:276-282`, `14:387-392`): name "VTOL tiltrotor", sub "hover to cruise", noun "VTOL", hint "build it,
tilt-test it, take off like a drone, cruise like a plane", palette `cobalt`, mat 980, `benchH` 260, `benchZ` 44,
`flyScale` 5, `flyVB` 30000, `ceiling` 45 m, `camTilt` 8, `camZ` 0.72, `nMotors` 3, `arrowZ` 160,
`wrongMotor: 2`. Panels "ArduPilot parameters", "ArduPilot messages"; calibrate "Calibrate accelerometer +
airspeed". Default mode `qhover`. A tricopter-layout QuadPlane: two front motors tilt from straight up to straight
ahead, one rear motor only lifts. `pad: [15, 11]` and `trees` are dead (the range pad (50, 50) wins).

Module constants (`14:27`): `VS = 10` m/s stall, `VC = 13` m/s cruise, `CRUISE_Z = 8` m, `CC = (15, 20)` and
`RC = 9` m (the auto cruise circle).

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `4s2p-li` * | 4S2P Li-ion 8000 mAh | 4 | 8000 | 560 | 70 | `#3e86d9` | 4S2P 8AH |
| `4s-5000` | 4S LiPo 5000 mAh | 4 | 5000 | 520 | 55 | `#2b2a28` | 4S 5000 |
| `6s-4000` | 6S LiPo 4000 mAh | 6 | 4000 | 600 | 75 | `#d9a520` | 6S 4000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `2810-1000` * | 2810 1000KV | 1000 | 72 | 30 | 4 |
| `2814-700` | 2814 700KV | 700 | 96 | 38 | 6 |
| `2306-2400` | 2306 2400KV (racing) | 2400 | 33 | 20 | 4 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `9x5` * | 9x5 two-blade | 1 | 1 | 12 | 8 |
| `10x5` | 10x5 two-blade | 1.2 | 1.08 | 14 | 9 |
| `7x4` | 7x4 two-blade | 0.6 | 0.85 | 8 | 6 |

Fixed parts (`14:20-26`):

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | Foam airframe: fuselage, boom, landing gear | 330 | 90 | Mechanical |
| `WING` | Foam wing + carbon spar | 190 | 40 | Mechanical |
| `TAIL` | V-tail + 2 ruddervator servos | 40 | 24 | Mechanical |
| `TILT` | 2 metal-gear tilt servos + nacelles | 70 | 46 | Mechanical |
| `ESC` | 3 x 40A BLHeli_32 ESC | 45 | 60 | Electrical |
| `FC` | Matek H743-WING + ELRS receiver | 30 | 95 | Electrical |
| `GPS` | M10 GPS + compass | 18 | 28 | Electrical |
| `ARSPD` | ASPD-4525 airspeed + pitot | 8 | 35 | Electrical |
| `CAM` | FPV camera + 800 mW VTX | 22 | 55 | Electrical |
| `XT60` | XT60 + 1000 uF cap + PDB | 20 | 12 | Electrical |

Fixed parts total: **773 g**, $285 electrical + $200 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `14:28-43`)

```
over     = KV * cells > 1000*4*1.25 (= 5000)
thrust   = min(over ? 2600 : 1e9, 6.8 * pf * krpm^2)     g per motor ("9" props on ~15k rpm"), capped when over
AUW      = fixed + 3*motor.g + 3*prop.g + battery.g;   T:W = 3*thrust / AUW
hoverA   = AUW / (7 * prop.eff) / V                       ~7 g/W hovering on 9-10" props
cruiseA  = (AUW*g/1000 * VC / 6 / 0.45) / V               L/D 6, 45 % prop + motor efficiency, VC = 13 m/s
hoverMin = (mAh/1000*0.8) / hoverA * 60
flyMin   = (mAh/1000*0.8) / cruiseA * 60                  "Cruise time"
maxA     = 3 * thrust / (2.6 * prop.eff) / V
weak     = T:W < 1.6;   hoverThr = min(1, sqrt(AUW / (3*thrust)))
cost     = Mechanical += 3 * prop.price
```

Default worked: 1490 g per motor, AUW 1585 g, T:W 2.82, hover 15.3 A for 25.1 min, cruise 5.1 A for 76 min, max
116 A. Tiles (`calcRows`, `14:277`): "All-up weight", "Thrust : weight", "Hover throttle", "Max current", "Hover
time", "Cruise time" (`flyMin.toFixed(0)`). The bench stats strip shows "Flight time ~75.9 min".

Design tiles for the default build (as rendered): "All-up weight" 1585 g; "Thrust : weight" 2.8 : 1; "Hover throttle" 60%; "Max current" 116 A; "Hover time" 25.1 min; "Cruise time" 76 min. Cost table: Electrical $445, Mechanical $224, total $669. Verdict line: "Parts match. Cruise draws about 5 A against 15 A in hover: the wing does the work. Freestyle time below = cruise time."

Across all 27 combinations T:W ranges 0.80 to 5.51. `over` in 12: `4s2p-li/2306-2400/9x5`, `4s2p-li/2306-2400/10x5`, `4s2p-li/2306-2400/7x4`, `4s-5000/2306-2400/9x5`, `4s-5000/2306-2400/10x5`, `4s-5000/2306-2400/7x4`, `6s-4000/2810-1000/9x5`, `6s-4000/2810-1000/10x5`, `6s-4000/2810-1000/7x4`, `6s-4000/2306-2400/9x5`, `6s-4000/2306-2400/10x5`, `6s-4000/2306-2400/7x4`. `weak` in 5: `4s2p-li/2814-700/9x5`, `4s2p-li/2814-700/10x5`, `4s2p-li/2814-700/7x4`, `4s-5000/2814-700/9x5`, `4s-5000/2814-700/7x4`.

Warnings (`14:342-344`):
- over: `${motor name} is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV).`
- weak: `Hover thrust to weight ${tw.toFixed(1)}:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind.`
- ok: `Parts match. Cruise draws about ${round(cruiseA)} A against ${round(hoverA)} A in hover: the wing does the work. Freestyle time below = cruise time.`

### Frame and proportions (`14:64-149`)

- Fuselage pod 370 x 90 x 80 mm (x -140 to 230) plus a 62 mm nose; a carbon tail boom from the pod to x = -505.
- Landing gear: two wire skids (220 mm long, y = +-66, 44 mm below) and a tail stand at x = -450.
- Wing: straight, 840 mm span (y +-420), 150 mm chord (x -40 to 110), 10 mm thick on top of the pod at z 80-90,
  palette-coloured 20 mm tips and control-surface lines.
- V-tail at x = -470: two fins 90 mm chord x 150 mm tall, each rotated 55 deg from vertical (35 deg from
  horizontal, as the text says).
- Tilt nacelles (palette) at y = +-230 with their servo blocks; the front motors sit on pivots at (175, +-230, 92)
  and rotate about the pitch axis by `tilt * 90 deg` (negative when TILT is reversed). Rear motor at (-300, 0, 70).
- Motors: 32 mm bells, 20 mm tall. Props drawn at radius 115 mm (9") at the front and 100 mm at the rear, for
  every prop choice. Wire loops at the pivots (WIRES).
- Airspeed board and a 100 mm pitot on the right wing at y = 330; two ESCs in the nacelles and one on the boom; the
  FC on the pod top behind the wing; GPS on a 50 mm mast on the boom (puck r 24 mm); nose camera; VTX antenna on the
  pod; battery 102 x 60 x 42 mm under the wing.
- Bench tilt-test animation: `tilt = sin(min(1, t / 3.2) * pi)`: the motors swing up to 90 deg and back in 3.2 s.
- Bench tags: WING, TILT, MOTORS, GPS, ARSPD, FC, BATT, TAIL.

Motor numbering (`14:61-62`, ArduPilot tri): M1 (175, -230) front-right CW, M2 (175, 230) front-left CCW, M4
(-300, 0) rear CW. The motor check spins "M1, M2, M4" and reports M4 reversed.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Foam fuselage + carbon tail boom | FUSELAGE |  | 0 |  |
| 2 | `WING` | Wing with a carbon spar | WING | FRAME | 1 |  |
| 3 | `TAIL` | V-tail + ruddervator servos | V-TAIL | FRAME | 1 |  |
| 4 | `TILT` | Tilt servos + motor nacelles | TILT SERVOS | WING | 2 | `tilt forward (correct)` / `tilt reversed` |
| 5 | `MOTORS` | 3 brushless motors | MOTORS | TILT | 3 |  |
| 6 | `ESC` | 3 x 40A ESCs | ESCS | WING | 2 |  |
| 7 | `WIRES` | Motor + servo wiring | WIRING | MOTORS, ESC | 3 |  |
| 8 | `FC` | Matek H743-WING (ArduPilot) + ELRS RX | FLIGHT CTRL | FRAME | 2 | `arrow forward` / `arrow backward` |
| 9 | `GPS` | M10 GPS + compass | GPS | FC | 4 |  |
| 10 | `ARSPD` | Airspeed sensor + pitot tube | AIRSPEED | FC | 4 |  |
| 11 | `CAM` | FPV camera + 800 mW VTX | CAMERA | FRAME | 2 |  |
| 12 | `XT60` | XT60 + low-ESR cap + PDB | XT60 + CAP | ESC | 2 | `stripe to minus` / `stripe to plus` |
| 13 | `BATT` | Battery pack | BATTERY | FRAME, XT60 | 5 |  |
| 14 | `PROPS` | Propellers | PROPS | MOTORS, WING | 6 | `correct rotation` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- FRAME (FUSELAGE): EPO foam pod, carbon boom, wire gear; foam bends instead of shattering, which matters on a craft
  that tips over while you learn.
- WING: a straight 840 mm wing carries all the weight at cruise, so the motors only fight drag: 3-4x the flight time
  of a quad on the same pack.
- TAIL (V-TAIL): two fins at about 35 deg do elevator and rudder; the FC mixes pitch and yaw into two servos.
- TILT (TILT SERVOS): metal-gear servos swing the front motors from straight up to straight ahead; reversed, they
  swing the motors BACK during transition and it flips over its tail, the classic first VTOL crash.
- MOTORS: two tilting front motors plus a rear one that only lifts; in cruise the rear stops and the fronts pull.
- ESC (ESCS): one per motor, in the nacelles and the boom, cooled in cruise.
- WIRES: tilting motors need slack wire loops at the pivot; tight loops fatigue and snap after a few hundred
  transitions.
- FC: Matek H743-WING on ArduPilot QuadPlane: multicopter control in hover, fixed-wing control in cruise, and the
  transition logic between; arrow to the nose.
- GPS: position for loiter, RTL and missions, on a mast away from battery current.
- ARSPD (AIRSPEED): an I2C pitot sensor; the autopilot needs true airspeed, because with a tailwind GPS can read
  15 m/s while the wing stalls.
- CAM: nose camera with the ArduPilot OSD; airspeed, tilt angle and battery are the three numbers to watch in a
  transition.
- XT60: power for three ESCs, a 5 V BEC for the servos and the spike capacitor; stripe to minus.
- BATT: Li-ion suits VTOLs (dislikes the big hover current, loves long gentle cruise); it slides in under the wing
  so the CG sits a quarter of the chord back.
- PROPS: the two fronts counter-rotate so their torques cancel in hover; props last, after the smoke, motor and
  tilt tests.

Build order **[live]**: FRAME, WING, TAIL, TILT, MOTORS, ESC, WIRES, FC, GPS, ARSPD, CAM, XT60, BATT, PROPS.
Mistakes: TILT "tilt reversed", FC "arrow backward", XT60 "stripe to plus", PROPS "swapped CW/CCW", racing motor.

### Bench safety tests and extra buttons **[live]**

Buttons: standard set plus "Tilt servo test" and "Transition / back (T)" (the latter stays on screen in flight,
`inFlight: true`).
- "Tilt servo test" (`14:263-274`): "Land first"; needs TILT and FC ("Fit the tilt servos and the flight
  controller first"); plugs in itself if needed ("Plug in a battery: the servos run off the BEC" when BATT or XT60 is
  missing); log "$ servo test: tilt 0 -> 90 -> 0 deg"; after 3.3 s: reversed "The motors swung BACKWARDS: reversed
  tilt servos. Refit TILT the right way round before you fly" (`buzz`), otherwise "Both motors swing from straight up
  to straight ahead together. Tilt is good" (`ding`).
- "Transition / back (T)" on the bench: "Fly the Range first: Fly > Range: Coastal inspection".
- The PROPS step does not actually require the tilt test (only smoke + motor check), although the text says so.

### Wiring diagram (`14:345-364`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 250 | BATTERY | 4S2P Li-ion 8000 mAh | `#e2483d` |
| `XT60` | 190, 250 | XT60 + PDB | cap + 5 V BEC | `#e2483d` |
| `ESC` | 360, 250 | ESCS x3 | 40 A, BLHeli_32 | `#e2483d` |
| `MOTORS` | 600, 250 | MOTORS x3 | 2810 1000KV | `#f08a2b` |
| `FC` | 360, 96 | FLIGHT CTRL | H743 + ELRS, ArduPilot | `#3e86d9` |
| `GPS` | 20, 20 | GPS + COMPASS | M10, UART + I2C | `#43a35a` |
| `ARSPD` | 20, 110 | AIRSPEED | ASPD-4525, I2C | `#43a35a` |
| `CAM` | 190, 170 | CAMERA + VTX | OSD, 800 mW | `#8c4bd1` |
| `TILT` | 600, 16 | TILT SERVOS | 2 x metal gear | `#f08a2b` |
| `TAIL` | 600, 100 | V-TAIL SERVOS | ruddervators | `#f08a2b` |

Connection labels drawn on the lines: "14.8V", "3-phase x3", "BEC 5V", "M1 M2 M4", "UART + I2C", "I2C", "PWM".

Legend: engine default (`#e2483d` power, `#43a35a` data / signal, `#f2c230` video, `#f08a2b` motor phases).

### Flight modes

**`qhover` - "QHOVER (fly it as a drone)"** (default mode). Arm hint: "Hold W to climb, arrows to move: you are flying a big tricopter". Controls: altitude-hold sticks.

```
# QuadPlane hover: the VTOL motors only, like a multicopter
Q_ENABLE        1
Q_FRAME_CLASS   7      # tricopter layout
Q_TILT_ENABLE   1
Q_TILT_MASK     3      # motors 1 + 2 tilt
Q_TILT_TYPE     0      # continuous servo tilt
Q_M_SPIN_ARM    0.08
```

**`transition` - "Transition + cruise (auto)"**. Arm hint: "Autopilot: climb, tilt the motors forward, cruise circles". Controls: altitude-hold sticks.

```
# fixed-wing cruise with the motors tilted forward
Q_TILT_RATE_UP  40     # deg/s while tilting forward
Q_TILT_MAX      45     # tilt held here until airspeed builds
Q_TRANSITION_MS 5000
ARSPD_FBW_MIN   10     # stall margin (m/s)
TRIM_ARSPD_CM   1300   # cruise at 13 m/s
Q_ASSIST_SPEED  10     # below this the lift motors help
```

**`qrtl` - "QRTL (come home + land)"**. Arm hint: "Autopilot: fly home, tilt back to hover, land on the pad". Controls: altitude-hold sticks.

```
# return home as a plane, land as a drone
Q_RTL_MODE      1      # fly home in plane mode first
Q_TILT_RATE_DN  20     # tilt back slowly: speed bleeds off
Q_LAND_SPEED    50     # final descent cm/s
Q_LAND_FINAL_ALT 6
RTL_AUTOLAND    0
```


The range mode adds the T key: `rangeTransition()` (`14:251-260`), bound to `KeyT` only for this craft in flight.
Messages: "Fly the Range first: Fly > Range: Coastal inspection" (not flying), "T is for the Range run. The
Transition mode does it by itself" (another mode), "Arm and climb above 4 m first", "Climb above 4 m before you
transition", then "Transition: arrows bank, W/S climb, Up = faster" or "Back-transition: slowing down to hover"
(sound `click`).

### Transition physics (`14:151-248`)

Hover regime: the stock multirotor model; the tilt decays at 1/3 per second; rotor rpm drawn = `max(0.2,
sqrt(thrEff))`. Autopilot `hoverTo(x, y, climb)`: speed `min(4, 0.8 d)`, acceleration 1.4 x velocity error, sticks =
`atan(a/g) / 38deg`, throttle stick = `climb / 2.2`.
- Transition (auto) in hover: climb at 2 m/s on the spot, phase "climbing".
- QRTL in hover: fly home at up to 4 m/s while holding about 6 m (`clamp(0.5*(6 - z))`), phase "coming home";
  within 0.6 m (or below 0.3 m) descend at 1 m/s, phase "landing"; on the ground, after 1 s, below 0.3 m/s:
  "Landed on the pad: disarmed", log "QRTL: landed, disarmed", `ding`.

When to fly as a plane (`wantPlane`):
- transition: already a plane, or above `CRUISE_Z - 3` = 5 m;
- qrtl: already a plane AND more than 24 m from home AND fully tilted;
- range: the pilot pressed T (`userPlane`) and (already a plane or above 4 m);
- qhover: never (a qhover flight that is still a plane is flown back to hover automatically, `D.auto`).

Entering plane: "Transition: the front motors tilt forward", log "Transition started". Plane regime per step:

```
m = AUW/1000;  W = m*g;  Tm = thrust*g/1000;  Tf = 2*Tm (front pair);  Tr = Tm (rear)
tilt  += (wantPlane ? +1 : -1) * dt/3          0..1, 3 s each way;  th = +-tilt*pi/2 (minus if TILT reversed)
Vt    = wantPlane ? 13 + (range ? max(-3, pitchStick*5) : 0) : 0        (range: Up = faster, Down = slower)
yawRate (rad/s):
  transition: steer round a circle of radius 9 m centred at pad + (0, 9): tangent + 0.25*(d - 9) pull,
              clamp(1.8*error, +-1.4)
  qrtl:       clamp(1.6*bearing error, +-1.2) toward home;  qhover: 0;  range: clamp(1.1*rollStick, +-1)
  yawRate *= min(1, V/4)
vzT   = range ? (plane ? clamp(2.5*thrStick, +-2.5) : (z > 1 ? 0 : 1)) : clamp(0.5*(8 - z), +-2)
drag  = 0.11 * W / 13^2 * V^2                  (0.11 W at cruise, so L/D about 9)
Fx    = 0.9*m*(Vt - V) + drag
lift  = min(W * min(1.25, (V/10)^2), max(0, m*(g + 1.5*(vzT - vz))))
need  = max(0, m*(g + 1.5*(vzT - vz))) - lift
tf    = sin(th) > 0.08 ? clamp(Fx/sin(th), 0, Tf) (0 if Fx < 0) : clamp(0.6*need / max(0.2, cos th), 0, Tf)
tr    = clamp(need - tf*cos(th), 0, Tr)
excess = lift + tf*cos(th) + tr - max(0, m*(g + 1.5*(vzT - vz)));  liftE = excess > 0 ? max(0, lift - excess) : lift
ax    = (tf*sin(th) - drag)/m - (wantPlane ? 0 : min(2.5, 2*V))      back-transition brake up to ~0.25 g
az    = (liftE + tf*cos(th) + tr - W)/m
V += ax*dt;  vz += az*dt;  yaw += yawRate*dt;  velocity = V*(cos yaw, sin yaw, ...)
roll  = -clamp(atan(V*yawRate/g), +-0.8);  pitch = -clamp(atan2(vz, max(V, 4)), +-0.35)
thrEff (battery) = 0.9 * (2*tf/Tf + tr/Tr)/3
rpm front = tf > 1 N ? max(0.25, sqrt(tf/Tf)) : 0.15;  rpm rear = tr > 0.5 N ? max(0.25, sqrt(tr/Tr)) : 0
```

Events: fully tilted, below 0.9 x VS and the rear motor working (> 0.3 Tr): "Below stall speed: Q_ASSIST spins the lift
motors up" (re-armed above 1.1 x VS). Phase text: "transition" (tilting), "cruise", "back-transition". Back in hover
when not wanting plane, tilt 0 and V < 6 m/s: "Back in hover: VTOL motors only", log "Back-transition complete".
TILT reversed: above 0.2 tilt the nose pitches at 160 deg/s and above 0.4 it crashes, "Tilt servos reversed: the
motors swung BACK and it flipped over its tail". FC reversed in plane regime after 0.5 s: "FC arrow points
backwards: every correction went the wrong way". Touching the ground faster than 4 m/s or sinking faster than
3 m/s: "Hit the ground at speed".

Verified **[live]**:
- Transition (auto): climbs at 1.9 m/s, "Transition: the front motors tilt forward" at 3.0 s (5 m), tilt 0.34 /
  0.67 / 1.0 at 4 / 5 / 6 s, phase "cruise" from 6 s. It balloons to 18 m during the transition, then settles at
  8 m by about 14 s and circles at 13.0 m/s (yaw rate about 1.1 rad/s) on a circle of about 12 m radius centred near (50, 59), drawn
  with a 46 deg bank, the rear motor stopped, fronts at
  25 %, 1.2-1.3 A (hovering drew 16 A).
- QRTL switched on at 50 s (inside 24 m): back-transitions on the spot, "Back in hover: VTOL motors only" at 53.0 s,
  flies home in hover, "Landed on the pad: disarmed" at 63.7 s; 91 mAh total.
- Range with T: W climbs at 2.1 m/s, "CLIMB 10 M done" at 3.7 s, T at 4.2 s, straight east at 13 m/s, ballooning to
  20.7 m; QRTL at 30 s, 315 m out, turns home as a plane, descends to 8 m, back-transitions inside 24 m,
  "Back in hover" at 58.1 s, landed 67.7 s.
- TILT reversed: crash at 4.2 s with the tilt-servo message. FC reversed: QHOVER flips on take-off at 0.7 s; in
  Transition it flips during the climb and hits scenery at 4.0 s. PROPS swapped: flips at 0.7 s.
- 2306 2400KV (over, thrust capped at 2600 g): "Desync! 2400KV on 4S overheats: the ESC lost a motor" after 30 s of
  hover.

Field extras (`14:336-338`): three 17 m turbine blades turning at 1.2 rad/s on the offshore turbine (drawn in every
mode). Flight stats: "Tilt" `n deg`, "Airspeed" `x.x m/s`, "Phase" (on the pad, climbing, hover, coming home,
landing, transition, cruise, back-transition).

### Range: "Coastal inspection" (`14:283-334`)

Brief "Climb, press T to transition, round the lighthouse and the turbine, hover over the rooftop pad, come home";
field 180 m, pad (50, 50), ground `#d9e2c6`, altitude-hold sticks, camTilt 8. Land to the west, sea to the east:
a 90 x 180 m sea from x = 90, a beach strip, a rock (r 6 m) under the lighthouse, an island (r 13 m) with three
trees; an airfield strip at the pad, a road to the city and a red 5 m windsock; a harbour with a quay, two
warehouses (10 x 16 x 7 m, 14 x 9 x 6 m), three containers (two stacked) and two cranes (20 m and 16 m with jibs);
the lighthouse at (110, 100): a 22 m white tower with a red band, yellow lantern and red cap to 27.2 m; an offshore
wind turbine at (160, 60): 40 m tower, nacelle at 40 m, animated blades; the city: five blocks 9-18 m high, two
houses and "the tower" (14 x 14 x 30 m at (40, 135), collision message "Hit the tower") with a dark 9 x 9 m rooftop
helipad and an H mark; four trees.

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | CLIMB 10 M | 50 | 50 | 10 | 3 | sphere (touch) |
| 2 | COASTLINE | 105 | 75 | 12 | 6 | sphere (touch) |
| 3 | LIGHTHOUSE | 122 | 104 | 14 | 7 | sphere (touch) |
| 4 | TURBINE | 160 | 76 | 20 | 8 | sphere (touch) |
| 5 | ROOFTOP PAD | 40 | 135 | 33 | 2.4 | sphere (touch) |
| 6 | HOME | 50 | 50 | 1.2 | 2.5 | sphere (touch) |

Range code:

```
# the same run as an ArduPilot mission (QuadPlane)
VTOL_TAKEOFF   alt 10
WAYPOINT       105  75  12    # coastline
WAYPOINT       122 100  14    # round the lighthouse
WAYPOINT       160  75  20    # past the turbine
VTOL_LAND      40 135         # rooftop helipad (31 m)
RETURN_TO_LAUNCH              # Q_RTL_MODE 1: land as a copter
```

### Controls and FPV

Controls panel: `Space` "arm (auto modes then fly themselves)" / `W S` "climb / descend (QHOVER)" / `A D` "yaw" / `arrows` "move (QHOVER)" / `R` "reset to the pad"; then the line "or drag the two sticks on the figure". Source: the craft's own `controls`. FPV follows the attitude, tilted up 8 deg.

### Lesson text

"Meet the VTOL" (summary): it takes off and lands like a drone and flies like a plane, with no runway or hand
launch; once the wing flies it carries the whole weight and cruise needs about a third of hover power. This one is a
tricopter-layout tiltrotor; the hard part is the transition, the few seconds when the wing is too slow to lift but
the motors already point forward, which ArduPilot's QuadPlane code covers with Q_ASSIST.

Build code panel ("ArduPilot parameters · build"):

```
# after the build, in ArduPilot (Mission Planner > Full Parameter List):
Q_ENABLE       1          # turn on QuadPlane, reboot
Q_FRAME_CLASS  7          # tri
SERVO1_FUNCTION 75        # left tilt servo  (TiltMotorFrontLeft)
SERVO2_FUNCTION 76        # right tilt servo
SERVO1_REVERSED 0         # check with the tilt test BEFORE flying
ARSPD_TYPE     1          # MS4525 on I2C
ARSPD_USE      1
AHRS_ORIENTATION 0        # 4 = yaw 180 if the arrow points back
```

Practice task (summary): hover up in QHOVER, switch to Transition and watch tilt, airspeed and the rear motor while
it speeds up, switch to QRTL and watch it bleed speed and land; on a real build run the tilt servo test and set
`Q_ASSIST_SPEED` before the first transition, and make that first transition high, into wind, with a switch back to
QHOVER under your thumb.

### Quiz

1. "Why does a VTOL fly so much longer than a quad on the same battery?" Options: Its motors are more efficient; **In cruise the wing carries the weight, the motors only fight drag** (correct); It flies lower.
2. "The tilt servos are reversed. When does it crash?" Options: On takeoff; **At the start of the transition, when the motors swing back** (correct); Only in wind.
3. "Why use an airspeed sensor instead of GPS speed?" Options: GPS is too slow to update; **The wing only cares about air speed: with a tailwind GPS reads fast while the wing stalls** (correct); Airspeed sensors are cheaper.
4. "What does Q_ASSIST_SPEED do?" Options: Limits top speed; **Spins the lift motors up when airspeed drops below it, so a slow wing does not stall** (correct); Sets the transition time.

### Defects and inaccuracies

- Cruise current in the physics (about 1.2 A) is a quarter of the calc's 5 A cruise and 1/13 of hover, so the sim
  battery outlasts the "76 min" tile by far; the lesson's "about a third of the power" only holds in the calc.
- The over warning names the motor ("2306 2400KV (racing) is a racing motor") and also fires for the 2810 1000KV on
  6S, where the real problem is the voltage.
- Thrust is silently capped at 2600 g when over, so an over design shows a flattering T:W (4.8 to 5.5).
- The transition balloons 10-13 m above the 8 m cruise height before settling.
- QRTL only flies home "as a plane" from more than 24 m out; from the auto-transition circle (always within 24 m) it
  back-transitions immediately.
- Q_ASSIST's message exists but the normal flows never trigger it.
- The props step does not enforce the tilt test that the text demands.
- `ARSPD_FBW_MIN` and `TRIM_ARSPD_CM` are pre-4.5 names (now `AIRSPEED_MIN` and `AIRSPEED_CRUISE` in m/s).
- The calibrate toast ignores the airspeed sensor named on the button; no airspeed calibration exists.
- Dead config: `pad: [15, 11]`, `trees`; the cruise circle is written relative to that old pad
  (`PAD + CC - (15, 11)`).
- No field boundary for the plane.

---

## Fig 11. Crazyflie 2.1 swarm (`swarm`), file `15-fig11-crazyflie-2.js`

Identity (`15:89-96`): name "Crazyflie swarm", sub "Crazyflie, mocap", noun "nano quad", hint "build it, then fly
one, four, or a trajectory", palette `mint`, mat 160, `benchH` 45, `benchZ` 13, `flyScale` 6, `flyVB` 6500,
`ceiling` 4 m, log "cflib", panels "cflib (python)" and "cfclient console", calibrate "Calibrate (level the IMU)".
`noSmoke: true` (no smoke stopper; the draw function also forces `smokeOk = true`, `15:155`), `plugNeeds: ['BATT']`,
`motorNeeds: ['MOTORS', 'FC']`, `wrongMotor: 2`, `arrowZ` 30, `camTilt` 5, `gates: []`, `trees: []`. Default mode
`hover`.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `1s250` * | 1S 250 mAh (stock) | 1 | 250 | 7.1 | 8 | `#c9ced0` | 250 |
| `1s350` | 1S 350 mAh | 1 | 350 | 9.6 | 10 | `#3e86d9` | 350 |
| `1s450` | 1S 450 mAh (heavy) | 1 | 450 | 12.5 | 11 | `#d9a520` | 450 |

**Motors** (`motors`):

| key | name | KV | g | $ | big |
|---|---|---|---|---|---|
| `7x16` * | 7x16 coreless (stock) | 14000 | 1.6 | 4 |  |
| `7x16hp` | 7x16 thrust upgrade | 15500 | 1.7 | 6 |  |
| `8x20` | 8x20 coreless | 12500 | 3.4 | 6 | true |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ |
|---|---|---|---|---|---|
| `45mm` * | 45 mm 2-blade (stock) | 1 | 1 | 0.3 | 2 |
| `47mm` | 47 mm thrust props | 1.12 | 0.93 | 0.35 | 3 |

Fixed parts (`15:19-23`); the Crazyradio weighs 0 g because it lives on the laptop, and the PCB frame counts as
Electrical:

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | Crazyflie PCB + motor mounts | 9.5 | 195 | Electrical |
| `FLOW` | Flow deck v2 | 1.6 | 50 | Electrical |
| `DECKL` | Lighthouse positioning deck | 1.8 | 75 | Electrical |
| `HDR` | Long pin headers | 0.6 | 4 | Mechanical |
| `RADIO` | Crazyradio 2.0 USB dongle | 0 | 35 | Electrical |
| `STRAP` | Velcro battery strap | 0.2 | 1 | Mechanical |

Fixed parts total: **13.7 g**, $355 electrical + $5 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `15:135-146`)

```
V        = 3.7 (1S, fixed)
thrust   = 13.4 * (KV/14000)^2 * pf      g per motor at full throttle (stock 7x16 + 45 mm = 13.4 g)
AUW      = fixed + 4*motor.g + 4*prop.g + battery.g
hoverA   = AUW / (4.4 * prop.eff) / V    ~4.4 g/W
hoverMin = (mAh/1000*0.8) / hoverA * 60;   flyMin = hoverMin * 0.92
maxA     = 4 * 1.2 * (KV/14000)^2 * pf   (1.2 A per stock motor flat out)
over     = motor.big (only the 8x20)
weak     = T:W < 1.65
cost     = Mechanical += prop.price * 2;  hoverThr = sqrt(AUW / (4*thrust))
```

Default worked: AUW 28.4 g (27 g real), 13.4 g per motor, T:W 1.89, hover 1.74 A, 6.9 min hover, 6.3 min flying,
max 4.8 A.

Design tiles for the default build (as rendered): "All-up weight" 28 g; "Thrust : weight" 1.9 : 1; "Hover throttle" 73%; "Max current" 5 A; "Hover time" 6.9 min; "Freestyle time" 6.3 min. Cost table: Electrical $379, Mechanical $9, total $388. Verdict line: "Stock-like build: about 1.9:1, enough margin to fly a tight formation indoors."

Across all 18 combinations T:W ranges 1.04 to 2.54. `over` in 6: `1s250/8x20/45mm`, `1s250/8x20/47mm`, `1s350/8x20/45mm`, `1s350/8x20/47mm`, `1s450/8x20/45mm`, `1s450/8x20/47mm`. `weak` in 7: `1s250/8x20/45mm`, `1s250/8x20/47mm`, `1s350/8x20/45mm`, `1s350/8x20/47mm`, `1s450/7x16/45mm`, `1s450/8x20/45mm`, `1s450/8x20/47mm`.

Warnings (`15:147-152`), concatenated:
- big motor: `8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16.`
- weak: `Thrust to weight ${tw.toFixed(1)}:1: the ${mAh} mAh cell is too heavy. It hovers at full throttle with nothing left to correct, so it drifts and can't hold a formation.`
- otherwise: `Stock-like build: about ${tw.toFixed(1)}:1, enough margin to fly a tight formation indoors.`

### Frame and proportions (`15:153-208`)

- The PCB is the frame: a 32 x 32 x 1.2 mm centre with four 26 x 6.8 mm arms on the diagonals; motors at
  (+-32.5, +-32.5) mm, so 92 mm motor to motor and 65 mm between neighbours; "crazyflie" printed on the board.
- Four LEDs at 78 % of each arm: front-right red, front-left green, the two rear blue (glowing when powered).
- Motors in palette-coloured plastic mounts whose 11 mm legs are the landing gear; 7 mm motor cans, shaft to
  13.6 mm; 45 mm 2-blade props (drawn radius 22.5 mm for both prop choices), 20 mm clearance between props.
- Under the board: the 1S cell (30 mm, or 34 mm above 300 mAh, x 17 x 7.4 mm) with a velcro strap and its mAh
  printed ("250", "350", "450"), and under that the Flow deck (32 x 18 mm) with the sensor and a light-blue lens at
  the front.
- On top: two pin-header rows (25.4 x 2.5 mm, 7.8 mm tall) carrying the Lighthouse deck (30 x 30 mm, "LIGHTHOUSE"
  printed, four photodiode blocks at (+-11, +-11)).
- MCU + radio: the STM32, nRF51 and IMU chips on the board.
- The Crazyradio sits on the bench as a white USB dongle with a metal plug and an antenna stub; it is not drawn in
  the field.
- Bench tags: DECKL, MOTORS, BATT, FLOW, RADIO.

Motor order (`15:37`, Crazyflie numbering clockwise from front-right): M1 front-right CCW, M2 rear-right CW, M3
rear-left CCW, M4 front-left CW. Motor check spins M1..M4 and reports M3.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Crazyflie PCB (the board IS the frame) | PCB FRAME |  | 0 |  |
| 2 | `FC` | STM32F405 + nRF51822 | MCU + RADIO | FRAME | 1 |  |
| 3 | `MOTORS` | 4 coreless brushed motors in plastic mounts | MOTORS | FRAME | 1 |  |
| 4 | `BATT` | 1S 250 mAh LiPo + velcro strap | 1S LIPO | FRAME | -1 |  |
| 5 | `FLOW` | Flow deck v2 (optical flow + ToF) | FLOW DECK | BATT | -2 |  |
| 6 | `HDR` | Long pin headers | HEADERS | FRAME | 2 |  |
| 7 | `DECKL` | Lighthouse positioning deck | LIGHTHOUSE | HDR, FC | 3 |  |
| 8 | `PROPS` | Props (2 CW + 2 CCW) | PROPS | MOTORS, DECKL, BATT | 3.6 | `correct CW/CCW` / `swapped` |
| 9 | `RADIO` | Crazyradio 2.0 (USB) | CRAZYRADIO |  | 0 |  |

What each part teaches (paraphrased):
- FRAME (PCB FRAME): a 92 mm, 1 mm X-shaped circuit board; no carbon frame, the copper layers carry power and
  signals and the board takes the loads, which is how it gets down to 27 g.
- FC (MCU + RADIO): the STM32 runs the estimator and PID controllers, the nRF51 the 2.4 GHz radio and power
  management; soldered at the factory; open-source firmware flashed over the radio.
- MOTORS: 7 x 16 mm coreless brushed motors switched by MOSFETs on the board (no ESCs); brushed motors wear out, and
  a weak one makes it drift: swap the motor, not the PID.
- BATT (1S LIPO): 3.7 V and 7 g, a quarter of the drone; a bigger cell helps only up to about 350 mAh, then the
  weight eats the energy and a swarm can barely climb.
- FLOW (FLOW DECK): PMW3901 optical flow for sideways motion plus a VL53L1x laser for height: position hold indoors
  without GPS, as long as the floor has texture.
- HDR (HEADERS): two 10-pin rows carry power, I2C, SPI and UART; long pins let decks stack above and below.
- DECKL (LIGHTHOUSE): four photodiodes time the infrared sweeps of SteamVR base stations; the drone computes its own
  position to a few millimetres, so a whole swarm shares one coordinate system.
- PROPS: push-on 45 mm props; diagonal pairs spin the same way so torques cancel; swapped, it spins and flips.
- RADIO (CRAZYRADIO): one USB radio talks to many Crazyflies by address; cflib streams setpoints and reads logs for
  the whole swarm.

Build order **[live]**: FRAME, FC, MOTORS, BATT, FLOW, HDR, DECKL, RADIO, then PROPS (after MOTORS, DECKL and BATT).
Only PROPS is polar ("correct CW/CCW" / "swapped"); there is no XT60, ESC or WIRES part, so the only real mistake is
swapped props (plus the heavy cell and the 8x20 motors in the design).

### Bench safety tests **[live]**

Buttons: "Take it apart", "Add next part", "Build it for me", "Check motor direction", "Calibrate (level the IMU)",
"Plug / unplug battery", "Fly", "Arm / disarm", "Reset", "Exploded view" (no smoke stopper). The motor check still
says "M3 spun the wrong way: reversed it in the ESC configurator. They all spin right now".

### Wiring diagram (`15:211-226`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `FLOW` | 20, 40 | FLOW DECK | PMW3901 + VL53L1x | `#43a35a` |
| `DECKL` | 20, 160 | LIGHTHOUSE | 4 photodiodes + FPGA | `#43a35a` |
| `FC` | 305, 98 | STM32 + nRF51 | estimator, PID, radio | `#3e86d9` |
| `RADIO` | 590, 20 | CRAZYRADIO | 2.4 GHz, USB | `#8c4bd1` |
| `MOTORS` | 590, 160 | MOTORS x4 | 7x16 coreless (stock) | `#f08a2b` |
| `BATT` | 305, 250 | 1S LIPO | 1S 250 mAh (stock) | `#e2483d` |

Connection labels drawn on the lines: "SPI + I2C", "UART + I2C", "2.4 GHz link", "PWM -> MOSFETs", "VBAT", "motor power (switched)".

Legend: `#e2483d` power, `#43a35a` data (decks / motors), `#8c4bd1` radio, `#f08a2b` brushed motors.

### Flight modes

**`hover` - "Hover (Flow deck)"** (default mode). Arm hint: "Hold W to take off, arrows to drift". Controls: altitude-hold sticks.

```
# one Crazyflie, position held by the Flow deck
import cflib.crtp
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
from cflib.positioning.motion_commander import MotionCommander

URI = 'radio://0/80/2M/E7E7E7E7E7'
cflib.crtp.init_drivers()
with SyncCrazyflie(URI) as scf:
    with MotionCommander(scf, default_height=0.5) as mc:
        mc.forward(0.5)       # metres, measured by optical flow
        mc.turn_left(90)
        mc.back(0.5)          # lands when the block ends
```

**`swarm` - "Swarm formation x4"**. Arm hint: "Space: all four take off together". Controls: altitude-hold sticks.

```
# four Crazyflies, one radio, one shared Lighthouse frame
from cflib.crazyflie.swarm import CachedCfFactory, Swarm

URIS = ['radio://0/80/2M/E7E7E7E701', 'radio://0/80/2M/E7E7E7E702',
        'radio://0/80/2M/E7E7E7E703', 'radio://0/80/2M/E7E7E7E704']

def square(scf, x, y):
    hl = scf.cf.high_level_commander
    hl.takeoff(1.0, 2.5)
    time.sleep(3)
    hl.go_to(x, y, 1.0, 0, 2.0)   # absolute Lighthouse coordinates

with Swarm(URIS, factory=CachedCfFactory(rw_cache='./cache')) as swarm:
    swarm.reset_estimators()      # wait until every position is locked
    swarm.parallel_safe(square, args_dict=SLOTS)
```

**`figure8` - "Figure-8 trajectory"**. Arm hint: "Space: it flies the uploaded trajectory". Controls: altitude-hold sticks.

```
# upload a polynomial trajectory, then let the onboard
# controller follow it using its own position estimate
cf.high_level_commander.define_trajectory(1, 0, len(figure8))
upload_trajectory(cf, trajectory_id=1, trajectory=figure8)

hl = cf.high_level_commander
hl.takeoff(1.0, 2.5); time.sleep(3)
hl.start_trajectory(1, time_scale=1.0, relative=True)
time.sleep(10)          # one loop
hl.land(0.0, 2.0)
```


### Swarm and trajectory autopilot (`15:39-87`, `15:267-276`)

`steer(target)`: velocity target = 1.6 x position error capped at 1.4 m/s; acceleration = 3 x velocity error; sticks
= `atan(a/g) / 38deg`; throttle stick = `((z_t - z)*1.6 - 0.3*vz) / 2.2`; yaw stick = `clamp(2*yaw)` (holds
heading 0). In swarm and figure-8 modes `D.auto` is always true; disarmed, the sticks are zeroed.

`formation(k, t)` (`15:42-54`), slot k of the 4-drone show, t = seconds since arming, centre = the pad:
- 0 to 2.5 s: synchronised take-off at the square slots (+-0.6, +-0.6) m, height `min(1, t/2.5)`.
- then three shapes, 6 s each, looping: (0) the square rotating at 0.25 rad/s at 1 m; (1) a circle of radius
  0.85 m, angle `0.7 T + k*pi/2`, height `1 + 0.15 sin(1.4 T + k)`; (2) a line at x = centre + 0.2, y = centre - 0.9
  + 0.6 k, heights alternating 0.8 / 1.25 m. Each change blends from the previous shape over 1.5 s with ease-in-out.
- The pilot's Crazyflie flies slot 0 through the stock model; the three wingmates (slots 1-3, `15:75-87`) are
  kinematic: velocity = (1.8 horizontal, 1.6 vertical) x position error capped at 1.4 m/s, eased with
  `min(1, 4 dt)`, props spinning while airborne, drawn with the same drawing function.

`figure8(t)` (`15:55-60`): climb to 1 m over 2.5 s, then `x = c + 1.2 sin(w T)`, `y = c + 0.7 sin(2 w T)`, z = 1,
`w = 2 pi / 10` (10 s per loop). The path is drawn dashed at flying height.

Verified **[live]**: swarm take-off together by 2.5 s; rotating square 2.5-8.5 s, circle 8.5-14.5 s, line
14.5-20.5 s (mates at 1.25 / 0.8 / 1.25 m), square again from 20.5 s; 73 % hover throttle, 2.1 A. Figure-8 loop
counter 1 from 2.5 s, 2 at 12.5 s, 3 at 22.5 s. Neither script ever lands. 1S 450 cell: the hover throttle sits near
80 % and saturates on climbs. 8x20 motors: "Desync! 12500KV on 1S overheats: the ESC lost a motor" after 6 s. Swapped
props: flip at 0.7 s.

Flight stats: swarm "Swarm" "4 airborne" / "4 ready"; figure-8 "Loop" `n` or "-".

### Range: "Robotics lab cage" (`15:97-134`)

Brief "Through the hoop, behind the pillar, rings A and B, land on the X"; field 10 m, pad (3.5, 4.5), ground
`#d9d6cf`, altitude-hold sticks, camTilt 5, no range code (the engine default line is shown). Scenery: blue foam crash
mats and a red landing X at (3.5, 7.2); the netted cage as 3 m aluminium posts about every 2.3 m round x 1-7.8,
y 1-9 with a top frame at 3 m and a kick board along two walls (the nets themselves are not modelled); two
Lighthouse base stations on top of opposite corner posts; an orange foam pillar (r 0.25 m, 2.2 m) at (6, 3); a hoop
on a stand at x = 5.6 (window about 0.65 x 0.65 m centred at 0.98 m); stands under rings A and B; a desk outside the
cage with two laptops and the Crazyradio.

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | THE HOOP | 5.6 | 6.8 | 0.98 | 0.27 | ring, crossed heading 0 deg |
| 2 | BEHIND THE PILLAR | 6.85 | 3 | 0.8 | 0.35 | sphere (touch) |
| 3 | RING A | 4.5 | 2 | 1.2 | 0.3 | ring, crossed heading 180 deg |
| 4 | RING B | 2.2 | 2.6 | 0.6 | 0.3 | ring, crossed heading 135 deg |
| 5 | LAND ON THE X | 3.5 | 7.2 | 0.25 | 0.35 | sphere (touch) |

### Controls and FPV

Controls panel: `W S` "climb / descend (hover mode)" / `arrows` "drift (hover mode)" / `A D` "yaw" / `Space` "arm: in swarm / figure-8 the script flies" / `R` "reset to the pad"; then the line "or drag the two sticks on the figure". Source: the craft's own `controls`. FPV follows the attitude, 5 deg up.

### Lesson text

"Meet the nano quad" (summary): the research world's favourite drone, 27 g, open-source firmware, a circuit board for
a frame; labs fly dozens at once to study swarms, planning and control. Indoors there is no GPS, so position comes
from decks: the Flow deck watches the floor, the Lighthouse deck times sweeps from VR base stations (mocap cameras do
the same job); with a shared position one laptop and one Crazyradio can fly a whole formation from Python.

Build code panel ("cflib (python) · build"):

```
# after the build: flash the latest firmware over the radio
cfloader flash cf2-2024.10.zip stm32-fw nrf51-fw -w radio://0/80/2M
# check the decks were detected
python -m cfclient          # Console tab: "Deck: Flow v2 found, Lighthouse found"
# pin headers: decks talk I2C (0x29 ToF) and SPI (flow camera)
```

Practice task (summary): fly one Crazyflie with the MotionCommander (take off, a 0.5 m square, land), log the Flow
deck height and the Kalman position at 100 Hz and plot them, then run the swarm example with two drones and measure
how close they can safely pass.

### Quiz

1. "Why does a Crazyflie need a Flow or Lighthouse deck to hold position indoors?" Options: **The IMU alone drifts: it needs an outside position reference** (correct); The decks add thrust; The radio needs them to connect.
2. "How do four Crazyflies avoid each other in a formation?" Options: Each one has obstacle sensors; **They all know their position in one shared frame and fly planned setpoints** (correct); They follow the leader by camera.
3. "Brushed motors have no ESC. What switches them?" Options: **MOSFETs on the board, driven by PWM** (correct); The battery protection chip; The Crazyradio.
4. "The 450 mAh battery holds more energy. Why can it fly worse?" Options: It is the wrong voltage; **The extra weight leaves almost no thrust margin to correct or climb** (correct); It blocks the radio.

### Defects and inaccuracies

- The weak warning always blames the battery ("the 250 mAh cell is too heavy") even when the 8x20 motors are the
  cause (1S 250 + 8x20 is weak at 1.2:1).
- The motor check and the desync message talk about an ESC and an "ESC configurator"; a Crazyflie switches brushed
  motors with MOSFETs, and spin direction comes from fitting the right CW or CCW motor (they are wired differently)
  and the right prop.
- The swarm snippet uses `time` without importing it and an undefined `SLOTS`; the client is started with `cfclient`
  rather than `python -m cfclient`; the figure-8 snippet lands after one loop while the simulator loops for ever.
- The engine collision radius (0.14 m) is about twice the Crazyflie's real half-size, which makes the hoop tighter
  than it looks; the cage nets are not solid.
- Flow-deck limits (texture, height range) and Lighthouse occlusion are taught but not simulated.

---

## Fig 12. Tricopter (`tricopter`), file `16-fig12-tricopter.js`

Identity (`16:61-67`): name "Tricopter", sub "servo yaw", noun "tricopter", hint "build the Y, set up the tail servo,
then fly it", palette `mint`, mat 400, `benchH` 140, `flyScale` 2.6, `flyVB` 7000, log "betaflight", panels
"Betaflight CLI" and "Betaflight log", calibrate "Calibrate accelerometer", `nMotors` 3, `wrongMotor` 2, `camTilt`
22. Default mode `alt`. Modes are the engine's four (`DEF_MODES`, `03:428-449`) plus `yaw` (`16:51-59`).

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `4s2200` * | 4S 2200 mAh | 4 | 2200 | 250 | 34 | `#2b2a28` | 4S 2200 |
| `4s1800` | 4S 1800 mAh | 4 | 1800 | 210 | 30 | `#2f5fa8` | 4S 1800 |
| `4s1500` | 4S 1500 mAh | 4 | 1500 | 182 | 28 | `#d9a520` | 4S 1500 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `2306-2450` * | 2306 2450KV | 2450 | 32 | 20 | 4 |
| `2207-2150` | 2207 2150KV | 2150 | 34 | 22 | 4 |
| `2205-2300` | 2205 2300KV | 2300 | 28 | 16 | 4 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ | r (mm, drawn radius) |
|---|---|---|---|---|---|---|
| `5x4.3x3` * | 5x4.3x3 tri-blade | 1 | 1 | 4.4 | 4 | 63 |
| `6x4x2` | 6x4x2 bi-blade (efficient) | 1.08 | 1.15 | 5 | 4 | 76 |
| `5x5x3` | 5x5x3 (aggressive) | 1.1 | 0.88 | 4.8 | 4 | 63 |

Fixed parts (`16:19-24`):

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | Y frame: plates, 2 arms, tail boom | 190 | 45 | Mechanical |
| `ESC` | 3x 30A BLHeli_S ESC | 21 | 36 | Electrical |
| `FC` | F4 flight controller + PDB | 8 | 35 | Electrical |
| `TAILSERVO` | Metal-gear servo + tilt mount | 22 | 14 | Mechanical |
| `CAM` | Analog FPV camera | 7 | 25 | Electrical |
| `VTX` | 5.8 GHz VTX + antenna | 9 | 30 | Electrical |
| `RX` | ELRS 2.4 GHz receiver | 2 | 18 | Electrical |
| `XT60` | XT60 pigtail + low-ESR cap | 12 | 4 | Electrical |
| `TOP` | Top plate + standoffs + screws | 20 | 7 | Mechanical |
| `STRAP` | Battery strap + pad | 5 | 4 | Mechanical |

Fixed parts total: **296 g**, $148 electrical + $70 mechanical (before the motors, battery and props are added).

### Design maths

Stock `calc()` (section 1) with `kThrust 0.85`, `gPerW 6.8`, `minTW 3.5`, `n = 3` (`16:65`). Default worked:
36.3 krpm, 1118 g per motor, AUW 655 g, T:W 5.12, hover 6.5 A, 16.2 min hover, 6.8 min "Freestyle", max 113 A.
Mechanical cost adds `ceil(3/2) = 2` props for a three-prop craft.

Design tiles for the default build (as rendered): "All-up weight" 655 g; "Thrust : weight" 5.1 : 1; "Hover throttle" 44%; "Max current" 113 A; "Hover time" 16.2 min; "Freestyle time" 6.8 min. Cost table: Electrical $242, Mechanical $78, total $320. Verdict line: "OK Good all-round build."

Across all 27 combinations T:W ranges 3.90 to 6.27. `over` in 0: none. `weak` in 0: none.

Warnings are the engine defaults (`03:619-621`): over `${KV} KV on ${cells}S spins the props far past what the
motors and ESC can take: expect hot motors and a desync.`, weak `Thrust to weight ${tw}:1 is too low for this kind of
flying.`, ok `Parts match. ` + (`T:W > 10` ? "Plenty of punch." : "Good all-round build."). Every one of the 27
combinations shows "Parts match. Good all-round build." **[live]**: the design step cannot produce a mismatch.

### Frame and proportions (`16:155-241`)

- Y frame: centre plate 100 x 64 x 3 mm (x -52 to 48); two front arms on the +-60 deg diagonals from 24 to 122 mm,
  14 mm wide; a tail boom from x -40 to -156, 16 mm wide.
- Motors: front-right (60, -104) and front-left (60, 104), 120 mm from the centre and 208 mm apart; tail (-150, 0).
- The tail mechanism: a hinge block at the boom end; a blue metal-gear servo (22 x 12 x 18 mm) on the side of the
  boom labelled "MG" ("REV" when mounted reversed) with a horn and a pushrod up to a 30 x 30 mm tilting motor plate.
  The tail motor's frame is rotated about the boom axis by the servo angle.
- Three blue "30A" ESC boards (26 x 12 x 4 mm), two on the arms and one on the boom.
- F4 FC + PDB 31 x 31 mm with arrow and LED; nose camera between side plates with the lens rotated 72 deg (about 18 deg
  up); RX antennas pointing back and up; VTX antenna angled back; top plate 94 x 56 mm on 30 mm standoffs; battery
  96 / 88 / 80 mm long (above 2000 / above 1600 / otherwise), 36 x 33.5 mm.
- Props drawn at the selected prop's radius (63 mm for 5", 76 mm for 6"), with 2 blades when the name contains "x2 "
  and 3 otherwise.
- During the bench servo test a readout tag `TAIL TILT ${n} DEG` appears over the tail and the TAIL SERVO tag hides
  (`16:239-244`).
- Bench tags: TAILSERVO, FC, ESC, CAM, MOTORS, BATT, XT60.

Motor order (`16:40-41`, Betaflight TRI): M1 tail CCW, M2 front-right CW, M3 front-left CCW. Motor check spins M1, M2,
M3 and reports M3 reversed.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Y frame: centre plates, two front arms, tail boom | FRAME |  | 0 |  |
| 2 | `MOTORS` | 3 brushless motors | MOTORS | FRAME | 1 |  |
| 3 | `ESC` | 3 single 30A ESCs | ESCS | FRAME | 1 |  |
| 4 | `TAILSERVO` | Tail servo + tilt mount | TAIL SERVO | FRAME | 1 | `servo normal` / `servo reversed` |
| 5 | `WIRES` | Motor + ESC wires soldered | MOTOR WIRES | MOTORS, ESC | 2 |  |
| 6 | `XT60` | XT60 pigtail + low-ESR capacitor | XT60 + CAP | FRAME | 2 | `stripe to minus` / `stripe to plus` |
| 7 | `CAM` | FPV camera | CAMERA | FRAME | 2 |  |
| 8 | `FC` | F4 flight controller with PDB | FLIGHT CTRL | FRAME | 3 | `arrow forward` / `arrow backward` |
| 9 | `RX` | ELRS receiver | RECEIVER | FC | 4 |  |
| 10 | `VTX` | 5.8 GHz video transmitter | VTX | FC | 4 |  |
| 11 | `TOP` | Top plate + standoffs | TOP PLATE | FC, CAM, RX, VTX | 5 |  |
| 12 | `BATT` | LiPo battery + strap | BATTERY | TOP, XT60 | 6 |  |
| 13 | `PROPS` | Propellers | PROPS | MOTORS, TOP, TAILSERVO | 7 | `front pair opposite (correct)` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- FRAME: two front arms at 60 deg and a long tail boom; the boom gives the tail motor leverage, so a few degrees of
  tilt make a lot of yaw.
- MOTORS: three motors carry what four carry on a quad, so each works harder; Betaflight order M1 tail, M2 front
  right, M3 front left.
- ESC (ESCS): one per arm under the prop, cooled by the airflow; each turns battery DC into 3-phase AC.
- TAILSERVO: the heart of a tri: the servo tilts the tail motor so part of its thrust pushes the tail sideways;
  mounted backwards it pushes the wrong way and the tri pirouettes.
- WIRES: three phase wires per motor; swap two to reverse a motor, or flip it in software.
- XT60: 1000 uF capacitor on the battery lead, stripe to minus, backwards it vents.
- CAM: tilted up only 15-20 deg because tris cruise gently.
- FC: runs the TRI mixer (three motor outputs and one servo output); arrow at the nose, between the front arms.
- RX: ELRS on a UART, antennas back and up, away from carbon.
- VTX: never power it without its antenna.
- TOP: carries the battery over the centre of thrust, which on a tri sits further back than you would think.
- BATT: 4S is plenty; slide it until the tri hovers level hands-off: that is the CG.
- PROPS: the front pair counter-rotate to cancel torque; the tail motor's leftover torque is trimmed out with a few
  degrees of servo tilt; props last.

Build order **[live]**: FRAME, MOTORS, ESC, TAILSERVO, WIRES, XT60, CAM, FC, RX, VTX, TOP, BATT, PROPS (PROPS needs
MOTORS, TOP and TAILSERVO). Mistakes: TAILSERVO "servo reversed", XT60 "stripe to plus", FC "arrow backward",
PROPS "swapped CW/CCW".

### Bench safety tests and the servo test **[live]**

Buttons: standard set plus "Servo test" (`16:126-134`). "Land first"; needs TAILSERVO and FC ("Mount the tail servo
and the flight controller first"); it does not need the battery. Log "$ servo tab: sweep servo 5 (tail)  set
tri_unarmed_servo = ON"; the tail sweeps `28 deg * sin(4t)` (mirrored when reversed) for 3.2 s, then:
- correct: log "yaw right -> tail tilts left, servo centred at 1500 us", toast "Yaw right tilts the tail motor left:
  that pushes the tail left and swings the nose right. Correct" (`ding`);
- reversed: log "yaw right -> tail tilted the WRONG way", toast "Yaw right tilted the tail the wrong way: the servo is
  reversed. Re-mount it (Add next part, TAIL SERVO: servo normal) or set smix reverse" (`buzz`).

### Wiring diagram (`16:245-264`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 238 | BATTERY | 4S 2200 mAh | `#e2483d` |
| `XT60` | 190, 238 | XT60 + CAP | 1000 uF 35 V | `#e2483d` |
| `ESC` | 360, 238 | 3x ESC | 30 A each, BLHeli_S | `#e2483d` |
| `FC` | 360, 70 | FLIGHT CTRL | F4 + PDB, TRI mixer | `#3e86d9` |
| `RX` | 140, 32 | RECEIVER | ELRS 2.4 GHz | `#8c4bd1` |
| `TAILSERVO` | 140, 132 | TAIL SERVO | metal gear, 5 V | `#f08a2b` |
| `CAM` | 600, 14 | CAMERA | analog, 15 deg | `#43a35a` |
| `VTX` | 600, 116 | VTX | 5.8 GHz, 400 mW | `#8c4bd1` |
| `MOTORS` | 600, 238 | MOTORS x3 | 2306 2450KV | `#f08a2b` |

Connection labels drawn on the lines: "14.8V", "3-phase x3", "M1-M3", "VBAT", "UART2", "S1 PWM + 5V", "video in", "video + SmartAudio".

Legend: `#e2483d` power, `#43a35a` data / signal (servo dashed), `#f2c230` video, `#f08a2b` motor phases.

### Flight modes

**`alt` - "Altitude hold (easy)"** (default mode). Arm hint: "Hold W to climb, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: altitude-hold sticks.

```
# beginner: the FC holds height for you
# W/S = climb/descend, arrows = tilt, A/D = yaw
set alt_hold_throttle_deadband = 15
aux 1 ANGLE   ...   # self-level on
aux 2 ALTHOLD ...
```

**`angle` - "Angle mode"**. Arm hint: "W/S throttle, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: absolute throttle (W/S ramps it).

```
# self-levelling: release the stick, it levels
# W/S move the throttle and it STAYS there
set angle_limit = 38
set p_level = 50
set i_level = 50
```

**`acro` - "Acro (rate) mode"**. Arm hint: "W/S throttle, arrows to fly" (the mode has no hint, so the engine default from `03:359` shows). Controls: absolute throttle (W/S ramps it), acro: sticks = rotation rate.

```
# what freestyle pilots fly: sticks = rotation RATE
# let go and it keeps its angle, it does NOT level
set roll_rc_rate = 100
set roll_srate = 70      # ~540 deg/s at full stick
set p_roll = 45
set d_roll = 40
```

**`race` - "Gate race"**. Arm hint: "Fly through the gates in order" (the mode has no hint, so the engine default from `03:359` shows). Controls: absolute throttle (W/S ramps it).

```
# 5 gates, fly them in order, the timer starts at gate 1
# (angle mode here; real racers fly acro)
set osd_timer_1 = ON
set osd_stat_max_spd = ON
```

**`yaw` - "Yaw demo (autopilot)"**. Arm hint: "Hands off: watch the tail motor tilt to yaw". Controls: altitude-hold sticks.

```
# hover, then yaw left and right: watch the tail
# motor tilt. On a tri, yaw = servo tilt, not motor torque
mixer TRI
set tri_unarmed_servo = ON    # servo moves on the bench
set yaw_motors_reversed = OFF
set p_yaw = 60                # tri yaw needs more P than a quad
smix reverse 5 2 r            # flip if it yaws the wrong way
```


### Tail-servo physics (`16:136-153`)

- Yaw demo (`D.auto`): auto-arms once on the ground (calls `toggleArm()` itself), holds 1.6 m with throttle stick
  `clamp(1.4 * (1.6 - z))`, yaw stick `0.85 * sin(1.1 t)`, and damps pitch and roll sticks by 0.9 per step.
- Servo angle: target `30 deg * yaw stick` while armed; it eases toward `clamp(target, +-40 deg)` at
  `min(1, 14*dt)`; shown as the "Tail tilt" stat.
- Reversed servo (armed, thrEff > 0.05, after 0.2 s): a runaway pirouette, rate starting at 60 deg/s and growing by
  700 deg/s^2 up to 1100 deg/s, the servo slamming between its stops (`40 deg * sign(sin(30t) + 0.2)`); message
  "Pirouette! The tail servo is reversed: it tilts the wrong way", log "yaw runaway: servo direction reversed",
  `buzz`.
- Everything else is the stock multirotor model: the actual yaw comes from the stock `200 deg/s` per unit stick; the
  servo angle is drawn, not used for thrust vectoring.

Verified **[live]**: yaw demo arms itself with the hint "Hands off: watch the tail motor tilt to yaw", climbs to 1.6 m
(44 % throttle), swings its heading about +-150 deg while the tail tilts up to +-25 deg. Reversed servo in altitude
hold with W held: the pirouette message at 0.2 s, 1100 deg/s by 1.7 s, never stopping, but it keeps climbing and does
not crash. Swapped props or a reversed FC: flip at 0.7 s.

### Gates and range

Race mode uses six gates on the lawn south of the lamp row (`16:68-69`): (30, 5) heading 0, (41, 8) 90,
(34, 11) 180, (12, 11) 180, (5, 7) 270, (14, 3.5) 0; lap verified **[live]** ("Lap 10.00 s (best!)" from the
teleport run). They stay standing in every mode (`keepGates: true`).

Range "City park" (`16:71-125`): brief "Slalom the lamps, orbit the fountain, under the gazebo, land on the path";
field 46 m, pad (23, 6), ground `#d7e3c4`, altitude-hold sticks, camTilt 22. Scenery: footpaths and paving; a pond
(r 4.2 m) at (8, 24); the fountain at (36, 28): stone basin r 2.5 m x 0.5 m, non-solid water, a 1.7 m pillar and a
bowl at 1.6 m; six 3.9 m lamp posts with yellow heads at x = 8, 14, 20, 26, 32, 38 on y = 16 (the slalom); the gazebo
at (14, 32): floor, four 2.6 m posts at +-1.6 m, a slab at 2.6 m and a 1.3 m pyramid roof; four benches; a big oak
(3 m trunk, crown r 3.2 m) at (24, 39) and five trees; a playground (slide tower, ramp, climbing frame) at (40, 41).

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | SLALOM 1 | 11 | 14.6 | 1.5 | 0.9 | ring, crossed heading 0 deg |
| 2 | SLALOM 2 | 17 | 17.4 | 1.5 | 0.9 | ring, crossed heading 0 deg |
| 3 | SLALOM 3 | 23 | 14.6 | 1.5 | 0.9 | ring, crossed heading 0 deg |
| 4 | SLALOM 4 | 29 | 17.4 | 1.5 | 0.9 | ring, crossed heading 0 deg |
| 5 | SLALOM 5 | 35 | 14.6 | 1.5 | 0.9 | ring, crossed heading 0 deg |
| 6 | ORBIT S | 36 | 23 | 2 | 1.4 | sphere (touch) |
| 7 | ORBIT E | 41 | 28 | 2 | 1.4 | sphere (touch) |
| 8 | ORBIT N | 36 | 33 | 2 | 1.4 | sphere (touch) |
| 9 | ORBIT W | 31 | 28 | 2 | 1.4 | sphere (touch) |
| 10 | GAZEBO | 14 | 32 | 1.3 | 0.8 | ring, crossed heading 180 deg |
| 11 | LAND | 23 | 6 | 0.8 | 1.6 | sphere (touch) |

Range code:

```
# park run: smooth yaw is the tricopter's party trick
# (the tail servo yaws it like a plane's rudder)
set tri_unarmed_servo = ON
set yaw_rc_rate = 90      # gentle, cinematic yaw
set p_yaw = 60
set i_yaw = 90            # tails need lots of I to hold heading
```

### Controls and FPV

Controls panel: `W S` "throttle (alt hold: climb / descend)" / `A D` "yaw" / `arrows` "pitch + roll" / `Space` "arm / disarm" / `R` "reset to the pad" / `V` "first-person (FPV) view"; then the line "or drag the two sticks on the figure". Source: the engine default list, since this craft defines no `controls`. FPV tilted up 22 deg. Flight stats add "Tail tilt" `n deg`.

### Lesson text

"Meet the tricopter" (summary): three motors in a Y and one trick, a tail motor on a servo; tilting it a few degrees
shoves the tail sideways, so the tri yaws smoothly like a plane banking instead of a quad's twitchy torque yaw. That
makes tris smooth for video and efficient with big props; the price is the servo, which works every moment of the
flight and, if it stalls, slips or is mounted backwards, nothing else can stop the yaw.

Build code panel ("Betaflight CLI · build"):

```
# Betaflight CLI for a tricopter
mixer TRI                     # M1 tail, M2 front right, M3 front left
set tri_unarmed_servo = ON    # see the servo move on the bench
servo 5 1000 2000 1500 100 -1 # min max centre rate (5 = tail)
smix reverse 5 2 r            # flip if yaw right tilts the wrong way
set align_board_yaw = 0       # arrow points at the nose
set p_yaw = 60                # tri yaw needs more P than a quad
save
```

Practice task (summary): fly the yaw demo; in altitude hold do slow 360 deg pirouettes and keep the tail tilt stat well
under its 40 deg limit; on a real tri set the servo centre with the props off so the tail motor sits level, check that
yaw right tilts the tail motor left, then hover and trim the servo until it holds heading hands-off.

### Quiz

1. "How does a tricopter yaw?" Options: By speeding up two motors and slowing one, like a quad; **A servo tilts the tail motor so part of its thrust pushes the tail sideways** (correct); It cannot yaw, it only banks.
2. "Why do the two front props spin in opposite directions?" Options: **To cancel each other's torque, so the servo only trims the tail's leftover** (correct); So they do not touch; It makes the tri faster.
3. "You take off and the tri instantly starts spinning faster and faster. First suspect?" Options: Low battery; **The tail servo is reversed: it tilts the wrong way and adds to the yaw** (correct); The camera angle.
4. "Which single part fails most on a tri?" Options: The frame plates; **The tail servo (gears, linkage, power)** (correct); The VTX antenna.

### Defects and inaccuracies

- The tail servo is cosmetic in flight: yaw is the stock torque-style yaw and the tail tilt is only drawn; the reversed
  servo is a scripted pirouette rather than thrust vectoring gone wrong. There is no tail-torque trim.
- The engine's race panel says "5 gates" (`03:445`) but this craft has 6.
- No battery/motor/prop combination ever warns, so the design step teaches nothing about mismatches here.
- Mechanical cost counts 2 props for 3.
- The pirouette never ends (no crash, no recovery), which undersells "nothing else can stop the yaw".

---

## Fig 13. Heavy-lift octocopter (`octo`), file `17-fig13-heavy-lift-octocopter.js`

Identity (`17:277-286`, `17:348`): name "Heavy-lift octocopter", sub "redundancy", noun "octo", hint "build it, lose a
motor in the air, land anyway", palette `cobalt`, mat 2000, `benchH` 720, `benchZ` 385 (the frame stands on its
landing gear), `flyScale` 4, `flyVB` 36000, `camZ` 0.55, `ceiling` 24 m, `arrowZ` 120, `wrongMotor: 4` (M5),
`fpvLevel: true`, `camTilt` -10, `fpvFov` 95, `nMotors` 8. Panels "ArduPilot params", "ArduPilot messages";
calibrate "Calibrate compass + accel". Default mode `loiter`. A flat octo X on 12S with a cinema camera on a 3-axis
gimbal; the lesson is redundancy.

### Design options

**Batteries** (`batts`; default marked *):

| key | name (dropdown text) | cells | mAh | g | $ | colour | label on pack |
|---|---|---|---|---|---|---|---|
| `12s16000` * | 2 x 6S 16000 mAh in series (12S) | 12 | 16000 | 3900 | 580 | `#2b2a28` | 6S 16000 |
| `12s22000` | 2 x 6S 22000 mAh in series (12S) | 12 | 22000 | 5400 | 760 | `#2f5fa8` | 6S 22000 |
| `6s16000` | 1 x 6S 16000 mAh (6S only) | 6 | 16000 | 1950 | 290 | `#d9a520` | 6S 16000 |

**Motors** (`motors`):

| key | name | KV | g | $ | forCells |
|---|---|---|---|---|---|
| `6010-170` * | 6010 170KV | 170 | 285 | 120 | 12 |
| `6010-130` | 6010 130KV (efficient) | 130 | 285 | 120 | 12 |
| `6215-230` | 6215 230KV | 230 | 360 | 160 | 6 |

**Props** (`props`; `pf` = thrust factor, `eff` = efficiency factor):

| key | name | pf | eff | g | $ | r (mm, drawn radius) |
|---|---|---|---|---|---|---|
| `1855` | 18 x 5.5 carbon folding | 0.78 | 0.94 | 52 | 70 | 229 |
| `2055` * | 20 x 5.5 carbon folding | 1 | 1 | 62 | 85 | 254 |
| `2255` | 22 x 5.5 carbon folding | 1.22 | 1.06 | 74 | 100 | 279 |

Fixed parts (`17:20-26`); the 2.3 kg camera is the payload:

| id | name | g | $ | category |
|---|---|---|---|---|
| `FRAME` | 1360 mm octo frame, folding arms | 3200 | 900 | Mechanical |
| `ESC` | 8 x 80 A ESC in the arms | 640 | 480 | Electrical |
| `FC` | Pixhawk 6X flight controller | 60 | 380 | Electrical |
| `GPS` | Dual GPS + compass on a mast | 70 | 120 | Electrical |
| `XT60` | 12S power distribution board + XT90 anti-spark | 180 | 90 | Electrical |
| `RX` | RC receiver + 900 MHz telemetry | 60 | 150 | Electrical |
| `GEAR` | Retractable landing gear | 600 | 350 | Mechanical |
| `GIMBAL` | 3-axis cinema gimbal | 1400 | 1800 | Electrical |
| `CAM` | Cinema camera + lens (your payload) | 2300 | 0 | Electrical |
| `TOP` | Battery tray + standoffs | 300 | 60 | Mechanical |

Fixed parts total: **8810 g**, $3020 electrical + $1310 mechanical (before the motors, battery and props are added).

### Design maths (custom `calc`, `17:48-62`) and warnings (`17:63-70`)

```
N = 8, R = 680 mm
thrust   = 79 * pf * krpm^2                  g per motor
AUW      = fixed + 8*motor.g + 8*prop.g + battery.g
hoverA   = AUW / (9.5 * prop.eff) / V        ~9.5 g/W
hoverMin = (mAh/1000*0.8) / hoverA * 60;   flyMin = hoverMin * 0.78
maxA     = 8 * thrust / (4.2 * prop.eff) / V
over     = KV * cells > 2500
weak     = T:W < 1.7
cost     = Electrical += 8*motor.price + battery.price;  Mechanical += 8 * prop.price
hoverThr = sqrt(AUW / (8*thrust))
prop clash: chord = 2 R sin(pi/N) = 520.4 mm between neighbouring motors; clash if 2*prop.r > chord
```

Default worked: 7.55 krpm (170 KV x 44.4 V, "~7500 rpm"), 4501 g per motor, AUW 15486 g, T:W 2.33, hover 36.7 A,
20.9 min hover, 16.3 min, max 193 A, hover throttle 66 %.

Design tiles for the default build (as rendered): "All-up weight" 15486 g; "Thrust : weight" 2.3 : 1; "Hover throttle" 66%; "Max current" 193 A; "Hover time" 20.9 min; "Freestyle time" 16.3 min. Cost table: Electrical $4560, Mechanical $1990, total $6550. Verdict line: "Parts match: 15.5 kg all-up, enough margin to lose a motor and still land."

Across all 27 combinations T:W ranges 0.30 to 4.97. `over` in 6: `12s16000/6215-230/1855`, `12s16000/6215-230/2055`, `12s16000/6215-230/2255`, `12s22000/6215-230/1855`, `12s22000/6215-230/2055`, `12s22000/6215-230/2255`. `weak` in 16: `12s16000/6010-130/1855`, `12s16000/6010-130/2055`, `12s16000/6010-130/2255`, `12s22000/6010-170/1855`, `12s22000/6010-130/1855`, `12s22000/6010-130/2055`, `12s22000/6010-130/2255`, `6s16000/6010-170/1855`, `6s16000/6010-170/2055`, `6s16000/6010-170/2255`, `6s16000/6010-130/1855`, `6s16000/6010-130/2055`, `6s16000/6010-130/2255`, `6s16000/6215-230/1855`, `6s16000/6215-230/2055`, `6s16000/6215-230/2255`.

Warnings, concatenated (`17:63-70`):
- over: `${KV} KV on ${cells}S spins ${size}" props far too fast: the motors and ESCs overheat and one will desync mid-air.`
- weak: `Thrust to weight ${tw.toFixed(1)}:1: it can't hold ${(AUW/1000).toFixed(1)} kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it.`
- clash (22" props, 558 mm vs 520 mm): `${size}" props are ${2r} mm wide, but neighbouring motors are only ${chord} mm apart: the props would hit each other. Shorter props or longer arms.`
- ok (nothing else): `Parts match: ${(AUW/1000).toFixed(1)} kg all-up, enough margin to lose a motor and still land.`

The clash is only a warning: it sets neither `over` nor `weak`, and the 22" props fly normally.

### Frame and proportions (`17:72-167`)

- Flat octo X: motors at 22.5 deg + 45 deg x k on R = 680 mm, so 1360 mm motor to motor and 520 mm between
  neighbours. Props drawn at the selected prop's radius: 20" (254 mm) leaves 12 mm between tips, 18" leaves 62 mm,
  22" overlaps by 38 mm.
- Spin (`17:28`): k even CW (M1 22.5 deg, M3 112.5, M5 202.5, M7 292.5), k odd CCW. Numbered sequentially round the
  frame (a simplification: ArduPilot's octa-X order is not sequential).
- Centre: two octagonal carbon plates (r 200 at z 0-6 and r 180 at z 60-66); eight 32 mm carbon arms from 170 mm to
  the motor at z 33, each with a palette-coloured fold clamp at 230-272 mm and an 80 mm motor plate.
- Motors: 72 mm bells, 36 mm tall; a dead motor is drawn with a brown bell and a stopped prop.
- ESCs: green 80 x 40 x 17 mm boards at 440-520 mm on each arm; black signal lead in, red power out to the motor.
- Power board 160 x 160 mm with a big polarised capacitor and two yellow XT90-S at the rear.
- Pixhawk 6X 100 x 90 x 26 mm with arrow and green LED; RC and telemetry boards with two antennas up to 230 mm.
- Battery tray 350 x 230 mm on four posts; for 12S two packs side by side (220 x 96 x 74 mm each, label "6S 16000" or
  "6S 22000") wired in series to the two XT90s; for the 6S option one pack.
- GPS mast 184 mm at x = -150 with an 88 mm puck and arrow.
- Retractable gear: two legs per side to a bar at y = +-270, z = -380; in flight they swing up with
  `rf = clamp01((alt - 1.2) / 1.2)` to y = +-530, z = -50 (fully up at 2.4 m), `17:81-89`.
- Gimbal at x = 90 under the front: a yaw motor, a 220 mm cross bar and two arms down to roll/tilt motors; levelled in
  flight (only yaw follows). Cinema camera 180 x 124 x 125 mm with a red side panel, an 88 mm lens 120 mm long, a hood
  ring and a red record LED.
- Exploded view adds an extra 42 mm per layer for this big airframe (`17:76-77`).
- Bench tags: FC, XT60, BATT, GPS, CAM, GEAR, MOTORS, GIMBAL.

### Build steps and mistakes

| # | id | name | short (button / tag text) | after | z (explode layer) | polar options [0 = right, 1 = mistake] |
|---|---|---|---|---|---|---|
| 1 | `FRAME` | Carbon centre plates + 8 folding arms | FRAME |  | 3 |  |
| 2 | `GEAR` | Retractable landing gear | LANDING GEAR | FRAME | 0 |  |
| 3 | `MOTORS` | 8 x 6010 brushless motors | MOTORS | FRAME | 5 |  |
| 4 | `ESC` | 8 x 80 A ESCs, one per arm | ESCS | FRAME | 4 |  |
| 5 | `WIRES` | Motor + signal wiring | WIRING | MOTORS, ESC | 5 |  |
| 6 | `XT60` | 12S power board + XT90 anti-spark | POWER BOARD | ESC | 4 | `cap stripe to minus` / `cap stripe to plus` |
| 7 | `FC` | Pixhawk 6X flight controller | PIXHAWK | XT60 | 6 | `arrow forward` / `arrow backward` |
| 8 | `RX` | RC receiver + 900 MHz telemetry | RC + TELEMETRY | FC | 7 |  |
| 9 | `TOP` | Battery tray + standoffs | BATTERY TRAY | FC, RX | 7 |  |
| 10 | `GPS` | Dual GPS + compass on a mast | GPS MAST | TOP | 9 |  |
| 11 | `BATT` | 2 x 6S packs wired in series | 12S BATTERY | TOP, XT60 | 8 |  |
| 12 | `GIMBAL` | 3-axis gimbal | GIMBAL | FRAME | 2 |  |
| 13 | `CAM` | Cinema camera + lens | CINEMA CAMERA | GIMBAL | 1 |  |
| 14 | `PROPS` | 8 folding carbon propellers | PROPS | MOTORS, TOP | 10 | `CW/CCW alternating (correct)` / `swapped CW/CCW` |

What each part teaches (paraphrased):
- FRAME: two octagonal carbon plates and eight 32 mm tubes on folding hinges, 1360 mm motor to motor; it folds into a
  car; check every arm clamp before every flight.
- GEAR: two legs on servos fold up after take-off so the camera can pan 360 deg, and come down before landing.
- MOTORS: big low-KV outrunners; 170 KV x 44 V turns a 20" prop at about 7500 rpm; low KV + big props + high voltage
  is how heavy lifters get efficient thrust.
- ESC (ESCS): one near each motor in the prop wash; short motor wires, long signal wires, the opposite of a 5".
- WIRES: 12S along each arm to its ESC, three phases to the motor, a signal lead back to MAIN OUT 1-8.
- XT60 (POWER BOARD): splits 44 V to eight ESCs; the XT90-S has a built-in resistor so plugging in 12S does not spark;
  the big capacitor is polarised, stripe to minus.
- FC (PIXHAWK): Pixhawk 6X with triple-redundant IMUs, GPS hold, missions, RTL and the mixer that rebalances the
  others when one motor dies; arrow to the nose.
- RX (RC + TELEMETRY): RC for the pilot plus telemetry for the ground station (battery, GPS, mode, missions).
- TOP (BATTERY TRAY): carries both packs close to the centre, which keeps the octo agile.
- GPS (GPS MAST): raised away from the 12S wiring; a bad compass makes it toilet-bowl in position hold.
- BATT (12S BATTERY): two 6S in series make 44.4 V nominal; the same power at twice the voltage is half the current;
  land at 3.5 V per cell, 42 V for the pair.
- GIMBAL: three brushless motors (pan, roll, tilt) and its own IMU hold the camera level; talks to the Pixhawk over CAN.
- CAM (CINEMA CAMERA): a 2-3 kg camera worth more than the aircraft; balance it on the gimbal before power-up or the
  gimbal motors cook.
- PROPS: neighbours spin opposite ways; carbon props this big are dangerous; fitted last.

Build order **[live]**: FRAME, GEAR, MOTORS, ESC, WIRES, XT60, FC, RX, TOP, GPS, BATT, GIMBAL, CAM, PROPS.
Mistakes: power board "cap stripe to plus" (pop), FC "arrow backward" (flip), PROPS "swapped CW/CCW" (flip), an
over-KV motor (ESC desync), the 6S pack (weak), 22" props (clash warning).

### Bench safety tests **[live]**

Standard buttons with "Calibrate compass + accel" (toast still "Accelerometer calibrated on a flat surface"). Motor
check: "$ motors tab: spin M1, M2, M3, M4, M5, M6, M7, M8 one at a time", then "M5 spun the wrong way: reversed it in
the ESC configurator. They all spin right now" (9.6 s of spinning). Plug log "battery plugged: 50.400000000000006 V".

### Wiring diagram (`17:314-332`)

Blocks (150 x 56 px boxes on a 760 x 340 canvas; `sub` shown for the default design):

| id | x, y | title | sub | colour bar |
|---|---|---|---|---|
| `BATT` | 20, 238 | 2 x 6S, SERIES | 12S 44.4 V | `#e2483d` |
| `XT60` | 190, 238 | PDB + XT90-S | anti-spark, 12S | `#e2483d` |
| `ESC` | 360, 238 | 8 x ESC | 80 A, in the arms | `#e2483d` |
| `MOTORS` | 590, 238 | MOTORS x8 | 6010 170KV | `#f08a2b` |
| `FC` | 360, 70 | PIXHAWK 6X | ArduCopter | `#3e86d9` |
| `GPS` | 140, 30 | GPS + COMPASS | dual, on a mast | `#43a35a` |
| `RX` | 140, 138 | RC + TELEMETRY | ELRS + 900 MHz | `#8c4bd1` |
| `GIMBAL` | 590, 40 | GIMBAL | 3-axis, CAN | `#43a35a` |
| `CAM` | 590, 140 | CINEMA CAM | payload 2.3 kg | `#43a35a` |

Connection labels drawn on the lines: "44V", "3-phase x8", "power module", "MAIN OUT 1-8", "GPS1 + I2C", "RC + TELEM1", "CAN", "video".

Legend: engine default (`#e2483d` power, `#43a35a` data / signal, `#f2c230` video, `#f08a2b` motor phases).

### Flight modes

**`loiter` - "Loiter (GPS hold)"** (default mode). Arm hint: "Hold W to climb, arrows to move, let go and it stops". Controls: altitude-hold sticks.

```
# Loiter: GPS + compass hold position and height
# centre the sticks and it brakes to a stop
LOIT_SPEED     1250   # cm/s max horizontal speed
LOIT_ACC_MAX    500   # gentle: a cinema camera hates jerks
LOIT_BRK_ACCEL  250
FLTMODE1        5     # Loiter on switch position 1
```

**`althold` - "AltHold (no GPS)"**. Arm hint: "Height is held, position is not: it drifts". Controls: altitude-hold sticks.

```
# AltHold: the barometer holds height, nothing holds position
# it drifts with the wind: you correct with the sticks
PILOT_SPEED_UP  250   # cm/s climb
PILOT_SPEED_DN  150
FLTMODE2        2     # AltHold
```

**`motorfail` - "Motor failure test"**. Arm hint: "Climb above 2 m: motor 3 will fail". Controls: altitude-hold sticks.

```
# what happens when one motor dies on an octo:
# the mixer redistributes thrust to the other 7,
# hover throttle goes up ~15%, yaw authority drops
MOT_THST_HOVER  0.35  # learnt hover throttle (rises)
FLTMODE3        5     # Loiter: keep it simple, land
# a QUAD has no spare: losing 1 of 4 = it falls
```

**`rtl` - "RTL mission (auto)"**. Arm hint: "Autopilot: survey leg out, then return to launch". Controls: altitude-hold sticks.

```
# RTL: climb to RTL_ALT, fly home, descend, land, disarm
RTL_ALT        550    # cm (5.5 m here)
RTL_LOIT_TIME  2000   # ms hover above home first
RTL_ALT_FINAL     0   # land
BATT_FS_LOW_ACT   2   # RTL automatically on low battery
FS_THR_ENABLE     1   # RTL if the RC link is lost
```


### Physics: loiter brake, motor failure, RTL (`17:170-214`)

- Brake (Loiter, Motor failure test and the range): body-frame velocities `vf`, `vl`; when the pilot's pitch stick is
  within 0.05 the pitch stick becomes `clamp(-0.4 * vf)`, same for roll. It is a velocity damper: it stops the octo
  but does not return to where you let go. With the stick held it flies plain angle mode (38 deg).
- RTL mission (`D.auto`): `ap = { ph: 'climb', out: pad + (7, 5) }`. climb: full throttle stick until above 5 m, then
  "Survey leg: flying out" (log "AUTO: survey leg"); out and home: throttle `clamp(0.8*(5.5 - z))`, yaw toward the
  target when more than 1.5 m away (`clamp(-1.5*error)`), pitch `clamp(0.22*df - 0.5*vf)`, roll
  `clamp(0.22*dl - 0.5*vl)`; within 0.8 m and below 1 m/s, out turns into home ("RTL: returning to launch", log "Mode
  RTL: heading home", `click`) and home into land ("Over home: landing", log "RTL: descending"); land: throttle -0.8
  above 1.5 m, -0.35 below, holding position; on the ground after 2 s: "Landed at home and disarmed", log "RTL
  complete: disarmed", `ding`.
- Motor failure (mode `motorfail`): once armed, above 2 m and after 2.5 s, motor 3 (`dead = 2`) fails: "Motor 3
  failed! The other seven carry it", logs "ESC 3: no RPM telemetry, motor lost" and "Mixer: rebalancing 7 motors, yaw
  authority reduced", `pop`.
- Over design (any mode): `heat += dt * thrEff * 1.6`; above 9, ESC 6 (`dead = 5`) fails: "ESC 6 overheated and
  desynced: 230KV on 12S is too fast" (fixed text), log "ESC 6 overtemp: desync", `pop`.
- With a dead motor each step uses `n = 7` (seven motors' thrust), adds 0.05 to the roll stick (asymmetric thrust) and
  then turns the octo at 16 deg/s (the missing motor's unbalanced torque). Without one it passes `over: false` to the
  engine so the stock desync never runs.
- Flight stats: "Motors" "8/8" or "7/8 running".

Verified **[live]** (default build):
- Motor failure: climbed on W for 2 s; "Motor 3 failed! The other seven carry it" at 2.5 s and 4 m; throttle 0.66 to
  0.70 (exactly `sqrt(8/7)` x 0.656), current 38.5 to 43.8 A, a steady 16 deg/s yaw, height held at 4.1 m, about 1 m
  of drift in 22 s. (Practice-task check: hover throttle with 7 motors = sqrt(AUW / (7 x 4501 g)) = 0.70.)
- RTL mission: "Survey leg: flying out" 2.75 s, "RTL: returning to launch" 8.1 s, "Over home: landing" 13.1 s,
  "Landed at home and disarmed" 17.4 s, 181 mAh.
- Loiter: 4 s of full forward reached 12.2 m/s (38 deg), release stopped it in about 2 s and 10 m, then it held.
  Wind: Loiter stayed within 0.13 m for 25 s; AltHold drifted 3.2 m.
- FC reversed: "Flipped on take-off: the flight controller is mounted the wrong way round"; the crash registers at
  4.7 s (with W held from the start), when the flipping octo comes back down.
- **Defect**, 6215 230KV on 12S, hovering in Loiter: at about 23 s BOTH failures fire in the same step: the craft's
  ESC 6 failure and the engine's stock desync (once a motor is dead, the craft's copy of `calc` keeps `over: true`).
  Two pops; the engine's "Desync! 230KV on 12S overheats: the ESC lost a motor" overwrites the craft's message; log
  "ESC 6 overtemp: desync" then "ESC desync: motor 3 overtemp"; the engine's desync then bleeds thrust and the octo
  sinks to the ground in about 14 s while yawing, instead of flying on with seven motors.

### Range: "Desert film set" (`17:216-275`)

Brief "Tracking shot down the road, orbit the hero car, rise over the mesa for the reveal, land at base"; field
120 m, pad (22, 18), ground `#ead8b4`, altitude-hold sticks, camTilt -10. Road centreline `ROAD` = (14, 30),
(30, 34), (46, 44), (56, 58), (62, 74), (74, 90), (94, 102), (112, 108), built as 6 m tarmac segments with a 0.25 m
yellow centre line. Base camp: a 16 x 14 m "BASE" apron, three tents, a camera truck with a blue cab, three director's
chairs, a monitor cart and three light stands (4.2 m with yellow heads). The red hero car (4.6 x 1.9 m body, cabin,
four wheels) on the road at (59.5, 67), nose along the road (`CAR_YAW` = 69.4 deg). Canyon: a 22 x 16 x 10 m mesa at
(92, 42) with a cap, a 16 m seven-sided butte at (78, 12), a 12 m cone mesa at (102, 78), a 44 x 8 x 13 m cliff wall
at (28, 96), five rocks and eight saguaro cacti.

| # | label | x | y | z | r | type |
|---|---|---|---|---|---|---|
| 1 | TRACK 1 | 38 | 39 | 5 | 2.6 | ring, crossed heading 32.01 deg |
| 2 | TRACK 2 | 46 | 44 | 5 | 2.6 | ring, crossed heading 54.46 deg |
| 3 | TRACK 3 | 52 | 52.4 | 5 | 2.6 | ring, crossed heading 54.46 deg |
| 4 | TRACK 4 | 57.2 | 61.2 | 5 | 2.6 | ring, crossed heading 69.44 deg |
| 5 | ORBIT 1 | 51.07 | 70.16 | 5 | 2.4 | sphere (touch) |
| 6 | ORBIT 2 | 56.34 | 58.57 | 5 | 2.4 | sphere (touch) |
| 7 | ORBIT 3 | 67.93 | 63.84 | 5 | 2.4 | sphere (touch) |
| 8 | ORBIT 4 | 62.66 | 75.43 | 5 | 2.4 | sphere (touch) |
| 9 | REVEAL | 92 | 42 | 17 | 3.5 | sphere (touch) |
| 10 | LAND AT BASE | 22 | 18 | 1 | 2.4 | sphere (touch) |

Tracking rings sit along the road at 5 m (computed with `along()` and `hd()`, `17:224-260`); the four orbit spheres
are 9 m from the car at 90 deg steps starting perpendicular to its heading. Range code (a commented QGC mission):

```
# the shot list as an ArduPilot mission (QGC WPL 110)
# 0  1 0 16  0 0 0 0  <home>        0     1   # base camp
# 1  0 3 22  0 0 0 0  0 0  5        1   # take off to 5 m
# 2  0 3 16  0 0 0 0  <road 1..4>   5   1   # tracking shot
# 6  0 3 34  2 1 9 0  <hero car>    5   1   # LOITER_TURNS r 9 m
# 7  0 3 16  0 0 0 0  <mesa>       17   1   # rise + reveal
# 8  0 3 20  0 0 0 0  0 0 0         1   # RTL
MNT1_TYPE   4   # gimbal: SToRM32 over MAVLink, stays level
```

### Controls and FPV

Controls panel: `W S` "climb / descend (height is held)" / `A D` "yaw" / `arrows` "move (loiter: let go to stop)" / `Space` "arm / disarm" / `R` "reset to the pad"; then the line "or drag the two sticks on the figure". Source: the craft's own `controls`. FPV gimbal-level, 10 deg down, 95 deg field of view.

### Lesson text

"Meet the octo" (summary): a heavy lifter carries a cinema camera worth more than itself, so the design goal is not
falling: eight motors on a flat octo X, and if one dies the controller rebalances the other seven, while a quad that
loses one of four falls. Flat rather than X8 coaxial: coax is compact and folds smaller, but each lower prop works in
the upper one's wash and loses about 15-20 % efficiency; flat costs width and buys flight time. 12S carries the same
3 kW at 44 V instead of 22 V, half the current; the gimbal levels the camera; the legs retract so the camera can pan
360 deg.

Build code panel ("ArduPilot params · build"):

```
# ArduCopter, Mission Planner > Full Parameter List
FRAME_CLASS      3      # octa
FRAME_TYPE       1      # X
MOT_THST_EXPO    0.70   # big props: non-linear thrust curve
MOT_SPIN_ARM     0.08
MOT_SPIN_MIN     0.12
BATT_MONITOR     4      # voltage + current from the power module
BATT_CAPACITY    16000
BATT_LOW_VOLT    42.0   # 3.5 V x 12 cells
BATT_FS_LOW_ACT  2      # RTL on low battery
SERVO9_FUNCTION  29     # landing gear on output 9
LGR_DEPLOY_ALT   300    # cm: legs down below 3 m
```

Practice task (summary): run the motor failure test, note the throttle before and after motor 3 dies, then work out
the new hover throttle by hand (thrust needed shared by 7 motors instead of 8); then try to design an octo that cannot
survive it by picking the 6S pack and watching the margin vanish.

### Quiz

1. "Why can an octocopter survive a motor failure when a quad cannot?" Options: Octo motors never fail; **The other seven can still balance thrust and torque; a quad loses control of an axis** (correct); The gimbal catches it.
2. "Why fly a 15 kg lifter on 12S instead of 6S?" Options: 12S packs are lighter; **Same power at double the voltage means half the current: cooler wires and ESCs** (correct); Props spin backwards on 6S.
3. "Why do the landing legs fold up after take-off?" Options: Less drag; **So the camera can pan 360 degrees without the legs in shot** (correct); To protect the props.
4. "X8 coaxial vs flat octo: what does the coax lose?" Options: Redundancy; **~15-20% efficiency: the lower props run in the upper props' wash** (correct); GPS accuracy.

### Defects and inaccuracies

- The double desync with the over design (above): message overwritten, octo sinks.
- The ESC 6 failure text hard-codes "230KV on 12S" whatever the design is.
- The weak warning always says "these motors need 12S to make it", even when the pack already is 12S (130 KV motors).
- `LGR_DEPLOY_ALT` is in metres in ArduPilot, so `300 # cm` would mean 300 m; and the sim's legs retract between
  1.2 m and 2.4 m regardless.
- In the mission comment, command 34 is `MAV_CMD_DO_ORBIT`, not LOITER_TURNS (which is 18; its params 2, 1, 9, 0 do
  match turns, heading, radius, xtrack).
- `MNT1_TYPE 4` is SToRM32 over MAVLink, while the part text and wiring say the gimbal talks over CAN.
- Motors numbered sequentially round the frame instead of ArduPilot's octa-X order.
- The 22" prop clash is a warning only; overlapping props fly fine.
- Loiter is a velocity damper, not a position hold (it does hold against the scripted wind).

---

## 3. Cross-cutting notes for the rebuild

### Patterns all nine share (keep them)

- Page anatomy per craft (`03:579-599`): "Wiring · click a block" (clicking a block or a part selects it), "Design it"
  (Battery / Motors / Props dropdowns, six tiles, warnings, cost table), "Meet the <noun>" (overview), "Selected part"
  ("nothing selected" / "Click any part, a wiring block, or a name below."), "Parts in the box" (chips), "Fly it ·
  controls", "<cliName> · <mode title or build>" (build code on the bench, the mode's code in flight), "<logName>"
  (terminal, last 10 lines, first line `-- <log> --`), "Check yourself" (quiz chips: correct turns green with a
  `chime`, wrong is struck through with a `buzz`), "Practice task".
- Every autopilot is the same recipe: a world-frame velocity target from the position error, an acceleration from the
  velocity error, stick = `atan(a/g) / 38 deg`, then the stock multirotor model. The gains differ per figure (Fig 06:
  0.8 / 1.6 with a 4.5 m/s^2 cap; Fig 07: 0.7 / 1.4 with sticks capped at 0.5; Fig 08: 0.9 / 1.6 with a 25 deg cap;
  Fig 10 hover: 0.8 / 1.4; Fig 11: 1.6 / 3.0; Fig 13: a PD on position, 0.22 / 0.5). A shared helper with per-craft
  gains would remove five near-copies.
- Missions are phase machines that log one line per phase change and toast the important ones; the stats panel shows
  the current phase. Mode changes in the air keep the same flight, and an auto mode re-initialises on the change.
- The range scenery is present in every mode; the range mode only adds checkpoints, a timer and "best".
- Each craft has 3 batteries x 3 motors x 3 props (the Crazyflie has 2 props): 234 combinations, all in the matrix file. An independent Python re-implementation
  of the formulas written in this document reproduces all 234 live rows exactly (thrust, AUW, T:W, currents, times,
  flags and costs; wing speeds and VTOL cruise current included).

### Original defects found (fix, do not copy)

1. Fig 07: Loiter to RTL in the air is a dead mode that also ignores the pilot (hover until reset).
2. Fig 13: the over-KV design fires the craft's ESC failure and the engine's desync in the same step; the engine's
   message wins and the octo sinks instead of flying on seven motors.
3. Fig 08: "the mission resumes from here" / "resume point saved" is not implemented; re-arming just disarms; no
   refill exists; the pump is a constant 0.42 L/s, so the taught dose-per-area control is not simulated.
4. Fig 10: plane-regime current (about 1.2 A) disagrees with the calc's cruise current (5 A); the over warning
   blames the motor ("2810 1000KV is a racing motor") when 6S is the problem; thrust is silently capped at 2600 g.
5. Fig 09: a reversed FC shows the elevon message; the RTH orbit is about twice the configured radius; the stats strip
   flight time disagrees with the tile; the over-current design has no effect in flight.
6. Fig 11: the weak warning always blames the battery; ESC wording on a brushed, ESC-less craft.
7. Fig 12: the tail servo is cosmetic in flight; no design combination ever warns; the race code says 5 gates for 6.
8. All ArduPilot crafts: the calibrate toast ignores compass / airspeed; failsafes are described but never fire;
   GPS is a constant "3D fix, 14 sats" on Fig 06.
9. Engine-level, visible here: the plug log prints unrounded volts ("25.200000000000003 V"); the stock desync always
   logs "motor 3"; the motor check always finds the same motor reversed; the drawn prop size ignores the chosen prop
   except on Figs 12 and 13; no field boundary for the wing and VTOL.
10. Underpowered builds (T:W below 1) arm and sit on the pad with no feedback (seen on Fig 07).
11. Inconsistent thresholds between warning text and the `weak` limit on Figs 05 (12 vs 9), 06 (2 vs 1.8), 08 (1.8 vs
    1.6) and 09 (0.5-0.8 vs 0.45).
12. Dead config: Fig 05 `trees`; Fig 07 `trees`, `maxKvCells`, `minTW`; Fig 10 `pad`, `trees`; and the unused roster
    placeholder "INAV, flaps" for a flapless wing.

### Accuracy notes on the firmware snippets (verify before reusing)

Correct as written (checked against my knowledge of the firmware): Betaflight `motor_pwm_protocol = DSHOT600`,
`dshot_bidir`, `align_board_yaw`, ACTUAL rates (`roll_rc_rate = 7` = 70 deg/s centre, `roll_srate = 67` = 670 deg/s),
the Raceband frequencies 5658-5917 MHz, `led 0 0,0::C:6` (colour 6 = green), `mixer TRI`, `smix reverse 5 2 r`,
`tri_unarmed_servo`; ArduPilot `FLTMODE` numbers (5 Loiter, 2 AltHold, 6 RTL), `LOIT_*`, `RTL_ALT` in cm,
`FS_THR_ENABLE 1`, `BATT_FS_LOW_ACT 2`, `FRAME_CLASS` 1 / 2 / 3 (quad / hexa / octa) with `FRAME_TYPE 1` (X),
`SERVOn_FUNCTION` 33-36 (motors), 88 (winch), 22 (sprayer pump), 29 (landing gear), 75 / 76 (front tilt motors),
`MOT_PWM_TYPE 6` (DShot600), `SERIAL2_PROTOCOL 2` / `SERIAL2_BAUD 921`, `Q_FRAME_CLASS 7` (tri), `Q_TILT_*`,
`Q_ASSIST_SPEED`, `ARSPD_TYPE 1` (MS4525), `EK3_SRC1_POSXY 3`, `EK3_SRC1_YAW 2`, `MNT1_TYPE 4` (SToRM32 MAVLink),
`SPRAY_ENABLE` / `SPRAY_PUMP_RATE` / `SPRAY_SPEED_MIN`, `RNGFND1_ORIENT 25` (down); QGC WPL command ids 16, 20, 22;
INAV `platform_type = AIRPLANE`, `mmix`, `smix` with a trailing condition, `servo ... -100`, `nav_rth_*`,
`nav_fw_loiter_radius`, `failsafe_procedure = RTH`; cflib `MotionCommander`, `SyncCrazyflie`, `Swarm`,
`CachedCfFactory`, `high_level_commander.takeoff / go_to / start_trajectory / land`; MAVSDK `connect(system_address=
"serial:///dev/ttyAMA0:921600")`, `set_takeoff_altitude`, `goto_location`, `return_to_launch`.

Wrong or doubtful (details in each figure's defects list):
- Betaflight `osd_timer_1 = ON` (not a valid value).
- ArduPilot `RNGFND1_TYPE 32` (MSP) and `10` (MAVLink) used for a radar; `TERRAIN_FOLLOW` (Plane only);
  `GPS_TYPE 17` called "RTK rover" (it is the moving-baseline base); `FS_BATT_ENABLE` (renamed `BATT_FS_LOW_ACT`);
  `LGR_DEPLOY_ALT 300 # cm` (the parameter is in metres); command 34 labelled LOITER_TURNS (18 is LOITER_TURNS,
  34 is DO_ORBIT); `ARSPD_FBW_MIN` / `TRIM_ARSPD_CM` (renamed in ArduPlane 4.5).
- INAV `osd_stats_page` (could not confirm it exists); `nav_rth_altitude` given two different values.
- cflib swarm snippet missing `import time` and `SLOTS`; `python -m cfclient` (the client is `cfclient`).

### Hidden numbers a spec summary would miss

Hand launch 10.5 m/s at 1.6 m and 14 deg nose up; belly-landing envelope (< 13.5 m/s, bank < 25 deg, pitch -30 to
25 deg, sink < 3.5 m/s); wing angle-mode trim 3 deg nose up and limits 45 deg bank / 28 deg pitch; manual rates
220 / 140 deg/s; RTH 15 m and R = 22 m; far warning at 90 m; VTOL 3 s tilt each way, wantPlane above 5 m (auto) or
4 m (range), QRTL plane only beyond 24 m, back to hover below 6 m/s, Q_ASSIST below 9 m/s; delivery winch 0.9 m/s
down, 1.2 m/s up, release 0.6 s after touchdown, cruise 12 m, drop hover 3.5 m; spray 2.5 m height, 4 m/s spray legs
/ 6 m/s transits, 1.2 m lane tolerance, RTL at 5 m; Fig 06 mission 5 m, RTL 12 m, loiter 5 m/s, brake target 0.4 s
ahead; swarm shapes 6 s each with a 1.5 s blend after a 2.5 s take-off; figure-8 10 s per loop, 1.2 x 0.7 m;
tricopter servo +-40 deg (30 deg per unit yaw stick), pirouette 60 to 1100 deg/s at 700 deg/s^2; octo motor 3 fails
above 2 m after 2.5 s, 16 deg/s yaw and +0.05 roll with a dead motor, legs retract between 1.2 and 2.4 m.

### Visual and audio details per craft (for the Colorfigures build)

- Moving parts: Fig 05 green LED strips; Fig 06 gimbal that stays level, mission route with numbered rings;
  Fig 07 winch line, hanging parcel, dropped parcel, drop-zone target; Fig 08 tank sight window, sprayed strips, mist
  cones; Fig 09 elevons on hinges, pusher prop, clouds; Fig 10 tilting nacelles, stopped rear prop in cruise, turbine
  blades; Fig 11 four LEDs, three wingmates, dashed figure-8; Fig 12 tail motor tilting on its servo with a "TAIL TILT"
  readout; Fig 13 retracting legs, levelled gimbal and camera with a record LED, brown dead motor.
- Sounds triggered by these figures: `chime` (waypoint or row done), `ding` (mission complete, landed, good test),
  `snap` (parcel released), `pop` (motor or ESC failure, crash, vented cap), `error` (stall, tank empty, bad CG,
  reversed elevons), `buzz` (reversed tilt or tail servo, pirouette), `click` (T transition, RTL leg), `whoosh` (hand
  launch, mode change), `place` (belly landing), `unplug` (landed and disarmed, Fig 06), plus the engine's motor hum.

## 4. Open questions for the rebuild owner

- Keep the original's snippet mistakes for fidelity, or correct them? (Recommended: correct them, keep the comment
  style.)
- Should the rebuild implement what the lessons teach but the original never simulates: pump rate tied to ground
  speed, radio-loss and low-battery failsafes, hex motor-out, real tail-servo thrust vectoring, GPS/compass faults,
  Flow-deck texture limits, spray drift in wind?
- VTOL battery: follow the calc (5 A cruise) or keep the physics (about 1.2 A)? They should agree.
- Fig 07: deliver to all three drop zones in the auto mission, or keep DZ 1 only?
- Wing RTH: tighten the orbit to the configured 22 m (more bank) or change the configured radius?
- The live site now serves a Vercel bot checkpoint to automated browsers after many loads; any comparison tests
  against the original should run against a downloaded copy.

## 5. Verification artefacts

- Live-run data: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/dlb-live/`
  (`combos.json` all design combinations, `flights.json` mission runs, `bench.json` bench flows, `faults.json`
  injected faults, `world.json` field and checkpoint geometry, `defs.json` verbatim definitions, `live.html` the
  downloaded page).
- Scripts: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/dlb-scripts/`
  (`harness.js` hooks + stepper, `flights.py`, `bench.py`, `faults.py`, `combos.py`, `world.py`, `extract.py`, `gen.py`
  which renders the verbatim blocks of this file).
- Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/drone-lab-b/`
  (`<key>-bench.png`, `<key>-exploded.png`, `<key>-wiring.png`, `<key>-fly-<mode>.png`, `racer-fpv-range.png`,
  `gpscam-fpv-range.png`).
