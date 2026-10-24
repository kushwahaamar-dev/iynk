# Requests from content:uno-r3

Owner: content:uno-r3 (src/content/boards/uno-r3.ts, its test and src/i18n/content/en/boards/uno-r3.json).
Status: written 14:05-15:40 CDT Oct 24. Newest notes at the bottom of each section.

## 1. engine:bench / merge step: the 16 lesson circuits for figures/boards/uno-r3.js

Paste the `circuits` object below over the one in `figures/boards/uno-r3.js` (keep `circuit: 'blink'`). The keys are
the lesson ids in `src/content/boards/uno-r3.ts` (A5: circuit key = lesson id); lesson `board` uses no circuit (the
bare board). Hole positions are Learn Arduino's own (coverage rows LA-163, 181, 195, 207, 217, 229, 272, 283, 308,
324, 341, 358), moved onto the real 400-point half board (30 columns + 4 rails, la-components.md §2.3), with the
corrections listed after the block.

Conventions used (please keep them or tell me):

- **Wire ends on the board use header pin ids where a net has more than one pin.** On this board `5V` is on
  POWER.5 and ICSP.2, `D13`/`D12`/`D11` are on IOH and on the ICSP header, `GND` is on IOH.4, POWER.6, POWER.7, ICSP.6
  and ICSP1.6. `pinOf()` picks "the one nearest the breadboard", which today is the **ICSP header** for 5V, GND, D11,
  D12 and D13 (it sits at x 64-66 mm, nearest the breadboard at x 82 mm), so the worked example's
  `{ from: 'D13' }` and `{ from: 'GND' }` draw from the ICSP pins. Ids (from the `pins` arrays in uno-r3.js):
  IOH.4 = top GND (beside D13, "GND" in Learn Arduino), IOH.5 = D13, IOH.6 = D12, IOH.7 = D11, POWER.4 = 3V3,
  POWER.5 = 5V, POWER.6 = GND1, POWER.7 = GND2, POWER.8 = VIN. Unique nets (D2-D10, A0-A5, SDA, SCL) are used by name.
- **Circuit part ids do not reuse board designators.** `A.select` and every drawer compare `st.sel === p.id` for
  board parts and circuit parts alike, so the worked example's `R1` lights up the board's R1 (1 MΩ across Y1) too.
  The Uno has R1, R2, C1-C11, D1-D3, L1, L2, U1-U5, T1, F1, Y1, Y2, Z1, Z2, so the circuits use RES1.., LED1..,
  BTN1.., POT1, LDR1, BUZ1, Q1, DIO1, TMP1, FSR1, MOT1, FAN1, SRV1, STP1, US1, OLED1, TL1, DRV1, SOIL1, KEY1-KEY8.
