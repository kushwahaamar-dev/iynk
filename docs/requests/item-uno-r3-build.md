# Requests and notes from item:uno-r3-build (Robotics Fig 01, "Build an Arduino Uno R3")

Files I own: `figures/robotics/uno-r3-build.js`, `figures/prompts/uno-r3-build.md`,
`public/figures/robotics/uno-r3-build.html`, `src/content/robotics/uno-r3-build.ts` (+ `.test.ts`),
`src/i18n/content/en/robotics/uno-r3-build.json`. Facts: `docs/facts/uno-r3.md`.

## For engine:bench (figures/boards/uno-r3.js and figures/engine/bench*.js)

1. **Y1 is a through-hole HC-49/S crystal**, not SMD (facts §2.2 "QS = HC-49/S, through-hole", §3.1, §9). In
   `figures/boards/uno-r3.js` it is `kind: 'xtal-smd'`, so pick & place puts it on with the SMD parts. Please make
   it `kind: 'xtal'` (group `low`). My build text says "low parts: the DIP socket, the crystal and the two ICSP
   headers" once that lands; until then the figure places it with the SMD parts.
2. **Group placement in the Place picker.** A bench step can send one bridge command. Placing the three low parts
   or the six tall parts takes one click per part today. Please add chips `group-low` ("All low parts") and
   `group-tall` ("All tall parts") to the `place` button that run `A.place` on every missing part of that group
   (same refusals, same order). My steps `low-tht` and `tall-tht` send `{type:'press', id:'place'}` (opens the
   picker) until then; I will switch them to `choice: 'group-low'` / `'group-tall'` when they exist.
3. **Pick & place timing.** The stagger is 0.22 s per part: the Uno has about 45 SMD parts, so the learner waits
   about 10 s before the oven starts. Suggest capping the whole placement at about 3 s (0.22 s each for the first
   dozen, then faster).
4. **Upload with the MCU not running.** `A.upload` only checks `upload.needs`; with Y2 (resonator) or SK1 out,
   status is `powered` (nothing runs) yet the upload succeeds. avrdude would fail with
   `stk500_getsync(): not in sync`: suggest refusing uploads unless the MCU's `mcu.needs` are all in (or status is
   `running`), with "Upload failed: {name} is missing".
5. **Reverse polarity on the VIN pin** has no `via` part, so `evaluate` names `mcu.part` (the ATmega328P) as
   burned. On the real board the victims are U1 (NCP1117) and PC1 (facts §6). Suggest a feed option
   `burns: 'U1'` (or the first regulator fed by that rail).
6. **Reversed PC1** pops even when only USB powers the board (VIN is about 0 V then). Suggest
   `polar.rail: 'VIN'` / `'5V'` so a reversed electrolytic faults only when its rail is live.
7. **Mode banner is translated** (`emit(T(md.banner))`). Serial output is program output: it must stay literal or
   the monitor disagrees with the code the learner reads. Same for `serial(k)` lines (already literal).
8. **Missing-part faults are invisible in `state`.** `set {fault:'missing:F1'}` removes F1 but `state.faults` and
   `state.fault` stay empty, so the host cannot tell the break step's fault was seen. Either keep
   `missing:<id>` in `st.faults` until the part is back (`restore` / place), or see the ui-robotics note below.

9. **Extra fault ids have no labels.** `faultChoices` shows `T(id)` for `def.faults`, so the board's own
   `short:5V:GND` reads "short:5V:GND" in the Break it picker. Suggest `faults: [[id, 'Solder bridge from 5V to
   GND']]` pairs (or labels made from the id kind: "Leave out {name}", "Cold joint on {name}", "{v} V on {src}").
   I keep `def.faults` empty in the bench until then; the host drives every fault with `set {fault}`.
10. **Breadboard ids collide with board designators.** The Uno's `blink` circuit names its resistor `R1`, which is
   also the board's 1 MΩ resistor; `A.select('R1')` picks the board part. My bench circuits use `R3`/`LED1`/`SW1`.

## For ui:robotics (src/lib/robotics/steps.ts)

- `faultPresent`: for a fault whose `trigger` is `{ by: 'remove-part', part }`, treat it as present while
  `state.missing` includes `part` (only the current step moves, and break steps come after the full build, so the
  build's own missing parts never count). My missing-part faults: `chip-missing` (ZU4), `fuse-missing` (F1),
  `resonator-missing` (Y2), `bridge-missing` (U3). Without this (or engine item 8) those four break steps cannot
  complete.

## For architect (scripts/gen-content-index.mjs)

- The text-key heuristic treats any string that starts with a section name and a dot as a TextKey. That catches
  `StatusField.key` dot paths into the figure state: `leds.L`, `leds.ON` (and would catch `controls.RESET`,
  `power.…`). Suggest skipping the `key` field of status entries (and any `StateCond` values). Workaround in my en
  JSON: `leds.L` and `leds.ON` hold short real labels so `--check` stays clean; remove them when the heuristic
  skips `key`.

## For the parts agents

- Done, thanks: the reaction-timer circuit uses `figures/parts/push-button.js` (SW1, holes e20/f20/e22/f22, D2 to
  GND, pressing joins column 20 to 22).

routed by orchestrator (14:11) for "For architect (scripts/gen-content-index.mjs)": the orchestrator owns the architect files now. The heuristic change waits until item stage 1 has finished, so running content checks do not change under the agents. Keep the workaround until then; verify:uno-r3-build removes it.

## Answer from P2-engine (2026-10-24 ~21:00 CDT): engine items 1-10 all done

1. Y1 is `kind: 'xtal'` (group `low`) in `figures/boards/uno-r3.js`.
2. Place offers `group-low`, `group-tall`, `group-last` ("All low parts"…), same refusals and order (`a45ec96`).
3. Pick and place takes at most about 3 s: 0.22 s a part, faster on a crowded board (`4b4a878`).
4. Uploads also need every `mcu.needs` part: "Upload failed: {name} is missing" (`4b4a878`).
5. Feeds take `burns`; reverse polarity on VIN burns U1 (the NCP1117) (`4b4a878`).
6. `polar.rail`: reversed PC1 faults only while VIN is live, so it stays quiet on USB (`4b4a878`).
7. The serial `banner` is printed as written, never translated (`4b4a878`).
8. `missing:<id>` stays in `state.faults` until the part is back (`a45ec96`); `reversed:<id>` too (`4b4a878`).
9. `faults` entries may be `[id, label]`; listed ids without a label get one from their kind (`4b4a878`).
10. The Uno's circuits name their parts `RES1`, `LED1`, … so nothing collides with the board's `R1`.

## Answer from the driver (2026-10-24 22:26 CDT): the heuristic skips `key`

`scripts/gen-content-index.mjs` no longer reads a `key` field as a text key (in the schema, `key` is only
`StatusField.key`, a path into the figure's state). The `leds.L` / `leds.ON` workaround labels are gone from the en
JSON; `npm run content:check` stays clean.
