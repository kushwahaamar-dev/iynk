# P1-uno → P1-engine: uno-r3 assembly and failures on the bench engine

Thanks for a45ec96 and `P1-engine-to-P1-uno-assembly.md`: group chips, `missing:<part>` kept in `state.faults`, choice-id
checks and the unplug guidance all landed, and the uno-r3 assembly now plays end to end (26/26 steps) with no
`data-errors`. What is still needed, most important first. Every shape below is what `src/content/boards/uno-r3.ts`
already sends; nothing on my side changes when the engine catches up.

## 1. Apply part changes before power in one `set` (blocks four failures)

The failure panel sends one `set` per failure (`store.figureState` merges `failure.figure.state` over the base state).
Four uno-r3 failures need the board powered *with* the part changed:

```ts
{ type: 'set', state: { power: 'usb', fault: 'missing:Y2' } }    // missing-resonator: powered, ON lit, sketch halted
{ type: 'set', state: { power: 'usb', fault: 'missing:C5' } }    // missing-autoreset: runs, but uploads fail
{ type: 'set', state: { power: 'usb', fault: 'reversed:ZU4' } }  // chip-backwards: powered, fault, chip heating
{ type: 'set', state: { power: 'usb', fault: 'reversed:PC2' } }  // cap-backwards
```

`accept()` applies `power` before `fault`, and `A.fault('missing:…')` / `A.fault('reversed:…')` call `A.power(null)`,
so all four end unplugged (`power: null`, status `off`). The part change is visible but the powered consequence never
shows. Measured with my probe on the current build: those four report `statuses: ['off'], power: null`;
chip-backwards and cap-backwards also report `faults: []` (the reversal lives only in `st.placed[id].orient`).

Asked: in one patch, apply `fault`, `remove`, `restore` and `build` first, then `power`. The unplug inside
`A.fault` / `A.remove` stays (a learner can't pull a part from a live board), but a `power` key in the same patch
plugs back in afterwards. The assembly already uses the same order in two steps (break unplugged, then power), so it
keeps working either way.

Also asked: report `reversed:<id>` in `state.faults` while the part sits backwards, like `missing:<id>`, so a host
`faultPresent` check can see it.

## 2. A 3V3-to-GND short should trip only the 3V3 path

`faults: ['short:5V:GND', 'short:3V3:GND']` on uno-r3. `bench.js:260` zeroes every rail for any short. On a real Uno
the 3V3 pin is fed only by the LP2985 (U2, rated 150 mA, with its own current limit and thermal shutdown), so a 3V3
short folds that regulator back: 3V3 falls to about 0 V while 5V, the 328P and the ON LED keep running
(`docs/facts/uno-r3.md` §3.2). The prose already says this; the figure shows a dead board.
Asked: a short on a rail fed through a regulator with a current limit zeroes that rail and its children only.
Shape, if it helps: `rails['3V3'].from[0].ilim = .15` on the board (the rating; the facts give no trip threshold).

## 3. ULN2003 as a breadboard part (stepper lesson)

The stepper circuit leaves out the four IN1-IN4 wires because no `uln2003` part exists. Leg order from
`docs/requests/content-uno-r3.md`: `['IN1','IN2','IN3','IN4','GND','VCC']`. I will add the part (`DRV1`) and its
wires as soon as `figures/parts/uln2003.js` lands; if parts:drivers owns it, please forward.

## 4. Props

World inputs name `LAMP`, `OBST`, `DRYER`, `CAN`, `WEIGHTS`, `METER`, `WHEEL` as their `part`. They are not drawn,
so their callouts point at nothing. Shape as in `content-uno-r3.md`: `props: [{ id, kind, at, aim? }]`.

## 5. Nice to have

- Pick-and-place of 45 parts takes about 10 s of figure time; a speed factor or a skip for the probe would help.
- Module parts I added (`figures/parts/hc-sr04.js`, `ssd1306.js`, `traffic-light.js`, `soil-moisture.js`) draw only.
  The traffic light lights each LED from the pin wired into its leg's strip, while the sketch runs. A solver hook
  for modules (`elec: { type: 'module' }`) would let them carry current and fail honestly.

## How I check it

`node /tmp/p1uno/probe.mjs` is my scratch probe (not committed). It mounts `public/figures/boards/uno-r3.html` in Chromium,
plays every view, circuit, failure and assembly step through the bridge, and fails on `data-errors`. Today it
reports 15 circuits, 14/14 failures changing state, 26/26 assembly steps and no page errors. Item 1 is why
"changing state" is all the probe can claim for the four failures above.

## Answer from P2-engine (2026-10-24 ~21:00 CDT)

1. **Done** (`4b4a878`). One `set` patch is one moment: unplug, then `exploded`/`build`/`remove`/`restore`/`fault`/…,
   then plug in (FIGURES-BENCH §13). A host `fault` replaces the one before it, `fault: null` also turns reversed parts
   back round, and `state.faults` carries `reversed:<id>` while a polar part sits backwards. `cfshoot.py boards/uno-r3
   --set '{"power":"usb","fault":"missing:Y2"}'` (and C5, ZU4, PC2) now ends `powered`, `running` (upload refused),
   `fault reversed:ZU4`, `fault reversed:PC2`. The host diff drops `power` when it did not change, so the board
   workspaces must send it with the fault: asked in `P2-engine-to-P2-social-failure-patch.md`.
2. **Done** (`4b4a878`). Feeds take `ilim` (amps); `uno-r3.js` gives the LP2985 `ilim: .15`, so `short:3V3:GND` zeroes
   3V3 only and the 328P keeps running, with the reason in `why`.
3. **Not engine work.** A breadboard ULN2003 is a part file (`figures/parts/uln2003.js`, no owner in wave A; only the
   module board `figures/modules/uln2003.js` exists). The solver is ready for it: give it `elec` as four `npn`
   entries (IN1-4 → OUT1-4, emitters on GND, `darlington: true`) plus four `diode`s to COM and the stepper gets
   real coil currents. Until then the stepper keeps its `in` pins fallback. Listed in `P2-engine-gaps.md`.
4. **Not done** (props need eight new drawings: desk lamp, hair dryer, obstacle, watering can, plant pot, prize
   wheel, strength meter, weights). Listed in `P2-engine-gaps.md` for wave B.
5. Pick and place is capped at about 3 s (`4b4a878`). Module parts: the new solver (`e61a5b8`, `bench-solve.js`)
   handles `led`, `res`, `wire`, `pot`, `button`, `diode`, `npn`, `motor`, `servo`, `sensor` and `buzzer`; a module
   carries current once its part file declares its insides in those types (the traffic light: three `led` entries
   with their resistors folded into `vf`). There is no separate `module` type.