- **Leg orders assumed** for parts and modules that are still being written (figures/parts, figures/modules):
  push-button `['1','2','3','4']` (1-2 always joined, 3-4 always joined, pressing joins the pairs; holes e/f of
  one column are a joined pair, la-components.md §6), potentiometer `['1','2','3']` (2 = wiper), rgb-led
  `['R','K','G','B']` (common cathode, K is the long leg), ldr `['1','2']`, piezo-buzzer `['POS','NEG']`, tip120
  `['B','C','E']`, diode-1n4007 `['A','K']`, tmp36 `['VS','VOUT','GND']` (flat face to the viewer), fsr402
  `['1','2']`, dc-motor and fan `['POS','NEG']` (red, black lead), servo-sg90 `['GND','VCC','SIG']` (brown, red,
  orange), hc-sr04 `['VCC','TRIG','ECHO','GND']`, ssd1306 `['GND','VCC','SCL','SDA']`, traffic-light
  `['GND','R','Y','G']`, uln2003 `['IN1','IN2','IN3','IN4','GND','VCC']` (the board's "-" and "+" pins),
  soil-moisture `['AOUT','VCC','GND']` (v1.2 silk order).
- **`at` positions** are board mm (v3 §9): the half board sits at x 82.6-165.1, y -0.6-53.9, so column c is at
  x = 87.0 + 2.54·(c-1). Row a is the back (y ≈ 39.9). Things that face "out" from row a face +y.
- **Props** (scenery the lessons need, not PART_IDS): `props: [{ id, kind, at, aim? }]`, kinds `desk-lamp`,
  `hairdryer`, `obstacle` (with param `kind: car|box|ball|wall`), `watering-can`, `plant-pot`, `prize-wheel`
  (8 segments, on STP1's shaft), `strength-meter` (dial on SRV1's horn, bell on top), `weights` (50/100/200/500 g on
  coasters). World inputs name these ids as their `part`, so gestures (drag the lamp, hold the can) and the
  `inputs` report can use them. Until the engine draws props, please ignore the key.

```js
circuits: {
  blink: {
    title: 'Blink an LED', breadboard: 'half',
    parts: [
      { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
      { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
    ],
    wires: [
      { from: 'IOH.5', to: 'a10', color: 'orange' },          // D13
      { from: 'IOH.4', to: 'a15', color: 'black' },           // GND beside D13
    ],
  },
  button: {
    title: 'Push a button', breadboard: 'half',
    parts: [
      { id: 'BTN1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] },
      { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['b10', 'b14'] },   // pull-down D2 -> GND
      { id: 'RES2', part: 'resistor', ohms: 220, holes: ['b15', 'b19'] },
      { id: 'LED1', part: 'led', color: 'red', holes: ['c19', 'c20'] },
    ],
    wires: [
      { from: 'POWER.5', to: 'a8', color: 'red' },            // 5V
      { from: 'D2', to: 'a10', color: 'blue' },
      { from: 'IOH.4', to: 'a14', color: 'black' },           // GND
      { from: 'IOH.5', to: 'a15', color: 'orange' },          // D13
      { from: 'e14', to: 'e20', color: 'black' },             // ground to the LED cathode
    ],
  },
  knob: {
    title: 'Turn a knob', breadboard: 'half',
    parts: [
      { id: 'POT1', part: 'potentiometer', ohms: 10000, holes: ['e9', 'e10', 'e11'] },
      { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b15', 'b19'] },
      { id: 'LED1', part: 'led', color: 'red', holes: ['c19', 'c20'] },
    ],
    wires: [
      { from: 'POWER.5', to: 'a9', color: 'red' },            // 5V to pot leg 1: the reading rises turning anticlockwise
      { from: 'A0', to: 'a10', color: 'green' },              // wiper
      { from: 'POWER.6', to: 'a11', color: 'black' },         // GND1
      { from: 'D9', to: 'a15', color: 'orange' },
      { from: 'b11', to: 'e20', color: 'black' },             // ground to the LED cathode
    ],
  },
  rgb: {
    title: 'Mix colours', breadboard: 'half',
    parts: [
      { id: 'LED1', part: 'rgb-led', holes: ['d15', 'd16', 'd17', 'd18'] },  // R, common cathode, G, B
      { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b11', 'b15'] },     // red
      { id: 'RES2', part: 'resistor', ohms: 220, holes: ['b17', 'b21'] },     // green
      { id: 'RES3', part: 'resistor', ohms: 220, holes: ['c18', 'c22'], raised: true },  // blue, lifted to cross RES2
    ],
    wires: [
      { from: 'D9', to: 'a11', color: 'orange' },
      { from: 'D10', to: 'a21', color: 'green' },
      { from: 'IOH.7', to: 'a22', color: 'blue' },            // D11
      { from: 'IOH.4', to: 'a16', color: 'black' },           // GND to the common leg
    ],
  },
  light: {
    title: 'Sense light', breadboard: 'half',
    parts: [
      { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b8', 'b12'] },
      { id: 'LED1', part: 'led', color: 'yellow', holes: ['c12', 'c13'] },
      { id: 'LDR1', part: 'ldr', holes: ['c20', 'c21'] },
      { id: 'RES2', part: 'resistor', ohms: 10000, holes: ['b17', 'b21'] },   // divider A0 -> GND
    ],
    wires: [
      { from: 'D9', to: 'a8', color: 'orange' },
      { from: 'IOH.4', to: 'a13', color: 'black' },           // GND
      { from: 'POWER.5', to: 'a20', color: 'red' },           // 5V to the LDR
      { from: 'A0', to: 'a21', color: 'green' },
      { from: 'POWER.6', to: 'a17', color: 'black' },         // GND1
    ],
    props: [{ id: 'LAMP', kind: 'desk-lamp', at: [140, 82], aim: 'LDR1' }],
  },
  distance: {
    title: 'Read a sensor', breadboard: 'half',
    parts: [
      { id: 'US1', part: 'hc-sr04', holes: ['a10', 'a11', 'a12', 'a13'] },  // stands on the back edge, facing out (+y)
    ],
    wires: [
      { from: 'POWER.5', to: 'e10', color: 'red' },           // 5V -> VCC
      { from: 'D9', to: 'e11', color: 'yellow' },             // TRIG
      { from: 'D10', to: 'e12', color: 'green' },             // ECHO
      { from: 'POWER.6', to: 'e13', color: 'black' },         // GND1 -> GND
    ],
    props: [{ id: 'OBST', kind: 'obstacle', at: [116, 84], aim: 'US1' }],
  },
  sound: {
    title: 'Make a sound', breadboard: 'half',
    parts: [
      { id: 'BUZ1', part: 'piezo-buzzer', holes: ['e11', 'e14'] },          // + at e11
    ],
    wires: [
      { from: 'D8', to: 'a11', color: 'orange' },
      { from: 'IOH.4', to: 'a14', color: 'black' },
    ],
  },
  piano: {
    title: 'Mini piano', breadboard: 'half',
    parts: [
      // key k (k = 1..8) on D(k+1), centred on column 32 - 3k, legs one column either side, across the trench
      { id: 'KEY1', part: 'push-button', holes: ['e28', 'f28', 'e30', 'f30'] },
      { id: 'KEY2', part: 'push-button', holes: ['e25', 'f25', 'e27', 'f27'] },
      { id: 'KEY3', part: 'push-button', holes: ['e22', 'f22', 'e24', 'f24'] },
      { id: 'KEY4', part: 'push-button', holes: ['e19', 'f19', 'e21', 'f21'] },
      { id: 'KEY5', part: 'push-button', holes: ['e16', 'f16', 'e18', 'f18'] },
      { id: 'KEY6', part: 'push-button', holes: ['e13', 'f13', 'e15', 'f15'] },
      { id: 'KEY7', part: 'push-button', holes: ['e10', 'f10', 'e12', 'f12'] },
      { id: 'KEY8', part: 'push-button', holes: ['e7', 'f7', 'e9', 'f9'] },
      { id: 'BUZ1', part: 'piezo-buzzer', holes: ['d2', 'd5'] },            // + at d2
    ],
    wires: [
      { from: 'D2', to: 'a30', color: 'red' }, { from: 'a28', to: 'T-28', color: 'black' },
      { from: 'D3', to: 'a27', color: 'orange' }, { from: 'a25', to: 'T-25', color: 'black' },
      { from: 'D4', to: 'a24', color: 'yellow' }, { from: 'a22', to: 'T-22', color: 'black' },
      { from: 'D5', to: 'a21', color: 'green' }, { from: 'a19', to: 'T-19', color: 'black' },
      { from: 'D6', to: 'a18', color: 'white' }, { from: 'a16', to: 'T-16', color: 'black' },
      { from: 'D7', to: 'a15', color: 'blue' }, { from: 'a13', to: 'T-13', color: 'black' },
      { from: 'D8', to: 'a12', color: 'purple' }, { from: 'a10', to: 'T-10', color: 'black' },
      { from: 'D9', to: 'a9', color: 'grey' }, { from: 'a7', to: 'T-7', color: 'black' },
      { from: 'D10', to: 'a2', color: 'brown' },              // buzzer +
      { from: 'a5', to: 'T-5', color: 'black' },              // buzzer -
      { from: 'IOH.4', to: 'T-1', color: 'black' },           // GND to the back - rail
    ],
  },
  motor: {
    title: 'Control a motor', breadboard: 'half',
    parts: [
      { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b13'] },     // base resistor
      { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },             // B, C, E
      { id: 'DIO1', part: 'diode-1n4007', holes: ['d14', 'd20'] },            // flyback: anode on the collector, band to 5 V
      { id: 'MOT1', part: 'dc-motor', at: [182, 26] },
    ],
    wires: [
      { from: 'D6', to: 'a9', color: 'orange' },
      { from: 'IOH.4', to: 'a15', color: 'black' },           // emitter to GND
      { from: 'POWER.5', to: 'e20', color: 'red' },           // 5V to the motor's + strip
      { from: 'MOT1.POS', to: 'a20', color: 'red' },
      { from: 'MOT1.NEG', to: 'a14', color: 'black' },        // motor - to the collector
    ],
  },
  heat: {
    title: 'Sense heat', breadboard: 'half',
    parts: [
      { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b13'] },
      { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },
      { id: 'TMP1', part: 'tmp36', holes: ['c19', 'c20', 'c21'] },            // +Vs, Vout, GND
      { id: 'DIO1', part: 'diode-1n4007', holes: ['d14', 'd19'] },            // flyback across the fan
      { id: 'FAN1', part: 'fan', at: [182, 22] },
    ],
    wires: [
      { from: 'D6', to: 'a9', color: 'orange' },
      { from: 'IOH.4', to: 'a15', color: 'black' },
      { from: 'POWER.5', to: 'a19', color: 'red' },
      { from: 'A0', to: 'a20', color: 'green' },
      { from: 'POWER.6', to: 'a21', color: 'black' },         // GND1
      { from: 'FAN1.POS', to: 'e19', color: 'red' },
      { from: 'FAN1.NEG', to: 'e14', color: 'black' },        // fan - to the collector
    ],
    props: [{ id: 'DRYER', kind: 'hairdryer', at: [138, 86], aim: 'TMP1' }],
  },
  servo: {
    title: 'Sweep a servo', breadboard: null,
    parts: [{ id: 'SRV1', part: 'servo-sg90', at: [92, 26] }],
    wires: [
      { from: 'SRV1.GND', to: 'POWER.7', color: 'brown' },    // GND2
      { from: 'SRV1.VCC', to: 'POWER.5', color: 'red' },
      { from: 'SRV1.SIG', to: 'D9', color: 'orange' },
    ],
  },
  stepper: {
    title: 'Spin the wheel', breadboard: 'half',
    parts: [
      { id: 'BTN1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] },
      { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['b10', 'b14'] },
      { id: 'DRV1', part: 'uln2003', at: [184, 30] },
      { id: 'STP1', part: 'stepper-28byj48', at: [214, 30], plug: 'DRV1' },  // 5-wire cable into DRV1's socket
    ],
    wires: [
      { from: 'POWER.5', to: 'a8', color: 'red' },
      { from: 'D2', to: 'a10', color: 'blue' },
      { from: 'IOH.4', to: 'a14', color: 'black' },
      { from: 'D8', to: 'DRV1.IN1', color: 'orange' },
      { from: 'D9', to: 'DRV1.IN2', color: 'yellow' },
      { from: 'D10', to: 'DRV1.IN3', color: 'green' },
      { from: 'IOH.7', to: 'DRV1.IN4', color: 'purple' },     // D11
      { from: 'POWER.7', to: 'DRV1.GND', color: 'black' },    // GND2 -> driver -
      { from: 'b8', to: 'DRV1.VCC', color: 'red' },           // 5 V from the breadboard -> driver +
    ],
    props: [{ id: 'WHEEL', kind: 'prize-wheel', at: [214, 30], aim: 'STP1' }],
  },
  plant: {
    title: 'Smart plant', breadboard: 'half',
    parts: [
      { id: 'OLED1', part: 'ssd1306', holes: ['g4', 'g5', 'g6', 'g7'] },     // GND, VCC, SCL, SDA
      { id: 'SOIL1', part: 'soil-moisture', at: [186, 20] },                  // in the plant pot
    ],
    wires: [
      { from: 'IOH.4', to: 'j4', color: 'black' },
      { from: 'POWER.4', to: 'j5', color: 'orange' },         // 3V3 to the OLED
      { from: 'SCL', to: 'j6', color: 'blue' },
      { from: 'SDA', to: 'j7', color: 'purple' },
      { from: 'SOIL1.GND', to: 'POWER.6', color: 'black' },   // GND1
      { from: 'SOIL1.VCC', to: 'POWER.5', color: 'red' },
      { from: 'SOIL1.AOUT', to: 'A0', color: 'yellow' },
    ],
    props: [{ id: 'PLANT', kind: 'plant-pot', at: [186, 20] }, { id: 'CAN', kind: 'watering-can', at: [200, 40], aim: 'PLANT' }],
  },
  force: {
    title: 'Feel the force', breadboard: 'half',
    parts: [
      { id: 'FSR1', part: 'fsr402', holes: ['a13', 'a14'] },                 // tail in the board, pad on the mat behind it
      { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['c10', 'c14'] },   // pull-down A0 -> GND (chip: 1k/10k/100k)
      { id: 'BUZ1', part: 'piezo-buzzer', holes: ['e1', 'e4'] },             // + at e1
      { id: 'SRV1', part: 'servo-sg90', at: [182, 40] },                      // drives the meter needle
    ],
    wires: [
      { from: 'POWER.5', to: 'd13', color: 'red' },
      { from: 'A0', to: 'd14', color: 'green' },
      { from: 'POWER.6', to: 'd10', color: 'black' },         // GND1
      { from: 'D8', to: 'a1', color: 'purple' },
      { from: 'IOH.4', to: 'a4', color: 'black' },
      { from: 'SRV1.SIG', to: 'D9', color: 'orange' },
      { from: 'SRV1.VCC', to: 'e13', color: 'red' },
      { from: 'SRV1.GND', to: 'e10', color: 'brown' },
    ],
    props: [{ id: 'METER', kind: 'strength-meter', at: [182, 40], aim: 'SRV1' }, { id: 'WEIGHTS', kind: 'weights', at: [124, 80], aim: 'FSR1' }],
  },
  parking: {
    title: 'Parking sensor', breadboard: 'half',
    parts: [
      { id: 'US1', part: 'hc-sr04', holes: ['a8', 'a9', 'a10', 'a11'] },
      { id: 'TL1', part: 'traffic-light', holes: ['b20', 'b21', 'b22', 'b23'] },  // GND, R, Y, G (resistors on the module)
    ],
    wires: [
      { from: 'POWER.5', to: 'e8', color: 'red' },
      { from: 'D9', to: 'e9', color: 'blue' },                // TRIG
      { from: 'D10', to: 'e10', color: 'purple' },            // ECHO
      { from: 'POWER.6', to: 'e11', color: 'black' },         // GND1
      { from: 'd11', to: 'd20', color: 'black' },             // ground bridge to the light module
      { from: 'D4', to: 'e21', color: 'orange' },             // red light
      { from: 'D3', to: 'e22', color: 'yellow' },
      { from: 'D2', to: 'e23', color: 'green' },
    ],
    props: [{ id: 'OBST', kind: 'obstacle', at: [111, 84], aim: 'US1' }],
  },
},
```

Corrections to Learn Arduino in these circuits (each is a coverage row):

- Real 400-point half board, 30 columns and 4 rails, for every lesson (la-components.md §2.3); the original's
  23-column railless board does not exist. The piano uses the same half board (the original called it "full-size").
- `motor` and `heat`: a 1N4007 flyback diode across the motor/fan, band to 5 V (LA-274). The motor's + lead now
  lands on breadboard column 20, fed from the 5V header, so the diode can sit across it.
- `knob`: the original's wiring is kept (5 V on leg 1), so the reading rises turning the knob anticlockwise; the
  lesson says so (la-components.md §7: either is valid, state it).
- `light`: the LED colour is a param again (LA-226).

Params the content's chips send (`set {params}`): `RES1.ohms` (blink: 220/1000/10000; force: 1000/10000/100000),
`LED1.color` (blink, button, knob, light), `OBST.kind` (distance, parking: car/box/ball/wall), `BUZ1.volume`
(sound, 0-100). World inputs report on parts `BTN1`, `POT1`, `LDR1`/`LAMP`, `US1`/`OBST`, `TMP1`/`DRYER`, `KEY1`-
`KEY8`, `SOIL1`/`CAN`, `FSR1`.

## 2. engine:bench: the Uno figure itself

- **Y1 is a through-hole HC-49/S crystal** (docs/facts/uno-r3.md §2.2: package QS = HC-49/S, pads 5.08 mm apart at
  (21.463, 26.162) and (16.383, 26.162)). uno-r3.js draws it as `xtal-smd` (group smd), so pick and place puts it
  down and the oven "reflows" a through-hole part. Use kind `xtal` (group low). The assembly text in the content
  module says Y1 goes in with the low through-hole parts; it is correct either way, but the figure should match.
- **Per-group build state.** `state.build` jumps to `tht` as soon as one through-hole part is in, so the host
  cannot tell "all low parts in" from "one part in". The assembly sequence uses `build` values only
  (bare → reflowed → tht → soldered → assembled); a `groups: {smd, low, tall, last}` report with
  `'none'|'placed'|'soldered'` would let the content split "place low parts" from "place tall parts" with real
  `done` conditions. Nice to have, not blocking.
- **Fault ids the content's failure modes send** (all from §6.4): `reverse-polarity:jack`, `reverse-polarity:vin`,
  `wrong-voltage:jack:24`, `wrong-voltage:jack:4.9`, `wrong-voltage:pin5:9`, `brownout`, `cold:X2`,
  `reversed:ZU4`, `reversed:PC2`, `short:5V:GND`, `short:3V3:GND`; parts removed with `set {remove}`: `Y2` and `C5`.
  `short:3V3:GND` is not in `faults: ['short:5V:GND']`; please add it (the LP2985 current-limits, the rest of the
  board keeps running: facts §6).
- The `led-no-resistor` failure sends `set {circuit: 'blink', params: {RES1: {ohms: 1}}}`: with the 25 Ω pin
  model the solver gives (5 − 2.0)/26 Ω ≈ 115 mA, which burns LED1. The resistor's param range is [1, 1e7], so 1 Ω
  is accepted. Restoring 220 Ω clears it (bbParams deletes `burnt`).

## 3. interpreters (src/lib/interp) and ui:boardlab (src/lib/boardlab)

- **HC-SR04 in the lab run.** `drivesFor()` returns nothing for `hc-sr04` inputs, and `Session` has no way to
  attach one, so lessons `distance` and `parking` read 0 cm in the app. Needed: when a lesson's world has a
  `hc-sr04` input with pins `[trig, echo]`, the session attaches `new HcSr04(world, trig, echo)` and the input value
  sets `distanceCm`. (My unit test attaches it directly through `World`.)
- **SSD1306 at 0x3C for lesson `plant`.** The lesson's `code.libraries` lists `Wire` and `Adafruit_SSD1306`; please
  attach `new Ssd1306()` (devices.ts) when a lesson uses that library, so `screen.begin(…, 0x3C)` finds the display.
- **FSR divider follows the pull-down chip.** Lesson `force` has a `pulldown` choice chip (1 kΩ / 10 kΩ / 100 kΩ,
  figure `RES1.ohms`); its world input is `divider` with `fixedOhms: 10000`. When the learner picks another value
  the device's `fixedOhms` should follow the chip's value (the chip's option values are the ohms as strings).
- **Obstacle echo quality** (optional): Learn Arduino's obstacles echo differently (car ±0.4 cm, box ±0.2 cm, beach
  ball ±2.6 cm with 8 % lost echoes, wall steady). The `obstacle` chip only changes the picture today; a
  `scatter`/`miss` setting on the hc-sr04 device would make the ball honest. The lesson text does not claim the
  wobble happens in the simulation.
- **Closed-loop heat.** Learn Arduino's fan cools the sensor (`target = 22 + heat − fan/26·9`). The world model is
  open-loop (a scripted temperature); the lesson text describes the fan as switching on, not as holding the
  temperature. A world hook that lets a pin (D6 duty) feed back into an input would bring the thermostat back.
