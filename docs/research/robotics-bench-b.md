# Robotics Bench (original), part B: Fig. 07 to Fig. 13

Research input for the SimLab rebuild (Robotics Lab module). It covers the last seven figures of the original
Robotics Bench (https://robotics-engineer.vercel.app): the A4988 stepper driver, the PCA9685 servo board, the MPU-6050 IMU,
the HC-SR04 rangefinder, the QTR-8RC line sensor, the LM2596 buck module and the Raspberry Pi 5.

Everything here was read from the downloaded source and then checked on the live site with Playwright on
2026-10-24: every mode was run, every stat sampled over time, every serial line captured, every quiz answer clicked,
and each figure was rebuilt from a bare PCB with parts deliberately left out or reversed. Where the live site and the
source agree, the source line is given. Where something only shows up live (rounding, timing), that is said.

Conventions in this document:

- UI text (button labels, chip labels, stat labels, toasts, serial lines, quiz text) is quoted verbatim, in source case.
  The page CSS uppercases toasts, stat labels and section headings (`text-transform:uppercase`), so live they read
  e.g. "POWERED: VMOT FROM THE LIPO ...".
- Explanatory prose (overviews, part descriptions, practice tasks) is summarised, not copied.
- Code panels are quoted verbatim, because the rebuild has to keep the sketch and the simulation consistent.
- `k` is the serial tick: the whole number of seconds since the current mode started running.

## Source legend

All files are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/orig/robotics/`.

| alias | file | what |
|---|---|---|
| `C` | `00-core.js` | Colorfigures core: projection, shapes, page shell, pickers, toast, labels toggle |
| `E` | `01-.js` | Robotics Bench engine: `defineBoard`, build/power/upload/fault logic, peripherals, audio, lesson panel |
| `F07` | `08-fig07-a4988-stepper-driver.js` | Fig. 07 A4988 |
| `F08` | `09-fig08-pca9685-16-channel-pwm-servo-driver-over.js` | Fig. 08 PCA9685 |
| `F09` | `10-fig09-mpu-6050-imu-on-a-gy-521-breakout.js` | Fig. 09 MPU-6050 |
| `F10` | `11-fig10-hc-sr04-ultrasonic-rangefinder.js` | Fig. 10 HC-SR04 |
| `F11` | `12-fig11-qtr-8rc-reflectance-array.js` | Fig. 11 QTR-8RC |
| `F12` | `13-fig12-lm2596-buck-converter-module-with-a-3-di.js` | Fig. 12 LM2596 |
| `F13` | `14-fig13-raspberry-pi-5.js` | Fig. 13 Raspberry Pi 5 |

Playwright driver scripts and JSON transcripts: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/rbb-scripts/`
(`out/<key>-<scenario>.json`). Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/robotics-bench-b/`.

---

## 1. Shared behaviour these figures rely on

The engine is documented in full by another agent. This is only what you need to read the per-figure sections.

### 1.1 Page and controls

- Header: `Fig. NN — <name>` on the left, the figure's `hint` on the right (C:275).
- Left column, under the caption "Bench" (E:1056), seven buttons in this order (E:1057-1070):
  "Strip to bare PCB", "Pick & place SMD", "Place a part ▾", "Solder joints", `<powerLabel>`, `<modesLabel> ▾`, "Exploded view".
  `powerLabel` defaults to "Plug / unplug USB", `modesLabel` to "Upload sketch"; several figures rename them (see each figure).
- Top-right stats (E:1050-1055): always "Parts" `n/N` and "Status"; "To solder" (count) only while some placed part is
  unsoldered; the figure's own stats are appended **only while the board is running**.
- Status values, first match wins (E:1052): `FAULT` (hot/pop fault), `CHECK <id>` (dark fault), `UPLOADING`, `RUNNING`,
  `POWERED` (power on but nothing runs), `BARE PCB` (0 parts), `ASSEMBLING` (some parts missing), `NEEDS SOLDER`, `READY`.
- Under the figure, a controls row (C:284-288, E:960-966): "Hand-drawn wobble" slider (0..7; these boards start at 0,
  E:1081-1083), "Colour" (5 swatches: mustard, tomato, mint, cobalt, blush; C:11-17), "Labels" "On"/"Off" toggle
  (shown when the figure draws any label pill), "Sound": "Lofi" (synth lofi loop) and "Effects" (sfx on/off, remembered in
  `localStorage['rb-audio']`).
- Lesson panel (E:971-983), two columns: left = "Meet the board" (overview), "Selected part" (card), "Parts on this board"
  (designator buttons, faded when not on the board); right = `<codeLabel> · <mode title>` (code panel, default label
  "Try it yourself"), `<termLabel>` (terminal, default "Serial monitor"), "Check yourself" (quiz), "Practice task".
- No rotate, no see-through toggle and no zoom in this original: the view is fixed (front-left-top iso, `VIEW = 0`;
  the core's `TURNS` list is never wired to a control, C:31-33, C:301). The only ways to look "inside" are
  "Exploded view" (parts lifted by build group), the label pills and the selected-part card. A rebuild with drag-to-turn
  and see-through is strictly better here.
- Selected-part card: `<ID> · on the board` or `<ID> · in the parts bin`, then the part name and its description;
  with nothing selected: "nothing selected" / "Click any part on the board, or a designator below." (E:1017-1019).
  Clicking a part in the drawing, or its designator button, toggles the selection; the selected part gets a pill drawn
  in the "working" colour (E:751-752).

### 1.2 Build, power, run

- On mount every figure is fully assembled and soldered (E:1044) and the power button is pressed automatically 350 ms
  later (E:1085-1087), so each figure opens already running its default mode. `?usb=0` or `?bare=1` stop that.
- Part groups (E:19): `g:0` SMD (placed all at once by "Pick & place SMD", then a 1.3 s reflow), `g:1` low through-hole,
  `g:2` tall through-hole, `g:3` goes on last (heatsink, cooler). "Place a part ▾" lists only g1..g3 parts. Chip label is
  `<ID> <short label in lower case>`; polar parts appear twice as `<ID> stripe front` / `<ID> stripe back` (E:1060-1065).
- Block rules (E:839-846), shown as the reason when a faded chip is clicked:
  - g1..g3 before SMD is soldered: "SMD parts first: run pick and place + reflow. The oven would melt plastic parts"
  - g2 before **every** g1 part is placed: "Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder"
  - g3 before every g1 and g2 part is soldered: "Solder everything first: this part goes on last"
  - Consequence: leaving out any g1 part also makes every g2 and g3 part unplaceable; leaving out a g2 part blocks g3.
  - SMD parts are all-or-nothing: there is no UI to leave a single SMD part out (matters for "latent" failures below).
- Other bench messages: "Reflow oven: 245 C melts the solder paste under every pad" (E:773), "Every joint soldered: shiny, concave, no blobs"
  (E:781), "Every through-hole joint is already soldered", "Nothing to solder yet: place a part first" (E:862),
  "The SMD parts are already on the board" (E:853), "The board is already bare" (E:891), "Nothing to take apart: the board is bare"
  (E:896), "Unplugged before taking it apart" (E:897), "Close the exploded view first", "Unplug the power first: never work on a live board" (E:799),
  "Desoldered C1, flipped it, soldered it again" (re-pick a polar part the other way round, E:833), `<chip label> — already set` (C:354).
- Power (E:812-823): if the power part is a board part and not soldered: `<ID> isn't soldered: the power pins don't touch the copper`;
  if it is not even placed: `There's nothing to plug into: place <ID> first` (E:871). Any `needs` part unsoldered:
  `No power: <ID> (<name>) is missing or unsoldered`. A reversed polar part: fault (see below). Any `run` part missing:
  `Powered, but <ID> (<name>) is missing: nothing runs` (or `is not soldered`); status `POWERED`. Otherwise the figure's
  `powerMsg` is shown as a toast and the current mode starts. Terminal gets `-- power on --` / `-- power off --`.
- Modes (E:874-886): an `instant` mode switches immediately (terminal `-- <title> --`, sound "click"). A non-instant mode
  is an upload: terminal `Compiling <title> ...`, `Sketch uses <bytes> bytes of program storage`, status `UPLOADING` for
  2.2 s, then `avrdude: flash verified`, `Done uploading.` and the mode runs. Upload while powered but not running:
  `avrdude: programmer is not responding` + toast "No working chip: the upload times out".
- Picking a mode while unpowered: instant modes become the current mode and toast "Set. Now power the board to see it";
  upload modes only set the *pending* mode and toast "Power the board first". The code panel always shows the pending
  mode (E:1021). **Quirk (verified live on Fig. 11):** after power-up the *old* mode runs while the code panel shows the
  pending one.
- Serial: a 90 ms timer calls the mode's `serial(k, st)` once per whole second of run time (E:792-797); only the last 9
  lines are kept (E:798). Stripping the board does not clear the terminal.
- Faults (E:801-811): a reversed electrolytic = `pop` ("Pop! <ID> is in backwards: reverse voltage vents an electrolytic. Unplug and flip it",
  vented top drawn, sounds "pop" then "sizzle"); a mode `fault()` of kind `hot` (part tinted red where the kind supports it,
  smoke puffs, sounds "buzz" then "sizzle"). A non-dark fault stops the run; status `FAULT`; picking any mode gives
  "Fix the fault first: unplug, then correct <ID>". Unplugging clears the fault.
- Exploded view lifts parts by group: 6 / 12 / 18 / 24 mm for g0..g3 (E:603-604) and unplugs first.
- Quiz (E:989-1000): wrong pick = chip struck through, sound "buzz", toast "Not quite: think about what the hardware does";
  right pick = green chip, sound "chime". There is **no explanation text** in the original. All three right shows
  "Board mastered." plus a link "Fig. NN is next." (none on Fig. 13), stores `localStorage['rb-<key>']='1'` and the nav
  entry becomes "Fig. NN · done".
- Sounds are all synthesised by the engine (E:544-567); no figure in this slice adds its own. Relevant ones: whoosh
  (placing, plug moving), place / snap (part lands; snap for g3), machine (each SMD part), oven (reflow), solder (each joint),
  plug, power (3-note arpeggio on good power), unplug, upload (blips), ding (upload done, solder done, reflow done),
  click (instant mode), tick (any bench button), error (blocked action), buzz / pop / sizzle (faults), chime (quiz right).
- Label pills (`tags`) point at parts; a pill fills with the palette accent while its part is "working" (C:173-180).
- Testing URL params (E:1072-1078, C:375-385): `?bare=1`, `?ex=1`, `?flip=ID,ID` (reverse polar parts), `?sel=ID`,
  `?mode=<key>`, `?usb=0`, `?pal=<palette>`, `?labels=0`, `?press=Label@ms,Label>Choice@ms`. Example: `?flip=C1#pca9685`.

### 1.3 Navigation for this slice

Sidebar groups (E:944, E:952-955): Fig. 07 and Fig. 08 sit under "Month 2 · motors + drivers" (`month:3`), Fig. 09 to 11
under "Month 2 · sensors" (`month:4`), Fig. 12 and 13 under "Power + the ROS 2 brain" (`month:5`). Each entry shows
`Fig. NN` (plus " · done"), the name, and the `sub` line. Footer: "A training bench for the six-month robotics roadmap:
electronics, microcontrollers, drivers, sensors, power." Hash routes: `#a4988`, `#pca9685`, `#mpu6050`, `#hcsr04`,
`#qtr8`, `#lm2596`, `#rpi5`.

### 1.4 Coordinates used in part tables

Board authors place parts in "uv" millimetres on the real board's top view (E:9-12): `u` = distance from the board's
left edge, `v` = distance from its front edge. Part rects are `[u0, v0, u1, v1]`. The Pi 5 uses real top-view X/Y instead
(see Fig. 13). The mat is the PCB plus margins `back/front/right/left`.

---

## 2. Fig. 07 — A4988 stepper driver (`#a4988`, F07)

### 2.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 07" / "A4988 stepper driver" / "microstepping" | F07:79 |
| hint | "set the current limit, then step the motor" | F07:79 |
| PCB | 15.2 × 20.3 mm, corner r 1, default palette mint | F07:80 |
| mat margins | back 20, front 41, right 52, left 26 → mat 76.2 × 98.3 mm; frame headroom 48 | F07:80 |
| power button | "Plug / unplug Nano" (power comes in through the Nano's USB plug, micro style) | F07:105 |
| modes button | "Upload sketch ▾" (default label) | E:1068 |
| code / terminal headings | "Try it yourself · <mode>" / "Serial monitor" | E:979-980 |
| default mode | `full` | F07:108 |
| power OK toast | "Powered: VMOT from the LiPo, logic from the Nano. The motor holds its position" | F07:106 |

### 2.2 Real-world model

A Pololu-style A4988 carrier, 0.6 × 0.8 in (15.2 × 20.3 mm), 2 × 8 header pins soldered from below for breadboard use:
only pin stubs and solder fillets show on top (`KINDS.stubs`, F07:6-8). A small aluminium stick-on heatsink with 5 fins
sits on the chip (`KINDS.sinkTop`, F07:10-13). Silkscreen: "A4988", "VMOT", "STEP DIR" (F07:81).

| ID | name (verbatim) | kind | group | uv rect | pill | what it teaches (summary) | ref |
|---|---|---|---|---|---|---|---|
| U1 | A4988 driver IC | qfp, label "A4988" | g0 | [9, 5.1, 14, 10.1] | "A4988" | two H-bridges plus a current chopper; each STEP pulse advances the coil currents one (micro)step, DIR sets direction, current never exceeds the pot's limit | F07:86-87 |
| RV1 | Current-limit trimpot | pot | g0 | [2, 5.6, 6, 9.6] | "CURRENT POT" | sets Vref, and I = Vref / (8 × Rs); set it before the motor ever runs, meter on the wiper | F07:88-90 |
| RS1 | Sense resistor 0.068 ohm | chip | g0 | [16, 5.2, 19.2, 6.8] | "RS" | coil current is read as the voltage across it; 0.068 Ω is where the 8 × Rs comes from | F07:91-92 |
| RS2 | Sense resistor 0.068 ohm | chip | g0 | [16, 8.4, 19.2, 10] | "RS" | the second sense resistor, one per coil | F07:93-94 |
| CP | Decoupling + charge-pump caps | passives (3 caps + 1 resistor) | g0 | [6, 2.6, 17, 12.4] | "CAPS" | local decoupling and the charge-pump caps for the high-side switches; you still need a 100 µF electrolytic across VMOT off-board | F07:95-97 |
| H1 | Power + motor pins | stubs (8 pins) | g1 | [0, 0, 20.32, 2.54] | "MOTOR + VMOT" | pin order VMOT, GND, 2B, 2A, 1A, 1B, VDD, GND; VMOT 8-35 V, VDD 3-5.5 V logic from the Nano | F07:98-99 |
| H2 | Control pins | stubs (8 pins) | g1 | [0, 12.66, 20.32, 15.2] | "STEP / DIR" | pin order ENABLE, MS1, MS2, MS3, RESET, SLEEP, STEP, DIR; MS1-MS3 pick full, 1/2, 1/4, 1/8 or 1/16; tie RESET to SLEEP or it never wakes | F07:100-101 |
| HS1 | Stick-on heatsink | sinkTop (5 fins, 5 mm) | g3 | [8, 4.1, 15, 11.1], z +0.9 | "HEATSINK" | above about 1 A per coil the A4988 overheats and shuts down; fit the heatsink last, after soldering | F07:102-103 |

Note that the current-limit trimpot RV1 is an SMD part (g0): it arrives with pick & place.

### 2.3 On the mat

- **NEMA17 stepper** (42 × 42 × 40 mm: metal end caps 8 mm, black stator, 12 mm shaft with a red 16 mm pointer flag) placed
  *behind* the PCB at mat (4, 3), drawn before the board (with its own 80 % shadow) so the little PCB stays visible
  (F07:34, F07:119-126; E:425-434).
- **Arduino Nano** (18 × 43 mm, blue, "NANO", a "328P" chip, green power LED, mini-USB plug on its far end) in front of the
  PCB (F07:32-33; E:363-378). It supplies logic power and STEP/DIR.
- **3S LiPo** labelled "11.1V" / "LIPO" (22 × 40 × 14 mm, grey with a yellow label) front-right (F07:35, F07:130; E:380-393).
- Wires (F07:133-155):
  - STEP (yellow) from Nano header pin 0 and DIR (green) from pin 1 run round the right-hand PCB edge onto H2 pins 6
    (STEP) and 7 (DIR). Drawn only when H2 is on the board.
  - LiPo red to H1 pin 0 (VMOT), black to pin 1 (GND), routed along the mat. Drawn only when H1 is on the board.
  - Four motor leads black / green / red / blue from the stepper to H1 pins 2..5 (2B, 2A, 1A, 1B). In the
    "Unplug motor (live!)" mode, while powered, the four leads end loose on the mat instead of on the pins.
  - Not drawn: VDD / logic GND from the Nano, MS1-MS3 straps, the RESET-SLEEP link, the 100 µF VMOT cap.

### 2.4 Controls

- "Place a part ▾" chips (live): "H1 motor + vmot", "H2 step / dir", "HS1 heatsink".
- "Upload sketch ▾" chips (live): "Full step", "1/16 microstep", "Set current limit", "Unplug motor (live!)".

| mode key | chip title | type | bytes | ref |
|---|---|---|---|---|
| `full` | "Full step" | upload | 1210 | F07:110-111 |
| `micro` | "1/16 microstep" | upload | 1180 | F07:112-113 |
| `curlim` | "Set current limit" | instant | - | F07:114-115 |
| `unplug` | "Unplug motor (live!)" | instant, faults | - | F07:116-117 |

### 2.5 Behaviour per mode

Constants (F07:15-17): `RS = 0.068` Ω, `VREF_SET = 0.54` V, initial `st.vref = st.vref0 = 0.30` V (F07:107),
`ilim(v) = v / (8 × RS) = v / 0.544`.

**Full step.** The shaft turns 50 steps (90°) in 0.25 s, then holds for 0.75 s: 1 s cycle (F07:19-29):
`deg = (floor(t) × 50 + floor(min(1, frac(t)/0.25) × 50)) × 1.8`, added to the angle the shaft had when the run started.
While stepping (first 0.25 s of each second, `burst`) the motor body jitters ±0.3 mm along x (`sin(now × 90) × 0.3`,
F07:122) and signal dots run on the copper (green STEP path ×3 at speed 3, yellow coil A / coil B paths ×2 at speed 1.4;
F07:156). Serial every second:
`moved 50 steps -> <((k+1)×90) mod 360> deg`, and while `st.vref < 0.4` the line gains
`   warning: Imax <ilim(st.vref) to 2 dp> A, may skip steps`. Live at start-up:
"moved 50 steps -> 90 deg   warning: Imax 0.55 A, may skip steps", then 180, 270, 0, 90 ... After "Set current limit" the
warning is gone: "moved 50 steps -> 90 deg".

```cpp
const int STEP = 3, DIR = 4;   // MS1-MS3 low = full step

void setup() {
  pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT);
  digitalWrite(DIR, HIGH);
}

void loop() {
  for (int i = 0; i < 50; i++) {    // 50 x 1.8 deg = 90 deg
    digitalWrite(STEP, HIGH); delayMicroseconds(2500);
    digitalWrite(STEP, LOW);  delayMicroseconds(2500);
  }
  delay(750);                       // holding torque keeps it put
}
```
(F07:39-53. The timing is consistent with the simulation: 50 × 5 ms = 250 ms, plus 750 ms.)

**1/16 microstep.** Smooth rotation at `deg = t × 90` (0.25 rev/s; F07:26), signal dots run continuously. Serial:
`pos <(k+1)×800> microsteps = <((k+1)×90) mod 360, 1 dp> deg  (3200 / rev)`, e.g. "pos 800 microsteps = 90.0 deg  (3200 / rev)",
"pos 1600 microsteps = 180.0 deg ...", "pos 3200 microsteps = 0.0 deg ...", "pos 4000 microsteps = 90.0 deg ..." (live).

```cpp
// MS1, MS2, MS3 tied HIGH = 1/16 step: 3200 pulses per rev
const int STEP = 3, DIR = 4;

void setup() { pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT); }

void loop() {
  digitalWrite(STEP, HIGH); delayMicroseconds(150);
  digitalWrite(STEP, LOW);  delayMicroseconds(150);
}   // 1.8 / 16 = 0.1125 deg per pulse: smooth and quiet
```
(F07:55-63. **Inconsistent with the simulation**: 300 µs per microstep is 3333 microsteps/s ≈ 1.04 rev/s, but the sim and
the serial log run 800 microsteps/s = 0.25 rev/s. A consistent sketch would use about 625 µs per half period.)

**Set current limit.** Instant, motor still (`moving:false`). Vref ramps from `vref0` to 0.54 V over 2.5 s with the
core ease-in-out (`ease(x) = x<.5 ? 2x² : 1-(-2x+2)²/2`, C:75): `Vref(t) = lerp(vref0, 0.54, ease(clamp01(t/2.5)))`
(F07:17). The trimpot RV1 visibly turns: wiper angle `-135° + Vref × 250°`, so 0.30 V = -60°, 0.54 V = 0° (F07:89).
Serial for k = 0..3 only (F07:115): at k=0 it latches `vref0 = st.vref`; it prints
`Vref = <v> V -> Imax = <ilim(v)> A`; at k=3 it stores `st.vref = 0.54` permanently. Live log:
"Vref = 0.30 V -> Imax = 0.55 A", "Vref = 0.38 V -> Imax = 0.69 A", "Vref = 0.52 V -> Imax = 0.96 A", "Vref = 0.54 V -> Imax = 0.99 A".
Running it again later stays at 0.54 (vref0 is now 0.54). Nothing ever lowers Vref again except reloading the figure.
The "CURRENT POT" pill is lit only in this mode.

```python
# set the limit BEFORE the motor runs (no STEP pulses)
# meter: COM on GND, red probe on the pot's metal wiper
Rs   = 0.068            # the two sense resistors on this board
Imax = 1.0              # ~70% of a 1.5 A NEMA17's rating
Vref = Imax * 8 * Rs    # = 0.54 V
# turn clockwise to raise Vref, a few degrees at a time
```
(F07:65-70)

**Unplug motor (live!).** Instant; the motor leads drop off H1 onto the mat and the mode's fault fires at once (F07:116-117):
`{ id:'U1', kind:'hot', msg:'You pulled the motor with VMOT on: the coil spike killed the A4988. Unplug power, then reconnect the motor' }`.
Status `FAULT`, the run stops (stats shrink to Parts/Status), smoke puffs rise from U1/heatsink, sounds buzz + sizzle,
the toast shows the message for 3.6 s.

```cpp
// DON'T: pull the motor plug while VMOT is on.
// Coil current can't stop instantly (V = L * di/dt):
// the spike lands on the driver's outputs -> dead A4988.
// Always: power off first, then unplug the motor.
```
(F07:72-75)

### 2.6 Stats (while running; F07:157-162)

| label | value | formula |
|---|---|---|
| "Vref" | `x.xx V` | `vrefNow(st, t)`: the ramp during "Set current limit", otherwise `st.vref` (0.30 until set, then 0.54) |
| "I limit" | `x.xx A` | `Vref / (8 × 0.068)`: 0.30 V → 0.55 A, 0.54 V → 0.99 A (live; 0.54/0.544 = 0.9926) |
| "Steps / rev" | "200" or "3200" | 3200 only in `micro`, 200 in every other mode |
| "Per step" | "1.8 deg" or "0.11 deg" | 0.11 shown for 1.8 / 16 = 0.1125° |

### 2.7 Pills and "working" (F07:163-164)

Pills on RV1 "CURRENT POT", HS1 "HEATSINK", H2 "STEP / DIR", H1 "MOTOR + VMOT". Lit when: HEATSINK and STEP / DIR = running
and the motor is moving (full, micro); CURRENT POT = running in `curlim`; MOTOR + VMOT = powered.

### 2.8 Failure modes you can trigger (all verified live)

| how | result (verbatim) |
|---|---|
| Pick "Unplug motor (live!)" while running | `FAULT`, U1 smokes, toast "You pulled the motor with VMOT on: the coil spike killed the A4988. Unplug power, then reconnect the motor" |
| Pick any mode while faulted | "Fix the fault first: unplug, then correct U1" |
| **Quirk:** unplug, pick "Full step" (toast "Power the board first"), plug in again | the fault fires again on power-up, because the current mode is still `unplug` (E:819-822). Only picking an instant mode ("Set current limit") while unpowered, or reloading, gets out of it |
| Run full step before setting the limit (default state) | every serial line carries "warning: Imax 0.55 A, may skip steps"; the motor still moves normally (no skipped steps are simulated) |
| Leave H1 out (or unsoldered) and power | "No power: H1 (Power + motor pins) is missing or unsoldered" (H1 is in `needs`, F07:105) |
| Leave H2 out and power | "Powered, but H2 (Control pins) is missing: nothing runs" (status `POWERED`) |
| Place HS1 before H1/H2 are soldered | "Solder everything first: this part goes on last" |
| Run without the heatsink | runs normally; no thermal model at all (the 1 A shutdown is only text) |

### 2.9 Build sequence specifics

5 SMD parts (U1, RV1, RS1, RS2, CP) by pick & place + reflow; H1 and H2 placed and soldered; HS1 (g3) pressed on last
with a "snap". Parts count 8. After "Pick & place SMD" the live count went 0 → 2 → 5 with "To solder" 5 until the reflow
toast, then 5/8 with nothing to solder.

### 2.10 Lesson text (summary)

Overview (F07:165-166): a stepper moves in fixed 1.8° steps, 200 per revolution, without an encoder, so positioning is
open loop and only valid while it never skips; at rest it holds with full torque. The A4988 turns STEP/DIR pulses into
chopped coil currents capped by the trimpot; set the cap before running, heatsink it above 1 A, and never unplug the motor
with VMOT live.

### 2.11 Quiz (F07:167-171)

1. "Sense resistors are 0.068 ohm and you want a 1.0 A limit. What Vref?" — choices "0.068 V" / **"0.54 V"** / "8 V".
   Why: Vref = I × 8 × Rs = 1.0 × 8 × 0.068 = 0.544 V.
2. "MS1, MS2 and MS3 all HIGH on an A4988 means..." — "Driver disabled" / **"1/16 microstepping: 3200 steps per rev"** /
   "Full step, 200 steps per rev". Why: HHH selects sixteenth steps, 200 × 16 = 3200.
3. "Why never unplug a stepper while the driver is powered?" — **"The coil voltage spike can destroy the driver"** /
   "It forgets its position" / "The heatsink falls off". Why: the coil's inductance forces V = L·di/dt onto the outputs.

### 2.12 Practice task (F07:172)

Wire an A4988 to a NEMA17, set Vref with a meter before the first move, turn exactly one revolution in full step and
in 1/16 step, flag the shaft with tape and check it comes back to the same place after 10 revolutions; drift means
skipped steps, so raise the limit slightly or slow down.

### 2.13 Accuracy notes for the rebuild

- Real A4988 microstep table (only partly in the original): MS1 MS2 MS3 = L L L full (200/rev), H L L 1/2 (400),
  L H L 1/4 (800), H H L 1/8 (1600), H H H 1/16 (3200). The original only simulates full and 1/16.
- Imax = Vref / (8 × Rs) is right for Pololu carriers with 0.068 Ω sense resistors (older carriers used 0.050 Ω).
  Use 0.544 V if the readout should say 1.00 A; the original's 0.54 V shows 0.99 A.
- Make the 1/16 sketch timing match the animation (see 2.5).
- VMOT 8-35 V, VDD 3-5.5 V, about 1 A per coil without extra cooling and up to about 2 A with it: all as stated.

---

## 3. Fig. 08 — PCA9685 servo board (`#pca9685`, F08)

### 3.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 08" / "PCA9685 servo board" / "16 PWM over I2C" | F08:64 |
| hint | "two wires of I2C, sixteen servos" | F08:64 |
| PCB | 25 × 62 mm, corner r 2, palette cobalt, 4 mounting holes at uv (2.5,2.5), (2.5,23), (59.5,2.5), (59.5,23) | F08:65-66 |
| mat margins | back 5, front 31, right 5, left 41 → 61 × 108 mm; headroom 26 | F08:65 |
| power | "Plug / unplug USB" (Nano USB, micro plug) | F08:108-109 |
| modes | "Upload sketch ▾"; default `sweep` | F08:110 |
| power OK toast | "Logic powered over the Nano: PWR lights, the sketch starts" | F08:109 |
| needs / run / uploadNeeds | `[]` / `['U1']` / `[]` | F08:108 |

### 3.2 Real-world model

Adafruit-style 16-channel 12-bit PWM / servo driver (62 × 25 mm). Silkscreen: "PCA9685 16-CH 12-BIT PWM", "V+  GND",
"ADDR", "PWR", "I2C" (F08:67-68). Four 3 × 4 servo header blocks along the front edge, rows from the back: PWM (yellow),
V+ (red), GND (black) (`KINDS.servoHdr`, F08:7-17). Six open address solder-jumper pad pairs A0-A5 (`KINDS.apads`, F08:19-24).

| ID | name (verbatim) | kind | group | uv rect | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| U1 | PCA9685 PWM controller | soic 14, label "PCA9685" | g0 | [27, 11, 37, 17.5] | "PWM CHIP" | 16 channels, 12-bit, own 25 MHz clock; set a width once over I2C and it keeps pulsing, freeing the Arduino | F08:81-82 |
| LP | Power LED | led green, powerLed | g0 | [54, 20, 55.6, 21.2] | "PWR" | lit by logic VCC from the Arduino; says nothing about V+ | F08:83-84 |
| RN | Series resistors + decoupling | passives (8 × R, 2 × C) | g0 | [8, 9, 52, 15] | "220R" | 220 Ω in every PWM line against reversed or shorted servo plugs; 100 nF decoupling | F08:85-88 |
| AJ | Address jumpers A0-A5 | apads | g0 | [42, 14.5, 52, 16.5] | "ADDR" | all open = 0x40; bridge A0 = 0x41; up to 62 boards / 992 servos per bus | F08:89-90 |
| C1 | 220 uF capacitor (V+) | ecap, **polar** | g1 | [18, 16, 24, 22], h 7.3 | "220uF" | bulk cap on the servo rail for start-up current spikes; stripe = minus | F08:91-92 |
| I2C1 | I2C header (in) | male 1×6 | g1 | [0.6, 5, 3.14, 20.24] | "I2C IN" | GND, OE, SCL, SDA, VCC, V+; four wires from the Arduino (SDA/SCL = A4/A5 on a Nano) | F08:93-94 |
| I2C2 | I2C header (chain out) | male 1×6 | g1 | [58.9, 5, 61.44, 20.24] | "CHAIN OUT" | same six signals passed through for the next board (different address) | F08:95-96 |
| S0 | Servo outputs 0-3 | servoHdr | g1 | [6, 0.6, 16.16, 8.22] | "SERVO 0-3" | one column per servo, yellow PWM / red V+ / black GND, orange servo wire to yellow; bench servos on channels 0 and 1 | F08:97-98 |
| S4 | Servo outputs 4-7 | servoHdr | g1 | [18.66, 0.6, 28.82, 8.22] | "SERVO 4-7" | any channel can also drive an LED or a motor-driver input | F08:99-100 |
| S8 | Servo outputs 8-11 | servoHdr | g1 | [31.32, 0.6, 41.48, 8.22] | "SERVO 8-11" | a 6-DOF arm uses six channels | F08:101-102 |
| S12 | Servo outputs 12-15 | servoHdr | g1 | [43.98, 0.6, 54.14, 8.22] | "SERVO 12-15" | sixteen is enough for a hexapod leg set or two arms | F08:103-104 |
| J1 | V+ screw terminal | term ×2, blue | g2 | [6, 16, 16, 24], h 10 | "V+ SERVO POWER" | 4.8-6 V from a battery or a 5 V 4 A supply, never the Arduino 5V pin (a stalling servo pulls ~1 A) | F08:105-106 |

### 3.3 On the mat (F08:27, F08:140-169)

- **Arduino Nano** at mat (37, 50), front-left of the PCB.
- **4 × AA battery holder** (17 × 34 × 10 mm, black with red/blue cells, no label) at (40, 8), front-right.
- **Two hobby servos** (SG90 style, 12 × 23 × 22 mm, blue `#2d5fb8`, white 11 mm horn) at (6, 74) and (22, 74), to the left.
  Horn angle = the channel's current angle (E:413-423).
- Wires: I2C jumpers from the Nano to I2C1: black → GND, yellow → SCL, blue → SDA, red → VCC (Nano header pins 12, 5, 4, 11;
  F08:151-154). Each servo has a 3-wire ribbon (black / red / orange) into the S0 header columns for channel 0 (u 7.27)
  and channel 1 (u 9.81); orange goes to the PWM row (F08:156-161). Battery red/black leads into J1 (F08:163-167).
  I2C wires need I2C1 on the board, servo ribbons need S0, battery leads need J1.

### 3.4 Controls

- "Place a part ▾" chips (live): "C1 stripe front", "C1 stripe back", "I2C1 i2c in", "I2C2 chain out", "S0 servo 0-3",
  "S4 servo 4-7", "S8 servo 8-11", "S12 servo 12-15", "J1 v+ servo power".
- "Upload sketch ▾" chips: "Sweep" (upload, 5120 bytes), "Center 90" (upload, 4870), "Arm wave" (upload, 5360) (F08:112-138).

### 3.5 Pulse model and behaviour

Constants and formulas (F08:28-29, F08:52-54):

- 50 Hz frame = 20 ms; `pulseUs(deg) = 1000 + deg/180 × 1000` µs (1.0 ms = 0°, 1.5 ms = 90°, 2.0 ms = 180°).
- `ticks(deg) = round(pulseUs(deg) × 4096 / 20000)`; one tick = 20 ms / 4096 = 4.88 µs. The sketch uses the equivalent
  `map(deg, 0, 180, 205, 410)`. Reference values: 0° → 1.00 ms / 205, 45° → 1.25 / 256, 90° → 1.50 / 307, 135° → 1.75 / 358,
  180° → 2.00 / 410.
- Servos only move when **both** I2C1 and J1 are soldered (`servoOut`, F08:36-41); otherwise they hold the last pose
  (`st.hold`, initially [90, 90]).

| mode | channel 0 (deg) | channel 1 (deg) | ref |
|---|---|---|---|
| Sweep | `90 + 85·sin(1.3 t)` (5..175°, period 4.83 s) | `180 − ch0` (mirrored) | F08:112 |
| Center 90 | 90 | 90 | F08:122 |
| Arm wave | shoulder `90 + 40·sin(0.9 t)` (50..130°) | hand `90 + 45·sin(4.2 t)`, scaled to 15 % while `sin(0.9 t) ≤ 0` | F08:129 |

Serial once a second (F08:56-61): if I2C1 is not soldered, "I2C scan: no device at 0x40 (header not soldered)" every second;
else if J1 is not soldered, "V+ terminal empty: the servos have no power, they just sit" every third second (k % 3 = 0);
else `ch0 <a> deg -> <pulse ms, 2 dp> ms -> setPWM(0, 0, <ticks>)` with `a = round(ch0)`. Live samples:
"ch0 91 deg -> 1.51 ms -> setPWM(0, 0, 308)", "ch0 172 deg -> 1.96 ms -> setPWM(0, 0, 400)", "ch0 90 deg -> 1.50 ms -> setPWM(0, 0, 307)".

Signal dots: SDA (blue) and SCL (yellow) paths ×3 while I2C is up; orange PWM0/PWM1 paths while the servos move (F08:170-171).

Code panel: a shared head (F08:42-55) plus a per-mode `loop()`:

```cpp
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm(0x40);  // A0-A5 open = 0x40

void setup() {
  pwm.begin();
  pwm.setPWMFreq(50);   // servos want a 20 ms frame
}

// 1.0 ms = 0 deg, 1.5 ms = 90, 2.0 ms = 180
// one tick = 20 ms / 4096 = 4.88 us
int ticks(int deg) { return map(deg, 0, 180, 205, 410); }
```

```cpp
// Sweep (F08:113-121)
void loop() {
  for (int d = 0; d <= 180; d++) {
    pwm.setPWM(0, 0, ticks(d));         // channel 0
    pwm.setPWM(1, 0, ticks(180 - d));   // channel 1, mirrored
    delay(10);
  }
  // ...and back down again
}
```

```cpp
// Center 90 (F08:123-128)
void loop() {
  pwm.setPWM(0, 0, ticks(90));    // 1.5 ms: the middle
  pwm.setPWM(1, 0, ticks(90));    // centre before you fit a horn
  delay(1000);
}
```

```cpp
// Arm wave (F08:130-138)
void loop() {
  float t = millis() / 1000.0;
  int shoulder = 90 + 40 * sin(t * 0.9);   // slow lift
  int hand     = 90 + 45 * sin(t * 4.2);   // quick wave
  pwm.setPWM(0, 0, ticks(shoulder));
  pwm.setPWM(1, 0, ticks(hand));
  delay(20);                               // one servo frame
}
```
(The sim's hand gating to 15 % on the down stroke is not in the sketch.)

### 3.6 Stats (F08:172-173)

| label | value | formula |
|---|---|---|
| "CH0 pulse" | `x.xx ms` | `pulseUs(round(ch0)) / 1000` |
| "Ticks" | integer | `round(pulseUs(round(ch0)) × 4096 / 20000)` |

Channel 1 has no stat. In Sweep they change every frame (live: 1.04 ms / 214 up to 1.97 ms / 403).

### 3.7 Pills (F08:174-175)

"PWM CHIP" (U1: running and I2C up), "V+ SERVO POWER" (J1: running and V+ present), "SERVO 0-3" (S0: servos moving),
"CHAIN OUT" (I2C2: never lit), "I2C IN" (I2C1: running and I2C up). The power LED LP lights whenever powered.

### 3.8 Failure modes (verified live)

| how | result |
|---|---|
| `?flip=C1`, or place "C1 stripe back", then power | `FAULT` "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it"; vented cap, smoke. Fix while live: "Unplug the power first: never work on a live board"; after unplugging, "C1 stripe front" gives "Desoldered C1, flipped it, soldered it again" |
| Build without J1 | runs (status `RUNNING`), servos frozen at their last pose, "CH0 pulse"/"Ticks" frozen, terminal "V+ terminal empty: the servos have no power, they just sit" every 3 s, "V+ SERVO POWER" pill absent, "SERVO 0-3" unlit |
| Build without I2C1 | runs, servos frozen, terminal "I2C scan: no device at 0x40 (header not soldered)" every second; "PWM CHIP" and "I2C IN" unlit. Because I2C1 is g1, J1 cannot be placed either ("Low parts first ...") |
| Build without S0 (or C1, S4, ...) | J1 is blocked, so this always also means "V+ terminal empty"; the servo ribbons are not drawn |

No fault exists for powering servos from the Arduino 5V pin, swapping SDA/SCL, two boards at the same address, or a
servo stalling; all of those are only quiz/text.

### 3.9 Build sequence specifics

4 SMD parts by pick & place; 7 low parts (C1 polar, two I2C headers, four servo blocks) placed and soldered; then the tall
blue V+ terminal J1 (g2). 12 parts.

### 3.10 Lesson text (summary)

Overview (F08:176-177): sixteen servos on two signal wires. The PCA9685 generates 16 independent 12-bit PWM channels from
its own clock and the Arduino only sends a new pulse width over I2C (address 0x40). Servos expect a pulse every 20 ms:
1.0 ms = 0°, 1.5 ms = 90°, 2.0 ms = 180°. Logic power comes from the Arduino, servo power through the blue V+ terminal,
and that split is the lesson.

### 3.11 Quiz (F08:178-182)

1. "Why do the servos get their own battery on V+ instead of the Arduino 5V pin?" — "The Arduino 5V is too high" /
   **"A stalling servo draws about an amp and browns the Arduino out"** / "I2C needs a separate ground".
   Why: servo stall current collapses a USB-fed 5 V rail.
2. "At 50 Hz, which pulse width puts a standard servo at 90 degrees?" — **"1.5 ms"** / "15 ms" / "0.5 ms". Why: centre of the 1-2 ms range.
3. "Two PCA9685 boards on one I2C bus both answer at 0x40. The fix?" — "Use a second Arduino" /
   **"Bridge an address jumper (A0) on one board"** / "Swap SDA and SCL on one board". Why: A0 bridged = 0x41.

### 3.12 Practice task (F08:183)

Build the open-source SO-101 arm, or start with an EEZYbotARM made of MG996R servos on this board: centre every servo
at 90° before fitting the horns, then drive two joints from two potentiometers on A0/A1, and note which joint buzzes or
stalls first and why.

### 3.13 Accuracy notes

- The file header comment says the servos are on channels 0 and 15 (F08:4); the wiring, the part text and the code all use
  channels 0 and 1. Use 0 and 1.
- 1.0-2.0 ms for 0-180° is the classic convention; many real servos need about 0.5-2.5 ms for their full travel. Worth a
  note in the rebuild.
- The PCA9685's internal oscillator is nominally 25 MHz but varies; real 50 Hz output needs prescale
  `round(25e6 / (4096 × 50)) − 1 = 121` and often oscillator calibration.
- 6 address bits → 0x40..0x7F; "62 boards, 992 outputs" matches Adafruit's figure (0x70 is the All Call address by default).

---

## 4. Fig. 09 — MPU-6050 IMU on a GY-521 (`#mpu6050`, F09)

### 4.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 09" / "MPU-6050 IMU" / "filters + drift" | F09:37 |
| hint | "power it, watch the gyro drift, then fuse it" | F09:37 |
| PCB | 16 × 21 mm, corner r 1.2, palette cobalt, two holes at uv (2.6,13.4), (18.4,13.4) | F09:38-39 |
| mat margins | back 6, front 30, right 6, left 50 → 52 × 77 mm; headroom 30 | F09:38 |
| power | "Plug / unplug Nano" | F09:62 |
| modes / code / terminal | "Upload sketch ▾" / "Sketch · <mode>" / "Serial plotter" (terminal starts "-- serial plotter --") | F09:65 |
| default mode | `raw` | F09:65 |
| needs / run | `['H1','U2']` / `['U1','R1','R2']` | F09:63 |
| power OK toast | "Powered: the Nano finds the MPU-6050 at 0x68 and starts streaming pitch" | F09:64 |

### 4.2 Real-world model

GY-521 breakout (about 21 × 16 mm) with an MPU-6050 in a 4 × 4 mm QFN, a "662K" 3.3 V LDO, 4.7 kΩ I2C pull-ups and an
8-pin header. Silkscreen "GY-521" and "0x68" (F09:40).

| ID | name (verbatim) | kind | group | uv rect | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| U1 | MPU-6050 6-axis IMU | qfp, label "MPU6050" | g0 | [8.3, 7.8, 12.7, 12.2] | "IMU" | 3-axis gyro + 3-axis accelerometer, I2C 0x68 (0x69 with AD0 high); you do the fusion yourself | F09:45-46 |
| U2 | 662K 3.3 V regulator | sot23 | g0 | [3, 5.2, 6, 8.2] | "3V3 LDO" | lets the 3.3 V chip run from the Nano's 5 V; the I2C pins still idle at 3.3 V via the pull-ups | F09:47-48 |
| R1 | 4.7 k pull-up (SCL) | chip | g0 | [5.9, 5, 7.5, 5.8] | "PULL-UP" | I2C is open-drain; without pull-ups the bus reads 0 | F09:49-50 |
| R2 | 4.7 k pull-up (SDA) | chip | g0 | [8.5, 5, 10.1, 5.8] | "PULL-UPS" | two boards' pull-ups in parallel make 2.35 k (fine); ten is not | F09:51-52 |
| CP | Decoupling capacitors | passives (3) | g0 | [13.6, 5, 18, 11.6] | "CAPS" | 100 nF at the chip pins; a clean supply is part of the measurement | F09:53-55 |
| LED1 | Power LED | led green, powerLed | g0 | [3.4, 10, 5.4, 11.2] | "PWR" | dark = no 3.3 V, so I2C scans find nothing | F09:56-57 |
| H1 | 1x8 pin header | male 1×8 | g1 | [0.34, 1.3, 20.66, 3.84] | "I2C PINS" | VCC, GND, SCL, SDA, XDA, XCL, AD0, INT; four wires are enough, INT can wake the Nano | F09:58-59 |

### 4.3 On the mat

- **Arduino Nano** at (SX + PW + 4, SY − 1), in front of the breakout (F09:15).
- **A small screen on a stand** (38 wide × 24 high, dark green face) at (SX − 6, SY + PD + 6), on the left, used as a serial
  plotter (F09:16, F09:96-100; E:447-455).
- Wires (F09:101-107): H1 pins VCC (red), GND (black), SCL (yellow), SDA (blue) to Nano header pins 7, 6, 5, 4. Drawn only
  with H1 on the board.

### 4.4 The signal model (all synthetic; F09:6-12)

| name | formula | meaning |
|---|---|---|
| `truth(t)` | `8·sin(1.1 t) + 3·sin(2.7 t)` deg | the hand-held board's real pitch wobble |
| `nz(t)` | `frac(sin(floor(10 t)·12.9898 + 78.233)·43758.5453) − 0.5` | hash noise, uniform in [−0.5, 0.5), new value every 0.1 s |
| `rawA(t)` | `truth(t) + 2.4·t` | integrated gyro: a bias of 2.4 °/s that grows without bound |
| `accA(t)` | `truth(t) + 16·nz(t)` | accelerometer angle: no drift, ±8° jumps |
| `filtA(t)` | `truth(t − 0.06) + 1.2·nz(t)` | "0.98 gyro + 0.02 accel": 60 ms lag, ±0.6° noise |

The filter is **not computed**; it is drawn as the truth delayed by 60 ms plus small noise. Live serial values match these
formulas exactly (e.g. k = 4: truth −10.6, raw −1.0; k = 8: truth 5.8, raw 25.0).

### 4.5 Plotter screen (F09:18-34)

- Dashed zero line; time runs left to right across the screen; 5 s window sampled at 47 points; values clamped to ±30°
  (`CLAMP`), so the drifting gyro line starts touching the top edge after about 8 s (2.4t + 11 > 30) and is pinned there
  for good from about 17 s (2.4t − 11 > 30).
- Always drawn: the truth as a light dashed line (`#cfd6cf`, 0.6 wide, 55 % opacity).
- Raw mode: orange gyro line (`#f7a531`, 1.3). Accel mode: beige accel line (`#d9d4c8`, 1.1). Filter mode: faint raw (45 %)
  and faint accel (40 %) behind a bold green filtered line (`#8af0ae`, 1.5).
- Corner labels: "GYRO ONLY" (orange), "ACCEL ONLY" (beige) or "FILTERED" (green), plus "PITCH".
- Not running: "waiting for data" when powered, "no signal" when not.

### 4.6 Modes, serial, code

| chip title | type | bytes | serial each second | ref |
|---|---|---|---|---|
| "Raw gyro (drift)" | upload | 4120 | `gyro angle <rawA(k), 1 dp> deg   (truth <truth(k), 1 dp>)` | F09:67-76 |
| "Accelerometer only (noisy)" | upload | 4310 | `accel angle <accA(k), 1 dp> deg   jumps with every bump` | F09:77-83 |
| "Complementary filter" | upload | 4480 | `raw <rawA(k)>   acc <accA(k)>   filt <filtA(k)>` (1 dp each) | F09:84-94 |

Live first lines in raw mode: "gyro angle 0.0 deg   (truth 0.0)", "gyro angle 10.8 deg   (truth 8.4)", "gyro angle 8.9 deg   (truth 4.1)",
"gyro angle 8.8 deg   (truth 1.6)", "gyro angle -1.0 deg   (truth -10.6)", "gyro angle 8.8 deg   (truth -3.2)".

```cpp
// Raw gyro (drift), F09:69-76
#include <Wire.h>
float angle = 0;                  // degrees

void loop() {
  float gyro = readGyroY();       // deg/s from the chip at 0x68
  angle += gyro * dt;             // integrate rate -> angle
  Serial.println(angle);          // a tiny bias adds up every loop:
}                                 // hold it still, watch it drift
```

```cpp
// Accelerometer only (noisy), F09:79-83
void loop() {
  readAccel(&ax, &ay, &az);       // gravity, in g
  float accelAngle = atan2(ax, az) * 180 / PI;
  Serial.println(accelAngle);     // never drifts, but every
}                                 // vibration shows up as tilt
```

```cpp
// Complementary filter, F09:86-94
float angle = 0;

void loop() {
  float gyro = readGyroY();                   // fast, drifts
  float accelAngle = atan2(ax, az) * 57.3;    // slow, noisy
  // trust the gyro short-term, the accel long-term:
  angle = 0.98 * (angle + gyro * dt) + 0.02 * accelAngle;
  Serial.println(angle);
}
```

### 4.7 Stats (F09:109)

| label | value |
|---|---|
| "Pitch raw" | `rawA(t)` to 1 dp + " deg" (grows 2.4 °/s on average, forever: live the stat went 8.8 → 23.5 deg over 8 s, the serial line reached 25.0 at k = 8) |
| "Filtered" | `accA(t)` in accel mode, otherwise `filtA(t)`, 1 dp + " deg". Note: in "Raw gyro (drift)" this shows the filtered value even though that sketch has no filter |

Signal dots: SCL yellow and SDA green paths ×3 while running (F09:108); power-path dots while powered (E:708).
Pills (F09:110-111): "IMU" (U1, running), "I2C PINS" (H1, running), "3V3 LDO" (U2, powered), "PULL-UPS" (R2, never lit).

### 4.8 Failure modes

| how | result |
|---|---|
| Build without H1, power | "No power: H1 (1x8 pin header) is missing or unsoldered" (verified) |
| Place H1 but do not solder it, power | the same message, status `NEEDS SOLDER` (verified) |
| Missing pull-up R1/R2, missing LDO U2 | **latent: unreachable in the UI** (SMD is all-or-nothing). Forced via state on the live site: "Powered, but R1 (4.7 k pull-up (SCL)) is missing: nothing runs" (then an upload attempt gives "avrdude: programmer is not responding" / "No working chip: the upload times out"); without U2: "No power: U2 (662K 3.3 V regulator) is missing or unsoldered" |

No fault models a wrong address (AD0), a 5 V I2C level problem or vibration.

### 4.9 Lesson text (summary)

Overview (F09:112-113): a 6-axis IMU (gyro = rotation rate, accelerometer = gravity direction) on I2C 0x68 with pull-ups.
Neither sensor alone gives a good angle: integrating the gyro drifts even when still, the accelerometer never drifts but
every bump reads as tilt; fusing them gives both, and the screen shows all three traces.

### 4.10 Quiz (F09:114-118)

1. "You hold the board perfectly still and the integrated gyro angle keeps growing. Why?" — "The I2C bus is too slow" /
   **"A small gyro bias is added up every loop (drift)"** / "The accelerometer is noisy".
2. "In angle = 0.98*(angle + gyro*dt) + 0.02*accelAngle, what does the 0.02 part do?" —
   **"Pulls the angle slowly back to gravity, cancelling drift"** / "Removes accelerometer noise completely" / "Speeds up the loop".
3. "An I2C scan finds nothing at 0x68. Most likely?" — "The filter constant is wrong" /
   **"Missing pull-ups or VCC/GND not connected"** / "The gyro is drifting".

Why (not in the original): 1 = integration accumulates bias; 2 = the small accel weight is a slow correction (a low-pass on the
accelerometer, high-pass on the gyro); 3 = an I2C device needs power, ground and pull-ups before it can answer.

### 4.11 Practice task (F09:119)

Mount the IMU, print pitch, hold it still and watch it drift; add the four-line complementary filter and watch the drift
vanish; only move to a Kalman filter once you can explain where the complementary filter fails.

### 4.12 Accuracy notes

- With α = 0.98 and loop period dt, the filter's crossover time constant is τ = α·dt / (1 − α) (≈ 0.49 s at dt = 10 ms).
  If the rebuild runs a real filter, its lag and noise will differ from the original's fixed 60 ms / ±0.6°.
- Pitch from the accelerometer should be `atan2(ax, az)` (as written) or `atan2(−ax, sqrt(ay² + az²))` for full tilt
  ranges; 57.3 = 180/π.
- The GY-521 header order VCC, GND, SCL, SDA, XDA, XCL, AD0, INT matches the real board.

---

## 5. Fig. 10 — HC-SR04 ultrasonic rangefinder (`#hcsr04`, F10)

### 5.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 10" / "HC-SR04 ultrasonic" / "time of flight" | F10:47 |
| hint | "power it, move the object, watch the echo come back" | F10:47 |
| PCB | 20.5 × 45 mm, corner r 1.2, palette cobalt, **standoff 0** (lies flat, transducers point up) | F10:48 |
| mat margins | back 5, front 36, right 5, left 22 → 61.5 × 72 mm; headroom 62 | F10:48 |
| power | "Plug / unplug USB" | F10:71 |
| modes | "Move the object ▾"; default `d10` | F10:72 |
| run | `['J1','U1','U2','U3','Y1','T1','R1']` (checked in that order) | F10:70 |
| power OK toast | "Powered: the Nano pings every 60 ms and times the echo" | F10:71 |

### 5.2 Real-world model

The classic 45 × 20 mm module: two 16 mm transducer cans ("T" left, "R" right) with mesh tops (12 mm tall), a 4-pin
header between them, and the drive electronics. Silkscreen "T", "R", "HC-SR04" (F10:49).

| ID | name (verbatim) | kind | group | uv rect | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| U1 | EM78P153 microcontroller | soic, label "EM78" | g0 | [17.7, 3.5, 22.3, 8.3] | "MCU" | waits for the 10 µs TRIG, fires the burst, holds ECHO high until the echo returns; the Arduino only times that pulse | F10:52-53 |
| U2 | LM324 op-amp | soic, label "324" | g0 | [22.7, 3.5, 27.3, 8.3] | "AMPLIFIER" | amplifies and filters the faint 40 kHz echo from R | F10:54-55 |
| U3 | MAX232 driver | soic, label "232" | g0 | [17.7, 8.7, 22.3, 13.4] | "DRIVER" | pumps 5 V up to about ±10 V to drive T hard (louder = longer range) | F10:56-57 |
| RC | Passives | passives (6) | g0 | [22.7, 8.7, 27.3, 13.4] | "PASSIVES" | amplifier bias and filter parts, decoupling | F10:58-60 |
| Y1 | 12 MHz crystal | xtal, label "12.000" | g1 | [18.5, 14.2, 26.5, 18.4] | "CRYSTAL" | clocks the MCU so the 40 kHz burst and the timing are exact | F10:61-62 |
| J1 | 4-pin header | male 1×4 | g1 | [17.42, 0.5, 27.58, 3.04] | "VCC TRIG ECHO GND" | VCC 5 V, TRIG (your 10 µs output), ECHO (high for the round trip), GND | F10:63-64 |
| T1 | Transmitter (T) | cyl, mesh top | g2 | [1.5, 3.5, 17.5, 19.5], h 12 | "TRANSMIT" | 40 kHz piezo speaker, 8-cycle burst, cone about 30° | F10:65-66 |
| R1 | Receiver (R) | cyl, mesh top | g2 | [27.5, 3.5, 43.5, 19.5], h 12 | "RECEIVE" | matching piezo microphone; hears the first thing in the cone, so two objects confuse it | F10:67-68 |

### 5.3 On the mat: the clamp stand and the target (F10:81-115)

- **Arduino Nano** at (bx(−13), SY + 1), in front of the module (F10:22).
- **Clamp stand** on the left: black 12 × 12 mm base at (bx(11.5), by(−12)), a metal post, and an arm reaching over the board.
- **Target sheet** held flat above the cans, footprint uv [−0.5, 2.5, 45.5, 20.5]:
  clear acrylic (4 mm, 50 % opacity, with a white glare streak; hard, so it echoes and you can see the sound through it)
  labelled on top "ACRYLIC  10 cm" / "ACRYLIC  25 cm" / "ACRYLIC  50 cm", or a pink foam pad (6 mm, hatched) labelled "FOAM  25 cm".
- Height above the can tops is scaled, not real: 10 cm → 18 mm, 25 cm → 30 mm, 50 cm → 44 mm (`GAP`, F10:8). The sheet
  eases to a new height over 0.8 s, time based, so it **also moves while unpowered** (F10:14-20, F10:80). In the exploded
  view it is kept at least 6 mm above the lifted cans (F10:18).
- **The sound, drawn** while running (F10:98-113): one ping cycle is slowed to 1.6 s (`PERIOD`); for the first 55 % (`UP`)
  three blue rings (`#2f6fd6`) rise from T, 0.07 s apart, widening by 0.2 mm per mm of height; then three red echo rings
  (`#e2483d`) fall from the sheet towards R. Soft target: the red rings only get 45 % of the way down, thinner and fading,
  and six pink dots scatter at the foam (the sound is absorbed).
- Wires (F10:116-121): J1 VCC red, TRIG yellow, ECHO green, GND black to Nano header pins 9, 8, 7, 6. Drawn only with J1 on.

### 5.4 Modes (all instant; F10:73-78)

| chip title | key | object | stats | serial each second |
|---|---|---|---|---|
| "Object at 10 cm" | d10 | acrylic, 10 cm | "Echo" 583 us, "Distance" 10.0 cm | `distance: <10 + 0.15·sin(1.7k), 2 dp> cm   echo <round(583.09 + 9·sin(1.7k))> us` |
| "Object at 25 cm" | d25 | acrylic, 25 cm | 1458 us, 25.0 cm | same pattern around 25 cm / 1457.7 µs |
| "Object at 50 cm" | d50 | acrylic, 50 cm | 2915 us, 50.0 cm | same pattern around 50 cm / 2915.5 µs |
| "Soft target (fails)" | soft | foam, 25 cm | "Echo" "none", "Distance" "0.0 cm" | "distance: 0.00 cm   (no echo, pulseIn timed out)" |

Formula: `echoUs(cm) = cm × 2 / 0.0343` (F10:10), shown rounded. Live lines: "distance: 10.00 cm   echo 583 us",
"distance: 10.15 cm   echo 592 us", "distance: 9.96 cm   echo 581 us", "distance: 9.86 cm   echo 575 us";
at 25 cm "distance: 25.15 cm   echo 1467 us"; at 50 cm "distance: 50.15 cm   echo 2924 us". The stats themselves do not jitter.

The code panel is one sketch for all modes; only its last comment line changes (F10:24-41):

```cpp
const int TRIG = 9, ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);        // a 10 us pulse makes T
  delayMicroseconds(10);           // send 8 cycles at 40 kHz
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 30000);  // there and back
  float cm = us * 0.0343 / 2;      // sound: 343 m/s, halved
  Serial.println(cm);
  delay(60);                       // let old echoes die out
}
// object at 25 cm: echo = 1458 us
```
Last line per mode: "// object at 10 cm: echo = 583 us", "// object at 25 cm: echo = 1458 us",
"// object at 50 cm: echo = 2915 us", "// foam at 25 cm: no echo, pulseIn() times out -> 0".

Pills (F10:124-125): "TRANSMIT" (running), "RECEIVE" (running and not soft; goes dark on the foam), "VCC TRIG ECHO GND" (running).
No copper signal paths are defined for this board.

### 5.5 Failure modes (verified live)

| how | result |
|---|---|
| "Soft target (fails)" | the designed failure: Echo "none", Distance "0.0 cm", RECEIVE pill off |
| Build without R1 | "Powered, but R1 (Receiver (R)) is missing: nothing runs" |
| Build without Y1 (which also blocks T1/R1) | "Powered, but Y1 (12 MHz crystal) is missing: nothing runs" |
| Build without J1 | "Powered, but J1 (4-pin header) is missing: nothing runs" |
| Change the object while powered but not running | the sheet moves and the terminal logs `-- Object at 25 cm --`, nothing else |
| Change the object while unplugged | toast "Set. Now power the board to see it"; the sheet moves anyway |

Not modelled: double echoes from two objects, an object outside the cone, the 2 cm minimum range, angled glass.

### 5.6 Lesson text (summary)

Overview (F10:126-127): the cheapest way to give a robot wall sensing, a "$3.95" part that measures time of flight:
a 10 µs TRIG pulse makes T emit 8 cycles at 40 kHz and ECHO stays high until R hears the bounce; distance = time × 343 m/s / 2.
It sees the first thing anywhere in a wide (~30°) cone and does badly on soft, sound-absorbing surfaces; for a narrower beam
the text points to a VL53L0X laser ToF sensor.

### 5.7 Quiz (F10:128-132)

1. "ECHO stays high for 1166 us. How far is the object?" — "40 cm" / **"20 cm"** / "11.7 cm". Why: 1166 × 0.0343 / 2 = 20.0 cm.
2. "Why divide by 2 in cm = us * 0.0343 / 2?" — "The sensor has two transducers" / **"The sound goes there and back"** / "To convert to inches".
3. "Your robot drives into a sofa without slowing down. Most likely?" — **"The sofa soaks up the sound, so no echo returns"** /
   "The sofa is too close to see" / "TRIG was too short".

### 5.8 Practice task (F10:133)

Print the distance ten times a second; aim at a wall, a sofa cushion and a glass bottle at an angle; log which readings
jump or drop to zero and explain why; then repeat with a VL53L0X.

### 5.9 Accuracy notes

- 0.0343 cm/µs is the speed of sound at about 20 °C; v ≈ 331.3 + 0.606·T(°C) m/s if the rebuild adds temperature.
- `pulseIn` timeout 30 000 µs ≈ 5.1 m one-way distance limit; the HC-SR04 is specified 2-400 cm with a "15°" measuring
  angle, usually read as ±15°, i.e. the ~30° full cone the original quotes.
- **Error to avoid:** the overview says the VL53L0X gives a "narrow beam" with a "35 degree cone"; that is wider than the
  HC-SR04's ~30° it is supposed to beat, and ST specifies the VL53L0X field of view as 25°.

---

## 6. Fig. 11 — QTR-8RC reflectance array (`#qtr8`, F11)

### 6.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 11" / "QTR-8RC line sensor" / "line following" | F11:70 |
| hint | "power it, move the line, upload the P controller" | F11:70 |
| PCB | 12.7 × 75 mm, corner r 1.2, palette cobalt, standoff 3, holes at uv (2.5,10.5), (72.5,10.5) | F11:71-72 |
| mat margins | back 5, front 56, right 5, left 44 → 73.7 × 124 mm; headroom 28 | F11:71 |
| power | "Plug / unplug USB" (default label) | E:1067 |
| modes | "Upload sketch ▾"; default `centre` | F11:89 |
| run | `['H1']` | F11:87 |
| power OK toast | "Powered: the Nano pulls LEDON high and the 8 emitters switch on" | F11:88 |

### 6.2 Real-world model

Pololu QTR-8RC: 75 × 12.7 mm (2.95 × 0.5 in), eight IR emitter/phototransistor pairs at a 9.525 mm (0.375 in) pitch,
an RC network per sensor, an LEDON MOSFET and a 1 × 11 header. Silkscreen "QTR-8RC", "1" under sensor 1, "8" under sensor 8
(F11:73). Sensor centres `US[i] = 4.14 + i × 9.525` mm from the left edge: 4.14, 13.665, 23.19, 32.715, 42.24, 51.765,
61.29, 70.815 (F11:5-6). Header pin j at u = 24.8 + 2.54·j: 0 LEDON, 1-8 OUT1-OUT8, 9 VCC, 10 GND (F11:7).

| ID | name (verbatim) | kind | group | uv rect | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| S1..S8 | IR pair 1 .. IR pair 8 | irpair (clear emitter window + dark detector window) | g0 | [US[i] − 2.2, 1.4, US[i] + 2.2, 4.4] | "IR 1" .. "IR 8" (pills on S1 and S8 only) | IR LED shines down, phototransistor measures the return; white reflects a lot, the black line almost nothing | F11:77-78 |
| RC | RC caps + resistors | passives (8 C + 8 R) | g0 | [2, 6, 73, 8] | "RC" | each phototransistor discharges a small cap; charge it, time the fall to LOW: bright = fast, black = slow (up to 2500 µs), no ADC | F11:79-81 |
| Q1 | LEDON MOSFET | sot23 | g0 | [13, 8.6, 16, 11.2] | "LEDON" | switches all 8 emitters from one pin (save ~100 mA between reads); without it every sensor reads black | F11:82-83 |
| H1 | 1x11 header | male 1×11 | g1 | [23.53, 9.9, 51.47, 12.44] | "HEADER" | LEDON, OUT1-OUT8, VCC, GND; VCC 5 V or 3.3 V | F11:84-85 |

### 6.3 On the mat

- **White paper strip** directly in front of the sensor row, 25 mm deep, the full 73 mm width (x bx(−2)..bx(−27),
  y by(74)..by(1)), with a **13 mm black line** (`LW`) running away from the board at the line position (F11:65, F11:99; E:457-460).
- **IR spots** on the paper under each sensor while running with emitters on, "camera view" since IR is invisible:
  r 3.2 mm, dark red `#7a2b3a` (45 %) where the sensor reads black, pink `#f3a6bb` (60 %) where it reads white (F11:100-103).
- **Arduino Nano** at (bx(−34), by(73)) (F11:66).
- **Bar-graph screen** (36 × 22) on the left at (SX − 4, by(−4)) (F11:67, F11:105-114): eight bars (pink when > 0.5,
  green otherwise), height 0.4 + v × (H − 7); a vertical marker at the computed position; caption `POS <pos>`, plus
  `  TURN <±n>` in follow mode. Not running: "NO SKETCH" when powered, "--" when not.
- While unpowered or not running, the line sits at the **pending** mode's position (`lineU(st.pending, 0)`), so picking a
  mode moves the black line immediately (verified).
- Wires (F11:117-122): LEDON yellow, OUT1 blue, OUT8 green, VCC red, GND black to Nano header pins 3, 4, 5, 6, 7. Only
  OUT1 and OUT8 of the eight outputs are drawn.
- Red glow dots on every sensor that reads black (F11:123-127); red signal dots along OUT paths of dark sensors, a yellow dot
  on the LEDON path (F11:128).

### 6.4 Reading model (F11:13-25)

- Line centre per mode: "Line under sensor 2" → u = US[1] = 13.665; "Line centred" → 37.5; "Line under sensor 7" → US[6] = 61.29;
  "Follow (P controller)" → `37.5 + 17·sin(1.25 t)·cos(0.33 t)` (wanders roughly between sensors 3 and 6).
- Per sensor i: `c_i = clamp01((LW/2 + 3 − |US[i] − uL|) / 6) = clamp01((9.5 − d)/6)`: 1 (black) within 3.5 mm of the line
  centre, falling linearly to 0 (white) at 9.5 mm. A sensor not on the board reads 0; with Q1 missing every present sensor
  reads 1.
- `pos = round(Σ c_i × i × 1000 / Σ c_i)` if Σ c_i > 0.05, else 0 if the line is left of 37.5, 7000 if right ("last seen side").
- `err = pos − 3500`, `steer = round(0.05 × err)` (Kp = 0.05).
- Terminal row: each `c_i × 1000` rounded, padded to 4 characters, joined by single spaces.

Live values: centred → "   0    0    0  786  793    0    0    0  pos 3502", Position 3502, Error +2 (not 3500: 37.5 is not
quite the array midpoint 37.4775); sensor 2 → "   0 1000    0    0    0    0    0    0  pos 1000", Error −2500;
sensor 7 → pos 6000, Error +2500. Follow (live) swings about 2240..5250 with Turn about −63..+88, e.g.
"   0    0    0    0    0 1000  205    0 pos 5170 err 1670 turn 84".

### 6.5 Modes and code (F11:90-95)

| chip title | key | type | bytes | serial each second |
|---|---|---|---|---|
| "Line under sensor 2" | left | upload | 3120 | `<row>  pos <pos>` |
| "Line centred" | centre | upload | 3120 | same |
| "Line under sensor 7" | right | upload | 3120 | same |
| "Follow (P controller)" | follow | upload | 3584 | `<row> pos <pos> err <err> turn <steer>` |

With emitters off (Q1 missing) every line is "all 1000: LEDON never switches the emitters on (Q1 missing)" (F11:29).

```cpp
// shared setup (F11:32-43)
#include <QTRSensors.h>
QTRSensors qtr;
uint16_t s[8];

void setup() {
  qtr.setTypeRC();
  qtr.setSensorPins((const uint8_t[]){3,4,5,6,7,8,9,10}, 8);
  qtr.setEmitterPin(2);            // LEDON
  for (int i = 0; i < 400; i++)    // sweep over line + floor
    qtr.calibrate();
  Serial.begin(9600);
}
```

```cpp
// line modes add (F11:46-51)
void loop() {
  uint16_t pos = qtr.readLineBlack(s);  // 0 .. 7000
  int error = pos - 3500;               // 0 = line centred
  Serial.println(pos);
  delay(100);
}
```

```cpp
// follow adds (F11:54-62)
const float Kp = 0.05, Kd = 0.0;   // add D when it oscillates
int last = 0;

void loop() {
  int error = qtr.readLineBlack(s) - 3500;
  int turn  = Kp * error + Kd * (error - last);
  last = error;
  motors(base + turn, base - turn); // steer back onto the line
}
```

### 6.6 Stats (F11:129-130)

| label | value |
|---|---|
| "Position" | `pos` (0..7000) |
| "Error" | `err` with a leading "+" when positive ("+2", "-2500"; zero shows "0") |
| "Turn" | follow mode only: `steer` with "+" when positive |

Pills (F11:131-134): "IR 1", "IR 8" (lit while that sensor reads black), "HEADER" (running), "LEDON" (running with emitters on).

### 6.7 Failure modes

| how | result |
|---|---|
| Build without H1 | "Powered, but H1 (1x11 header) is missing: nothing runs"; an upload then gives "avrdude: programmer is not responding" / "No working chip: the upload times out" (verified) |
| Pick a mode while unplugged, then power | **quirk:** the old mode runs, the code panel shows the new one (verified: Follow kept running under a "LINE UNDER SENSOR 7" heading) |
| Q1 missing | **latent** (SMD all-or-nothing). Forced on the live site: every sensor reads 1, Position 3500, Error 0, all eight bars pink, all sensors glowing, terminal "all 1000: LEDON never switches the emitters on (Q1 missing)" |
| One sensor missing | **latent.** Forced (S4 gone, line centred): row "   0    0    0    0  793    0    0    0  pos 4000", Error +500 |

The follow mode is open-loop in the sim: the line is driven by a fixed function and the computed turn does not feed back.
There is no robot, no D-term demo and no oscillation that grows with Kp, although quiz 3 and the practice task are about exactly that.

### 6.8 Lesson text (summary)

Overview (F11:135-136): eight IR emitter/phototransistor pairs; white paper reflects IR, black line absorbs it; the RC
version times each capacitor's discharge (fast = white, slow = black). `readLineBlack()` folds the eight readings into
one number, 0 under sensor 1, 3500 centred, 7000 under sensor 8; subtract 3500 and you have the error a P controller
steers on, the smallest closed loop in robotics.

### 6.9 Quiz (F11:137-141)

1. "Over a black line, an RC sensor reading is..." — "Low: the cap discharges fast" /
   **"High: little IR comes back, so it discharges slowly"** / "Exactly 3500".
2. "readLineBlack() returns 1200. Where is the line?" — **"Near sensor 2, left of centre"** / "Dead centre" / "Near sensor 7".
   Why: position 1000 = sensor 2, so 1200 is just right of sensor 2, left of centre.
3. "With a P controller your robot weaves more and more. Next step?" — "Raise Kp" /
   **"Add a D term to damp the oscillation"** / "Remove the RC capacitors".

### 6.10 Practice task (F11:142)

Build the line follower, tune a P controller, add the D term and watch the oscillation go; film both versions side by
side to show you understand the loop rather than a copied gain.

### 6.11 Accuracy notes

- Real QTR RC read: drive the line high about 10 µs to charge, switch to input, time the fall; the library times out at
  2500 µs by default and calibrates each sensor to 0..1000. Real `readLineBlack` ignores readings below about 50 and treats
  the line as lost when no sensor is above about 200, returning 0 or 7000 by the last side seen.
- Real electrical-tape lines are usually 19 mm (0.75 in) wide; the original uses 13 mm.

---

## 7. Fig. 12 — LM2596 buck module with 3-digit voltmeter (`#lm2596`, F12)

### 7.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 12" / "LM2596 buck module" / "power + brown-outs" | F12:100 |
| hint | "connect the battery, turn the trimpot, stall the motor" | F12:100 |
| PCB | 35 × 66 mm, corner r 1.5, palette cobalt, holes at uv (3,3), (63,31) | F12:101-102 |
| mat margins | back 5, front 67, right 6, left 26 → 107 × 98 mm; headroom 22 | F12:101 |
| power | "Connect battery"; the "plug" is the battery lead into J1 (USB-C style plug drawing, `zc` 3.1) | F12:132-133 |
| modes / code / terminal | "Turn trimpot ▾" / "The math · <mode>" / "Bench notes" (terminal starts "-- bench notes --") | F12:133-134 |
| default mode | `set5` | F12:134 |
| needs / run | `['U1','L1','D1']` / `['C2','RV1','J2']` | F12:132 |
| power OK toast | "Battery connected: the buck starts switching" | F12:133 |

### 7.2 Real-world model

The common blue LM2596 module with a built-in 3-digit LED voltmeter (66 × 35 mm). Silkscreen "IN", "OUT", "LM2596 DC-DC",
"ADJ", and "+" by each terminal (F12:103). Custom drawings: TO-263 regulator with tab and 5 gull-wing leads, text
"LM2596S" "-ADJ" (F12:7-15); SMA/SMB Schottky with a silver cathode band, "SS34" (F12:17-24); blue 3296 multi-turn
trimpot, "103", with a brass screw that turns (F12:26-33); a 3-digit red 7-segment display with decimal points and a
slight italic (F12:35-60).

| ID | name (verbatim) | kind | group | uv rect | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| U1 | LM2596S-ADJ switching regulator | to263 | g0 | [20, 20, 31, 31] | "LM2596" | switches 150 000 times a second; inductor + cap smooth it; about 90 % efficient | F12:107-108 |
| L1 | 33 uH power inductor | inductor, "330" | g0 | [33, 19, 45, 31], h 7.5 | "INDUCTOR" | stores energy while on, releases it while off: trades voltage for current | F12:109-110 |
| D1 | SS34 Schottky diode | smddiode | g0 | [37, 11, 43, 15] | "DIODE" | carries inductor current while the switch is off; ~0.4 V drop and fast | F12:111-112 |
| LED1 | Power LED | led red, powerLed | g0 | [58, 22, 60, 23.2] | "PWR" | input live; stays on even with the output shorted | F12:113-114 |
| RC | Feedback divider + caps | passives (5) | g0 | [24, 12, 60, 27] | "FEEDBACK" | divides Vout to 1.23 V for the comparator; the trimpot is half the divider | F12:115-117 |
| RV1 | 10 k multi-turn trimpot | trim3296 | g1 | [45, 9, 54.5, 14] | "TRIMPOT" | 25 turns end to end, clockwise raises Vout; set it with the load unplugged and a meter on the output | F12:118-120 |
| DS1 | 3-digit voltmeter display | seg7 | g1 | [12, 3, 34, 13] | "VOLTMETER" | shows Vout, but cheap ones read 0.05-0.1 V off: trust the meter | F12:121-122 |
| J1 | Input screw terminal | term ×2 blue | g2 | [1, 24, 8, 34] | "IN 11.1V" | IN+ / IN−, 4.5-40 V, here a 3S LiPo; no reverse protection | F12:123-124 |
| J2 | Output screw terminal | term ×2 blue | g2 | [55, 1, 65, 8] | "OUT" | feeds the Nano and the motor; one shared rail is how brown-outs happen | F12:125-126 |
| C1 | 220 uF 35 V input capacitor | ecap, **polar** | g2 | [10, 22, 18, 30], h 10 | "C IN" | supplies the switch's current pulses so they do not go up the battery leads | F12:127-128 |
| C2 | 220 uF 35 V output capacitor | ecap, **polar** | g2 | [48, 22, 56, 30], h 10 | "C OUT" | smooths output ripple; nothing smooths a stalled motor at 3 A | F12:129-130 |

### 7.3 On the mat (F12:145-180)

- **Arduino Nano** at (43, 25), fed from J2. Its power LED follows the rail: lit when powered and either not running or
  `o.nano` is true (F12:147).
- **Yellow multimeter** (34 × 20 × 6) at (43, 2), face up, green digits = `meterText`, unit "V"; red probe to OUT+, black
  COM to OUT− (F12:149, F12:164-165; E:438-445).
- **TT gearmotor** (yellow gearbox, metal can, black tyre, yellow hub, 5 spokes) at (74, 74); wheel angle `t × spd × 7` rad
  (F12:150, F12:73).
- **3S LiPo** "11.1V" / "LIPO" (40 × 20 × 14) at (18, 74) (F12:151). Its main lead runs to the plug in J1; when disconnected
  the lead lies on the mat ending in a yellow connector body (F12:170-174).
- **Wooden block** (10 × 7 × 13) jammed against the wheel at (96, 64), only in "Motor stall" while running (F12:152).
- Wires (F12:155-167): J2 OUT− black and OUT+ red to the Nano; motor leads red/black routed low along the mat round the
  battery; meter leads to J2. All need J2.
- **Smoke from the Nano** (4 grey puffs rising) while running "Set 12 V (impossible)" after 1.2 s (F12:176-179).

### 7.4 Electrical model (F12:63-78)

Constants: `VIN = 11.1` V (3S nominal), battery resistance `RBAT = 0.08` Ω.

| mode | Vout v(t) | Iout | wheel speed `spd` | Nano alive `o.nano` |
|---|---|---|---|---|
| set5 | `5.0 + 0.015·sin(3t)` | 0.45 A | 1 | always |
| set33 | `3.3 + 0.01·sin(3t)` | 0.30 A | 0.55 | `sin(1.7t) > −0.6` (out about 30 % of the time: the LED flickers) |
| set12 | 10.5 (dropout ceiling) | 0.80 A | 2 | dead after t > 1.2 s (`dead`) |
| stall | `2.9 + 1.7·max(0, sin(3.1t)) × (sin(1.3t) > 0.2 ? 1 : 0.25)` (2.9..4.6 V) | 3.0 A (current limit) | 0, plus a 0.06 rad shake at 40 rad/s | `v > 4.3` |

`vin = VIN − i × RBAT` (sagged input: 11.064 V at 0.45 A, 10.86 V at 3 A).

Display and meter:
- DS1 shows `fmt7(v + 0.06)`: deliberately 0.06 V high ("always check a cheap display against a real meter"); one decimal
  at ≥ 9.95 V, two below. Blank when unpowered, "0.00" lit when powered but not running (F12:75-77).
- The multimeter shows `v.toFixed(2)` (one decimal at ≥ 9.995), "0.00" when not running (F12:78). Live: meter "4.99"/"5.01"
  in set5 (display ≈ "5.06"), "10.5" in set12 (display "10.6"), 2.90..4.56 in stall.
- RV1's screw angle = `SETV[pending] × 160°`: 5 V → 800°, 3.3 V → 528°, 12 V → 1920°, stall → 800°; it turns as soon as you
  pick the mode, powered or not (F12:119).

### 7.5 Stats (F12:182-183)

| label | value | formula |
|---|---|---|
| "Vout" | `x.xx V` | `v(t)` |
| "Iout" | `x.xx A` | `i` |
| "Linear would burn" | `x.x W` | `max(0, (vin − v) × i)` with the sagged vin |

Live: set5 "5.00 V" / "0.45 A" / "2.7 W"; set33 "3.30 V" / "0.30 A" / "2.3 W"; set12 "10.50 V" / "0.80 A" / "0.4 W";
stall "2.90 V".."4.56 V" / "3.00 A" / "23.9 W".."18.9 W".

### 7.6 Modes (all instant; F12:135-144): bench notes and the math

| chip title | key | bench notes (terminal) |
|---|---|---|
| "Set 5.0 V" | set5 | k = 1: "Nano: boot OK on 5.00 V"; k divisible by 3: "Vin 11.06 V  Vout 5.00 V  Iout 0.45 A  eff 90%" |
| "Set 3.3 V" | set33 | k = 0: "Vout 3.30 V: fine for an ESP32 or a sensor"; k = 1: "Nano: a 16 MHz ATmega wants 4.5 V+, it glitches here"; other k divisible by 3: "Vout 3.30 V  Iout 0.30 A" |
| "Set 12 V (impossible)" | set12 | k = 0..3 then silence: "Asked for 12 V from an 11.1 V pack: a buck only steps DOWN", "Vout tops out at ~10.5 V (dropout)", "10.5 V on the Nano's 5V pin... magic smoke", "Rule: set the voltage BEFORE you connect the load" |
| "Motor stall" | stall | repeating cycle of six: "Wheel jammed: motor current 3.0 A (current limit)", "Vout sags to 2.9 V", "Nano: brown-out reset", "setup()", "Nano: brown-out reset", "setup()" |

"The math" panel is generated per mode (F12:79-97). For set5 / set33 / set12:

```python
# 3S LiPo: 3 cells x 3.7 V = 11.1 V nominal (12.6 full, ~9.9 empty)
V_in   = 11.1
V_out  = 5.0
D      = V_out / V_in        # duty cycle = 45%
I_out  = 0.45

P_out  = V_out * I_out       # 2.25 W
buck   = P_out / 0.90 - P_out # ~0.25 W of heat (90% efficient)
linear = (V_in - V_out) * I_out  # 2.75 W of heat in a 7805
```

Evaluated values (live): set33 → `V_out = 3.3`, duty 30 %, `I_out = 0.3`, 0.99 W, ~0.11 W buck heat, 2.34 W linear;
set12 → `V_out  = 10.5          # asked for 12 V: a buck only steps DOWN`, duty 95 %, `I_out = 0.8`, 8.40 W, ~0.93 W, 0.48 W.
For stall:

```python
# stall: the motor's resistance is ~2 ohm once it stops turning
I_stall  = 6.0           # A it would draw at 12 V
I_limit  = 3.0           # A: the LM2596 current limit
V_out    = I_limit * 1.0 # sags to ~3 V across the motor
V_bod    = 2.7           # ATmega brown-out threshold (4.3 V at 16 MHz)
# The Nano shares this rail: below ~4.3 V it resets, again and again.
# Fix: separate supply for logic, or a big cap + a diode for the Nano.
```

Signal dots: yellow dots on the power path, speed `0.3 + 0.15 × i`, whenever current flows (F12:181), plus the engine's
power-path dots while connected. Pills (F12:184-185): "LM2596" and "INDUCTOR" (running), "VOLTMETER" (powered),
"IN 11.1V" (battery plugged), "TRIMPOT" (never lit).

### 7.7 Failure modes (verified live)

| how | result |
|---|---|
| "Set 12 V (impossible)" | Vout pins at 10.50 V, the Nano LED dies after 1.2 s and the Nano smokes; Linear would burn "0.4 W"; the motor spins at double speed |
| "Motor stall" | block jams the wheel; Vout bounces 2.9..4.6 V at 3.0 A; the Nano LED flickers on only above 4.3 V; "Nano: brown-out reset" / "setup()" loop |
| "Set 3.3 V" | Nano LED flickers (out of spec at 16 MHz) |
| `?flip=C1` or `?flip=C2`, then power | `FAULT` "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it" (or C2) |
| Build without J2 | "Powered, but J2 (Output screw terminal) is missing: nothing runs"; display lit "0.00", meter "0.00" |
| Build without C2 | "Powered, but C2 (220 uF 35 V output capacitor) is missing: nothing runs" |
| Build without RV1 or DS1 (g1) | J1 is blocked, so "Connect battery" says "There's nothing to plug into: place J1 first" |
| Place J1 but do not solder it | "J1 isn't soldered: the power pins don't touch the copper" |
| Build without C1 | **runs normally** (C1 is in neither `needs` nor `run`) |
| U1, L1 or D1 missing | **latent** (SMD all-or-nothing). Forced on the live site: "No power: U1 (LM2596S-ADJ switching regulator) is missing or unsoldered", "No power: L1 (33 uH power inductor) is missing or unsoldered", "No power: D1 (SS34 Schottky diode) is missing or unsoldered" |

### 7.8 Build sequence specifics

5 SMD parts; RV1 and DS1 (g1); then the tall parts J1, J2, C1, C2 (g2), the two caps each with a front/back choice.
Unlike the USB boards, power is the battery plug into J1, so J1 must be placed and soldered before "Connect battery" works.

### 7.9 Lesson text (summary)

Overview (F12:186-187): batteries are never the voltage you need. A 3S LiPo is 3 × 3.7 = 11.1 V nominal (12.6 V full, about
9.9 V empty), the Arduino wants 5 V, and a buck converter chops and smooths so it trades voltage for current instead of
burning the difference. The real lesson is the stall: 3 A, the shared 5 V rail sags, the Arduino browns out and resets,
which is why robots reboot when they hit a wall. Also: never leave a LiPo charging unattended.

### 7.10 Quiz (F12:188-192)

1. "A 3S LiPo reads 12.6 V when full. Nominal and empty?" — **"11.1 V nominal, about 9.9 V empty"** / "12 V nominal, 6 V empty" /
   "3.7 V nominal, 3 V empty". Why: 4.2 / 3.7 / ~3.3 V per cell × 3.
2. "Why does a stalling motor reset the Arduino on the same 5 V rail?" — "The motor injects noise into the code" /
   **"The stall current drags the rail below the brown-out threshold"** / "The buck shuts down on purpose".
3. "11.1 V in, 5 V out at 2 A. Heat in a linear regulator vs this buck?" — "About the same" / **"Linear ~12 W, buck ~1 W"** /
   "Linear ~1 W, buck ~12 W". Why: (11.1 − 5) × 2 = 12.2 W versus 10 W / 0.9 − 10 W = 1.1 W.

### 7.11 Practice task (F12:193)

Power an Arduino and a gearmotor from one 5 V output, print `millis()`, stall the wheel by hand and watch the count
restart; then give the Arduino its own regulator (or a big cap behind a diode), repeat, record the difference and explain
out loud why the first version reset.

### 7.12 Accuracy notes

- Duty cycle D = Vout / Vin (ideal buck); buck loss = Pout / η − Pout with η = 0.9; linear loss = (Vin − Vout) × I.
- **Two "linear" numbers disagree**: the stat uses the sagged input (2.7 W at 5 V), the math panel uses 11.1 V (2.75 W);
  at the 12 V setting 0.4 W versus 0.48 W. Use one source of truth.
- **Stall math is inconsistent**: it says the stalled motor is about 2 Ω but computes `V_out = I_limit * 1.0`; at 2 Ω and 3 A
  the motor would see 6 V. Pick one resistance.
- The LM2596's switch current limit is typically about 4.5 A (minimum about 3.6 A) for the 3 A rated part, not exactly 3.0 A.
- A stock Nano's brown-out detector is set to 2.7 V (the ATmega328P BOD options are 1.8 / 2.7 / 4.3 V). The sim's "reset
  below 4.3 V" is really "out of the 16 MHz safe operating area" (about 3.8 V by the datasheet's speed-grade line; 4.5 V is
  the 20 MHz figure). Say it that way, or model the 4.3 V BOD option explicitly.
- LM2596 feedback reference 1.23 V, 150 kHz, 4.5-40 V input, SS34 Schottky: all correct.

---

## 8. Fig. 13 — Raspberry Pi 5, the ROS 2 brain (`#rpi5`, F13)

### 8.1 Identity

| field | value | ref |
|---|---|---|
| nav | "Fig. 13" / "Raspberry Pi 5" / "ROS 2 brain" | F13:90 |
| hint | "build it, add the cooler, power it from a real 5 A supply" | F13:90 |
| PCB | 85 × 56 mm, corner r 3, palette mint, holes at real (3.5,3.5), (61.5,3.5), (3.5,52.5), (61.5,52.5) | F13:91-92 |
| mat margins | back 5, front 8, right 5, left 16 → 98 × 77 mm; headroom 26 | F13:91 |
| power | "Plug / unplug 27W USB-C" (USB-C plug into J1, `zc` 1.6) | F13:152-153 |
| modes / code / terminal | "Run ▾" / "On the Pi · <mode>" / "Terminal (SSH)" (terminal starts "-- terminal (ssh) --") | F13:153 |
| default mode | `boot` | F13:154 |
| needs / run | `['U4']` / `['U1','U2','U3']` | F13:152 |
| power OK toast | "Powered: PWR red, ACT flickers while Linux boots" | F13:154 |

### 8.2 Real-world model

Parts are placed in real Pi 5 top-view coordinates: X along the long edge (0 = PCIe end, 85 = USB/Ethernet end), Y from the
USB-C/HDMI edge (0) to the GPIO edge (56); `R5(X0,Y0,X1,Y1)` converts to uv (F13:2-9). In the drawing the USB-C and
micro-HDMI side faces viewer-left and the USB/Ethernet end faces the front. Silkscreen "Raspberry Pi 5", "PCIE", "CAM1",
"CAM0", "ACT", "PWR", "RTC", "FAN", "GPIO" (F13:93-94). Custom drawings: SoC with green substrate and a metal lid printed
"BCM2712" / "2.4 GHz" (F13:16-18); white FFC connectors with a black latch (F13:20-23); white JST headers (F13:25-30);
RJ45 with green link and amber activity LEDs (F13:32-43); stacked USB-A pairs with blue (USB 3) or black (USB 2) tongues
(F13:45-52); the Active Cooler (F13:55-73).

| ID | name (verbatim) | kind | group | real rect X0,Y0,X1,Y1 | pill | summary | ref |
|---|---|---|---|---|---|---|---|
| U1 | BCM2712 SoC | soc | g0 | 21.5, 24, 37.5, 40 | "SOC" | quad Cortex-A76 at 2.4 GHz under a heat spreader; runs Linux, ROS 2, SLAM, vision; fast but not real-time | F13:105-106 |
| U2 | LPDDR4X RAM | box "LPDDR4X / 4GB" | g0 | 41, 26, 55, 38 | "RAM" | 4 GB (or 8/16) right next to the SoC; short traces at this speed | F13:107-108 |
| U3 | RP1 I/O controller | box "RP1" | g0 | 57, 18, 66, 27 | "RP1" | Raspberry Pi's own I/O chip: USB, Ethernet, GPIO, cameras, linked to the SoC over PCIe | F13:109-110 |
| U4 | Power management IC | box "PMIC" | g0 | 8, 20, 15, 27 | "PMIC" | makes every rail from USB-C 5 V, negotiates 5 A with the 27 W supply, flags undervoltage | F13:111-112 |
| U5 | Wi-Fi / Bluetooth module | metal box "WIFI" | g0 | 6, 31, 16, 41 | "WIFI" | dual-band Wi-Fi + BT 5 under a can; fine for SSH/Foxglove, use a cable for control traffic | F13:113-114 |
| LED1 | Power LED (red) | led | g0 | 5, 15, 7, 16.2 | "PWR" | solid = powered; blinking = supply below 4.63 V | F13:115-116 |
| LED2 | Activity LED (green) | led | g0 | 5, 13, 7, 14.2 | "ACT" | flickers with SD activity, then a heartbeat once Linux is up | F13:117-118 |
| RC | Decoupling caps + resistors | passives (14) | g0 | 9, 9, 66, 44 | "PASSIVES" | every fast chip needs its local energy reserve | F13:119-122 |
| J2 | PCIe FFC connector | ffc | g1 | 0.6, 14, 3.6, 30 | "PCIE" | PCIe 2.0 x1 ribbon: NVMe HAT or an AI accelerator | F13:123-124 |
| J3 | Camera / display 0 | ffc | g1 | 45, 3, 48, 19 | "CAM0" | 4-lane MIPI for a camera or DSI display; two of them = stereo | F13:125-126 |
| J4 | Camera / display 1 | ffc | g1 | 49.5, 3, 52.5, 19 | "CAM1" | calibrate each camera with a chessboard first | F13:127-128 |
| SW1 | Power button | tact | g1 | 0.5, 8, 4.5, 12 | "POWER BTN" | new on the Pi 5: press to boot, press again for a clean shutdown | F13:129-130 |
| J5 | RTC battery connector | jst ×2 | g1 | 6, 8.5, 10.5, 11.5 | "RTC" | a small cell keeps the clock running: correct log timestamps | F13:131-132 |
| J6 | Fan connector | jst ×4 | g1 | 62, 44, 69, 47.5 | "FAN" | 4-pin PWM fan header; firmware ramps the fan with CPU temperature | F13:133-134 |
| J1 | USB-C power jack | usbc | g2 | 6.7, −1.2, 15.7, 6.3 | "USB-C 5V" | official 27 W supply negotiates 5 A; a phone charger gives ≤ 3 A and USB power gets limited | F13:135-136 |
| J9 | Micro HDMI 0 | micro usbc | g2 | 22.3, −1, 29.3, 5.5 | "HDMI0" | 4K60 out; on a robot mostly for first boot | F13:137-138 |
| J10 | Micro HDMI 1 | micro usbc | g2 | 35.7, −1, 42.7, 5.5 | "HDMI1" | second display: RViz on one, terminals on the other | F13:139-140 |
| J8 | 40-pin GPIO header | male 2×20 | g2 | 7.1, 49.6, 57.9, 54.68 | "GPIO" | 3.3 V logic, I2C, SPI, UART, PWM; never 5 V in; motors go to a microcontroller | F13:141-142 |
| J11 | Gigabit Ethernet | rj45 | g2 | 66.5, 2, 87.5, 17.5 | "ETHERNET" | the reliable way to stream topics and frames; green = link, amber = traffic | F13:143-144 |
| J12 | USB 3.0 ports (blue) | usba2, blue tongues | g2 | 70, 21.5, 87.5, 34.6 | "USB 3" | 5 Gbit/s each: depth cameras, lidar, SSDs | F13:145-146 |
| J13 | USB 2.0 ports (black) | usba2, black tongues | g2 | 70, 38.5, 87.5, 51.6 | "USB 2" | keyboard, teleop gamepad, USB-serial to the Nano/ESP32 | F13:147-148 |
| FAN | Active Cooler | cooler | g3 | grabbed at 14, 40.5, 20, 46; z +3 | "ACTIVE COOLER" | heatsink + blower on spring pins with thermal pads on SoC, RAM, RP1; without it ROS 2 load hits 85 °C and throttles | F13:149-150 |

The Active Cooler is drawn from real numbers (F13:55-73): aluminium plate X 14..57 × Y 21..46.5; blower block X 13.5..36,
9 mm tall; a 9-blade fan centred at (24.6, 33.75) that spins at `o.fan` rad/s while running; 11 fins, each running X 37..57,
spaced 2.38 mm apart along Y from 45.6 down to 21.8; a black cable to J6 when J6 is on and the view is not exploded.

### 8.3 On the mat

Nothing but the USB-C cable from the 27 W supply into J1 (margins are small: front 8, left 16).

### 8.4 Behaviour model (F13:76-87)

- `hasCooler()` = FAN on the board.
- Temperature: with the cooler `base + 1.5·sin(0.7t)`; without it `min(85, base + 4 + 2.4·t)`; base 52 (boot), 61 (teleop),
  48 (undervoltage). Without the cooler: boot starts at 56 °C and reaches 85 °C at t ≈ 12.1 s, teleop starts at 65 °C and
  hits 85 °C at t ≈ 8.3 s, undervoltage starts at 52 °C and hits 85 °C at t ≈ 13.8 s.
- **Quirk (verified):** `t` restarts on every mode switch, so a cooler-less Pi at 85 °C drops back to 65 °C when you switch
  to teleop, and to 52 °C on undervoltage.
- Fan speed `o.fan`: boot 7, teleop 12, undervoltage 4 rad/s.
- LED1 (red): on in boot and teleop; in undervoltage it blinks, on while `t mod 0.8 < 0.4`.
- LED2 (green, `actBlink`): boot, first 6 s fast flicker (`sin(23t) > 0.2`), then a double-blink heartbeat every 1.2 s
  (`t mod 1.2 < 0.1` or between 0.25 and 0.35); teleop busy flicker `sin(31t) > 0.55`; undervoltage a short blink every 2 s
  (`t mod 2 < 0.15`).
- Ethernet LEDs: green link lit while running; amber activity while `sin(17t) > 0.1` (F13:37-41).
- Signal dots (F13:205-206): Ethernet path always (yellow, speed 1.1); USB path in teleop (green ×3, speed 1.4); HDMI path in
  boot (orange); plus power-path dots from USB-C to the PMIC while powered.

### 8.5 Modes (all instant; F13:155-204)

**"Boot Linux"** (`boot`, supply 5.1 V). Terminal k = 0..5 (F13:83-85), then every third second a temperature line:

```
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0
[    1.204511] rp1: PCIe link up, x4 gen2
[    2.981230] systemd[1]: Reached target multi-user.target
raspberrypi login: pi
$ vcgencmd get_throttled  ->  throttled=0x0
$ vcgencmd measure_temp  ->  temp=50.7'C        (k = 6, 9, 12 ...; value = tempAt(k), 1 dp)
```

```bash
# first boot: Raspberry Pi OS (64-bit) on a good SD card
sudo apt update && sudo apt full-upgrade

vcgencmd measure_temp      # CPU temperature
vcgencmd get_throttled     # 0x0 = the supply is healthy

# ROS 2 Jazzy: Ubuntu 24.04 is the Tier 1 target,
# so many robots run Ubuntu (or Docker) on the Pi instead
```
(F13:160-167)

**"ros2 run teleop"** (`teleop`, supply 5.1 V). Terminal k = 0..3 (F13:86-87):
"$ source /opt/ros/jazzy/setup.bash", "$ ros2 run my_robot drive", "[INFO] [drive]: publishing /cmd_vel at 10 Hz",
"$ ros2 topic hz /cmd_vel  ->  average rate: 10.000"; then each second `linear.x: 0.20   angular.z: <0.5·sin(k/2), 2 dp>`
(live: 0.45, 0.30, 0.07, -0.18, -0.38, -0.49 ...), except that when the CPU is at 85 °C and k is divisible by 4 the line is
"WARNING: CPU at 85.0C, throttling to 1.5 GHz (no cooler?)" (F13:170-172). The USB 3 pill lights in this mode.

```python
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.create_timer(0.1, self.tick)   # 10 Hz

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2                  # m/s forward
        msg.angular.z = 0.5                 # rad/s turn
        self.pub.publish(msg)               # an ESP32 turns this into PWM

rclpy.init()
rclpy.spin(Drive())
```
(F13:174-191)

**"Undervoltage (5V 2A brick)"** (`under`, supply 4.62 V, `throttled`). Terminal alternates: even k
"hwmon hwmon1: Undervoltage detected!", odd k "$ vcgencmd get_throttled  ->  throttled=0x50005" (F13:194).

```bash
vcgencmd get_throttled
# throttled=0x50005
#   bit 0   under-voltage right now
#   bit 2   CPU throttled right now
#   bit 16  under-voltage has happened since boot
# a phone brick sags under load: random reboots,
# corrupted SD cards, USB devices dropping out.
# fix: the official 5 V 5 A (27 W) USB-C supply
```
(F13:196-203)

### 8.6 Stats (F13:207-211)

| label | value |
|---|---|
| "CPU" | `temp` rounded, e.g. "53 C" |
| "Clock" | "1.5 GHz" if undervoltage (`throttled`) or temp ≥ 85, else "2.4 GHz" |
| "Supply" | "5.10 V" (boot, teleop) or "4.62 V" (undervoltage) |

Live: boot 51-53 C / 2.4 GHz / 5.10 V; teleop 60-62 C; undervoltage 47-49 C / 1.5 GHz / 4.62 V. Without the cooler, boot
climbed 58 → 85 C and the clock flipped to 1.5 GHz at about 12 s.

Pills (F13:212-213): "USB-C 5V" (plug in), "ACTIVE COOLER" (running with the cooler), "GPIO" (never lit), "USB 3" (teleop),
"ETHERNET" (running).

### 8.7 Failure modes (verified live)

| how | result |
|---|---|
| "Undervoltage (5V 2A brick)" | supply 4.62 V, clock 1.5 GHz, red LED blinking, hwmon / throttled=0x50005 lines |
| Build without the Active Cooler (FAN) | temperature ramps 2.4 °C/s to 85 °C, clock drops to 1.5 GHz; in teleop the 85 °C warning every 4 s; the pill "ACTIVE COOLER" is absent |
| Build without J1 (or any g1 part, which blocks J1) | "There's nothing to plug into: place J1 first" |
| Place the cooler before every connector is soldered | "Solder everything first: this part goes on last" |
| U4 (PMIC) or U1/U2/U3 missing | **latent** (SMD). Forced on the live site: "No power: U4 (Power management IC) is missing or unsoldered"; "Powered, but U1 (BCM2712 SoC) is missing: nothing runs" (status `POWERED`) |

Not modelled: SD-card corruption on hard power-off, the power button, GPIO 5 V damage, real-time jitter (only quiz text).

### 8.8 Lesson text (summary)

Overview (F13:214-215): the Pi 5 is the robot's brain, not its spinal cord: a 2.4 GHz quad-core Linux computer running
ROS 2 Jazzy, SLAM Toolbox, Nav2 and the camera pipeline. Linux is not real-time, so motor and balance loops live on an
ESP32 or Nano that talks to the Pi over USB serial (the split used by Waveshare's UGV Rover). Use a real 5 V 5 A supply,
fit the Active Cooler last, and watch the terminal.

### 8.9 Quiz (F13:216-220)

1. "Why does the Pi run ROS 2 while an ESP32 runs the motor loop?" — **"Linux is not real-time: the scheduler can pause your loop"** /
   "The Pi has no PWM pins" / "ROS 2 only runs on Arm".
2. "'Undervoltage detected!' with a phone charger. The fix?" — "Lower the CPU clock in software" /
   **"A 5 V 5 A (27 W) USB-C supply"** / "A bigger heatsink".
3. "Which ROS 2 distro does the roadmap say to start on?" — "Noetic (ROS 1)" / **"Jazzy Jalisco"** / "Kilted Kaiju".
   Why: the roadmap picks Jazzy, the May 2024 LTS (supported to 2029) whose Tier 1 platform is Ubuntu 24.04; Noetic is
   ROS 1 and Kilted is a short-support 2025 release. (Check before shipping whether to mention the 2026 LTS release.)

Mastering this quiz shows "Board mastered." with no next-figure link (last figure).

### 8.10 Practice task (F13:221)

Build a multi-node ROS 2 system with no robot: a sensor publisher, a processing node, a service-based config node and a
parameterised aggregator, with custom .msg and .srv types, launched from a Python launch file with arguments; record it
with `ros2 bag` and replay it.

### 8.11 Accuracy notes

- `throttled=0x50005` sets bits 0, 2, 16 **and 18** (throttling has occurred); the code comment lists only 0, 2 and 16.
- The Pi 5 starts throttling at 80 °C and throttles hard at 85 °C. 1.5 GHz is 62.5 % of 2.4 GHz; the cooler text says
  "throttles to half speed".
- The terminal prints a varying `angular.z` (0.5·sin(k/2)) while the node it shows publishes a constant 0.5.
- Keep the thermal state across mode switches in the rebuild (see the quirk above).
- Undervoltage warning threshold about 4.63 V, 27 W = 5 V × 5 A USB-PD, RP1 on PCIe 2.0 x4, external PCIe FFC is x1 Gen 2:
  all correct. The real PMIC is a Renesas DA9091; the Wi-Fi/BT module is a CYW43455-class part (not named in the original).

---

## 9. Practice tasks across the whole original site

The original has one practice task per figure, shown at the bottom of the right lesson column under "Practice task"
(E:982). There is no separate practice page, no task checklist and no progress tracking for them; only the quiz
("Board mastered.") is tracked. The ones asked about:

| task | figure | where |
|---|---|---|
| Reaction-timer game: LED after a random delay, button stops the clock, ms to serial, using an interrupt, debouncing and `millis()` instead of `delay()` | Fig. 01 Arduino Uno R3 | `02-fig01-arduino-uno-r3.js:141` |
| Line follower with a P controller, then add D and film both | Fig. 11 QTR-8RC | F11:142 |
| Robot arm: SO-101 or EEZYbotARM on MG996R servos, centre at 90°, teleoperate two joints from two pots | Fig. 08 PCA9685 | F08:183 |

All the others:

| figure | task (summary) | where |
|---|---|---|
| Fig. 02 LED + resistor | voltage divider in the Falstad simulator: predict, check, swap 10 k for 4.7 k | `03-fig02-led-resistor-trainer.js:100` |
| Fig. 03 Transistor switch | breadboard transistor switch for an LED, then a small motor with a flyback diode; measure base and collector current, work out the gain | `04-fig03-transistor-switch.js:158` |
| Fig. 04 ESP32-S3 DevKit | serve a web page from the ESP32 with live sensor readings and servo buttons, open it on a phone | `05-fig04-esp32-s3-devkitc-1.js:164` |
| Fig. 05 TB6612FNG | one DC motor forward/back at five PWM speeds; add an encoder and turn exactly one revolution regardless of battery voltage | `06-fig05-tb6612fng-dual-motor-driver.js:157` |
| Fig. 06 L298N | the same task with the ENA jumper pulled and ENA on a PWM pin | `07-fig06-l298n-dual-h-bridge-module.js:168` |
| Fig. 07 A4988 | one revolution in full and 1/16 step, tape flag, check for skipped steps after 10 revolutions | F07:172 |
| Fig. 09 MPU-6050 | watch drift, add the complementary filter, only then Kalman | F09:119 |
| Fig. 10 HC-SR04 | 10 Hz distance log against a wall, a cushion and an angled bottle; compare with a VL53L0X | F10:133 |
| Fig. 12 LM2596 | shared-rail brown-out with `millis()`, then a separate regulator or cap + diode | F12:193 |
| Fig. 13 Raspberry Pi 5 | multi-node ROS 2 system with custom msg/srv, launch file, `ros2 bag` record and replay | F13:221 |

---

## 10. Quirks and bugs in the original (decide: fix, do not copy)

1. A4988: after the live-unplug fault, re-plugging re-triggers the fault unless an instant mode is picked while unpowered (E:819-822).
2. Any figure: picking an upload mode while unpowered leaves the old mode running after power-up while the code panel shows the new one (E:877, E:1021).
3. Fig. 13: temperature resets on every mode switch (runStart reset; F13:77-80).
4. A4988: 1/16 sketch timing contradicts the animation (F07:61-62 vs F07:26).
5. Fig. 09: the "Filtered" stat shows a filtered value in the raw-gyro sketch (F09:109); the filter is synthetic, not computed.
6. Fig. 12: two different "linear heat" numbers; stall resistance 2 Ω vs 1 Ω; the BOD/4.3 V framing.
7. Fig. 10: VL53L0X "narrow" 35° cone.
8. Fig. 08: header comment says channels 0 and 15.
9. Fig. 13: get_throttled bit 18 missing; constant vs varying angular.z.
10. Latent failure paths that cannot be reached because SMD parts are all-or-nothing: missing pull-ups or LDO (Fig. 09),
    missing LEDON MOSFET or a single IR sensor (Fig. 11), missing regulator, inductor or diode (Fig. 12), missing PMIC or SoC
    (Fig. 13). The messages exist and work: verified on the live site by deleting the part from the state and re-plugging
    (Fig. 09 R1/U2, Fig. 11 Q1/S4, Fig. 12 U1/L1/D1, Fig. 13 U4/U1).
11. Things that only exist as text, never as simulation: A4988 overheating without a heatsink and skipped steps at low
    current; servo stall browning out an Arduino-powered rail; I2C address clash; double echoes; P-controller oscillation;
    missing input cap C1 on the buck; SD corruption on the Pi.
